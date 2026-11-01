# 📋 ESPECIFICACIÓN TÉCNICA: Expansión Multijugador en Red (HexFrontier)

## 1. Contexto y Estado Actual
Este documento define la evolución del sistema multijugador sobre la arquitectura existente en Supabase para **HexFrontier**. Actualmente contamos con tablas base para perfiles (`hf_players`), mapas comunitarios (`hf_community_maps`), puntuaciones (`hf_daily_scores`, `hf_map_scores`) y un esquema inicial 1v1 (`hf_online_matches`).

El objetivo es extender `hf_online_matches` (o adaptarla) para soportar partidas de **hasta 4 jugadores simultáneos**, fases iniciales simultáneas bajo niebla de guerra (*Fog of War*), temporizadores dinámicos por acción y resiliencia ante reconexiones móviles.

---

## 2. Actualización del Esquema de Base de Datos (Supabase / PostgreSQL)

Dado que la tabla actual `hf_online_matches` está pensada para 1v1 y estructuras básicas, debemos ampliarla o complementarla para gestionar múltiples jugadores y estados de tiempo.

### 2.1. Modificación de la tabla `hf_online_matches`
Ampliamos los campos JSONB y de estado para soportar 4 jugadores, turnos simultáneos y control de relojes.

```sql
-- Actualizar / Ampliar hf_online_matches para soporte multinivel (hasta 4 jugadores)
ALTER TABLE IF EXISTS hf_online_matches 
  ADD COLUMN IF NOT EXISTS max_players INT DEFAULT 4,
  ADD COLUMN IF NOT EXISTS players_data JSONB DEFAULT '[]'::jsonb, -- Array con info de los jugadores, turn_time_bank, is_ready, is_bot
  ADD COLUMN IF NOT EXISTS fog_of_war_data JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS game_phase VARCHAR(32) DEFAULT 'SIMULTANEOUS'; -- 'SIMULTANEOUS', 'TURN_BASED', 'FINISHED'

-- Asegurar índices si es necesario
CREATE INDEX IF NOT EXISTS idx_hf_online_status ON hf_online_matches(status);
```

Estructura esperada del JSONB `players_data`:
```json
[
  {
    "player_id": "HF-8429",
    "order": 1,
    "time_bank_seconds": 210,
    "is_ready": false,
    "is_bot": false,
    "color_hex": "#3b82f6"
  },
  ...
]
```

---

## 3. Lógica de Flujo de Partida

### 3.1. Fase 1: Turnos Simultáneos (Inicio)
1. Los jugadores se unen a la sala (`room_code`). Cuando se completan los 4 jugadores, la partida pasa a `status = 'ACTIVE'` y `game_phase = 'SIMULTANEOUS'`.
2. Todos mueven al mismo tiempo. Al terminar sus acciones, el cliente envía una orden RPC para marcar `is_ready = true` en su objeto dentro de `players_data`.
3. Cuando todos los jugadores activos tienen `is_ready: true`, el backend procesa los movimientos de forma atómica y reinicia las banderas a `false` incrementando `current_turn`.

### 3.2. Detección de "Primer Contacto"
* Al procesar los turnos simultáneos, el servidor evalúa las matrices de visión.
* Si una unidad de un jugador detecta el rango de otra facción, se actualiza `game_phase = 'TURN_BASED'`, se emite un evento por Supabase Realtime y la partida pasa a turnos individuales rotativos (`active_player`).

### 3.3. Fase 2: Turnos Individuales con Reloj Dinámico (+3s)
* **Banco de Tiempo:** Cada jugador arranca con 210 segundos en su `time_bank_seconds`.
* **Bonus:** Cada acción válida ejecutada mediante RPC añade **+3 segundos** al banco de tiempo del jugador activo.
* **Control:** Si el reloj del jugador llega a 0, el servidor activa automáticamente `is_bot = true` para ese usuario y ejecuta un movimiento básico de IA, permitiendo que la partida continúe para los demás.

---

## 4. Resiliencia en Móviles y Reconexiones

Para evitar que una llamada telefónica o salida a WhatsApp rompa la partida de los 4 usuarios:

1. **Supabase Realtime Presence:**
   * Los clientes se conectan al canal de la sala usando su `player_id` registrado en `hf_players`.
   * Si el socket se cierra por cambio de app, se emite un evento de ausencia, marcando al jugador como inactivo en la sesión sin sacarlo de la base de datos.
2. **Handshake de Reconexión (`localStorage` + Snapshot):**
   * El cliente guarda en su `localStorage` el `room_code` y su `player_id`.
   * Al regresar al navegador (`visibilitychange`), el cliente hace un `SELECT` inmediato de `hf_online_matches` para descargar el último `setup_json`, mapa y estado actual, re-renderizando el canvas en menos de 500ms.

---

## 5. Funciones RPC Requeridas en Supabase

El desarrollador deberá implementar funciones atómicas en PL/pgSQL para evitar condiciones de carrera:

1. **`fn_hf_submit_action(p_room_code, p_player_id, p_action_json)`**
   * Valida que sea el turno o la fase correcta.
   * Actualiza el estado del mapa en `setup_json`.
   * Actualiza el `time_bank_seconds` sumando +3s si corresponde.
   * Transmite el cambio vía Supabase Realtime Broadcast.

2. **`fn_hf_set_player_ready(p_room_code, p_player_id)`**
   * Cambia el estado `is_ready` a `true` en el array JSONB `players_data`.
   * Si todos están listos en fase simultánea, avanza el turno.