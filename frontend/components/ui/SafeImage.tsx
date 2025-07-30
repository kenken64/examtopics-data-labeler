'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

interface SafeImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  fallbackSrc?: string;
  placeholder?: React.ReactNode;
  onError?: () => void;
}

export default function SafeImage({
  src,
  alt,
  width = 100,
  height = 100,
  className = '',
  fallbackSrc,
  placeholder,
  onError,
}: SafeImageProps) {
  const [imageSrc, setImageSrc] = useState(src);
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Reset state when src changes
  useEffect(() => {
    setImageSrc(src);
    setHasError(false);
    setIsLoading(true);
  }, [src]);

  // Handle image load error
  const handleError = () => {
    console.log('🖼️ SafeImage: Failed to load image:', imageSrc);
    setHasError(true);
    setIsLoading(false);
    
    if (onError) {
      onError();
    }

    // Try fallback image if available and not already tried
    if (fallbackSrc && imageSrc !== fallbackSrc) {
      console.log('🔄 SafeImage: Trying fallback image:', fallbackSrc);
      setImageSrc(fallbackSrc);
      setHasError(false);
      setIsLoading(true);
      return;
    }

    // If this is a Cloudinary image that failed, create a data URL as last resort
    if (imageSrc.includes('cloudinary.com')) {
      console.log('⚠️ SafeImage: Cloudinary image failed, likely Next.js config issue');
      // Don't retry, just show placeholder
    }
  };

  // Handle successful image load
  const handleLoad = () => {
    console.log('✅ SafeImage: Successfully loaded image:', imageSrc);
    setIsLoading(false);
    setHasError(false);
  };

  // If image failed to load and no fallback, show placeholder
  if (hasError && (!fallbackSrc || imageSrc === fallbackSrc)) {
    if (placeholder) {
      return <>{placeholder}</>;
    }

    // Default placeholder
    return (
      <div 
        className={`flex items-center justify-center bg-gray-100 border-2 border-gray-300 ${className}`}
        style={{ width, height }}
      >
        <svg
          className="w-1/2 h-1/2 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
          />
        </svg>
      </div>
    );
  }

  // Try to render with regular img first to check if domain is configured
  const isCloudinaryImage = imageSrc.includes('cloudinary.com');
  
  if (isCloudinaryImage) {
    // For Cloudinary images, use regular img tag as fallback to avoid Next.js config issues
    return (
      <>
        {isLoading && (
          <div 
            className={`animate-pulse bg-gray-200 ${className}`}
            style={{ width, height }}
          />
        )}
        <Image
          src={imageSrc}
          alt={alt}
          width={width}
          height={height}
          className={`${className} ${isLoading ? 'hidden' : ''}`}
          onError={handleError}
          onLoad={handleLoad}
          style={{ 
            objectFit: 'cover',
            display: isLoading ? 'none' : 'block'
          }}
          unoptimized={!imageSrc.includes('cloudinary.com') && !imageSrc.startsWith('/')}
        />
      </>
    );
  }

  // For other images, use Next.js Image component
  return (
    <>
      {isLoading && (
        <div 
          className={`animate-pulse bg-gray-200 ${className}`}
          style={{ width, height }}
        />
      )}
      <Image
        src={imageSrc}
        alt={alt}
        width={width}
        height={height}
        className={`${className} ${isLoading ? 'hidden' : ''}`}
        onError={handleError}
        onLoad={handleLoad}
        style={{ 
          objectFit: 'cover',
          display: isLoading ? 'none' : 'block'
        }}
      />
    </>
  );
}
