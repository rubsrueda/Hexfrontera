(function (G) {
  const HF = G.HF;

  HF.buildFactions = (tribe, n, seed) => {
    const r = HF.rng(seed ^ 0xabc), list = [{ name: tribe.name, color: tribe.color, crest: tribe.crest, human: true, alma_path: tribe.alma_path, arma_path: tribe.arma_path, victoria_path: tribe.victoria_path }];
    const cols = HF.COLORS.filter(c => c.toLowerCase() !== tribe.color.toLowerCase());
    for (let k = 1; k < n; k++) {
      const p = HF.PRESETS[(r.int(HF.PRESETS.length) + k) % HF.PRESETS.length];
      list.push(Object.assign({ name: HF.AI_NAMES[k - 1], color: cols[k - 1], crest: HF.CRESTS[(k * 3 + 1) % HF.CRESTS.length], human: false }, p));
    }
    return list;
  };
  HF.makeGame = (spec, tribe) => {
    const sz = HF.SIZES[spec.size];
    const n = Math.max(2, Math.min(spec.n || 2, sz.maxF));
    const factions = HF.buildFactions(tribe, n, spec.seed);
    if (spec.aiPreset != null) { for (let k = 1; k < factions.length; k++) Object.assign(factions[k], HF.PRESETS[(spec.aiPreset + k - 1) % HF.PRESETS.length]); }
    const hasUnits = !!(spec.customCells && spec.customCells.some(d => d && d.u));
    return HF.newGame({
      mode: spec.mode, seed: spec.seed, R: spec.R || sz.R, biome: spec.biome, fog: spec.fog, difficulty: spec.difficulty, goal: spec.goal,
      startRes: spec.startRes, meta: spec.meta, factions, customCells: spec.customCells,
      giveUnits: spec.giveUnits != null ? spec.giveUnits : !hasUnits
    });
  };

  // ---------- campaña ----------
  const ACTS = ['I · Despertar', 'II · Fronteras', 'III · Marejada', 'IV · Hierro', 'V · Corona'];
  const BIO = ['plains', 'forest', 'archipelago', 'mountains'];
  const CH = ['NO_ISOLATED', 'NO_DESERT', 'CUT2'];
  const CHTXT = { NO_ISOLATED: 'Que ninguna de tus casillas quede aislada', NO_DESERT: 'Sin deserciones por hambre', CUT2: 'Aísla al menos 2 veces territorio enemigo' };
  HF.CHTXT = CHTXT;
  HF.ACTS = ACTS;
  const TUT = [
    { name: 'Primer paso', desc: 'Toca una unidad y luego una casilla para moverte; expande tu territorio hasta 14 casillas.', size: 'small', fog: 'NONE', goal: { type: 'territory', n: 14 }, difficulty: 'easy', startRes: { gold: 30, food: 30, wood: 30 }, par: 12, biome: 'plains' },
    { name: 'Madera y piedra', desc: 'Tala árboles (mueve una unidad sobre ellos), mejora tu campamento y construye 2 ciudades.', size: 'small', fog: 'NONE', goal: { type: 'city', n: 2 }, difficulty: 'easy', startRes: { gold: 40, food: 80, wood: 90 }, par: 20, biome: 'forest' },
    { name: 'Primera sangre', desc: 'Funde infantería (💂+💂) para atacar casillas defendidas y conquista al rival.', size: 'small', fog: 'NONE', goal: { type: 'conquer' }, difficulty: 'easy', startRes: { gold: 50, food: 40, wood: 20 }, par: 25, biome: 'plains' },
    { name: 'Asedio', desc: 'Los arqueros 🏹 debilitan defensas y el asedio 💣 degrada edificios. Corta suministros.', size: 'small', fog: 'NONE', goal: { type: 'conquer' }, difficulty: 'easy', startRes: { gold: 80, food: 50, wood: 60 }, par: 25, biome: 'mountains' }
  ];
  HF.campaign = (() => {
    const out = [];
    for (let a = 0; a < 5; a++) for (let l = 0; l < 6; l++) {
      const idx = a * 6 + l;
      let s;
      if (a === 0 && l < 4) s = Object.assign({}, TUT[l]);
      else {
        const goals = [{ type: 'conquer' }, { type: 'territory', n: 60 + a * 25 }, { type: 'conquer' }, { type: 'survive', n: 20 + a * 4 }, { type: 'gold', n: 150 + a * 80 }, { type: 'conquer' }];
        const size = a === 0 ? 'medium' : (a < 3 ? (l % 2 ? 'medium' : 'small') : (l % 2 ? 'large' : 'medium'));
        s = {
          name: ['Cruce', 'Horizonte', 'Vendaval', 'Cerco', 'Tesoro', 'Duelo', 'Marea', 'Cenizas'][(idx * 3) % 8] + ' ' + (idx + 1),
          desc: 'Rival con credo predefinido. ' + (goals[l].type === 'conquer' ? 'Elimina a todos los rivales.' : goals[l].type === 'survive' ? 'Sobrevive ' + goals[l].n + ' turnos.' : goals[l].type === 'gold' ? 'Reúne ' + goals[l].n + ' de oro.' : 'Controla ' + goals[l].n + ' casillas.'),
          size, fog: a >= 1 ? 'FULL' : 'NONE', goal: goals[l], difficulty: a < 1 ? 'easy' : a < 3 ? 'normal' : 'hard',
          startRes: HF.CFG.start, par: 24 + a * 6 + (size === 'large' ? 15 : 0), biome: BIO[(a + l) % 4]
        };
        s.n = a >= 2 && size !== 'small' ? 3 : 2;
        if (goals[l].type === 'survive') s.par = goals[l].n + 2;
      }
      s.n = s.n || 2;
      s.seed = 1000 + idx * 7919;
      s.aiPreset = idx;
      s.meta = { act: a, level: l, idx, par: s.par, challenge: CH[idx % 3], name: s.name };
      s.mode = 'campaign';
      out.push(s);
    }
    return out;
  })();
  HF.GATES = [0, 12, 24, 36, 48];
  HF.campProgress = () => HF.store.get('campaign_progress', { stars: {} });
  HF.totalStars = () => Object.values(HF.campProgress().stars).reduce((a, b) => a + b, 0);
  HF.levelState = idx => {
    const p = HF.campProgress(), spec = HF.campaign[idx], a = spec.meta.act;
    if (HF.totalStars() < HF.GATES[a]) return { locked: true, why: 'Necesitas ' + HF.GATES[a] + ' ★' };
    if (idx > 0 && !(p.stars[idx - 1] > 0)) return { locked: true, why: 'Supera el nivel anterior' };
    return { locked: false, stars: p.stars[idx] || 0 };
  };

  // ---------- diario ----------
  const dkey = (d = new Date()) => d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
  HF.dailyKey = dkey;
  HF.dailySpec = () => {
    const k = dkey(), r = HF.rng(k);
    return { mode: 'daily', seed: k, size: 'medium', n: 2 + r.int(2), biome: BIO[r.int(4)], fog: 'FULL', difficulty: 'normal', goal: { type: 'conquer' }, aiPreset: r.int(5), startRes: HF.CFG.start, meta: { daily: k } };
  };
  HF.dailyState = () => HF.store.get('daily_challenge', { date: 0, attempts: 0, best: null, medal: null, streak: 0, lastWin: 0, history: [] });
  const medal = t => t <= 12 ? '🥇' : t <= 18 ? '🥈' : '🥉';
  HF.medal = medal;

  // ---------- puntuación HexScore (competencia asíncrona) ----------
  // Victoria + velocidad + eficiencia militar + economía − deserciones.
  HF.calculateScore = function (g) {
    const won = !!(g.over && g.over.won), s = g.stat || {}, me = (g.f && g.f[0]) || {};
    const surplus = (me.gold || 0) + (me.food || 0) + (me.wood || 0);
    let score = 0;
    if (won) score += 10000;
    score += Math.max(0, (50 - g.turn) * 200);
    score += (s.kills || 0) * 100 - (s.lost || 0) * 150;
    score += surplus * 2;
    score -= (s.deserts || 0) * 400;
    return Math.max(0, score);
  };

  // ---------- estadísticas ----------
  HF.statsDefault = () => ({ games: 0, wins: 0, losses: 0, turns: 0, kills: 0, lost: 0, captured: 0, built: 0, recruited: 0, streak: 0, bestStreak: 0, bestWinTurns: null, byMode: {}, recent: [] });
  HF.getStats = () => Object.assign(HF.statsDefault(), HF.store.get('player_statistics', {}));
  HF.recordResult = function (g) {
    if (!g.over || g.recorded) return null;
    g.recorded = true;
    const won = g.over.won, st = HF.getStats(), s = g.stat;
    st.games++; won ? st.wins++ : st.losses++;
    st.turns += g.turn; st.kills += s.kills; st.lost += s.lost; st.captured += s.captured; st.built += s.built; st.recruited += s.recruited;
    st.streak = won ? st.streak + 1 : 0; st.bestStreak = Math.max(st.bestStreak, st.streak);
    if (won && (st.bestWinTurns == null || g.turn < st.bestWinTurns)) st.bestWinTurns = g.turn;
    const m = st.byMode[g.mode] = st.byMode[g.mode] || { g: 0, w: 0 }; m.g++; if (won) m.w++;
    st.recent.unshift({ mode: g.mode, won, turn: g.turn, date: Date.now() }); st.recent = st.recent.slice(0, 15);
    HF.store.set('player_statistics', st);
    if (HF.cloud && HF.cloud.saveProfileCloud) HF.cloud.saveProfileCloud().catch(() => { });
    const res = { stars: 0, newStars: 0, medal: null, official: false };
    if (g.mode === 'campaign') {
      res.stars = HF.stars(g);
      const p = HF.campProgress(), idx = g.meta.idx;
      if (res.stars > (p.stars[idx] || 0)) { res.newStars = res.stars - (p.stars[idx] || 0); p.stars[idx] = res.stars; HF.store.set('campaign_progress', p); }
    }
    if (g.mode === 'daily') {
      const d = HF.dailyState(), k = g.meta.daily;
      if (d.date !== k) { d.date = k; d.attempts = 0; d.best = null; d.medal = null; }
      d.attempts++;
      res.official = d.attempts === 1;
      if (res.official && won) {
        d.best = g.turn; d.medal = medal(g.turn);
        const y = new Date(); y.setDate(y.getDate() - 1);
        d.streak = d.lastWin === dkey(y) ? d.streak + 1 : 1; d.lastWin = k;
        d.history = [{ k, turn: g.turn, medal: d.medal }].concat(d.history).slice(0, 30);
      }
      res.medal = won ? (res.official ? d.medal : null) : null;
      HF.store.set('daily_challenge', d);
      if (res.official && won && HF.cloud && HF.cloud.submitDailyScore) {
        const hero = g.f[0], surplus = (hero.gold || 0) + (hero.food || 0) + (hero.wood || 0);
        HF.cloud.submitDailyScore({
          date_key: k, player_id: HF.cloud.playerId(), tribe_name: hero.name || (HF.genTribeName ? HF.genTribeName() : 'Mi Tribu'),
          turns: g.turn, surplus, crest: hero.crest || '', color_hex: hero.color || '#888888'
        }).catch(() => { });
      }
    }
    return res;
  };
})(window);
