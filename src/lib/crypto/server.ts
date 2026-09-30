import crypto from 'crypto';

// Reconstruct the canonical transaction representation deterministically
export function canonicalizeTransaction(
  senderAccount: string,
  recipientAccount: string,
  amount: number,
  timestamp: string,
  nonce: string,
  description: string = ''
): string {
  // Define strict ordering for canonicalization
  return [
    `amount:${amount}`,
    `description:${description}`,
    `nonce:${nonce}`,
    `recipient:${recipientAccount}`,
    `sender:${senderAccount}`,
    `timestamp:${timestamp}`
  ].join('|');
}

// Generate server RSA keys (For Hybrid Encryption: Server RSA-OAEP public key is used by client to encrypt AES key)
export function generateServerKeys() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 4096,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem'
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem'
    }
  });
  return { publicKey, privateKey };
}

// Decrypt the AES key encrypted with the server's RSA-OAEP public key
export function decryptAESKey(encryptedKeyBase64: string, serverPrivateKeyPem: string): Buffer {
  const encryptedKey = Buffer.from(encryptedKeyBase64, 'base64');
  return crypto.privateDecrypt(
    {
      key: serverPrivateKeyPem,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: 'sha256'
    },
    encryptedKey
  );
}

// Decrypt the AES-256-GCM ciphertext
export function decryptTransaction(
  ciphertextBase64: string,
  key: Buffer,
  nonceBase64: string,
  authTagBase64: string
): string {
  const ciphertext = Buffer.from(ciphertextBase64, 'base64');
  const nonce = Buffer.from(nonceBase64, 'base64');
  const authTag = Buffer.from(authTagBase64, 'base64');

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, nonce);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(ciphertext, undefined, 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

// Verify the RSA-PSS signature from the user
export function verifySignature(
  canonicalData: string,
  signatureBase64: string,
  userPublicKeyPem: string
): boolean {
  const verify = crypto.createVerify('SHA256');
  verify.update(canonicalData);
  verify.end();

  return verify.verify(
    {
      key: userPublicKeyPem,
      padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
      saltLength: crypto.constants.RSA_PSS_SALTLEN_AUTO
    },
    Buffer.from(signatureBase64, 'base64')
  );
}

// Educational HKDF Demonstration
export function deriveKeyHKDF(
  ikm: string,
  salt: string,
  info: string,
  keyLength: number = 32
): Buffer {
  const ikmBuffer = Buffer.from(ikm, 'utf-8');
  const saltBuffer = Buffer.from(salt, 'utf-8');
  const infoBuffer = Buffer.from(info, 'utf-8');
  
  // Using node crypto hkdf
  return Buffer.from(crypto.hkdfSync('sha256', ikmBuffer, saltBuffer, infoBuffer, keyLength));
}
