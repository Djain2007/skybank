// Utility to convert ArrayBuffer to Base64
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Utility to convert Base64 to ArrayBuffer
export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

// Reconstruct the canonical transaction representation deterministically (identical to server)
export function canonicalizeTransaction(
  senderAccount: string,
  recipientAccount: string,
  amount: number,
  timestamp: string,
  nonce: string,
  description: string = ''
): string {
  return [
    `amount:${amount}`,
    `description:${description}`,
    `nonce:${nonce}`,
    `recipient:${recipientAccount}`,
    `sender:${senderAccount}`,
    `timestamp:${timestamp}`
  ].join('|');
}

// Generate RSA-PSS keys for the user
export async function generateUserRSAKeys(): Promise<CryptoKeyPair> {
  return await window.crypto.subtle.generateKey(
    {
      name: 'RSA-PSS',
      modulusLength: 4096,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256'
    },
    true, // Extractable so we can export public key
    ['sign', 'verify']
  );
}

// Export Public Key to PEM
export async function exportPublicKeyToPem(key: CryptoKey): Promise<string> {
  const exported = await window.crypto.subtle.exportKey('spki', key);
  const base64 = arrayBufferToBase64(exported);
  return `-----BEGIN PUBLIC KEY-----\n${base64.match(/.{1,64}/g)?.join('\n')}\n-----END PUBLIC KEY-----`;
}

// Sign data using RSA-PSS
export async function signData(data: string, privateKey: CryptoKey): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const signatureBuffer = await window.crypto.subtle.sign(
    {
      name: 'RSA-PSS',
      saltLength: 32 // standard for SHA-256
    },
    privateKey,
    dataBuffer
  );
  return arrayBufferToBase64(signatureBuffer);
}

// Generate AES-256-GCM transaction key
export async function generateAESKey(): Promise<CryptoKey> {
  return await window.crypto.subtle.generateKey(
    {
      name: 'AES-GCM',
      length: 256
    },
    true, // extractable so we can encrypt it with RSA
    ['encrypt', 'decrypt']
  );
}

// Encrypt data with AES-256-GCM
export async function encryptAESGCM(data: string, key: CryptoKey): Promise<{ ciphertext: string, iv: string, authTag: string }> {
  const encoder = new TextEncoder();
  const encodedData = encoder.encode(data);
  const iv = window.crypto.getRandomValues(new Uint8Array(12)); // 96-bit nonce

  const encryptedBuffer = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv
    },
    key,
    encodedData
  );

  // Web Crypto API appends the authentication tag to the ciphertext
  const encryptedBytes = new Uint8Array(encryptedBuffer);
  
  // AES-GCM auth tag is typically 16 bytes (128 bits)
  const ciphertextBytes = encryptedBytes.slice(0, encryptedBytes.length - 16);
  const authTagBytes = encryptedBytes.slice(encryptedBytes.length - 16);

  return {
    ciphertext: arrayBufferToBase64(ciphertextBytes.buffer),
    iv: arrayBufferToBase64(iv.buffer),
    authTag: arrayBufferToBase64(authTagBytes.buffer)
  };
}

// Encrypt the AES key with Server's RSA-OAEP Public Key
export async function encryptAESKeyWithServerRSA(aesKey: CryptoKey, serverPublicKeyPem: string): Promise<string> {
  // First, extract the raw AES key
  const rawAesKey = await window.crypto.subtle.exportKey('raw', aesKey);
  
  // Convert PEM to CryptoKey
  const pemHeader = "-----BEGIN PUBLIC KEY-----";
  const pemFooter = "-----END PUBLIC KEY-----";
  const pemContents = serverPublicKeyPem.replace(pemHeader, "").replace(pemFooter, "").replace(/\s/g, "");
  const binaryDer = base64ToArrayBuffer(pemContents);
  
  const serverPublicKey = await window.crypto.subtle.importKey(
    "spki",
    binaryDer,
    {
      name: "RSA-OAEP",
      hash: "SHA-256"
    },
    false,
    ["encrypt"]
  );

  // Encrypt the AES key
  const encryptedKey = await window.crypto.subtle.encrypt(
    {
      name: "RSA-OAEP"
    },
    serverPublicKey,
    rawAesKey
  );

  return arrayBufferToBase64(encryptedKey);
}
