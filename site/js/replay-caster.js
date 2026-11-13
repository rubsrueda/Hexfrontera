/* ===========================================================================
 * replay-caster.js — Federati: Replay Audio Caster (só audio)
 * ---------------------------------------------------------------------------
 * Consome o log determinista da repetición e relata SÓ os fitos dramáticos
 * obrigatorios:
 *
 *   1. supply      — bloqueo de suministros / números rojos ao pechar o turno
 *   2. expansion   — expansión territorial masiva ao pechar o turno
 *   3. keyPoints   — control de yacimientos de oro / bosques de madera
 *   4. siege       — cerco táctico / ratonera (unidade sen saída)
 *   5. massacre    — unidade borrada do taboleiro
 *   6. cityFall    — caída de capital / cidade / bastión
 *   7. rhythm      — contragolpe tras varios turnos de defensa pasiva
 *   8. pyrrhic     — gañar terreo perdendo a maioría das tropas
 *   9. finalSummary— silbatazo final con estatísticas da partida
 *
 * Regras:
 *   · NON se pinta texto, subtítulos nin rexistros. O guión só vai ao TTS.
 *   · O log non se modifica: simúlase nunha partida sombra para indexar fitos.
 *   · O cliente non decide o resultado: o estado xa vén do motor.
 *
 * Cárgase despois de js/replay.js e js/replay-caster-langs.js.
 * =========================================================================== */
