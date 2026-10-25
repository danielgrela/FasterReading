---
tags:
  - fasterreading
  - git
---

# Git y GitHub

Volver a [[Home]].

## Inicializar y primer commit

```bash
cd FasterReading
git init -b main
git add .
git status
git commit -m "feat: lector RSVP inicial con pdf.js"
```

## Subir a GitHub

Crea un repositorio vacío en GitHub (sin README) y luego:

```bash
git remote add origin https://github.com/TU_USUARIO/FasterReading.git
git push -u origin main
```

Con GitHub CLI: `gh repo create FasterReading --public --source=. --remote=origin --push`

## Identidad (si es la primera vez)

```bash
git config --global user.name "Tu Nombre"
git config --global user.email "tu@email.com"
```

## Convenciones

Mensajes tipo Conventional Commits (`feat:`, `fix:`, `docs:`). El `.gitignore` excluye:

- `node_modules/`, builds y logs.
- `.env` y `.env.*` (salvo `.env.example`).
- `*.pdf` personales (salvo `tests/fixtures/`).
- Estado local de Obsidian (`docs/.obsidian/workspace*.json`, `docs/.trash/`).
- Configuración local de Claude Code (`.claude/`, `CLAUDE.local.md`). `CLAUDE.md` sí se versiona.
- `.vercel/`, que crea la CLI de Vercel con los IDs del proyecto.

Antes del primer push, revisa `git status` y que no aparezca nada de lo anterior.

Ver también [[Setup]] para publicar en Vercel o GitHub Pages.
