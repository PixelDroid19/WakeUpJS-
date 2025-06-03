import React, { useEffect, useState, useRef, createContext, useContext, useCallback, memo, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';
export type NotificationPosition = 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';

interface NotificationAction {
  id: string;
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
  shortcut?: string;
}

interface SmartNotificationProps {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
  duration?: number; // 0 = no auto-dismiss
  position?: NotificationPosition;
  onClose?: (id: string) => void;
  actions?: NotificationAction[];
  persistent?: boolean;
  pauseOnHover?: boolean;
  pauseOnFocus?: boolean;
  closable?: boolean;
  className?: string;
  priority?: 'low' | 'normal' | 'high' | 'critical';
  sound?: boolean;
  timestamp?: Date;
  group?: string;
  metadata?: Record<string, any>;
}

interface NotificationStackConfig {
  maxNotifications: number;
  stackSpacing: number;
  autoStackCollapse: boolean;
  stackDirection: 'up' | 'down';
  groupSimilar: boolean;
  dismissOldest: boolean;
}

interface NotificationContextType {
  notifications: SmartNotificationProps[];
  config: NotificationStackConfig;
  addNotification: (notification: Omit<SmartNotificationProps, 'id' | 'onClose'>) => string;
  removeNotification: (id: string) => void;
  updateNotification: (id: string, updates: Partial<SmartNotificationProps>) => void;
  clearAll: () => void;
  clearGroup: (group: string) => void;
  pauseAll: () => void;
  resumeAll: () => void;
  setConfig: (config: Partial<NotificationStackConfig>) => void;
  getNotificationsByGroup: (group: string) => SmartNotificationProps[];
  getNotificationsByType: (type: NotificationType) => SmartNotificationProps[];
}

const NotificationContext = createContext<NotificationContextType | null>(null);

// Hook para generar sonidos de notificación
const useNotificationSound = () => {
  const playSound = useCallback((type: NotificationType) => {
    if (typeof window !== 'undefined' && 'AudioContext' in window) {
      try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        // Diferentes frecuencias para diferentes tipos
        const frequencies = {
          success: [523.25, 659.25], // C5, E5
          error: [311.13, 246.94],   // Eb4, B3
          warning: [440, 523.25],    // A4, C5
          info: [523.25, 659.25]     // C5, E5
        };
        
        const freq = frequencies[type] || frequencies.info;
        oscillator.frequency.setValueAtTime(freq[0], audioContext.currentTime);
        oscillator.frequency.setValueAtTime(freq[1], audioContext.currentTime + 0.1);
        
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.3);
      } catch (error) {
        console.warn('No se pudo reproducir el sonido de notificación:', error);
      }
    }
  }, []);

  return { playSound };
};

