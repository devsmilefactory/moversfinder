/**
 * RadarAnimation Component
 * 
 * Radar-like scanning animation for ride search/loading states
 */

import React from 'react';

const RadarAnimation = () => {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="relative w-48 h-48">
        {/* Radar circles */}
        <div className="absolute inset-0 rounded-full border-2 border-gray-200"></div>
        <div className="absolute inset-4 rounded-full border-2 border-gray-200"></div>
        <div className="absolute inset-8 rounded-full border-2 border-gray-200"></div>
        <div className="absolute inset-12 rounded-full border-2 border-gray-200"></div>
        
        {/* Center dot */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-green-500 rounded-full z-10"></div>
        
        {/* Scanning line */}
        <div 
          className="absolute top-1/2 left-1/2 w-1/2 h-0.5 origin-left bg-green-500 opacity-70 z-20"
          style={{
            animation: 'radar-scan 2s linear infinite',
            transformOrigin: 'left center'
          }}
        ></div>
        
        {/* Scanning arc overlay - using conic gradient */}
        <div 
          className="absolute inset-0 rounded-full opacity-30"
          style={{
            background: 'conic-gradient(from 0deg, transparent 0deg, rgba(34, 197, 94, 0.3) 60deg, transparent 120deg)',
            animation: 'radar-sweep 2s linear infinite',
            transformOrigin: 'center center'
          }}
        ></div>
      </div>
      <p className="text-gray-600 mt-4 text-sm">Searching for rides...</p>
      
      <style>{`
        @keyframes radar-scan {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
        
        @keyframes radar-sweep {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
};

export default RadarAnimation;

