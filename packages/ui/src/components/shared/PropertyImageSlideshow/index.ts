/**
 * PropertyImageSlideshow Platform-Aware Export
 *
 * Bundle Resolution:
 * - Metro (React Native): PropertyImageSlideshow.native.tsx
 * - Webpack (Next.js): PropertyImageSlideshow.web.tsx
 */

export * from './PropertyImageSlideshow.types';
export { PropertyImageSlideshow } from './PropertyImageSlideshow'; // Will resolve to .web or .native
export { SlideshowManagerProvider, useSlideshowManager } from './SlideshowManagerContext';
