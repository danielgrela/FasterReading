---
tags:
  - fasterreading
  - index
  - proyecto
aliases:
  - 00_Indice
  - PDF Speed Reader
estado: activo
---

# FasterReading

Lector de lectura rápida (RSVP) en el navegador. Sube un PDF, elige la velocidad y pulsa Play.

## Objetivo

Aplicación web minimalista que permite subir un PDF y leerlo mediante Presentación Visual Serial Rápida (RSVP): cada palabra aparece en el centro de la pantalla a una velocidad configurable en WPM (palabras por minuto).

## Mapa de documentación

- [[Setup]] — cómo ejecutarlo en local y publicarlo en Vercel
- [[Uso]] — guía de usuario y atajos de teclado
- [[Arquitectura]] — módulos, flujo de datos y decisiones
- [[Algoritmo-RSVP]] — fórmula de tiempo, bucle de renderizado y pivote ORP
- [[Procesamiento-PDF]] — extracción de texto con pdf.js
- [[Git-y-GitHub]] — comandos para versionar el proyecto
- [[Roadmap]] — mejoras futuras

## Stack técnico

- **Frontend:** Vanilla JS (módulos ES), HTML5, CSS3. Sin build ni backend.
- **PDF:** pdf.js vendorizado en `vendor/pdfjs/`; la extracción es 100% local.
- **UI:** minimalista, modo oscuro por defecto, palabra centrada con pivote ORP.
- **Tiempo por palabra:** `(60 / WPM) * 1000` ms.

## Fases del proyecto

- [x] Definición de requisitos
- [x] Estructura base del repositorio — ver [[Arquitectura]]
- [x] Motor de extracción PDF — ver [[Procesamiento-PDF]]
- [x] Lógica WPM y bucle de renderizado — ver [[Algoritmo-RSVP]]
- [x] UI: modo oscuro, controles y atajos — ver [[Uso]]
- [x] Diseño responsive (tablet 16:9 y móvil) — ver [[Arquitectura]]
- [x] Control de versiones en GitHub (`danielgrela/FasterReading`) — ver [[Git-y-GitHub]]
- [ ] Mejoras futuras — ver [[Roadmap]]