(function (G) {
  const HF = G.HF = G.HF || {};
  const L = HF.REPLAY_CASTER_LANGS || {};
  const TAGS = L.TAGS || {};
  const UNITS = L.UNITS || {};
  const NEUTRAL = L.NEUTRAL || {};
  const PLACES = L.PLACES || {};
  const BANK = L.BANK || {};
  const STYLE = L.STYLE || {};

  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const cfg = () => (HF.CFG && HF.CFG.replayCaster) || {};

  // ---------------------------------------------------------------------------
  // 1. Guión interno (nunca se pinta)
  // ---------------------------------------------------------------------------
  function fill(tpl, vars) {
    return String(tpl || '').replace(/\{(\w+)\}/g, (_, key) => {
      const v = vars[key];
      return v == null ? '' : String(v);
    });
  }

  function lineFor(lang, ev) {
    const code = BANK[lang] ? lang : 'en';
    const bank = BANK[code] || BANK.en || {};
    const list = bank[ev && ev.type] || (BANK.en && BANK.en[ev.type]) || [];
    if (!list.length) return '';
    const tpl = list[(ev && ev.at ? ev.at : 0) % list.length];
    const unit = ev && ev.unitType ? ((UNITS[code] || UNITS.en || {})[ev.unitType] || (UNITS.en || {}).INF || '') : '';
    const place = ev && ev.placeType ? ((PLACES[code] || PLACES.en || {})[ev.placeType] || (PLACES.en || {}).city || '') : '';
    return fill(tpl, {
      actor: ev && ev.actor ? ev.actor : '',
      victim: ev && ev.victim ? ev.victim : (NEUTRAL[code] || NEUTRAL.en || ''),
      unit: unit,
      place: place,
      turn: ev && ev.turn ? ev.turn : 1,
      gain: ev && ev.gain != null ? ev.gain : 0,
      key: ev && ev.key != null ? ev.key : 0,
      lost: ev && ev.lost != null ? ev.lost : 0,
      // Saldo al pechar o turno (expansión) e comparativa final.
      cities: ev && ev.cities != null ? ev.cities : (ev && ev.wcities != null ? ev.wcities : 0),
      gold: ev && ev.gold != null ? ev.gold : (ev && ev.wgold != null ? ev.wgold : 0),
      food: ev && ev.food != null ? ev.food : (ev && ev.wfood != null ? ev.wfood : 0),
      wood: ev && ev.wood != null ? ev.wood : (ev && ev.wwood != null ? ev.wwood : 0),
      units: ev && ev.units != null ? ev.units : (ev && ev.wunits != null ? ev.wunits : 0),
      recursos: ev && ev.recursos != null ? ev.recursos :
        (ev ? (+ev.gold || 0) + (+ev.food || 0) + (+ev.wood || 0) : 0),
      hexes: ev && ev.hexes != null ? ev.hexes : 0,
      perdidas: ev && ev.perdidas != null ? ev.perdidas : 0,
      perdidasFacción: ev && ev.perdidasFacción != null ? ev.perdidasFacción : 0,
      unidadesPerdidas: ev && ev.unidadesPerdidas != null ? ev.unidadesPerdidas : (ev && ev.perdidas != null ? ev.perdidas : 0),
      wcities: ev && ev.wcities != null ? ev.wcities : 0,
      lcities: ev && ev.lcities != null ? ev.lcities : 0,
      wgold: ev && ev.wgold != null ? ev.wgold : 0,
      wfood: ev && ev.wfood != null ? ev.wfood : 0,
      wwood: ev && ev.wwood != null ? ev.wwood : 0,
      lgold: ev && ev.lgold != null ? ev.lgold : 0,
      lfood: ev && ev.lfood != null ? ev.lfood : 0,
      lwood: ev && ev.lwood != null ? ev.lwood : 0,
      wunits: ev && ev.wunits != null ? ev.wunits : 0,
      lunits: ev && ev.lunits != null ? ev.lunits : 0
    });
  }

  // ---------------------------------------------------------------------------
  // 2. Instantánea de estado e detección
  // ---------------------------------------------------------------------------
  function snapshot(g) {
    const f = (g.f || []).map(x => ({
      alive: !!x.alive, name: x.name || '',
      terr: 0, hexes: 0, units: 0, cities: 0, bastions: 0,
      gold: +x.gold || 0, food: +x.food || 0, wood: +x.wood || 0,
      recursos: (+x.gold || 0) + (+x.food || 0) + (+x.wood || 0),
      deficit: !!x.deficit, keyGold: 0, keyWood: 0
    }));
    const cells = (g.cells || []).map(c => {
      if (!c) return null;
      if (c.o >= 0 && f[c.o]) {
        f[c.o].terr++;
        if (HF.B && c.b === HF.B.CIUDAD) f[c.o].cities++;
        if (HF.B && c.b === HF.B.BASTION) f[c.o].bastions++;
        if (HF.RES && c.res === HF.RES.ORO) f[c.o].keyGold++;
        if ((HF.RES && c.res === HF.RES.MADERA) || (HF.B && c.b === HF.B.ARBOL)) f[c.o].keyWood++;
      }
      if (c.u && c.u.owner >= 0 && f[c.u.owner]) f[c.u.owner].units++;
      return {
        o: c.o, b: c.b, cap: !!c.cap, res: c.res,
        u: c.u ? { owner: c.u.owner, type: c.u.type, tier: c.u.tier || 1 } : null
      };
    });
    const encircled = [];
    if (HF.isEncircled) {
      for (let i = 0; i < (g.cells || []).length; i++) {
        const c = g.cells[i];
        if (!c || !c.u) continue;
        let enc = false;
        try { enc = HF.isEncircled(g, i); } catch (e) { enc = false; }
        if (enc) encircled.push({ cell: i, owner: c.u.owner, type: c.u.type, tier: c.u.tier || 1 });
      }
    }
    // Hexágonos de cada jugador ao peche do turno/estado actual.
    f.forEach(x => { x.hexes = x.terr; });
    return {
      turn: g.turn || 1, cur: g.cur,
      cells: cells, f: f, encircled: encircled,
      over: g.over ? { winner: g.over.winner, won: !!g.over.won, reason: g.over.reason } : null
    };
  }

  function strongest(after, skip) {
    let best = -1, n = -1;
    (after.f || []).forEach((x, i) => {
      if (i === skip || !x.alive) return;
      if (x.terr > n || (x.terr === n && best < 0)) { best = i; n = x.terr; }
    });
    if (best < 0 && after.f && after.f.length) best = 0;
    return best;
  }

  const unitRank = u => (u.tier || 1) * 10 + ({ SIE: 5, CAB: 4, BAR: 4, ARC: 3, ENG: 2, INF: 1 }[u.type] || 0);

  // Acontecementos militares por acción: caída de cidade/bastión, masacre e
  // cerco. As capturas rutinarias de casillas NON se relatan.
  function detect(before, after, t, at) {
    if (!before || !after || !t) return null;
    const to = t[0] === 1 ? t[2] : null;
    const from = t[0] === 1 ? t[1] : null;

    // 1) Caída de capital / cidade / bastión.
    if (to != null && before.cells[to] && after.cells[to]) {
      const b = before.cells[to], a = after.cells[to];
      if (b.o !== a.o && a.o >= 0) {
        let place = null;
        if (b.cap) place = 'capital';
        else if (HF.B && b.b === HF.B.CIUDAD) place = 'city';
        else if (HF.B && b.b === HF.B.BASTION) place = 'bastion';
        if (place) {
          return {
            at: at, type: 'cityFall', placeType: place,
            actor: after.f[a.o] ? after.f[a.o].name : '',
            victim: b.o >= 0 && before.f[b.o] ? before.f[b.o].name : '',
            turn: after.turn, cell: to
          };
        }
      }

      // 2) massacre: o defensor da casilla obxectivo desaparece.
      if (b.u && (!a.u || a.u.owner !== b.u.owner)) {
        const victimId = b.u.owner;
        const actorId = a.o >= 0 ? a.o : (a.u ? a.u.owner : -1);
        return {          
          at: at, type: 'massacre',
          actor: after.f[actorId] ? after.f[actorId].name : '',
          victim: after.f[victimId] ? after.f[victimId].name : '',
          unitType: b.u.type, tier: b.u.tier,
          turn: after.turn, cell: to
        };
      }
    }
    
    // 3) O atacante moveuse pero non chegou (trampa / morte no traxecto).
    if (from != null && before.cells[from] && after.cells[from]) {
      const bf = before.cells[from], af = after.cells[from];
      if (bf.u && !af.u) {
        const arrived = to != null && after.cells[to] && after.cells[to].u &&
          after.cells[to].u.owner === bf.u.owner && after.cells[to].u.type === bf.u.type;
        if (!arrived) {
          const actorId = before.cur !== bf.u.owner ? before.cur : strongest(after, bf.u.owner);
          return {
            at: at, type: 'massacre', //massacre
            actor: after.f[actorId] ? after.f[actorId].name : '',
            victim: after.f[bf.u.owner] ? after.f[bf.u.owner].name : '',
            unitType: bf.u.type, tier: bf.u.tier,
            turn: after.turn, cell: from
          };
        }
      }
    }

    // 4) Fase: capitulacións, desertións, eliminacións. Calquera unidade que
    // desaparece ou cambia de dono sen ser unha acción de movemento.
    if (t[0] === 4) {
      let dead = null;
      for (let i = 0; i < before.cells.length; i++) {
        const b = before.cells[i], a = after.cells[i];
        if (!b || !b.u || !a) continue;
        if (!a.u || a.u.owner !== b.u.owner) {
          if (!dead || unitRank(b.u) > unitRank(dead.u)) dead = { i: i, u: b.u, a: a };
        }
      }
      if (dead) {
        const actorId = dead.a.o >= 0 && dead.a.o !== dead.u.owner ? dead.a.o : (before.cur !== dead.u.owner ? before.cur : strongest(after, dead.u.owner));
        return {
          at: at, type: 'massacre', //massacre
          actor: after.f[actorId] ? after.f[actorId].name : '',
          victim: after.f[dead.u.owner] ? after.f[dead.u.owner].name : '',
          unitType: dead.u.type, tier: dead.u.tier,
          turn: after.turn, cell: dead.i
        };
      }
    }

    // 5) Cerco / ratonera: unidades que quedan sen saída.
    const was = new Set((before.encircled || []).map(e => e.cell));
    const newly = (after.encircled || []).filter(e => !was.has(e.cell));
    if (newly.length) {
      newly.sort((a, b) => (b.tier || 1) - (a.tier || 1));
      const e = newly[0];
      const actorId = before.cur !== e.owner ? before.cur : strongest(after, e.owner);
      return {
        at: at, type: 'siege',
        actor: after.f[actorId] ? after.f[actorId].name : '',
        victim: after.f[e.owner] ? after.f[e.owner].name : '',
        unitType: e.type, tier: e.tier,
        turn: after.turn, cell: e.cell
      };
    }
    return null;
  }

  // Resumo táctico ao pechar unha fase/turno. Un só fito por fase, por orde
  // dramática: contragolpe > suministro > victoria pírrica > expansión > puntos.
  function phaseSummary(p0, after, who, passive, at) {
    if (!p0 || !after || !after.f[who] || !p0.f[who]) return null;
    const gain = (after.f[who].terr || 0) - (p0.f[who].terr || 0);
    const key = ((after.f[who].keyGold || 0) + (after.f[who].keyWood || 0)) -
      ((p0.f[who].keyGold || 0) + (p0.f[who].keyWood || 0));
    // Unidades perdidas no turno: neto por xogador e total de todos.
    const perdidasPorJugador = (after.f || []).map((x, i) => {
      const before = p0.f && p0.f[i] ? (p0.f[i].units || 0) : 0;
      const now = x ? (x.units || 0) : 0;
      return Math.max(0, before - now);
    });
    const perdidas = perdidasPorJugador.reduce((a, b) => a + b, 0);
    const perdidasFacción = perdidasPorJugador[who] || 0;
    const loss = {
      perdidas: perdidas, perdidasPorJugador: perdidasPorJugador, perdidasFacción: perdidasFacción,
      // Alias explícitos para claridad da API.
      unidadesPerdidas: perdidas, unidadesPerdidasPorJugador: perdidasPorJugador
    };
    const base = { at: at, turn: after.turn };
    const deficit = !!after.f[who].deficit;
    const actor = after.f[who].name || '';
    if (gain >= 2 && (passive || 0) >= 2) return Object.assign({ type: 'rhythm', actor: actor, gain: gain }, base, loss);
    if (deficit) return Object.assign({ type: 'supply', actor: actor, victim: actor }, base, loss);
    if (gain >= 1 && perdidasFacción >= Math.max(2, gain)) return Object.assign({ type: 'pyrrhic', actor: actor, gain: gain, lost: perdidasFacción }, base, loss);
    if (gain >= 3) {
      const gold = after.f[who].gold || 0;
      const food = after.f[who].food || 0;
      const wood = after.f[who].wood || 0;
      return Object.assign({
        type: 'expansion', actor: actor, gain: gain,
        cities: after.f[who].cities || 0,
        gold: gold,
        food: food,
        wood: wood,
        recursos: gold + food + wood,
        units: after.f[who].units || 0,
        hexes: after.f[who].terr || 0,
        // Total de hexágonos de cada xogador ao peche do turno.
        hexesByPlayer: (after.f || []).map(x => x.terr || 0)
      }, base, loss);
    }
    if (key >= 2) return Object.assign({ type: 'keyPoints', actor: actor, key: key }, base, loss);
    return null;
  }

  // Bloque final: turnos, cidades, recursos e superioridade de tropas.
  function finalCue(after, at) {
    if (!after || !after.over) return null;
    const winner = after.over.winner;
    let actorId, victimId;
    if (winner === 0) { actorId = 0; victimId = strongest(after, 0); }
    else if (winner > 0) { actorId = winner; victimId = 0; }
    else { actorId = strongest(after, 0); victimId = 0; }
    if (actorId < 0) actorId = 0;
    if (victimId < 0) victimId = actorId;
    if (victimId === actorId) {
      // Dominación total: o rival pode estar morto pero conserva nome. Evita
      // comparar unha facción consigo mesma no bloque final.
      const other = (after.f || []).findIndex((x, i) => i !== actorId && x && x.name);
      if (other >= 0) victimId = other;
    }
    const A = after.f[actorId] || {}, V = after.f[victimId] || {};
    return {
      at: at, type: 'finalSummary', turn: after.turn || 1,
      actor: A.name || '', victim: V.name || '',
      wcities: A.cities || 0, lcities: V.cities || 0,
      wgold: A.gold || 0, wfood: A.food || 0, wwood: A.wood || 0,
      lgold: V.gold || 0, lfood: V.food || 0, lwood: V.wood || 0,
      wunits: A.units || 0, lunits: V.units || 0
    };
  }

  function buildCues(payload) {
    const cues = [];
    if (!payload || !payload.setup || !Array.isArray(payload.log) || !HF.newGame || !HF.replayApply) return cues;
    let sim;
    try { sim = HF.newGame(Object.assign({}, payload.setup, { isReplay: true, noReplay: true })); }
    catch (e) { return cues; }

    let before = snapshot(sim);
    const phaseStart = {};
    const passive = {};
    phaseStart[sim.cur] = before;

    for (let i = 0; i < payload.log.length; i++) {
      let bad = null;
      try { HF.replayApply(sim, payload.log[i]); }
      catch (e) { bad = e; }
      const after = snapshot(sim);
      const at = i + 1;
      const t = payload.log[i];

      if (!before.over && after.over) {
        const fin = finalCue(after, at);
        if (fin) cues.push(fin);
        break;
      }

      let summary = null;
      if (t[0] === 4) {
        const who = before.cur;
        const p0 = phaseStart[who] || before;
        summary = phaseSummary(p0, after, who, passive[who] || 0, at);
        if (summary && summary.type === 'rhythm') passive[who] = 0;
        else if ((after.f[who] && p0.f[who] && (after.f[who].terr || 0) <= (p0.f[who].terr || 0))) passive[who] = (passive[who] || 0) + 1;
        else passive[who] = 0;
      }

      const cue = detect(before, after, t, at) || summary;
      if (cue) cues.push(cue);

      if (t[0] === 4 && after.f[sim.cur]) phaseStart[sim.cur] = after;
      before = after;
      if (bad) break;
    }
    return cues;
  }

  // ---------------------------------------------------------------------------
  // 3. Motores de voz
  // ---------------------------------------------------------------------------
  function pickVoice(synth, tag) {
    if (!synth || typeof synth.getVoices !== 'function') return null;
    let voices = [];
    try { voices = synth.getVoices() || []; } catch (e) { voices = []; }
    const want = String(tag || '').toLowerCase();
    const base = want.split('-')[0];
    const same = voices.filter(v => String(v.lang || '').toLowerCase().replace('_', '-').startsWith(base));
    const exact = same.filter(v => String(v.lang || '').toLowerCase().replace('_', '-') === want);
    const pool = exact.length ? exact : same;
    if (!pool.length) return null;
    const masc = pool.find(v => /male|hombre|diego|jorge|daniel|enrique|pablo|marco|thomas|yuri|maged|hemant|liang|kyung|jin/i.test(v.name || ''));
    return masc || pool[0];
  }

  class SpeechVoice {
    constructor(opts) {
      opts = opts || {};
      this.lang = opts.lang || 'es';
      this.rate = opts.rate || 1.12;
      this.pitch = opts.pitch || 1.15;
      this.voiceName = opts.voice || '';
      this.muted = false;
      this.synth = G.speechSynthesis || null;
      this._current = null;
    }
    available() {
      return !!this.synth && typeof (G.SpeechSynthesisUtterance || G.webkitSpeechSynthesisUtterance) === 'function';
    }
    speak(text, style) {
      if (!text || this.muted || !this.available()) return Promise.resolve(false);
      this.cancel();
      style = style || {};
      return new Promise(resolve => {
        const Ctor = G.SpeechSynthesisUtterance || G.webkitSpeechSynthesisUtterance;
        const u = new Ctor(text);
        u.lang = TAGS[this.lang] || 'en-US';
        u.rate = clamp(this.rate * (style.rate || 1), 0.5, 2);
        u.pitch = clamp(style.pitch == null ? this.pitch : style.pitch, 0, 2);
        u.volume = 1;
        const voice = pickVoice(this.synth, u.lang);
        if (voice) u.voice = voice;
        if (this.voiceName && this.synth.getVoices) {
          const named = (this.synth.getVoices() || []).find(v => v.name === this.voiceName);
          if (named) u.voice = named;
        }
        let done = false;
        const finish = () => {
          if (done) return;
          done = true;
          this._current = null;
          resolve(true);
        };
        u.onend = finish;
        u.onerror = finish;
        this._current = u;
        try { this.synth.speak(u); } catch (e) { finish(); }
      });
    }
    cancel() {
      if (this.synth) { try { this.synth.cancel(); } catch (e) { } }
      this._current = null;
    }
    setMuted(m) { this.muted = !!m; if (this.muted) this.cancel(); }
    setRate(r) { this.rate = clamp(+r || 1, 0.5, 2); }
    destroy() { this.cancel(); }
  }

  class RemoteVoice {
    constructor(opts) {
      opts = opts || {};
      this.endpoint = opts.endpoint || '';
      this.lang = opts.lang || 'es';
      this.rate = opts.rate || 1.12;
      this.muted = false;
      this.fallback = opts.fallback || null;
      this._audio = null;
      this._url = null;
    }
    available() {
      return !!this.endpoint && typeof G.fetch === 'function' &&
        typeof G.Audio === 'function' && typeof G.URL !== 'undefined' && !!G.URL.createObjectURL;
    }
    speak(text, style) {
      if (!text || this.muted) return Promise.resolve(false);
      if (!this.available()) return this.fallback ? this.fallback.speak(text, style) : Promise.resolve(false);
      this.cancel();
      return G.fetch(this.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text, lang: this.lang, rate: this.rate, style: 'commentator', pitch: style && style.pitch })
      }).then(res => {
        if (!res || !res.ok) throw new Error('tts');
        const ct = res.headers && res.headers.get ? String(res.headers.get('content-type') || '') : '';
        if (/json/i.test(ct)) return res.json().then(j => ({ url: (j && (j.url || j.audio_url)) || '' }));
        return res.blob().then(blob => ({ blob: blob }));
      }).then(out => new Promise(resolve => {
        let src = out && out.url ? out.url : '';
        if (out && out.blob) {
          try { this._url = G.URL.createObjectURL(out.blob); src = this._url; }
          catch (e) { src = ''; }
        }
        if (!src) return resolve(false);
        const a = new G.Audio(src);
        this._audio = a;
        a.playbackRate = clamp(this.rate, 0.5, 2);
        let done = false;
        const finish = () => {
          if (done) return;
          done = true;
          try { if (this._url) G.URL.revokeObjectURL(this._url); } catch (e) { }
          this._url = null; this._audio = null;
          resolve(true);
        };
        a.onended = finish;
        a.onerror = finish;
        try { const p = a.play(); if (p && p.catch) p.catch(finish); }
        catch (e) { finish(); }
      })).catch(() => this.fallback ? this.fallback.speak(text, style) : false);
    }
    cancel() {
      if (this._audio) { try { this._audio.pause(); } catch (e) { } }
      if (this._url) { try { G.URL.revokeObjectURL(this._url); } catch (e) { } }
      this._audio = null; this._url = null;
    }
    setMuted(m) { this.muted = !!m; if (this.muted) this.cancel(); }
    setRate(r) { this.rate = clamp(+r || 1, 0.5, 2); if (this.fallback && this.fallback.setRate) this.fallback.setRate(this.rate); }
    destroy() { this.cancel(); }
  }

  // ---------------------------------------------------------------------------
  // 4. Caster
  // ---------------------------------------------------------------------------
  class Caster {
    constructor(opts) {
      opts = opts || {};
      const c = cfg();
      this.payload = opts.payload || null;
      this.game = opts.game || null;
      this.board = opts.board || null;
      this.focusCell = opts.focusCell || null;
      this.lang = opts.lang || (HF.lang ? HF.lang() : 'es');
      this.onPause = opts.onPause || function () { };
      this.onResume = opts.onResume || function () { };
      this.onJump = opts.onJump || function () { };
      this.muted = false;
      this.playing = true;
      this.rate = clamp(+(opts.rate || c.rate || 1.12), 0.5, 2);
      this.pitch = clamp(+(opts.pitch || c.pitch || 1.18), 0, 2);
      this.cues = [];
      this.cueByAt = new Map();
      this._built = false;
      this._indexed = false;
      this._started = false;
      this._destroyed = false;
      this._pausedForSpeech = false;
      this._speaking = false;
      this._speechSeq = 0;
      this._lastCueAt = 0;
      const speech = new SpeechVoice({ lang: this.lang, rate: this.rate, pitch: this.pitch, voice: c.voice });
      this.speech = speech;
      this.voice = (c.engine !== 'speech' && c.endpoint)
        ? new RemoteVoice({ endpoint: c.endpoint, lang: this.lang, rate: this.rate, fallback: speech })
        : speech;
      this._timer = G.setTimeout(() => this._build(), 0);
      this._onVisibility = () => { if (G.document && G.document.visibilityState === 'hidden') this.cancelSpeech(); };
      if (G.document && G.document.addEventListener) G.document.addEventListener('visibilitychange', this._onVisibility);
    }
    _build() {
      this._timer = 0;
      if (this._destroyed) return;
      try {
        this.cues = buildCues(this.payload);
        this.cueByAt = new Map();
        this.cues.forEach(cue => this.cueByAt.set(cue.at, cue));
        this._indexed = true;
      } catch (e) { this.cues = []; this._indexed = false; }
      this._built = true;
    }
    _focus(cue) {
      if (!cue || cue.cell == null) return;
      try {
        if (this.focusCell) { this.focusCell(cue.cell, cue); return; }
        if (this.board && typeof this.board.centerOn === 'function') this.board.centerOn(cue.cell);
      } catch (e) { }
    }
    _speak(cue) {
      if (this._destroyed || !cue) return;
      this._focus(cue);
      if (this.muted) return;
      const text = lineFor(this.lang, cue);
      if (!text) return;
      const seq = ++this._speechSeq;
      const wasPaused = this._pausedForSpeech;
      this._speaking = true;
      if (!wasPaused) { this._pausedForSpeech = true; this.onPause(); }
      this.voice.speak(text, STYLE[cue.type] || STYLE.massacre || {}).then(() => {
        if (seq !== this._speechSeq) return;
        this._speaking = false;
        if (this._pausedForSpeech && !wasPaused) {
          this._pausedForSpeech = false;
          if (this.playing && !this._destroyed) this.onResume();
        }
      });
    }
    // A locución só se activa cos fitos do catálogo; non hai intro de recheo.
    start() { this._started = true; }
    observe(at, before, after, game, action) {
      if (this._destroyed) return;
      let cue = this.cueByAt.get(at);
      if (!cue && !this._indexed) {
        if (before && after && !before.over && after.over) cue = finalCue(after, at);
        else if (before && after) cue = detect(before, after, action, at);
      }
      if (!cue) return;
      this._lastCueAt = at;
      this._speak(cue);
    }
    nextHighlight() {
      if (this._destroyed) return null;
      const cue = this.cues.find(c => c.at > (this._lastCueAt || 0));
      if (!cue) return null;
      const was = this.playing;
      this._lastCueAt = cue.at;
      this.onJump(cue.at);
      this._speak(cue);
      if (!was) this.playing = false;
      return cue;
    }
    setPlaying(p) {
      this.playing = !!p;
      if (!this.playing) this.cancelSpeech();
    }
    setRate(r) {
      this.rate = clamp(+r || 1, 0.5, 2);
      this.speech.setRate(this.rate);
      if (this.voice !== this.speech && this.voice.setRate) this.voice.setRate(this.rate);
    }
    toggleMute() {
      this.muted = !this.muted;
      if (this.voice.setMuted) this.voice.setMuted(this.muted);
      if (this.muted) this.cancelSpeech();
      return this.muted;
    }
    cancelSpeech() {
      this._speechSeq++;
      this._speaking = false;
      if (this.voice.cancel) this.voice.cancel();
      if (this._pausedForSpeech) {
        this._pausedForSpeech = false;
        if (this.playing && !this._destroyed) this.onResume();
      }
    }
    destroy() {
      this._destroyed = true;
      if (this._timer) { G.clearTimeout(this._timer); this._timer = 0; }
      if (G.document && G.document.removeEventListener) G.document.removeEventListener('visibilitychange', this._onVisibility);
      this.cancelSpeech();
      if (this.voice.destroy) this.voice.destroy();
    }
  }

  // ---------------------------------------------------------------------------
  // 5. API pública
  // ---------------------------------------------------------------------------
  HF.replayCaster = {
    version: '2.0.0',
    tags: TAGS,
    units: UNITS,
    neutral: NEUTRAL,
    places: PLACES,
    bank: BANK,
    style: STYLE,
    lineFor: lineFor,
    snapshot: snapshot,
    detect: detect,
    phaseSummary: phaseSummary,
    finalCue: finalCue,
    buildCues: buildCues,
    create: opts => new Caster(opts),
    Voice: SpeechVoice,
    RemoteVoice: RemoteVoice
  };
})(typeof window !== 'undefined' ? window : globalThis);
