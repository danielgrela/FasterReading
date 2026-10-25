# FasterReading

Lector RSVP (Rapid Serial Visual Presentation): sube un PDF, elige las palabras por minuto y léelo palabra a palabra en el centro de la pantalla. Todo se procesa **localmente en el navegador**, sin backend.

## Inicio rápido

```bash
python -m http.server 8000     # o: npx serve .
# abre http://localhost:8000
```

> Los módulos ES no funcionan abriendo `index.html` con doble clic (`file://`); hace falta un servidor local. Ver [docs/Setup.md](docs/Setup.md).

## Documentación

La carpeta `docs/` es un vault de Obsidian: en Obsidian elige **Abrir carpeta como bóveda** → `docs/` y empieza por [Home](docs/Home.md).

## Despliegue

Sitio estático sin build, listo para Vercel (importa el repo con el preset **Other**). Ver [docs/Setup.md](docs/Setup.md#publicar-en-vercel).
