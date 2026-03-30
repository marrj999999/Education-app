'use client';

import { PrinterIcon } from '@/components/Icons';

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="flex items-center gap-2 px-4 py-2 text-text-secondary hover:text-text-primary hover:bg-surface-hover rounded-lg transition-colors print:hidden border-2 border-border shadow-sm font-semibold"
    >
      <PrinterIcon size={20} />
      Print
    </button>
  );
}
