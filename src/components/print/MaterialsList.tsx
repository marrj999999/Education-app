'use client';

interface Material {
  name: string;
  quantity?: string;
  notes?: string;
}

interface MaterialsListProps {
  lessonTitle: string;
  materials: Material[];
}

export function MaterialsList({ lessonTitle, materials }: MaterialsListProps) {
  if (materials.length === 0) {
    return null;
  }

  return (
    <div className="print-section">
      <h2 className="text-xl font-bold mb-4">Materials & Equipment</h2>
      <p className="text-sm text-[var(--text-secondary)] mb-4">Required for: {lessonTitle}</p>

      <table className="w-full border-collapse border border-[var(--border)] text-sm">
        <thead>
          <tr className="bg-[var(--surface-hover)]">
            <th className="border border-[var(--border)] px-3 py-2 text-left w-8">
              <div className="w-4 h-4 border border-[var(--border)]" />
            </th>
            <th className="border border-[var(--border)] px-3 py-2 text-left">Item</th>
            <th className="border border-[var(--border)] px-3 py-2 text-left w-24">Quantity</th>
            <th className="border border-[var(--border)] px-3 py-2 text-left">Notes</th>
          </tr>
        </thead>
        <tbody>
          {materials.map((material, index) => (
            <tr key={index}>
              <td className="border border-[var(--border)] px-3 py-2 text-center">
                <div className="w-4 h-4 border border-[var(--border)] mx-auto" />
              </td>
              <td className="border border-[var(--border)] px-3 py-2">{material.name}</td>
              <td className="border border-[var(--border)] px-3 py-2">{material.quantity || '-'}</td>
              <td className="border border-[var(--border)] px-3 py-2">{material.notes || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-4 text-xs text-[var(--text-tertiary)]">
        Check box when item is prepared and available
      </div>
    </div>
  );
}
