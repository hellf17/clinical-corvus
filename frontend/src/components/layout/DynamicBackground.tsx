"use client";
import React, { useState, useEffect, useCallback, useRef } from 'react';

// Main component
const DynamicBackgroundComponent = () => {
  const [bg1Url, setBg1Url] = useState<string | null>(null);
  const [bg2Url, setBg2Url] = useState<string | null>(null);
  const [bg1Opacity, setBg1Opacity] = useState(0.5); // Initial opacity to match codepen
  const [bg2Opacity, setBg2Opacity] = useState(1);
  const [isClient, setIsClient] = useState(false);
  const drawTargetRef = useRef(1); // Use ref instead of state to avoid re-renders

  // Handle window resize
  const getWindowDimensions = useCallback(() => {
    if (typeof window !== 'undefined') {
      return {
        width: window.innerWidth,
        height: window.innerHeight,
      };
    }
    return { width: 1920, height: 1080 }; // Default for SSR or if window is not available
  }, []);

  const [dimensions, setDimensions] = useState(getWindowDimensions());

  useEffect(() => {
    if (!isClient) return;

    const handleResize = () => {
      setDimensions(getWindowDimensions());
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('resize', handleResize);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('resize', handleResize);
      }
    };
  }, [getWindowDimensions, isClient]);

  // Don't render anything during SSR
  if (!isClient) {
    return (
      <div 
        id="background-container" 
        style={{ 
          position: 'fixed', 
          top: 0, 
          left: 0, 
          width: '100vw', 
          height: '100vh', 
          zIndex: -10,
          background: 'linear-gradient(135deg, #003366 0%, #004C99 50%, #008080 100%)'
        }} 
      />
    );
  }

  return (
    <div id="background-container" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: -10 }}>
      {/* Fallback background */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'linear-gradient(135deg, #003366 0%, #004C99 50%, #008080 100%)',
          zIndex: 0,
        }}
      />
    </div>
  );
};

// Export the component directly since it's already a client component
export default DynamicBackgroundComponent;