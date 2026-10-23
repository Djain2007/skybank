"use client";

import type { Transaction } from "@/lib/types";
import { formatAmount, formatShortDate } from "@/lib/format";
import StatusBadge from "./StatusBadge";
import { ArrowDownLeftIcon, ArrowUpRightIcon, TransferIcon } from "./Icons";
import styles from "./TransactionTable.module.css";

interface TransactionTableProps {
  transactions: Transaction[];
  mine: string;
  selectedId?: string | null;
  onSelect?: (transaction: Transaction) => void;
}

export default function TransactionTable({
  transactions,
  mine,
  selectedId,
  onSelect,
}: TransactionTableProps) {
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
          role: "button",
          "aria-selected": selectedId === tx.id,
        }
      : {};

  return (
    <>
      {/* Desktop Wide Table */}
      <div className={`table-wrap ${styles.tableWrap}`}>
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
              const isSelected = selectedId === tx.id;
              return (
                <tr
                  key={tx.id}
                  className={`${selectable ? "is-clickable" : ""} ${isSelected ? "is-selected" : ""}`}
                  {...rowProps(tx)}
                >
                  <td className={styles.dateCell}>{formatShortDate(tx.timestamp)}</td>
                  <td>
                    <Counterparty tx={tx} sent={sent} self={self} />
                  </td>
                  <td className={styles.descriptionCell}>
                    {tx.description ? (
                      <span className={styles.descText}>{tx.description}</span>
                    ) : (
                      <span className="text-secondary" style={{ fontStyle: "italic", fontSize: 13 }}>
                        No description
                      </span>
                    )}
                  </td>
                  <td className={`cell-right num ${styles.amountCell} ${!sent && !self ? styles.amountIn : ""}`}>
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

      {/* Mobile Card / Feed List (Strictly prevents horizontal scrolling on phones) */}
      <ul className={styles.mobileList} aria-label="Transactions list">
        {transactions.map((tx) => {
          const sent = tx.sender_number === mine;
          const self = tx.sender_number === tx.recipient_number;
          const isSelected = selectedId === tx.id;
          return (
            <li
              key={tx.id}
              className={`${styles.mobileItem} ${selectable ? styles.mobileItemClickable : ""} ${
                isSelected ? styles.mobileItemSelected : ""
              }`}
              {...rowProps(tx)}
            >
              <div className={styles.mobileLeft}>
                <DirectionIcon sent={sent} self={self} size={16} />
                <div className={styles.mobileDetails}>
                  <div className={styles.mobileTitle}>
                    <span className={styles.directionLabel}>{self ? "Self Transfer" : sent ? "To" : "From"}</span>{" "}
                    {!self && <span className="mono">{sent ? tx.recipient_number : tx.sender_number}</span>}
                  </div>
                  <div className={styles.mobileMeta}>
                    <span>{formatShortDate(tx.timestamp)}</span>
                    {tx.description && (
                      <>
                        <span className={styles.dotSeparator}>•</span>
                        <span className={styles.mobileDesc}>{tx.description}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className={styles.mobileRight}>
                <span className={`num ${styles.amountCell} ${!sent && !self ? styles.amountIn : ""}`}>
                  <Amount tx={tx} sent={sent} self={self} />
                </span>
                <StatusBadge status={tx.status} />
              </div>
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

function Amount({ tx, sent, self }: { tx: Transaction; sent: boolean; self: boolean }) {
  const sign = self ? "" : sent ? "\u2212" : "+";
  return (
    <>
      {sign}
      {formatAmount(tx.amount)} SKY
    </>
  );
}
