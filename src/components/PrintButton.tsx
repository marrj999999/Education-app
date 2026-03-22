'use client';

import { PrinterIcon } from '@/components/Icons';

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="flex items-center gap-2 px-4 py-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] rounded-lg transition-colors print:hidden"
    >
      <PrinterIcon size={20} />
      Print
    </button>
  );
}
