'use client';

// Slideshow — cycles through an array of image sources with cross-fade.
//
// Used by:
//   • Hero on mobile (full-bleed, no phone frame)
//   • Hero on desktop (inside PhoneScreenshot via children)
//
// Exposes the active index via onIndexChange so the parent can sync a
// rotating caption with the visible slide.
//
// Performance:
//   • First image is loaded eagerly with fetchpriority="high" so it can
//     serve as the LCP element on mobile. Subsequent images load lazily.
//   • All images are absolutely positioned; only opacity changes during
//     transitions — no layout reflow, GPU-accelerated.

import React, { useEffect, useState } from 'react';

interface SlideshowProps {
  srcs: string[];
  intervalMs?: number;
  alt?: string;
  onIndexChange?: (index: number) => void;
  objectPosition?: string;
  style?: React.CSSProperties;
  className?: string;
}

export default function Slideshow({
  srcs,
  intervalMs = 3000,
  alt = '',
  onIndexChange,
  objectPosition = 'top center',
  style,
  className,
}: SlideshowProps) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (srcs.length <= 1) return;
    const id = setInterval(() => {
      setIndex(prev => (prev + 1) % srcs.length);
    }, intervalMs);
    return () => clearInterval(id);
  }, [srcs.length, intervalMs]);

  useEffect(() => {
    onIndexChange?.(index);
  }, [index, onIndexChange]);

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        ...style,
      }}
      className={className}
      role="img"
      aria-label={alt}
    >
      {srcs.map((src, idx) => (
        <img
          key={src}
          src={src}
          alt=""
          loading={idx === 0 ? 'eager' : 'lazy'}
          // fetchPriority is supported in React 18.3+ (lower-case in DOM).
          // @ts-expect-error — older @types/react may not include it.
          fetchpriority={idx === 0 ? 'high' : 'auto'}
          decoding="async"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition,
            opacity: idx === index ? 1 : 0,
            transition: 'opacity 220ms ease-out',
            display: 'block',
          }}
        />
      ))}
    </div>
  );
}
