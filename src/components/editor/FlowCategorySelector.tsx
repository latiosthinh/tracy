import React, { useState, useRef, useEffect } from 'react';
import { FlowCategory } from '../../types/autoflow';
import { PLAYWRIGHT_CATEGORIES } from '../../utils/flowUtils';
import { Globe, Server, Flame, Eye, Box, Tag, ChevronDown, Check } from 'lucide-react';

interface FlowCategorySelectorProps {
  category: FlowCategory;
  onChange: (category: FlowCategory) => void;
  compact?: boolean;
}

export const FlowCategorySelector: React.FC<FlowCategorySelectorProps> = ({
  category,
  onChange,
  compact = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentCatInfo =
    PLAYWRIGHT_CATEGORIES.find(c => c.id === category) || PLAYWRIGHT_CATEGORIES[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const renderIcon = (iconName: string, className = 'w-3.5 h-3.5') => {
    switch (iconName) {
      case 'Globe': return <Globe className={className} />;
      case 'Server': return <Server className={className} />;
      case 'Flame': return <Flame className={className} />;
      case 'Eye': return <Eye className={className} />;
      case 'Box': return <Box className={className} />;
      default: return <Tag className={className} />;
    }
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        title={`Category: ${currentCatInfo.label}. Click to change Playwright structure.`}
        className={`group flex items-center space-x-1.5 px-2.5 py-1 rounded-[6px] text-xs font-mono font-bold border transition-all cursor-pointer shadow-xs ${
          currentCatInfo.bgColor
        } ${currentCatInfo.borderColor} ${currentCatInfo.textColor} hover:brightness-110 active:scale-98`}
      >
        {renderIcon(currentCatInfo.iconName, `w-3.5 h-3.5 ${currentCatInfo.textColor}`)}
        <span className="uppercase tracking-wider text-[11px] font-bold">
          {currentCatInfo.badgeLabel}
        </span>
        {!compact && (
          <span className="text-[10px] font-sans font-normal opacity-80 hidden sm:inline">
            — {currentCatInfo.label}
          </span>
        )}
        <ChevronDown className={`w-3 h-3 text-stone-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1.5 w-80 bg-stone-900 border border-stone-800 rounded-[8px] shadow-2xl z-50 p-2 space-y-1 font-sans">
          <div className="text-[10px] font-mono text-stone-400 uppercase px-2 py-1 font-bold border-b border-stone-800 flex justify-between items-center">
            <span>Playwright Category</span>
            <span className="text-amber-400 font-mono text-[9px] font-normal">Structure</span>
          </div>

          <div className="space-y-1 pt-1">
            {PLAYWRIGHT_CATEGORIES.map(cat => {
              const isSelected = cat.id === category;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    onChange(cat.id);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left p-2 rounded-[6px] transition-all cursor-pointer border flex items-start space-x-2.5 ${
                    isSelected
                      ? `${cat.bgColor} ${cat.borderColor} text-stone-100 ring-1 ring-amber-500/40`
                      : 'bg-stone-950/60 border-stone-800/80 text-stone-300 hover:bg-stone-800/90 hover:border-stone-700'
                  }`}
                >
                  <div className={`p-1.5 rounded-[4px] bg-stone-900 border border-stone-800 shrink-0 mt-0.5 ${cat.textColor}`}>
                    {renderIcon(cat.iconName, 'w-4 h-4')}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold font-mono text-stone-100 flex items-center space-x-1.5">
                        <span className={`text-[10px] font-bold px-1 py-0.2 rounded uppercase border ${cat.bgColor} ${cat.textColor} ${cat.borderColor}`}>
                          {cat.badgeLabel}
                        </span>
                        <span>{cat.label}</span>
                      </span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-amber-400 shrink-0 ml-1" />}
                    </div>
                    <p className="text-[11px] text-stone-400 mt-0.5 leading-tight">
                      {cat.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
