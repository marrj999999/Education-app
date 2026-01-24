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
      <p className="text-sm text-gray-600 mb-4">Required for: {lessonTitle}</p>

      <table className="w-full border-collapse border border-gray-300 text-sm">
        <thead>
          <tr className="bg-gray-100">
            <th className="border border-gray-300 px-3 py-2 text-left w-8">
              <div className="w-4 h-4 border border-gray-400" />
            </th>
            <th className="border border-gray-300 px-3 py-2 text-left">Item</th>
            <th className="border border-gray-300 px-3 py-2 text-left w-24">Quantity</th>
            <th className="border border-gray-300 px-3 py-2 text-left">Notes</th>
          </tr>
        </thead>
        <tbody>
          {materials.map((material, index) => (
            <tr key={index}>
              <td className="border border-gray-300 px-3 py-2 text-center">
                <div className="w-4 h-4 border border-gray-400 mx-auto" />
              </td>
              <td className="border border-gray-300 px-3 py-2">{material.name}</td>
              <td className="border border-gray-300 px-3 py-2">{material.quantity || '-'}</td>
              <td className="border border-gray-300 px-3 py-2">{material.notes || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-4 text-xs text-gray-500">
        Check box when item is prepared and available
      </div>
    </div>
  );
}
