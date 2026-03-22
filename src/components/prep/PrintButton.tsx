'use client';

import { Printer } from 'lucide-react';

export function PrintButton() {
  const handlePrint = () => {
    window.print();
  };

  return (
    <button
      onClick={handlePrint}
      className="hidden sm:flex items-center gap-2 px-3 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] rounded-lg transition-colors print:hidden"
    >
      <Printer size={18} />
      Print
    </button>
  );
}

export default PrintButton;
