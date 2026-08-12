import React, { ButtonHTMLAttributes } from 'react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'icon';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'primary', size = 'md', isLoading, children, disabled, ...props }, ref) => {
    let baseStyles = 'inline-flex items-center justify-center font-bold transition-all focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed';
    
    let variantStyles = '';
    switch (variant) {
      case 'primary':
        variantStyles = 'bg-amber-600 hover:bg-amber-500 text-amber-50 border border-amber-600 shadow-sm';
        break;
      case 'secondary':
        variantStyles = 'bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700';
        break;
      case 'ghost':
        variantStyles = 'bg-transparent hover:bg-stone-800 text-stone-400 hover:text-stone-200';
        break;
      case 'danger':
        variantStyles = 'bg-rose-900/60 hover:bg-rose-800 text-rose-300 border border-rose-700/60';
        break;
      case 'icon':
        variantStyles = 'p-1.5 text-stone-400 hover:text-stone-200 bg-transparent hover:bg-stone-800 rounded transition-colors';
        break;
    }

    let sizeStyles = '';
    if (variant !== 'icon') {
      switch (size) {
        case 'sm':
          sizeStyles = 'px-2.5 py-1 text-[10px] rounded-[4px]';
          break;
        case 'md':
          sizeStyles = 'px-3 py-1.5 text-xs rounded-[6px]';
          break;
        case 'lg':
          sizeStyles = 'px-4 py-2 text-sm rounded-lg';
          break;
      }
    }

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`${baseStyles} ${variantStyles} ${sizeStyles} ${className}`}
        {...props}
      >
        {isLoading ? (
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        ) : null}
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';
