'use client';

import React from 'react';

export interface FeatureSelectorProps {
  availableFeatures: string[];
  selectedFeatures: string[];
  onChange: (features: string[]) => void;
  label?: string;
  columns?: 2 | 3 | 4;
  allowCustom?: boolean;
}

/**
 * Wiederverwendbare Multi-Select Komponente für Ausstattungsmerkmale
 * Verwendet in: Create Listing, Edit Property
 */
export function FeatureSelector({
  availableFeatures,
  selectedFeatures,
  onChange,
  label = 'Ausstattung auswählen',
  columns = 3,
  allowCustom = false,
}: FeatureSelectorProps) {
  const [customFeature, setCustomFeature] = React.useState('');
  const [showCustomInput, setShowCustomInput] = React.useState(false);

  const toggleFeature = (feature: string) => {
    if (selectedFeatures.includes(feature)) {
      // Remove feature
      onChange(selectedFeatures.filter((f) => f !== feature));
    } else {
      // Add feature
      onChange([...selectedFeatures, feature]);
    }
  };

  const handleAddCustomFeature = () => {
    if (!customFeature.trim()) return;

    const trimmedFeature = customFeature.trim();
    if (!selectedFeatures.includes(trimmedFeature)) {
      onChange([...selectedFeatures, trimmedFeature]);
    }

    setCustomFeature('');
    setShowCustomInput(false);
  };

  const gridColsClass = {
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-4',
  }[columns];

  return (
    <div className="space-y-3">
      {label && <p className="text-sm font-medium text-gray-700">{label}</p>}

      {/* Available Features Grid */}
      <div className={`grid ${gridColsClass} gap-2`}>
        {availableFeatures.map((feature) => {
          const isSelected = selectedFeatures.includes(feature);
          return (
            <button
              key={feature}
              type="button"
              onClick={() => toggleFeature(feature)}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                isSelected
                  ? 'bg-primary text-white border-2 border-primary'
                  : 'bg-white text-gray-900 border-2 border-gray-300 hover:border-primary'
              }`}
            >
              {feature}
            </button>
          );
        })}
      </div>

      {/* Custom Feature Input */}
      {allowCustom && (
        <div className="pt-2 border-t border-gray-200">
          {!showCustomInput ? (
            <button
              type="button"
              onClick={() => setShowCustomInput(true)}
              className="text-sm text-primary hover:underline font-medium"
            >
              + Eigenes Merkmal hinzufügen
            </button>
          ) : (
            <div className="flex gap-2">
              <input
                type="text"
                value={customFeature}
                onChange={(e) => setCustomFeature(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCustomFeature();
                  } else if (e.key === 'Escape') {
                    setShowCustomInput(false);
                    setCustomFeature('');
                  }
                }}
                placeholder="z.B. Dachterrasse"
                className="flex-1 px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-primary"
                autoFocus
              />
              <button
                type="button"
                onClick={handleAddCustomFeature}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark font-medium"
              >
                Hinzufügen
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCustomInput(false);
                  setCustomFeature('');
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
              >
                Abbrechen
              </button>
            </div>
          )}
        </div>
      )}

      {/* Selected Features Summary */}
      {selectedFeatures.length > 0 && (
        <div className="pt-3 border-t border-gray-200">
          <p className="text-xs text-gray-500 mb-2">
            {selectedFeatures.length} {selectedFeatures.length === 1 ? 'Merkmal' : 'Merkmale'} ausgewählt
          </p>
          <div className="flex flex-wrap gap-2">
            {selectedFeatures.map((feature) => (
              <span
                key={feature}
                className="inline-flex items-center gap-1 px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium"
              >
                {feature}
                <button
                  type="button"
                  onClick={() => toggleFeature(feature)}
                  className="ml-1 hover:bg-primary/20 rounded-full p-0.5"
                  aria-label={`${feature} entfernen`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
