"use client";

import type { ReactNode } from "react";
import { cn } from "../cn";

export type SortDirection = "asc" | "desc";

export interface DataTableColumn {
  label: ReactNode;
  /** Present makes the header a sort control. Omit for a static column. */
  sortKey?: string;
}

export interface DataTableProps {
  /** A bare string is a static column; pass an object to make it sortable. */
  columns: Array<string | DataTableColumn>;
  rows: ReactNode[][];
  /** Row to fill with the signal wash — "your position" on the standings. */
  highlightIndex?: number;
  /** Rendered in place of the body when there are no rows. */
  empty?: ReactNode;
  sortKey?: string;
  sortDir?: SortDirection;
  onSort?: (key: string) => void;
  className?: string;
}

function normalise(column: string | DataTableColumn): DataTableColumn {
  return typeof column === "string" ? { label: column } : column;
}

/**
 * Hairline-ruled table. The first cell of every row is set in mono, because
 * it is always a counter, rank or identifier.
 */
export function DataTable({
  columns,
  rows,
  highlightIndex = -1,
  empty,
  sortKey,
  sortDir = "asc",
  onSort,
  className,
}: DataTableProps) {
  const cols = columns.map(normalise);

  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className="w-full border-collapse">
        <thead>
          <tr>
            {cols.map((col, i) => {
              const sortable = Boolean(col.sortKey && onSort);
              const active = sortable && col.sortKey === sortKey;
              return (
                <th
                  key={i}
                  scope="col"
                  aria-sort={
                    !sortable
                      ? undefined
                      : active
                        ? sortDir === "asc"
                          ? "ascending"
                          : "descending"
                        : "none"
                  }
                  className="border-b border-line-hairline px-4 py-3 text-left label-mono whitespace-nowrap text-mute-500"
                >
                  {sortable ? (
                    <button
                      type="button"
                      onClick={() => onSort!(col.sortKey!)}
                      className="label-mono cursor-pointer text-mute-500 transition-fast hover:text-bone-100 focus-signal"
                    >
                      {col.label}
                      {/*
                        Its own element on purpose. Testing Library matches text
                        against an element's direct text children only, so
                        keeping the arrow nested leaves the header findable by
                        its plain label.
                      */}
                      {active && (
                        <span aria-hidden="true" className="ml-1 text-signal">
                          {sortDir === "asc" ? "▲" : "▼"}
                        </span>
                      )}
                    </button>
                  ) : (
                    col.label
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && empty ? (
            <tr>
              <td
                colSpan={cols.length}
                className="border-t border-line-hairline px-4 py-3 text-sm text-mute-500"
              >
                {empty}
              </td>
            </tr>
          ) : (
            rows.map((cells, i) => (
              <tr
                key={i}
                className={cn(
                  "transition-fast",
                  i === highlightIndex ? "bg-signal-wash" : "hover:bg-ink-600",
                )}
              >
                {cells.map((c, j) => (
                  <td
                    key={j}
                    className={cn(
                      "border-t border-line-hairline px-4 py-3 text-sm",
                      j === 0
                        ? "font-mono tracking-mono text-mute-500"
                        : "font-display text-bone-100",
                    )}
                  >
                    {c}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
