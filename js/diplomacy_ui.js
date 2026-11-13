/* FEDERATI · Pantalla de diplomacia.
   El panel se abre como modal (antes se inyectaba en #info, que tiene
   pointer-events:none: los botones no se podían pulsar y el mapa lo borraba al
   primer clic). Todos los datos pasan por HF.Diplomacy.ensure, así que la
   pantalla funciona igual con una partida nueva, reanudada o deshecha. */
(function (G) {
  const HF = G.HF = G.HF || {};

  const en = () => (typeof HF.lang === 'function' ? HF.lang() === 'en' : false);
  const L = (es, t) => (en() ? t : es);
  const esc = s => (typeof HF.esc === 'function' ? HF.esc(s) : String(s));
  const toast = (msg, ms) => { if (typeof HF.toast === 'function') HF.toast(msg, ms); };

  const TYPE_ICON = {
    non_aggression_pact: '🕊️',
    trade_agreement: '🤝',
    loan_contract: '💰',
    truce: '🏳️'
  };
  const TYPE_NAME = {
    non_aggression_pact: () => L('Pacto de No Agresión', 'Non-Aggression Pact'),
    trade_agreement: () => L('Acuerdo Comercial', 'Trade Agreement'),
    loan_contract: () => L('Préstamo', 'Loan'),
    truce: () => L('Tregua', 'Truce')
  };
  const THREAT_LABEL = th => th >= 70 ? L('Guerra', 'War')
    : th >= 50 ? L('Alerta', 'Alert')
      : th >= 25 ? L('Tensión', 'Tension')
        : L('Paz', 'Peace');
  const THREAT_CLASS = th => th >= 70 ? 'war' : th >= 50 ? 'alert' : th >= 25 ? 'tense' : 'calm';

  // ------------------------------------------------------------------
  // Overlay de fronteras del Pacto Sagrado
  // ------------------------------------------------------------------
  let borderCache = { key: '', borders: null };

  function borderCellsBetween(g, a, b) {
    const set = new Set();
    for (const c of g.cells) {
      if (!c || (c.o !== a && c.o !== b)) continue;
      for (const nb of HF.nbs(g, c.i)) {
        const n = g.cells[nb];
        if (n && (n.o === a || n.o === b) && n.o !== c.o) { set.add(c.i); set.add(n.i); }
      }
    }
    return set;
  }

  function drawNAPBorderOverlay(g, ctx, board) {
    try {
      if (!g || !ctx || !board || !g.treaties || !(g.treaties instanceof Map)) return;
      const DIP = HF.Diplomacy;
      if (!DIP) return;
      const naps = [];
      for (const t of g.treaties.values()) {
        if (t.type !== 'non_aggression_pact' || t.status !== 'active') continue;
        if (!t.napTerms || !t.napTerms.borderLock) continue;
        naps.push(t);
      }
      if (!naps.length) { borderCache = { key: '', borders: null }; return; }
      const key = g.turn + '|' + naps.map(t => t.id + ':' + t.expiryTurn).join(',');
      if (borderCache.key !== key) {
        const map = new Map();
        for (const t of naps) map.set(t.id, borderCellsBetween(g, t.factions[0], t.factions[1]));
        borderCache = { key: key, borders: map };
      }
      const fog = board.fogMap;
      const colors = board.colors || [];
      const fsBase = (board.size || 24) * (board.cam ? board.cam.z : 1);
      if (fsBase <= 0) return;
      const pulse = 0.62 + 0.18 * Math.sin(Date.now() / 320);
      ctx.save();
      for (const t of naps) {
        const cells = borderCache.borders.get(t.id);
        if (!cells || !cells.size) continue;
        const countdown = t.expiryTurn - g.turn + 1;
        const colorA = colors[t.factions[0]] || '#22c55e';
        const colorB = colors[t.factions[1]] || '#22c55e';
        ctx.setLineDash([fsBase * 0.26, fsBase * 0.14]);
        ctx.globalAlpha = pulse;
        for (const id of cells) {
          if (fog && fog[id] === 0) continue;
          const c = g.cells[id];
          if (!c) continue;
          const [wx, wy] = board.pos(c);
          const [x, y] = board.toScreen(wx, wy);
          if (x < -fsBase * 2 || y < -fsBase * 2 || x > board.W + fsBase * 2 || y > board.H + fsBase * 2) continue;
          const grad = ctx.createLinearGradient(x - fsBase, y, x + fsBase, y);
          grad.addColorStop(0, colorA);
          grad.addColorStop(0.5, '#FFD86B');
          grad.addColorStop(1, colorB);
          ctx.strokeStyle = grad;
          ctx.lineWidth = Math.max(1.6, fsBase * 0.07);
          strokeHex(ctx, x, y, fsBase);
        }
        // Contador de expiración en la primera celda visible del tratado.
        if (countdown <= 5) {
          for (const id of cells) {
            if (fog && fog[id] === 0) continue;
            const c = g.cells[id];
            if (!c) continue;
            const [wx, wy] = board.pos(c);
            const [x, y] = board.toScreen(wx, wy);
            const size = Math.max(10, fsBase * 0.34);
            const text = String(Math.max(0, countdown));
            ctx.globalAlpha = 0.95;
            ctx.font = '700 ' + size + 'px "Plus Jakarta Sans", sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            const w = ctx.measureText(text).width;
            ctx.fillStyle = 'rgba(8,14,28,.78)';
            ctx.fillRect(x - w / 2 - 4, y - size * 0.75, w + 8, size * 1.5);
            ctx.fillStyle = countdown <= 2 ? '#f87171' : '#fbbf24';
            ctx.fillText(text, x, y);
            break;
          }
        }
      }
      ctx.restore();
    } catch (e) {
      try { ctx.restore(); } catch (e2) { /* contexto ya restaurado */ }
      if (HF.dipError) HF.dipError('drawNAPBorderOverlay', e);
    }
  }

  function strokeHex(ctx, x, y, fs) {
    const sy = fs * ((HF.CFG && HF.CFG.view && HF.CFG.view.tilt) || 0.62);
    ctx.beginPath();
    for (let k = 0; k < 6; k++) {
      const a = Math.PI / 180 * (60 * k - 30);
      const px = x + fs * Math.cos(a), py = y + sy * Math.sin(a);
      if (k) ctx.lineTo(px, py); else ctx.moveTo(px, py);
    }
    ctx.closePath();
    ctx.stroke();
  }

  // ------------------------------------------------------------------
  // Panel
  // ------------------------------------------------------------------
  function treatyDetails(g, t, viewerId) {
    if (t.type === 'non_aggression_pact') {
      const lock = t.napTerms && t.napTerms.borderLock;
      const sacred = t.napTerms && t.napTerms.breakPenalty === 0;
      return [
        (lock ? '🔒 ' + L('Frontera sellada', 'Closed border') : '🔓 ' + L('Frontera abierta', 'Open border')),
        (t.napTerms && t.napTerms.visionSharing ? '👁️ ' + L('Visión compartida', 'Shared vision') : ''),
        sacred ? '⚖️ ' + L('Pacto Sagrado', 'Sacred Pact') : '⚖️ ' + L('Rompible', 'Breakable')
      ].filter(Boolean).join(' · ');
    }
    if (t.type === 'trade_agreement') {
      const routes = t.tradeTerms ? t.tradeTerms.routes.filter(r => r.active) : [];
      return '🛤️ ' + routes.length + ' ' + L('rutas', 'routes') +
        ' · 💎 ' + (t.tradeTerms ? t.tradeTerms.totalValuePerTurn : 0) + '/' + L('turno', 'turn');
    }
    if (t.type === 'loan_contract') {
      const ln = t.loanTerms;
      return '💵 ' + ln.principal + ' · 📈 ' + Math.round(ln.interestRate * 100) + '% · ⏳ ' +
        ln.remainingTurns + 'T · ' + L('deuda', 'debt') + ' ' + ln.totalOwed;
    }
    return '';
  }

  function panelHTML(g, factionId) {
    const DIP = HF.Diplomacy;
    DIP.ensure(g);
    const f = g.f[factionId];
    const s = DIP.getDiplomacySummary(g, factionId);
    const active = DIP.getActiveTreaties(g, factionId);
    const incoming = DIP.getIncomingProposals(g, factionId);
    const sent = DIP.getSentProposals(g, factionId);
    const others = g.f.filter(o => o && o.alive && o.id !== factionId);

    let html = '<div class="dip-panel">';
    html += '<div class="dip-head"><div class="dip-title">🕊️ ' + L('Diplomacia', 'Diplomacy') +
      ' <small>' + esc(f ? f.name : '') + '</small></div>' +
      '<button class="dip-x" id="dipClose" aria-label="' + L('Cerrar', 'Close') + '">✕</button></div>';

    html += '<div class="dip-summary">' +
      chip('🕊️', s.napCount, 'PNA') +
      chip('🤝', s.tradeCount, L('Comercio', 'Trade')) +
      chip('💰', s.loanCount, L('Préstamos', 'Loans')) +
      chip('⭐', s.creditScore, L('Crédito', 'Credit')) +
      chip('💵', s.pendingPayment, L('Cuota/turno', 'Due/turn')) +
      '</div>';

    // Relaciones + amenaza
    html += '<div class="dip-sec"><h4>' + L('Relaciones', 'Relations') + '</h4><div class="dip-list">';
    if (!others.length) html += '<div class="dim small">' + L('Sin rivales vivos', 'No living rivals') + '</div>';
    for (const o of others) {
      const threat = DIP.threatOf(g, factionId, o.id);
      const trust = DIP.trustOf(g, factionId, o.id);
      const nap = DIP.hasActiveNAP(g, factionId, o.id);
      const napT = DIP.getActiveTreaties(g, factionId, DIP.TT.NAP).find(t => t.factions.indexOf(o.id) >= 0);
      const war = DIP.getActiveTreaties(g, factionId, DIP.TT.TRUCE).find(t => t.factions.indexOf(o.id) >= 0);
      html += '<div class="dip-fac ' + THREAT_CLASS(threat) + '">' +
        '<div class="dip-fhead">' + (typeof HF.crestHTML === 'function' ? HF.crestHTML(o.crest, 18) : '') +
        '<b>' + esc(o.name) + '</b><span class="dip-rel">' + THREAT_LABEL(threat) + '</span></div>' +
        '<div class="dip-bar"><i style="width:' + Math.max(2, Math.min(100, threat)) + '%"></i></div>' +
        '<div class="dip-fmeta">' + L('Amenaza', 'Threat') + ' ' + threat + ' · ' +
        L('Confianza', 'Trust') + ' ' + trust +
        (nap ? ' · 🕊️ ' + (napT ? Math.max(0, napT.expiryTurn - g.turn + 1) + 'T' : '') : '') +
        (war ? ' · 🏳️ ' + L('tregua', 'truce') : '') + '</div>' +
        '<div class="dip-fbtns">' +
        '<button data-fid="' + o.id + '" data-act="nap">🕊️ ' + L('Proponer PNA', 'Propose NAP') + '</button>' +
        '<button data-fid="' + o.id + '" data-act="trade">🤝 ' + L('Proponer comercio', 'Propose trade') + '</button>' +
        '</div></div>';
    }
    html += '</div></div>';

    // Tratados activos
    html += '<div class="dip-sec"><h4>' + L('Tratados activos', 'Active treaties') +
      ' <span class="dip-count">' + active.length + '</span></h4><div class="dip-list">';
    if (!active.length) html += '<div class="dim small">' + L('Sin tratados activos', 'No active treaties') + '</div>';
    for (const t of active) {
      const other = t.factions.find(id => id !== factionId);
      const otherF = g.f[other];
      const cd = Math.max(0, t.expiryTurn - g.turn + 1);
      const sacred = t.type === 'non_aggression_pact' && t.napTerms && t.napTerms.breakPenalty === 0;
      html += '<div class="dip-treaty ' + (t.type === 'non_aggression_pact' ? 'nap' : t.type === 'trade_agreement' ? 'trade' : 'loan') +
        '" data-treaty="' + t.id + '" title="' + esc(DIP.getTreatyTooltip(g, t.id, factionId)) + '">' +
        '<div class="dip-thead"><span>' + (TYPE_ICON[t.type] || '📜') + '</span><b>' +
        esc(otherF ? otherF.name : '?') + '</b><span class="dip-cd ' + (cd <= 3 ? 'urgent' : '') + '">' + cd + 'T</span></div>' +
        '<div class="dip-tdet">' + treatyDetails(g, t, factionId) + '</div>' +
        (t.type === 'non_aggression_pact' && !sacred
          ? '<button class="dip-break" data-break="' + t.id + '">' + L('Romper', 'Break') + '</button>' : '') +
        '</div>';
    }
    html += '</div></div>';

    // Propuestas recibidas
    if (incoming.length) {
      html += '<div class="dip-sec"><h4>' + L('Propuestas recibidas', 'Incoming proposals') + '</h4><div class="dip-list">';
      for (const t of incoming) {
        const from = g.f[t.proposer];
        html += '<div class="dip-treaty incoming">' +
          '<div class="dip-thead"><span>' + (TYPE_ICON[t.type] || '📜') + '</span><b>' +
          esc(from ? from.name : '?') + '</b><span class="dip-cd">' + (t.duration || 0) + 'T</span></div>' +
          '<div class="dip-tdet">' + (TYPE_NAME[t.type] ? TYPE_NAME[t.type]() : t.type) + '</div>' +
          '<div class="dip-fbtns"><button class="pri" data-acc="' + t.id + '">' + L('Aceptar', 'Accept') + '</button>' +
          '<button data-rej="' + t.id + '">' + L('Rechazar', 'Reject') + '</button></div></div>';
      }
      html += '</div></div>';
    }

    // Propuestas enviadas
    if (sent.length) {
      html += '<div class="dip-sec"><h4>' + L('Enviadas sin respuesta', 'Sent, awaiting reply') + '</h4><div class="dip-list">';
      for (const t of sent) {
        const to = g.f[t.factions.find(id => id !== t.proposer)];
        html += '<div class="dip-treaty sent"><div class="dip-thead"><span>' + (TYPE_ICON[t.type] || '📜') + '</span><b>' +
          esc(to ? to.name : '?') + '</b><span class="dip-cd">' + L('espera', 'waiting') + '</span></div>' +
          '<div class="dip-tdet">' + (TYPE_NAME[t.type] ? TYPE_NAME[t.type]() : t.type) + '</div></div>';
      }
      html += '</div></div>';
    }

    html += '<div class="dip-actions">' +
      '<button class="pri" data-act="nap">🕊️ ' + L('Nuevo PNA', 'New NAP') + '</button>' +
      '<button data-act="trade">🤝 ' + L('Nuevo comercio', 'New trade') + '</button>' +
      '<button data-act="loan_req">💰 ' + L('Pedir préstamo', 'Request loan') + '</button>' +
      '<button data-act="loan_off">🏦 ' + L('Ofrecer préstamo', 'Offer loan') + '</button>' +
      '</div>';

    const log = (g.diplomacyLog || []).slice(-8).reverse();
    if (log.length) {
      html += '<div class="dip-sec"><h4>' + L('Registro', 'Log') + '</h4><div class="dip-log">';
      for (const e of log) {
        const names = (e.factions || []).map(id => (g.f[id] && g.f[id].name) || '?').join(' · ');
        const label = e.treaty ? (TYPE_ICON[e.treaty] || '📜') + ' ' + (TYPE_NAME[e.treaty] ? TYPE_NAME[e.treaty]() : e.treaty) : '';
        const kind = e.type === 'signed' ? '✓' : e.type === 'rejected' ? '✕' : e.type === 'broken' ? '⚡'
          : e.type === 'loan_signed' ? '💰' : e.type === 'loan_default' ? '⚠️' : '·';
        html += '<div class="dip-log-row"><span>T' + e.turn + '</span><b>' + kind + '</b><span>' + label + ' ' + esc(names) + '</span></div>';
      }
      html += '</div></div>';
    }

    html += '<div class="dip-foot dim small">' + L(
      'El Pacto Sagrado con cierre fronterizo es inquebrantable: nadie puede atacar a través de esa frontera hasta que expire.',
      'A Sacred Pact with a closed border is unbreakable: nobody can attack across it until it expires.'
    ) + '</div>';
    html += '</div>';
    return html;
  }

  function chip(icon, value, label) {
    return '<div class="dip-chip"><span>' + icon + '</span><b>' + (value == null ? 0 : value) + '</b><small>' + label + '</small></div>';
  }

  const DiplomacyUI = {
    open: function (g, factionId) {
      if (!g || !HF.Diplomacy || !g.f[factionId]) return;
      try {
        HF.Diplomacy.ensure(g);
        const html = panelHTML(g, factionId);
        HF.modal(html, m => {
          m.classList.add('dip-modal');
          bindPanel(g, factionId, m);
        });
      } catch (e) {
        if (HF.dipError) HF.dipError('DiplomacyUI.open', e);
        toast(L('No se pudo abrir la diplomacia', 'Could not open diplomacy'));
      }
    },

    // Compatibilidad: rellena un contenedor (HUD antiguo) sin depender de #info.
    renderDiplomacyPanel: function (g, factionId, container) {
      try {
        HF.Diplomacy.ensure(g);
        if (container && container.nodeType === 1 && container.classList) {
          container.classList.add('dip-host');
          container.innerHTML = panelHTML(g, factionId);
          bindPanel(g, factionId, container);
          return;
        }
      } catch (e) { if (HF.dipError) HF.dipError('renderDiplomacyPanel', e); }
      DiplomacyUI.open(g, factionId);
    },

    getTreatyTooltip: function (g, treatyId, viewerFaction) {
      try { return HF.Diplomacy.getTreatyTooltip(g, treatyId, viewerFaction); }
      catch (e) { return ''; }
    },

    drawNAPBorderOverlay: drawNAPBorderOverlay,

    // Línea temporal (se conserva para el HUD y los replays).
    renderDiplomacyTimeline: function (g, ctx, board, x, y, width, height) {
      try {
        HF.Diplomacy.ensure(g);
        const treaties = HF.Diplomacy.getAllActive(g)
          .slice().sort((a, b) => a.expiryTurn - b.expiryTurn);
        if (!treaties.length) return;
        const barHeight = 22, padding = 6;
        const maxTurns = Math.max(g.turn + 10, ...treaties.map(t => t.expiryTurn));
        const timeRange = Math.max(1, maxTurns - g.turn + 1);
        ctx.save();
        ctx.translate(x, y);
        ctx.fillStyle = 'rgba(8,14,28,.9)';
        ctx.fillRect(0, 0, width, treaties.length * (barHeight + padding) + padding);
        ctx.strokeStyle = 'rgba(244,239,234,.15)';
        ctx.strokeRect(0, 0, width, treaties.length * (barHeight + padding) + padding);
        treaties.forEach((t, i) => {
          const ty = padding + i * (barHeight + padding);
          const cd = Math.max(0, t.expiryTurn - g.turn + 1);
          const total = Math.max(1, t.expiryTurn - t.startTurn + 1);
          const progress = Math.max(0, Math.min(1, (total - cd) / total));
          const baseColor = t.type === 'non_aggression_pact' ? '#22c55e'
            : t.type === 'trade_agreement' ? '#eab308' : '#f97316';
          const barWidth = width - padding * 2;
          ctx.fillStyle = 'rgba(255,255,255,.1)';
          ctx.fillRect(padding, ty, barWidth, barHeight);
          ctx.fillStyle = baseColor;
          ctx.fillRect(padding, ty, barWidth * progress, barHeight);
          const other = t.factions.find(id => id !== g.cur);
          const otherF = g.f[other];
          ctx.fillStyle = '#F4EFEA';
          ctx.font = '600 11px "Plus Jakarta Sans", sans-serif';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle';
          ctx.fillText((TYPE_ICON[t.type] || '📜') + ' ' + (otherF ? otherF.name : '?'), padding + 6, ty + barHeight / 2);
          ctx.fillStyle = cd <= 2 ? '#f87171' : cd <= 5 ? '#fbbf24' : '#4ade80';
          ctx.textAlign = 'right';
          ctx.fillText(cd + 'T', width - padding - 6, ty + barHeight / 2);
        });
        ctx.restore();
      } catch (e) { if (HF.dipError) HF.dipError('renderDiplomacyTimeline', e); }
    },

    showProposeTreatyModal: function (g, factionId, type, preTarget) {
      try {
        HF.Diplomacy.ensure(g);
        const candidates = g.f.filter(o => o && o.alive && o.id !== factionId);
        if (!candidates.length) { toast(L('No hay facciones disponibles para tratar', 'No factions available')); return; }
        const isNAP = type === HF.TREATY_TYPES.NAP;
        let html = '<h3>' + (isNAP ? '🕊️ ' + L('Proponer PNA', 'Propose NAP') : '🤝 ' + L('Proponer acuerdo comercial', 'Propose trade')) + '</h3>' +
          '<div class="form-group"><label>' + L('Facción objetivo', 'Target faction') + '</label><select id="dipTarget">' +
          candidates.map(c => '<option value="' + c.id + '"' + (preTarget != null && c.id === preTarget ? ' selected' : '') + '>' +
            esc(c.name) + '</option>').join('') + '</select></div>';
        html += '<div class="form-group"><label>' + L('Duración (turnos)', 'Duration (turns)') + '</label>' +
          '<input type="number" id="dipDuration" min="5" max="30" value="' + (isNAP ? 10 : 15) + '"></div>';
        if (isNAP) {
          html += '<div class="form-group"><label><input type="checkbox" id="dipBorderLock" checked> ' +
            L('Cierre fronterizo (Pacto Sagrado: inquebrantable)', 'Closed border (Sacred Pact: unbreakable)') + '</label></div>' +
            '<div class="form-group"><label><input type="checkbox" id="dipVisionSharing"> ' +
            L('Visión compartida', 'Shared vision') + '</label></div>' +
            '<div class="dim small">' + L('Con cierre fronterizo el tratado es INQUEBRANTABLE: solo termina por expiración natural.', 'With a closed border the treaty is UNBREAKABLE: it only ends by natural expiry.') + '</div>';
        } else {
          html += '<div class="form-group"><label>' + L('Recurso a enviar', 'Resource to send') + '</label><select id="dipGiveRes">' +
            '<option value="food">🌾 ' + L('Comida', 'Food') + '</option><option value="gold">💰 ' + L('Oro', 'Gold') + '</option>' +
            '<option value="wood">🪵 ' + L('Madera', 'Wood') + '</option><option value="iron">⛏️ ' + L('Hierro', 'Iron') + '</option></select></div>' +
            '<div class="form-group"><label>' + L('Cantidad por turno', 'Amount per turn') + '</label>' +
            '<input type="number" id="dipGiveAmt" min="1" max="12" value="4"></div>' +
            '<div class="form-group"><label>' + L('Recurso a recibir', 'Resource to receive') + '</label><select id="dipTakeRes">' +
            '<option value="food">🌾 ' + L('Comida', 'Food') + '</option><option value="gold">💰 ' + L('Oro', 'Gold') + '</option>' +
            '<option value="wood">🪵 ' + L('Madera', 'Wood') + '</option><option value="iron">⛏️ ' + L('Hierro', 'Iron') + '</option></select></div>' +
            '<div class="form-group"><label>' + L('Cantidad por turno', 'Amount per turn') + '</label>' +
            '<input type="number" id="dipTakeAmt" min="1" max="12" value="4"></div>';
        }
        html += '<div class="row"><button id="dipSend" class="pri grow">' + L('Proponer', 'Propose') + '</button>' +
          '<button id="dipCancel">' + L('Cancelar', 'Cancel') + '</button></div>';
        HF.modal(html, m => {
          m.querySelector('#dipCancel').onclick = () => { HF.closeModal(); DiplomacyUI.open(g, factionId); };
          m.querySelector('#dipSend').onclick = () => {
            const target = +m.querySelector('#dipTarget').value;
            const duration = +m.querySelector('#dipDuration').value;
            const terms = { duration: duration };
            if (isNAP) {
              const borderLock = m.querySelector('#dipBorderLock').checked;
              terms.borderLock = borderLock;
              terms.visionSharing = m.querySelector('#dipVisionSharing').checked;
              terms.breakPenalty = borderLock ? 0 : 50;
            } else {
              const giveRes = m.querySelector('#dipGiveRes').value;
              const takeRes = m.querySelector('#dipTakeRes').value;
              terms.routes = [
                { resource: giveRes, fromFaction: factionId, toFaction: target, amountPerTurn: +m.querySelector('#dipGiveAmt').value },
                { resource: takeRes, fromFaction: target, toFaction: factionId, amountPerTurn: +m.querySelector('#dipTakeAmt').value }
              ];
            }
            const res = HF.Diplomacy.proposeTreaty(g, factionId, target, type, terms);
            if (!res.success) { toast(res.message || L('Propuesta rechazada', 'Proposal refused'), 3000); return; }
            if (res.accepted) toast('🤝 ' + L('Tratado aceptado', 'Treaty accepted'), 2800);
            else if (res.status === 'negotiating') toast(L('Propuesta enviada; espera respuesta', 'Proposal sent; awaiting reply'), 2800);
            else toast('✕ ' + L('La otra facción ha rechazado la propuesta', 'The other faction rejected the proposal'), 3000);
            HF.closeModal();
            DiplomacyUI.open(g, factionId);
          };
        });
      } catch (e) {
        if (HF.dipError) HF.dipError('showProposeTreatyModal', e);
        toast(L('No se pudo proponer el tratado', 'Could not propose the treaty'));
      }
    },

    showLoanModal: function (g, factionId, mode) {
      try {
        HF.Diplomacy.ensure(g);
        const f = g.f[factionId];
        const cfg = g.diplomacyConfig.loans;
        let html = '<h3>' + (mode === 'request' ? '💰 ' + L('Solicitar préstamo', 'Request loan') : '🏦 ' + L('Ofrecer préstamo', 'Offer loan')) + '</h3>';
        if (mode === 'request') {
          html += '<div class="form-group"><label>' + L('Cantidad', 'Amount') + '</label>' +
            '<input type="number" id="loanAmount" min="10" max="300" value="50"></div>' +
            '<div class="form-group"><label>' + L('Tasa máxima (%)', 'Maximum rate (%)') + '</label>' +
            '<input type="number" id="loanMaxRate" min="5" max="50" step="1" value="15"></div>' +
            '<div class="form-group"><label>' + L('Propósito', 'Purpose') + '</label><select id="loanPurpose">' +
            '<option value="emergency">' + L('Emergencia', 'Emergency') + '</option>' +
            '<option value="development">' + L('Desarrollo', 'Development') + '</option>' +
            '<option value="military">' + L('Militar', 'Military') + '</option></select></div>' +
            '<div class="form-group"><label>' + L('Prestamista preferido (opcional)', 'Preferred lender (optional)') + '</label>' +
            '<select id="loanLender"><option value="">' + L('Cualquiera', 'Any') + '</option>' +
            g.f.filter(o => o && o.alive && o.id !== factionId && (o.gold || 0) > 50)
              .map(o => '<option value="' + o.id + '">' + esc(o.name) + ' (' + o.gold + '💰)</option>').join('') +
            '</select></div>';
        } else {
          html += '<div class="form-group"><label>' + L('Cantidad máxima', 'Maximum amount') + '</label>' +
            '<input type="number" id="loanAmount" min="10" max="' + Math.max(10, f.gold || 0) + '" value="' + Math.min(100, f.gold || 10) + '"></div>' +
            '<div class="form-group"><label>' + L('Tasa base (%)', 'Base rate (%)') + '</label>' +
            '<input type="number" id="loanRate" min="5" max="50" step="1" value="10"></div>' +
            '<div class="form-group"><label>' + L('Score mínimo', 'Minimum credit score') + '</label>' +
            '<input type="number" id="loanMinScore" min="0" max="100" value="50"></div>';
        }
        html += '<div class="row"><button id="loanSubmit" class="pri grow">' +
          (mode === 'request' ? L('Solicitar', 'Request') : L('Ofrecer', 'Offer')) + '</button>' +
          '<button id="loanCancel">' + L('Cancelar', 'Cancel') + '</button></div>';
        HF.modal(html, m => {
          m.querySelector('#loanCancel').onclick = () => { HF.closeModal(); DiplomacyUI.open(g, factionId); };
          m.querySelector('#loanSubmit').onclick = () => {
            let res;
            if (mode === 'request') {
              const amount = +m.querySelector('#loanAmount').value;
              const maxRate = +m.querySelector('#loanMaxRate').value / 100;
              const purpose = m.querySelector('#loanPurpose').value;
              const lender = m.querySelector('#loanLender').value;
              res = HF.Diplomacy.requestLoan(g, factionId, amount, maxRate, purpose, lender === '' ? null : +lender);
            } else {
              const amount = +m.querySelector('#loanAmount').value;
              const rate = +m.querySelector('#loanRate').value / 100;
              const minScore = +m.querySelector('#loanMinScore').value;
              res = HF.Diplomacy.offerLoan(g, factionId, amount, rate, minScore);
            }
            if (res && res.success) {
              toast(mode === 'request' ? L('Solicitud publicada en el mercado', 'Request posted to the market')
                : L('Oferta publicada en el mercado', 'Offer posted to the market'), 2600);
            } else {
              toast((res && res.message) || L('No se pudo completar la operación', 'Operation failed'), 3000);
            }
            HF.closeModal();
            DiplomacyUI.open(g, factionId);
          };
        });
      } catch (e) {
        if (HF.dipError) HF.dipError('showLoanModal', e);
        toast(L('No se pudo abrir el préstamo', 'Could not open the loan dialog'));
      }
    },

    triggerDiplomacyEvent: async function (g, eventType, data) {
      try {
        const resp = await fetch('data/diplomacy_events.json');
        const events = await resp.json();
        const template = events && events.templates && events.templates[eventType];
        if (!template) return;
        const variants = template.variants || [template.text || ''];
        let text = variants[Math.floor(Math.random() * variants.length)];
        for (const [key, value] of Object.entries(data || {})) {
          text = text.replace(new RegExp('\\{' + key + '\\}', 'g'), value);
        }
        if (typeof HF.toast === 'function') HF.toast(text, 4000);
        if (template.importance === 'high') {
          if (typeof HF.recordTimeline === 'function') HF.recordTimeline(g);
          g.events.push({ i: (data && data.cellId) || null, txt: text, kind: template.kind || 'info', turn: g.turn });
        }
      } catch (e) {
        if (HF.dipError) HF.dipError('triggerDiplomacyEvent', e);
      }
    }
  };

  HF.DiplomacyUI = DiplomacyUI;

  // ------------------------------------------------------------------
  // Eventos del panel
  // ------------------------------------------------------------------
  function bindPanel(g, factionId, m) {
    const close = m.querySelector('#dipClose');
    if (close) close.onclick = HF.closeModal;
    const reopen = () => { HF.closeModal(); DiplomacyUI.open(g, factionId); };

    m.querySelectorAll('[data-act]').forEach(btn => {
      btn.onclick = () => {
        const act = btn.dataset.act;
        const fid = btn.dataset.fid != null ? +btn.dataset.fid : null;
        if (act === 'nap') DiplomacyUI.showProposeTreatyModal(g, factionId, HF.TREATY_TYPES.NAP, fid);
        else if (act === 'trade') DiplomacyUI.showProposeTreatyModal(g, factionId, HF.TREATY_TYPES.TRADE, fid);
        else if (act === 'loan_req') DiplomacyUI.showLoanModal(g, factionId, 'request');
        else if (act === 'loan_off') DiplomacyUI.showLoanModal(g, factionId, 'offer');
      };
    });

    m.querySelectorAll('[data-acc]').forEach(btn => {
      btn.onclick = () => {
        const res = HF.Diplomacy.respondToTreaty(g, +btn.dataset.acc, factionId, 'accept');
        toast(res && res.success ? '🤝 ' + L('Tratado aceptado', 'Treaty accepted')
          : L('No se pudo aceptar el tratado', 'Could not accept the treaty'), 2800);
        reopen();
      };
    });

    m.querySelectorAll('[data-rej]').forEach(btn => {
      btn.onclick = () => {
        HF.Diplomacy.respondToTreaty(g, +btn.dataset.rej, factionId, 'reject');
        toast(L('Propuesta rechazada', 'Proposal rejected'), 2200);
        reopen();
      };
    });

    m.querySelectorAll('[data-break]').forEach(btn => {
      btn.onclick = () => {
        const ok = typeof confirm !== 'function' || confirm(L('¿Romper este tratado? Perderás confianza.', 'Break this treaty? You will lose trust.'));
        if (!ok) return;
        const res = HF.Diplomacy.breakTreaty(g, +btn.dataset.break, factionId);
        toast(res && res.success ? '⚡ ' + L('Tratado roto', 'Treaty broken') : ((res && res.message) || L('No se pudo romper', 'Could not break')), 3000);
        reopen();
      };
    });
  }
})(typeof window !== 'undefined' ? window : globalThis);
