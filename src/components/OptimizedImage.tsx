'use client';

import React, { useState, memo } from 'react';
import Image from 'next/image';

interface OptimizedImageProps {
  src: string;
  alt: string;
  caption?: string;
  priority?: boolean;
  className?: string;
}

/**
 * Optimized image component using Next.js Image with:
 * - Automatic format conversion (WebP/AVIF)
 * - Responsive sizing
 * - Blur placeholder
 * - Lazy loading
 * - Error fallback
 */
const OptimizedImage = memo(function OptimizedImage({
  src,
  alt,
  caption,
  priority = false,
  className = '',
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [imageDimensions, setImageDimensions] = useState({ width: 800, height: 600 });

  // Handle image load complete
  const handleLoadComplete = (result: { naturalWidth: number; naturalHeight: number }) => {
    setIsLoading(false);
    if (result.naturalWidth && result.naturalHeight) {
      setImageDimensions({
        width: result.naturalWidth,
        height: result.naturalHeight,
      });
    }
  };

  // Handle image error
  const handleError = () => {
    setHasError(true);
    setIsLoading(false);
  };

  // Check if it's a temporary file URL (e.g. S3 presigned URLs that expire)
  const isTempFileUrl = src.includes('prod-files-secure.s3') || src.includes('s3.us-west-2.amazonaws.com');

  // For error state, show placeholder
  if (hasError) {
    return (
      <figure className={`mb-6 ${className}`}>
        <div className="relative w-full bg-[var(--surface-hover)] rounded-xl overflow-hidden flex items-center justify-center min-h-[200px]">
          <div className="text-center p-8">
            <svg
              className="w-12 h-12 mx-auto text-[var(--text-tertiary)] mb-3"
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
            <p className="text-[var(--text-tertiary)] text-sm">Image unavailable</p>
            {isTempFileUrl && (
              <p className="text-[var(--text-tertiary)] text-xs mt-1">Image URL may have expired</p>
            )}
          </div>
        </div>
        {caption && (
          <figcaption className="text-sm text-[var(--text-tertiary)] mt-3 text-center italic">
            {caption}
          </figcaption>
        )}
      </figure>
    );
  }

  return (
    <figure className={`mb-6 ${className}`}>
      <div className="relative w-full overflow-hidden rounded-xl shadow-sm bg-[var(--surface-hover)]">
        {/* Loading skeleton */}
        {isLoading && (
          <div className="absolute inset-0 bg-[var(--surface-active)] animate-pulse" />
        )}

        <Image
          src={src}
          alt={alt}
          width={imageDimensions.width}
          height={imageDimensions.height}
          className={`
            w-full h-auto object-contain
            transition-opacity duration-500
            ${isLoading ? 'opacity-0' : 'opacity-100'}
          `}
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 80vw, 800px"
          quality={85}
          loading={priority ? 'eager' : 'lazy'}
          onLoad={(e) => {
            const img = e.currentTarget;
            handleLoadComplete({
              naturalWidth: img.naturalWidth,
              naturalHeight: img.naturalHeight,
            });
          }}
          onError={handleError}
          placeholder="empty"
          unoptimized={isTempFileUrl} // Temporary URLs can't be cached
        />
      </div>

      {caption && (
        <figcaption className="text-sm text-[var(--text-tertiary)] mt-3 text-center italic">
          {caption}
        </figcaption>
      )}
    </figure>
  );
});

export default OptimizedImage;
