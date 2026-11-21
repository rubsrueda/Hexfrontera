# Federati · Crónicas de la Frontera

Juego 4X táctico por turnos en hexágonos. Este documento resume el código y la configuración presentes; no certifica que el juego o sus servicios externos estén desplegados.

## Componentes

- **Partida local:** `index.html` carga el runtime global `HF`; `js/engine.js`, `js/ai.js`, `js/game.js` y `js/board.js` gestionan motor, IA, interfaz y tablero. La generación de mapas está en `js/mapgen.js`.
- **Diplomacia:** `js/diplomacy.js`, `js/diplomacy_ai.js` y `js/diplomacy_ui.js`; reglas y límites vigentes en [`arquitectura_diplomacia.md`](arquitectura_diplomacia.md).
- **Idiomas:** `js/i18n.js`, `js/i18n/` y la capa de compatibilidad; detalles en [`I18N.md`](I18N.md).
- **Cuenta y nube:** `js/cloud.js` y los esquemas de `sql/`; requieren Supabase configurado. No se garantiza que funciones remotas estén desplegadas.
- **Encuestas:** cliente en `js/event-feedback.js`; configuración y respuestas por Supabase RPC. Ver [`sql/EVENT_FEEDBACK.md`](sql/EVENT_FEEDBACK.md).
- **Pago web:** `js/payment.js` y la Edge Function `supabase/functions/paypal/`; precio configurado en cliente y servidor. Ver [`supabase/README.md`](supabase/README.md). El repositorio no acredita que PayPal esté operativo en producción.
- **Web/PWA y wrappers:** `manifest.json`, `sw.js` y `wrappers/`. Web y paquetes nativos son destinos distintos; los paquetes no se consideran verificados.

## Desarrollo y comprobaciones

Requiere Node.js 18 o posterior. Desde la raíz del proyecto, tras instalar dependencias:

```sh
npm install
npm run build       # genera dist/; la carpeta de salida puede reemplazarse
npm test            # tester_qa/run_all.js
npm run check:secrets
```

La batería descubre los archivos `tester_qa/*_test.js`. El usuario reporta que el juego pasó una prueba funcional manual en navegador, sin errores aparentes; no se ejecutaron pruebas automatizadas ni builds. En la PC corporativa actual no se pueden instalar Node.js/npm ni Android SDK por falta de privilegios administrativos; la validación técnica se retomará tras migrar a otra computadora. APK y Steam siguen sin build verificada. Consulta [`wrappers/README.md`](wrappers/README.md) y el cierre en [`resultados/02_cierre_fase4.md`](resultados/02_cierre_fase4.md).
