/// <reference types="vite/client" />
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { Progreso, RegistroCapitulo } from "./logica.ts";

export interface SesionBloqueo {
  userId: string;
  email: string;
}

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabaseConfigurado = Boolean(url && anonKey);

const supabase: SupabaseClient | null = supabaseConfigurado
  ? createClient(url!, anonKey!, { auth: { persistSession: true, storageKey: "tortumath_bloqueo_auth" } })
  : null;

if (!supabaseConfigurado) {
  console.warn("[Bloqueo capítulos] Supabase no está configurado: se usa modo local de prueba.");
}

// Modo local (solo si falta Supabase)
const CLAVE_SESION_LOCAL = "tortumath_bloqueo_sesion";
const claveProgresoLocal = (userId: string) => `tortumath_bloqueo_progreso_${userId}`;

function leerJSON<T>(clave: string, defecto: T): T {
  try {
    const crudo = localStorage.getItem(clave);
    return crudo ? (JSON.parse(crudo) as T) : defecto;
  } catch {
    return defecto;
  }
}

function escribirJSON(clave: string, valor: unknown) {
  try {
    localStorage.setItem(clave, JSON.stringify(valor));
  } catch {
    /* sin almacenamiento */
  }
}

// Sesión
export async function obtenerSesion(): Promise<SesionBloqueo | null> {
  if (supabase) {
    const { data } = await supabase.auth.getSession();
    const u = data.session?.user;
    return u ? { userId: u.id, email: u.email ?? "" } : null;
  }
  return leerJSON<SesionBloqueo | null>(CLAVE_SESION_LOCAL, null);
}

export function escucharSesion(cb: (s: SesionBloqueo | null) => void): () => void {
  if (!supabase) return () => {};
  const { data } = supabase.auth.onAuthStateChange((_evento, session) => {
    const u = session?.user;
    cb(u ? { userId: u.id, email: u.email ?? "" } : null);
  });
  return () => data.subscription.unsubscribe();
}

export async function iniciarSesion(email: string, password: string): Promise<SesionBloqueo> {
  if (supabase) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) throw new Error(traducirError(error?.message));
    return { userId: data.user.id, email: data.user.email ?? email };
  }
  const sesion = { userId: email.toLowerCase(), email: email.toLowerCase() };
  escribirJSON(CLAVE_SESION_LOCAL, sesion);
  return sesion;
}

export async function registrarse(email: string, password: string): Promise<SesionBloqueo | null> {
  if (supabase) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.href },
    });
    if (error) throw new Error(traducirError(error.message));
    if (!data.session || !data.user) return null;
    return { userId: data.user.id, email: data.user.email ?? email };
  }
  return iniciarSesion(email, password);
}

export async function cerrarSesion(): Promise<void> {
  if (supabase) {
    await supabase.auth.signOut();
    return;
  }
  try {
    localStorage.removeItem(CLAVE_SESION_LOCAL);
  } catch {
    /* sin almacenamiento */
  }
}

function traducirError(msg?: string): string {
  if (!msg) return "No se pudo completar la operación.";
  if (/invalid login credentials/i.test(msg)) return "Correo o contraseña incorrectos.";
  if (/email not confirmed/i.test(msg)) return "Confirma tu correo antes de ingresar.";
  if (/already registered/i.test(msg)) return "Ese correo ya tiene una cuenta. Inicia sesión.";
  if (/at least 6 characters/i.test(msg)) return "La contraseña debe tener al menos 6 caracteres.";
  return msg;
}

// Progreso
interface FilaProgreso {
  capitulo: number;
  completado: boolean;
  mejor_puntaje: number;
  retos_resueltos: number;
  retos_totales: number;
  fecha: string;
}

function filaARegistro(f: FilaProgreso): RegistroCapitulo {
  return {
    capitulo: f.capitulo,
    completado: f.completado,
    mejorPuntaje: f.mejor_puntaje,
    retosResueltos: f.retos_resueltos,
    retosTotales: f.retos_totales,
    fecha: f.fecha,
  };
}

export async function cargarProgreso(sesion: SesionBloqueo): Promise<Progreso> {
  if (supabase) {
    const { data, error } = await supabase
      .from("progreso_capitulos")
      .select("capitulo, completado, mejor_puntaje, retos_resueltos, retos_totales, fecha");
    if (error) throw new Error(error.message);
    const progreso: Progreso = {};
    for (const fila of (data ?? []) as FilaProgreso[]) progreso[fila.capitulo] = filaARegistro(fila);
    return progreso;
  }
  return leerJSON<Progreso>(claveProgresoLocal(sesion.userId), {});
}

export async function guardarRegistro(sesion: SesionBloqueo, registro: RegistroCapitulo): Promise<void> {
  if (supabase) {
    const { error } = await supabase.from("progreso_capitulos").upsert(
      {
        user_id: sesion.userId,
        capitulo: registro.capitulo,
        completado: registro.completado,
        mejor_puntaje: registro.mejorPuntaje,
        retos_resueltos: registro.retosResueltos,
        retos_totales: registro.retosTotales,
        fecha: registro.fecha,
      },
      { onConflict: "user_id,capitulo" }
    );
    if (error) throw new Error(error.message);
    return;
  }
  const progreso = leerJSON<Progreso>(claveProgresoLocal(sesion.userId), {});
  progreso[registro.capitulo] = registro;
  escribirJSON(claveProgresoLocal(sesion.userId), progreso);
}
