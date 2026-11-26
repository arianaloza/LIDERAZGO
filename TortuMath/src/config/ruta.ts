// BLOQUEO CAPÍTULOS: regla para dar un capítulo por completado

export type ModoRuta = "todos" | "porcentaje";

export interface ConfigRuta {
  modo: ModoRuta;
  porcentajeMinimo: number;
  totalCapitulos: number;
}

export const rutaConfig: ConfigRuta = {
  modo: "todos",
  porcentajeMinimo: 70,
  totalCapitulos: 4,
};
