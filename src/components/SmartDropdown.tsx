import React, { useState, useRef, useEffect, useCallback, memo, useMemo, ReactNode } from 'react';
import { createPortal } from 'react-dom';

// Tipos más específicos y robustos
type Position = 'top' | 'bottom' | 'left' | 'right' | 'auto';
type Trigger = 'click' | 'hover' | 'focus' | 'manual';

interface DropdownStyleConfig {
  position: Position;
  zIndex: number;
  offset: number;
  constrainToViewport: boolean;
  enableAutoFlip: boolean;
}

interface SmartDropdownProps {
  children: ReactNode;
  content: ReactNode;
  position?: Position;
  disabled?: boolean;
  className?: string;
  contentClassName?: string;
  trigger?: Trigger;
  closeOnClickOutside?: boolean;
  closeOnEscape?: boolean;
  closeOnScroll?: boolean;
  isOpen?: boolean; // Para control externo
  onOpenChange?: (isOpen: boolean) => void;
  onOpen?: () => void;
  onClose?: () => void;
  hoverDelay?: number;
  hoverCloseDelay?: number;
  style?: DropdownStyleConfig;
  portal?: boolean;
  portalContainer?: HTMLElement;
  preventOverflow?: boolean;
  matchTriggerWidth?: boolean;
  role?: string;
  'aria-label'?: string;
  'aria-describedby'?: string;
}

// Hook personalizado para manejo del posicionamiento
const useSmartPositioning = (
  triggerRef: React.RefObject<HTMLElement>,
  dropdownRef: React.RefObject<HTMLElement>,
  position: Position = 'bottom',
  offset: number = 8,
  constrainToViewport: boolean = true,
  enableAutoFlip: boolean = true
) => {
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({
    position: 'fixed',
    opacity: 0,
    pointerEvents: 'none',
    zIndex: 1000,
  });

  const calculatePosition = useCallback(() => {
    if (!triggerRef.current || !dropdownRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const dropdownRect = dropdownRef.current.getBoundingClientRect();
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight,
      scrollX: window.scrollX,
      scrollY: window.scrollY,
    };

    let top = 0;
    let left = 0;
    let actualPosition = position;

    // Auto position detection
    if (position === 'auto') {
      const spaceBelow = viewport.height - triggerRect.bottom;
      const spaceAbove = triggerRect.top;
      const spaceRight = viewport.width - triggerRect.right;
      const spaceLeft = triggerRect.left;

      if (spaceBelow >= dropdownRect.height) {
        actualPosition = 'bottom';
      } else if (spaceAbove >= dropdownRect.height) {
        actualPosition = 'top';
      } else if (spaceRight >= dropdownRect.width) {
        actualPosition = 'right';
      } else if (spaceLeft >= dropdownRect.width) {
        actualPosition = 'left';
      } else {
        actualPosition = 'bottom'; // fallback
      }
    }

    // Calculate initial position
    switch (actualPosition) {
      case 'top':
        top = triggerRect.top - dropdownRect.height - offset;
        left = triggerRect.left + (triggerRect.width - dropdownRect.width) / 2;
        break;
      case 'bottom':
        top = triggerRect.bottom + offset;
        left = triggerRect.left + (triggerRect.width - dropdownRect.width) / 2;
        break;
      case 'left':
        top = triggerRect.top + (triggerRect.height - dropdownRect.height) / 2;
        left = triggerRect.left - dropdownRect.width - offset;
        break;
      case 'right':
        top = triggerRect.top + (triggerRect.height - dropdownRect.height) / 2;
        left = triggerRect.right + offset;
        break;
    }

    // Constrain to viewport
    if (constrainToViewport) {
      // Horizontal constraints
      if (left < offset) {
        left = offset;
      } else if (left + dropdownRect.width > viewport.width - offset) {
        left = viewport.width - dropdownRect.width - offset;
      }

      // Vertical constraints with auto-flip
      if (top < offset && enableAutoFlip && actualPosition === 'top') {
        top = triggerRect.bottom + offset;
        actualPosition = 'bottom';
      } else if (top + dropdownRect.height > viewport.height - offset && enableAutoFlip && actualPosition === 'bottom') {
        top = triggerRect.top - dropdownRect.height - offset;
        actualPosition = 'top';
      } else if (top < offset) {
        top = offset;
      } else if (top + dropdownRect.height > viewport.height - offset) {
        top = viewport.height - dropdownRect.height - offset;
      }
    }

    setDropdownStyle({
      position: 'fixed',
      top: `${Math.max(0, top)}px`,
      left: `${Math.max(0, left)}px`,
      zIndex: 1000,
      opacity: 1,
      pointerEvents: 'auto',
      transform: 'scale(1)',
      transition: 'opacity 200ms ease-out, transform 200ms ease-out',
    });
  }, [triggerRef, dropdownRef, position, offset, constrainToViewport, enableAutoFlip]);

  return { dropdownStyle, calculatePosition };
};

