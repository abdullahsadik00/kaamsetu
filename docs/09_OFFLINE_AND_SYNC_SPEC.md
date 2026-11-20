# 09 — KaamSetu Offline and Synchronization Specification

> **Source of truth for:** what works offline, how phone data reaches the server, and what happens on conflicts.
> **Status (19 Nov 2026):** §3 storage and §5 outbox are implemented in `mobile/src/db` and `mobile/src/features/sync` (T3.8): per-user SQLite, outbox with backoff and NEEDS_ATTENTION, no business operations queued yet. Since 20 Nov 2026 the sender also runs when the internet comes back (NetInfo), an offline banner tells staff to keep working, and sent operations older than 7 days are pruned. The sync endpoints (§6) do not exist yet. Several details depend on discovery (marked Q-xx, see `DECISION_LOG.md`).

## 1. Principles

1. **The server is the source of truth.** The phone holds a working copy and a queue of changes.
2. **Never lose field work.** Anything a technician saves survives no network, app kill, phone restart and low battery.
3. **Retries are safe.** Sending the same change twice has the same effect as sending it once (idempotency).
4. **Technicians never see sync concepts.** They see only: *Saved on phone* → *Sending…* → *Sent* or *Needs attention* (wording in doc 08).
5. **Keep it simple.** A hand-written outbox over Expo SQLite, not a sync framework, until we have evidence we need one (D-006).

## 2. What works offline, by role

| Role | Available offline | Needs internet |
|---|---|---|
| Senior technician | Their team's assigned jobs (today, tomorrow, and open on-hold jobs), customer name/phone/address, ACs on the job, last service summary for those ACs; start work, status updates, finish page, photos, money collected | Seeing newly assigned jobs, full customer history |
| Helper (if they log in, Q-01) | Current team job: locality, job type, what to carry | Everything else |
| Owner (D-021) | Read: recent jobs, customers and ACs already loaded. Write: save enquiries, create and assign jobs, add customers and ACs | Bills, quotations, payments, confirming cash handovers |

Financial writes (bills, quotations, payments, cash handover confirmation) are **online-only** in MVP. This removes the hardest conflict cases.

Owner offline writes: a job created offline shows "Will reach the team when your phone is online" until it syncs; the job number arrives then. A customer added offline may duplicate one added elsewhere; the server warns on matching phone numbers at sync and the owner can merge (merge tool: P1).

## 3. Local storage

- **Expo SQLite** holds cached records and the outbox, in one database per logged-in user.
- **Expo FileSystem** holds photos until uploaded.
- **Expo SecureStore** holds tokens. No customer data in SecureStore or AsyncStorage.
- Cached data is cleared on logout. A technician removed from the team loses access at the next sync.
- Retention: jobs completed more than 7 days ago are removed from the phone after they are *Sent* (tunable).

## 4. Identifiers

- Every record a phone can create (job update, service report, work item, part usage, reading, attachment, cash collection, and owner enquiries) gets a **UUID generated on the phone**. The server accepts it as the primary key.
- The server treats the same UUID with the same content as a duplicate (idempotent success) and rejects the same UUID with different content.
- Human numbers (`#1048`, `KS-0085`) are assigned only by the server.

## 5. Outbox

Each local write runs in **one SQLite transaction**: update the local record + insert an outbox row.

| Field | Purpose |
|---|---|
| `id` | Operation UUID; also the **idempotency key** |
| `entityType`, `entityId` | What is changed |
| `operation` | e.g. `job.start`, `job.update`, `job.complete`, `attachment.upload` |
| `payload` | JSON body |
| `baseVersion` | Version of the record the user saw (for conflict checks) |
| `createdAt` | Phone time |
| `state` | `PENDING` → `SENDING` → `SENT` / `FAILED_RETRYABLE` / `NEEDS_ATTENTION` |
| `attempts`, `lastErrorCode` | Retry bookkeeping |
| `dependsOn` | Operation that must succeed first (e.g. photo upload before report) |

