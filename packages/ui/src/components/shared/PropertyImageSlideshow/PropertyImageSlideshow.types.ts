import type { ReactNode } from 'react';

export interface PropertyImageSlideshowProps {
  images: string[] | null | undefined;
  /** Video URL for short-form property video (TikTok-style) */
  videoUrl?: string | null;
  title: string;
  duration?: number; // Duration per image in ms
  showCounter?: boolean;
  showProgressBars?: boolean;
  className?: string;
  imageClassName?: string;
  aspectRatio?: 'square' | 'video' | 'auto';
  rounded?: 'none' | 'lg' | 'xl' | '2xl' | 'full';
  overlay?: ReactNode;
  onImageChange?: (index: number) => void;
  onClick?: () => void;
  slideshowId?: string;
  propertyType?: string;
  /** Whether the slideshow is active (for controlled animation) */
  isActive?: boolean;
  /** Callback when slideshow completes (reaches last image) */
  onSlideshowComplete?: () => void;
  /** Callback when video ends */
  onVideoEnd?: () => void;
  /** Whether to show gradient overlay at the bottom (for text readability) */
  showGradient?: boolean;
}

export interface SlideshowManager {
  registerSlideshow: (id: string, callback: (isActive: boolean) => void) => void;
  unregisterSlideshow: (id: string) => void;
  updateVisibility: (id: string, visibility: number) => void;
}
