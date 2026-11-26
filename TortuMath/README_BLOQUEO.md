# Bloqueo de capítulos

Afecta solo a las rutas `#/retos/capitulo-1` … `#/retos/capitulo-4`.

## Cómo funciona

- El capítulo 1 siempre está abierto. El 2 se abre al completar el 1, el 3 al completar el 2 y el 4 al completar el 3.
- Al entrar a un capítulo (por menú, enlace directo o QR del libro) se pide iniciar sesión. Después de ingresar, el usuario sigue en el mismo capítulo.
- Si el capítulo está bloqueado se muestra un candado con el botón "Ir al capítulo N-1" y no se cargan los retos.
- Cada vez que el estudiante resuelve más misiones que antes, se guarda su mejor resultado. Un intento peor nunca baja lo ya logrado.
- Cuando un capítulo queda completado, aparece un aviso con el botón para continuar al siguiente. Un capítulo completado no se vuelve a bloquear.

Archivos:

| Archivo | Qué hace |
| --- | --- |
| `src/config/ruta.ts` | Regla de completado (`modo`, `porcentajeMinimo`) |
| `src/bloqueo/logica.ts` | Funciones puras: `capituloDesbloqueado`, `capituloCompletado`, `mezclarRegistro` |
| `src/bloqueo/logica.test.ts` | Pruebas (`npm test`) |
| `src/bloqueo/progresoStore.ts` | Sesión y progreso con Supabase |
| `src/bloqueo/GuardiaCapitulo.tsx` | Login, pantalla de bloqueo y aviso de desbloqueo |
| `supabase/bloqueo_capitulos.sql` | Tabla, reglas RLS y trigger |

## Cambiar la regla

En `src/config/ruta.ts`:

```ts
export const rutaConfig = {
  modo: "todos",        // "todos": las 3 misiones | "porcentaje": usa porcentajeMinimo
  porcentajeMinimo: 70,
  totalCapitulos: 4,
};
```

Cada capítulo tiene 3 misiones (33 %, 67 %, 100 %). Con `porcentaje` y 70 % se necesitan las 3; con 60 % bastan 2.

Al cambiar la regla no se borra nada: el estado se recalcula con los datos guardados (`mejor_puntaje`, `retos_resueltos`). Si con la regla nueva un capítulo pasa a estar completado, se marca como completado al abrir cualquier reto. Si la regla se vuelve más exigente, los capítulos ya completados siguen abiertos.

## Configurar Supabase (plan gratuito)

1. Crea un proyecto en <https://supabase.com>.
2. En **SQL Editor** ejecuta todo el archivo `supabase/bloqueo_capitulos.sql`.
3. En **Authentication → URL Configuration** agrega como Redirect URL: `https://isaccmealla.github.io/TortuMath/**`.
4. Opcional: en **Authentication → Providers → Email** desactiva "Confirm email" si no quieres que los estudiantes confirmen el correo.
5. En **Project Settings → API** copia `Project URL` y la clave `anon public`.
6. Local: crea `.env.local` en la raíz:

   ```
   VITE_SUPABASE_URL=https://xxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ...
   ```

7. GitHub: en el repositorio, **Settings → Secrets and variables → Actions**, crea los secretos `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`. El workflow `deploy.yml` ya los pasa al build.

La clave `anon` es pública por diseño; la seguridad la dan las reglas RLS.

## Seguridad en la base de datos

- Cada usuario solo puede leer y escribir sus propias filas.
- Solo se puede crear o actualizar progreso del capítulo N si el capítulo N-1 está `completado` para ese usuario (función `capitulo_abierto`). Aunque alguien manipule el navegador, la base de datos rechaza el progreso en capítulos bloqueados.
- Un trigger impide bajar `completado`, `mejor_puntaje` o `retos_resueltos`.
- No hay permiso de borrado desde el navegador.

Límite: los retos se resuelven en el navegador, así que un usuario con conocimientos técnicos podría marcar como resuelto el capítulo que tiene abierto. Lo que no puede es saltarse capítulos.

## Modo local de prueba

Si faltan `VITE_SUPABASE_URL` o `VITE_SUPABASE_ANON_KEY`, la guardia funciona igual pero guarda la sesión y el progreso en `localStorage`, y muestra el aviso "Modo local de prueba". Sirve solo para desarrollo: en producción hay que configurar Supabase.

## Revertir

Todo el cambio está en la rama `bloqueo-capitulos`. Los puntos tocados en archivos compartidos están marcados con `BLOQUEO CAPÍTULOS`.
