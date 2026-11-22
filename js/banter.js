/* Motor de diálogos vivos entre unidades y edificios (Banter Engine).
   No bloquea el juego: solo empuja burbujas al tablero. */
(function (G) {
  const HF = G.HF = G.HF || {};
  const pick = arr => (arr && arr.length ? arr[Math.floor(Math.random() * arr.length)] : '');
  const now = () => Date.now();

  HF.banter = {
    activeConvo: null,    // { steps, idx, timers, cells, until }
    idleTimer: null,
    ambientTimer: null,
    _openTimer: null,
    lastBanterTurn: -1,
    lastBanterTime: 0,
    _turnCount: 0,
    _lastPair: null,
    _used: {},
    _ambientReady: 0,
    _g: null,

    cfg() { return (HF.CFG && HF.CFG.banter) || {}; },
    data() { return HF.BANTER_DATABASE || {}; },

    // Elige una frase no usada recientemente. Evita que la misma línea salga
    // una y otra vez en la misma unidad o en varias.
    pickFresh(key, arr) {
      if (!arr || !arr.length) return '';
      const used = this._used[key] || (this._used[key] = []);
      let pool = arr.filter(x => used.indexOf(x) < 0);
      if (!pool.length) { used.length = 0; pool = arr.slice(); }
      const v = pool[Math.floor(Math.random() * pool.length)];
      used.push(v);
      const keep = Math.max(1, Math.min(arr.length - 1, 12));
      while (used.length > keep) used.shift();
      return v;
    },

    init(g) {
      this.clearTimers();
      this.activeConvo = null;
      this.paused = false;
      this._g = g || null;
      this._lastPair = null;
      this.lastBanterTurn = -1;
      this.lastBanterTime = 0;
      this._turnCount = 0;
      this._used = {};
      this._ambientReady = 0;
      let profile = {};
      try {
        const saved = HF.store && HF.store.get && HF.store.get('banter_discovery_profile', {});
        if (saved && typeof saved === 'object' && !Array.isArray(saved)) profile = saved;
      } catch (e) { }
      if (g) {
        g._banterDiscoveryFlags = Object.assign({}, profile, g._banterDiscoveryFlags || {});
        delete g._banterDiscoveryFlags.turnEnded;
      }
      this.resetIdle(g);
      this.startAmbient(g);
      // Diálogo de apertura: la capital habla con la primera unidad.
      if (this._openTimer) clearTimeout(this._openTimer);
      this._openTimer = setTimeout(() => { this._openTimer = null; this.triggerOpening(g); }, 1200);
    },

    stop() {
      if (this.idleTimer) { clearTimeout(this.idleTimer); this.idleTimer = null; }
      if (this.ambientTimer) { clearTimeout(this.ambientTimer); this.ambientTimer = null; }
      if (this._openTimer) { clearTimeout(this._openTimer); this._openTimer = null; }
      this.clearTimers();
      this.activeConvo = null;
      this._ambientReady = 0;
      this._g = null;
      this.paused = false;
    },

    // Segundo plano: los temporizadores no deben disparar charlas que el
    // jugador no verá (ni reaparecer al volver con burbujas caducadas).
    pause() {
      if (this.paused) return;
      this.paused = true;
      if (this.idleTimer) { clearTimeout(this.idleTimer); this.idleTimer = null; }
      if (this.ambientTimer) { clearTimeout(this.ambientTimer); this.ambientTimer = null; }
      if (this._openTimer) { clearTimeout(this._openTimer); this._openTimer = null; }
      this.clearTimers();
      this.activeConvo = null;
    },
    resume() {
      if (!this.paused) return;
      this.paused = false;
      if (!this._g) return;
      this.resetIdle(this._g);
      this.startAmbient(this._g);
    },

    clearTimers() {
      if (!this.activeConvo) return;
      for (const t of this.activeConvo.timers) clearTimeout(t);
      this.activeConvo.timers = [];
    },

    // 18 s sin interacción → chisme de la tropa.
    resetIdle(g) {
      if (!g || g.over) { if (this.idleTimer) { clearTimeout(this.idleTimer); this.idleTimer = null; } return; }
      this._g = g;
      if (this.idleTimer) clearTimeout(this.idleTimer);
      const secs = this.cfg().idle || 18;
      this.idleTimer = setTimeout(() => { this.idleTimer = null; this.triggerIdleGossip(g); }, secs * 1000);
    },

    canBanter(g) {
      if (!g || g.over) return false;
      const cd = this.cfg().cooldown;
      if (now() - this.lastBanterTime < (cd == null ? 6 : cd) * 1000) return false;
      if (this.lastBanterTurn === g.turn && this._turnCount >= (this.cfg().perTurn || 3)) return false;
      if (this.activeConvo && now() < this.activeConvo.until) return false;
      return true;
    },

    mark(g) {
      this.lastBanterTime = now();
      if (this.lastBanterTurn !== g.turn) { this.lastBanterTurn = g.turn; this._turnCount = 0; }
      this._turnCount++;
    },

    say(g, i, text, kind, life) {
      if (!text) return;
      const cb = HF.bubbleAt;
      if (cb) cb(g, i, text, kind || 'ally', life || this.cfg().life || 3.4);
    },

    // Muestra los pasos con retardo (Call & Response). Los pasos pendientes se
    // cancelan con silence(); las burbujas ya visibles viven su propia vida.
    startSequence(g, steps) {
      if (!steps || !steps.length) return null;
      this.clearTimers();
      const stagger = (this.cfg().delay || 1.4) * 1000;
      const life = this.cfg().life || 3.4;
      const convo = { steps: steps.slice(), idx: 0, timers: [], cells: [], until: 0 };
      for (const s of steps) if (convo.cells.indexOf(s.i) < 0) convo.cells.push(s.i);
      convo.until = now() + (steps.length - 1) * stagger + life * 1000;
      this.activeConvo = convo;
      // Después de la última burbuja, silencio antes de la siguiente charla.
      this._ambientReady = convo.until + (this.cfg().ambientGap || 0) * 1000;
      const show = k => {
        const s = steps[k];
        if (!s || !this._g) return;
        this.say(this._g, s.i, s.text, s.kind, s.life);
        convo.idx = k + 1;
      };
      show(0);
      for (let k = 1; k < steps.length; k++) {
        convo.timers.push(setTimeout(() => { if (this.activeConvo === convo) show(k); }, stagger * k));
      }
      return convo;
    },

    // ¿Esta casilla está participando en una conversación (pendiente o visible)?
    isTalking(i) {
      const c = this.activeConvo;
      return !!c && c.cells.indexOf(i) >= 0 && now() < c.until;
    },

    // "¡A callar!": corta los pasos pendientes y suelta una micro-burbuja.
    silence(i) {
      if (!this.isTalking(i)) return false;
      this.clearTimers();
      this.activeConvo = null;
      const lines = this.data().interruptions || ['¡A formar!'];
      this.say(this._g, i, this.pickFresh('interrupt', lines), 'interrupt', this.cfg().interruptLife || 1.2);
      this.resetIdle(this._g);
      return true;
    },

    // Unidades propias (las que hablan en los chismes y el pánico logístico).
    ownUnits(g) {
      const me = (g && g.mySeat) || 0;
      const out = [];
      for (const c of g.cells) if (c && c.u && c.u.owner === me) out.push(c);
      return out;
    },

    noteDiscovery(g, key) {
      if (!g || !key) return;
      const flags = g._banterDiscoveryFlags || (g._banterDiscoveryFlags = {});
      flags[key] = true;
      if (key === 'resourcesViewed' || key === 'diplomacyOpened') {
        try {
          const saved = HF.store && HF.store.get && HF.store.get('banter_discovery_profile', {});
          const profile = saved && typeof saved === 'object' && !Array.isArray(saved) ? saved : {};
          profile[key] = true;
          if (HF.store && HF.store.set) HF.store.set('banter_discovery_profile', profile);
        } catch (e) { }
      }
    },

    recordMap(g) {
      if (!g) return;
      const meta = g.meta || {};
      const identity = meta.mapId != null
        ? 'id:' + meta.mapId
        : 'seed:' + (g.seed == null ? '' : g.seed) + '|R:' + (g.R == null ? '' : g.R) + '|biome:' + (g.biome || '');
      let history = [];
      try {
        const saved = HF.store && HF.store.get && HF.store.get('banter_seen_maps', []);
        if (Array.isArray(saved)) history = saved.filter(x => typeof x === 'string').slice(-24);
      } catch (e) { }
      if (identity && history.indexOf(identity) < 0) {
        history.push(identity);
        history = history.slice(-24);
        try { if (HF.store && HF.store.set) HF.store.set('banter_seen_maps', history); } catch (e) { }
      }
      g._banterMapHistorySize = history.length;
    },

    discoverySpeaker(g, near) {
      const own = this.ownUnits(g);
      if (own.length) {
        if (near && HF.hexDist) {
          return own.reduce((best, c) => HF.hexDist(c, near) < HF.hexDist(best, near) ? c : best);
        }
        return own[0];
      }
      const me = (g && g.mySeat) || 0;
      return (g && g.cells || []).find(c => c && c.b && c.o === me && c.b !== HF.B.ARBOL) || null;
    },

    showDiscovery(g, key, text, near) {
      if (!text || !this.canBanter(g)) return false;
      const seen = g._banterDiscoveries || (g._banterDiscoveries = {});
      if (seen[key]) return false;
      const speaker = this.discoverySpeaker(g, near);
      if (!speaker) return false;
      seen[key] = true;
      this._g = g;
      this.mark(g);
      this.startSequence(g, [{ i: speaker.i, text, kind: 'ally', life: 4.2 }]);
      return true;
    },

    triggerOnlineWait(g) {
      const online = HF.online;
      if (!g || !g.online || !online || !online.room || !online.playerId) return false;
      let room;
      try { room = online.room(); } catch (e) { return false; }
      if (!room || room.status !== 'ACTIVE') return false;
      const players = Array.isArray(room.players_data) ? room.players_data.filter(p => p && p.player_id) : [];
      const me = players.find(p => p.player_id === online.playerId());
      if (!me || players.length < 2) return false;
      const others = players.filter(p => p.player_id !== me.player_id);
      const cycle = room.current_turn == null ? g.turn : room.current_turn;
      if (room.game_phase === 'SIMULTANEOUS') {
        if (me.is_ready) {
          const waiting = others.filter(p => !p.is_ready).length;
          if (waiting > 0) {
            const text = waiting === 1
              ? 'Has terminado. Aún falta que un jugador confirme su turno.'
              : `Has terminado. Aún faltan ${waiting} jugadores por confirmar su turno.`;
            return this.showDiscovery(g, 'online-ready-' + cycle + '-' + waiting,
              text);
          }
        } else if (others.length && others.every(p => p.is_ready)) {
          return this.showDiscovery(g, 'online-all-wait-' + cycle,
            'Todos los demás están listos; esperan a que termines tu turno.');
        }
      } else if (room.game_phase === 'TURN_BASED' && room.active_player !== me.player_id) {
        if (!g._banterDiscoveryFlags || !g._banterDiscoveryFlags.turnEnded) return false;
        const active = players.find(p => p.player_id === room.active_player);
        if (active && active.seat != null && me.seat != null) {
          const total = Math.max(1, ...players.map(p => Number(p.seat) || 0));
          const distance = (Number(me.seat) - Number(active.seat) + total) % total;
          if (distance > 0) {
            const shown = this.showDiscovery(g, 'online-turn-wait-' + cycle + '-' + distance,
              `Turno entregado. ${distance === 1 ? 'Un jugador debe' : distance + ' jugadores deben'} jugar antes de que vuelva el tuyo.`);
            if (shown) delete g._banterDiscoveryFlags.turnEnded;
            return shown;
          }
        }
      }
      return false;
    },

    visibleEnemyGroups(g) {
      const me = (g && g.mySeat) || 0;
      const foes = (g && g.cells || []).filter(c => c && c.u && c.u.owner !== me &&
        (!HF.visible || HF.visible(g, c.i)));
      const groups = [];
      const used = new Set();
      for (const cell of foes) {
        if (used.has(cell.i)) continue;
        const group = [cell];
        used.add(cell.i);
        for (let cursor = 0; cursor < group.length; cursor++) {
          for (const other of foes) {
            if (used.has(other.i)) continue;
            if (HF.hexDist && HF.hexDist(group[cursor], other) <= 2) {
              group.push(other);
              used.add(other.i);
            }
          }
        }
        groups.push(group);
      }
      return groups;
    },

    triggerDiscoveries(g) {
      if (!g || g.over) return false;
      if (this.triggerOnlineWait(g)) return true;

      const me = (g.mySeat) || 0;
      const treaties = Array.isArray(g.treaties) ? g.treaties : [];
      const expiring = treaties.filter(t => t && t.status === 'active' &&
        Array.isArray(t.factions) && t.factions.indexOf(me) >= 0 &&
        Number.isFinite(t.expiryTurn) && t.expiryTurn >= g.turn - 1 &&
        t.expiryTurn - g.turn + 1 <= 2)
        .sort((a, b) => a.expiryTurn - b.expiryTurn)[0];
      if (expiring) {
        const left = Math.max(0, expiring.expiryTurn - g.turn + 1);
        const other = expiring.factions.find(id => id !== me);
        const name = g.f[other] && g.f[other].name ? ' con ' + g.f[other].name : '';
        if (this.showDiscovery(g, 'treaty-expiry-' + expiring.id,
          `El tratado${name} vence ${left === 0 ? 'este turno' : 'en ' + left + (left === 1 ? ' turno' : ' turnos')}.`)) return true;
      }

      if (g.turn >= 3 && !g._banterDiscoveryFlags?.resourcesViewed) {
        if (this.showDiscovery(g, 'resource-statistics',
          'Toca oro, trigo o madera arriba para consultar ingresos, gastos y balance.')) return true;
      }
      if (g.turn >= 4 && !g._banterDiscoveryFlags?.diplomacyOpened) {
        if (this.showDiscovery(g, 'diplomacy-menu',
          'En Diplomacia puedes revisar pactos, comercio y banca; abre el menú con 🕊️.')) return true;
      }
      if (g.turn >= 3 && !g._banterDiscoveryFlags?.mapViewsChanged) {
        if (this.showDiscovery(g, 'map-views',
          'Cambia la vista del mapa para consultar combate, política y recursos.')) return true;
      }
      if (g.turn >= 4 && g._banterMapHistorySize === 1) {
        const mapName = g.meta && g.meta.name ? ` «${g.meta.name}»` : '';
        if (this.showDiscovery(g, 'try-another-map',
          `Este es el único mapa${mapName} anotado en el historial local; al terminar, prueba otro escenario.`)) return true;
      }

      const ownFaction = g.f && g.f[me];
      const cargoSent = (g._banterDiscoveryFlags && g._banterDiscoveryFlags.cargoSent) ||
        (Array.isArray(g.replayLog) && g.replayLog.some(a => Array.isArray(a) && a[0] === 9)) ||
        (Array.isArray(g.caravans) && g.caravans.some(c => c && c.kind === 'cargo' && c.owner === me));
      const cargoSource = !cargoSent && HF.cargoDests && ownFaction
        ? (g.cells || []).find(c => c && c.o === me && (c.b === HF.B.CIUDAD || c.b === HF.B.PUEBLO) &&
          HF.cargoDests(g, ownFaction, c.i).length > 0)
        : null;
      if (g.turn >= 4 && cargoSource) {
        const destination = HF.cargoDests(g, ownFaction, cargoSource.i)[0];
        const sourceName = cargoSource.city || (HF.BNAME && HF.BNAME[cargoSource.b]) || 'puerto';
        const destinationName = destination.city || (HF.BNAME && HF.BNAME[destination.b]) || 'puerto';
        const routeKey = 'sea-cargo-' + cargoSource.i + '-' + destination.i;
        if (this.showDiscovery(g, routeKey,
          `El puerto ${sourceName} tiene una ruta marítima hasta ${destinationName}, aislado por tierra. Puedes enviarle recursos.`,
          cargoSource)) return true;
      }

      const log = Array.isArray(g.diplomacyLog) ? g.diplomacyLog : [];
      const loanRequested = log.some(e => e && e.type === 'loan_request' &&
        Array.isArray(e.factions) && e.factions.indexOf(me) >= 0);
      const loanTreaty = treaties.some(t => t && t.type === 'loan_contract' &&
        Array.isArray(t.factions) && t.factions.indexOf(me) >= 0);
      const activeLoans = ownFaction && ownFaction.economy &&
        Array.isArray(ownFaction.economy.activeLoans) && ownFaction.economy.activeLoans.length > 0;
      if (g.turn >= 5 && log.length < 40 && !loanRequested && !loanTreaty && !activeLoans) {
        if (this.showDiscovery(g, 'loan-request',
          'No consta una solicitud de préstamo en este registro; puedes consultar las condiciones en Banca.')) return true;
      }

      const activeRoutes = treaties.some(t => t && t.status === 'active' &&
        Array.isArray(t.factions) && t.factions.indexOf(me) >= 0 &&
        t.type === 'trade_agreement' && t.tradeTerms &&
        Array.isArray(t.tradeTerms.routes) && t.tradeTerms.routes.some(r => r && r.active));
      if (g.turn >= 6 && !activeRoutes) {
        if (this.showDiscovery(g, 'trade-routes',
          'No veo rutas comerciales activas; puedes revisar los envíos de recursos en Diplomacia.')) return true;
      }

      if (g.turn >= 4) {
        const groups = this.visibleEnemyGroups(g);
        const concentration = groups.find(group => group.length >= 3);
        if (concentration) {
          const anchor = concentration[0];
          if (this.showDiscovery(g, 'enemy-cluster-' + concentration.map(c => c.i).sort((a, b) => a - b).join('-'),
            `Veo ${concentration.length} unidades rivales concentradas cerca de (${anchor.q}, ${anchor.r}).`, anchor)) return true;
        }

        const ownUnits = this.ownUnits(g).length;
        const enemyUnits = (g.cells || []).filter(c => c && c.u && c.u.owner !== me &&
          (!HF.visible || HF.visible(g, c.i))).length;
        if (enemyUnits) {
          const comparison = ownUnits > enemyUnits
            ? `Tienes ${ownUnits} unidades; superas a las ${enemyUnits} rivales visibles.`
            : ownUnits < enemyUnits
              ? `Cuentas ${ownUnits} unidades; las ${enemyUnits} rivales visibles te superan.`
              : `Tú y el enemigo tenéis ${ownUnits} unidades visibles en el frente.`;
          const ownCells = (g.cells || []).filter(c => c && c.o === me).length;
          const enemyCells = (g.cells || []).filter(c => c && c.o >= 0 && c.o !== me &&
            (!HF.visible || HF.visible(g, c.i))).length;
          const territory = enemyCells && ownCells !== enemyCells
            ? ` Tú controlas ${ownCells} casillas; hay ${enemyCells} casillas rivales visibles.`
            : '';
          if (this.showDiscovery(g, 'force-comparison-' + g.turn, comparison + territory)) return true;
        }
      }
      return false;
    },

    roleUnit(g, role, used) {
      const pool = this.ownUnits(g);
      if (!pool.length) return null;
      let list = role && role !== 'ANY' ? pool.filter(c => c.u.type === role) : pool;
      if (!list.length) list = pool;
      list = list.filter(c => !used.has(c.i));
      if (!list.length) list = pool.filter(c => !used.has(c.i));
      return list.length ? list[0] : null;
    },

    // Duelo de insultos (enemigo adyacente) o rencilla aliada.
    triggerAdjacent(g, cellA, cellB) {
      const A = g.cells[cellA], B = g.cells[cellB];
      if (!A || !B || !A.u || !B.u) return false;
      if (!this.canBanter(g)) return false;
      const enemy = A.u.owner !== B.u.owner;
      let steps = null;
      if (enemy) {
        if (Math.random() > (this.cfg().enemyChance || .35)) return false;
        const D = this.data();
        if (Math.random() < .3) {
          const gen = D.generator;
          steps = [
            { i: cellA, text: `${this.pickFresh('gen_lead', gen.insult_lead)} ${this.pickFresh('gen_body', gen.insult_body)} ${this.pickFresh('gen_target', gen.insult_target)}`, kind: 'enemy' },
            { i: cellB, text: `${this.pickFresh('gen_retort', gen.retort_lead)} ${this.pickFresh('gen_punch', gen.retort_punch)}`, kind: 'enemy' }
          ];
        } else {
          const d = this.pickFresh('duels', D.frontier_duels || []);
          if (!d) return false;
          steps = [{ i: cellA, text: d.a, kind: 'enemy' }, { i: cellB, text: d.b, kind: 'enemy' }];
        }
      } else {
        if (A.u.type === B.u.type) return false;
        if (Math.random() > (this.cfg().allyChance || .25)) return false;
        const D = this.data();
        const matches = (D.corps_rivalry || []).filter(x =>
          (x.pair[0] === A.u.type && x.pair[1] === B.u.type) ||
          (x.pair[0] === B.u.type && x.pair[1] === A.u.type));
        const r = matches.length ? this.pickFresh('rivalry_' + [A.u.type, B.u.type].sort().join('_'), matches) : null;
        if (!r) return false;
        const swap = r.pair[0] !== A.u.type;
        steps = [
          { i: cellA, text: swap ? r.b : r.a, kind: 'ally' },
          { i: cellB, text: swap ? r.a : r.b, kind: 'ally' }
        ];
      }
      this.mark(g);
      this.startSequence(g, steps);
      return true;
    },

    // Corte de suministros: conversación de pánico entre unidades propias.
    triggerSupplyPanic(g, cell) {
      if (!this.canBanter(g)) return false;
      const convo = this.pickFresh('supply', this.data().supply_panic || []);
      if (!convo || !convo.length) return false;
      const pool = this.ownUnits(g);
      if (!pool.length) return false;
      const used = new Set();
      const steps = convo.map(s => {
        const u = this.roleUnit(g, s.role, used) || pool[0];
        used.add(u.i);
        return { i: u.i, text: s.text, kind: 'ally' };
      });
      this.mark(g);
      this.startSequence(g, steps);
      return true;
    },

    // Voces de edificios: campamento, bastión, pueblo, ciudad o calzada.
    triggerBuildingBanter(g, i) {
      const c = g.cells[i], B = HF.B;
      if (!c || !c.b || c.b === B.ARBOL) return false;
      if (c._barkTurn === g.turn) return false;
      if (!this.canBanter(g)) return false;
      if (Math.random() > (this.cfg().buildingChance || .5)) return false;
      const key = c.b === B.CAMPAMENTO ? 'camp'
        : c.b === B.BASTION ? (c.u ? 'bastion_garrisoned' : 'bastion_empty')
        : c.b === B.PUEBLO ? 'village'
        : c.b === B.CIUDAD ? 'city'
        : c.b === B.CAMINO ? 'road' : null;
      const lines = key && this.data().settlement_barks && this.data().settlement_barks[key];
      if (!lines || !lines.length) return false;
      c._barkTurn = g.turn;
      this.mark(g);
      this.startSequence(g, [{ i, text: this.pickFresh('bark_' + key, lines), kind: 'ally', life: 4.2 }]);
      return true;
    },

    // Chisme por inactividad: dos unidades propias hablan del Canciller.
    triggerIdleGossip(g) {
      if (!g || g.over) return false;
      const pool = this.ownUnits(g);
      if (pool.length < 2 || !this.canBanter(g)) { this.resetIdle(g); return false; }
      const convo = this.pickFresh('idle', this.data().idle_gossip || []);
      if (!convo || !convo.length) { this.resetIdle(g); return false; }
      const used = new Set();
      const steps = convo.map(s => {
        const u = this.roleUnit(g, s.role, used) || pool[0];
        used.add(u.i);
        return { i: u.i, text: s.text, kind: 'ally' };
      });
      this.mark(g);
      this.startSequence(g, steps);
      this.resetIdle(g);
      return true;
    },

    // Diálogo de apertura (o al cerrar la intro): capital + primera unidad.
    triggerOpening(g) {
      if (!g || g.over) return false;
      const me = g.mySeat || 0, D = this.data();
      const city = g.cells.find(c => c && c.cap && c.o === me && c.b === HF.B.CIUDAD)
        || g.cells.find(c => c && c.o === me && c.b === HF.B.CIUDAD)
        || g.cells.find(c => c && c.o === me && c.b === HF.B.PUEBLO);
      const unit = g.cells.find(c => c && c.u && c.u.owner === me && (!city || c.i !== city.i))
        || g.cells.find(c => c && c.u && c.u.owner === me);
      if (city && unit && D.opening && D.opening.length) {
        const convo = this.pickFresh('opening', D.opening);
        const steps = convo.map(s => ({ i: s.role === 'CITY' ? city.i : unit.i, text: s.text, kind: 'ally' }));
        this.mark(g);
        this.startSequence(g, steps);
        return true;
      }
      return this.triggerAmbient(g);
    },

    // Vuelve a lanzar la apertura (al cerrar la intro cinematográfica).
    kick(g) {
      if (this._g !== g || !g || g.over) return false;
      // La intro pudo tapar una charla: se reemplaza por la apertura visible.
      this._ambientReady = 0;
      return this.triggerOpening(g);
    },

    // Charla ambiental continua: cada pocos segundos, dos unidades visibles
    // cruzan palabras (enemigos, aliados de otro cuerpo o cháchara de campaña).
    startAmbient(g) {
      if (this.ambientTimer) clearTimeout(this.ambientTimer);
      const tick = () => {
        if (this._g !== g || !g || g.over) return;
        this.triggerAmbient(g);
        this.ambientTimer = setTimeout(tick, (this.cfg().ambientEvery || 4) * 1000);
      };
      this.ambientTimer = setTimeout(tick, (this.cfg().ambientStart || 2.2) * 1000);
    },

    triggerAmbient(g) {
      if (!g || g.over) return false;
      if (now() < (this._ambientReady || 0)) return false;
      if (this.activeConvo && now() < this.activeConvo.until) return false;
      const me = g.mySeat || 0;
      const units = [];
      for (const c of g.cells) {
        if (!c || !c.u) continue;
        if (c.u.owner === me || (HF.visible ? HF.visible(g, c.i) : true)) units.push(c);
      }
      if (units.length < 2) {
        // Con una sola unidad, la capital o el pueblo le habla directamente.
        const city = g.cells.find(c => c && c.o === me && (c.b === HF.B.CIUDAD || c.b === HF.B.PUEBLO))
          || g.cells.find(c => c && c.o === me && (c.b === HF.B.BASTION || c.b === HF.B.CAMPAMENTO));
        const unit = units[0];
        const D = this.data();
        if (!city || !unit) return false;
        const key = city.b === HF.B.CIUDAD ? 'city' : city.b === HF.B.PUEBLO ? 'village'
          : city.b === HF.B.BASTION ? 'bastion_empty' : 'camp';
        const lines = (D.settlement_barks || {})[key] || [];
        const replies = D.interruptions || [];
        if (!lines.length || !replies.length) return false;
        this.startSequence(g, [
          { i: city.i, text: this.pickFresh('bark_' + key, lines), kind: 'ally' },
          { i: unit.i, text: this.pickFresh('interrupt', replies), kind: 'ally' }
        ]);
        return true;
      }
      // Preferencia por unidades en pantalla para que la charla se vea.
      const board = HF.cur && HF.cur() && HF.cur().board;
      const onScreen = c => {
        if (!board || !board.toScreen) return true;
        try {
          const p = board.pos(c), s = board.toScreen(p[0], p[1]);
          return s[0] > -60 && s[0] < board.W + 60 && s[1] > -60 && s[1] < board.H + 60;
        } catch (e) { return true; }
      };
      const vis = units.filter(onScreen);
      const pool = vis.length >= 2 ? vis : units;
      const pairs = [];
      for (let i = 0; i < pool.length; i++) for (let j = i + 1; j < pool.length; j++) {
        if (!HF.hexDist || HF.hexDist(pool[i], pool[j]) <= 3) pairs.push([pool[i], pool[j]]);
      }
      if (!pairs.length) pairs.push([pool[0], pool[1]]);
      let pair = null;
      for (let k = 0; k < 6; k++) {
        const p = pairs[Math.floor(Math.random() * pairs.length)];
        if (!this._lastPair || p[0].i !== this._lastPair[0] || p[1].i !== this._lastPair[1]) { pair = p; break; }
      }
      if (!pair) pair = pairs[0];
      this._lastPair = [pair[0].i, pair[1].i];
      const A = pair[0], B = pair[1], D = this.data();
      let steps = null;
      if (A.u.owner !== B.u.owner) {
        if (Math.random() < .35) {
          const gen = D.generator;
          steps = [
            { i: A.i, text: `${this.pickFresh('gen_lead', gen.insult_lead)} ${this.pickFresh('gen_body', gen.insult_body)} ${this.pickFresh('gen_target', gen.insult_target)}`, kind: 'enemy' },
            { i: B.i, text: `${this.pickFresh('gen_retort', gen.retort_lead)} ${this.pickFresh('gen_punch', gen.retort_punch)}`, kind: 'enemy' }
          ];
        } else {
          const d = this.pickFresh('duels', D.frontier_duels || []);
          if (d) steps = [{ i: A.i, text: d.a, kind: 'enemy' }, { i: B.i, text: d.b, kind: 'enemy' }];
        }
      } else if (Math.random() < .3) {
        // Los aliados también se chinchan: genera una pulla nueva.
        const gen = D.generator;
        steps = [
          { i: A.i, text: `${this.pickFresh('gen_lead', gen.insult_lead)} ${this.pickFresh('gen_body', gen.insult_body)} ${this.pickFresh('gen_target', gen.insult_target)}`, kind: 'ally' },
          { i: B.i, text: `${this.pickFresh('gen_retort', gen.retort_lead)} ${this.pickFresh('gen_punch', gen.retort_punch)}`, kind: 'ally' }
        ];
      } else if (A.u.type !== B.u.type) {
        const matches = (D.corps_rivalry || []).filter(x =>
          (x.pair[0] === A.u.type && x.pair[1] === B.u.type) ||
          (x.pair[0] === B.u.type && x.pair[1] === A.u.type));
        // Alterna rencilla y cháchara para no repetir siempre la misma pulla.
        const r = (matches.length && Math.random() < .55)
          ? this.pickFresh('rivalry_' + [A.u.type, B.u.type].sort().join('_'), matches) : null;
        if (r) {
          const swap = r.pair[0] !== A.u.type;
          steps = [
            { i: A.i, text: swap ? r.b : r.a, kind: 'ally' },
            { i: B.i, text: swap ? r.a : r.b, kind: 'ally' }
          ];
        }
      }
      if (!steps) {
        const convo = this.pickFresh('idle', D.idle_gossip || []);
        if (convo) steps = convo.map((s, k) => ({ i: k % 2 ? B.i : A.i, text: s.text, kind: 'ally' }));
      }
      if (!steps) return false;
      this.startSequence(g, steps);
      return true;
    }
  };
})(typeof window !== "undefined" ? window : globalThis);
