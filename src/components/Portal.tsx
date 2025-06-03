import { ReactNode, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface PortalProps {
  children: ReactNode;
  container?: HTMLElement | string;
  className?: string;
}

export function Portal({ children, container, className }: PortalProps) {
  const [mountNode, setMountNode] = useState<HTMLElement | null>(null);

  useEffect(() => {
    let node: HTMLElement;

    if (typeof container === 'string') {
      // Buscar elemento por selector
      node = document.querySelector(container) as HTMLElement;
      if (!node) {
        // Crear elemento si no existe
        node = document.createElement('div');
        node.id = container.replace('#', '').replace('.', '');
        if (className) {
          node.className = className;
        }
        document.body.appendChild(node);
      }
    } else if (container instanceof HTMLElement) {
      node = container;
    } else {
      // Crear contenedor por defecto
      node = document.createElement('div');
      node.id = 'portal-root';
      if (className) {
        node.className = className;
      }
      document.body.appendChild(node);
    }

    setMountNode(node);

    // Cleanup: solo remover si lo creamos nosotros
    return () => {
      if (!container && node.parentNode) {
        node.parentNode.removeChild(node);
      }
    };
  }, [container, className]);

  if (!mountNode) {
    return null;
  }

  return createPortal(children, mountNode);
}

// Portal específico para tooltips
export function TooltipPortal({ children }: { children: ReactNode }) {
  return (
    <Portal container="#tooltip-portal" className="pointer-events-none">
      {children}
    </Portal>
  );
}

// Portal específico para modales y dropdowns
export function ModalPortal({ children }: { children: ReactNode }) {
  return (
    <Portal container="#modal-portal" className="pointer-events-auto">
      {children}
    </Portal>
  );
}

// Portal específico para notificaciones
export function NotificationPortal({ children }: { children: ReactNode }) {
  return (
    <Portal container="#notification-portal" className="pointer-events-none">
      {children}
    </Portal>
  );
} 