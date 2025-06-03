import React, { useEffect } from "react";
import { useNotifications } from "./SmartNotification";

interface ExecutionStatus {
  type:
    | "idle"
    | "pending"
    | "debouncing"
    | "executing"
    | "error"
    | "cleared"
    | "paste-priority";
  message?: string;
  timeRemaining?: number;
  lastChangeSize?: number;
  estimatedDelay?: number;
  isTypingActive?: boolean;
  operationType?: "paste" | "typing" | "manual";
}

interface ExecutionStatusIndicatorProps {
  status: ExecutionStatus;
  onCancel?: () => void;
  onForceExecute?: () => void;
}

export default function ExecutionStatusIndicator({
  status,
  onCancel,
  onForceExecute,
}: ExecutionStatusIndicatorProps) {
  const { addNotification, clearAll } = useNotifications();

  useEffect(() => {
    // Limpiar notificaciones anteriores
    clearAll();

    // Determinar si debe mostrar la notificación
    const shouldShowNotification =
      status.type !== "idle" &&
      status.message &&
      !status.message.includes("completada") &&
      !status.message.includes("Completado");

    if (!shouldShowNotification) return;

    // Configuración de la notificación según el tipo de estado
    const getNotificationConfig = () => {
      const baseConfig = {
        duration: 0, // No auto-dismiss para estados de ejecución
        persistent: true,
        position: "top-right" as const,
      };

      switch (status.type) {
        case "pending":
          return {
            ...baseConfig,
            type: "info" as const,
            title: status.isTypingActive ? "⌨️ Escribiendo..." : "⏳ Pendiente",
            message: status.message,
            actions: onCancel
              ? [
                  {
                    label: "Cancelar",
                    onClick: onCancel,
                    variant: "secondary" as const,
                  },
                ]
              : undefined,
          };

        case "debouncing":
          return {
            ...baseConfig,
            type: "warning" as const,
            title: status.isTypingActive ? "⌨️ Escribiendo..." : "⏱️ Esperando",
            message: `${status.message}${
              status.timeRemaining
                ? ` (${Math.ceil(status.timeRemaining / 1000)}s)`
                : ""
            }`,
            actions: [
              ...(onForceExecute
                ? [
                    {
                      label: "Ejecutar Ahora",
                      onClick: onForceExecute,
                      variant: "primary" as const,
                    },
                  ]
                : []),
              ...(onCancel
                ? [
                    {
                      label: "Cancelar",
                      onClick: onCancel,
                      variant: "secondary" as const,
                    },
                  ]
                : []),
            ],
          };

        case "executing":
          return {
            ...baseConfig,
            type: "info" as const,
            title: "⚡ Ejecutando",
            message: status.message,
            actions: onCancel
              ? [
                  {
                    label: "Detener",
                    onClick: onCancel,
                    variant: "secondary" as const,
                  },
                ]
              : undefined,
          };

        case "error":
          return {
            ...baseConfig,
            type: "error" as const,
            title: "❌ Error",
            message: status.message,
            duration: 5000, // Auto-dismiss para errores
            persistent: false,
          };

        case "cleared":
          return {
            ...baseConfig,
            type: "success" as const,
            title: "🧹 Limpiado",
            message: status.message,
            duration: 2000, // Auto-dismiss rápido
            persistent: false,
          };

        case "paste-priority":
          return {
            ...baseConfig,
            type: "info" as const,
            title: "📋 Procesando pegada",
            message: `${status.message}${
              status.lastChangeSize
                ? ` (${status.lastChangeSize} caracteres)`
                : ""
            }`,
            actions: onCancel
              ? [
                  {
                    label: "Cancelar",
                    onClick: onCancel,
                    variant: "secondary" as const,
                  },
                ]
              : undefined,
          };

        default:
          return {
            ...baseConfig,
            type: "info" as const,
            title: "✅ Estado",
            message: status.message,
          };
      }
    };

    const config = getNotificationConfig();
    addNotification(config);
  }, [status, onCancel, onForceExecute, addNotification, clearAll]);

  return null; // El componente ya no renderiza nada directamente
}
