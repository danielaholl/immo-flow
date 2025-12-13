'use client';

import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Platform } from 'react-native';

export interface SearchBarProps {
  onSearch: (query: string) => void;
  className?: string;
  placeholder?: string;
}

/**
 * AI-Powered Natural Language Search Bar
 * Users can search using natural language like "3 Zimmer Wohnung in München mit Balkon"
 */
export function SearchBar({ onSearch, className, placeholder }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (Platform.OS === 'web' && inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = inputRef.current.scrollHeight + 'px';
    }
  }, [query]);

  const handleSearch = () => {
    if (!query.trim() || isLoading) return;
    setIsLoading(true);
    onSearch(query.trim());
    // Reset loading state after a short delay
    setTimeout(() => setIsLoading(false), 500);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSearch();
    }
  };

  if (Platform.OS === 'web') {
    return (
      <div className={className || ''}>
        {/* Search Field */}
        <div className="bg-white rounded-full shadow-lg border border-gray-200 hover:shadow-xl transition-shadow">
          <div className="flex items-center">
            {/* Natural Language Input */}
            <div className="flex-1 px-6 py-5 flex items-center">
              <textarea
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={placeholder || "z.B. 'Suche eine 3 Zimmer Wohnung in München Schwabing mit Balkon'"}
                rows={1}
                disabled={isLoading}
                className="w-full resize-none outline-none text-gray-900 placeholder-gray-400 text-xl leading-tight max-h-24 overflow-y-auto disabled:opacity-50 bg-transparent"
                style={{ minHeight: '28px' }}
              />
            </div>

            {/* Search Button */}
            <div className="px-2 py-2 flex items-center">
              <button
                onClick={handleSearch}
                disabled={!query.trim() || isLoading}
                className="bg-primary hover:bg-primary/90 text-white rounded-full px-6 py-4 font-semibold flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 active:scale-95 text-lg"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                )}
                <span className="hidden sm:inline">Suchen</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Mobile/React Native version
  return (
    <View style={styles.container}>
      <View style={styles.searchRow}>
        <TextInput
          style={styles.input}
          value={query}
          onChangeText={setQuery}
          placeholder={placeholder || "z.B. '3 Zimmer Wohnung in München mit Balkon'"}
          placeholderTextColor="#9CA3AF"
          multiline
          editable={!isLoading}
        />

        <TouchableOpacity
          style={[styles.searchButton, (!query.trim() || isLoading) && styles.searchButtonDisabled]}
          onPress={handleSearch}
          disabled={!query.trim() || isLoading}
        >
          <Text style={styles.searchButtonText}>
            {isLoading ? 'Suche...' : 'Suchen'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    padding: 16,
    marginVertical: 16,
  },
  searchRow: {
    gap: 12,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111827',
    minHeight: 48,
    textAlignVertical: 'top',
  },
  searchButton: {
    backgroundColor: '#FF385C',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  searchButtonDisabled: {
    opacity: 0.5,
  },
  searchButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
