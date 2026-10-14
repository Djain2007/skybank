# SkyBank

An educational online-banking simulator that makes the cryptography behind every transfer visible.

SkyBank looks and behaves like a small bank: you register, hold a balance in SKY, send money to other accounts and read your statement. Underneath, every transfer is encrypted, signed and verified with real primitives in the browser and on the server, and the app lets you inspect each step, run attacks against your own transfers, and watch the server refuse them.

Built with Next.js 16, React 19, TypeScript, SQLite and the Web Crypto API. No external services; everything runs locally.

## Contents

- [Getting started](#getting-started)
- [Demo walkthrough](#demo-walkthrough)
- [What a transfer looks like](#what-a-transfer-looks-like)
- [Pages](#pages)
- [Cryptography used](#cryptography-used)
- [API](#api)
- [Project structure](#project-structure)
- [Resetting the simulator](#resetting-the-simulator)
- [Scope and limitations](#scope-and-limitations)

## Getting started

Requirements: Node.js 20 or later and npm.

```bash
npm install
npm run dev
```

Open <http://localhost:3000>. The first request creates `skybank.db` in the project root, applies the schema and generates the server's 4096-bit RSA key pair.

Other scripts:

| Command         | What it does                              |
| --------------- | ----------------------------------------- |
| `npm run dev`   | Start the development server              |
| `npm run build` | Create a production build                 |
| `npm run start` | Serve the production build                |
| `npm run lint`  | Run ESLint with the Next.js configuration |

## Demo walkthrough

Two usernames are reserved for the demo. Registering with either of them assigns a fixed account number and opening balance, so the steps below work the same way every time.

| Username | Account number | Opening balance |
| -------- | -------------- | --------------- |
| `daksh`  | `SKY-10001`    | 50,000 SKY      |
| `jash`   | `SKY-10002`    | 20,000 SKY      |

Any other username gets a random account number and 50,000 SKY.

1. Open the app in one browser and register as **daksh**. Use any name, email and password of at least 8 characters.
2. Open a second browser, or a private window, and register as **jash**.
3. As Daksh, go to **Transfer**, send 5,000 SKY to `SKY-10002`, and watch the verification steps run.
4. Open **Transactions** and select the transfer to see its cryptographic envelope: nonce, authentication tag, signature, wrapped key and ciphertext.
5. As Jash, refresh the overview. The balance is now 25,000 SKY and the transfer appears as received.
6. Go to **Security tests** and run each attack. Every one is refused, and the reason is written to the **Audit log**.

Two browsers are needed because each account's private signing key is generated in the browser at registration and stored only there, in `localStorage`. The server never sees it.

## What a transfer looks like

When you confirm a transfer, the browser does the following before anything is sent:

1. Generates a one-time 256-bit AES key.
2. Encrypts the transaction payload with AES-256-GCM, producing a ciphertext, a 96-bit nonce and a 128-bit authentication tag.
3. Builds a canonical string from the transaction fields (amount, description, nonce, recipient, sender, timestamp) and signs it with the user's RSA-PSS private key.
4. Wraps the AES key with the server's RSA-OAEP public key.
5. Sends the ciphertext, nonce, tag, wrapped key, signature and the plaintext fields needed to rebuild the canonical string.

The server then verifies in this order, and stops at the first failure:

1. Unwraps the AES key with its RSA private key.
2. Decrypts the payload. AES-GCM rejects it if the ciphertext or tag was altered.
3. Rebuilds the canonical string and verifies the RSA-PSS signature against the sender's stored public key.
4. Checks the nonce has never been seen before (replay protection).
5. Checks the timestamp is within five minutes of the server's clock.
6. Confirms the sender owns the account, has enough balance, and the recipient exists.
7. Debits, credits, and stores the transaction together with its cryptographic envelope, in one database transaction.

Every rejection is recorded in the audit log with its reason.

## Pages

| Route             | Purpose                                                                                        |
| ----------------- | ---------------------------------------------------------------------------------------------- |
| `/register`       | Create an account. Generates the user's RSA-PSS key pair in the browser.                        |
| `/login`          | Sign in. Passwords are verified against Argon2id hashes.                                       |
| `/`               | Overview: balance, account number, recent transactions and the protections on the account.    |
| `/transfer`       | Send SKY in four steps: details, review, verification, receipt.                                |
| `/transactions`   | Full history with an inspector showing each transfer's cryptographic envelope.                 |
| `/crypto-lab`     | Try SHA-256 and HMAC-SHA-256 in the browser, and see where each primitive is used in the app.  |
| `/security-tests` | Run four attacks against your own account: amount tampering, forged signature, modified ciphertext, replay. |
| `/audit`          | The server's record of sign-ins, completed transfers and rejected attempts.                   |

## Cryptography used

| Concept                     | Primitive                      | Where                                                                                  |
| --------------------------- | ------------------------------ | -------------------------------------------------------------------------------------- |
| Confidentiality             | AES-256-GCM                    | Transfer payload, encrypted in the browser                                             |
| Integrity                   | GCM authentication tag         | Detects any change to the ciphertext                                                   |
| Key exchange                | RSA-OAEP, 4096-bit, SHA-256    | Wraps the one-time AES key for the server                                              |
| Authenticity, non-repudiation | RSA-PSS, 4096-bit, SHA-256   | User signs the canonical transaction; server verifies with the stored public key        |
| Password storage            | Argon2id                       | Registration and login                                                                 |
| Freshness                   | Nonce and timestamp            | Nonce uniqueness enforced in the database; five-minute timestamp window                |
| Hashing and MACs            | SHA-256, HMAC-SHA-256          | Interactive demonstrations in the cryptography lab                                     |
| Session management          | Random 256-bit token           | Stored server-side; sent as an `httpOnly`, `sameSite=strict` cookie                     |

Browser-side operations use the Web Crypto API (`src/lib/crypto/client.ts`). Server-side operations use Node's `crypto` module (`src/lib/crypto/server.ts`). The canonicalisation function is implemented identically on both sides so that signatures verify.

A mapping of these concepts to a cryptography syllabus is in [`docs/course-mapping.md`](docs/course-mapping.md).

## API

All routes are under `/api` and return JSON. Routes marked *session* require a valid session cookie.

| Method | Route                | Description                                                                  |
| ------ | -------------------- | ---------------------------------------------------------------------------- |
| `POST` | `/api/auth/register` | Create a user and account. Body: `fullName`, `username`, `email`, `password`, `publicKey` (PEM). |
| `POST` | `/api/auth/login`    | Verify credentials and start a session. Body: `username`, `password`.        |
| `POST` | `/api/auth/logout`   | End the current session.                                                     |
| `GET`  | `/api/auth/me`       | *session* — Current user and account.                                        |
| `GET`  | `/api/config`        | The server's RSA-OAEP public key (PEM).                                      |
| `POST` | `/api/transfer`      | *session* — Submit an encrypted, signed transfer. See the verification steps above. |
| `GET`  | `/api/transactions`  | *session* — Transactions for the current account, with their security metadata. |
| `GET`  | `/api/audit`         | *session* — The most recent 100 audit events visible to the current user.   |

## Project structure

```
src/
├── app/
│   ├── layout.tsx                 Root layout, fonts and metadata
│   ├── globals.css                Design tokens and shared primitives
│   ├── icon.svg                   Favicon
│   ├── page.tsx                   Overview
│   ├── login/                     Sign in
│   ├── register/                  Create account
│   ├── transfer/                  Send a transfer
│   ├── transactions/              History and envelope inspector
│   ├── crypto-lab/                Hash and MAC demonstrations
│   ├── security-tests/            Attack simulations
│   ├── audit/                     Audit log
│   ├── api/                       Route handlers (see API above)
│   ├── components/                Layout, navigation, session context, icons
│   └── fonts/                     Self-hosted Instrument Sans and JetBrains Mono (OFL)
└── lib/
    ├── auth.ts                    Session creation, lookup and destruction
    ├── serverConfig.ts            Server RSA key pair, generated once and stored
    ├── types.ts                   Shared API types
    ├── crypto/
    │   ├── client.ts              Web Crypto: keys, AES-GCM, RSA-OAEP, RSA-PSS
    │   └── server.ts              Node crypto: unwrap, decrypt, verify
    └── db/
        ├── index.ts               SQLite connection (better-sqlite3, WAL mode)
        └── schema.sql             Tables: users, sessions, accounts, transactions,
                                   transaction_security, audit_logs, server_config
```

## Resetting the simulator

All state lives in `skybank.db` (plus its `-wal` and `-shm` companions) in the project root. These files are ignored by git. To start fresh, stop the server and delete them:

```bash
rm -f skybank.db skybank.db-wal skybank.db-shm
```

The next request recreates the schema and a new server key pair. Private signing keys live in each browser's `localStorage` under `skybank_priv_<username>`; clear site data to remove them.

## Scope and limitations

SkyBank is a teaching tool, not a bank. The cryptography is real, but several choices were made for clarity rather than production use:

- Private signing keys are kept in `localStorage` so the flow is easy to inspect. A real client would use non-extractable keys or a hardware-backed store.
- The server's RSA private key is stored in the SQLite database rather than a key management service.
- Transport security (TLS) is assumed to be provided by the deployment and is not part of the simulation.
- There is no rate limiting, account lockout or email verification.
- SKY has no value and all data is local to your machine.
