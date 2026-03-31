'use client';

import { PrinterIcon } from '@/components/Icons';

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="flex items-center gap-2 px-4 py-2 text-white bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg transition-colors print:hidden shadow-sm font-semibold"
    >
      <PrinterIcon size={20} />
      Print
    </button>
  );
}
