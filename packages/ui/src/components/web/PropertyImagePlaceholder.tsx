'use client';

import { Home } from 'lucide-react';

interface PropertyImagePlaceholderProps {
  className?: string;
  iconSize?: number;
  showText?: boolean;
  text?: string;
}

export function PropertyImagePlaceholder({
  className = '',
  iconSize = 48,
  showText = false,
  text = 'Kein Bild verfügbar',
}: PropertyImagePlaceholderProps) {
  return (
    <div className={`bg-gradient-to-br from-gray-100 to-gray-200 flex flex-col items-center justify-center ${className}`}>
      <Home size={iconSize} className="text-gray-400" strokeWidth={1.5} />
      {showText && (
        <p className="text-sm mt-2 font-medium text-gray-400">{text}</p>
      )}
    </div>
  );
}
