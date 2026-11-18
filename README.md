# KaamSetu app

Monorepo for the KaamSetu field-service app. Product docs live one folder up in
`../KaamSetu_Product_Documentation`.

| Folder     | Stack                                                        |
| ---------- | ------------------------------------------------------------ |
| `mobile/`  | Expo, React Native, TypeScript, Expo Router                  |
| `backend/` | NestJS (REST), Prisma 7, PostgreSQL                          |

## Requirements

- Node.js 24 (installed) and Git (installed)
- PostgreSQL 16+ (not installed yet; the backend starts without it)
- Expo Go on an Android phone, or Android Studio for an emulator

## Run the backend

```bash
cd backend
npm install
npm run start:dev
```

Open http://localhost:3000/health. It returns `"database":"down"` until PostgreSQL is set up.

## Run the mobile app

```bash
cd mobile
npm install
npm start
```

Scan the QR code with Expo Go, or press `a` for an Android emulator, or `w` for the web preview.

## When PostgreSQL is installed

1. Create a database called `kaamsetu`.
2. Set `DATABASE_URL` in `backend/.env` (copy `backend/.env.example` if `.env` is missing).
3. Create the tables:

```bash
cd backend
npx prisma migrate dev --name init
```

`/health` should then report `"database":"up"`.

## Useful commands

| Where     | Command                 | What it does                         |
| --------- | ----------------------- | ------------------------------------ |
| backend   | `npm test`              | Unit tests (Vitest)                  |
| backend   | `npm run build`         | Compile to `dist/`                   |
| backend   | `npx prisma studio`     | Browse the database in a browser     |
| backend   | `npx prisma generate`   | Rebuild the Prisma client after schema edits (also runs on `npm install`) |
| mobile    | `npm run android`       | Open on a connected Android device/emulator |
| mobile    | `npm run lint`          | Lint                                 |
