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

## Modo frases separadas

Opcional y activado por defecto (casilla **Frases separadas** en [[Uso]]). Con `setBreakPause(ms)` el motor añade una pausa extra (1000 ms desde la UI) tras la palabra que cierra una frase o un párrafo. `delayAfter(i)` da el tiempo total que la palabra `i` queda en pantalla, y sustituye a `msPerWord()` en todos los cálculos de `_nextAt`, así que el bucle sigue sin deriva:

```
delayAfter(i) = msPerWord(wpm) + (fin de frase o de párrafo ? breakPause : 0)
```

- **Fin de frase**: `endsSentence(word)` → la palabra termina en `.` `!` `?` o `…`, aunque detrás haya comillas o paréntesis de cierre (`¡ya!»`, `dijo.)`). No cuentan las iniciales (`J.`) ni abreviaturas frecuentes (`Sr.`, `Dra.`, `pág.`…). `etc.` queda fuera a propósito, porque suele cerrar frase.
- **Fin de párrafo**: los índices que `Reader.load(words, paragraphEnds)` recibe de `tokenizeWithBreaks()` (ver [[Procesamiento-PDF]]). Cubre títulos sin punto final.
- Tras la última palabra del documento no hay pausa. Durante la pausa sigue visible la última palabra de la frase.

## Ir a una palabra

`findTarget(words, query, from)` (en `reader.js`, sin DOM) traduce lo que escribe el usuario en un índice:

- Solo dígitos → posición 1-based, acotada a `[0, words.length - 1]`.
- Texto → siguiente palabra igual a partir de `from + 1`, dando la vuelta al final. Se compara en minúsculas, sin tildes y sin signos de puntuación.
- Devuelve `-1` si no hay coincidencia. `app.js` hace `seek()` con el índice; la UI lo desactiva durante la reproducción.

## Pivote ORP

El ojo reconoce mejor una palabra fijando una letra cerca del primer tercio. `pivotIndex()`:

| Longitud | Índice pivote |
| -------- | ------------- |
| 1        | 0             |
| 2–5      | 1             |
| 6–9      | 2             |
| 10–13    | 3             |
| 14+      | 4             |

Se renderiza como `[izquierda][pivote][derecha]` en un grid `minmax(0, 1fr) auto minmax(0, 1fr)`, de modo que la letra roja queda siempre en el centro exacto, aunque una mitad de la palabra sea mucho más larga que la otra. Las marcas de fijación son `::before`/`::after` de la propia letra pivote (`.w-pivot` en `css/style.css`), así que quedan justo encima y debajo de ella a cualquier tamaño de letra y nunca tapan la palabra.

Relacionado: [[Procesamiento-PDF]] genera la lista de palabras que consume este motor.
