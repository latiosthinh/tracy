import React, { InputHTMLAttributes, TextareaHTMLAttributes } from 'react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', label, error, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && <label className="block text-xs font-bold text-stone-400 mb-1">{label}</label>}
        <input
          ref={ref}
          className={`w-full bg-stone-900 border ${error ? 'border-rose-500' : 'border-stone-700 focus:border-amber-500'} rounded-[6px] px-3 py-1.5 text-stone-200 text-xs focus:outline-none transition-colors ${className}`}
          {...props}
        />
        {error && <span className="text-[10px] text-rose-500 mt-1 block">{error}</span>}
      </div>
    );
  }
);
Input.displayName = 'Input';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className = '', label, error, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && <label className="block text-xs font-bold text-stone-400 mb-1">{label}</label>}
        <textarea
          ref={ref}
          className={`w-full bg-stone-900 border ${error ? 'border-rose-500' : 'border-stone-700 focus:border-amber-500'} rounded-[6px] px-3 py-2 text-stone-200 text-xs focus:outline-none transition-colors ${className}`}
          {...props}
        />
        {error && <span className="text-[10px] text-rose-500 mt-1 block">{error}</span>}
      </div>
    );
  }
);
Textarea.displayName = 'Textarea';
