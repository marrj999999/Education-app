'use client';

import React from 'react';

interface MediaSkeletonProps {
  type: 'image' | 'video' | 'gallery';
  className?: string;
}

/**
 * Skeleton loading component for media elements
 * Provides smooth loading animations while content loads
 */
export function MediaSkeleton({ type, className = '' }: MediaSkeletonProps) {
  if (type === 'image') {
    return (
      <div className={`mb-6 ${className}`}>
        <div className="relative w-full bg-gray-100 rounded-xl overflow-hidden aspect-video animate-pulse">
          <div className="absolute inset-0 bg-gray-200 skeleton-shimmer" />
          <div className="absolute inset-0 flex items-center justify-center">
            <svg
              className="w-12 h-12 text-gray-300"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
        </div>
      </div>
    );
  }

  if (type === 'video') {
    return (
      <div className={`mb-6 ${className}`}>
        <div className="relative w-full bg-gray-900 rounded-xl overflow-hidden aspect-video animate-pulse">
          <div className="absolute inset-0 bg-gray-700 skeleton-shimmer" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-gray-700 flex items-center justify-center">
              <svg
                className="w-8 h-8 text-gray-500 ml-1"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (type === 'gallery') {
    return (
      <div className={`mb-6 ${className}`}>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="relative bg-gray-100 rounded-lg overflow-hidden aspect-square animate-pulse"
            >
              <div className="absolute inset-0 bg-gray-200 skeleton-shimmer" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return null;
}

/**
 * Content skeleton for lesson loading states
 */
export function LessonContentSkeleton() {
  return (
    <div className="animate-fade-in">
      {/* Title skeleton */}
      <div className="mb-8">
        <div className="h-10 bg-gray-200 rounded-lg w-3/4 mb-4 skeleton-shimmer" />
        <div className="h-4 bg-gray-100 rounded w-1/3 skeleton-shimmer" />
      </div>

      {/* Paragraphs skeleton */}
      <div className="space-y-4 mb-8">
        <div className="h-4 bg-gray-100 rounded w-full skeleton-shimmer" />
        <div className="h-4 bg-gray-100 rounded w-5/6 skeleton-shimmer" />
        <div className="h-4 bg-gray-100 rounded w-4/5 skeleton-shimmer" />
      </div>

      {/* Image skeleton */}
      <MediaSkeleton type="image" />

      {/* More paragraphs */}
      <div className="space-y-4 mb-8">
        <div className="h-4 bg-gray-100 rounded w-full skeleton-shimmer" />
        <div className="h-4 bg-gray-100 rounded w-3/4 skeleton-shimmer" />
      </div>

      {/* Callout skeleton */}
      <div className="p-4 bg-blue-50 rounded-lg mb-6">
        <div className="h-4 bg-blue-100 rounded w-full mb-2 skeleton-shimmer" />
        <div className="h-4 bg-blue-100 rounded w-2/3 skeleton-shimmer" />
      </div>

      {/* List skeleton */}
      <div className="space-y-3 mb-8 ml-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="w-2 h-2 bg-gray-300 rounded-full" />
            <div className={`h-4 bg-gray-100 rounded skeleton-shimmer`} style={{ width: `${60 + i * 10}%` }} />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Module card skeleton for course page
 */
export function ModuleCardSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
      <div className="flex items-start gap-4 mb-4">
        <div className="w-12 h-12 bg-gray-200 rounded-lg skeleton-shimmer" />
        <div className="flex-1">
          <div className="h-5 bg-gray-200 rounded w-3/4 mb-2 skeleton-shimmer" />
          <div className="h-3 bg-gray-100 rounded w-1/2 skeleton-shimmer" />
        </div>
      </div>
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-3 bg-gray-100 rounded skeleton-shimmer" style={{ width: `${70 + i * 10}%` }} />
        ))}
      </div>
    </div>
  );
}

export default MediaSkeleton;
