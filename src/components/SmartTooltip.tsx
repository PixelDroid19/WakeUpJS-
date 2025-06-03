import React, { useState, useRef, useEffect, useCallback, memo, useMemo, ReactNode } from 'react';
import { createPortal } from 'react-dom';

type TooltipPosition = 'top' | 'bottom' | 'left' | 'right' | 'auto';
type TooltipTrigger = 'hover' | 'focus' | 'click' | 'manual';

interface TooltipStyleConfig {
  offset: number;
  constrainToViewport: boolean;
  enableAutoFlip: boolean;
  maxWidth: number;
  zIndex: number;
}

interface SmartTooltipProps {
  children: ReactNode;
  content: ReactNode;
  position?: TooltipPosition;
  trigger?: TooltipTrigger;
  disabled?: boolean;
  delay?: number;
  hideDelay?: number;
  className?: string;
  contentClassName?: string;
  arrow?: boolean;
  interactive?: boolean;
  portal?: boolean;
  portalContainer?: HTMLElement;
  followCursor?: boolean;
  style?: Partial<TooltipStyleConfig>;
  role?: string;
  'aria-label'?: string;
  'aria-describedby'?: string;
  isOpen?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
  onShow?: () => void;
  onHide?: () => void;
  animation?: 'fade' | 'scale' | 'slide' | 'none';
  theme?: 'dark' | 'light' | 'auto';
}

// Hook personalizado para posicionamiento inteligente de tooltips
const useTooltipPositioning = (
  triggerRef: React.RefObject<HTMLElement>,
  tooltipRef: React.RefObject<HTMLElement>,
  position: TooltipPosition = 'top',
  config: TooltipStyleConfig,
  followCursor: boolean = false,
  mousePosition?: { x: number; y: number }
) => {
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({
    position: 'fixed',
    opacity: 0,
    pointerEvents: 'none',
    zIndex: config.zIndex,
  });
  const [actualPosition, setActualPosition] = useState<TooltipPosition>(position);

  const calculatePosition = useCallback(() => {
    if (!triggerRef.current || !tooltipRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight,
      scrollX: window.scrollX,
      scrollY: window.scrollY,
    };

    let top = 0;
    let left = 0;
    let calculatedPosition = position;

    // Si followCursor está habilitado y tenemos posición del mouse
    if (followCursor && mousePosition) {
      top = mousePosition.y - tooltipRect.height - config.offset;
      left = mousePosition.x - tooltipRect.width / 2;
      calculatedPosition = 'top';
    } else {
      // Auto position detection
      if (position === 'auto') {
        const spaceMap = {
          bottom: viewport.height - triggerRect.bottom,
          top: triggerRect.top,
          right: viewport.width - triggerRect.right,
          left: triggerRect.left
        };

        // Encontrar la posición con más espacio
        const optimalPosition = Object.entries(spaceMap).reduce((best, [pos, space]) => 
          space > best.space ? { position: pos as TooltipPosition, space } : best
        , { position: 'bottom' as TooltipPosition, space: 0 });

        calculatedPosition = optimalPosition.position;
      }

      // Calculate initial position
      switch (calculatedPosition) {
        case 'top':
          top = triggerRect.top - tooltipRect.height - config.offset;
          left = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2;
          break;
        case 'bottom':
          top = triggerRect.bottom + config.offset;
          left = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2;
          break;
        case 'left':
          top = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2;
          left = triggerRect.left - tooltipRect.width - config.offset;
          break;
        case 'right':
          top = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2;
          left = triggerRect.right + config.offset;
          break;
      }
    }

    // Constrain to viewport
    if (config.constrainToViewport) {
      // Horizontal constraints
      if (left < config.offset) {
        left = config.offset;
      } else if (left + tooltipRect.width > viewport.width - config.offset) {
        left = viewport.width - tooltipRect.width - config.offset;
      }

      // Vertical constraints with auto-flip
      if (top < config.offset && config.enableAutoFlip && calculatedPosition === 'top') {
        top = triggerRect.bottom + config.offset;
        calculatedPosition = 'bottom';
      } else if (top + tooltipRect.height > viewport.height - config.offset && config.enableAutoFlip && calculatedPosition === 'bottom') {
        top = triggerRect.top - tooltipRect.height - config.offset;
        calculatedPosition = 'top';
      } else if (top < config.offset) {
        top = config.offset;
      } else if (top + tooltipRect.height > viewport.height - config.offset) {
        top = viewport.height - tooltipRect.height - config.offset;
      }
    }

    setActualPosition(calculatedPosition);
    setTooltipStyle({
      position: 'fixed',
      top: `${Math.max(0, top)}px`,
      left: `${Math.max(0, left)}px`,
      zIndex: config.zIndex,
      opacity: 1,
      pointerEvents: 'auto',
      maxWidth: `${config.maxWidth}px`,
      transition: 'opacity 200ms ease-out, transform 200ms ease-out',
    });
  }, [triggerRef, tooltipRef, position, config, followCursor, mousePosition]);

  return { tooltipStyle, calculatePosition, actualPosition };
};

