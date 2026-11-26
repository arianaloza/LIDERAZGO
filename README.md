# LIDERAZGO

Proyecto TortuMath: plataforma web interactiva y libro de matemáticas para Ingeniería de Sistemas.

## Contenido

| Carpeta | Descripción |
| --- | --- |
| `TortuMath/` | Plataforma web (React, Vite, TypeScript, Tailwind). Incluye los retos interactivos de los capítulos 1 a 4 del libro y el bloqueo de capítulos por avance del estudiante. |
| `LibroTortuMath/` | Libro "Matemáticas para Ingeniería de Sistemas" en LaTeX, con el PDF compilado. |

## Plataforma web

```bash
cd TortuMath
npm install
npm run dev
```

Pruebas de la lógica de bloqueo:

```bash
npm test
```

Detalles del bloqueo de capítulos y configuración de la base de datos en `TortuMath/README_BLOQUEO.md`.

## Libro

Compilar desde `LibroTortuMath/`:

```bash
pdflatex libro.tex
pdflatex libro.tex
```

El PDF final está en `LibroTortuMath/Matematicas_para_Ingenieria_de_Sistemas_TortuMath.pdf`.
