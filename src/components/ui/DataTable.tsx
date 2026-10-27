'use client';

import type { Key, MouseEvent, ReactNode } from 'react';
import { cx } from '@/lib/helpers/cx';
import { DASH } from '@/lib/helpers/format';
import styles from './DataTable.module.css';

export interface Column<Row> {
  key: string;
  label: ReactNode;
  num?: boolean; // right-aligned, tabular figures
  cell?: (row: Row, index: number) => ReactNode;
  // Raw value: rendered when there's no cell(), and used by hideEmptyColumns.
  value?: (row: Row, index: number) => unknown;
  always?: boolean; // keep this column even when hideEmptyColumns finds it empty
  sortable?: boolean;
}

export interface SortState {
  key: string;
  dir: 1 | -1;
}

interface DataTableProps<Row> {
  columns: Column<Row>[];
  rows: Row[];
  rowKey: (row: Row, index: number) => Key;
  rowClassName?: (row: Row) => string | undefined; // e.g. a global sport-* class
  rowMuted?: (row: Row) => boolean;
  onRowClick?: (row: Row) => void;
  sort?: SortState;
  onSort?: (key: string) => void;
  hideEmptyColumns?: boolean;
  empty?: ReactNode;
}

const ARIA_SORT = { 1: 'ascending', [-1]: 'descending' } as const;

export function DataTable<Row>({
  columns, rows, rowKey, rowClassName, rowMuted, onRowClick, sort, onSort, hideEmptyColumns, empty,
}: DataTableProps<Row>) {
  const used = hideEmptyColumns
    ? columns.filter((c) => c.always || rows.some((r, i) => c.value?.(r, i) != null))
    : columns;

  const renderCell = (c: Column<Row>, row: Row, i: number) => {
    if (c.cell) return c.cell(row, i);
    const v = c.value?.(row, i);
    return v == null ? DASH : String(v);
  };

  // Clicks on links inside a row follow the link instead.
  const rowClick = (row: Row) => (e: MouseEvent) => {
    if (!(e.target as Element).closest('a')) onRowClick?.(row);
  };

  return (
    <div className={styles.wrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            {used.map((c) => {
              const sortable = c.sortable && onSort;
              return (
                <th
                  key={c.key}
                  className={cx(c.num && styles.num, sortable && styles.sortable)}
                  aria-sort={sortable ? (sort?.key === c.key ? ARIA_SORT[sort.dir] : 'none') : undefined}
                  onClick={sortable ? () => onSort(c.key) : undefined}
                >
                  {c.label}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && empty ? (
            <tr><td colSpan={used.length} className={styles.empty}>{empty}</td></tr>
          ) : (
            rows.map((row, i) => (
              <tr
                key={rowKey(row, i)}
                className={cx(rowClassName?.(row), rowMuted?.(row) && styles.muted, onRowClick && styles.clickable)}
                onClick={onRowClick ? rowClick(row) : undefined}
              >
                {used.map((c) => <td key={c.key} className={cx(c.num && styles.num)}>{renderCell(c, row, i)}</td>)}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