// Componente principal de notificación optimizado
export const SmartNotification = memo<SmartNotificationProps>(({
  id,
  type,
  title,
  message,
  duration = 5000,
  position = 'top-right',
  onClose,
  actions,
  persistent = false,
  pauseOnHover = true,
  pauseOnFocus = true,
  closable = true,
  className = '',
  priority = 'normal',
  sound = false,
  timestamp,
  group,
  metadata
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [progress, setProgress] = useState(100);
  const [isPaused, setIsPaused] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  
  const notificationRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const progressRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const remainingTimeRef = useRef<number>(duration);

  const { playSound } = useNotificationSound();

  // Configuración de tipos optimizada con useMemo
  const typeConfig = useMemo(() => {
    const configs = {
      success: {
        icon: CheckCircle,
        bgColor: 'bg-green-900/95',
        borderColor: 'border-green-500',
        textColor: 'text-green-100',
        iconColor: 'text-green-400',
        progressColor: 'bg-green-400',
        accentColor: 'green-500'
      },
      error: {
        icon: AlertCircle,
        bgColor: 'bg-red-900/95',
        borderColor: 'border-red-500',
        textColor: 'text-red-100',
        iconColor: 'text-red-400',
        progressColor: 'bg-red-400',
        accentColor: 'red-500'
      },
      warning: {
        icon: AlertTriangle,
        bgColor: 'bg-yellow-900/95',
        borderColor: 'border-yellow-500',
        textColor: 'text-yellow-100',
        iconColor: 'text-yellow-400',
        progressColor: 'bg-yellow-400',
        accentColor: 'yellow-500'
      },
      info: {
        icon: Info,
        bgColor: 'bg-blue-900/95',
        borderColor: 'border-blue-500',
        textColor: 'text-blue-100',
        iconColor: 'text-blue-400',
        progressColor: 'bg-blue-400',
        accentColor: 'blue-500'
      }
    };
    return configs[type];
  }, [type]);

  // Calcular posición inteligente
  const positionStyles = useMemo((): React.CSSProperties => {
    const padding = 16;
    const maxWidth = Math.min(400, (typeof window !== 'undefined' ? window.innerWidth : 1024) - padding * 2);
    const minWidth = Math.min(280, (typeof window !== 'undefined' ? window.innerWidth : 1024) - padding * 2);

    const baseStyles: React.CSSProperties = {
      position: 'fixed',
      zIndex: 9999,
      maxWidth,
      minWidth,
      width: 'auto'
    };

    const positions = {
      'top-right': { top: padding, right: padding },
      'top-left': { top: padding, left: padding },
      'bottom-right': { bottom: padding, right: padding },
      'bottom-left': { bottom: padding, left: padding },
      'top-center': { top: padding, left: '50%', transform: 'translateX(-50%)' },
      'bottom-center': { bottom: padding, left: '50%', transform: 'translateX(-50%)' }
    };

    return { ...baseStyles, ...positions[position] };
  }, [position]);

  // Manejar pausa/reanudación del progreso
  const shouldPause = useMemo(() => {
    return (pauseOnHover && isHovered) || (pauseOnFocus && isFocused) || isPaused;
  }, [pauseOnHover, isHovered, pauseOnFocus, isFocused, isPaused]);

  // Manejar cierre optimizado
  const handleClose = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (progressRef.current) {
      cancelAnimationFrame(progressRef.current);
    }
    
    setIsVisible(false);
    setTimeout(() => {
      onClose?.(id);
    }, 300); // Tiempo para la animación de salida
  }, [id, onClose]);

  // Manejar progreso con requestAnimationFrame para mejor performance
  const updateProgress = useCallback(() => {
    if (shouldPause || persistent || duration <= 0) return;

    const now = Date.now();
    const elapsed = now - startTimeRef.current;
    const newProgress = Math.max(0, 100 - (elapsed / duration) * 100);

    setProgress(newProgress);

    if (newProgress <= 0) {
      handleClose();
    } else {
      progressRef.current = requestAnimationFrame(updateProgress);
    }
  }, [shouldPause, persistent, duration, handleClose]);

  // Pausar/reanudar progreso
  const pauseProgress = useCallback(() => {
    if (progressRef.current) {
      cancelAnimationFrame(progressRef.current);
      progressRef.current = null;
    }
    remainingTimeRef.current = (progress / 100) * duration;
  }, [progress, duration]);

  const resumeProgress = useCallback(() => {
    startTimeRef.current = Date.now();
    remainingTimeRef.current = (progress / 100) * duration;
    progressRef.current = requestAnimationFrame(updateProgress);
  }, [progress, duration, updateProgress]);

  // Event handlers optimizados
  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
    pauseProgress();
  }, [pauseProgress]);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    if (!isFocused && !isPaused) {
      resumeProgress();
    }
  }, [isFocused, isPaused, resumeProgress]);

  const handleFocus = useCallback(() => {
    setIsFocused(true);
    pauseProgress();
  }, [pauseProgress]);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
    if (!isHovered && !isPaused) {
      resumeProgress();
    }
  }, [isHovered, isPaused, resumeProgress]);

  // Inicialización
  useEffect(() => {
    // Reproducir sonido si está habilitado
    if (sound) {
      playSound(type);
    }

    // Mostrar con pequeño delay para animación
    const showTimeout = setTimeout(() => {
      setIsVisible(true);
    }, 50);

    // Inicializar progreso
    if (duration > 0 && !persistent) {
      startTimeRef.current = Date.now();
      progressRef.current = requestAnimationFrame(updateProgress);
    }

    return () => {
      clearTimeout(showTimeout);
      if (progressRef.current) {
        cancelAnimationFrame(progressRef.current);
      }
    };
  }, [duration, persistent, sound, type, playSound, updateProgress]);

  // Manejar cambios en pausa
  useEffect(() => {
    if (shouldPause) {
      pauseProgress();
    } else if (duration > 0 && !persistent) {
      resumeProgress();
    }
  }, [shouldPause, duration, persistent, pauseProgress, resumeProgress]);

  const Icon = typeConfig.icon;

  // Calcular prioridad de visualización
  const priorityClasses = useMemo(() => {
    const priorities = {
      low: 'opacity-90',
      normal: 'opacity-100',
      high: 'shadow-2xl ring-1 ring-white/10',
      critical: 'shadow-2xl ring-2 ring-red-500/50 animate-pulse'
    };
    return priorities[priority];
  }, [priority]);

  return createPortal(
    <div
      ref={notificationRef}
      style={positionStyles}
      className={`
        ${typeConfig.bgColor} ${typeConfig.borderColor} ${typeConfig.textColor}
        border-l-4 backdrop-blur-sm rounded-r-lg shadow-2xl
        transition-all duration-300 ease-out
        ${isVisible 
          ? 'opacity-100 transform translate-x-0 scale-100' 
          : 'opacity-0 transform translate-x-full scale-95'
        }
        ${priorityClasses}
        ${className}
      `}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
      role="alert"
      aria-live={priority === 'critical' ? 'assertive' : 'polite'}
      aria-atomic="true"
      tabIndex={0}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Icono */}
          <div className={`flex-shrink-0 ${typeConfig.iconColor}`}>
            <Icon size={20} />
          </div>

          {/* Contenido */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-1">
              <h4 className="text-sm font-semibold pr-2">
                {title}
              </h4>
              {timestamp && (
                <span className="text-xs opacity-60 whitespace-nowrap">
                  {timestamp.toLocaleTimeString()}
                </span>
              )}
            </div>
            
            {message && (
              <p className="text-xs opacity-90 break-words leading-relaxed mb-2">
                {message}
              </p>
            )}

            {/* Metadatos */}
            {metadata && Object.keys(metadata).length > 0 && (
              <div className="text-xs opacity-70 mb-2">
                {Object.entries(metadata).map(([key, value]) => (
                  <div key={key} className="flex gap-2">
                    <span className="font-medium">{key}:</span>
                    <span>{String(value)}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Acciones */}
            {actions && actions.length > 0 && (
              <div className="flex gap-2 mt-3 flex-wrap">
                {actions.map((action) => (
                  <button
                    key={action.id}
                    onClick={() => {
                      action.onClick();
                      if (!persistent) handleClose();
                    }}
                    className={`
                      px-3 py-1.5 text-xs font-medium rounded transition-all duration-200
                      ${action.variant === 'primary'
                        ? `bg-${typeConfig.accentColor} text-gray-900 hover:opacity-80 shadow-sm`
                        : 'bg-white/10 hover:bg-white/20 border border-white/20 hover:border-white/30'
                      }
                    `}
                    title={action.shortcut ? `Atajo: ${action.shortcut}` : undefined}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Botón de cerrar */}
          {closable && (
            <button
              onClick={handleClose}
              className="flex-shrink-0 p-1 rounded hover:bg-white/10 transition-colors opacity-70 hover:opacity-100"
              title="Cerrar notificación"
              aria-label="Cerrar notificación"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Barra de progreso para auto-dismiss */}
        {duration > 0 && !persistent && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10 rounded-br-lg overflow-hidden">
            <div
              className={`h-full ${typeConfig.progressColor} transition-all duration-100 ease-linear ${
                shouldPause ? 'animate-pulse' : ''
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>
    </div>,
    document.body
  );
});

SmartNotification.displayName = 'SmartNotification';

// Proveedor del contexto de notificaciones mejorado
export function NotificationProvider({ 
  children,
  defaultConfig
}: { 
  children: React.ReactNode;
  defaultConfig?: Partial<NotificationStackConfig>;
}) {
  const [notifications, setNotifications] = useState<SmartNotificationProps[]>([]);
  const [config, setConfigState] = useState<NotificationStackConfig>({
    maxNotifications: 5,
    stackSpacing: 8,
    autoStackCollapse: true,
    stackDirection: 'down',
    groupSimilar: true,
    dismissOldest: true,
    ...defaultConfig
  });

  // Generar ID único
  const generateId = useCallback(() => {
    return `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  // Agregar notificación con lógica de stack inteligente
  const addNotification = useCallback((notification: Omit<SmartNotificationProps, 'id' | 'onClose'>) => {
    const id = generateId();
    const timestamp = new Date();
    
    const newNotification: SmartNotificationProps = {
      ...notification,
      id,
      timestamp,
      onClose: removeNotification
    };

    setNotifications(prev => {
      let updatedNotifications = [...prev];

      // Agrupar notificaciones similares si está habilitado
      if (config.groupSimilar && notification.group) {
        const existingGroupNotification = updatedNotifications.find(
          n => n.group === notification.group && n.type === notification.type
        );
        if (existingGroupNotification) {
          // Actualizar notificación existente en lugar de agregar una nueva
          const updated = updatedNotifications.map(n => 
            n.id === existingGroupNotification.id 
              ? { ...n, message: notification.message, timestamp }
              : n
          );
          return updated;
        }
      }

      // Agregar nueva notificación
      updatedNotifications.push(newNotification);

      // Controlar límite máximo de notificaciones
      if (updatedNotifications.length > config.maxNotifications) {
        if (config.dismissOldest) {
          updatedNotifications = updatedNotifications.slice(-config.maxNotifications);
        } else {
          updatedNotifications = updatedNotifications.slice(0, config.maxNotifications);
        }
      }

      return updatedNotifications;
    });

    return id;
  }, [generateId, config, removeNotification]);

  const updateNotification = useCallback((id: string, updates: Partial<SmartNotificationProps>) => {
    setNotifications(prev => prev.map(n => 
      n.id === id ? { ...n, ...updates } : n
    ));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const clearGroup = useCallback((group: string) => {
    setNotifications(prev => prev.filter(n => n.group !== group));
  }, []);

  const pauseAll = useCallback(() => {
    // Implementar lógica de pausa global
    setNotifications(prev => prev.map(n => ({ ...n, pauseOnHover: true })));
  }, []);

  const resumeAll = useCallback(() => {
    // Implementar lógica de reanudación global
    setNotifications(prev => prev.map(n => ({ ...n, pauseOnHover: false })));
  }, []);

  const setConfig = useCallback((newConfig: Partial<NotificationStackConfig>) => {
    setConfigState(prev => ({ ...prev, ...newConfig }));
  }, []);

  const getNotificationsByGroup = useCallback((group: string) => {
    return notifications.filter(n => n.group === group);
  }, [notifications]);

  const getNotificationsByType = useCallback((type: NotificationType) => {
    return notifications.filter(n => n.type === type);
  }, [notifications]);

  const contextValue = useMemo<NotificationContextType>(() => ({
    notifications,
    config,
    addNotification,
    removeNotification,
    updateNotification,
    clearAll,
    clearGroup,
    pauseAll,
    resumeAll,
    setConfig,
    getNotificationsByGroup,
    getNotificationsByType
  }), [
    notifications,
    config,
    addNotification,
    removeNotification,
    updateNotification,
    clearAll,
    clearGroup,
    pauseAll,
    resumeAll,
    setConfig,
    getNotificationsByGroup,
    getNotificationsByType
  ]);

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
      {/* Renderizar todas las notificaciones con positioning inteligente */}
      {notifications.map((notification, index) => {
        // Calcular offset basado en stack direction
        const offset = config.stackDirection === 'down' 
          ? index * (60 + config.stackSpacing)
          : (notifications.length - 1 - index) * (60 + config.stackSpacing);
        
        const notificationWithStack = {
          ...notification,
          style: {
            [notification.position?.includes('top') ? 'top' : 'bottom']: 
              `${16 + offset}px`
          }
        };

        return (
          <SmartNotification 
            key={notification.id} 
            {...notificationWithStack}
          />
        );
      })}
    </NotificationContext.Provider>
  );
}

// Hook mejorado para usar las notificaciones
export function useNotifications() {
  const context = useContext(NotificationContext);
  
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }

  // Métodos de conveniencia con opciones predeterminadas inteligentes
  const success = useCallback((title: string, message?: string, options?: Partial<SmartNotificationProps>) =>
    context.addNotification({ 
      type: 'success', 
      title, 
      message, 
      duration: 4000,
      sound: true,
      ...options 
    }), [context]);

  const error = useCallback((title: string, message?: string, options?: Partial<SmartNotificationProps>) =>
    context.addNotification({ 
      type: 'error', 
      title, 
      message, 
      duration: 0, // Los errores persisten por defecto
      priority: 'high',
      sound: true,
      ...options 
    }), [context]);

  const warning = useCallback((title: string, message?: string, options?: Partial<SmartNotificationProps>) =>
    context.addNotification({ 
      type: 'warning', 
      title, 
      message, 
      duration: 6000,
      priority: 'normal',
      sound: true,
      ...options 
    }), [context]);

  const info = useCallback((title: string, message?: string, options?: Partial<SmartNotificationProps>) =>
    context.addNotification({ 
      type: 'info', 
      title, 
      message, 
      duration: 5000,
      ...options 
    }), [context]);

  // Métodos adicionales de conveniencia
  const critical = useCallback((title: string, message?: string, options?: Partial<SmartNotificationProps>) =>
    context.addNotification({ 
      type: 'error', 
      title, 
      message, 
      duration: 0,
      priority: 'critical',
      persistent: true,
      sound: true,
      ...options 
    }), [context]);

  const loading = useCallback((title: string, message?: string, options?: Partial<SmartNotificationProps>) =>
    context.addNotification({ 
      type: 'info', 
      title, 
      message, 
      duration: 0,
      persistent: true,
      closable: false,
      ...options 
    }), [context]);

  return {
    ...context,
    success,
    error,
    warning,
    info,
    critical,
    loading
  };
} 