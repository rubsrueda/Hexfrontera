# Wrappers de Hexfrontier: Electron/Steam y Capacitor

Los wrappers alojan el runtime web; no contienen una versión independiente del juego. `scripts/stage-web.js` copia los recursos del proyecto a `www/` (salida generada, no editar a mano). Capacitor usa `webDir: www`.

## Windows / escritorio

Desde `wrappers/`, instala primero las dependencias de este paquete:

```bat
npm install
npm run stage
npm start
npm run dist
npm run steam
```

- `start` prepara `www/` e inicia Electron.
- `dist` genera el instalador Windows NSIS x64.
- `steam` genera el directorio Windows desempaquetado `dist/win-unpacked/` para preparar un depot. No carga ni publica archivos en SteamPipe.
- El config de Electron Builder también declara destinos macOS (DMG) y Linux (AppImage); no son una build móvil ni quedan validados por los comandos Windows anteriores.

## Android e iOS

```bat
npm run cap:add:android
npm run cap:android
```

`cap:android` vuelve a preparar `www/`, sincroniza el proyecto y abre Android Studio. El paquete no define un comando de APK/AAB firmado. Para compilar y firmar hay que completar la configuración del proyecto Android y usar Android Studio/SDK.

En macOS con Xcode:

```sh
npm run cap:add:ios
npm run cap:ios
```

No añadas `server.url` al config de una publicación. `www/` debe generarse de nuevo antes de sincronizar. El host nativo usa guardados locales; Electron almacena archivos en `userData/saves`.

## Estado y bloqueos observados (21-11-2026)

El usuario reporta que el juego pasó una prueba funcional manual en navegador, sin errores aparentes. No equivale a una ejecución automatizada ni valida wrappers. En la PC corporativa actual no se pueden instalar Node.js/npm ni Android SDK por falta de privilegios administrativos; builds y pruebas de plataforma se retomarán tras migrar el proyecto.

- **Android/APK:** Capacitor está declarado (`appId: com.hexfrontier.game`, `webDir: www`) y `@capacitor/android` está en dependencias. Aún no existe `wrappers/android/`; los scripts `cap:add:android` y `cap:android` están declarados, pero no hay comando APK/AAB ni firma de release. En la otra computadora: instalar Node.js 18+, npm, JDK y Android Studio/SDK; ejecutar `npm install` en `wrappers/`, `npm run cap:add:android` una vez y `npm run cap:android`; generar APK de prueba desde Android Studio o `.\gradlew.bat assembleDebug` dentro de `wrappers/android`. Release firmado requiere configurar la firma fuera del repositorio.
- **Steam/Windows x64:** `npm run steam` ejecuta stage y Electron Builder `--win --x64 --dir`; la salida configurada es `wrappers/dist/win-unpacked/`. Falta el archivo requerido `wrappers/build/icon.ico` (formato ICO); `electron-builder.yml` no fija medidas en píxeles. También faltan `build/icon.icns` y `build/icon.png`, pero corresponden a macOS/Linux, no al target Windows. La carpeta de build, runtime/dependencias y salida no están presentes. No hay configuración/manifiestos SteamPipe/depot ni comando de publicación: hacen falta para publicar, no para crear localmente la carpeta desempaquetada.
- **iOS:** el proyecto nativo no está generado; compilar requiere macOS y Xcode.

## Pruebas

Desde la raíz del proyecto, con Node.js disponible:

```bat
npm test
node tester_qa\platform_test.js
node tester_qa\saves_test.js
node tester_qa\boot_test.js
node tester_qa\telemetry_test.js
```

El runner descubre 58 archivos `tester_qa/*_test.js` según el diagnóstico estático; no se ejecutó en esta revisión. La configuración de plataforma está en `capacitor.config.json`, `electron/main.js` y `electron-builder.yml`. El reporte técnico de cierre y las tareas post-migración están en `resultados/02_cierre_fase4.md` y `Actividades/actividades_pendientes/`.
