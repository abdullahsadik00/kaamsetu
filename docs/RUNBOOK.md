# Runbook

What to do when something needs doing or goes wrong (doc 13 §7). Written for the pilot staging setup (Render, Supabase, GitHub Actions). Update it when production is chosen (Q-09).

Commands run from `app/backend` in PowerShell. Where a command needs the database, set these in that window only, copied from Render › kaamsetu-api-staging › Environment:

```powershell
$env:DATABASE_URL = "<Supabase session pooler URL>"
$env:OTP_HASH_SECRET = "<value from Render>"
```

Each `npm run pilot` command prints the target database first and changes nothing without `--yes`.

## 1. Deploy

1. Merge to `main` and push. CI must be green (backend, mobile).
2. Render deploys `main` by itself. The start command runs `prisma migrate deploy` first, so new tables exist before the new code answers.
3. Check: open `https://kaamsetu-api-staging-0368.onrender.com/health`. It should show `"status":"ok"` and `"database":"up"`.
4. App: build an APK with `eas build --profile preview --platform android` (from `app/mobile`) and send the link to the testers. A server change alone needs no new APK.

Rule (doc 13 §6): the server must keep working with the **previous** app version, because technicians update late.

## 2. Roll back

**Server:** Render › kaamsetu-api-staging › Events › pick the last good deploy › **Rollback**. Then check `/health`.

- Database changes are not undone by a rollback (migrations only go forward). This is safe because each migration only adds things (doc 13 §3), so the older code still runs.
- If a migration itself is wrong, write a new migration that fixes it. Do not edit or delete an applied one.

**App:** testers install the previous APK again from the EAS build list (expo.dev › Builds). Work waiting on the phone is kept: it is in the phone database, which survives an app update or downgrade (not an uninstall).

## 3. Restore a backup

Backups: nightly GitHub Actions run `backup-staging.yml`, encrypted, kept 14 days. You lose at most one day.

1. GitHub › Actions › backup-staging › the newest green run › download the artifact.
2. `gpg -d <file>.dump.gpg > db.dump` (passphrase in your password manager).
3. Restore into a **new** Supabase project first, not over the live one: `pg_restore --clean --no-owner --schema=public -d "<new database URL>" db.dump`.
4. Point Render's `DATABASE_URL` at it, redeploy, check `/health`, sign in on a phone.
5. Phones resend anything they had not sent yet (outbox), so field work saved on phones but not yet sent comes back by itself. Office work (customers, bills) done after the backup must be entered again.

Test that restoring works: GitHub › Actions › restore-test › Run workflow (it also runs monthly).

## 4. Lost or stolen phone

**A technician or helper:** owner's app › More › Employees › the person › **Reset login**. Their phone is signed out at once (every request checks the phone). They sign in again on the new phone with a new invite from the owner.

**The owner** (the app does not let the owner reset themselves):

```powershell
npm run pilot -- sign-out --phone <owner mobile>          # shows how many phones are signed in
npm run pilot -- sign-out --phone <owner mobile> --yes    # signs them out everywhere
```

Their Google login stays, so they sign in on the new phone with Google as before.

In both cases, work saved on the lost phone and not yet sent is lost with it. Ask what was done that day and enter it again.

## 5. Change a secret

Change it in Render › Environment, then **Save and deploy**. Keep the new value in your password manager.

| Secret | What happens when it changes | Also do |
|---|---|---|
| `JWT_ACCESS_SECRET` | Phones get a new access token by themselves on their next request. Nobody is signed out. | — |
| `OTP_HASH_SECRET` | Open invite codes stop working. | Send new invites: owner app › Employees › Invite, or `npm run pilot -- owner-invite`. Update your PowerShell copy. |
| Database password (Supabase › Settings › Database) | The server cannot reach the database until `DATABASE_URL` is updated. | Update Render `DATABASE_URL` and GitHub secret `STAGING_BACKUP_DATABASE_URL`. |
| `STAGING_BACKUP_PASSPHRASE` (GitHub secret) | New backups use the new passphrase. | Keep the old passphrase 14 days: older backups still need it. |
| `SENTRY_DSN` | Error reports go to the new project. | — |

Change all of them at once if you think any one has leaked.

## 6. Suspected data breach

Signs: someone has data they should not, an unknown sign-in, a leaked `.env` or database URL, or an alert from Supabase or GitHub.

1. **Stop it** (first hour): change the database password and every secret (§5). If a phone or person is involved, sign them out (§4). Remove the leaked value wherever it was posted.
2. **Keep evidence**: do not delete logs. Download the Render logs and the Supabase logs for the period. Write down when you noticed and what you did, as you do it.
3. **Find out what was exposed**: which businesses, which people, which data (names, mobile numbers, addresses, bills).
4. **Tell people.** India's DPDP Act and Rules require telling each affected person and the Data Protection Board, and CERT-In expects cyber incidents to be reported within 6 hours of noticing them. **Check the current rules and deadlines when this happens** (the legal review is T7.2). Tell the pilot business owner the same day in plain words: what happened, what data, what you did, what they should do.
5. Afterwards, write what happened and what changes in `docs/BUG_LOG.md` and, if a decision changes, `docs/DECISION_LOG.md`.

## 7. "My work is not sending"

1. **What does the phone say?**
   - Work shown as waiting to send: the phone has not reached the server. Go to step 2.
   - "Not accepted" or "Couldn't apply": the server refused it. Go to step 4.
2. **Internet:** does any other app load? Is mobile data allowed for KaamSetu (Android › Settings › Apps › KaamSetu › Mobile data)? Battery saver can stop background sending: open the app and pull down on My Work.
3. **Server:** open `/health`. Render free sleeps after 15 minutes without traffic, so the first call can take up to a minute. If it shows `"database":"down"`, Supabase may be paused (Supabase dashboard › Restore). Once it answers, pull down on the phone: waiting work goes out by itself, in order, and never twice.
4. **Refused work:** the owner sees it in the app under **Updates** with the reason. To see the last refusals for a business:

   ```sql
   select "receivedAt", "operation", "result", "errorCode"
   from "SyncOperation"
   where "organizationId" = '<business id>' and "result" in ('conflict', 'rejected')
   order by "receivedAt" desc limit 20;
   ```

   Common reasons: the owner cancelled the job or gave it to another team while the phone was offline (`conflict`), or the person was removed from the team. The refused report is kept on the server (`payload`); enter what is needed by hand.
5. **Signed out:** if the phone shows the login screen, the login was reset or has lapsed. Unsent work stays on the phone; sign in again **as the same person** and it goes out.

## 8. Owner asks for their data

`npm run pilot -- export --business-phone <business mobile> --out export.json` writes everything the business entered (no login data). Send the file to the owner only (their registered email or WhatsApp), then delete your copy: it holds their customers' personal data.

## Monthly

- `npm run pilot -- purge-closed`, then with `--yes` (privacy policy: closed businesses are deleted after 30 days).
- Check that the last `restore-test` run is green.
- `npm audit --omit=dev` in backend and mobile; read the accepted risks in `docs/SECURITY_REVIEW.md` again.
