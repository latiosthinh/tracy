import React, { ReactNode } from 'react';
import { X } from 'lucide-react';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string | ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  maxWidth?: string;
  icon?: ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  footer,
  maxWidth = 'max-w-2xl',
  icon
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 font-sans text-xs">
      <div className={`bg-stone-900 border border-stone-700 rounded-lg shadow-2xl w-full ${maxWidth} flex flex-col max-h-[85vh]`}>
        
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-stone-800 shrink-0">
          <div className="flex items-center space-x-2">
            {icon && icon}
            <h2 className="font-bold text-stone-200 text-sm">{title}</h2>
          </div>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-200 focus:outline-none">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="flex justify-end space-x-2 px-4 py-3 border-t border-stone-800 shrink-0 bg-stone-950">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
