'use client';

import React, { useState, memo, useCallback } from 'react';
import OptimizedImage from './OptimizedImage';
import { ChevronLeftIcon, ChevronRightIcon } from '@/components/Icons';

interface GalleryImage {
  src: string;
  alt: string;
  caption?: string;
}

interface ImageGalleryProps {
  images: GalleryImage[];
  layout?: 'grid' | 'carousel' | 'masonry';
}

/**
 * Image gallery component with multiple layout options
 * - Grid: 2-3 column responsive grid
 * - Carousel: Swipeable image carousel with thumbnails
 * - Masonry: Pinterest-style masonry layout
 */
const ImageGallery = memo(function ImageGallery({
  images,
  layout = 'grid',
}: ImageGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const openLightbox = useCallback((index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
    document.body.style.overflow = 'hidden';
  }, []);

  const closeLightbox = useCallback(() => {
    setLightboxOpen(false);
    document.body.style.overflow = '';
  }, []);

  const goToNext = useCallback(() => {
    setLightboxIndex((prev) => (prev + 1) % images.length);
  }, [images.length]);

  const goToPrev = useCallback(() => {
    setLightboxIndex((prev) => (prev - 1 + images.length) % images.length);
  }, [images.length]);

  // Handle keyboard navigation in lightbox
  React.useEffect(() => {
    if (!lightboxOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowRight') goToNext();
      if (e.key === 'ArrowLeft') goToPrev();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxOpen, closeLightbox, goToNext, goToPrev]);

  if (images.length === 0) return null;

  // Single image - use regular component
  if (images.length === 1) {
    return (
      <OptimizedImage
        src={images[0].src}
        alt={images[0].alt}
        caption={images[0].caption}
      />
    );
  }

  // Grid layout
  if (layout === 'grid') {
    return (
      <>
        <div className="mb-6">
          <div className={`grid gap-3 ${images.length === 2 ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-3'}`}>
            {images.map((image, index) => (
              <button
                key={index}
                onClick={() => openLightbox(index)}
                className="relative aspect-square rounded-lg overflow-hidden bg-gray-100 group cursor-pointer focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
              >
                <img
                  src={image.src}
                  alt={image.alt}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="bg-white/90 rounded-full p-1.5 shadow-lg">
                    <svg className="w-4 h-4 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                    </svg>
                  </div>
                </div>
              </button>
            ))}
          </div>
          <p className="text-sm text-gray-500 mt-2 text-center">
            Click to enlarge ({images.length} images)
          </p>
        </div>

        {/* Lightbox */}
        {lightboxOpen && (
          <div
            className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
            onClick={closeLightbox}
          >
            {/* Close button */}
            <button
              onClick={closeLightbox}
              className="absolute top-4 right-4 text-white/80 hover:text-white p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors z-10"
              aria-label="Close lightbox"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Navigation buttons */}
            <button
              onClick={(e) => { e.stopPropagation(); goToPrev(); }}
              className="absolute left-4 text-white/80 hover:text-white p-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors z-10"
              aria-label="Previous image"
            >
              <ChevronLeftIcon size={24} />
            </button>

            <button
              onClick={(e) => { e.stopPropagation(); goToNext(); }}
              className="absolute right-4 text-white/80 hover:text-white p-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors z-10"
              aria-label="Next image"
            >
              <ChevronRightIcon size={24} />
            </button>

            {/* Main image */}
            <div
              className="max-w-[90vw] max-h-[85vh] flex flex-col items-center"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={images[lightboxIndex].src}
                alt={images[lightboxIndex].alt}
                className="max-w-full max-h-[75vh] object-contain rounded-lg"
              />
              {images[lightboxIndex].caption && (
                <p className="text-white/80 text-center mt-4 px-4 max-w-2xl">
                  {images[lightboxIndex].caption}
                </p>
              )}
              <p className="text-white/50 text-sm mt-2">
                {lightboxIndex + 1} / {images.length}
              </p>
            </div>

            {/* Thumbnail strip */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 max-w-[90vw] overflow-x-auto py-2 px-4">
              {images.map((image, index) => (
                <button
                  key={index}
                  onClick={(e) => { e.stopPropagation(); setLightboxIndex(index); }}
                  className={`w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 border-2 transition-all ${
                    index === lightboxIndex
                      ? 'border-white opacity-100'
                      : 'border-transparent opacity-50 hover:opacity-80'
                  }`}
                >
                  <img
                    src={image.src}
                    alt={`Thumbnail ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          </div>
        )}
      </>
    );
  }

  // Carousel layout
  if (layout === 'carousel') {
    return (
      <div className="mb-6">
        <div className="relative">
          {/* Main carousel image */}
          <div className="relative aspect-video rounded-xl overflow-hidden bg-gray-100">
            <img
              src={images[activeIndex].src}
              alt={images[activeIndex].alt}
              className="absolute inset-0 w-full h-full object-contain"
            />
          </div>

          {/* Navigation arrows */}
          <button
            onClick={() => setActiveIndex((prev) => (prev - 1 + images.length) % images.length)}
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white p-2 rounded-full shadow-lg transition-colors"
            aria-label="Previous"
          >
            <ChevronLeftIcon size={20} />
          </button>
          <button
            onClick={() => setActiveIndex((prev) => (prev + 1) % images.length)}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white p-2 rounded-full shadow-lg transition-colors"
            aria-label="Next"
          >
            <ChevronRightIcon size={20} />
          </button>

          {/* Dots indicator */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
            {images.map((_, index) => (
              <button
                key={index}
                onClick={() => setActiveIndex(index)}
                className={`w-2 h-2 rounded-full transition-all ${
                  index === activeIndex ? 'bg-white w-6' : 'bg-white/50 hover:bg-white/70'
                }`}
                aria-label={`Go to image ${index + 1}`}
              />
            ))}
          </div>
        </div>

        {/* Caption */}
        {images[activeIndex].caption && (
          <p className="text-sm text-gray-500 mt-3 text-center italic">
            {images[activeIndex].caption}
          </p>
        )}

        {/* Thumbnail strip */}
        <div className="flex gap-2 mt-3 overflow-x-auto pb-2">
          {images.map((image, index) => (
            <button
              key={index}
              onClick={() => setActiveIndex(index)}
              className={`w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 border-2 transition-all ${
                index === activeIndex
                  ? 'border-green-500 ring-2 ring-green-200'
                  : 'border-transparent opacity-60 hover:opacity-100'
              }`}
            >
              <img
                src={image.src}
                alt={`Thumbnail ${index + 1}`}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Default to grid
  return null;
});

export default ImageGallery;
