import React from 'react';
import { LucideIcon } from 'lucide-react';
import { useTranslation } from '@/src/hooks/useTranslation';

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: LucideIcon;
  titleKey: string;
  iconClassName?: string;
  placement?: 'top' | 'bottom';
}

export const IconButton: React.FC<IconButtonProps> = ({ 
  icon: Icon, 
  titleKey, 
  className, 
  iconClassName,
  placement = 'top',
  children,
  ...props 
}) => {
  const { t } = useTranslation();
  const label = t(titleKey);

  const placementClasses = placement === 'top'
    ? 'bottom-full mb-2 left-1/2 -translate-x-1/2'
    : 'top-full mt-2 left-1/2 -translate-x-1/2';

  return (
    <div className="relative flex flex-col items-center group">
      <button
        type="button"
        title={label}
        className={`focus:outline-hidden ${className || ''}`}
        {...props}
      >
        {children ? children : Icon && <Icon className={iconClassName || "w-4 h-4"} />}
      </button>
      
      {/* Floating Tooltip with Highest Z-Index (Pops UP by default to avoid native browser view clipping) */}
      <div
        className={`absolute ${placementClasses} z-[99999] opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-150 pointer-events-none px-2.5 py-1 bg-stone-900 border border-stone-700 text-stone-200 text-[10px] font-bold rounded-md shadow-2xl whitespace-nowrap`}
      >
        {label}
        {/* Subtle arrow pointer */}
        <div
          className={`absolute left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-stone-900 border-stone-700 rotate-45 ${
            placement === 'top'
              ? 'top-full -mt-1 border-r border-b'
              : 'bottom-full -mb-1 border-l border-t'
          }`}
        />
      </div>
    </div>
  );
};
