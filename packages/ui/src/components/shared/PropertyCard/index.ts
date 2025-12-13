/**
 * PropertyCard Platform-Aware Export
 *
 * Bundle Resolution:
 * - Metro (React Native): PropertyCard.native.tsx
 * - Webpack (Next.js): PropertyCard.web.tsx
 */

export * from './PropertyCard.types';
export { PropertyCard } from './PropertyCard'; // Will resolve to .web or .native
