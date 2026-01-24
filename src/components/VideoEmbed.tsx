'use client';

import React, { useState, useRef, useEffect, memo } from 'react';
import { PlayIcon } from '@/components/Icons';

interface VideoEmbedProps {
  url: string;
  title?: string;
  caption?: string;
}

/**
 * Parse video URL and extract embed information
 */
function parseVideoUrl(url: string): { type: 'youtube' | 'vimeo' | 'loom' | 'unknown'; id: string | null; embedUrl: string | null } {
  // YouTube patterns
  const youtubePatterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  ];

  for (const pattern of youtubePatterns) {
    const match = url.match(pattern);
    if (match) {
      return {
        type: 'youtube',
        id: match[1],
        embedUrl: `https://www.youtube-nocookie.com/embed/${match[1]}?rel=0&modestbranding=1`,
      };
    }
  }

  // Vimeo patterns
  const vimeoPattern = /vimeo\.com\/(?:video\/)?(\d+)/;
  const vimeoMatch = url.match(vimeoPattern);
  if (vimeoMatch) {
    return {
      type: 'vimeo',
      id: vimeoMatch[1],
      embedUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}?dnt=1`,
    };
  }

  // Loom patterns
  const loomPattern = /loom\.com\/(?:share|embed)\/([a-zA-Z0-9]+)/;
  const loomMatch = url.match(loomPattern);
  if (loomMatch) {
    return {
      type: 'loom',
      id: loomMatch[1],
      embedUrl: `https://www.loom.com/embed/${loomMatch[1]}`,
    };
  }

  return { type: 'unknown', id: null, embedUrl: null };
}

/**
 * Get YouTube thumbnail URL
 */
function getYouTubeThumbnail(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
}

/**
 * Lazy-loaded video embed component with:
 * - Intersection Observer for lazy loading
 * - Click-to-play thumbnail preview
 * - Support for YouTube, Vimeo, Loom
 * - Responsive 16:9 aspect ratio
 */
const VideoEmbed = memo(function VideoEmbed({
  url,
  title = 'Video',
  caption,
}: VideoEmbedProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const videoInfo = parseVideoUrl(url);

  // Intersection Observer for lazy loading
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: '200px', // Start loading 200px before entering viewport
        threshold: 0,
      }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const handlePlay = () => {
    setIsPlaying(true);
  };

  // Unknown video type - show link
  if (videoInfo.type === 'unknown' || !videoInfo.embedUrl) {
    return (
      <div className="mb-6">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-200 hover:bg-gray-100 hover:border-gray-300 transition-all group"
        >
          <div className="w-12 h-12 rounded-lg bg-red-100 flex items-center justify-center group-hover:bg-red-200 transition-colors">
            <PlayIcon size={24} className="text-red-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-900 truncate">{title}</p>
            <p className="text-sm text-gray-500 truncate">{url}</p>
          </div>
          <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
        {caption && (
          <p className="text-sm text-gray-500 mt-2 text-center italic">{caption}</p>
        )}
      </div>
    );
  }

  return (
    <figure className="mb-6" ref={containerRef}>
      <div className="relative w-full rounded-xl overflow-hidden shadow-lg bg-black aspect-video">
        {/* Thumbnail preview (before play) */}
        {!isPlaying && isInView && (
          <button
            onClick={handlePlay}
            className="absolute inset-0 w-full h-full group cursor-pointer"
            aria-label={`Play ${title}`}
          >
            {/* Thumbnail image */}
            {videoInfo.type === 'youtube' && videoInfo.id && (
              <img
                src={getYouTubeThumbnail(videoInfo.id)}
                alt={`${title} thumbnail`}
                className="absolute inset-0 w-full h-full object-cover"
                loading="lazy"
              />
            )}

            {/* Overlay */}
            <div className="absolute inset-0 bg-black/30 group-hover:bg-black/40 transition-all" />

            {/* Play button */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-20 h-20 rounded-full bg-white/90 flex items-center justify-center shadow-xl group-hover:scale-110 group-hover:bg-white transition-all duration-300">
                <PlayIcon size={40} className="text-red-600 ml-1" />
              </div>
            </div>

            {/* Video title */}
            <div className="absolute bottom-0 left-0 right-0 p-4">
              <p className="text-white font-medium text-lg drop-shadow-lg">{title}</p>
              <p className="text-white/80 text-sm capitalize">{videoInfo.type} video</p>
            </div>
          </button>
        )}

        {/* Loading placeholder */}
        {!isInView && (
          <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-gray-700 flex items-center justify-center">
              <PlayIcon size={32} className="text-gray-500" />
            </div>
          </div>
        )}

        {/* Actual video iframe (after play clicked) */}
        {isPlaying && (
          <iframe
            src={`${videoInfo.embedUrl}&autoplay=1`}
            title={title}
            className={`absolute inset-0 w-full h-full transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            loading="lazy"
            onLoad={() => setIsLoaded(true)}
          />
        )}

        {/* Loading spinner while iframe loads */}
        {isPlaying && !isLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-black">
            <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin" />
          </div>
        )}
      </div>

      {caption && (
        <figcaption className="text-sm text-gray-500 mt-3 text-center italic">
          {caption}
        </figcaption>
      )}
    </figure>
  );
});

export default VideoEmbed;
