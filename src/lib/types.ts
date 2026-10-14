/** Shapes returned by the SkyBank API routes, shared by the client pages. */

export interface SessionUser {
  id: string;
  username: string;
  fullName: string;
}

export interface Account {
  accountNumber: string;
  balance: number;
}

export interface Session {
  user: SessionUser;
  account: Account;
}

export type TransactionStatus = "COMPLETED" | "FAILED";

export interface Transaction {
  id: string;
  sender_account_id: string;
  recipient_account_id: string;
  sender_number: string;
  recipient_number: string;
  amount: number;
  status: TransactionStatus;
  timestamp: string;
  description: string | null;
  nonce: string;
  ciphertext: string;
  auth_tag: string;
  encrypted_aes_key: string;
  rsa_signature: string;
}

export type AuditResult = "SUCCESS" | "FAILURE";

export interface AuditLog {
  id: string;
  timestamp: string;
  event_type: string;
  user_id: string | null;
  transaction_id: string | null;
  result: AuditResult;
  details: string | null;
}
