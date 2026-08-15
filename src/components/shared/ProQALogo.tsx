import React from 'react';

interface ProQALogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const ProQALogo: React.FC<ProQALogoProps> = ({ size = 'md', className = '' }) => {
  const sizeMap = {
    sm: { container: 'w-7 h-7 rounded-[6px]', inner: 'rounded-[5px]', svg: 'w-4 h-4', stroke: 6.5 },
    md: { container: 'w-10 h-10 rounded-[8px]', inner: 'rounded-[7px]', svg: 'w-6 h-6', stroke: 6.5 },
    lg: { container: 'w-16 h-16 rounded-2xl', inner: 'rounded-[14px]', svg: 'w-10 h-10', stroke: 6.5 },
    xl: { container: 'w-24 h-24 rounded-2xl', inner: 'rounded-xl', svg: 'w-14 h-14', stroke: 6.5 },
  };

  const config = sizeMap[size];

  return (
    <div
      className={`relative ${config.container} bg-gradient-to-b from-amber-500/80 via-amber-700/60 to-stone-900 p-px flex items-center justify-center border border-amber-600/60 shadow-xl shadow-amber-950/70 ${className}`}
    >
      <div
        className={`w-full h-full bg-gradient-to-b from-stone-900 via-stone-950 to-stone-950 ${config.inner} flex items-center justify-center relative overflow-hidden border border-amber-500/25`}
      >
        <svg viewBox="0 0 64 64" className={`${config.svg} text-amber-300 drop-shadow-sm`} fill="none">
          <defs>
            <linearGradient id={`goldGrad-${size}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="35%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#d97706" />
            </linearGradient>
          </defs>
          <path
            d="M22 28 V20 C22 17 24.5 15 27.5 15 H36.5 C39.5 15 42 17 42 20 V29 C42 32 39.5 34 36.5 34 H32 V41"
            stroke={`url(#goldGrad-${size})`}
            strokeWidth={config.stroke}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* 4-wings sparkle star */}
          <path
            d="M32 44.5 Q32 50 37.5 50 Q32 50 32 55.5 Q32 50 26.5 50 Q32 50 32 44.5 Z"
            fill={`url(#goldGrad-${size})`}
          />
        </svg>
      </div>
    </div>
  );
};
