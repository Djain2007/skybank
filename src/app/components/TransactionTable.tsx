"use client";

import type { Transaction } from "@/lib/types";
import { formatAmount, formatShortDate } from "@/lib/format";
import StatusBadge from "./StatusBadge";
import { ArrowDownLeftIcon, ArrowUpRightIcon, TransferIcon } from "./Icons";
import styles from "./TransactionTable.module.css";

interface TransactionTableProps {
  transactions: Transaction[];
  /** The viewer's account number, used to decide whether a row was sent or received. */
  mine: string;
  selectedId?: string | null;
  /** When provided, rows are selectable. */
  onSelect?: (transaction: Transaction) => void;
}

/**
 * Lists transactions as a table on wide screens and as a bank-statement style
 * list on phones, where a five-column table would scroll sideways.
 */
export default function TransactionTable({ transactions, mine, selectedId, onSelect }: TransactionTableProps) {
  const selectable = Boolean(onSelect);

  const rowProps = (tx: Transaction) =>
    selectable
      ? {
          onClick: () => onSelect?.(tx),
          onKeyDown: (e: React.KeyboardEvent) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onSelect?.(tx);
            }
          },
          tabIndex: 0,
          "aria-selected": selectedId === tx.id,
        }
      : {};

  return (
    <>
      <div className={`table-wrap ${styles.table}`}>
        <table className="table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Counterparty</th>
              <th>Description</th>
              <th className="cell-right">Amount</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((tx) => {
              const sent = tx.sender_number === mine;
              const self = tx.sender_number === tx.recipient_number;
              return (
                <tr
                  key={tx.id}
                  className={`${selectable ? "is-clickable" : ""} ${selectedId === tx.id ? "is-selected" : ""}`}
                  {...rowProps(tx)}
                >
                  <td className={styles.date}>{formatShortDate(tx.timestamp)}</td>
                  <td>
                    <Counterparty tx={tx} sent={sent} self={self} />
                  </td>
                  <td className={styles.description}>
                    {tx.description || <span className="text-secondary">No description</span>}
                  </td>
                  <td className={`cell-right num ${styles.amount} ${!sent && !self ? styles.amountIn : ""}`}>
                    <Amount tx={tx} sent={sent} self={self} />
                  </td>
                  <td>
                    <StatusBadge status={tx.status} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ul className={styles.list}>
        {transactions.map((tx) => {
          const sent = tx.sender_number === mine;
          const self = tx.sender_number === tx.recipient_number;
          return (
            <li
              key={tx.id}
              className={`${styles.item} ${selectable ? styles.itemClickable : ""} ${selectedId === tx.id ? styles.itemSelected : ""}`}
              {...rowProps(tx)}
            >
              <DirectionIcon sent={sent} self={self} size={15} />
              <span className={styles.itemText}>
                <span className={styles.itemTitle}>
                  <span className={styles.directionLabel}>{self ? "To yourself" : sent ? "To" : "From"}</span>{" "}
                  {!self && <span className="mono">{sent ? tx.recipient_number : tx.sender_number}</span>}
                </span>
                <span className={styles.itemMeta}>
                  <span>{formatShortDate(tx.timestamp)}</span>
                  {tx.description && <span className={styles.itemDescription}>{tx.description}</span>}
                </span>
              </span>
              <span className={`num ${styles.amount} ${!sent && !self ? styles.amountIn : ""}`}>
                <Amount tx={tx} sent={sent} self={self} />
              </span>
            </li>
          );
        })}
      </ul>
    </>
  );
}

function DirectionIcon({ sent, self, size }: { sent: boolean; self: boolean; size: number }) {
  const tone = self ? styles.self : sent ? styles.sent : styles.received;
  return (
    <span className={`${styles.direction} ${tone}`}>
      {self ? <TransferIcon size={size} /> : sent ? <ArrowUpRightIcon size={size} /> : <ArrowDownLeftIcon size={size} />}
    </span>
  );
}

function Counterparty({ tx, sent, self }: { tx: Transaction; sent: boolean; self: boolean }) {
  return (
    <span className={styles.counterparty}>
      <DirectionIcon sent={sent} self={self} size={14} />
      <span>
        <span className={styles.directionLabel}>{self ? "To yourself" : sent ? "To" : "From"}</span>{" "}
        {!self && <span className="mono">{sent ? tx.recipient_number : tx.sender_number}</span>}
      </span>
    </span>
  );
}

/** Sent amounts carry a minus sign, received a plus; a transfer to yourself nets to zero and carries neither. */
function Amount({ tx, sent, self }: { tx: Transaction; sent: boolean; self: boolean }) {
  const sign = self ? "" : sent ? "\u2212" : "+";
  return (
    <>
      {sign}
      {formatAmount(tx.amount)} SKY
    </>
  );
}
