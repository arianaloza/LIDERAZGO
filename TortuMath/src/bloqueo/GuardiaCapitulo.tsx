import React, { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Lock, LogIn, ArrowLeft, ArrowRight, Unlock, X, Mail, KeyRound } from "lucide-react";
import Logo from "../components/shared/Logo";
import { rutaConfig } from "../config/ruta.ts";
import {
  Progreso,
  capituloCompletado,
  capituloDesbloqueado,
  huboMejora,
  mezclarRegistro,
} from "./logica.ts";
import {
  SesionBloqueo,
  cargarProgreso,
  cerrarSesion,
  escucharSesion,
  guardarRegistro,
  iniciarSesion,
  obtenerSesion,
  registrarse,
  supabaseConfigurado,
} from "./progresoStore.ts";

export type ReportarMisiones = (resueltas: number, total: number) => void;

interface GuardiaCapituloProps {
  key?: React.Key;
  capitulo: number;
  onSalir: () => void;
  children: (reportar: ReportarMisiones) => React.ReactNode;
}

const irACapitulo = (n: number) => {
  window.location.hash = `/retos/capitulo-${n}`;
};

export default function GuardiaCapitulo({ capitulo, onSalir, children }: GuardiaCapituloProps) {
  const [sesion, setSesionCruda] = useState<SesionBloqueo | null>(null);
  const setSesion = useCallback((s: SesionBloqueo | null) => {
    setSesionCruda((prev) => (prev?.userId === s?.userId ? prev : s));
  }, []);
  const [cargando, setCargando] = useState(true);
  const [progreso, setProgreso] = useState<Progreso>({});
  const [errorCarga, setErrorCarga] = useState("");
  const [avisoDesbloqueo, setAvisoDesbloqueo] = useState(false);

  const progresoRef = useRef<Progreso>({});
  const colaGuardado = useRef<Promise<void>>(Promise.resolve());

  // Inicio de sesión
  useEffect(() => {
    let activo = true;
    obtenerSesion().then((s) => {
      if (activo) setSesion(s);
      if (activo && !s) setCargando(false);
    });
    const dejar = escucharSesion((s) => {
      if (activo) setSesion(s);
    });
    return () => {
      activo = false;
      dejar();
    };
  }, []);

  // Carga del progreso
  useEffect(() => {
    if (!sesion) return;
    let activo = true;
    setCargando(true);
    setErrorCarga("");
    cargarProgreso(sesion)
      .then(async (p) => {
        if (!activo) return;
        progresoRef.current = p;
        setProgreso(p);
        // Recalcular con la regla vigente
        for (let n = 1; n <= rutaConfig.totalCapitulos; n++) {
          const reg = p[n];
          if (reg && !reg.completado && capituloCompletado(reg)) {
            const actualizado = { ...reg, completado: true };
            p[n] = actualizado;
            await guardarRegistro(sesion, actualizado).catch((e) => console.error(e));
          }
        }
        if (activo) setProgreso({ ...p });
      })
      .catch((e) => {
        console.error(e);
        if (activo) setErrorCarga("No se pudo cargar tu progreso. Revisa tu conexión e intenta de nuevo.");
      })
      .finally(() => activo && setCargando(false));
    return () => {
      activo = false;
    };
  }, [sesion]);

  // Registro de misiones resueltas
  const reportar = useCallback<ReportarMisiones>(
    (resueltas, total) => {
      if (!sesion) return;
      const previo = progresoRef.current[capitulo];
      const nuevo = mezclarRegistro(previo, capitulo, resueltas, total);
      if (!huboMejora(previo, nuevo)) return;

      const recienCompletado = nuevo.completado && !previo?.completado;
      progresoRef.current = { ...progresoRef.current, [capitulo]: nuevo };
      setProgreso(progresoRef.current);
      if (recienCompletado) setAvisoDesbloqueo(true);

      colaGuardado.current = colaGuardado.current
        .then(() => guardarRegistro(sesion, nuevo))
        .catch((e) => console.error("[Bloqueo capítulos] Error al guardar progreso:", e));
    },
    [sesion, capitulo]
  );

  if (cargando) {
    return (
      <Pantalla>
        <div className="flex flex-col items-center gap-3 text-slate-300">
          <Logo size={48} />
          <span className="text-sm font-bold">Cargando tu progreso...</span>
        </div>
      </Pantalla>
    );
  }

  if (!sesion) {
    return (
      <Pantalla>
        <FormularioLogin capitulo={capitulo} onSalir={onSalir} onSesion={setSesion} />
      </Pantalla>
    );
  }

  if (errorCarga) {
    return (
      <Pantalla>
        <Tarjeta>
          <p className="text-sm text-red-300 font-bold mb-5">{errorCarga}</p>
          <button onClick={() => window.location.reload()} className={botonPrincipal}>
            Reintentar
          </button>
        </Tarjeta>
      </Pantalla>
    );
  }

  if (!capituloDesbloqueado(progreso, capitulo)) {
    const anterior = capitulo - 1;
    return (
      <Pantalla>
        <Tarjeta>
          <div className="relative mb-5">
            <Logo size={64} />
            <span className="absolute -bottom-2 -right-3 p-2 rounded-full bg-amber-500/20 border border-amber-400/40">
              <Lock className="w-5 h-5 text-amber-300" />
            </span>
          </div>
          <span className="text-[10px] uppercase font-black tracking-widest text-amber-300 mb-1">
            Capítulo {capitulo} bloqueado
          </span>
          <h2 className="text-xl font-black text-white mb-2">Primero completa el capítulo {anterior}</h2>
          <p className="text-xs text-slate-400 mb-6">
            Resuelve los retos del capítulo {anterior} para abrir este capítulo.
          </p>
          <button onClick={() => irACapitulo(anterior)} className={botonPrincipal}>
            Ir al capítulo {anterior} <ArrowRight className="w-4 h-4" />
          </button>
          <div className="flex items-center justify-between w-full mt-5 text-[11px] text-slate-400">
            <button onClick={onSalir} className="flex items-center gap-1 hover:text-white cursor-pointer">
              <ArrowLeft className="w-3.5 h-3.5" /> Volver
            </button>
            <button
              onClick={async () => {
                await cerrarSesion();
                setSesion(null);
                setProgreso({});
                progresoRef.current = {};
              }}
              className="hover:text-white cursor-pointer"
            >
              {sesion.email} · Cambiar cuenta
            </button>
          </div>
        </Tarjeta>
      </Pantalla>
    );
  }

  const siguiente = capitulo + 1;
  const haySiguiente = siguiente <= rutaConfig.totalCapitulos;

  return (
    <>
      {children(reportar)}
      <AnimatePresence>
        {avisoDesbloqueo && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-[60] w-[calc(100%-2rem)] max-w-sm p-4 rounded-xl shadow-2xl backdrop-blur-xl border border-emerald-500/40 bg-neutral-900/95 text-white flex items-start gap-3"
          >
            <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400">
              <Unlock className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-sm text-emerald-300">¡Capítulo {capitulo} completado!</h4>
              <p className="text-xs text-slate-300 mt-0.5">
                {haySiguiente ? `Se desbloqueó el capítulo ${siguiente}.` : "Completaste todos los capítulos."}
              </p>
              {haySiguiente && (
                <button
                  onClick={() => irACapitulo(siguiente)}
                  className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer"
                >
                  Continuar al capítulo {siguiente} <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <button
              onClick={() => setAvisoDesbloqueo(false)}
              className="p-1 rounded-md text-slate-400 hover:text-white cursor-pointer"
              aria-label="Cerrar aviso"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

const botonPrincipal =
  "w-full flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black uppercase tracking-wider bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed";

const campo =
  "w-full pl-10 pr-4 py-3 bg-[#071310] text-white font-bold text-sm rounded-xl border border-emerald-500/20 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 placeholder-slate-500";

function Pantalla({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0B1512] text-[#F1F5F9] font-sans flex items-center justify-center p-4">
      {children}
    </div>
  );
}

function Tarjeta({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-sm p-6 rounded-2xl bg-[#0d1e19] border border-emerald-500/20 shadow-[0_4px_24px_rgba(16,185,129,0.05)] flex flex-col items-center text-center"
    >
      {children}
    </motion.div>
  );
}

function FormularioLogin({
  capitulo,
  onSalir,
  onSesion,
}: {
  capitulo: number;
  onSalir: () => void;
  onSesion: (s: SesionBloqueo) => void;
}) {
  const [modo, setModo] = useState<"ingresar" | "registrar">("ingresar");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [enviando, setEnviando] = useState(false);

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMensaje("");
    setEnviando(true);
    try {
      const correo = email.trim().toLowerCase();
      if (modo === "ingresar") {
        onSesion(await iniciarSesion(correo, password));
      } else {
        const s = await registrarse(correo, password);
        if (s) onSesion(s);
        else setMensaje("Te enviamos un correo de confirmación. El enlace te traerá de vuelta a este capítulo.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo iniciar sesión.");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Tarjeta>
      <Logo size={56} />
      <span className="text-[10px] uppercase font-black tracking-widest text-emerald-400 mt-4 mb-1">
        Reto del Libro — Capítulo {capitulo}
      </span>
      <h2 className="text-xl font-black text-white mb-1">
        {modo === "ingresar" ? "Inicia sesión para continuar" : "Crea tu cuenta"}
      </h2>
      <p className="text-xs text-slate-400 mb-5">Tu avance en los retos se guarda en tu cuenta.</p>

      {!supabaseConfigurado && (
        <p className="w-full mb-4 p-2.5 rounded-lg text-[11px] font-bold text-amber-300 bg-amber-500/10 border border-amber-500/30">
          Modo local de prueba: el progreso solo se guarda en este navegador.
        </p>
      )}

      {error && (
        <p className="w-full mb-4 p-2.5 rounded-lg text-xs font-bold text-red-300 bg-red-500/10 border border-red-500/30">
          {error}
        </p>
      )}
      {mensaje && (
        <p className="w-full mb-4 p-2.5 rounded-lg text-xs font-bold text-emerald-300 bg-emerald-500/10 border border-emerald-500/30">
          {mensaje}
        </p>
      )}

      <form onSubmit={enviar} className="w-full space-y-3 text-left">
        <div className="relative">
          <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="correo@ejemplo.com"
            className={campo}
            autoComplete="email"
          />
        </div>
        <div className="relative">
          <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Contraseña"
            className={campo}
            autoComplete={modo === "ingresar" ? "current-password" : "new-password"}
          />
        </div>
        <button type="submit" disabled={enviando} className={botonPrincipal}>
          <LogIn className="w-4 h-4" />
          {enviando ? "Validando..." : modo === "ingresar" ? "Ingresar" : "Crear cuenta"}
        </button>
      </form>

      <div className="flex items-center justify-between w-full mt-5 text-[11px] text-slate-400">
        <button onClick={onSalir} className="flex items-center gap-1 hover:text-white cursor-pointer">
          <ArrowLeft className="w-3.5 h-3.5" /> Volver
        </button>
        <button
          onClick={() => {
            setModo(modo === "ingresar" ? "registrar" : "ingresar");
            setError("");
            setMensaje("");
          }}
          className="font-bold text-emerald-400 hover:text-emerald-300 cursor-pointer"
        >
          {modo === "ingresar" ? "Crear una cuenta" : "Ya tengo cuenta"}
        </button>
      </div>
    </Tarjeta>
  );
}
