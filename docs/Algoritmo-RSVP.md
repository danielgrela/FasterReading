---
tags:
  - fasterreading
  - algoritmo
---

# Algoritmo RSVP

Volver a [[Home]]. Implementado en `js/reader.js` (ver [[Arquitectura]]).

## Fórmula

```
ms_por_palabra = (60 / WPM) * 1000
```

| WPM | ms   |
| --- | ---- |
| 50  | 1200 |
| 100 | 600  |
| 300 | 200  |
| 600 | 100  |
| 700 | ≈86  |

La UI limita la velocidad a 50–700 WPM.

## Bucle sin deriva

`setTimeout(fn, 200)` encadenado acumula retraso (el navegador siempre llega tarde unos ms). En su lugar se guarda una marca absoluta `_nextAt` y en cada tick:

```js
this._nextAt += msPerWord(this.wpm);
setTimeout(tick, Math.max(0, this._nextAt - performance.now()));
```

Así el error no se acumula y el promedio converge a la fórmula. Prueba medida: 20 palabras a 600 WPM → 1996 ms (esperado 2000).

Si la pestaña queda en segundo plano y el retraso supera 250 ms, se resincroniza para no lanzar una ráfaga de palabras.

## Cambio de WPM en caliente

`setWpm()` reprograma el siguiente tick con el nuevo intervalo sin reiniciar la lectura.

`seek()` hace lo mismo si se salta durante la reproducción (←/→ o la barra de progreso): cancela el temporizador pendiente y la palabra de destino dura su intervalo completo, en vez de heredar lo que le quedaba a la anterior.

## Modo frases separadas

Opcional y activado por defecto (casilla **Frases separadas** en [[Uso]]). Con `setBreakFactor(factor)` el motor añade una pausa extra de `factor` veces los ms/palabra (2 desde la UI: el doble de los ms/palabra, así escala con la velocidad) tras la palabra que cierra una frase o un párrafo. `delayAfter(i)` da el tiempo total que la palabra `i` queda en pantalla, y sustituye a `msPerWord()` en todos los cálculos de `_nextAt`, así que el bucle sigue sin deriva:

```
delayAfter(i) = msPerWord(wpm) + (fin de frase o de párrafo ? breakFactor * msPerWord(wpm) : 0)
```

- **Fin de frase**: `endsSentence(word)` → la palabra termina en `.` `!` `?` o `…`, aunque detrás haya comillas o paréntesis de cierre (`¡ya!»`, `dijo.)`). No cuentan las iniciales (`J.`) ni abreviaturas frecuentes (`Sr.`, `Dra.`, `pág.`…). `etc.` queda fuera a propósito, porque suele cerrar frase.
- **Fin de párrafo**: los índices que `Reader.load(words, paragraphEnds)` recibe de `tokenizeWithBreaks()` (ver [[Procesamiento-PDF]]). Cubre títulos sin punto final.
- Tras la última palabra del documento no hay pausa. Durante la pausa sigue visible la última palabra de la frase.

## Tiempo restante

`Reader.remainingMs()` estima cuánto falta para terminar desde la palabra actual (incluida) al WPM actual, con las pausas de frases separadas si están activas. Es la suma de `delayAfter(i)` hasta el final, pero en O(1): al hacer `load()` se precalcula `_breaksFrom[i]`, el número de palabras con pausa de frase o párrafo desde `i` (sin contar la última), que solo depende del texto:

```
remainingMs = (total - index) * msPerWord(wpm) + _breaksFrom[index] * breakFactor * msPerWord(wpm)
```

`formatRemaining(ms)` lo convierte en texto aproximado para el contador de [[Uso]]: minutos redondeados hacia arriba (`≈ 12 min`, `≈ 1 h 05 min`) o `< 1 min`. No cuenta el tiempo en pausa: es lo que falta leyendo sin parar.

## Ir a una palabra

`findTarget(words, query, from)` (en `reader.js`, sin DOM) traduce lo que escribe el usuario en un índice:

- Solo dígitos → posición 1-based, acotada a `[0, words.length - 1]`.
- Texto → siguiente palabra igual a partir de `from + 1`, dando la vuelta al final. Se compara en minúsculas, sin tildes y sin signos de puntuación.
- Devuelve `-1` si no hay coincidencia. `app.js` hace `seek()` con el índice; la UI lo desactiva durante la reproducción.

## Páginas

Funciones sin DOM de `reader.js` que trabajan sobre `pageStarts` (índice de la primera palabra de cada página, de `tokenizePages()`; ver [[Procesamiento-PDF]]):

- `pageAt(pageStarts, index)` → página 0-based de la palabra `index`: la última cuyo inicio es `<= index` (búsqueda binaria). Una página sin texto comparte inicio con la siguiente, así que nunca se devuelve. Alimenta el contador «Página P de T».
- `findPage(pageStarts, page, total)` → `{ index, page }` para «Ir a página»: `page` es 1-based y se acota a `[1, pageStarts.length]`; `index` es la primera palabra de esa página (su primera línea), y `page` la página a la que realmente se llega (la siguiente con texto si la pedida está vacía). Devuelve `null` si no hay texto desde esa página hasta el final.

## Pivote ORP

El ojo reconoce mejor una palabra fijando una letra cerca del primer tercio. `pivotIndex()`:

| Longitud | Índice pivote |
| -------- | ------------- |
| 1        | 0             |
| 2–5      | 1             |
| 6–9      | 2             |
| 10–13    | 3             |
| 14+      | 4             |

Se renderiza como `[izquierda][pivote][derecha]` en un grid `minmax(0, 1fr) auto minmax(0, 1fr)`, de modo que la letra roja queda siempre en el centro exacto, aunque una mitad de la palabra sea mucho más larga que la otra. Las marcas de fijación son `::before`/`::after` de la propia letra pivote (`.w-pivot` en `css/style.css`), así que quedan justo encima y debajo de ella a cualquier tamaño de letra y nunca tapan la palabra. Más allá de las marcas se muestran la palabra anterior (encima) y la siguiente (debajo), pequeñas y atenuadas, como contexto periférico; detalles en [[Arquitectura]].

Relacionado: [[Procesamiento-PDF]] genera la lista de palabras que consume este motor.
