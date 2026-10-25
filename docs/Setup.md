---
tags:
  - fasterreading
  - setup
aliases:
  - Setup y Despliegue
---

# Setup

Volver a [[Home]].

## Requisitos

Un navegador moderno (Chrome, Edge, Firefox, Safari) y cualquiera de: Python 3, Node.js o la extensión Live Server de VS Code. No hay `npm install` porque pdf.js ya está en `vendor/pdfjs/`.

## Ejecutar en local

1. Entra en la carpeta del proyecto: `cd FasterReading`
2. Arranca un servidor estático (elige uno):
   - `python -m http.server 8000`
   - `npx serve .`
   - VS Code → Live Server → "Go Live"
3. Abre <http://localhost:8000>.
4. Sube un PDF y pulsa Play. Ver [[Uso]].

## Caché del navegador

`python -m http.server` no envía cabeceras `Cache-Control`, así que el navegador puede seguir usando un `app.js` antiguo con un `index.html` nuevo (síntomas: botones que no responden o la página que se recarga al usar «Ir a»). Para evitarlo, los scripts se cargan con un sufijo de versión: `js/app.js?v=N` en `index.html` y `./reader.js?v=N` / `./pdf-extractor.js?v=N` en `app.js`. La hoja de estilos usa el mismo truco: `css/style.css?v=N` en `index.html`.

- Al cambiar cualquier archivo de `js/`, sube `N` en esos tres sitios a la vez.
- Al cambiar `css/style.css`, sube su `N` en `index.html`.
- Si aun así ves un comportamiento antiguo, recarga sin caché con <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>R</kbd>.

## ¿Por qué un servidor?

Los módulos ES (`<script type="module">`) y el worker de pdf.js se bloquean en `file://` por CORS. Ver [[Arquitectura]].

## Actualizar pdf.js

Copia `build/pdf.min.mjs` y `build/pdf.worker.min.mjs` desde el paquete npm `pdfjs-dist` a `vendor/pdfjs/`. Ver [[Procesamiento-PDF]].

## Documentación en Obsidian

Abre Obsidian → **Abrir carpeta como bóveda** → selecciona `docs/`. La configuración compartida está en `docs/.obsidian/`; el estado local (`workspace.json`) no se versiona.

## Formato del código

`npx prettier --write .` aplica el formato definido en `.prettierrc.json` (se excluye `vendor/`).

## Publicar en Vercel

Al ser estático no hay build: `vercel.json` declara `framework: null`, sin `buildCommand` y con la raíz del repo como salida.

1. Sube el repositorio a GitHub (ver [[Git-y-GitHub]]).
2. En Vercel: **Add New → Project → Import** el repositorio. Deja _Framework Preset_ en **Other** y los comandos vacíos.
3. Cada `git push` a `main` despliega producción; las otras ramas generan previews.

Con la CLI: `npx vercel` (preview) y `npx vercel --prod`. La CLI crea `.vercel/` con los IDs del proyecto; está en `.gitignore`.

- `.vercelignore` deja fuera del despliegue `docs/`, `tests/`, `CLAUDE.md`, `README.md`, la configuración de formato y cualquier `*.pdf`: solo se sirve la app.
- `vercel.json` añade cabeceras de seguridad (`X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`) y una caché de 7 días para `vendor/`. El resto de archivos usa el sufijo `?v=N` (ver "Caché del navegador").
- La app no usa claves ni variables de entorno. Si algún día las necesita, van en _Settings → Environment Variables_ de Vercel, nunca en el repo.

También sirve en GitHub Pages (Settings → Pages → rama `main`, carpeta `/root`).
