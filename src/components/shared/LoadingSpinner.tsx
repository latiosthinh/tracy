import React from 'react';
import { useTranslation } from '@/src/hooks/useTranslation';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  label?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ size = 'md', label }) => {
  const { t } = useTranslation();
  const displayLabel = label || t('common.loading');
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-6 h-6 border-2',
    lg: 'w-8 h-8 border-3',
  };

  return (
    <div
      role="status"
      aria-label={displayLabel}
      className="flex flex-col items-center justify-center space-y-2 p-4"
    >
      <div
        className={`${sizeClasses[size]} border-stone-700 border-t-amber-400 rounded-full animate-spin`}
      />
      {label && <span className="text-xs font-mono text-stone-400">{label}</span>}
    </div>
  );
};
