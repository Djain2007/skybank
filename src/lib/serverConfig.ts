import db from './db';
import { generateServerKeys } from './crypto/server';

export function getServerRSAKeys(): { publicKey: string, privateKey: string } {
  const getStmt = db.prepare('SELECT value FROM server_config WHERE key = ?');
  
  const pubRec = getStmt.get('rsa_public_key') as { value: string } | undefined;
  const privRec = getStmt.get('rsa_private_key') as { value: string } | undefined;

  if (pubRec && privRec) {
    return {
      publicKey: pubRec.value,
      privateKey: privRec.value
    };
  }

  // Generate new keys if not present
  const keys = generateServerKeys();
  const insertStmt = db.prepare('INSERT INTO server_config (key, value) VALUES (?, ?)');
  
  db.transaction(() => {
    insertStmt.run('rsa_public_key', keys.publicKey);
    insertStmt.run('rsa_private_key', keys.privateKey);
  })();

  return keys;
}

export function getServerPublicKey(): string {
  return getServerRSAKeys().publicKey;
}
