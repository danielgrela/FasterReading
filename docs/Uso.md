---
tags:
  - fasterreading
  - uso
---

# Uso

Volver a [[Home]]. Instalación en [[Setup]].

## Pasos

1. **Subir PDF** (botón o arrastrando el archivo a la ventana).
2. Abre el menú **⚙ Opciones** (se despliega hacia arriba; se cierra al hacer clic fuera o con Escape) y ajusta el slider **Velocidad** (50–700 WPM) o escribe el valor en el cuadro de WPM: el slider lo sigue mientras escribes y, al pulsar Enter, se ajusta al rango.
3. **Play** para empezar, **Pause** para detener, **Reset** para volver a la primera palabra.
4. Usa la barra de progreso para saltar a cualquier punto.
5. **Ir a** (disponible salvo durante la reproducción): escribe un número de palabra (p. ej. `1200`) o una palabra, pulsa **Ir** o Enter y luego Play para seguir desde ahí.
   - Un número fuera de rango se ajusta a la primera o la última palabra.
   - Una palabra salta a su siguiente aparición tras la posición actual (vuelve al principio si hace falta). No distingue mayúsculas, tildes ni puntuación.
   - **Página** (junto a «Ir a»): escribe un número de página y pulsa **Ir** o Enter. Lleva a la primera línea de esa página, nunca a una palabra de la página anterior (si una palabra partida por guion empieza en la página anterior, cuenta como de esa página). Un número fuera de rango se ajusta a la primera o la última página; si la página no tiene texto (p. ej. una imagen), salta a la siguiente que lo tenga y lo avisa.

6. **Frases separadas** (casilla del menú **Opciones**): añade una pausa del doble de los ms/palabra (p. ej. 400 ms a 300 WPM) al final de cada frase y de cada párrafo, para asimilar lo leído. Viene activada por defecto; se puede activar o desactivar en plena lectura. Detalles en [[Algoritmo-RSVP]].

Arriba de la palabra, el contador **Palabra N de M · Página P de T · X % leído · ≈ Z min restantes** indica en qué palabra y en qué página del PDF va la lectura, qué porcentaje del documento se lleva leído (la palabra actual cuenta como leída) y cuánto tiempo aproximado queda para terminar al ritmo actual. Se actualiza en cada palabra, también al saltar, y el tiempo restante se recalcula al cambiar la velocidad o activar/desactivar «Frases separadas» (incluye esas pausas). Con menos de un minuto muestra `< 1 min`; a partir de una hora, `≈ 1 h 05 min`. Cálculo en [[Algoritmo-RSVP]].

Cada parte del contador se puede quitar desde **Opciones → Contador**: **Ocultar palabra**, **Ocultar página**, **Ocultar porcentaje de lectura** y **Ocultar tiempo restante**. Todas vienen desactivadas (el contador completo visible); si se ocultan las cuatro, el contador desaparece.

Encima de la palabra actual aparece la **anterior** y debajo la **siguiente**, más pequeñas y atenuadas: dan contexto sin quitar el foco del centro. En pantallas con poca altura (móvil en horizontal) se encogen y, si no caben sin tapar el contador, se ocultan. La casilla **Mostrar palabra anterior y siguiente** del menú **Opciones** (activada por defecto) las quita para ver solo la palabra actual.

En **Opciones → Texto** se elige el **Tipo de letra** de la palabra y de las de contexto (Monoespaciada, por defecto; Sans serif; Serif; Alta legibilidad, con letras más anchas y espaciadas) y su **Tamaño** (50–150 %, de 10 en 10). El tamaño es un porcentaje sobre el automático, que ya se adapta a la pantalla: al 100 % se ve como siempre. Las fuentes son del sistema, así que no se descarga nada. El contador y los controles no cambian.

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
- El WPM, el tema, el modo frases separadas, las palabras de contexto, el tipo de letra, el tamaño y las partes ocultas del contador se recuerdan en `localStorage` (`fr.font`: `mono`, `sans`, `serif` o `legible`; `fr.size`: porcentaje. `fr.breaks` y `fr.context`: solo `"0"` los desactiva; si no hay valor guardado, quedan activados. `fr.hideWord`, `fr.hidePage`, `fr.hidePercent` y `fr.hideTime`: solo `"1"` oculta la parte).
- En tablet y móvil la interfaz se adapta sola (vertical u horizontal); en pantallas táctiles no se muestra la ayuda de atajos.
- Mientras escribes en un cuadro de texto los atajos de teclado no se aplican.
