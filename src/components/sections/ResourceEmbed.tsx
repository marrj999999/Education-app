'use client';

import { FileText, Play, Image as ImageIcon, File, ExternalLink, Download } from 'lucide-react';
import Image from 'next/image';
import type { ResourceSection } from '@/lib/types/content';

interface ResourceEmbedProps {
  section: ResourceSection;
  variant?: 'compact' | 'large';
}

export function ResourceEmbed({ section, variant = 'compact' }: ResourceEmbedProps) {
  const isLarge = variant === 'large';

  // PDF Display
  if (section.resourceType === 'pdf') {
    return (
      <div
        className={`
          bg-white border border-gray-200 rounded-lg overflow-hidden
          ${isLarge ? 'p-6' : 'p-4'}
        `}
      >
        <div className="flex items-center gap-4">
          <div className="flex-shrink-0 w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
            <FileText className="text-red-600" size={24} />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className={`font-medium text-gray-900 truncate ${isLarge ? 'text-lg' : 'text-base'}`}>
              {section.title || 'PDF Document'}
            </h4>
            {section.caption && (
              <p className="text-sm text-gray-500 truncate">{section.caption}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <a
              href={section.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`
                inline-flex items-center gap-2 bg-gray-900 text-white rounded-lg
                hover:bg-gray-800 transition-colors font-medium
                ${isLarge ? 'px-4 py-2 text-base' : 'px-3 py-1.5 text-sm'}
              `}
            >
              <ExternalLink size={isLarge ? 18 : 16} />
              Open PDF
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Video Display
  if (section.resourceType === 'video') {
    // Extract video ID for embedding
    const getVideoEmbed = (url: string) => {
      // YouTube
      const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&]+)/);
      if (ytMatch) {
        return `https://www.youtube.com/embed/${ytMatch[1]}`;
      }
      // Vimeo
      const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
      if (vimeoMatch) {
        return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
      }
      // Loom
      const loomMatch = url.match(/loom\.com\/share\/([^?]+)/);
      if (loomMatch) {
        return `https://www.loom.com/embed/${loomMatch[1]}`;
      }
      return null;
    };

    const embedUrl = getVideoEmbed(section.url);

    return (
      <div className="space-y-2">
        {section.title && (
          <h4 className={`font-medium text-gray-900 ${isLarge ? 'text-lg' : 'text-base'}`}>
            {section.title}
          </h4>
        )}
        <div
          className={`
            relative bg-gray-900 rounded-lg overflow-hidden
            ${isLarge ? 'aspect-video' : 'aspect-video max-w-2xl'}
          `}
        >
          {embedUrl ? (
            <iframe
              src={embedUrl}
              className="absolute inset-0 w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title={section.title || 'Video'}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <a
                href={section.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center gap-2 text-white hover:text-gray-300 transition-colors"
              >
                <Play size={48} />
                <span>Open Video</span>
              </a>
            </div>
          )}
        </div>
        {section.caption && <p className="text-sm text-gray-500">{section.caption}</p>}
      </div>
    );
  }

  // Image Display
  if (section.resourceType === 'image') {
    return (
      <figure className="space-y-2">
        <div
          className={`
            relative bg-gray-100 rounded-lg overflow-hidden
            ${isLarge ? 'max-w-4xl' : 'max-w-2xl'}
          `}
        >
          <Image
            src={section.url}
            alt={section.caption || section.title || 'Image'}
            width={800}
            height={600}
            className="w-full h-auto"
            loading="lazy"
          />
        </div>
        {section.caption && (
          <figcaption className="text-sm text-gray-500 italic">{section.caption}</figcaption>
        )}
      </figure>
    );
  }

  // Generic File Display
  return (
    <div
      className={`
        bg-white border border-gray-200 rounded-lg overflow-hidden
        ${isLarge ? 'p-6' : 'p-4'}
      `}
    >
      <div className="flex items-center gap-4">
        <div className="flex-shrink-0 w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
          <File className="text-gray-600" size={24} />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className={`font-medium text-gray-900 truncate ${isLarge ? 'text-lg' : 'text-base'}`}>
            {section.title || 'File'}
          </h4>
          {section.caption && (
            <p className="text-sm text-gray-500 truncate">{section.caption}</p>
          )}
        </div>
        <a
          href={section.url}
          download
          className={`
            inline-flex items-center gap-2 bg-gray-100 text-gray-700 rounded-lg
            hover:bg-gray-200 transition-colors font-medium
            ${isLarge ? 'px-4 py-2 text-base' : 'px-3 py-1.5 text-sm'}
          `}
        >
          <Download size={isLarge ? 18 : 16} />
          Download
        </a>
      </div>
    </div>
  );
}
