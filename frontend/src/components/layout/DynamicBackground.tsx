"use client";
import React, { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';

// Dynamic import to prevent SSR issues
let Trianglify: any = null;

// Main component that will be dynamically loaded
const DynamicBackgroundComponent = () => {
  const [bg1Url, setBg1Url] = useState<string | null>(null);
  const [bg2Url, setBg2Url] = useState<string | null>(null);
  const [bg1Opacity, setBg1Opacity] = useState(0.5); // Initial opacity to match codepen
  const [bg2Opacity, setBg2Opacity] = useState(1);
  const [isClient, setIsClient] = useState(false);
  const [trianglifyLoaded, setTrianglifyLoaded] = useState(false);
  const drawTargetRef = useRef(1); // Use ref instead of state to avoid re-renders

  // Load Trianglify only on client side
  useEffect(() => {
    setIsClient(true);
    
    const loadTrianglify = async () => {
      try {
        if (typeof window !== 'undefined' && !Trianglify) {
          const trianglifyModule = await import('trianglify');
          Trianglify = trianglifyModule.default;
          setTrianglifyLoaded(true);
        }
      } catch (error) {
        console.error('Failed to load Trianglify:', error);
        // Set a fallback state to prevent infinite loading
        setTrianglifyLoaded(false);
      }
    };

    loadTrianglify();
  }, []);

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

  const generateAndDrawPattern = useCallback(() => {
    // Only generate if we're on client side and Trianglify is loaded
    if (!isClient || !trianglifyLoaded || !Trianglify || typeof window === 'undefined') {
      return;
    }

    try {
      const palettes = [
        ['#1E40AF', '#3B82F6', '#60A5FA', '#94A3B8'], // Palette 1: Blue-900, Blue-800, Blue-600, Slate-600
        ['#3B82F6', '#60A5FA', '#64748B', '#CBD5E1']  // Palette 2: Blue-500, Blue-700, Slate-500, Slate-700
      ];
      const selectedPalette = palettes[Math.floor(Math.random() * palettes.length)];

      const pattern = Trianglify({
        width: dimensions.width,
        height: dimensions.height,
        variance: 0.75,
        cellSize: 75, // Example cell size, can be adjusted
        xColors: selectedPalette,
      }).toCanvas().toDataURL();

      if (drawTargetRef.current === 1) {
        setBg1Url(pattern);
        setBg1Opacity(1);
        setBg2Opacity(0);
        drawTargetRef.current = 2;
      } else {
        setBg2Url(pattern);
        setBg2Opacity(1);
        setBg1Opacity(0);
        drawTargetRef.current = 1;
      }
    } catch (error) {
      console.error("Error generating Trianglify pattern:", error);
      // Fallback or no-op if Trianglify fails
    }
  }, [dimensions, isClient, trianglifyLoaded]);

  // Handle window resize
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

  // Initial pattern generation
  useEffect(() => {
    if (isClient && trianglifyLoaded) {
      generateAndDrawPattern();
    }
  }, [generateAndDrawPattern, isClient, trianglifyLoaded]);

  // Pattern regeneration interval
  useEffect(() => {
    if (!isClient || !trianglifyLoaded) return;

    const intervalId = setInterval(() => {
      generateAndDrawPattern();
    }, 7000);

    return () => {
      clearInterval(intervalId);
    };
  }, [generateAndDrawPattern, isClient, trianglifyLoaded]);

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
      {bg1Url && (
        <div
          id="background-1"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundImage: `url(${bg1Url})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            opacity: bg1Opacity,
            zIndex: 1, // As per codepen
            transition: 'opacity 3s ease-in-out',
          }}
        />
      )}
      {bg2Url && (
        <div
          id="background-2"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundImage: `url(${bg2Url})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            opacity: bg2Opacity,
            zIndex: 0, // As per codepen
            transition: 'opacity 4s ease-in-out', // Slightly different fade out duration as per codepen
          }}
        />
      )}
      {/* Fallback background while Trianglify patterns load */}
      {!bg1Url && !bg2Url && (
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
      )}
    </div>
  );
};

// Export the component directly without dynamic import since it's already a client component
export default DynamicBackgroundComponent; 