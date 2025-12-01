'use client';

import { createContext, useContext, useCallback, useRef } from 'react';

interface SlideshowManager {
  registerSlideshow: (id: string, callback: (isActive: boolean) => void) => void;
  unregisterSlideshow: (id: string) => void;
  updateVisibility: (id: string, visibility: number) => void;
}

const SlideshowManagerContext = createContext<SlideshowManager | null>(null);

export function SlideshowManagerProvider({ children }: { children: React.ReactNode }) {
  const activeSlideshowIdRef = useRef<string | null>(null);
  const visibilityMapRef = useRef<Map<string, number>>(new Map());
  const callbacksRef = useRef<Map<string, (isActive: boolean) => void>>(new Map());

  const updateActiveSlideshow = useCallback(() => {
    let maxVisibility = 0;
    let mostVisibleId: string | null = null;

    visibilityMapRef.current.forEach((visibility, id) => {
      if (visibility > maxVisibility) {
        maxVisibility = visibility;
        mostVisibleId = id;
      }
    });

    if (mostVisibleId !== activeSlideshowIdRef.current) {
      activeSlideshowIdRef.current = mostVisibleId;
      // Notify all slideshows about the change
      callbacksRef.current.forEach((callback, id) => {
        callback(id === activeSlideshowIdRef.current);
      });
    }
  }, []);

  const registerSlideshow = useCallback((id: string, callback: (isActive: boolean) => void) => {
    callbacksRef.current.set(id, callback);
  }, []);

  const unregisterSlideshow = useCallback((id: string) => {
    callbacksRef.current.delete(id);
    visibilityMapRef.current.delete(id);
    updateActiveSlideshow();
  }, [updateActiveSlideshow]);

  const updateVisibility = useCallback((id: string, visibility: number) => {
    visibilityMapRef.current.set(id, visibility);
    updateActiveSlideshow();
  }, [updateActiveSlideshow]);

  const manager: SlideshowManager = {
    registerSlideshow,
    unregisterSlideshow,
    updateVisibility,
  };

  return (
    <SlideshowManagerContext.Provider value={manager}>
      {children}
    </SlideshowManagerContext.Provider>
  );
}

export function useSlideshowManager() {
  const context = useContext(SlideshowManagerContext);
  if (!context) {
    throw new Error('useSlideshowManager must be used within a SlideshowManagerProvider');
  }
  return context;
}
