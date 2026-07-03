'use client';

import { ReactNode } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export interface Column<T> {
  /** Header label */
  header: string;
  /** Cell renderer */
  cell: (row: T) => ReactNode;
  /** Right-align (numbers, actions) */
  align?: 'left' | 'right';
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  loading?: boolean;
  /** Rendered inside the table body when there are no rows */
  empty?: ReactNode;
  onRowClick?: (row: T) => void;
}

/**
 * Bordered, rounded data table matching the design system:
 * muted uppercase header, hover row highlight, left-aligned data,
 * skeleton loading rows, and an empty-state slot. Never center-aligns data.
 */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  loading = false,
  empty,
  onRowClick,
}: DataTableProps<T>) {
  return (
    <div className="rounded-lg border bg-card overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {columns.map((col, i) => (
              <TableHead
                key={i}
                className={cn(
                  'h-10 text-xs uppercase tracking-wide font-medium text-muted-foreground',
                  col.align === 'right' && 'text-right',
                  col.className
                )}
              >
                {col.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            Array.from({ length: 4 }).map((_, r) => (
              <TableRow key={r}>
                {columns.map((_, c) => (
                  <TableCell key={c} className="py-3">
                    <Skeleton className="h-4 w-full max-w-32" />
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : rows.length === 0 ? (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={columns.length} className="p-0">
                {empty}
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row) => (
              <TableRow
                key={rowKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn(onRowClick && 'cursor-pointer')}
              >
                {columns.map((col, c) => (
                  <TableCell
                    key={c}
                    className={cn(
                      'py-3 text-sm',
                      col.align === 'right' && 'text-right',
                      col.className
                    )}
                  >
                    {col.cell(row)}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
