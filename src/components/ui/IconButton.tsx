import React from 'react';
import { LucideIcon } from 'lucide-react';
import { useTranslation } from '@/src/hooks/useTranslation';

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: LucideIcon;
  titleKey: string;
  iconClassName?: string;
}

export const IconButton: React.FC<IconButtonProps> = ({ 
  icon: Icon, 
  titleKey, 
  className, 
  iconClassName,
  children,
  ...props 
}) => {
  const { t } = useTranslation();

  return (
    <div className="relative flex flex-col items-center group">
      <button
        type="button"
        className={`focus:outline-hidden ${className || ''}`}
        {...props}
      >
        {children ? children : Icon && <Icon className={iconClassName || "w-4 h-4"} />}
      </button>
      
      {/* Tooltip */}
      <div className="absolute top-full mt-1.5 left-1/2 -translate-x-1/2 z-[100] opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity pointer-events-none px-2.5 py-1 bg-stone-800 border border-stone-700 text-stone-200 text-[10px] font-bold rounded-md shadow-lg whitespace-nowrap">
        {t(titleKey)}
      </div>
    </div>
  );
};
