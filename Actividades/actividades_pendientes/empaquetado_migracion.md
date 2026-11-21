# Empaquetado post-migración — Android y Steam

**Agente:** empaquetado  
**Cuándo:** después de migrar Hexfrontier a una computadora con permisos y herramientas de build.

- Instalar Node.js 18+, npm, JDK y Android Studio/SDK.
- En `wrappers/`, instalar dependencias y generar Android una vez con `npm run cap:add:android`; luego ejecutar `npm run cap:android`.
- Añadir `wrappers/build/icon.ico` (ICO; dimensiones no fijadas por la configuración) y ejecutar `npm run steam` para Windows x64.
- Generar APK debug desde Android Studio o `.\gradlew.bat assembleDebug` dentro de `wrappers/android`; guardar artefactos fuera del repositorio si corresponde.
- Registrar versiones, comandos, rutas de salida y errores. No incluir credenciales/keystores.

**Aceptación:** existe APK debug instalable y carpeta `wrappers/dist/win-unpacked/`; se documentan resultados y bloqueos. Firma de release y SteamPipe quedan explícitamente aparte.