Rules:
- Send in creation order per job. Do not send an operation until its `dependsOn` is `SENT`.
- Retry with backoff (e.g. 5 s, 30 s, 2 min, 10 min, then every 10 min) on network errors and 5xx.
- 4xx validation or permission errors → `NEEDS_ATTENTION`, never silently dropped. The technician sees "Needs attention · call owner"; the owner sees the item on their dashboard.
- Triggers: app open, app resume, connectivity regained, after each local save, and best-effort background task. Background sync is never relied on.

## 6. Sync protocol

| Endpoint | Use |
|---|---|
| `GET /api/v1/sync/bootstrap` | First login or after cache reset: everything this user may hold offline (section 2) plus a `cursor` |
| `GET /api/v1/sync/changes?cursor=` | Records changed since the cursor that this user may see, plus deletions/unassignments, and a new cursor |
| `POST /api/v1/sync/operations` | Batch of outbox operations (max 50). Response lists each operation: `applied`, `duplicate`, `conflict`, or `rejected` with an error code. Partial success is normal |
| `POST /api/v1/attachments/upload-url` → upload → `POST /api/v1/sync/attachments/complete` | Photo upload in three steps; the report references the attachment UUID |

- The cursor is a server-side monotonic value (e.g. a per-organization change sequence), not phone time.
- Access filtering happens on the server for every pull: a technician only ever receives their team's jobs (doc 10).
- The server stores processed operation IDs (`SyncOperation`, doc 05) for at least 30 days to recognise duplicates.

## 7. Conflict policy per record

Conflicts are detected with `version`: the phone sends `baseVersion`; the server compares with the current version.

| Record | Who edits it | Policy |
|---|---|---|
| Job status (start, hold, resume, complete) | Technician, owner | **Server state machine decides.** A valid transition is applied even if the version moved (e.g. owner edited the address). If the job was cancelled or reassigned meanwhile, the result is `conflict` and the technician's work is **kept** as a submitted report flagged for owner review |
| Job details (address, slot, complaint) | Owner only | Owner is online; plain version check, reject if stale and show fresh data |
| Job update (part needed, note, appointment fixed) | Technician | Append-only. Never conflicts |
| Service report, work items, parts, readings | Senior technician | Append-only per submission. A second submission for the same job creates a new report version; the owner sees both |
| Photos | Technician | Append-only |
| Cash collection | Technician creates; owner confirms | Created once (idempotent). Only the owner changes status, online |
| Bills, payments | Owner, online only | Normal transactional API; idempotency key on payment creation |
| Customer, AC details | Owner (technician may add an AC on site, *proposed*) | Owner changes win; a technician-added AC is a new record, never an overwrite |

**No last-write-wins on financial records**, and no silent overwrite of a completion.

## 8. Photos

1. Capture → compress on the phone (target ≤ 300 KB, long edge ~1600 px) → save to app storage → outbox row.
2. Upload when online (mobile data allowed; Q-10 to confirm data cost concerns).
3. The server confirms the object exists, then marks the attachment `UPLOADED`.
4. The local file is deleted only after confirmation and after the job leaves the retention window.
5. An interrupted upload restarts from the beginning (files are small; no resumable upload in MVP).

## 9. Time

Phone timestamps are recorded (`createdAt`) and the server also stores `receivedAt`. Ordering and reports use server time when phone time is clearly wrong (more than 24 h in the future).

## 10. Test scenarios (must pass before pilot)

Carried over from the original plan and extended:
1. Start a job offline. 2. Complete a job offline. 3. Kill and reopen the app with unsent work. 4. Restore network. 5. Upload photos after reconnect. 6. Send the same operation twice. 7. Lose connection mid-upload. 8. Update the same job from two devices. 9. Owner cancels a job while the technician completes it offline. 10. Technician removed from the team while holding unsent work. 11. Phone clock wrong by a day. 12. Three days offline with 5 jobs and 20 photos.

Test design: `12_TESTING_STRATEGY.md`.
