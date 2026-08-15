import React from 'react';
import { useTranslation } from '@/src/hooks/useTranslation';

interface BrandLogoProps {
  onOpenDocs?: () => void;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({ onOpenDocs }) => {
  const { t } = useTranslation();

  return (
    <button
      type="button"
      className="flex items-center space-x-2.5 mr-2 shrink-0 group cursor-pointer bg-transparent border-none p-0 text-left"
      onClick={onOpenDocs}
      title={t('header.brandDocs')}
      aria-label={t('header.brandDocs')}
    >
      {/* Vintage Emblem Mark with P/? Glyph and 4-Wings Star */}
      <div className="relative w-7 h-7 rounded-[6px] bg-gradient-to-b from-amber-500/80 via-amber-700/60 to-stone-900 p-px flex items-center justify-center border border-amber-600/50 shadow-xs shadow-amber-950/60 group-hover:scale-105 transition-transform" aria-hidden="true">
        <div className="w-full h-full bg-gradient-to-b from-stone-900 via-stone-950 to-stone-950 rounded-[5px] flex items-center justify-center relative overflow-hidden border border-amber-500/20">
          <svg viewBox="0 0 64 64" className="w-4.5 h-4.5 text-amber-300" fill="none">
            <path
              d="M22 28 V20 C22 17 24.5 15 27.5 15 H36.5 C39.5 15 42 17 42 20 V29 C42 32 39.5 34 36.5 34 H32 V41"
              stroke="currentColor"
              strokeWidth="6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* 4-wings sparkle star */}
            <path
              d="M32 44.5 Q32 50 37.5 50 Q32 50 32 55.5 Q32 50 26.5 50 Q32 50 32 44.5 Z"
              fill="currentColor"
            />
          </svg>
        </div>
      </div>
      <div className="flex flex-col leading-none hidden sm:flex">
        <span className="font-serif font-bold text-amber-100 text-sm tracking-wide group-hover:text-amber-300 transition-colors">
          {t('header.brandTitle')}
        </span>
        <span className="text-[9px] font-mono font-semibold text-amber-500/80 tracking-[0.25em] uppercase">
          {t('header.brandStudio')}
        </span>
      </div>
    </button>
  );
};



