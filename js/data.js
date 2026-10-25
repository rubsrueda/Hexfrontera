(function (G) {
  const HF = G.HF;

  // id|nombre|tag
  const RAW = `A1|Raíz Terrestre|CIV_TYPE_SEDENTARY
A1.1|Burocracia|GOV_BUREAUCRACY
A1.1.1|Integración Universal|INTEGRATION_PRESERVE
A1.1.2|Enclave de Explotación|EXTRACTIVE_ENCLAVE
A1.1.3|Sustitución Demográfica|SETTLER_PURGE
A1.2|Teocracia Monumental|GOV_THEOCRACY
A1.2.1|Devoción Fanática|ZEALOT_MARTYRDOM
A1.2.2|Herejía Inquisitorial|INQUISITION_PURITY
A1.2.3|Ascetismo Agrario|ASCETIC_COMMUNE
A1.3|Casta Feudal|GOV_FEUDAL_NOBILITY
A1.3.1|Servidumbre Hereditaria|SERFDOM_CHAIN
A1.3.2|Orden de Caballería|KNIGHTLY_ORDER
A1.3.3|Señorío Fortificado|FORTIFIED_ESTATE
A2|Flujo Oceánico|CIV_TYPE_THALASSOCRACY
A2.1|Talasocracia Mercantil|GOV_MARITIME_TRADE
A2.1.1|Rutas de la Seda Marina|SILK_SEA_ROUTE
A2.1.2|Monopolio Portuario|PORT_MONOPOLY
A2.1.3|Factoría Costera|COASTAL_FACTORY
A2.2|Asalto Corsario|GOV_CORSAIR_RAID
A2.2.1|Pillaje de Riberas|SHORE_PILLAGE
A2.2.2|Drakkars Temerarios|DRAKKAR_STRIKE
A2.2.3|Fuego de Ensenada|COVE_BLAZE
A2.3|Comunidades Anfibias|GOV_AMPHIBIOUS
A2.3.1|Marismas Sagradas|SACRED_SWAMP
A2.3.2|Flota Doméstica|HOME_FLOTILLA
A2.3.3|Aislamiento Isleño|ISLAND_SANCTUARY
A3|Dispersión Móvil|CIV_TYPE_NOMAD
A3.1|Clan Pastoril|GOV_PASTORAL_CLAN
A3.1.1|Trashumancia Estacional|SEASONAL_MIGRATION
A3.1.2|Yurtas Desmontables|PACKABLE_YURTS
A3.1.3|Rebaños Libres|WILD_HERDS
A3.2|Horda de Choque|GOV_HORDE_SHOCK
A3.2.1|Economía del Botín|BOOTY_ECONOMY
A3.2.2|Terror Psicológico|TERROR_DOCTRINE
A3.2.3|Tributo a Galope|TRIBUTE_RIDERS
A3.3|Guerrilla Silvana|GOV_FOREST_GUERRILLA
A3.3.1|Red de Guías|SCOUT_NETWORK
A3.3.2|Tierra Quemada|SCORCHED_EARTH
A3.3.3|Emboscada Fronteriza|BORDER_AMBUSH
B1|Fuerza Pesada|TACTIC_HEAVY_LINE
B1.1|Disciplina de Legión|MIL_LEGION_DISCIPLINE
B1.1.1|Testudo Impenetrable|TESTUDO_SHIELD
B1.1.2|Guardia de Élite|PRAETORIAN_GUARD
B1.1.3|Castramentación|CASTRAMETATION
B1.2|Enjambre de Leva|MIL_LEVY_SWARM
B1.2.1|Picas Comunales|PIKE_WALL
B1.2.2|Sacrificio de Vanguardia|VANGUARD_SACRIFICE
B1.2.3|Marea Campesina|PEASANT_TIDE
B1.3|Ingeniería de Sitio|MIL_SIEGE_ENGINEERING
B1.3.1|Balística Incendiaria|INCENDIARY_BALLISTICS
B1.3.2|Zapadores Minadores|MINING_SAPPERS
B1.3.3|Foso Circundante|CIRCUMVALLATION
B2|Guerra de Maniobra|TACTIC_MOBILE_WAR
B2.1|Hostigadores a Caballo|MIL_HORSE_ARCHERS
B2.1.1|Disparo Parto|PARTHIAN_RETREAT
B2.1.2|Lluvia de la Estepa|STEPPE_BARRAGE
B2.1.3|Círculo de Hostigamiento|CANTABRIAN_CIRCLE
B2.2|Choque Blindado|MIL_SHOCK_CAVALRY
B2.2.1|Lanzas Cataphractas|CATAPHRACT_LANCE
B2.2.2|Estampida de Guerra|WAR_STAMPEDE
B2.2.3|Persecución Implacable|PURSUIT_FRENZY
B2.3|Batidores Ligeros|MIL_LIGHT_SCOUTS
B2.3.1|Raid de Suministros|SUPPLY_RAID
B2.3.2|Fantasma de la Estepa|STEPPE_GHOST
B2.3.3|Retirada Fingida|FEIGNED_RETREAT
B3|Control de Zona|TACTIC_AREA_DENIAL
B3.1|Maestría Balística|MIL_BALLISTIC_MASTERY
B3.1.1|Fuego de Interdicción|OVERWATCH_INTERDICTION
B3.1.2|Flechas de Cincel|CHISEL_TIP_ARROWS
B3.1.3|Fuego de Fósforo|PHOSPHORUS_FIRE
B3.2|Guerra Oculta|MIL_SHADOW_WAR
B3.2.1|Camuflaje de Emboscada|AMBUSH_CAMOUFLAGE
B3.2.2|Abrojos y Trampas|CALTROP_SNARE
B3.2.3|Veneno Neurotóxico|NEUROTOXIC_VENOM
B3.3|Guarnición Inmóvil|MIL_STATIC_GARRISON
B3.3.1|Troneras de Muralla|WALL_EMBRASURES
B3.3.2|Alerta de Almenaras|BEACON_ALERT
B3.3.3|Último Bastión|LAST_STAND_FORT
C1|Dominación Total|VICTORY_DOMINATION
C1.1|Guerra Relámpago|WIN_BLITZKRIEG
C1.1.1|Decapitación de Mando|DECAPITATION_STRIKE
C1.1.2|Colapso en Dominó|DOMINO_COLLAPSE
C1.1.3|Rendición por Shock|SHOCK_SURRENDER
C1.2|Guerra de Desgaste|WIN_ATTRITION_TOTAL
C1.2.1|Erradicación de Bastiones|BASTION_ERADICATION
C1.2.2|Asfixia de Trincheras|TRENCH_SUFFOCATION
C1.2.3|Rendición por Hambre|STARVATION_WIN
C1.3|Hegemonía Territorial|WIN_HEGEMONY_MAP
C1.3.1|Mancha Voraz|EXPANSION_VORACIOUS
C1.3.2|Cerco Geográfico|GEOGRAPHIC_RING
C1.3.3|Pax Imperialis|PAX_IMPERIALIS
C2|Trascendencia Magna|VICTORY_WONDER
C2.1|La Gran Obra|WIN_WONDER_BUILD
C2.1.1|Pirámide Eterna|PYRAMID_STAND_15T
C2.1.2|Torre del Saber|TOWER_OF_WISDOM
C2.1.3|Utopía Agraria|AGRARIAN_UTOPIA
C2.2|Hegemonía Cultural|WIN_CULTURAL_ABSORB
C2.2.1|El Gran Jubileo|JUBILEE_POINTS
C2.2.2|Peregrinación Sagrada|SACRED_PILGRIMAGE
C2.2.3|Faro Continental|CONTINENTAL_BEACON
C2.3|Resistencia de Tiempo|WIN_SURVIVAL_T50
C2.3.1|Bastión Inconmovible|UNSHAKABLE_KEEP
C2.3.2|La Edad Dorada|GOLDEN_ERA_STREAK
C2.3.3|Pacto de Concordia|CONCORDIA_TREATY
C3|Guerra Económica|VICTORY_FINANCIAL
C3.1|Banca Central|WIN_GOLD_ACCUMULATE
C3.1.1|OPA Hostil|HOSTILE_TAKEOVER
C3.1.2|Control Mercantil|MERCANTILE_CARTEL
C3.1.3|Burbuja Especulativa|DEBT_SPECULATION
C3.2|Estrangulamiento Logístico|WIN_LOGISTIC_CHOKE
C3.2.1|Bancarrota Inducida|INDUCED_BANKRUPTCY
C3.2.2|Bloqueo de Arterias|ARTERY_BLOCKADE
C3.2.3|Guerra de Corsarios|CORSAIR_DOMINANCE
C3.3|Tributo y Vasallaje|WIN_VASSALAGE_PACT
C3.3.1|Red de Extorsión|EXTORTION_NETWORK
C3.3.2|Embargo Total|BORDER_EMBARGO
C3.3.3|Protectorado Dorado|GOLDEN_PROTECTORATE`;

  HF.DOCT = {};
  for (const line of RAW.split('\n')) {
    const [id, name, tag] = line.split('|');
    HF.DOCT[id] = { id, name, tag, level: id.split('.').length, parent: id.includes('.') ? id.slice(0, id.lastIndexOf('.')) : null };
  }
  HF.PILLARS = [
    { key: 'alma', root: 'A', name: 'Alma', icon: '🕊️', q: '¿Cómo existes?' },
    { key: 'arma', root: 'B', name: 'Arma', icon: '⚔️', q: '¿Cómo luchas?' },
    { key: 'victoria', root: 'C', name: 'Victoria', icon: '👑', q: '¿Cómo ganas?' }
  ];
  HF.children = id => Object.values(HF.DOCT).filter(d => d.parent === id);
  HF.roots = letter => Object.values(HF.DOCT).filter(d => d.level === 1 && d.id[0] === letter);

  // Etiquetas con efecto real en el motor v1
  HF.IMPL = {
    Alma: {
      CIV_TYPE_SEDENTARY: 'Ciudades fijas. +3 oro por turno.',
      CIV_TYPE_NOMAD: 'Caballería sin penalización de colina y menor coste de mantenimiento.',
      GOV_BUREAUCRACY: 'Sin efecto extra en v1.',
      EXTRACTIVE_ENCLAVE: 'Talar da +20 madera en lugar de +10.',
      ASCETIC_COMMUNE: 'Las fusiones solo llegan a nivel 2; -1 de mantenimiento en infantería.',
      ZEALOT_MARTYRDOM: 'Con déficit tienes 2 turnos de gracia, luego pierdes todas las unidades.',
      INTEGRATION_PRESERVE: 'Con déficit, las casillas conquistadas se rebelan.',
      SERFDOM_CHAIN: '-50% de madera en mejoras.',
      GOV_FEUDAL_NOBILITY: '-20% coste de infantería.',
      KNIGHTLY_ORDER: 'Caballería defensa 2 y mantenimiento x2.'
    },
    Arma: {
      TACTIC_HEAVY_LINE: 'Infantería con alcance de movimiento 1.',
      TACTIC_MOBILE_WAR: 'Caballería alcance 3 y sin penalización de colina.',
      TESTUDO_SHIELD: '+1 defensa por infantería adyacente (máx. 2).',
      PIKE_WALL: 'La caballería enemiga pierde su carga.',
      MIL_LEVY_SWARM: 'Infantería nivel 1 a mitad de coste.',
      CHISEL_TIP_ARROWS: 'Los arqueros degradan 2 de defensa.'
    },
    Victoria: {
      WIN_BLITZKRIEG: 'Ganas dominando; si pasa el turno 15 pierdes.',
      WIN_SURVIVAL_T50: 'Sobrevive hasta el turno 50.',
      WIN_GOLD_ACCUMULATE: 'Acumula 500 de oro.',
      WIN_HEGEMONY_MAP: 'Controla el 75% de la tierra.',
      GOLDEN_ERA_STREAK: 'Saldo positivo 30 turnos seguidos.'
    }
  };
  HF.defaultTribe = () => ({
    tribe_id: 'local', name: 'Mi Tribu', color: '#3b82f6', crest: '🦅',
    alma_path: ['A1', 'A1.1', 'A1.1.1'], arma_path: ['B1', 'B1.1', 'B1.1.1'], victoria_path: ['C1', 'C1.3', 'C1.3.1'],
    active_rules: []
  });
  HF.compileTribe = t => {
    t.active_rules = [...t.alma_path, ...t.arma_path, ...t.victoria_path].map(id => HF.DOCT[id].tag);
    return t;
  };
  HF.validPath = (p, letter) => Array.isArray(p) && p.length === 3 && p.every((id, i) => HF.DOCT[id] && HF.DOCT[id].level === i + 1 && id[0] === letter && (i === 0 || HF.DOCT[id].parent === p[i - 1]));
  HF.validateProfile = t => {
    if (t && HF.validPath(t.alma_path, 'A') && HF.validPath(t.arma_path, 'B') && HF.validPath(t.victoria_path, 'C') && /^#[0-9a-f]{6}$/i.test(t.color || '')) return HF.compileTribe(t);
    console.warn('[WARN] Perfil de tribu corrupto. Restaurando valores seguros de fábrica');
    return HF.compileTribe(HF.defaultTribe());
  };
  HF.loadTribe = () => {
    const p = HF.store.get('tribe_profile', null);
    return p ? HF.validateProfile(p) : HF.compileTribe(HF.defaultTribe());
  };
  HF.PRESETS = [
    ['A1', 'A1.1', 'A1.1.2', 'B1', 'B1.1', 'B1.1.1', 'C1', 'C1.3', 'C1.3.1'],
    ['A3', 'A3.2', 'A3.2.1', 'B2', 'B2.2', 'B2.2.1', 'C1', 'C1.1', 'C1.1.1'],
    ['A1', 'A1.3', 'A1.3.2', 'B3', 'B3.1', 'B3.1.2', 'C2', 'C2.1', 'C2.1.1'],
    ['A1', 'A1.2', 'A1.2.3', 'B1', 'B1.2', 'B1.2.1', 'C3', 'C3.1', 'C3.1.2'],
    ['A3', 'A3.1', 'A3.1.1', 'B2', 'B2.1', 'B2.1.1', 'C2', 'C2.3', 'C2.3.2']
  ].map(a => ({ alma_path: a.slice(0, 3), arma_path: a.slice(3, 6), victoria_path: a.slice(6) }));

  HF.COLORS = ['#3b82f6', '#ef4444', '#22c55e', '#eab308', '#a855f7', '#f97316'];
  HF.CRESTS = ['🦅', '🐺', '🐻', '🦁', '🐉', '🦂', '🐗', '🦌', '⚓', '☀️', '🌙', '💀'];
  HF.AI_NAMES = ['Rojos', 'Verdes', 'Dorados', 'Violetas', 'Naranjas'];

  HF.T = { LLANO: 0, COLINA: 1, MONTANA: 2, RIO: 3, MAR: 4 };
  HF.TNAME = ['Llano', 'Colina', 'Montaña', 'Río', 'Mar'];
  HF.RES = { NINGUNO: 0, ORO: 1, TRIGO: 2, MADERA: 3 };
  HF.B = { NINGUNO: 0, ARBOL: 1, CAMINO: 2, CAMPAMENTO: 3, PUEBLO: 4, CIUDAD: 5, BASTION: 6 };
  HF.BNAME = ['', 'Árbol', 'Camino', 'Campamento', 'Pueblo', 'Ciudad', 'Bastión'];
  HF.BICON = ['', '🌲', '🛤', '⛺', '🏠', '🏙', '🏰'];
  // los valores numéricos se definen en config.js
  const CFG = HF.CFG;
  HF.BLEVEL = CFG.buildingLevel;
  HF.RANK = CFG.buildingRank;
  HF.BDEF = CFG.buildingDef;
  HF.PROD = CFG.buildingProd;
  HF.UNITS = CFG.units;
  HF.BCOST = CFG.buildingCost;
  HF.SIZES = CFG.sizes;
  HF.BIOMES = CFG.biomes;
})(typeof window !== 'undefined' ? window : globalThis);
