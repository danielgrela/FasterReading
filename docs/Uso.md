---
tags:
  - fasterreading
  - uso
---

# Uso

Volver a [[Home]]. Instalación en [[Setup]].

## Pasos

1. **Subir PDF** (botón o arrastrando el archivo a la ventana).
2. Ajusta el slider **Velocidad** (50–700 WPM) o escribe el valor en el cuadro de WPM: el slider lo sigue mientras escribes y, al pulsar Enter, se ajusta al rango.
3. **Play** para empezar, **Pause** para detener, **Reset** para volver a la primera palabra.
4. Usa la barra de progreso para saltar a cualquier punto.
5. **Ir a** (disponible salvo durante la reproducción): escribe un número de palabra (p. ej. `1200`) o una palabra, pulsa **Ir** o Enter y luego Play para seguir desde ahí.
   - Un número fuera de rango se ajusta a la primera o la última palabra.
   - Una palabra salta a su siguiente aparición tras la posición actual (vuelve al principio si hace falta). No distingue mayúsculas, tildes ni puntuación.

6. **Frases separadas** (casilla del panel): añade una pausa de 1 segundo al final de cada frase y de cada párrafo, para asimilar lo leído. Viene activada por defecto; se puede activar o desactivar en plena lectura. Detalles en [[Algoritmo-RSVP]].

Arriba de la palabra, el contador **Palabra N de M** indica en qué palabra va la lectura; se actualiza en cada palabra, también al saltar.

## Atajos

| Tecla   | Acción             |
| ------- | ------------------ |
| Espacio | Play / Pause       |
| R       | Reset              |
| ← / →   | −10 / +10 palabras |
| ↑ / ↓   | +10 / −10 WPM      |

## Notas

- La letra roja es el punto de reconocimiento óptimo ([[Algoritmo-RSVP]]); mantén la vista fija en el centro.
- Los PDF escaneados (solo imagen) no tienen texto: ver limitaciones en [[Procesamiento-PDF]].
- El WPM, el tema y el modo frases separadas se recuerdan en `localStorage` (`fr.breaks`: solo `"0"` lo desactiva; si no hay valor guardado, queda activado).
- En tablet y móvil la interfaz se adapta sola (vertical u horizontal); en pantallas táctiles no se muestra la ayuda de atajos.
- Mientras escribes en un cuadro de texto los atajos de teclado no se aplican.
