'use client';

import React, { useMemo } from 'react';
import type { NotionBlock, RichText } from '@/lib/types';

interface TableBlockProps {
  block: NotionBlock;
}

// Generate unique IDs for table headers (for accessibility)
function generateHeaderId(tableId: string, index: number): string {
  return `table-${tableId}-header-${index}`;
}

// Render rich text
function renderRichText(richText: RichText[]): React.ReactNode {
  return richText.map((text, index) => {
    let content: React.ReactNode = text.plain_text;

    if (text.annotations.bold) {
      content = <strong key={`bold-${index}`}>{content}</strong>;
    }
    if (text.annotations.italic) {
      content = <em key={`italic-${index}`}>{content}</em>;
    }
    if (text.annotations.code) {
      content = (
        <code key={`code-${index}`} className="bg-gray-100 px-1 rounded text-sm font-mono">
          {content}
        </code>
      );
    }
    if (text.href) {
      content = (
        <a
          key={`link-${index}`}
          href={text.href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline"
        >
          {content}
        </a>
      );
    }

    return <span key={index}>{content}</span>;
  });
}

// Get plain text from rich text for accessibility
function getPlainText(richText: RichText[]): string {
  return richText.map((t) => t.plain_text).join('');
}

export default function TableBlock({ block }: TableBlockProps) {
  const table = block.table;
  const children = block.children;
  const has_column_header = table?.has_column_header ?? false;
  const has_row_header = table?.has_row_header ?? false;
  const rows = children?.filter((child) => child.type === 'table_row') ?? [];

  // Generate header IDs for accessibility - must be called unconditionally
  const headerIds = useMemo(() => {
    if (!has_column_header || rows.length === 0) return [];
    const firstRow = rows[0];
    const cells = firstRow.table_row?.cells || [];
    return cells.map((_, index) => generateHeaderId(block.id, index));
  }, [block.id, has_column_header, rows]);

  // Get caption from first cell if it looks like a title - must be called unconditionally
  const tableCaption = useMemo(() => {
    if (rows.length === 0) return undefined;
    // Use the table ID as a simple description
    return `Data table with ${rows.length} rows`;
  }, [rows.length]);

  // Early returns after all hooks
  if (!table || !children) return null;
  if (rows.length === 0) return null;

  return (
    <div className="overflow-x-auto mb-4" role="region" aria-label="Table content">
      <table
        className="min-w-full border-collapse border border-gray-200 rounded-lg overflow-hidden"
        role="table"
      >
        {/* Accessibility: Add caption for screen readers */}
        <caption className="sr-only">{tableCaption}</caption>

        {/* Table header */}
        {has_column_header && rows.length > 0 && (
          <thead>
            <tr className="bg-gray-100">
              {(rows[0].table_row?.cells || []).map((cell, cellIndex) => {
                const isRowHeader = has_row_header && cellIndex === 0;
                return (
                  <th
                    key={cellIndex}
                    id={headerIds[cellIndex]}
                    scope={isRowHeader ? 'row' : 'col'}
                    className="px-4 py-2 border border-gray-200 text-sm font-semibold text-gray-900 text-left"
                  >
                    {renderRichText(cell)}
                  </th>
                );
              })}
            </tr>
          </thead>
        )}

        {/* Table body */}
        <tbody>
          {rows.slice(has_column_header ? 1 : 0).map((row, rowIndex) => {
            const cells = row.table_row?.cells || [];

            return (
              <tr
                key={row.id}
                className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
              >
                {cells.map((cell, cellIndex) => {
                  const isRowHeader = has_row_header && cellIndex === 0;

                  if (isRowHeader) {
                    return (
                      <th
                        key={cellIndex}
                        scope="row"
                        className="px-4 py-2 border border-gray-200 text-sm font-semibold text-gray-900"
                      >
                        {renderRichText(cell)}
                      </th>
                    );
                  }

                  // Build headers attribute for data cells
                  const headersAttr = has_column_header && headerIds[cellIndex]
                    ? headerIds[cellIndex]
                    : undefined;

                  return (
                    <td
                      key={cellIndex}
                      headers={headersAttr}
                      className="px-4 py-2 border border-gray-200 text-sm text-gray-700"
                    >
                      {renderRichText(cell)}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
