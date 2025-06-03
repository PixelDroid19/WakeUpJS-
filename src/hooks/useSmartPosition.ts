import { useState, useEffect, useCallback, RefObject } from 'react';

export type Position = 'top' | 'bottom' | 'left' | 'right';
export type Alignment = 'start' | 'center' | 'end';

interface SmartPositionOptions {
  preferredPosition?: Position;
  preferredAlignment?: Alignment;
  offset?: number;
  padding?: number;
  boundary?: 'viewport' | 'scrollParent';
}

interface PositionResult {
  position: Position;
  alignment: Alignment;
  style: React.CSSProperties;
  isVisible: boolean;
}

export function useSmartPosition(
  triggerRef: RefObject<HTMLElement>,
  contentRef: RefObject<HTMLElement>,
  options: SmartPositionOptions = {}
): PositionResult {
  const {
    preferredPosition = 'bottom',
    preferredAlignment = 'center',
    offset = 8,
    padding = 16,
    boundary = 'viewport'
  } = options;

  const [position, setPosition] = useState<PositionResult>({
    position: preferredPosition,
    alignment: preferredAlignment,
    style: {},
    isVisible: false
  });

  const calculatePosition = useCallback(() => {
    if (!triggerRef.current || !contentRef.current) {
      return {
        position: preferredPosition,
        alignment: preferredAlignment,
        style: {},
        isVisible: false
      };
    }

    const trigger = triggerRef.current.getBoundingClientRect();
    const content = contentRef.current.getBoundingClientRect();
    
    // Obtener dimensiones del viewport o contenedor padre
    const viewport = boundary === 'viewport' 
      ? { 
          width: window.innerWidth, 
          height: window.innerHeight,
          top: 0,
          left: 0,
          right: window.innerWidth,
          bottom: window.innerHeight
        }
      : triggerRef.current.closest('[data-boundary]')?.getBoundingClientRect() || {
          width: window.innerWidth,
          height: window.innerHeight,
          top: 0,
          left: 0,
          right: window.innerWidth,
          bottom: window.innerHeight
        };

    // Calcular espacio disponible en cada dirección
    const spaces = {
      top: trigger.top - viewport.top - padding,
      bottom: viewport.bottom - trigger.bottom - padding,
      left: trigger.left - viewport.left - padding,
      right: viewport.right - trigger.right - padding
    };

    // Determinar la mejor posición
    let bestPosition: Position = preferredPosition;
    
    // Verificar si la posición preferida tiene suficiente espacio
    const requiredSpace = {
      top: content.height + offset,
      bottom: content.height + offset,
      left: content.width + offset,
      right: content.width + offset
    };

    if (spaces[preferredPosition] < requiredSpace[preferredPosition]) {
      // Buscar la posición con más espacio
      const positionsBySpace = Object.entries(spaces)
        .sort(([, a], [, b]) => b - a)
        .map(([pos]) => pos as Position);

      bestPosition = positionsBySpace.find(pos => 
        spaces[pos] >= requiredSpace[pos]
      ) || positionsBySpace[0];
    }

    // Calcular alineación
    let bestAlignment: Alignment = preferredAlignment;
    let left = 0;
    let top = 0;

    switch (bestPosition) {
      case 'top':
      case 'bottom':
        // Posicionamiento vertical
        top = bestPosition === 'top' 
          ? trigger.top - content.height - offset
          : trigger.bottom + offset;

        // Calcular alineación horizontal
        switch (preferredAlignment) {
          case 'start':
            left = trigger.left;
            break;
          case 'end':
            left = trigger.right - content.width;
            break;
          default: // center
            left = trigger.left + (trigger.width - content.width) / 2;
        }

        // Ajustar si se sale del viewport
        if (left < viewport.left + padding) {
          left = viewport.left + padding;
          bestAlignment = 'start';
        } else if (left + content.width > viewport.right - padding) {
          left = viewport.right - content.width - padding;
          bestAlignment = 'end';
        }
        break;

      case 'left':
      case 'right':
        // Posicionamiento horizontal
        left = bestPosition === 'left'
          ? trigger.left - content.width - offset
          : trigger.right + offset;

        // Calcular alineación vertical
        switch (preferredAlignment) {
          case 'start':
            top = trigger.top;
            break;
          case 'end':
            top = trigger.bottom - content.height;
            break;
          default: // center
            top = trigger.top + (trigger.height - content.height) / 2;
        }

        // Ajustar si se sale del viewport
        if (top < viewport.top + padding) {
          top = viewport.top + padding;
          bestAlignment = 'start';
        } else if (top + content.height > viewport.bottom - padding) {
          top = viewport.bottom - content.height - padding;
          bestAlignment = 'end';
        }
        break;
    }

    // Verificar si el elemento es visible
    const isVisible = 
      left >= viewport.left &&
      left + content.width <= viewport.right &&
      top >= viewport.top &&
      top + content.height <= viewport.bottom;

    return {
      position: bestPosition,
      alignment: bestAlignment,
      style: {
        position: 'fixed' as const,
        left: Math.round(left),
        top: Math.round(top),
        zIndex: 9999,
        opacity: isVisible ? 1 : 0,
        pointerEvents: (isVisible ? 'auto' : 'none') as React.CSSProperties['pointerEvents'],
        transform: 'translateZ(0)', // Forzar aceleración por hardware
      },
      isVisible
    };
  }, [triggerRef, contentRef, preferredPosition, preferredAlignment, offset, padding, boundary]);

  useEffect(() => {
    const updatePosition = () => {
      const newPosition = calculatePosition();
      setPosition(newPosition);
    };

    // Actualizar posición inmediatamente
    updatePosition();

    // Escuchar eventos que pueden cambiar la posición
    const events = ['scroll', 'resize', 'orientationchange'];
    events.forEach(event => {
      window.addEventListener(event, updatePosition, { passive: true });
    });

    // Observer para cambios en el DOM
    const observer = new MutationObserver(updatePosition);
    if (triggerRef.current) {
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['class', 'style']
      });
    }

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, updatePosition);
      });
      observer.disconnect();
    };
  }, [calculatePosition]);

  return position;
}

// Hook simplificado para tooltips básicos
export function useTooltipPosition(
  triggerRef: RefObject<HTMLElement>,
  contentRef: RefObject<HTMLElement>,
  preferredPosition: Position = 'top'
) {
  return useSmartPosition(triggerRef, contentRef, {
    preferredPosition,
    preferredAlignment: 'center',
    offset: 8,
    padding: 12
  });
}

// Hook para dropdowns
export function useDropdownPosition(
  triggerRef: RefObject<HTMLElement>,
  contentRef: RefObject<HTMLElement>,
  preferredPosition: Position = 'bottom'
) {
  return useSmartPosition(triggerRef, contentRef, {
    preferredPosition,
    preferredAlignment: 'start',
    offset: 4,
    padding: 16
  });
} 