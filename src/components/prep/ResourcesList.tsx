'use client';

import { useState, useEffect } from 'react';
import {
  FileText,
  Video,
  Image as ImageIcon,
  File,
  Check,
  Printer,
  ExternalLink,
  Download,
} from 'lucide-react';
import type { ResourceSection } from '@/lib/types/content';

interface ResourcesListProps {
  sections: ResourceSection[];
  lessonId: string;
}

export function ResourcesList({ sections, lessonId }: ResourcesListProps) {
  const [printed, setPrinted] = useState<Set<string>>(new Set());

  const storageKey = `prep-resources-${lessonId}`;

  // Load from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        try {
          setPrinted(new Set(JSON.parse(saved)));
        } catch {
          // Ignore parse errors
        }
      }
    }
  }, [storageKey]);

  // Save to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(storageKey, JSON.stringify([...printed]));
    }
  }, [printed, storageKey]);

  const togglePrinted = (id: string) => {
    setPrinted((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Filter to printable resources (PDFs and files)
  const printableResources = sections.filter(
    (s) => s.resourceType === 'pdf' || s.resourceType === 'file'
  );
  const mediaResources = sections.filter(
    (s) => s.resourceType === 'video' || s.resourceType === 'image'
  );

  const resourceIcon: Record<string, typeof FileText> = {
    pdf: FileText,
    video: Video,
    image: ImageIcon,
    file: File,
  };

  const resourceColors: Record<string, string> = {
    pdf: 'bg-red-50 text-red-600 border-red-200',
    video: 'bg-purple-50 text-purple-600 border-purple-200',
    image: 'bg-blue-50 text-blue-600 border-blue-200',
    file: 'bg-gray-50 text-gray-600 border-gray-200',
  };

  if (sections.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
        <File className="mx-auto text-gray-400 mb-3" size={32} />
        <p className="text-gray-500">No resources for this session</p>
      </div>
    );
  }

  const printedCount = printableResources.filter((r) => printed.has(r.id)).length;

  return (
    <div className="space-y-6">
      {/* Printable Resources */}
      {printableResources.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          {/* Header */}
          <div className="border-b border-gray-100 p-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <Printer className="text-gray-600" size={20} />
                <h2 className="text-lg font-semibold text-gray-900">
                  Documents to Print
                </h2>
              </div>
              <span
                className={`
                  text-sm font-medium px-3 py-1 rounded-full
                  ${printedCount === printableResources.length
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-600'
                  }
                `}
              >
                {printedCount} of {printableResources.length} printed
              </span>
            </div>
          </div>

          {/* List */}
          <div className="divide-y divide-gray-100">
            {printableResources.map((resource) => {
              const Icon = resourceIcon[resource.resourceType];
              const isPrinted = printed.has(resource.id);

              return (
                <div
                  key={resource.id}
                  className={`
                    p-4 flex items-center gap-4
                    ${isPrinted ? 'bg-green-50' : ''}
                  `}
                >
                  {/* Icon */}
                  <div
                    className={`
                      flex-shrink-0 w-10 h-10 rounded-lg border
                      flex items-center justify-center
                      ${resourceColors[resource.resourceType]}
                    `}
                  >
                    <Icon size={20} />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h3
                      className={`
                        font-medium truncate
                        ${isPrinted ? 'text-gray-500' : 'text-gray-900'}
                      `}
                    >
                      {resource.title || 'Untitled Document'}
                    </h3>
                    {resource.caption && (
                      <p className="text-sm text-gray-500 truncate">{resource.caption}</p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <a
                      href={resource.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      <ExternalLink size={14} />
                      Open
                    </a>

                    <button
                      onClick={() => togglePrinted(resource.id)}
                      className={`
                        inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-lg
                        transition-colors min-h-[36px]
                        ${isPrinted
                          ? 'bg-green-500 text-white hover:bg-green-600'
                          : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                        }
                      `}
                    >
                      {isPrinted ? (
                        <>
                          <Check size={14} />
                          Printed
                        </>
                      ) : (
                        <>
                          <Printer size={14} />
                          Mark Printed
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Media Resources */}
      {mediaResources.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          {/* Header */}
          <div className="border-b border-gray-100 p-4">
            <div className="flex items-center gap-3">
              <Video className="text-gray-600" size={20} />
              <h2 className="text-lg font-semibold text-gray-900">
                Media Resources
              </h2>
              <span className="text-sm text-gray-500">
                {mediaResources.length} item{mediaResources.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>

          {/* List */}
          <div className="divide-y divide-gray-100">
            {mediaResources.map((resource) => {
              const Icon = resourceIcon[resource.resourceType];

              return (
                <div key={resource.id} className="p-4 flex items-center gap-4">
                  {/* Icon */}
                  <div
                    className={`
                      flex-shrink-0 w-10 h-10 rounded-lg border
                      flex items-center justify-center
                      ${resourceColors[resource.resourceType]}
                    `}
                  >
                    <Icon size={20} />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 truncate">
                      {resource.title || `${resource.resourceType.charAt(0).toUpperCase() + resource.resourceType.slice(1)} Resource`}
                    </h3>
                    {resource.caption && (
                      <p className="text-sm text-gray-500 truncate">{resource.caption}</p>
                    )}
                  </div>

                  {/* Action */}
                  <a
                    href={resource.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    <ExternalLink size={14} />
                    View
                  </a>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