export const SmartDropdown = memo<SmartDropdownProps>(({
  children,
  content,
  position = 'bottom',
  disabled = false,
  className = '',
  contentClassName = '',
  trigger = 'click',
  closeOnClickOutside = true,
  closeOnEscape = true,
  closeOnScroll = false,
  isOpen: controlledIsOpen,
  onOpenChange,
  onOpen,
  onClose,
  hoverDelay = 150,
  hoverCloseDelay = 150,
  style,
  portal = true,
  portalContainer,
  preventOverflow = true,
  matchTriggerWidth = false,
  role = 'menu',
  'aria-label': ariaLabel,
  'aria-describedby': ariaDescribedBy,
}) => {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Usar isOpen controlado o interno
  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;

  const { dropdownStyle, calculatePosition } = useSmartPositioning(
    triggerRef,
    dropdownRef,
    position,
    style?.offset ?? 8,
    style?.constrainToViewport ?? true,
    style?.enableAutoFlip ?? true
  );

  const handleIsOpenChange = useCallback((newIsOpen: boolean) => {
    if (controlledIsOpen === undefined) {
      setInternalIsOpen(newIsOpen);
    }
    onOpenChange?.(newIsOpen);
  }, [controlledIsOpen, onOpenChange]);

  const openDropdown = useCallback(() => {
    if (disabled) return;
    handleIsOpenChange(true);
    onOpen?.();
    
    // Calcular posición con un pequeño delay para asegurar el renderizado
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        calculatePosition();
      });
    });
  }, [disabled, handleIsOpenChange, onOpen, calculatePosition]);

  const closeDropdown = useCallback(() => {
    handleIsOpenChange(false);
    onClose?.();
  }, [handleIsOpenChange, onClose]);

  const toggleDropdown = useCallback(() => {
    isOpen ? closeDropdown() : openDropdown();
  }, [isOpen, closeDropdown, openDropdown]);

  // Limpiar timeouts
  const clearTimeouts = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  }, []);

  // Event handlers
  const handleTriggerClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (trigger === 'click') {
      toggleDropdown();
    }
  }, [trigger, toggleDropdown]);

  const handleTriggerMouseEnter = useCallback(() => {
    if (trigger === 'hover') {
      clearTimeouts();
      hoverTimeoutRef.current = setTimeout(openDropdown, hoverDelay);
    }
  }, [trigger, clearTimeouts, openDropdown, hoverDelay]);

  const handleTriggerMouseLeave = useCallback(() => {
    if (trigger === 'hover') {
      clearTimeouts();
      closeTimeoutRef.current = setTimeout(closeDropdown, hoverCloseDelay);
    }
  }, [trigger, clearTimeouts, closeDropdown, hoverCloseDelay]);

  const handleDropdownMouseEnter = useCallback(() => {
    if (trigger === 'hover') {
      clearTimeouts();
    }
  }, [trigger, clearTimeouts]);

  const handleDropdownMouseLeave = useCallback(() => {
    if (trigger === 'hover') {
      clearTimeouts();
      closeTimeoutRef.current = setTimeout(closeDropdown, hoverCloseDelay);
    }
  }, [trigger, clearTimeouts, closeDropdown, hoverCloseDelay]);

  const handleTriggerFocus = useCallback(() => {
    if (trigger === 'focus') {
      openDropdown();
    }
  }, [trigger, openDropdown]);

  const handleTriggerBlur = useCallback((e: React.FocusEvent) => {
    if (trigger === 'focus' && !dropdownRef.current?.contains(e.relatedTarget as Node)) {
      closeDropdown();
    }
  }, [trigger, closeDropdown]);

  // Click outside handler
  useEffect(() => {
    if (!isOpen || !closeOnClickOutside) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        triggerRef.current &&
        dropdownRef.current &&
        !triggerRef.current.contains(target) &&
        !dropdownRef.current.contains(target)
      ) {
        closeDropdown();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, closeOnClickOutside, closeDropdown]);

  // Escape key handler
  useEffect(() => {
    if (!isOpen || !closeOnEscape) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeDropdown();
        triggerRef.current?.focus();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, closeOnEscape, closeDropdown]);

  // Scroll handler
  useEffect(() => {
    if (!isOpen) return;

    const handleScroll = () => {
      if (closeOnScroll) {
        closeDropdown();
      } else {
        calculatePosition();
      }
    };

    const handleResize = () => calculatePosition();

    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleResize);
    };
  }, [isOpen, closeOnScroll, closeDropdown, calculatePosition]);

  // Cleanup timeouts
  useEffect(() => {
    return clearTimeouts;
  }, [clearTimeouts]);

  // Recalcular posición cuando se abre
  useEffect(() => {
    if (isOpen) {
      calculatePosition();
    }
  }, [isOpen, calculatePosition]);

  // Calcular estilos dinámicos
  const computedDropdownStyle = useMemo(() => {
    const baseStyle = { ...dropdownStyle };
    
    if (matchTriggerWidth && triggerRef.current) {
      baseStyle.width = `${triggerRef.current.getBoundingClientRect().width}px`;
    }
    
    if (style?.zIndex) {
      baseStyle.zIndex = style.zIndex;
    }
    
    return baseStyle;
  }, [dropdownStyle, matchTriggerWidth, style?.zIndex]);

  const dropdownContent = (
    <div
      ref={dropdownRef}
      style={computedDropdownStyle}
      className={`
        bg-gray-800 border border-gray-600 rounded-lg shadow-xl
        backdrop-blur-sm transition-all duration-200 ease-out
        min-w-[160px] py-1 animate-in slide-in-from-top-2
        ${contentClassName}
      `}
      onMouseEnter={handleDropdownMouseEnter}
      onMouseLeave={handleDropdownMouseLeave}
      role={role}
      aria-expanded={isOpen}
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedBy}
      tabIndex={-1}
    >
      {content}
    </div>
  );

  return (
    <>
      <div
        ref={triggerRef}
        className={`inline-block ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${className}`}
        onClick={handleTriggerClick}
        onMouseEnter={handleTriggerMouseEnter}
        onMouseLeave={handleTriggerMouseLeave}
        onFocus={handleTriggerFocus}
        onBlur={handleTriggerBlur}
        tabIndex={disabled ? -1 : 0}
        role="button"
        aria-haspopup={role === 'menu' ? 'menu' : 'listbox'}
        aria-expanded={isOpen}
        aria-disabled={disabled}
      >
        {children}
      </div>

      {isOpen && !disabled && (
        portal ? (
          createPortal(dropdownContent, portalContainer || document.body)
        ) : (
          dropdownContent
        )
      )}
    </>
  );
});

