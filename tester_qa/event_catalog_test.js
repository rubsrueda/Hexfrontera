'use strict';
// Catálogo de eventos: los 5 disparadores actuales deben estar dados de alta en
// hf_event_types, con FK desde hf_campaign_events y vista de uso.
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PG = path.join(ROOT, 'sql', 'event_feedback.sql');
const LIST = path.join(ROOT, 'sql', 'list_event_feedback.sql');
const MSSQL = path.join(ROOT, 'sql', 'sqlserver', 'schema.sql');
const EVENTS = ['GAME_ENTRY', 'MATCH_OVER', 'TRIBE_MODIFIED', 'MAP_EDIT_COMPLETE', 'REPLAY_FINISHED'];

let fail = 0;
const ok = (cond, msg) => { if (cond) console.log('ok   ' + msg); else { console.error('FAIL: ' + msg); fail++; } };

const pg = fs.readFileSync(PG, 'utf8');
ok(/CREATE TABLE IF NOT EXISTS public\.hf_event_types/.test(pg), 'PostgreSQL crea hf_event_types');
for (const ev of EVENTS) {
  ok(new RegExp("\\('" + ev + "',").test(pg), 'el catálogo incluye ' + ev);
}
ok(/ADD CONSTRAINT hf_campaign_events_type_fk/.test(pg), 'hf_campaign_events referencia el catálogo');
ok(/CREATE OR REPLACE VIEW public\.hf_v_event_type_usage/.test(pg), 'existe la vista de uso por evento');
ok(/JOIN public\.hf_event_types et ON et\.event_type = ce\.event_type/.test(pg),
  'la RPC de lectura exige un tipo del catálogo');

const list = fs.readFileSync(LIST, 'utf8');
ok(/FROM public\.hf_v_event_type_usage/.test(list), 'la consulta de listado usa la vista de uso');
ok(/WHERE NOT EXISTS/.test(list), 'la consulta muestra tipos sin campaña');

const ms = fs.readFileSync(MSSQL, 'utf8');
ok(/CREATE TABLE dbo\.hf_event_types/.test(ms), 'SQL Server crea dbo.hf_event_types');
for (const ev of EVENTS) {
  ok(new RegExp("N'" + ev + "'").test(ms), 'SQL Server incluye ' + ev);
}
ok(/FOREIGN KEY \(event_type\) REFERENCES dbo\.hf_event_types/.test(ms),
  'SQL Server referencia el catálogo');

console.log(fail ? '\nCON FALLOS (' + fail + ')' : '\nTODO OK');
process.exit(fail ? 1 : 0);
