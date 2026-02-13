'use client'

import React from 'react';

interface CoinIconProps {
  size?: number;
  className?: string;
}

export function CoinIcon({ size = 24, className = '' }: CoinIconProps) {
  const uniqueId = React.useMemo(() => Math.random().toString(36).substr(2, 9), []);
  
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Outer circle - gold coin */}
      <circle
        cx="12"
        cy="12"
        r="11"
        fill={`url(#coinGradient${uniqueId})`}
        stroke="#B45309"
        strokeWidth="0.5"
      />
      {/* Dollar sign - centered */}
      <text
        x="12"
        y="16"
        fontSize="14"
        fontWeight="bold"
        fill="#FFFFFF"
        textAnchor="middle"
        fontFamily="Arial, sans-serif"
      >
        $
      </text>
      {/* Gradient definitions */}
      <defs>
        <linearGradient id={`coinGradient${uniqueId}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FCD34D" />
          <stop offset="50%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#D97706" />
        </linearGradient>
      </defs>
    </svg>
  );
}

