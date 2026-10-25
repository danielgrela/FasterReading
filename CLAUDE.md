# FasterReading

Lector RSVP (palabra a palabra) de PDF en el navegador. Vanilla JS con módulos ES, sin build, sin backend y sin `npm install`.

## Dónde está cada cosa

- `js/reader.js`: motor RSVP (temporizador, play/pause/seek, pivote ORP). No toca el DOM.
- `js/pdf-extractor.js`: pdf.js → texto → `tokenize()` → `string[]`.
- `js/app.js`: UI, eventos, atajos de teclado, tema y `localStorage` (claves `fr.*`).
- `css/style.css`: los colores se definen como variables en `:root`, y `[data-theme="light"]` los cambia para el modo claro.
- `vendor/pdfjs/`: pdf.js vendorizado. **No editar**; ver `docs/Setup.md` para actualizarlo.
- `docs/`: bóveda de Obsidian con la documentación. Empieza por `docs/Home.md`.

## Comandos

- Servidor local: `python -m http.server 8000` (los módulos ES no funcionan con `file://`).
- Tests: `node tests/reader.test.mjs`
- Formato: `npx prettier --write .` (config en `.prettierrc.json`; ignora `vendor/` y `docs/.obsidian/`).

## Reglas de código

- Comentarios y textos de la UI en español.
- `reader.js` debe seguir sin depender del DOM, para poder probarlo con Node.
- Intervalo por palabra: `(60 / WPM) * 1000` ms, programado contra la marca absoluta `_nextAt`, no con `setTimeout` encadenados.
- Pasa Prettier y los tests antes de dar un cambio por terminado.

## Documentación (Obsidian)

- Todo cambio de código actualiza en el mismo encargo la nota de `docs/` correspondiente: `Arquitectura`, `Algoritmo-RSVP`, `Procesamiento-PDF`, `Uso` o `Setup`. Las tareas hechas se marcan en `Roadmap.md` y en las fases de `Home.md`.
- Enlaces entre notas con `[[Nombre]]`, sin `.md` ni ruta. Los enlaces a archivos de código van entre comillas invertidas.
- Cada nota empieza con propiedades YAML en formato de lista (`tags:` y, si hace falta, `aliases:`) y enlaza de vuelta a `[[Home]]`.
- Al renombrar o mover una nota, actualiza tú todos los `[[enlaces]]` que la apuntan: Obsidian solo lo hace solo cuando el cambio se hace desde su interfaz.
- Nota nueva → añádela al "Mapa de documentación" de `Home.md`.
- No tocar `docs/.obsidian/` salvo que se pida. La bóveda es `docs/`, nunca `docs/.obsidian/`.
- Nada de contraseñas, claves ni datos personales en `docs/`: se versiona en git.
