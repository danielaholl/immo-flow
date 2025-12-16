/**
 * UI Components exports
 */

// Shared Components (RN + Web)
export * from './shared/Button';
export * from './shared/Input';
export * from './shared/Avatar';
export * from './shared/Badge';
export * from './shared/SearchBar';
export * from './shared/PropertyCard'; // Platform-aware export (web/native)
export * from './shared/PropertyImageSlideshow'; // Platform-aware export (web/native)

// Web-only Components
export { ChatAssistant, type ChatAssistantProps, type Message as ChatMessage } from './web/ChatAssistant';
export { ChatModal, type ChatModalProps } from './web/ChatModal';
export { PropertyScoreBadge } from './web/PropertyScoreBadge';
export { InvestmentScoreBadge } from './web/InvestmentScoreBadge';
export {
  GlassButton,
  GlassDeleteButton,
  GlassSuccessButton,
  GlassWarningButton,
  GlassPrimaryButton,
  GlassFavoriteButton,
  type GlassButtonProps,
  type GlassButtonVariant,
  type GlassButtonSize,
} from './web/GlassButton';
export * from './web/PropertyImagePlaceholder';
