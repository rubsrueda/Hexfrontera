# Diplomacia: estado técnico vigente

**Fuente de verdad:** `js/diplomacy.js`, `js/diplomacy_ai.js`, `js/diplomacy_ui.js`, su inclusión en `index.html` y `tester_qa/diplomacy_test.js`. Este resumen describe el código presente; la prueba automatizada no se ejecutó en la revisión del 21-11-2026.

## Integración

`index.html` carga `diplomacy.js`, `diplomacy_ai.js` y `diplomacy_ui.js` tras `engine.js` y antes de `ai.js`. Los módulos amplían el namespace global `HF`; `engine.js`, IA, tablero e interfaz consumen sus APIs. `diplomacy_ui.js` aporta el panel y el overlay de fronteras del PNA.

## Sistemas implementados en el código

- **Tratados:** PNA, comercio, préstamos y treguas; propuestas, respuesta/negociación, expiración e historial. Los tratados son estado de partida y se migran/normalizan para partidas guardadas, undo y formatos anteriores.
- **PNA / Pacto Sagrado:** duración y expiración, bloqueo fronterizo opcional, opción de compartir visión y penalización de ruptura. `breakPenalty: 0` se presenta como Pacto Sagrado; `HF.Diplomacy.canAttack()` es la comprobación que debe gobernar los ataques.
- **Comercio:** rutas por tratado, valor por turno e interdicción; el código integra flujos de recursos.
- **Préstamos:** mercado limitado de ofertas/solicitudes, pagos, deuda y estados de mora/incumplimiento.
- **Evaluación diplomática:** amenaza, confianza y disposición influyen en las propuestas. La IA considera flancos, objetivo de guerra, tregua bajo presión, asimetrías de recursos y necesidades de préstamo.
- **Resiliencia de estado:** `ensure()` normaliza mapas/arrays y estructura heredada; la serialización conserva la diplomacia para cargar y deshacer.

Los límites de tratados y el balance inicial están en `js/diplomacy.js` (`defaultCfg()`); el comportamiento de IA está en `js/diplomacy_ai.js`. No dupliques esos valores aquí: modifica y prueba la fuente de código.

## Comprobación disponible

`tester_qa/diplomacy_test.js` cubre turnos de IA, tratados, serialización, undo, formatos antiguos, bloqueos de ataque, comercio, préstamos, aislamiento de errores y render. Ejecutar desde la raíz con Node.js:

```sh
node tester_qa/diplomacy_test.js
```

No se ejecutó porque Node.js/npm no estaban disponibles. La existencia de la prueba no equivale a aprobación de ejecución.