// Hook para manejar eventos de mouse
const useMouseTracking = (enabled: boolean) => {
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (enabled) {
      setMousePosition({ x: e.clientX, y: e.clientY });
    }
  }, [enabled]);

  useEffect(() => {
    if (enabled) {
      document.addEventListener('mousemove', handleMouseMove);
      return () => document.removeEventListener('mousemove', handleMouseMove);
    }
  }, [enabled, handleMouseMove]);

  return mousePosition;
};

export const SmartTooltip = memo<SmartTooltipProps>(({
  children,
  content,
  position = 'top',
  trigger = 'hover',
  disabled = false,
  delay = 300,
  hideDelay = 100,
  className = '',
  contentClassName = '',
  arrow = true,
  interactive = false,
  portal = true,
  portalContainer,
  followCursor = false,
  style,
  role = 'tooltip',
  'aria-label': ariaLabel,
  'aria-describedby': ariaDescribedBy,
  isOpen: controlledIsOpen,
  onOpenChange,
  onShow,
  onHide,
  animation = 'fade',
  theme = 'dark'
}) => {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const showTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Estado controlado o interno
  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;

  // Configuración de estilo
  const config = useMemo<TooltipStyleConfig>(() => ({
    offset: 8,
    constrainToViewport: true,
    enableAutoFlip: true,
    maxWidth: 320,
    zIndex: 9999,
    ...style
  }), [style]);

  // Tracking del mouse para followCursor
  const mousePosition = useMouseTracking(followCursor && isOpen);

  const { tooltipStyle, calculatePosition, actualPosition } = useTooltipPositioning(
    triggerRef,
    tooltipRef,
    position,
    config,
    followCursor,
    mousePosition
  );

  // Manejar cambios de estado
  const handleIsOpenChange = useCallback((newIsOpen: boolean) => {
    if (controlledIsOpen === undefined) {
      setInternalIsOpen(newIsOpen);
    }
    onOpenChange?.(newIsOpen);
  }, [controlledIsOpen, onOpenChange]);

  // Funciones para mostrar/ocultar
  const showTooltip = useCallback(() => {
    if (disabled) return;
    
    clearTimeouts();
    showTimeoutRef.current = setTimeout(() => {
      handleIsOpenChange(true);
      onShow?.();
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          calculatePosition();
        });
      });
    }, delay);
  }, [disabled, delay, handleIsOpenChange, onShow, calculatePosition]);

  const hideTooltip = useCallback(() => {
    clearTimeouts();
    hideTimeoutRef.current = setTimeout(() => {
      handleIsOpenChange(false);
      onHide?.();
    }, hideDelay);
  }, [hideDelay, handleIsOpenChange, onHide]);

  const clearTimeouts = useCallback(() => {
    if (showTimeoutRef.current) {
      clearTimeout(showTimeoutRef.current);
      showTimeoutRef.current = null;
    }
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
  }, []);

  // Event handlers
  const handleTriggerMouseEnter = useCallback(() => {
    if (trigger === 'hover') {
      showTooltip();
    }
  }, [trigger, showTooltip]);

  const handleTriggerMouseLeave = useCallback(() => {
    if (trigger === 'hover' && !interactive) {
      hideTooltip();
    }
  }, [trigger, interactive, hideTooltip]);

  const handleTriggerClick = useCallback((e: React.MouseEvent) => {
    if (trigger === 'click') {
      e.preventDefault();
      isOpen ? hideTooltip() : showTooltip();
    }
  }, [trigger, isOpen, hideTooltip, showTooltip]);

  const handleTriggerFocus = useCallback(() => {
    if (trigger === 'focus') {
      showTooltip();
    }
  }, [trigger, showTooltip]);

  const handleTriggerBlur = useCallback(() => {
    if (trigger === 'focus') {
      hideTooltip();
    }
  }, [trigger, hideTooltip]);

  const handleTooltipMouseEnter = useCallback(() => {
    if (interactive && trigger === 'hover') {
      clearTimeouts();
    }
  }, [interactive, trigger, clearTimeouts]);

  const handleTooltipMouseLeave = useCallback(() => {
    if (interactive && trigger === 'hover') {
      hideTooltip();
    }
  }, [interactive, trigger, hideTooltip]);

  // Recalcular posición en cambios
  useEffect(() => {
    if (isOpen) {
      calculatePosition();
    }
  }, [isOpen, calculatePosition]);

  // Manejar resize y scroll
  useEffect(() => {
    if (!isOpen) return;

    const handleResize = () => calculatePosition();
    const handleScroll = () => calculatePosition();

    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleScroll, true);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [isOpen, calculatePosition]);

  // Limpiar timeouts
  useEffect(() => {
    return clearTimeouts;
  }, [clearTimeouts]);

  // Clases de tema
  const themeClasses = useMemo(() => {
    const themes = {
      dark: {
        bg: 'bg-gray-800',
        text: 'text-white',
        border: 'border-gray-600',
        arrow: 'border-gray-800'
      },
      light: {
        bg: 'bg-white',
        text: 'text-gray-900',
        border: 'border-gray-300',
        arrow: 'border-white'
      },
      auto: typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
        ? {
            bg: 'bg-gray-800',
            text: 'text-white',
            border: 'border-gray-600',
            arrow: 'border-gray-800'
          }
        : {
            bg: 'bg-white',
            text: 'text-gray-900',
            border: 'border-gray-300',
            arrow: 'border-white'
          }
    };
    return themes[theme];
  }, [theme]);

  // Clases de animación
  const animationClasses = useMemo(() => {
    const animations = {
      fade: isOpen ? 'opacity-100' : 'opacity-0',
      scale: isOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95',
      slide: isOpen 
        ? 'opacity-100 translate-y-0' 
        : `opacity-0 ${actualPosition === 'top' ? 'translate-y-1' : actualPosition === 'bottom' ? '-translate-y-1' : 'translate-x-1'}`,
      none: isOpen ? 'opacity-100' : 'opacity-0'
    };
    return animations[animation];
  }, [animation, isOpen, actualPosition]);

  // Función para obtener clases de flecha
  const getArrowClass = useCallback(() => {
    const baseArrow = `absolute w-0 h-0 ${themeClasses.arrow}`;
    const arrowClasses: Record<Exclude<TooltipPosition, 'auto'>, string> = {
      top: `${baseArrow} top-full left-1/2 transform -translate-x-1/2 border-t-4 border-x-transparent border-x-4 border-b-0`,
      bottom: `${baseArrow} bottom-full left-1/2 transform -translate-x-1/2 border-b-4 border-x-transparent border-x-4 border-t-0`,
      left: `${baseArrow} left-full top-1/2 transform -translate-y-1/2 border-l-4 border-y-transparent border-y-4 border-r-0`,
      right: `${baseArrow} right-full top-1/2 transform -translate-y-1/2 border-r-4 border-y-transparent border-y-4 border-l-0`
    };
    return arrowClasses[actualPosition as Exclude<TooltipPosition, 'auto'>] || arrowClasses.top;
  }, [actualPosition, themeClasses.arrow]);

  const tooltipContent = (
    <div
      ref={tooltipRef}
      style={tooltipStyle}
      className={`
        ${themeClasses.bg} ${themeClasses.text} ${themeClasses.border}
        text-sm rounded-lg px-3 py-2 shadow-xl border backdrop-blur-sm
        transition-all duration-200 ease-out break-words
        ${animationClasses}
        ${interactive ? 'pointer-events-auto' : 'pointer-events-none'}
        ${contentClassName}
      `}
      onMouseEnter={handleTooltipMouseEnter}
      onMouseLeave={handleTooltipMouseLeave}
      role={role}
      aria-hidden={!isOpen}
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedBy}
      data-position={actualPosition}
    >
      {content}
      {arrow && (
        <div className={getArrowClass()} />
      )}
    </div>
  );

  return (
    <>
      <div
        ref={triggerRef}
        className={`inline-block ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
        onMouseEnter={handleTriggerMouseEnter}
        onMouseLeave={handleTriggerMouseLeave}
        onClick={handleTriggerClick}
        onFocus={handleTriggerFocus}
        onBlur={handleTriggerBlur}
        tabIndex={disabled ? -1 : 0}
        aria-describedby={isOpen ? `tooltip-${Date.now()}` : undefined}
      >
        {children}
      </div>

      {isOpen && !disabled && (
        portal ? (
          createPortal(tooltipContent, portalContainer || document.body)
        ) : (
          tooltipContent
        )
      )}
    </>
  );
});

SmartTooltip.displayName = 'SmartTooltip';

// Componente simplificado para casos básicos
export const Tooltip = memo<Omit<SmartTooltipProps, 'content'> & { text: string }>(({ 
  children, 
  text, 
  ...props 
}) => {
  return (
    <SmartTooltip content={text} {...props}>
      {children}
    </SmartTooltip>
  );
});

Tooltip.displayName = 'Tooltip';

// Hook para controlar tooltip programáticamente
export const useTooltipControl = () => {
  const [isOpen, setIsOpen] = useState(false);
  
  const show = useCallback(() => setIsOpen(true), []);
  const hide = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen(prev => !prev), []);

  const handlers = useMemo(() => ({
    isOpen,
    show,
    hide,
    toggle,
    setIsOpen
  }), [isOpen, show, hide, toggle]);

  return handlers;
};

// Hook para tooltip con delay personalizable
export const useDelayedTooltip = (delay: number = 300, hideDelay: number = 100) => {
  const [isOpen, setIsOpen] = useState(false);
  const showTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const show = useCallback(() => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
    showTimeoutRef.current = setTimeout(() => {
      setIsOpen(true);
    }, delay);
  }, [delay]);

  const hide = useCallback(() => {
    if (showTimeoutRef.current) {
      clearTimeout(showTimeoutRef.current);
      showTimeoutRef.current = null;
    }
    hideTimeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, hideDelay);
  }, [hideDelay]);

  const clearTimeouts = useCallback(() => {
    if (showTimeoutRef.current) {
      clearTimeout(showTimeoutRef.current);
      showTimeoutRef.current = null;
    }
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    return clearTimeouts;
  }, [clearTimeouts]);

  return {
    isOpen,
    show,
    hide,
    clearTimeouts,
    handlers: {
      onMouseEnter: show,
      onMouseLeave: hide,
      onFocus: show,
      onBlur: hide
    }
  };
}; 