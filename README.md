# SkyBank
**Secure Banking. Built on Trust.**

SkyBank is an educational secure online banking transaction simulator designed to demonstrate real-world cryptographic concepts.

## Features
- Hybrid Encryption (AES-GCM & RSA-OAEP) for transactions
- Digital Signatures (RSA-PSS) for transaction integrity and non-repudiation
- Password Hashing (Argon2id)
- Replay Protection (Nonces & Timestamps)
- Educational Labs & Security Attack demonstrations

## Quick Start
1. `npm install`
2. `npm run dev`
3. Open [http://localhost:3000](http://localhost:3000)

## Demo Accounts
To demonstrate transfers, you can create the following accounts through the registration page (the system will assign specific test balances):
- Username: `alice` (Gets account SKY-10001 with 50,000 SKY)
- Username: `bob` (Gets account SKY-10002 with 20,000 SKY)

*Note: For the best demonstration of client-side cryptography, do this in two separate browsers or incognito windows.*

## Academic Purpose
This project is built explicitly for educational purposes. 
See `docs/course-mapping.md` for a complete mapping to the Cryptography syllabus.
