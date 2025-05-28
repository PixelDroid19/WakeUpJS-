import React, { ReactNode } from 'react';

export interface MenuItem {
  label?: string;
  icon?: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: 'separator';
}

export interface ContextMenuProps {
  isOpen: boolean;
  x: number;
  y: number;
  items: MenuItem[];
  onClose: () => void;
}

export function ContextMenu({ isOpen, x, y, items, onClose }: ContextMenuProps) {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed z-50 bg-gray-800 border border-gray-600 rounded-lg shadow-xl py-1 min-w-48 max-w-xs animate-scaleIn"
      style={{ 
        left: `${x}px`, 
        top: `${y}px`,
        transformOrigin: 'top left',
      }}
      onClick={e => e.stopPropagation()}
    >
      {items.map((item, index) => {
        if (item.type === 'separator') {
          return <div key={index} className="h-px bg-gray-600 my-1" />;
        }
        
        return (
          <button
            key={index}
            className={`
              w-full px-4 py-2 text-left flex items-center gap-2 text-sm
              ${item.disabled 
                ? 'text-gray-500 cursor-not-allowed' 
                : 'text-white hover:bg-gray-700 active:bg-gray-600'}
            `}
            onClick={() => {
              if (!item.disabled && item.onClick) {
                item.onClick();
                onClose();
              }
            }}
            disabled={item.disabled}
          >
            {item.icon && <span className="w-4 h-4 flex-shrink-0">{item.icon}</span>}
            <span>{item.label}</span>
          </button>
        );
      })}
    </div>
  );
} 