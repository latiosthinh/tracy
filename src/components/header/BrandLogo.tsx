import React from 'react';

interface BrandLogoProps {
  onOpenDocs?: () => void;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({ onOpenDocs }) => {
  return (
    <div
      className="flex items-center space-x-2 mr-2 shrink-0 group cursor-pointer"
      onClick={onOpenDocs}
      title="Tracy Agentic Automation Studio Docs"
    >
      <div className="relative w-7 h-7 rounded-[7px] bg-gradient-to-br from-amber-400 via-amber-600 to-stone-900 p-0.5 flex items-center justify-center border border-amber-400/60 shadow-xs shadow-amber-900/40 group-hover:scale-105 transition-transform">
        <div className="w-full h-full bg-stone-950 rounded-[5px] flex items-center justify-center relative overflow-hidden">
          <span className="font-display font-black text-amber-300 text-sm tracking-tight">T</span>
          <span className="absolute bottom-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse shadow-xs shadow-cyan-400" />
        </div>
      </div>
      <div className="flex flex-col leading-none hidden sm:flex">
        <span className="font-display font-black text-amber-100 text-sm tracking-wide group-hover:text-amber-300 transition-colors">
          Tracy
        </span>
        <span className="text-[9px] font-mono font-bold text-amber-500/90 tracking-widest uppercase">
          STUDIO
        </span>
      </div>
    </div>
  );
};
