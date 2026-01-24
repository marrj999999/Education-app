'use client';

import { PrinterIcon } from '@/components/Icons';

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors print:hidden"
    >
      <PrinterIcon size={20} />
      Print
    </button>
  );
}