SmartDropdown.displayName = 'SmartDropdown';

// Componente específico para menús de contexto mejorado
interface ContextMenuItem {
  id: string;
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  separator?: boolean;
  shortcut?: string;
  danger?: boolean;
  submenu?: ContextMenuItem[];
}

interface ContextMenuProps extends Omit<SmartDropdownProps, 'content'> {
  items: ContextMenuItem[];
  onItemClick?: (item: ContextMenuItem) => void;
}

export const ContextMenu = memo<ContextMenuProps>(({
  children,
  items,
  onItemClick,
  ...props
}) => {
  const handleItemClick = useCallback((item: ContextMenuItem) => {
    if (!item.disabled) {
      item.onClick();
      onItemClick?.(item);
    }
  }, [onItemClick]);

  const content = (
    <div className="py-1 min-w-[200px]">
      {items.map((item, index) => (
        <React.Fragment key={item.id}>
          {item.separator && index > 0 && (
            <div className="border-t border-gray-600 my-1" />
          )}
          <button
            onClick={() => handleItemClick(item)}
            disabled={item.disabled}
            className={`
              w-full text-left px-4 py-2.5 text-sm flex items-center justify-between gap-3
              transition-all duration-150 group
              ${item.disabled 
                ? 'text-gray-500 cursor-not-allowed opacity-50' 
                : `text-gray-200 hover:bg-gray-700 hover:text-white ${
                    item.danger ? 'hover:bg-red-600/20 hover:text-red-300' : ''
                  }`
              }
            `}
            role="menuitem"
            tabIndex={item.disabled ? -1 : 0}
          >
            <div className="flex items-center gap-3 flex-1">
              {item.icon && (
                <span className={`w-4 h-4 flex items-center justify-center transition-colors ${
                  item.danger && !item.disabled ? 'group-hover:text-red-400' : ''
                }`}>
                  {item.icon}
                </span>
              )}
              <span className="flex-1">{item.label}</span>
            </div>
            {item.shortcut && (
              <span className="text-xs text-gray-500 font-mono">
                {item.shortcut}
              </span>
            )}
          </button>
        </React.Fragment>
      ))}
    </div>
  );

  return (
    <SmartDropdown content={content} role="menu" {...props}>
      {children}
    </SmartDropdown>
  );
});

ContextMenu.displayName = 'ContextMenu';

// Hook mejorado para controlar dropdown programáticamente
export const useDropdownControl = () => {
  const [isOpen, setIsOpen] = useState(false);
  
  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen(prev => !prev), []);

  const handlers = useMemo(() => ({
    isOpen,
    open,
    close,
    toggle,
    setIsOpen
  }), [isOpen, open, close, toggle]);

  return handlers;
};

// Hook para dropdown anidados
export const useNestedDropdown = (parentCloseHandler?: () => void) => {
  const control = useDropdownControl();
  
  const closeWithParent = useCallback(() => {
    control.close();
    parentCloseHandler?.();
  }, [control, parentCloseHandler]);

  return {
    ...control,
    closeWithParent
  };
}; 