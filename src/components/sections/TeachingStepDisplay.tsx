'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Timer, Lightbulb, AlertTriangle, ChevronDown, ChevronUp, BookOpen, Users, Quote, FileText, ExternalLink } from 'lucide-react';
import type { TeachingStepSection } from '@/lib/types/content';
import { cn } from '@/lib/utils';
import VideoEmbed from '@/components/VideoEmbed';

interface TeachingStepDisplayProps {
  section: TeachingStepSection;
  variant?: 'compact' | 'large' | 'teaching' | 'presentation';
}

export function TeachingStepDisplay({ section, variant = 'compact' }: TeachingStepDisplayProps) {
  const [tipsExpanded, setTipsExpanded] = useState(false);

  const isLarge = variant === 'large' || variant === 'teaching' || variant === 'presentation';
  const isTeaching = variant === 'teaching';
  const isPresentation = variant === 'presentation';

  const hasTips = section.tips && section.tips.length > 0;
  const hasWarnings = section.warnings && section.warnings.length > 0;
  const hasActivities = section.activities && section.activities.length > 0;
  const hasTeachingApproach = !!section.teachingApproach;
  const hasDifferentiation = !!section.differentiation;
  const hasExtras = hasTips || hasWarnings;
  const hasResources = section.resources && section.resources.length > 0;
  const hasTables = section.tables && section.tables.length > 0;
  const hasQuotes = section.quotes && section.quotes.length > 0;
  const hasParagraphs = section.paragraphs && section.paragraphs.length > 0;

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
      <div className={cn(isPresentation ? 'p-8' : isLarge ? 'p-6' : 'p-4')}>
        <div className={cn('flex', isPresentation ? 'gap-6' : 'gap-4')}>
          {/* Step Number Circle - Green for sections */}
          <div
            className={cn(
              'flex-shrink-0 bg-green-600 text-white rounded-full',
              'flex items-center justify-center font-bold',
              isPresentation
                ? 'w-24 h-24 text-present-step'
                : isTeaching
                  ? 'w-20 h-20 text-teaching-step'
                  : isLarge
                    ? 'w-16 h-16 text-3xl'
                    : 'w-12 h-12 text-xl'
            )}
          >
            {section.stepNumber}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Title and Duration */}
            <div className="flex items-center gap-3 flex-wrap mb-3">
              {section.title && (
                <h3
                  className={cn(
                    'font-semibold text-gray-900',
                    isPresentation
                      ? 'text-present-heading'
                      : isTeaching
                        ? 'text-teaching-heading'
                        : isLarge
                          ? 'text-xl'
                          : 'text-lg'
                  )}
                >
                  {section.title}
                </h3>
              )}
              {section.duration && (
                <span
                  className={cn(
                    'inline-flex items-center gap-1.5 bg-green-100 text-green-800 rounded-full font-medium',
                    isPresentation
                      ? 'px-4 py-2 text-lg'
                      : isLarge
                        ? 'px-3 py-1.5 text-sm'
                        : 'px-2.5 py-1 text-xs'
                  )}
                >
                  <Timer size={isPresentation ? 20 : isLarge ? 16 : 14} />
                  {section.duration}
                </span>
              )}
            </div>

            {/* Main Instruction - only show if different from title */}
            {section.instruction && section.instruction !== section.title && (
              <p
                className={cn(
                  'text-gray-800 leading-relaxed',
                  isPresentation
                    ? 'text-present-body'
                    : isTeaching
                      ? 'text-teaching-body'
                      : isLarge
                        ? 'text-xl'
                        : 'text-base'
                )}
              >
                {section.instruction}
              </p>
            )}
          </div>
        </div>

        {/* Activities List */}
        {hasActivities && (
          <div className={cn('mt-6', isPresentation && 'mt-8')}>
            <h4
              className={cn(
                'font-semibold text-gray-700 mb-3',
                isPresentation ? 'text-lg' : 'text-sm uppercase tracking-wide'
              )}
            >
              Activities
            </h4>
            <ol className={cn('space-y-2', isPresentation ? 'text-lg' : '')}>
              {section.activities!.map((activity, index) => (
                <li
                  key={index}
                  className={cn(
                    'flex items-start gap-3 text-gray-800',
                    isPresentation ? 'text-lg' : isLarge ? 'text-base' : 'text-sm'
                  )}
                >
                  <span
                    className={cn(
                      'flex-shrink-0 bg-gray-100 text-gray-600 rounded-full',
                      'flex items-center justify-center font-medium',
                      isPresentation ? 'w-8 h-8 text-base' : 'w-6 h-6 text-xs'
                    )}
                  >
                    {index + 1}
                  </span>
                  <span className="flex-1">
                    {activity.text}
                    {activity.duration && (
                      <span className="ml-2 text-gray-500">({activity.duration})</span>
                    )}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* Teaching Approach Box */}
        {hasTeachingApproach && (
          <div
            className={cn(
              'mt-6 rounded-lg bg-blue-50 border-l-4 border-blue-500',
              isPresentation ? 'p-5' : 'p-4'
            )}
          >
            <div
              className={cn(
                'flex items-center gap-2 text-blue-800 font-semibold mb-2',
                isPresentation ? 'text-lg' : 'text-sm'
              )}
            >
              <BookOpen size={isPresentation ? 20 : 16} />
              Teaching Approach
            </div>
            <p
              className={cn(
                'text-blue-900',
                isPresentation ? 'text-lg' : isLarge ? 'text-base' : 'text-sm'
              )}
            >
              {section.teachingApproach}
            </p>
          </div>
        )}

        {/* Differentiation Box */}
        {hasDifferentiation && (
          <div
            className={cn(
              'mt-4 rounded-lg bg-purple-50 border-l-4 border-purple-500',
              isPresentation ? 'p-5' : 'p-4'
            )}
          >
            <div
              className={cn(
                'flex items-center gap-2 text-purple-800 font-semibold mb-2',
                isPresentation ? 'text-lg' : 'text-sm'
              )}
            >
              <Users size={isPresentation ? 20 : 16} />
              Differentiation
            </div>
            <p
              className={cn(
                'text-purple-900',
                isPresentation ? 'text-lg' : isLarge ? 'text-base' : 'text-sm'
              )}
            >
              {section.differentiation}
            </p>
          </div>
        )}

        {/* Additional Paragraphs - skip first only if it matches instruction */}
        {hasParagraphs && (
          <div className={cn('mt-4 space-y-3', isPresentation && 'mt-6 space-y-4')}>
            {section.paragraphs!
              .filter((p, i) => !(i === 0 && p === section.instruction))
              .map((paragraph, index) => (
              <p
                key={index}
                className={cn(
                  'text-gray-700 leading-relaxed',
                  isPresentation ? 'text-lg' : isLarge ? 'text-base' : 'text-sm'
                )}
              >
                {paragraph}
              </p>
            ))}
          </div>
        )}

        {/* Quote Blocks / Key Scripts */}
        {hasQuotes && (
          <div className={cn('mt-4 space-y-3', isPresentation && 'mt-6 space-y-4')}>
            {section.quotes!.map((quote, index) => (
              <blockquote
                key={index}
                className={cn(
                  'border-l-4 border-amber-400 bg-amber-50 rounded-r-lg',
                  isPresentation ? 'p-5 pl-6' : 'p-4 pl-5'
                )}
              >
                <div
                  className={cn(
                    'flex items-start gap-2 text-amber-800',
                    isPresentation ? 'text-lg' : isLarge ? 'text-base' : 'text-sm'
                  )}
                >
                  <Quote size={isPresentation ? 20 : 16} className="flex-shrink-0 mt-0.5" />
                  <span className="italic">{quote}</span>
                </div>
              </blockquote>
            ))}
          </div>
        )}

        {/* Embedded Tables */}
        {hasTables && (
          <div className={cn('mt-4 space-y-4', isPresentation && 'mt-6 space-y-6')}>
            {section.tables!.map((table, tableIndex) => (
              <div key={tableIndex} className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200">
                  {table.headers.length > 0 && (
                    <thead className="bg-gray-50">
                      <tr>
                        {table.headers.map((header, i) => (
                          <th
                            key={i}
                            className={cn(
                              'px-4 py-3 text-left font-semibold text-gray-700',
                              isPresentation ? 'text-base' : 'text-sm'
                            )}
                          >
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                  )}
                  <tbody className="bg-white divide-y divide-gray-200">
                    {table.rows.map((row, rowIndex) => (
                      <tr key={rowIndex} className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        {row.map((cell, cellIndex) => (
                          <td
                            key={cellIndex}
                            className={cn(
                              'px-4 py-3 text-gray-700',
                              isPresentation ? 'text-base' : 'text-sm'
                            )}
                          >
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}

        {/* Resources (Images, Videos, Files) */}
        {hasResources && (
          <div className={cn('mt-4', isPresentation && 'mt-6')}>
            <h4
              className={cn(
                'font-semibold text-gray-700 mb-3',
                isPresentation ? 'text-lg' : 'text-sm uppercase tracking-wide'
              )}
            >
              Resources
            </h4>
            <div className="space-y-3">
              {section.resources!.map((resource, index) => (
                <div key={index}>
                  {resource.type === 'image' && (
                    <figure className="rounded-lg overflow-hidden border border-gray-200">
                      <div className="relative aspect-video bg-gray-100">
                        <Image
                          src={resource.url}
                          alt={resource.caption || resource.title || 'Section image'}
                          fill
                          className="object-contain"
                          sizes="(max-width: 768px) 100vw, 50vw"
                        />
                      </div>
                      {resource.caption && (
                        <figcaption
                          className={cn(
                            'px-4 py-2 bg-gray-50 text-gray-600 text-center',
                            isPresentation ? 'text-base' : 'text-sm'
                          )}
                        >
                          {resource.caption}
                        </figcaption>
                      )}
                    </figure>
                  )}

                  {resource.type === 'video' && (
                    <VideoEmbed
                      url={resource.url}
                      title={resource.title}
                      caption={resource.caption}
                    />
                  )}

                  {resource.type === 'file' && (
                    <a
                      href={resource.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(
                        'flex items-center gap-3 p-4 rounded-lg border border-gray-200',
                        'bg-gray-50 hover:bg-gray-100 transition-colors',
                        isPresentation ? 'text-lg' : 'text-base'
                      )}
                    >
                      <FileText size={isPresentation ? 24 : 20} className="text-blue-600 flex-shrink-0" />
                      <span className="text-gray-800 font-medium">
                        {resource.title || 'Download File'}
                      </span>
                      <ExternalLink size={16} className="text-gray-400 ml-auto" />
                    </a>
                  )}

                  {resource.type === 'embed' && (
                    <a
                      href={resource.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(
                        'flex items-center gap-3 p-4 rounded-lg border border-gray-200',
                        'bg-gray-50 hover:bg-gray-100 transition-colors',
                        isPresentation ? 'text-lg' : 'text-base'
                      )}
                    >
                      <ExternalLink size={isPresentation ? 24 : 20} className="text-gray-600 flex-shrink-0" />
                      <span className="text-gray-800 font-medium">
                        {resource.title || 'View Embedded Content'}
                      </span>
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Expandable Tips/Warnings Section */}
        {hasExtras && (
          <div className={cn('mt-4', isPresentation && 'mt-6')}>
            <button
              onClick={() => setTipsExpanded(!tipsExpanded)}
              className={cn(
                'w-full flex items-center justify-between gap-2',
                'text-left text-gray-600 hover:text-gray-900',
                'rounded-lg transition-colors hover:bg-gray-50',
                isPresentation ? 'p-4' : isLarge ? 'p-3' : 'p-2'
              )}
              aria-expanded={tipsExpanded}
            >
              <span
                className={cn(
                  'flex items-center gap-2 font-medium',
                  isPresentation ? 'text-lg' : 'text-sm'
                )}
              >
                <Lightbulb size={isPresentation ? 20 : 16} />
                {hasTips && `${section.tips!.length} tip${section.tips!.length > 1 ? 's' : ''}`}
                {hasTips && hasWarnings && ' + '}
                {hasWarnings &&
                  `${section.warnings!.length} warning${section.warnings!.length > 1 ? 's' : ''}`}
              </span>
              {tipsExpanded ? (
                <ChevronUp size={isPresentation ? 24 : 16} />
              ) : (
                <ChevronDown size={isPresentation ? 24 : 16} />
              )}
            </button>

            {tipsExpanded && (
              <div className={cn('space-y-4', isPresentation ? 'mt-6' : isLarge ? 'mt-4' : 'mt-2')}>
                {/* Tips */}
                {hasTips && (
                  <div
                    className={cn(
                      'content-theory rounded-lg border-l-4',
                      isPresentation ? 'p-5' : 'p-3'
                    )}
                  >
                    <div
                      className={cn(
                        'flex items-center gap-2 text-blue-800 font-semibold mb-2',
                        isPresentation ? 'text-lg' : 'text-sm'
                      )}
                    >
                      <Lightbulb size={isPresentation ? 20 : 16} />
                      Tips
                    </div>
                    <ul className="space-y-2">
                      {section.tips!.map((tip, index) => (
                        <li
                          key={index}
                          className={cn(
                            'text-blue-900',
                            isPresentation ? 'text-lg' : isLarge ? 'text-base' : 'text-sm'
                          )}
                        >
                          • {tip}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Warnings */}
                {hasWarnings && (
                  <div
                    className={cn(
                      'safety-warning rounded-lg border-l-4',
                      isPresentation ? 'p-5' : 'p-3'
                    )}
                  >
                    <div
                      className={cn(
                        'flex items-center gap-2 font-semibold mb-2',
                        isPresentation ? 'text-lg' : 'text-sm'
                      )}
                    >
                      <AlertTriangle size={isPresentation ? 20 : 16} />
                      Warnings
                    </div>
                    <ul className="space-y-2">
                      {section.warnings!.map((warning, index) => (
                        <li
                          key={index}
                          className={cn(isPresentation ? 'text-lg' : isLarge ? 'text-base' : 'text-sm')}
                        >
                          • {warning}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
