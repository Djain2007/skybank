# Cryptography Course Mapping

SkyBank is explicitly designed to map to core concepts taught in modern applied cryptography.

## 1. Confidentiality (Encryption)
- **Concept:** AES-256-GCM
- **Implementation:** Used for encrypting the transaction payload in the browser before sending to the server. Provides both confidentiality and authenticated integrity.

## 2. Secure Key Exchange
- **Concept:** Hybrid Encryption / RSA-OAEP
- **Implementation:** The client generates a random AES-256 key per transaction, and encrypts it using the server's RSA-OAEP public key.

## 3. Digital Signatures & Non-Repudiation
- **Concept:** RSA-PSS
- **Implementation:** The client signs a canonicalized version of the transaction using their locally generated RSA-PSS private key. The server verifies this signature.

## 4. Integrity
- **Concept:** Hashing (SHA-256) / AES-GCM Auth Tag
- **Implementation:** The transaction payload integrity is checked via the GCM authentication tag. Signature integrity relies on SHA-256.

## 5. Password Security
- **Concept:** Argon2id
- **Implementation:** User passwords are hashed using Argon2id with random salts (handled natively by the `argon2` library).

## 6. Freshness & Replay Protection
- **Concept:** Nonces and Timestamps
- **Implementation:** The server checks transaction timestamps to ensure they are within a 5-minute window, and records the AES-GCM nonce to ensure it is never reused (rejecting replay attacks).

## 7. Cryptanalysis & Attack Demonstrations
- **Concept:** Active Attacks
- **Implementation:** The "Security Tests" lab actively modifies ciphertexts, signatures, and amounts, proving that the cryptographic pipeline accurately rejects tampered data.
