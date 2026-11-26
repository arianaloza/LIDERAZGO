import { ConfigRuta, rutaConfig } from "../config/ruta.ts";

export interface RegistroCapitulo {
  capitulo: number;
  completado: boolean;
  mejorPuntaje: number;
  retosResueltos: number;
  retosTotales: number;
  fecha: string;
}

export type Progreso = Record<number, RegistroCapitulo | undefined>;

export function calcularPuntaje(resueltos: number, totales: number): number {
  if (totales <= 0) return 0;
  return Math.round((Math.min(resueltos, totales) / totales) * 100);
}

export function capituloCompletado(registro: RegistroCapitulo | undefined, config: ConfigRuta = rutaConfig): boolean {
  if (!registro) return false;
  if (registro.completado) return true;
  if (config.modo === "todos") {
    return registro.retosTotales > 0 && registro.retosResueltos >= registro.retosTotales;
  }
  return registro.mejorPuntaje >= config.porcentajeMinimo;
}

export function capituloDesbloqueado(progreso: Progreso, n: number, config: ConfigRuta = rutaConfig): boolean {
  if (!Number.isInteger(n) || n < 1 || n > config.totalCapitulos) return false;
  if (n === 1) return true;
  if (capituloCompletado(progreso[n], config)) return true;
  return capituloCompletado(progreso[n - 1], config);
}

// Combina un intento nuevo sin bajar lo ya logrado
export function mezclarRegistro(
  previo: RegistroCapitulo | undefined,
  capitulo: number,
  resueltos: number,
  totales: number,
  config: ConfigRuta = rutaConfig,
  fecha: string = new Date().toISOString()
): RegistroCapitulo {
  const puntaje = calcularPuntaje(resueltos, totales);
  const mezcla: RegistroCapitulo = {
    capitulo,
    completado: previo?.completado ?? false,
    mejorPuntaje: Math.max(previo?.mejorPuntaje ?? 0, puntaje),
    retosResueltos: Math.max(previo?.retosResueltos ?? 0, resueltos),
    retosTotales: Math.max(previo?.retosTotales ?? 0, totales),
    fecha,
  };
  mezcla.completado = capituloCompletado(mezcla, config);
  return mezcla;
}

export function huboMejora(previo: RegistroCapitulo | undefined, nuevo: RegistroCapitulo): boolean {
  if (!previo) return nuevo.retosResueltos > 0 || nuevo.completado;
  return (
    nuevo.mejorPuntaje > previo.mejorPuntaje ||
    nuevo.retosResueltos > previo.retosResueltos ||
    (nuevo.completado && !previo.completado)
  );
}
