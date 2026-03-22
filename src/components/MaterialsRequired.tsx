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
    <div className="bg-[var(--surface-hover)] border border-[var(--border)] rounded-xl p-5 mb-6 print:break-inside-avoid">
      <h3 className="font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
        <ClipboardIcon size={20} className="text-[var(--text-secondary)]" /> Materials Required
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {materials.map((material, i) => {
          const IconComponent = typeIcons[material.type];
          return (
            <div
              key={i}
              className="flex items-center gap-3 p-2 bg-[var(--surface)] rounded-lg border border-[var(--border)]"
            >
              <IconComponent size={20} className="text-[var(--text-tertiary)]" />
              <span className="text-[var(--text-secondary)]">
                {material.item}
                {material.quantity && (
                  <span className="text-[var(--text-tertiary)] text-sm ml-1">({material.quantity})</span>
                )}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
