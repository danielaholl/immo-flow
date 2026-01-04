import { Star } from 'lucide-react';

interface ProviderBadgeProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function ProviderBadge({ size = 'md', className = '' }: ProviderBadgeProps) {
  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1.5',
    lg: 'text-base px-4 py-2',
  };

  const iconSizes = {
    sm: 14,
    md: 16,
    lg: 18,
  };

  return (
    <div
      className={`inline-flex items-center gap-1.5 bg-gradient-to-r from-amber-50 to-yellow-50
                   border border-amber-200 rounded-full ${sizeClasses[size]}
                   font-medium text-amber-900 ${className}`}
      title="Verifizierter Anbieter auf Rendito"
    >
      <Star size={iconSizes[size]} className="fill-amber-400 text-amber-500" />
      <span>Verifizierter Anbieter</span>
    </div>
  );
}
