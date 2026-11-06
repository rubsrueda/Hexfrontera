# Wrappers de Hexfrontier · Electron/Steam + Capacitor

Este directorio **no contiene código del juego**: empaqueta `../` (el shell web
tal cual) sin bundlers. El juego sigue siendo el de siempre; aquí solo hay
procesos anfitriones.

```
wrappers/
├── package.json            Electron + Capacitor + scripts
├── capacitor.config.json   webDir: www (generado)
├── electron-builder.yml    NSIS / dir (Steam) / dmg / AppImage
├── scripts/stage-web.js    copia runtime → www/
├── electron/main.js        ventana, protocolo app://, IPC, cierre ordenado
├── electron/preload.js     contextBridge (única superficie Node ↔ renderer)
├── electron/saves.js       guardado atómico en userData/saves
└── www/                    generado por `npm run stage` (no editar a mano)
```

## Escritorio

```bat
npm install
npm start                  :: stage + Electron (carga www/)
npm start -- --devtools
npm run dist               :: instalador NSIS x64 → dist/
npm run steam              :: carpeta para el depot → dist/win-unpacked/
```

- El juego se sirve desde `app://hexfrontier/index.html`, no desde `file://`.
- Guardados: `%APPDATA%\Hexfrontier\saves\hf_*.json`
  (`app.getPath('userData')`). En macOS/Linux, la ruta equivalente.
- **Steam Auto-Cloud**: root `WinAppDataRoaming`, subdir `Hexfrontier`,
  pattern `saves/*.json` (y `saves/*.tmp`, recursive). No requiere código.
- `steam_appid.txt` solo para pruebas locales; no se sube al depot.
- Si el overlay de Steam no aparece: `set HF_STEAM_OVERLAY=1` antes de arrancar.

## Móvil

```bat
npm install
npm run stage
npx cap add android
npx cap add ios            :: macOS + Xcode
npm run cap:android        :: stage + sync + abre Android Studio
npm run cap:ios            :: stage + sync + abre Xcode
```

- `webDir` es `www/`: **siempre** `npm run stage` antes de `cap sync`.
- No añadas `server.url` al config: dejaría la app publicada apuntando al
  dev-server.
- Los guardados usan localStorage (síncrono) con espejo en
  `LIBRARY/saves/` vía Filesystem; `HF.platform.ready` restaura antes del Hub.

## Diagnóstico rápido

| Síntoma | Causa probable | Solución |
|---|---|---|
| Ventana en blanco en Electron | `www/` vacío o ruta mal | `npm run stage`; revisar `WEB_DIR` |
| Ventana en blanco en Android | `webDir` sin generar | `npm run stage && npx cap sync` |
| Guardados no persisten en Electron | `HFNative` no inyectado | cargar `preload.js`; revisar `contextIsolation` |
| Música no suena en la app | sin red (Wikimedia) | cae al sintetizador procedural; vendorizar pistas si se quiere offline |
| CSP bloquea algo | nueva API/arte remoto | ampliar `connect-src`/`img-src` en `electron/main.js` o `HF_NO_CSP=1` |
| Tras actualizar sigo viendo el JS viejo | service worker de la versión web | en nativo `sw.js` no se incluye ni se registra; en web subir `sw.js` |

## Pruebas

Desde `../` (la raíz del juego):

```bat
node tester_qa\run_all.js          :: toda la batería (21 suites)
node tester_qa\platform_test.js    :: puente, pausa y cierre
node tester_qa\saves_test.js       :: atomicidad y validación de claves
node tester_qa\boot_test.js        :: arranque web completo
node tester_qa\telemetry_test.js   :: interceptor de errores y copia de emergencia
```

El wrapper móvil usa Filesystem: recuerda el `PrivacyInfo.xcprivacy` descrito
en `../FASE4_CI_TELEMETRIA.md` y en la documentación de Capacitor.
