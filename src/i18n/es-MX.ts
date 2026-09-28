import type { Messages } from "./en";
import { es } from "./es";

/** Latin American Spanish: Spain's catalog with the words that differ in the region. */
export const esMX: Messages = {
  ...es,
  common: { ...es.common, settings: "Configuración" },
  media: { play: "Reproducir video: {name}", unavailable: "Video no disponible.", failed: "No se pudo reproducir el video." },
  performance: { ...es.performance, queue: { ...es.performance.queue, spikerush: "Carrera de Spike", hurm: "Combate a muerte por equipos" } },
  cosmetic: { ...es.cosmetic, kind: { ...es.cosmetic.kind, SPRAY: "Sprays" } },
  crosshair: { ...es.crosshair, copied: "Código copiado: pégalo en Configuración › Mira › Importar código de perfil." },
  sensitivity: { ...es.sensitivity, dpi: "DPI del mouse" },
  settings: { ...es.settings, title: "Configuración" },
  notifications: {
    ...es.notifications,
    permissionDenied: "Las notificaciones están bloqueadas en la configuración del sistema.",
    openSettings: "Abrir configuración del sistema",
  },
  privacy: { ...es.privacy, body: "Todo lo que guarda VALHUB (favoritos, miras, estrategias, historial de entrenamiento, una pequeña caché y tu token de sesión de Riot) se queda en este celular. No hay servidor de VALHUB." },
  cache: { ...es.cache, limit: "Limitado a {rows} respuestas / {size}. Los videos se reproducen en streaming y nunca se guardan." },
};
