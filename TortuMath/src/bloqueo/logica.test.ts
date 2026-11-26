import { test } from "node:test";
import assert from "node:assert/strict";
import { capituloDesbloqueado, capituloCompletado, mezclarRegistro, Progreso, RegistroCapitulo } from "./logica.ts";
import { ConfigRuta } from "../config/ruta.ts";

const todos: ConfigRuta = { modo: "todos", porcentajeMinimo: 70, totalCapitulos: 4 };
const porcentaje: ConfigRuta = { modo: "porcentaje", porcentajeMinimo: 70, totalCapitulos: 4 };

function reg(capitulo: number, resueltos: number, totales = 3, completado = false): RegistroCapitulo {
  return {
    capitulo,
    completado,
    mejorPuntaje: Math.round((resueltos / totales) * 100),
    retosResueltos: resueltos,
    retosTotales: totales,
    fecha: "2026-11-26T00:00:00.000Z",
  };
}

test("usuario nuevo: solo el capítulo 1 abierto", () => {
  const p: Progreso = {};
  assert.equal(capituloDesbloqueado(p, 1, todos), true);
  assert.equal(capituloDesbloqueado(p, 2, todos), false);
  assert.equal(capituloDesbloqueado(p, 3, todos), false);
  assert.equal(capituloDesbloqueado(p, 4, todos), false);
});

test("capítulo 1 completo abre el 2 y no el 3", () => {
  const p: Progreso = { 1: reg(1, 3) };
  assert.equal(capituloDesbloqueado(p, 2, todos), true);
  assert.equal(capituloDesbloqueado(p, 3, todos), false);
});

test("capítulo 2 incompleto mantiene cerrado el 3", () => {
  const p: Progreso = { 1: reg(1, 3), 2: reg(2, 1) };
  assert.equal(capituloDesbloqueado(p, 2, todos), true);
  assert.equal(capituloDesbloqueado(p, 3, todos), false);
});

test("modo todos: 2 de 3 no completa", () => {
  assert.equal(capituloCompletado(reg(1, 2), todos), false);
  assert.equal(capituloCompletado(reg(1, 3), todos), true);
});

test("modo porcentaje: depende de porcentajeMinimo", () => {
  assert.equal(capituloCompletado(reg(1, 2), porcentaje), false);
  assert.equal(capituloCompletado(reg(1, 2), { ...porcentaje, porcentajeMinimo: 60 }), true);
  const p: Progreso = { 1: reg(1, 2) };
  assert.equal(capituloDesbloqueado(p, 2, { ...porcentaje, porcentajeMinimo: 60 }), true);
  assert.equal(capituloDesbloqueado(p, 2, porcentaje), false);
});

test("un capítulo completado no se vuelve a bloquear al subir el mínimo", () => {
  const p: Progreso = { 1: reg(1, 2, 3, true) };
  assert.equal(capituloDesbloqueado(p, 2, { ...porcentaje, porcentajeMinimo: 100 }), true);
});

test("un intento fallido no baja el progreso", () => {
  const previo = mezclarRegistro(undefined, 1, 3, 3, todos);
  const despues = mezclarRegistro(previo, 1, 1, 3, todos);
  assert.equal(despues.completado, true);
  assert.equal(despues.mejorPuntaje, 100);
  assert.equal(despues.retosResueltos, 3);
});

test("capítulos fuera de rango no se abren", () => {
  assert.equal(capituloDesbloqueado({}, 0, todos), false);
  assert.equal(capituloDesbloqueado({}, 5, todos), false);
});
