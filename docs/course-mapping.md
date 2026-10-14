# Course mapping

How SkyBank's features line up with the core topics of an applied cryptography course. Each row names the concept, the primitive SkyBank uses, and where to see it in the app.

| Topic | Primitive | Where it appears |
| --- | --- | --- |
| Confidentiality | AES-256-GCM | The transfer payload is encrypted in the browser before it is sent. The server decrypts it only after unwrapping the key. |
| Authenticated encryption and integrity | GCM authentication tag | Any change to the ciphertext makes decryption fail. See the "Modified ciphertext" security test. |
| Hybrid encryption and key exchange | RSA-OAEP, 4096-bit, SHA-256 | A fresh AES key is generated per transfer and wrapped with the server's public key. The server's key pair is generated on first run. |
| Digital signatures and non-repudiation | RSA-PSS, 4096-bit, SHA-256 | Each user's key pair is generated in the browser at registration. The canonical transaction is signed with the private key and verified by the server with the stored public key. See the "Amount tampering" and "Forged signature" tests. |
| Canonicalisation | Deterministic field ordering | `canonicalizeTransaction` is implemented identically in `src/lib/crypto/client.ts` and `src/lib/crypto/server.ts` so both sides sign and verify the same bytes. |
| Hash functions | SHA-256 | Underlies both signature schemes; try it directly in the cryptography lab. |
| Message authentication codes | HMAC-SHA-256 | Demonstrated in the cryptography lab as the integrity-only alternative to AES-GCM. |
| Password storage | Argon2id | Passwords are hashed with a random salt and memory-hard parameters at registration and verified at login. |
| Freshness and replay protection | Nonce and timestamp | The AES-GCM nonce is stored with each transaction and must be unique; the timestamp must be within five minutes of the server's clock. See the "Replay attack" test. |
| Session management | Random 256-bit token | Sessions are stored server-side and referenced by an `httpOnly`, `sameSite=strict` cookie. |
| Active attacks | Tampering and replay | The security tests page builds genuine transfers, alters one element, and shows the server rejecting each one. |
| Auditability | Append-only event log | Every sign-in, completed transfer and rejected attempt is recorded with its reason in the audit log. |

The order of checks on the server, and the full transfer protocol, are described in the [README](../README.md#what-a-transfer-looks-like).
