'use client';

import {
  WrenchIcon,
  DocumentIcon,
  MapPinIcon,
  ComputerIcon,
  ClipboardIcon,
} from '@/components/Icons';

type MaterialType = 'equipment' | 'documents' | 'setup' | 'digital';

interface IconProps {
  className?: string;
  size?: number | string;
}

interface Material {
  type: MaterialType;
  item: string;
  quantity?: string;
}

interface MaterialsRequiredProps {
  materials: Material[];
}

const typeIcons: Record<MaterialType, React.FC<IconProps>> = {
  equipment: WrenchIcon,
  documents: DocumentIcon,
  setup: MapPinIcon,
  digital: ComputerIcon,
};

export default function MaterialsRequired({ materials }: MaterialsRequiredProps) {
  if (!materials?.length) return null;

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 mb-6 print:break-inside-avoid">
      <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
        <ClipboardIcon size={20} className="text-gray-600" /> Materials Required
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {materials.map((material, i) => {
          const IconComponent = typeIcons[material.type];
          return (
            <div
              key={i}
              className="flex items-center gap-3 p-2 bg-white rounded-lg border border-gray-100"
            >
              <IconComponent size={20} className="text-gray-500" />
              <span className="text-gray-700">
                {material.item}
                {material.quantity && (
                  <span className="text-gray-500 text-sm ml-1">({material.quantity})</span>
                )}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
