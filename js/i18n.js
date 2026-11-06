(function (G) {
  const HF = G.HF = G.HF || {};
  HF.LOCALES = {
    es: {
      HUB_TITLE: 'FEDERATI',
      HUB_SUBTITLE: 'Estrategia hexagonal por turnos',
      BTN_CONTINUE: '▶ Continuar',
      BTN_CAMPAIGN: '⚔️ Campaña',
      BTN_NEW_GAME: '🎲 Nueva partida',
      BTN_ONLINE: '🌐 En línea',
      BTN_DAILY: '🏆 Diario',
      BTN_NEWS: '📢',
      DOCK_TRIBE: 'Tribu',
      DOCK_MAPS: 'Mapas',
      DOCK_STATS: 'Stats',
      DOCK_SETTINGS: 'Ajustes',
      DOCK_WIKI: 'Códice',
      SETTINGS: 'Ajustes',
      SOUND: '🔊 Sonido',
      VIBRATE: '📳 Vibración',
      GRID: '▦ Rejilla del mapa',
      LANGUAGE: '🌐 Idioma',
      RESET: '🗑 Borrar todos los datos',
      RESET_CONFIRM: '¿Borrar todos los datos locales?',
      LOCAL_DATA: 'Todos los datos se guardan localmente en este dispositivo.',
      GAME_BUILD: 'Construir',
      GAME_RECRUIT: 'Reclutar',
      GAME_UNDO: 'Deshacer',
      GAME_END: 'Fin turno',
      GAME_MENU: 'Pausa',
      GAME_CONTINUE: '▶ Continuar',
      GAME_CENTER: '⌖ Centrar mapa',
      GAME_SAVE_EXIT: '💾 Guardar y salir',
      GAME_ABANDON: '🏳 Abandonar',
      GAME_CODEX: '📖 Códice',
      VIEW_NORMAL: 'Normal',
      VIEW_COMBAT: 'Combate',
      VIEW_NATO: 'Táctico OTAN',
      FB_TITLE: '💬 Tu opinión',
      FB_INTRO: '¿Encontraste un error o tienes una idea para mejorar el juego? Cuéntanoslo.',
      FB_NAME: 'Nombre o usuario (opcional)',
      FB_NAME_PH: 'Ej.: Comandante Juan',
      FB_EMAIL: 'Correo de contacto (opcional)',
      FB_MESSAGE: 'Comentario o reporte *',
      FB_SEND: 'Enviar comentario',
      FB_SENDING: 'Enviando…',
      FB_OK: '¡Gracias! Comentario recibido.',
      FB_ERR: 'No se pudo enviar. Se guardó en este dispositivo para reintentarlo.',
      FB_REQUIRED: 'Escribe un comentario antes de enviar.',
      FB_EMAIL_BAD: 'El correo no parece válido.',
      FB_PRIVACY: 'El correo es opcional y solo se usará para responderte.',
      FB_CTA: 'Comentarios',
      FB_PROMPT: '¿Te gustó? Déjanos un comentario; nos ayuda a mejorar.',
      FB_LATER: 'Ahora no',
      FB_LOCAL: 'El buzón aún no está configurado: el comentario se guardará en este dispositivo.',
      VIEW_POLITIC: 'Político',
      VIEW_RESOURCE: 'Recursos',
      CODEX_TITLE: '📖 Códice Táctico',
      CODEX_INTRO: 'Consulta las reglas principales sin salir de la partida.',
      CODEX_TAB_LAYERS: '🗺️ Las 6 capas',
      CODEX_TAB_COMBAT: '⚔️ Combate y Tiers',
      CODEX_TAB_SUPPLY: '🔗 Suministro',
      CODEX_TAB_SETTLEMENTS: '🏙️ Asentamientos',
      CODEX_TAB_CREDO: '🕊️ Credo',
      CODEX_LAYERS: '<p>Cada hexágono es una ficha con seis capas:</p><ul><li><b>1 · Terreno:</b> llano, colina, montaña, río o mar. Define el movimiento y parte de la defensa.</li><li><b>2 · Recursos:</b> oro, trigo o madera; alimentan provincias y economía.</li><li><b>3 · Asentamientos:</b> árbol, camino, campamento, pueblo, ciudad o bastión.</li><li><b>4 · Soberanía:</b> el dueño de la casilla y su provincia de suministro.</li><li><b>5 · Capitales:</b> el centro político de cada facción; perderlas elimina.</li><li><b>6 · Unidades y tumbas:</b> ejércitos, niveles, carga naval y restos de batalla.</li></ul><p class="dim small">La vista <b>Político</b> resalta la capa 4; la vista <b>Recursos</b>, la capa 2; la vista <b>Combate</b>, la capa 6.</p>',
      CODEX_COMBAT: '<p>El combate es determinista: <b>A &gt; D</b>. Si el ataque supera la defensa, la casilla cae; si no, el ataque se rechaza.</p><ul><li><b>Tiers:</b> una unidad N1 puede fusionarse con otra N1 para crear N2. N3 es élite; el Pretoriano es N4.</li><li><b>Defensa:</b> suma la base de la unidad, el terreno de infantería y el edificio. Las unidades aliadas y el aura de bastión <b>no suman</b>: prevalece el valor más alto.</li><li><b>Zona de control:</b> las unidades adyacentes protegen con su defensa; los bastiones proyectan un aura defensiva.</li><li><b>Roles:</b> los arqueros degradan defensas, el asedio castiga edificios vacíos y los barcos transportan tropas.</li></ul><p class="dim small">En la vista <b>Combate</b>, toca una unidad para ver su nivel y el desglose exacto de su defensa.</p>',
      CODEX_SUPPLY: '<p>Una provincia vive si conserva una línea terrestre hasta un asentamiento propio. Si la línea se corta, sus casillas quedan <b>AISLADO</b>.</p><ul><li>Sin suministro no se recaudan recursos ni se recluta.</li><li>El déficit de comida u oro provoca deserción escalonada: primero las unidades más caras.</li><li>Los cortes de suministro enemigo también generan aislamiento y son una vía de victoria.</li></ul><p class="dim small">Los números de suministro se recalculan al mover, capturar, construir o empacar.</p>',
      CODEX_SETTLEMENTS: '<p>La progresión civil es <b>Campamento → Pueblo / Bastión → Ciudad</b>.</p><ul><li><b>Campamento:</b> primera base y refugio de provincia.</li><li><b>Pueblo:</b> punto comercial y de reclutamiento.</li><li><b>Ciudad:</b> capital provincial; defensa y crecimiento.</li><li><b>Bastión:</b> fortaleza; proyecta aura defensiva y puede albergar el monumento.</li><li>Los <b>caminos</b> multiplican el movimiento y conectan rutas comerciales.</li></ul><p class="dim small">Los recursos de la capa 2 se recogen en el radio de la provincia; las rutas comerciales pagan en sus dos extremos.</p>',
      CODEX_CREDO: '<p>El credo de tu tribu se elige en tres niveles: <b>Alma</b>, <b>Arma</b> y <b>Victoria</b>.</p><ul><li>Cada nivel desbloquea una doctrina pasiva que cambia economía, combate o logística.</li><li>Las doctrinas se combinan; no hay una build única correcta.</li><li>Puedes editar el credo desde la pantalla <b>Tribu</b> antes de empezar.</li></ul><p class="dim small">Las doctrinas «En juego» modifican el motor; las de catálogo son diseño futuro y no fingen estar activas.</p>',
      EDITOR_TITLE: 'Editor de mapas',
      EDITOR_SIZE: 'Tamaño',
      EDITOR_RANDOM: '🎲 Aleatorio',
      EDITOR_CLEAR: '🧹 Vaciar',
      EDITOR_EXPORT: '📤 Exportar',
      EDITOR_IMPORT: '📥 Importar',
      EDITOR_SAVE: '💾 Guardar',
      EDITOR_LOAD: '📂 Abrir',
      EDITOR_PLAY: '▶ Probar',
      REPLAY_TITLE: '🎬 Repetición Táctica',
      REPLAY_EXIT: '✖ Salir',
      REPLAY_TURN: 'Turno',
      REPLAY_ACTION: 'Acción',
      YES: 'Sí',
      NO: 'No',
      CLOSE: 'Cerrar',
      COMING_SOON: 'próximamente',
      NO_MULTIPLAYER: 'sin multijugador'
    },
    en: {
      HUB_TITLE: 'FEDERATI',
      HUB_SUBTITLE: 'Turn-based Hexagonal Strategy',
      BTN_CONTINUE: '▶ Continue',
      BTN_CAMPAIGN: '⚔️ Campaign',
      BTN_NEW_GAME: '🎲 New Game',
      BTN_ONLINE: '🌐 Online',
      BTN_DAILY: '🏆 Daily',
      BTN_NEWS: '📢',
      DOCK_TRIBE: 'Tribe',
      DOCK_MAPS: 'Maps',
      DOCK_STATS: 'Stats',
      DOCK_SETTINGS: 'Settings',
      DOCK_WIKI: 'Codex',
      SETTINGS: 'Settings',
      SOUND: '🔊 Sound',
      VIBRATE: '📳 Vibration',
      GRID: '▦ Map grid',
      LANGUAGE: '🌐 Language',
      RESET: '🗑 Delete all data',
      RESET_CONFIRM: 'Delete all local data?',
      LOCAL_DATA: 'All data is stored locally on this device.',
      GAME_BUILD: 'Build',
      GAME_RECRUIT: 'Recruit',
      GAME_UNDO: 'Undo',
      GAME_END: 'End turn',
      GAME_MENU: 'Pause',
      GAME_CONTINUE: '▶ Continue',
      GAME_CENTER: '⌖ Center map',
      GAME_SAVE_EXIT: '💾 Save and exit',
      GAME_ABANDON: '🏳 Surrender',
      GAME_CODEX: '📖 Codex',
      VIEW_NORMAL: 'Normal',
      VIEW_COMBAT: 'Combat',
      VIEW_NATO: 'NATO Tactical',
      FB_TITLE: '💬 Your feedback',
      FB_INTRO: 'Found a bug or have an idea to improve the game? Tell us.',
      FB_NAME: 'Name or username (optional)',
      FB_NAME_PH: 'e.g. Commander John',
      FB_EMAIL: 'Contact email (optional)',
      FB_MESSAGE: 'Comment or report *',
      FB_SEND: 'Send comment',
      FB_SENDING: 'Sending…',
      FB_OK: 'Thanks! Feedback received.',
      FB_ERR: 'Could not send. It was saved on this device to retry.',
      FB_REQUIRED: 'Write a comment before sending.',
      FB_EMAIL_BAD: 'That email does not look valid.',
      FB_PRIVACY: 'Email is optional and only used to reply to you.',
      FB_CTA: 'Feedback',
      FB_PROMPT: 'Enjoying it? Leave us a comment; it helps us improve.',
      FB_LATER: 'Not now',
      FB_LOCAL: 'The inbox is not configured yet: your comment will be saved on this device.',
      VIEW_POLITIC: 'Political',
      VIEW_RESOURCE: 'Resources',
      CODEX_TITLE: '📖 Tactical Codex',
      CODEX_INTRO: 'Read the core rules without leaving the game.',
      CODEX_TAB_LAYERS: '🗺️ The 6 layers',
      CODEX_TAB_COMBAT: '⚔️ Combat & Tiers',
      CODEX_TAB_SUPPLY: '🔗 Supply',
      CODEX_TAB_SETTLEMENTS: '🏙️ Settlements',
      CODEX_TAB_CREDO: '🕊️ Creed',
      CODEX_LAYERS: '<p>Every hex is a tile with six layers:</p><ul><li><b>1 · Terrain:</b> plains, hills, mountains, river or sea. It defines movement and part of defense.</li><li><b>2 · Resources:</b> gold, wheat or wood; they feed provinces and the economy.</li><li><b>3 · Settlements:</b> tree, road, camp, village, city or bastion.</li><li><b>4 · Sovereignty:</b> the tile owner and its supply province.</li><li><b>5 · Capitals:</b> the political center of each faction; losing them eliminates it.</li><li><b>6 · Units and tombs:</b> armies, tiers, naval cargo and battle remains.</li></ul><p class="dim small">The <b>Political</b> view highlights layer 4; <b>Resources</b> layer 2; <b>Combat</b> layer 6.</p>',
      CODEX_COMBAT: '<p>Combat is deterministic: <b>A &gt; D</b>. If attack beats defense, the tile falls; otherwise the attack is repelled.</p><ul><li><b>Tiers:</b> an N1 unit can merge with another N1 to become N2. N3 is elite; the Praetorian is N4.</li><li><b>Defense:</b> unit base + infantry terrain + building. Allied units and bastion auras <b>do not stack</b>: the highest value prevails.</li><li><b>Zone of control:</b> adjacent units protect with their defense; bastions project a defensive aura.</li><li><b>Roles:</b> archers degrade defenses, siege punishes empty buildings and ships carry troops.</li></ul><p class="dim small">In <b>Combat</b> view, tap a unit to see its tier and exact defense breakdown.</p>',
      CODEX_SUPPLY: '<p>A province lives while it keeps a land line to one of its settlements. If the line is cut, its tiles become <b>ISOLATED</b>.</p><ul><li>Without supply you collect no resources and cannot recruit.</li><li>Food or gold deficit causes staged desertion: the most expensive units leave first.</li><li>Enemy supply cuts also isolate territory and are a path to victory.</li></ul><p class="dim small">Supply is recalculated when moving, capturing, building or packing.</p>',
      CODEX_SETTLEMENTS: '<p>The civic progression is <b>Camp → Village / Bastion → City</b>.</p><ul><li><b>Camp:</b> first base and provincial refuge.</li><li><b>Village:</b> trade and recruitment hub.</li><li><b>City:</b> provincial capital; defense and growth.</li><li><b>Bastion:</b> fortress; projects a defensive aura and can host the monument.</li><li><b>Roads</b> multiply movement and connect trade routes.</li></ul><p class="dim small">Layer-2 resources are collected within the province radius; trade routes pay at both ends.</p>',
      CODEX_CREDO: '<p>Your tribe creed is chosen in three tiers: <b>Soul</b>, <b>Weapon</b> and <b>Victory</b>.</p><ul><li>Each tier unlocks a passive doctrine that changes economy, combat or logistics.</li><li>Doctrines combine; there is no single correct build.</li><li>Edit your creed from the <b>Tribe</b> screen before starting.</li></ul><p class="dim small">«In play» doctrines modify the engine; catalogue doctrines are future design and never pretend to be active.</p>',
      EDITOR_TITLE: 'Map Editor',
      EDITOR_SIZE: 'Size',
      EDITOR_RANDOM: '🎲 Random',
      EDITOR_CLEAR: '🧹 Clear',
      EDITOR_EXPORT: '📤 Export',
      EDITOR_IMPORT: '📥 Import',
      EDITOR_SAVE: '💾 Save',
      EDITOR_LOAD: '📂 Open',
      EDITOR_PLAY: '▶ Test',
      REPLAY_TITLE: '🎬 Tactical Replay',
      REPLAY_EXIT: '✖ Exit',
      REPLAY_TURN: 'Turn',
      REPLAY_ACTION: 'Action',
      YES: 'Yes',
      NO: 'No',
      CLOSE: 'Close',
      COMING_SOON: 'coming soon',
      NO_MULTIPLAYER: 'no multiplayer'
    }
  };
  // Cada idioma nuevo hereda el inglés como red de seguridad para los textos
  // largos del Códice; los textos principales se traducen aquí.
  const L = tr => Object.assign({}, HF.LOCALES.en, tr);

  HF.LOCALES.zh = L({
    HUB_SUBTITLE: '回合制六边形策略',
    BTN_CONTINUE: '▶ 继续', BTN_CAMPAIGN: '⚔️ 战役', BTN_NEW_GAME: '🎲 新游戏', BTN_ONLINE: '🌐 在线', BTN_DAILY: '🏆 每日挑战',
    DOCK_TRIBE: '部族', DOCK_MAPS: '地图', DOCK_STATS: '统计', DOCK_SETTINGS: '设置', DOCK_WIKI: '图鉴',
    SETTINGS: '设置', SOUND: '🔊 声音', VIBRATE: '📳 振动', GRID: '▦ 地图网格', LANGUAGE: '🌐 语言',
    RESET: '🗑 删除所有数据', RESET_CONFIRM: '删除所有本地数据？', LOCAL_DATA: '所有数据仅保存在本设备上。',
    GAME_BUILD: '建造', GAME_RECRUIT: '招募', GAME_UNDO: '撤销', GAME_END: '结束回合', GAME_MENU: '暂停',
    GAME_CONTINUE: '▶ 继续', GAME_CENTER: '⌖ 居中地图', GAME_SAVE_EXIT: '💾 保存并退出', GAME_ABANDON: '🏳 放弃', GAME_CODEX: '📖 图鉴',
    VIEW_NORMAL: '普通', VIEW_COMBAT: '战斗', VIEW_POLITIC: '政治', VIEW_RESOURCE: '资源', VIEW_NATO: '北约战术',
    FB_TITLE: '💬 您的反馈',
    FB_INTRO: '发现错误或有改进建议？请告诉我们。',
    FB_NAME: '姓名或昵称（可选）',
    FB_NAME_PH: '例如：约翰指挥官',
    FB_EMAIL: '联系邮箱（可选）',
    FB_MESSAGE: '评论或报告 *',
    FB_SEND: '发送评论',
    FB_SENDING: '发送中…',
    FB_OK: '谢谢！我们已收到您的反馈。',
    FB_ERR: '发送失败。已保存在本设备，稍后可重试。',
    FB_REQUIRED: '发送前请填写评论。',
    FB_EMAIL_BAD: '邮箱格式似乎不正确。',
    FB_PRIVACY: '邮箱为可选项，仅用于回复您。',
    FB_CTA: '反馈',
    FB_PROMPT: '玩得开心吗？留下您的评论，帮助我们改进。',
    FB_LATER: '以后再说',
    FB_LOCAL: '收件箱尚未配置：评论将保存在本设备上。',
    CODEX_TITLE: '📖 战术图鉴', CODEX_INTRO: '无需离开游戏即可查看核心规则。',
    CODEX_TAB_LAYERS: '🗺️ 六层世界', CODEX_TAB_COMBAT: '⚔️ 战斗与阶级', CODEX_TAB_SUPPLY: '🔗 补给',
    CODEX_TAB_SETTLEMENTS: '🏙️ 聚落', CODEX_TAB_CREDO: '🕊️ 信条',
    EDITOR_TITLE: '地图编辑器', EDITOR_SIZE: '尺寸', EDITOR_RANDOM: '🎲 随机', EDITOR_CLEAR: '🧹 清空',
    EDITOR_EXPORT: '📤 导出', EDITOR_IMPORT: '📥 导入', EDITOR_SAVE: '💾 保存', EDITOR_LOAD: '📂 打开', EDITOR_PLAY: '▶ 测试',
    REPLAY_TITLE: '🎬 战术回放', REPLAY_EXIT: '✖ 退出', REPLAY_TURN: '回合', REPLAY_ACTION: '动作',
    YES: '是', NO: '否', CLOSE: '关闭', COMING_SOON: '即将推出'
  });

  HF.LOCALES.hi = L({
    HUB_SUBTITLE: 'बारी-बारी षट्कोणीय रणनीति',
    BTN_CONTINUE: '▶ जारी रखें', BTN_CAMPAIGN: '⚔️ अभियान', BTN_NEW_GAME: '🎲 नया खेल', BTN_ONLINE: '🌐 ऑनलाइन', BTN_DAILY: '🏆 दैनिक',
    DOCK_TRIBE: 'जनजाति', DOCK_MAPS: 'मानचित्र', DOCK_STATS: 'आँकड़े', DOCK_SETTINGS: 'सेटिंग्स', DOCK_WIKI: 'कोडेक्स',
    SETTINGS: 'सेटिंग्स', SOUND: '🔊 ध्वनि', VIBRATE: '📳 कंपन', GRID: '▦ मानचित्र ग्रिड', LANGUAGE: '🌐 भाषा',
    RESET: '🗑 सारा डेटा हटाएँ', RESET_CONFIRM: 'सारा स्थानीय डेटा हटाएँ?', LOCAL_DATA: 'सारा डेटा इसी डिवाइस पर सहेजा जाता है।',
    GAME_BUILD: 'निर्माण', GAME_RECRUIT: 'भर्ती', GAME_UNDO: 'पूर्ववत', GAME_END: 'बारी समाप्त', GAME_MENU: 'रोकें',
    GAME_CONTINUE: '▶ जारी रखें', GAME_CENTER: '⌖ मानचित्र केंद्रित करें', GAME_SAVE_EXIT: '💾 सहेजें और बाहर जाएँ', GAME_ABANDON: '🏳 त्यागें', GAME_CODEX: '📖 कोडेक्स',
    VIEW_NORMAL: 'सामान्य', VIEW_COMBAT: 'युद्ध', VIEW_POLITIC: 'राजनीतिक', VIEW_RESOURCE: 'संसाधन', VIEW_NATO: 'नाटो सामरिक',
    FB_TITLE: '💬 आपकी राय',
    FB_INTRO: 'कोई गड़बड़ी मिली या सुधार का सुझाव है? हमें बताएँ।',
    FB_NAME: 'नाम या उपयोगकर्ता नाम (वैकल्पिक)',
    FB_NAME_PH: 'जैसे: कमांडर जॉन',
    FB_EMAIL: 'संपर्क ईमेल (वैकल्पिक)',
    FB_MESSAGE: 'टिप्पणी या रिपोर्ट *',
    FB_SEND: 'टिप्पणी भेजें',
    FB_SENDING: 'भेजा जा रहा है…',
    FB_OK: 'धन्यवाद! आपकी टिप्पणी मिल गई।',
    FB_ERR: 'भेजा नहीं जा सका। डिवाइस में सहेजा गया, बाद में पुनः प्रयास करें।',
    FB_REQUIRED: 'भेजने से पहले टिप्पणी लिखें।',
    FB_EMAIL_BAD: 'ईमेल मान्य नहीं लगता।',
    FB_PRIVACY: 'ईमेल वैकल्पिक है और केवल उत्तर देने के लिए उपयोग होगा।',
    FB_CTA: 'टिप्पणियाँ',
    FB_PROMPT: 'खेल पसंद आया? टिप्पणी छोड़ें; इससे हमें सुधार में मदद मिलेगी।',
    FB_LATER: 'अभी नहीं',
    FB_LOCAL: 'इनबॉक्स अभी कॉन्फ़िगर नहीं है: टिप्पणी इस डिवाइस में सहेजी जाएगी।',
    CODEX_TITLE: '📖 सामरिक कोडेक्स', CODEX_INTRO: 'खेल छोड़े बिना मुख्य नियम पढ़ें।',
    CODEX_TAB_LAYERS: '🗺️ छह परतें', CODEX_TAB_COMBAT: '⚔️ युद्ध और स्तर', CODEX_TAB_SUPPLY: '🔗 आपूर्ति',
    CODEX_TAB_SETTLEMENTS: '🏙️ बस्तियाँ', CODEX_TAB_CREDO: '🕊️ विश्वास',
    EDITOR_TITLE: 'मानचित्र संपादक', EDITOR_SIZE: 'आकार', EDITOR_RANDOM: '🎲 यादृच्छिक', EDITOR_CLEAR: '🧹 खाली करें',
    EDITOR_EXPORT: '📤 निर्यात', EDITOR_IMPORT: '📥 आयात', EDITOR_SAVE: '💾 सहेजें', EDITOR_LOAD: '📂 खोलें', EDITOR_PLAY: '▶ परखें',
    REPLAY_TITLE: '🎬 सामरिक पुनरावृत्ति', REPLAY_EXIT: '✖ बाहर', REPLAY_TURN: 'बारी', REPLAY_ACTION: 'क्रिया',
    YES: 'हाँ', NO: 'नहीं', CLOSE: 'बंद करें', COMING_SOON: 'जल्द आ रहा है'
  });

  HF.LOCALES.fr = L({
    HUB_SUBTITLE: 'Stratégie hexagonale au tour par tour',
    BTN_CONTINUE: '▶ Continuer', BTN_CAMPAIGN: '⚔️ Campagne', BTN_NEW_GAME: '🎲 Nouvelle partie', BTN_ONLINE: '🌐 En ligne', BTN_DAILY: '🏆 Quotidien',
    DOCK_TRIBE: 'Tribu', DOCK_MAPS: 'Cartes', DOCK_STATS: 'Stats', DOCK_SETTINGS: 'Réglages', DOCK_WIKI: 'Codex',
    SETTINGS: 'Réglages', SOUND: '🔊 Son', VIBRATE: '📳 Vibration', GRID: '▦ Grille', LANGUAGE: '🌐 Langue',
    RESET: '🗑 Supprimer toutes les données', RESET_CONFIRM: 'Supprimer toutes les données locales ?', LOCAL_DATA: 'Toutes les données sont stockées sur cet appareil.',
    GAME_BUILD: 'Construire', GAME_RECRUIT: 'Recruter', GAME_UNDO: 'Annuler', GAME_END: 'Fin du tour', GAME_MENU: 'Pause',
    GAME_CONTINUE: '▶ Continuer', GAME_CENTER: '⌖ Centrer la carte', GAME_SAVE_EXIT: '💾 Sauvegarder et quitter', GAME_ABANDON: '🏳 Abandonner', GAME_CODEX: '📖 Codex',
    VIEW_NORMAL: 'Normal', VIEW_COMBAT: 'Combat', VIEW_POLITIC: 'Politique', VIEW_RESOURCE: 'Ressources', VIEW_NATO: 'Tactique OTAN',
    FB_TITLE: '💬 Votre avis',
    FB_INTRO: 'Un bug ou une idée d’amélioration ? Dites-le-nous.',
    FB_NAME: 'Nom ou pseudo (facultatif)',
    FB_NAME_PH: 'Ex. : Commandant Jean',
    FB_EMAIL: 'E-mail de contact (facultatif)',
    FB_MESSAGE: 'Commentaire ou rapport *',
    FB_SEND: 'Envoyer le commentaire',
    FB_SENDING: 'Envoi…',
    FB_OK: 'Merci ! Commentaire reçu.',
    FB_ERR: 'Envoi impossible. Enregistré sur cet appareil pour réessayer.',
    FB_REQUIRED: 'Écrivez un commentaire avant d’envoyer.',
    FB_EMAIL_BAD: 'Cet e-mail ne semble pas valide.',
    FB_PRIVACY: 'L’e-mail est facultatif et ne sert qu’à vous répondre.',
    FB_CTA: 'Avis',
    FB_PROMPT: 'Vous aimez ? Laissez un commentaire, cela nous aide à progresser.',
    FB_LATER: 'Plus tard',
    FB_LOCAL: 'La boîte n’est pas encore configurée : le commentaire sera enregistré sur cet appareil.',
    CODEX_TITLE: '📖 Codex tactique', CODEX_INTRO: 'Consultez les règles principales sans quitter la partie.',
    CODEX_TAB_LAYERS: '🗺️ Les 6 couches', CODEX_TAB_COMBAT: '⚔️ Combat et Tiers', CODEX_TAB_SUPPLY: '🔗 Approvisionnement',
    CODEX_TAB_SETTLEMENTS: '🏙️ Colonies', CODEX_TAB_CREDO: '🕊️ Credo',
    EDITOR_TITLE: 'Éditeur de cartes', EDITOR_SIZE: 'Taille', EDITOR_RANDOM: '🎲 Aléatoire', EDITOR_CLEAR: '🧹 Vider',
    EDITOR_EXPORT: '📤 Exporter', EDITOR_IMPORT: '📥 Importer', EDITOR_SAVE: '💾 Sauver', EDITOR_LOAD: '📂 Ouvrir', EDITOR_PLAY: '▶ Tester',
    REPLAY_TITLE: '🎬 Rediffusion tactique', REPLAY_EXIT: '✖ Quitter', REPLAY_TURN: 'Tour', REPLAY_ACTION: 'Action',
    YES: 'Oui', NO: 'Non', CLOSE: 'Fermer', COMING_SOON: 'bientôt'
  });

  HF.LOCALES.ar = L({
    HUB_SUBTITLE: 'استراتيجية سداسية بنظام الأدوار',
    BTN_CONTINUE: '▶ متابعة', BTN_CAMPAIGN: '⚔️ الحملة', BTN_NEW_GAME: '🎲 لعبة جديدة', BTN_ONLINE: '🌐 عبر الإنترنت', BTN_DAILY: '🏆 التحدي اليومي',
    DOCK_TRIBE: 'القبيلة', DOCK_MAPS: 'الخرائط', DOCK_STATS: 'الإحصاءات', DOCK_SETTINGS: 'الإعدادات', DOCK_WIKI: 'الموسوعة',
    SETTINGS: 'الإعدادات', SOUND: '🔊 الصوت', VIBRATE: '📳 الاهتزاز', GRID: '▦ شبكة الخريطة', LANGUAGE: '🌐 اللغة',
    RESET: '🗑 حذف كل البيانات', RESET_CONFIRM: 'حذف كل البيانات المحلية؟', LOCAL_DATA: 'تُحفظ كل البيانات على هذا الجهاز.',
    GAME_BUILD: 'بناء', GAME_RECRUIT: 'تجنيد', GAME_UNDO: 'تراجع', GAME_END: 'إنهاء الدور', GAME_MENU: 'إيقاف',
    GAME_CONTINUE: '▶ متابعة', GAME_CENTER: '⌖ توسيط الخريطة', GAME_SAVE_EXIT: '💾 حفظ وخروج', GAME_ABANDON: '🏳 استسلام', GAME_CODEX: '📖 الموسوعة',
    VIEW_NORMAL: 'عادي', VIEW_COMBAT: 'قتال', VIEW_POLITIC: 'سياسي', VIEW_RESOURCE: 'موارد', VIEW_NATO: 'تكتيكي الناتو',
    FB_TITLE: '💬 رأيك',
    FB_INTRO: 'هل وجدت خطأً أو لديك اقتراح لتحسين اللعبة؟ أخبرنا.',
    FB_NAME: 'الاسم أو اسم المستخدم (اختياري)',
    FB_NAME_PH: 'مثال: القائد جون',
    FB_EMAIL: 'البريد الإلكتروني للتواصل (اختياري)',
    FB_MESSAGE: 'تعليق أو تقرير *',
    FB_SEND: 'إرسال التعليق',
    FB_SENDING: 'جارٍ الإرسال…',
    FB_OK: 'شكرًا! تم استلام تعليقك.',
    FB_ERR: 'تعذر الإرسال. تم حفظه على هذا الجهاز لإعادة المحاولة.',
    FB_REQUIRED: 'اكتب تعليقًا قبل الإرسال.',
    FB_EMAIL_BAD: 'البريد الإلكتروني غير صالح.',
    FB_PRIVACY: 'البريد اختياري ويُستخدم فقط للرد عليك.',
    FB_CTA: 'التعليقات',
    FB_PROMPT: 'هل أعجبتك اللعبة؟ اترك تعليقًا؛ فهو يساعدنا على التحسين.',
    FB_LATER: 'ليس الآن',
    FB_LOCAL: 'صندوق الوارد غير مُهيأ بعد: سيُحفظ التعليق على هذا الجهاز.',
    CODEX_TITLE: '📖 الموسوعة التكتيكية', CODEX_INTRO: 'اطّلع على القواعد الأساسية دون مغادرة اللعبة.',
    CODEX_TAB_LAYERS: '🗺️ الطبقات الست', CODEX_TAB_COMBAT: '⚔️ القتال والمستويات', CODEX_TAB_SUPPLY: '🔗 الإمداد',
    CODEX_TAB_SETTLEMENTS: '🏙️ المستوطنات', CODEX_TAB_CREDO: '🕊️ العقيدة',
    EDITOR_TITLE: 'محرر الخرائط', EDITOR_SIZE: 'الحجم', EDITOR_RANDOM: '🎲 عشوائي', EDITOR_CLEAR: '🧹 مسح',
    EDITOR_EXPORT: '📤 تصدير', EDITOR_IMPORT: '📥 استيراد', EDITOR_SAVE: '💾 حفظ', EDITOR_LOAD: '📂 فتح', EDITOR_PLAY: '▶ تجربة',
    REPLAY_TITLE: '🎬 إعادة تكتيكية', REPLAY_EXIT: '✖ خروج', REPLAY_TURN: 'الدور', REPLAY_ACTION: 'الإجراء',
    YES: 'نعم', NO: 'لا', CLOSE: 'إغلاق', COMING_SOON: 'قريباً'
  });

  HF.LOCALES.bn = L({
    HUB_SUBTITLE: 'পাল্টা-পাল্টি ষড়ভুজ কৌশল',
    BTN_CONTINUE: '▶ চালিয়ে যান', BTN_CAMPAIGN: '⚔️ অভিযান', BTN_NEW_GAME: '🎲 নতুন খেলা', BTN_ONLINE: '🌐 অনলাইন', BTN_DAILY: '🏆 দৈনিক',
    DOCK_TRIBE: 'গোত্র', DOCK_MAPS: 'মানচিত্র', DOCK_STATS: 'পরিসংখ্যান', DOCK_SETTINGS: 'সেটিংস', DOCK_WIKI: 'কোডেক্স',
    SETTINGS: 'সেটিংস', SOUND: '🔊 শব্দ', VIBRATE: '📳 কম্পন', GRID: '▦ মানচিত্র গ্রিড', LANGUAGE: '🌐 ভাষা',
    RESET: '🗑 সব ডেটা মুছুন', RESET_CONFIRM: 'সব স্থানীয় ডেটা মুছবেন?', LOCAL_DATA: 'সব ডেটা এই ডিভাইসে সংরক্ষিত থাকে।',
    GAME_BUILD: 'নির্মাণ', GAME_RECRUIT: 'নিয়োগ', GAME_UNDO: 'পূর্বাবস্থা', GAME_END: 'পালা শেষ', GAME_MENU: 'বিরতি',
    GAME_CONTINUE: '▶ চালিয়ে যান', GAME_CENTER: '⌖ মানচিত্র কেন্দ্রীভূত করুন', GAME_SAVE_EXIT: '💾 সংরক্ষণ করে বের হন', GAME_ABANDON: '🏳 আত্মসমর্পণ', GAME_CODEX: '📖 কোডেক্স',
    VIEW_NORMAL: 'সাধারণ', VIEW_COMBAT: 'যুদ্ধ', VIEW_POLITIC: 'রাজনৈতিক', VIEW_RESOURCE: 'সম্পদ', VIEW_NATO: 'ন্যাটো কৌশলগত',
    FB_TITLE: '💬 আপনার মতামত',
    FB_INTRO: 'কোনো ত্রুটি পেয়েছেন বা উন্নতির পরামর্শ আছে? আমাদের জানান।',
    FB_NAME: 'নাম বা ব্যবহারকারীর নাম (ঐচ্ছিক)',
    FB_NAME_PH: 'যেমন: কমান্ডার জন',
    FB_EMAIL: 'যোগাযোগের ইমেইল (ঐচ্ছিক)',
    FB_MESSAGE: 'মন্তব্য বা রিপোর্ট *',
    FB_SEND: 'মন্তব্য পাঠান',
    FB_SENDING: 'পাঠানো হচ্ছে…',
    FB_OK: 'ধন্যবাদ! আপনার মন্তব্য পেয়েছি।',
    FB_ERR: 'পাঠানো যায়নি। ডিভাইসে সংরক্ষিত, পরে আবার চেষ্টা করুন।',
    FB_REQUIRED: 'পাঠানোর আগে একটি মন্তব্য লিখুন।',
    FB_EMAIL_BAD: 'ইমেইলটি সঠিক মনে হচ্ছে না।',
    FB_PRIVACY: 'ইমেইল ঐচ্ছিক এবং শুধু উত্তর দিতে ব্যবহৃত হবে।',
    FB_CTA: 'মন্তব্য',
    FB_PROMPT: 'খেলা ভালো লেগেছে? একটি মন্তব্য রেখে যান; এটি উন্নতিতে সাহায্য করে।',
    FB_LATER: 'এখন নয়',
    FB_LOCAL: 'ইনবক্স এখনো কনফিগার হয়নি: মন্তব্যটি এই ডিভাইসে সংরক্ষিত হবে।',
    CODEX_TITLE: '📖 কৌশলগত কোডেক্স', CODEX_INTRO: 'খেলা না ছেড়ে মূল নিয়মগুলো দেখুন।',
    CODEX_TAB_LAYERS: '🗺️ ছয় স্তর', CODEX_TAB_COMBAT: '⚔️ যুদ্ধ ও স্তর', CODEX_TAB_SUPPLY: '🔗 সরবরাহ',
    CODEX_TAB_SETTLEMENTS: '🏙️ বসতি', CODEX_TAB_CREDO: '🕊️ বিশ্বাস',
    EDITOR_TITLE: 'মানচিত্র সম্পাদক', EDITOR_SIZE: 'আকার', EDITOR_RANDOM: '🎲 এলোমেলো', EDITOR_CLEAR: '🧹 খালি করুন',
    EDITOR_EXPORT: '📤 রপ্তানি', EDITOR_IMPORT: '📥 আমদানি', EDITOR_SAVE: '💾 সংরক্ষণ', EDITOR_LOAD: '📂 খুলুন', EDITOR_PLAY: '▶ পরীক্ষা',
    REPLAY_TITLE: '🎬 কৌশলগত পুনঃপ্রদর্শন', REPLAY_EXIT: '✖ বের হন', REPLAY_TURN: 'পালা', REPLAY_ACTION: 'ক্রিয়া',
    YES: 'হ্যাঁ', NO: 'না', CLOSE: 'বন্ধ', COMING_SOON: 'শীঘ্রই'
  });

  HF.LOCALES.pt = L({
    HUB_SUBTITLE: 'Estratégia hexagonal por turnos',
    BTN_CONTINUE: '▶ Continuar', BTN_CAMPAIGN: '⚔️ Campanha', BTN_NEW_GAME: '🎲 Novo jogo', BTN_ONLINE: '🌐 Online', BTN_DAILY: '🏆 Diário',
    DOCK_TRIBE: 'Tribo', DOCK_MAPS: 'Mapas', DOCK_STATS: 'Estatísticas', DOCK_SETTINGS: 'Configurações', DOCK_WIKI: 'Códice',
    SETTINGS: 'Configurações', SOUND: '🔊 Som', VIBRATE: '📳 Vibração', GRID: '▦ Grelha do mapa', LANGUAGE: '🌐 Idioma',
    RESET: '🗑 Eliminar todos os dados', RESET_CONFIRM: 'Eliminar todos os dados locais?', LOCAL_DATA: 'Todos os dados são guardados neste dispositivo.',
    GAME_BUILD: 'Construir', GAME_RECRUIT: 'Recrutar', GAME_UNDO: 'Anular', GAME_END: 'Terminar turno', GAME_MENU: 'Pausa',
    GAME_CONTINUE: '▶ Continuar', GAME_CENTER: '⌖ Centrar mapa', GAME_SAVE_EXIT: '💾 Guardar e sair', GAME_ABANDON: '🏳 Render-se', GAME_CODEX: '📖 Códice',
    VIEW_NORMAL: 'Normal', VIEW_COMBAT: 'Combate', VIEW_POLITIC: 'Político', VIEW_RESOURCE: 'Recursos', VIEW_NATO: 'Tático OTAN',
    FB_TITLE: '💬 A sua opinião',
    FB_INTRO: 'Encontrou um erro ou tem uma ideia para melhorar o jogo? Diga-nos.',
    FB_NAME: 'Nome ou utilizador (opcional)',
    FB_NAME_PH: 'Ex.: Comandante João',
    FB_EMAIL: 'E-mail de contacto (opcional)',
    FB_MESSAGE: 'Comentário ou relatório *',
    FB_SEND: 'Enviar comentário',
    FB_SENDING: 'A enviar…',
    FB_OK: 'Obrigado! Comentário recebido.',
    FB_ERR: 'Não foi possível enviar. Guardado neste dispositivo para tentar de novo.',
    FB_REQUIRED: 'Escreva um comentário antes de enviar.',
    FB_EMAIL_BAD: 'O e-mail não parece válido.',
    FB_PRIVACY: 'O e-mail é opcional e só serve para lhe responder.',
    FB_CTA: 'Comentários',
    FB_PROMPT: 'Gostou? Deixe um comentário; ajuda-nos a melhorar.',
    FB_LATER: 'Agora não',
    FB_LOCAL: 'A caixa ainda não está configurada: o comentário será guardado neste dispositivo.',
    CODEX_TITLE: '📖 Códice tático', CODEX_INTRO: 'Consulte as regras principais sem sair da partida.',
    CODEX_TAB_LAYERS: '🗺️ As 6 camadas', CODEX_TAB_COMBAT: '⚔️ Combate e Tiers', CODEX_TAB_SUPPLY: '🔗 Abastecimento',
    CODEX_TAB_SETTLEMENTS: '🏙️ Povoações', CODEX_TAB_CREDO: '🕊️ Credo',
    EDITOR_TITLE: 'Editor de mapas', EDITOR_SIZE: 'Tamanho', EDITOR_RANDOM: '🎲 Aleatório', EDITOR_CLEAR: '🧹 Limpar',
    EDITOR_EXPORT: '📤 Exportar', EDITOR_IMPORT: '📥 Importar', EDITOR_SAVE: '💾 Guardar', EDITOR_LOAD: '📂 Abrir', EDITOR_PLAY: '▶ Testar',
    REPLAY_TITLE: '🎬 Repetição tática', REPLAY_EXIT: '✖ Sair', REPLAY_TURN: 'Turno', REPLAY_ACTION: 'Ação',
    YES: 'Sim', NO: 'Não', CLOSE: 'Fechar', COMING_SOON: 'em breve'
  });

  HF.LOCALES.ru = L({
    HUB_SUBTITLE: 'Пошаговая гексагональная стратегия',
    BTN_CONTINUE: '▶ Продолжить', BTN_CAMPAIGN: '⚔️ Кампания', BTN_NEW_GAME: '🎲 Новая игра', BTN_ONLINE: '🌐 Сеть', BTN_DAILY: '🏆 Ежедневно',
    DOCK_TRIBE: 'Племя', DOCK_MAPS: 'Карты', DOCK_STATS: 'Статистика', DOCK_SETTINGS: 'Настройки', DOCK_WIKI: 'Кодекс',
    SETTINGS: 'Настройки', SOUND: '🔊 Звук', VIBRATE: '📳 Вибрация', GRID: '▦ Сетка карты', LANGUAGE: '🌐 Язык',
    RESET: '🗑 Удалить все данные', RESET_CONFIRM: 'Удалить все локальные данные?', LOCAL_DATA: 'Все данные хранятся на этом устройстве.',
    GAME_BUILD: 'Строить', GAME_RECRUIT: 'Набрать', GAME_UNDO: 'Отменить', GAME_END: 'Конец хода', GAME_MENU: 'Пауза',
    GAME_CONTINUE: '▶ Продолжить', GAME_CENTER: '⌖ Центрировать карту', GAME_SAVE_EXIT: '💾 Сохранить и выйти', GAME_ABANDON: '🏳 Сдаться', GAME_CODEX: '📖 Кодекс',
    VIEW_NORMAL: 'Обычный', VIEW_COMBAT: 'Бой', VIEW_POLITIC: 'Политика', VIEW_RESOURCE: 'Ресурсы', VIEW_NATO: 'Тактика НАТО',
    FB_TITLE: '💬 Ваше мнение',
    FB_INTRO: 'Нашли ошибку или есть идея, как улучшить игру? Расскажите нам.',
    FB_NAME: 'Имя или ник (необязательно)',
    FB_NAME_PH: 'Напр.: Командир Иван',
    FB_EMAIL: 'Контактная почта (необязательно)',
    FB_MESSAGE: 'Комментарий или отчёт *',
    FB_SEND: 'Отправить комментарий',
    FB_SENDING: 'Отправка…',
    FB_OK: 'Спасибо! Комментарий получен.',
    FB_ERR: 'Не удалось отправить. Сохранено на устройстве для повторной попытки.',
    FB_REQUIRED: 'Напишите комментарий перед отправкой.',
    FB_EMAIL_BAD: 'Похоже, почта указана неверно.',
    FB_PRIVACY: 'Почта необязательна и нужна только для ответа.',
    FB_CTA: 'Отзывы',
    FB_PROMPT: 'Понравилось? Оставьте комментарий — это помогает нам улучшать игру.',
    FB_LATER: 'Не сейчас',
    FB_LOCAL: 'Ящик ещё не настроен: комментарий сохранится на этом устройстве.',
    CODEX_TITLE: '📖 Тактический кодекс', CODEX_INTRO: 'Основные правила, не покидая игру.',
    CODEX_TAB_LAYERS: '🗺️ Шесть слоёв', CODEX_TAB_COMBAT: '⚔️ Бой и уровни', CODEX_TAB_SUPPLY: '🔗 Снабжение',
    CODEX_TAB_SETTLEMENTS: '🏙️ Поселения', CODEX_TAB_CREDO: '🕊️ Кредо',
    EDITOR_TITLE: 'Редактор карт', EDITOR_SIZE: 'Размер', EDITOR_RANDOM: '🎲 Случайно', EDITOR_CLEAR: '🧹 Очистить',
    EDITOR_EXPORT: '📤 Экспорт', EDITOR_IMPORT: '📥 Импорт', EDITOR_SAVE: '💾 Сохранить', EDITOR_LOAD: '📂 Открыть', EDITOR_PLAY: '▶ Проверить',
    REPLAY_TITLE: '🎬 Тактический повтор', REPLAY_EXIT: '✖ Выйти', REPLAY_TURN: 'Ход', REPLAY_ACTION: 'Действие',
    YES: 'Да', NO: 'Нет', CLOSE: 'Закрыть', COMING_SOON: 'скоро'
  });

  HF.LOCALES.de = L({
    HUB_SUBTITLE: 'Rundenbasierte Hex-Strategie',
    BTN_CONTINUE: '▶ Weiter', BTN_CAMPAIGN: '⚔️ Kampagne', BTN_NEW_GAME: '🎲 Neues Spiel', BTN_ONLINE: '🌐 Online', BTN_DAILY: '🏆 Täglich',
    DOCK_TRIBE: 'Stamm', DOCK_MAPS: 'Karten', DOCK_STATS: 'Statistik', DOCK_SETTINGS: 'Einstellungen', DOCK_WIKI: 'Kodex',
    SETTINGS: 'Einstellungen', SOUND: '🔊 Ton', VIBRATE: '📳 Vibration', GRID: '▦ Kartenraster', LANGUAGE: '🌐 Sprache',
    RESET: '🗑 Alle Daten löschen', RESET_CONFIRM: 'Alle lokalen Daten löschen?', LOCAL_DATA: 'Alle Daten werden auf diesem Gerät gespeichert.',
    GAME_BUILD: 'Bauen', GAME_RECRUIT: 'Rekrutieren', GAME_UNDO: 'Rückgängig', GAME_END: 'Zug beenden', GAME_MENU: 'Pause',
    GAME_CONTINUE: '▶ Weiter', GAME_CENTER: '⌖ Karte zentrieren', GAME_SAVE_EXIT: '💾 Speichern & verlassen', GAME_ABANDON: '🏳 Aufgeben', GAME_CODEX: '📖 Kodex',
    VIEW_NORMAL: 'Normal', VIEW_COMBAT: 'Kampf', VIEW_POLITIC: 'Politik', VIEW_RESOURCE: 'Ressourcen', VIEW_NATO: 'NATO-Taktik',
    FB_TITLE: '💬 Deine Meinung',
    FB_INTRO: 'Einen Fehler gefunden oder eine Idee? Sag es uns.',
    FB_NAME: 'Name oder Benutzername (optional)',
    FB_NAME_PH: 'z. B.: Kommandant Hans',
    FB_EMAIL: 'Kontakt-E-Mail (optional)',
    FB_MESSAGE: 'Kommentar oder Fehlerbericht *',
    FB_SEND: 'Kommentar senden',
    FB_SENDING: 'Wird gesendet…',
    FB_OK: 'Danke! Kommentar erhalten.',
    FB_ERR: 'Senden fehlgeschlagen. Auf diesem Gerät gespeichert.',
    FB_REQUIRED: 'Schreibe vor dem Senden einen Kommentar.',
    FB_EMAIL_BAD: 'Diese E-Mail sieht ungültig aus.',
    FB_PRIVACY: 'Die E-Mail ist optional und dient nur der Antwort.',
    FB_CTA: 'Feedback',
    FB_PROMPT: 'Gefällt es dir? Hinterlasse einen Kommentar; das hilft uns.',
    FB_LATER: 'Jetzt nicht',
    FB_LOCAL: 'Das Postfach ist noch nicht eingerichtet: Der Kommentar wird auf diesem Gerät gespeichert.',
    CODEX_TITLE: '📖 Taktischer Kodex', CODEX_INTRO: 'Die wichtigsten Regeln ohne die Partie zu verlassen.',
    CODEX_TAB_LAYERS: '🗺️ Die 6 Schichten', CODEX_TAB_COMBAT: '⚔️ Kampf & Tiers', CODEX_TAB_SUPPLY: '🔗 Versorgung',
    CODEX_TAB_SETTLEMENTS: '🏙️ Siedlungen', CODEX_TAB_CREDO: '🕊️ Credo',
    EDITOR_TITLE: 'Karteneditor', EDITOR_SIZE: 'Größe', EDITOR_RANDOM: '🎲 Zufällig', EDITOR_CLEAR: '🧹 Leeren',
    EDITOR_EXPORT: '📤 Export', EDITOR_IMPORT: '📥 Import', EDITOR_SAVE: '💾 Speichern', EDITOR_LOAD: '📂 Öffnen', EDITOR_PLAY: '▶ Testen',
    REPLAY_TITLE: '🎬 Taktische Wiederholung', REPLAY_EXIT: '✖ Beenden', REPLAY_TURN: 'Zug', REPLAY_ACTION: 'Aktion',
    YES: 'Ja', NO: 'Nein', CLOSE: 'Schließen', COMING_SOON: 'bald'
  });

  HF.LOCALES.ja = L({
    HUB_SUBTITLE: 'ターン制ヘクサゴン戦略',
    BTN_CONTINUE: '▶ 続ける', BTN_CAMPAIGN: '⚔️ キャンペーン', BTN_NEW_GAME: '🎲 新しいゲーム', BTN_ONLINE: '🌐 オンライン', BTN_DAILY: '🏆 デイリー',
    DOCK_TRIBE: '部族', DOCK_MAPS: 'マップ', DOCK_STATS: '統計', DOCK_SETTINGS: '設定', DOCK_WIKI: '図鑑',
    SETTINGS: '設定', SOUND: '🔊 サウンド', VIBRATE: '📳 振動', GRID: '▦ マップグリッド', LANGUAGE: '🌐 言語',
    RESET: '🗑 全データを削除', RESET_CONFIRM: 'ローカルデータをすべて削除しますか？', LOCAL_DATA: 'データはこの端末に保存されます。',
    GAME_BUILD: '建設', GAME_RECRUIT: '徴兵', GAME_UNDO: '元に戻す', GAME_END: 'ターン終了', GAME_MENU: '一時停止',
    GAME_CONTINUE: '▶ 続ける', GAME_CENTER: '⌖ マップを中央に', GAME_SAVE_EXIT: '💾 保存して終了', GAME_ABANDON: '🏳 降伏', GAME_CODEX: '📖 図鑑',
    VIEW_NORMAL: '通常', VIEW_COMBAT: '戦闘', VIEW_POLITIC: '政治', VIEW_RESOURCE: '資源', VIEW_NATO: 'NATO戦術',
    FB_TITLE: '💬 ご意見',
    FB_INTRO: '不具合や改善のアイデアがあればお知らせください。',
    FB_NAME: '名前またはユーザー名（任意）',
    FB_NAME_PH: '例：ジョン司令官',
    FB_EMAIL: '連絡先メール（任意）',
    FB_MESSAGE: 'コメントまたは報告 *',
    FB_SEND: 'コメントを送信',
    FB_SENDING: '送信中…',
    FB_OK: 'ありがとうございます！コメントを受け取りました。',
    FB_ERR: '送信できませんでした。端末に保存しました。後で再試行してください。',
    FB_REQUIRED: '送信前にコメントを入力してください。',
    FB_EMAIL_BAD: 'メールアドレスが正しくないようです。',
    FB_PRIVACY: 'メールは任意で、返信のみに使用します。',
    FB_CTA: 'ご意見',
    FB_PROMPT: '楽しめましたか？コメントを残してください。改善に役立ちます。',
    FB_LATER: '後で',
    FB_LOCAL: '受信箱はまだ設定されていません。コメントはこの端末に保存されます。',
    CODEX_TITLE: '📖 戦術図鑑', CODEX_INTRO: 'ゲームを離れずに基本ルールを確認できます。',
    CODEX_TAB_LAYERS: '🗺️ 六つの層', CODEX_TAB_COMBAT: '⚔️ 戦闘と階級', CODEX_TAB_SUPPLY: '🔗 補給',
    CODEX_TAB_SETTLEMENTS: '🏙️ 集落', CODEX_TAB_CREDO: '🕊️ 信条',
    EDITOR_TITLE: 'マップエディター', EDITOR_SIZE: 'サイズ', EDITOR_RANDOM: '🎲 ランダム', EDITOR_CLEAR: '🧹 クリア',
    EDITOR_EXPORT: '📤 エクスポート', EDITOR_IMPORT: '📥 インポート', EDITOR_SAVE: '💾 保存', EDITOR_LOAD: '📂 開く', EDITOR_PLAY: '▶ テスト',
    REPLAY_TITLE: '🎬 戦術リプレイ', REPLAY_EXIT: '✖ 終了', REPLAY_TURN: 'ターン', REPLAY_ACTION: 'アクション',
    YES: 'はい', NO: 'いいえ', CLOSE: '閉じる', COMING_SOON: '近日公開'
  });

  HF.LOCALES.ko = L({
    HUB_SUBTITLE: '턴제 육각형 전략',
    BTN_CONTINUE: '▶ 계속', BTN_CAMPAIGN: '⚔️ 캠페인', BTN_NEW_GAME: '🎲 새 게임', BTN_ONLINE: '🌐 온라인', BTN_DAILY: '🏆 일일',
    DOCK_TRIBE: '부족', DOCK_MAPS: '지도', DOCK_STATS: '통계', DOCK_SETTINGS: '설정', DOCK_WIKI: '도감',
    SETTINGS: '설정', SOUND: '🔊 소리', VIBRATE: '📳 진동', GRID: '▦ 지도 격자', LANGUAGE: '🌐 언어',
    RESET: '🗑 모든 데이터 삭제', RESET_CONFIRM: '모든 로컬 데이터를 삭제할까요?', LOCAL_DATA: '모든 데이터는 이 기기에 저장됩니다.',
    GAME_BUILD: '건설', GAME_RECRUIT: '모집', GAME_UNDO: '되돌리기', GAME_END: '턴 종료', GAME_MENU: '일시정지',
    GAME_CONTINUE: '▶ 계속', GAME_CENTER: '⌖ 지도 중앙', GAME_SAVE_EXIT: '💾 저장 후 종료', GAME_ABANDON: '🏳 항복', GAME_CODEX: '📖 도감',
    VIEW_NORMAL: '일반', VIEW_COMBAT: '전투', VIEW_POLITIC: '정치', VIEW_RESOURCE: '자원', VIEW_NATO: 'NATO 전술',
    FB_TITLE: '💬 의견 보내기',
    FB_INTRO: '버그를 찾았거나 개선 아이디어가 있나요? 알려 주세요.',
    FB_NAME: '이름 또는 닉네임 (선택)',
    FB_NAME_PH: '예: 존 사령관',
    FB_EMAIL: '연락 이메일 (선택)',
    FB_MESSAGE: '댓글 또는 신고 *',
    FB_SEND: '댓글 보내기',
    FB_SENDING: '보내는 중…',
    FB_OK: '감사합니다! 의견을 받았습니다.',
    FB_ERR: '보내지 못했습니다. 기기에 저장했으니 나중에 다시 시도하세요.',
    FB_REQUIRED: '보내기 전에 댓글을 작성하세요.',
    FB_EMAIL_BAD: '이메일이 올바르지 않은 것 같습니다.',
    FB_PRIVACY: '이메일은 선택 사항이며 답변에만 사용됩니다.',
    FB_CTA: '의견',
    FB_PROMPT: '재미있었나요? 댓글을 남겨 주세요. 개선에 도움이 됩니다.',
    FB_LATER: '나중에',
    FB_LOCAL: '받은편지함이 아직 설정되지 않았습니다. 댓글은 이 기기에 저장됩니다.',
    CODEX_TITLE: '📖 전술 도감', CODEX_INTRO: '게임을 떠나지 않고 핵심 규칙을 확인하세요.',
    CODEX_TAB_LAYERS: '🗺️ 여섯 겹', CODEX_TAB_COMBAT: '⚔️ 전투와 등급', CODEX_TAB_SUPPLY: '🔗 보급',
    CODEX_TAB_SETTLEMENTS: '🏙️ 정착지', CODEX_TAB_CREDO: '🕊️ 신조',
    EDITOR_TITLE: '지도 편집기', EDITOR_SIZE: '크기', EDITOR_RANDOM: '🎲 무작위', EDITOR_CLEAR: '🧹 비우기',
    EDITOR_EXPORT: '📤 내보내기', EDITOR_IMPORT: '📥 가져오기', EDITOR_SAVE: '💾 저장', EDITOR_LOAD: '📂 열기', EDITOR_PLAY: '▶ 시험',
    REPLAY_TITLE: '🎬 전술 다시보기', REPLAY_EXIT: '✖ 나가기', REPLAY_TURN: '턴', REPLAY_ACTION: '행동',
    YES: '예', NO: '아니요', CLOSE: '닫기', COMING_SOON: '곧 출시'
  });

  HF.LOCALES.it = L({
    HUB_SUBTITLE: 'Strategia esagonale a turni',
    BTN_CONTINUE: '▶ Continua', BTN_CAMPAIGN: '⚔️ Campagna', BTN_NEW_GAME: '🎲 Nuova partita', BTN_ONLINE: '🌐 Online', BTN_DAILY: '🏆 Giornaliero',
    DOCK_TRIBE: 'Tribù', DOCK_MAPS: 'Mappe', DOCK_STATS: 'Statistiche', DOCK_SETTINGS: 'Impostazioni', DOCK_WIKI: 'Codice',
    SETTINGS: 'Impostazioni', SOUND: '🔊 Suono', VIBRATE: '📳 Vibrazione', GRID: '▦ Griglia mappa', LANGUAGE: '🌐 Lingua',
    RESET: '🗑 Elimina tutti i dati', RESET_CONFIRM: 'Eliminare tutti i dati locali?', LOCAL_DATA: 'Tutti i dati sono salvati su questo dispositivo.',
    GAME_BUILD: 'Costruisci', GAME_RECRUIT: 'Recluta', GAME_UNDO: 'Annulla', GAME_END: 'Fine turno', GAME_MENU: 'Pausa',
    GAME_CONTINUE: '▶ Continua', GAME_CENTER: '⌖ Centra mappa', GAME_SAVE_EXIT: '💾 Salva ed esci', GAME_ABANDON: '🏳 Arrenditi', GAME_CODEX: '📖 Codice',
    VIEW_NORMAL: 'Normale', VIEW_COMBAT: 'Combattimento', VIEW_POLITIC: 'Politico', VIEW_RESOURCE: 'Risorse', VIEW_NATO: 'Tattico NATO',
    FB_TITLE: '💬 La tua opinione',
    FB_INTRO: 'Hai trovato un bug o hai un’idea per migliorare il gioco? Diccelo.',
    FB_NAME: 'Nome o utente (facoltativo)',
    FB_NAME_PH: 'Es.: Comandante Giovanni',
    FB_EMAIL: 'Email di contatto (facoltativa)',
    FB_MESSAGE: 'Commento o segnalazione *',
    FB_SEND: 'Invia commento',
    FB_SENDING: 'Invio…',
    FB_OK: 'Grazie! Commento ricevuto.',
    FB_ERR: 'Invio non riuscito. Salvato su questo dispositivo per riprovare.',
    FB_REQUIRED: 'Scrivi un commento prima di inviare.',
    FB_EMAIL_BAD: 'L’email non sembra valida.',
    FB_PRIVACY: 'L’email è facoltativa e serve solo per risponderti.',
    FB_CTA: 'Commenti',
    FB_PROMPT: 'Ti piace? Lascia un commento; ci aiuta a migliorare.',
    FB_LATER: 'Non ora',
    FB_LOCAL: 'La casella non è ancora configurata: il commento sarà salvato su questo dispositivo.',
    CODEX_TITLE: '📖 Codice tattico', CODEX_INTRO: 'Consulta le regole principali senza lasciare la partita.',
    CODEX_TAB_LAYERS: '🗺️ I 6 livelli', CODEX_TAB_COMBAT: '⚔️ Combattimento e Tiers', CODEX_TAB_SUPPLY: '🔗 Rifornimenti',
    CODEX_TAB_SETTLEMENTS: '🏙️ Insediamenti', CODEX_TAB_CREDO: '🕊️ Credo',
    EDITOR_TITLE: 'Editor mappe', EDITOR_SIZE: 'Dimensione', EDITOR_RANDOM: '🎲 Casuale', EDITOR_CLEAR: '🧹 Svuota',
    EDITOR_EXPORT: '📤 Esporta', EDITOR_IMPORT: '📥 Importa', EDITOR_SAVE: '💾 Salva', EDITOR_LOAD: '📂 Apri', EDITOR_PLAY: '▶ Prova',
    REPLAY_TITLE: '🎬 Replay tattico', REPLAY_EXIT: '✖ Esci', REPLAY_TURN: 'Turno', REPLAY_ACTION: 'Azione',
    YES: 'Sì', NO: 'No', CLOSE: 'Chiudi', COMING_SOON: 'presto'
  });

  HF.LANGS = [
    { code: 'es', name: 'Español', flag: '🇪🇸' },
    { code: 'en', name: 'English', flag: '🇬🇧' },
    { code: 'zh', name: '简体中文', flag: '🇨🇳' },
    { code: 'hi', name: 'हिन्दी', flag: '🇮🇳' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
    { code: 'ar', name: 'العربية', flag: '🇸🇦', rtl: true },
    { code: 'bn', name: 'বাংলা', flag: '🇧🇩' },
    { code: 'pt', name: 'Português', flag: '🇵🇹' },
    { code: 'ru', name: 'Русский', flag: '🇷🇺' },
    { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
    { code: 'ja', name: '日本語', flag: '🇯🇵' },
    { code: 'ko', name: '한국어', flag: '🇰🇷' },
    { code: 'it', name: 'Italiano', flag: '🇮🇹' }
  ];

  // Prólogo cinematográfico: se inyecta en los 13 diccionarios.
  const CRAWL = {
    es: {
      CRAWL_TITLE: 'CRÓNICAS DE LA FRONTERA',
      CRAWL_SEC1_TITLE: 'EL TABLERO DE MANDO',
      CRAWL_SEC1_DESC: 'En la parte superior dispones del Menú principal, el indicador de Turno y la reserva de Recursos. A su lado, el Selector de Vistas te permite alternar entre el mapa Normal, de Combate, Político y de Recursos, junto al Marcador comparativo.',
      CRAWL_SEC2_TITLE: 'LA ACCIÓN EN EL FRENTE',
      CRAWL_SEC2_DESC: 'En la base se sitúan tus órdenes: Erigir Asentamientos, Reclutar Divisiones, Deshacer maniobras y Finalizar el Turno cuando tu estrategia esté fijada.',
      CRAWL_SEC3_TITLE: 'LA TIERRA Y SUS RIQUEZAS',
      CRAWL_SEC3_DESC: 'El mundo está forjado por hexágonos de Agua, Llanura, Colina y Montaña. Sobre ellos brotan el Trigo, la Madera y el Oro. Los bosques densos bloquean el paso y deben ser talados por tus soldados para despejar la tierra. Cada casilla teñida con tus colores alimenta las arcas de tu civilización.',
      CRAWL_SEC4_TITLE: 'DOCTRINA DE EXPANSIÓN',
      CRAWL_SEC4_DESC: 'Al nacer el imperio, tu deber es reclamar territorio y asegurar fuentes de grano y oro. Más adelante, los excedentes te permitirán levantar Bastiones y calzadas. Finalmente, dominarás los pasos estrechos y desfiladeros, estrangulando las líneas de suministro de tus adversarios.',
      CRAWL_SEC5_CTA: '¡EL DESTINO DE TU PUEBLO COMIENZA AHORA!',
      CRAWL_DONT_SHOW: 'No volver a mostrar introducción',
      CRAWL_SKIP: 'Saltar ▶',
      CRAWL_SETTING: 'Introducción cinematográfica'
    },
    en: {
      CRAWL_TITLE: 'CHRONICLES OF THE FRONTIER',
      CRAWL_SEC1_TITLE: 'THE COMMAND DECK',
      CRAWL_SEC1_DESC: 'At the top sits the Main Menu, Turn counter, and Resource reserves. Next to them, the View Selector toggles between Normal, Combat, Political, and Resource layers, flanked by the Scoreboard.',
      CRAWL_SEC2_TITLE: 'FRONTLINE OPERATIONS',
      CRAWL_SEC2_DESC: 'At the bottom lie your strategic commands: Erect Settlements, Recruit Divisions, Undo maneuvers, and End Turn once your moves are locked.',
      CRAWL_SEC3_TITLE: 'THE LAND AND ITS WEALTH',
      CRAWL_SEC3_DESC: 'The realm is forged of Sea, Plains, Hills, and Mountains, bearing Wheat, Timber, and Gold. Dense forests block movement until cleared by your soldiers. Every tile dyed in your colors sustains your civilization.',
      CRAWL_SEC4_TITLE: 'DOCTRINE OF EXPANSION',
      CRAWL_SEC4_DESC: 'Early on, claim vital ground and secure grain and ore. Later, surpluses will forge Bastions and paved highways. Ultimately, you shall choke bottlenecks and sever enemy supply lines.',
      CRAWL_SEC5_CTA: 'THE DESTINY OF YOUR PEOPLE BEGINS NOW!',
      CRAWL_DONT_SHOW: 'Do not show intro again',
      CRAWL_SKIP: 'Skip ▶',
      CRAWL_SETTING: 'Cinematic intro'
    },
    fr: {
      CRAWL_TITLE: 'CHRONIQUES DE LA FRONTIÈRE',
      CRAWL_SEC1_TITLE: 'LE PONT DE COMMANDEMENT',
      CRAWL_SEC1_DESC: "En haut se trouvent le Menu principal, le compteur de Tours et les réserves de Ressources. À côté, le Sélecteur de vues alterne entre les cartes Normale, Combat, Politique et Ressources, flanqué du Tableau des scores.",
      CRAWL_SEC2_TITLE: 'OPÉRATIONS EN PREMIÈRE LIGNE',
      CRAWL_SEC2_DESC: "En bas se trouvent vos ordres : fonder des Colonies, recruter des Divisions, annuler des manœuvres et Terminer le tour une fois votre stratégie fixée.",
      CRAWL_SEC3_TITLE: 'LA TERRE ET SES RICHESSES',
      CRAWL_SEC3_DESC: "Le monde est forgé d'hexagones de Mer, Plaine, Colline et Montagne, où poussent le Blé, le Bois et l'Or. Les forêts denses bloquent le passage et doivent être abattues par vos soldats. Chaque case teintée de vos couleurs nourrit les caisses de votre civilisation.",
      CRAWL_SEC4_TITLE: "DOCTRINE D'EXPANSION",
      CRAWL_SEC4_DESC: "À la naissance de l'empire, revendiquez le territoire et sécurisez le grain et l'or. Plus tard, les excédents permettront d'ériger des Bastions et des chaussées. Enfin, vous dominerez les cols et étranglerez les lignes de ravitaillement ennemies.",
      CRAWL_SEC5_CTA: 'LE DESTIN DE VOTRE PEUPLE COMMENCE MAINTENANT !',
      CRAWL_DONT_SHOW: "Ne plus montrer l'introduction",
      CRAWL_SKIP: 'Passer ▶',
      CRAWL_SETTING: 'Introduction cinématique'
    },
    it: {
      CRAWL_TITLE: 'CRONACHE DELLA FRONTIERA',
      CRAWL_SEC1_TITLE: 'IL PONTE DI COMANDO',
      CRAWL_SEC1_DESC: 'In alto trovi il Menu principale, il contatore dei Turni e le riserve di Risorse. Accanto, il Selettore viste alterna le mappe Normale, Combattimento, Politica e Risorse, con il Tabellone dei punteggi.',
      CRAWL_SEC2_TITLE: 'OPERAZIONI IN PRIMA LINEA',
      CRAWL_SEC2_DESC: 'In basso ci sono i tuoi ordini: fondare Insediamenti, reclutare Divisioni, annullare manovre e Terminare il turno quando la strategia è decisa.',
      CRAWL_SEC3_TITLE: 'LA TERRA E LE SUE RICCHEZZE',
      CRAWL_SEC3_DESC: 'Il mondo è fatto di esagoni di Mare, Pianura, Collina e Montagna, su cui crescono Grano, Legname e Oro. Le foreste fitte bloccano il passaggio e vanno abbattute dai tuoi soldati. Ogni casella tinta dei tuoi colori nutre le casse della tua civiltà.',
      CRAWL_SEC4_TITLE: 'DOTTRINA DI ESPANSIONE',
      CRAWL_SEC4_DESC: "All'alba dell'impero rivendica il territorio e assicurati grano e oro. Più tardi le eccedenze permetteranno Bastioni e strade. Infine dominerai i valichi e strangolerai le linee di rifornimento nemiche.",
      CRAWL_SEC5_CTA: 'IL DESTINO DEL TUO POPOLO COMINCIA ORA!',
      CRAWL_DONT_SHOW: "Non mostrare più l'introduzione",
      CRAWL_SKIP: 'Salta ▶',
      CRAWL_SETTING: 'Introduzione cinematografica'
    },
    pt: {
      CRAWL_TITLE: 'CRÔNICAS DA FRONTEIRA',
      CRAWL_SEC1_TITLE: 'O POSTO DE COMANDO',
      CRAWL_SEC1_DESC: 'No topo estão o Menu principal, o contador de Turnos e as reservas de Recursos. Ao lado, o Seletor de vistas alterna entre os mapas Normal, Combate, Político e Recursos, com o Placar.',
      CRAWL_SEC2_TITLE: 'OPERAÇÕES NA LINHA DE FRENTE',
      CRAWL_SEC2_DESC: 'Na base ficam as suas ordens: erguer Assentamentos, recrutar Divisões, desfazer manobras e Encerrar o turno quando a estratégia estiver definida.',
      CRAWL_SEC3_TITLE: 'A TERRA E AS SUAS RIQUEZAS',
      CRAWL_SEC3_DESC: 'O mundo é forjado em hexágonos de Mar, Planície, Colina e Montanha, onde brotam Trigo, Madeira e Ouro. As florestas densas bloqueiam a passagem e devem ser derrubadas pelos seus soldados. Cada casa tingida com as suas cores alimenta os cofres da sua civilização.',
      CRAWL_SEC4_TITLE: 'DOUTRINA DE EXPANSÃO',
      CRAWL_SEC4_DESC: 'No início do império, reivindique território e garanta grão e ouro. Mais tarde, os excedentes erguerão Bastiões e calçadas. Por fim, dominará os desfiladeiros e estrangulará as linhas de suprimento inimigas.',
      CRAWL_SEC5_CTA: 'O DESTINO DO SEU POVO COMEÇA AGORA!',
      CRAWL_DONT_SHOW: 'Não mostrar a introdução novamente',
      CRAWL_SKIP: 'Pular ▶',
      CRAWL_SETTING: 'Introdução cinematográfica'
    },
    de: {
      CRAWL_TITLE: 'CHRONIKEN DER GRENZE',
      CRAWL_SEC1_TITLE: 'DIE KOMMANDOBRÜCKE',
      CRAWL_SEC1_DESC: 'Oben findest du das Hauptmenü, den Rundenzähler und die Ressourcenvorräte. Daneben wechselt die Ansichtsauswahl zwischen Normal-, Kampf-, Politik- und Ressourcenkarte, flankiert von der Rangliste.',
      CRAWL_SEC2_TITLE: 'OPERATIONEN AN DER FRONT',
      CRAWL_SEC2_DESC: 'Unten liegen deine Befehle: Siedlungen errichten, Divisionen rekrutieren, Manöver rückgängig machen und die Runde beenden, wenn deine Strategie steht.',
      CRAWL_SEC3_TITLE: 'DAS LAND UND SEIN REICHTUM',
      CRAWL_SEC3_DESC: 'Die Welt besteht aus Hexfeldern aus Meer, Ebene, Hügel und Gebirge, auf denen Weizen, Holz und Gold wachsen. Dichte Wälder blockieren den Weg und müssen von deinen Soldaten gerodet werden. Jedes Feld in deinen Farben füllt die Kassen deiner Zivilisation.',
      CRAWL_SEC4_TITLE: 'LEHRE DER EXPANSION',
      CRAWL_SEC4_DESC: 'Zu Beginn deines Reiches sichere Land, Getreide und Erz. Später errichten Überschüsse Bastionen und Straßen. Schließlich beherrschst du Pässe und drosselst die Nachschubwege des Feindes.',
      CRAWL_SEC5_CTA: 'DAS SCHICKSAL DEINES VOLKES BEGINNT JETZT!',
      CRAWL_DONT_SHOW: 'Einführung nicht mehr anzeigen',
      CRAWL_SKIP: 'Überspringen ▶',
      CRAWL_SETTING: 'Kinematische Einführung'
    },
    ru: {
      CRAWL_TITLE: 'ХРОНИКИ ГРАНИЦЫ',
      CRAWL_SEC1_TITLE: 'КОМАНДНЫЙ МОСТИК',
      CRAWL_SEC1_DESC: 'Сверху — главное меню, счётчик ходов и запасы ресурсов. Рядом переключатель видов: обычная, боевая, политическая и ресурсная карты, а также таблица лидеров.',
      CRAWL_SEC2_TITLE: 'ОПЕРАЦИИ НА ПЕРЕДОВОЙ',
      CRAWL_SEC2_DESC: 'Внизу — ваши приказы: основать поселения, набрать дивизии, отменить манёвры и завершить ход, когда стратегия определена.',
      CRAWL_SEC3_TITLE: 'ЗЕМЛЯ И ЕЁ БОГАТСТВА',
      CRAWL_SEC3_DESC: 'Мир соткан из гексов моря, равнин, холмов и гор, где растут пшеница, древесина и золото. Густые леса преграждают путь — их должны вырубить ваши солдаты. Каждая клетка в ваших цветах питает казну цивилизации.',
      CRAWL_SEC4_TITLE: 'ДОКТРИНА ЭКСПАНСИИ',
      CRAWL_SEC4_DESC: 'В начале империи займите земли и обеспечьте себя зерном и золотом. Позже излишки позволят возвести бастионы и дороги. Наконец, вы овладеете перевалами и перережете снабжение врага.',
      CRAWL_SEC5_CTA: 'СУДЬБА ВАШЕГО НАРОДА НАЧИНАЕТСЯ СЕЙЧАС!',
      CRAWL_DONT_SHOW: 'Больше не показывать вступление',
      CRAWL_SKIP: 'Пропустить ▶',
      CRAWL_SETTING: 'Кинематографическое вступление'
    },
    zh: {
      CRAWL_TITLE: '边疆编年史',
      CRAWL_SEC1_TITLE: '指挥甲板',
      CRAWL_SEC1_DESC: '顶部是主菜单、回合计数与资源储备。旁边是视图切换器，可在普通、战斗、政治与资源地图之间切换，并配有排行榜。',
      CRAWL_SEC2_TITLE: '前线行动',
      CRAWL_SEC2_DESC: '底部是你的指令：建立定居点、招募部队、撤销行动，以及在想好策略后结束回合。',
      CRAWL_SEC3_TITLE: '土地与财富',
      CRAWL_SEC3_DESC: '世界由海洋、平原、丘陵与山脉的六边形构成，生长着小麦、木材与黄金。茂密森林会阻挡通行，须由士兵砍伐。每一块染上你颜色的土地都会充实你的国库。',
      CRAWL_SEC4_TITLE: '扩张学说',
      CRAWL_SEC4_DESC: '帝国初立，先夺取土地、确保粮食与黄金；随后盈余将筑起堡垒与大道；最终你将掌控隘口，扼住敌人的补给线。',
      CRAWL_SEC5_CTA: '你人民的命运此刻开始！',
      CRAWL_DONT_SHOW: '不再显示此介绍',
      CRAWL_SKIP: '跳过 ▶',
      CRAWL_SETTING: '电影式开场'
    },
    ja: {
      CRAWL_TITLE: '辺境の年代記',
      CRAWL_SEC1_TITLE: '指揮デッキ',
      CRAWL_SEC1_DESC: '上部にはメインメニュー、ターン数、資源の備蓄があります。その隣のビュー切り替えで、通常・戦闘・政治・資源の地図とスコアボードを切り替えられます。',
      CRAWL_SEC2_TITLE: '前線の作戦',
      CRAWL_SEC2_DESC: '下部には命令があります。入植地の建設、部隊の募集、行動の取り消し、そして戦略が固まったらターン終了です。',
      CRAWL_SEC3_TITLE: '大地と富',
      CRAWL_SEC3_DESC: '世界は海・平原・丘陵・山脈の六角形でできており、小麦・木材・金が実ります。密林は通行を妨げ、兵士が伐採する必要があります。あなたの色に染まったマスは文明の財庫を満たします。',
      CRAWL_SEC4_TITLE: '拡張の教義',
      CRAWL_SEC4_DESC: '帝国の黎明には領土を確保し、穀物と金を押さえよ。後に余剰で要塞と街道を築き、最後には隘路を制して敵の補給線を締め上げる。',
      CRAWL_SEC5_CTA: 'あなたの民の運命が、いま始まる！',
      CRAWL_DONT_SHOW: 'この紹介を今後表示しない',
      CRAWL_SKIP: 'スキップ ▶',
      CRAWL_SETTING: 'シネマティック紹介'
    },
    ko: {
      CRAWL_TITLE: '변경 연대기',
      CRAWL_SEC1_TITLE: '지휘 갑판',
      CRAWL_SEC1_DESC: '상단에는 메인 메뉴, 턴 표시, 자원 비축량이 있습니다. 옆의 보기 전환기로 일반·전투·정치·자원 지도와 순위표를 오갈 수 있습니다.',
      CRAWL_SEC2_TITLE: '전선 작전',
      CRAWL_SEC2_DESC: '하단에는 명령이 있습니다. 정착지 건설, 부대 모집, 행동 취소, 그리고 전략이 정해지면 턴 종료입니다.',
      CRAWL_SEC3_TITLE: '땅과 그 풍요',
      CRAWL_SEC3_DESC: '세계는 바다·평원·언덕·산맥의 육각형으로 이루어져 있으며 밀·목재·금이 자랍니다. 울창한 숲은 통행을 막으므로 병사들이 베어야 합니다. 당신의 색으로 물든 모든 칸이 문명의 금고를 채웁니다.',
      CRAWL_SEC4_TITLE: '확장의 교리',
      CRAWL_SEC4_DESC: '제국의 시작에는 영토를 확보하고 곡물과 금을 지켜라. 이후 잉여로 요새와 도로를 세우고, 마침내 협로를 장악해 적의 보급선을 조여라.',
      CRAWL_SEC5_CTA: '당신 민족의 운명이 지금 시작됩니다!',
      CRAWL_DONT_SHOW: '이 소개를 다시 표시하지 않기',
      CRAWL_SKIP: '건너뛰기 ▶',
      CRAWL_SETTING: '시네마틱 인트로'
    },
    hi: {
      CRAWL_TITLE: 'सीमांत के इतिहास',
      CRAWL_SEC1_TITLE: 'कमांड डेक',
      CRAWL_SEC1_DESC: 'ऊपर मुख्य मेनू, बारी गिनती और संसाधन भंडार हैं। साथ में दृश्य चयनकर्ता सामान्य, युद्ध, राजनीतिक और संसाधन मानचित्रों तथा स्कोरबोर्ड के बीच बदलता है।',
      CRAWL_SEC2_TITLE: 'मोर्चे के अभियान',
      CRAWL_SEC2_DESC: 'नीचे आपके आदेश हैं: बस्तियाँ बसाना, सैन्य दल भर्ती करना, कदम पूर्ववत करना और रणनीति तय होने पर बारी समाप्त करना।',
      CRAWL_SEC3_TITLE: 'भूमि और उसकी संपदा',
      CRAWL_SEC3_DESC: 'यह संसार समुद्र, मैदान, पहाड़ी और पर्वत के षट्कोणों से बना है, जहाँ गेहूँ, लकड़ी और सोना उगता है। घने वन रास्ता रोकते हैं और सैनिकों को उन्हें काटना होता है। आपके रंग से रंगा हर खाना आपकी सभ्यता का कोष भरता है।',
      CRAWL_SEC4_TITLE: 'विस्तार का सिद्धांत',
      CRAWL_SEC4_DESC: 'साम्राज्य के आरंभ में भूमि पर दावा करें और अनाज व सोना सुरक्षित करें। बाद में अधिशेष से गढ़ और मार्ग बनेंगे। अंत में आप दर्रों पर अधिकार पाकर शत्रु की आपूर्ति काट देंगे।',
      CRAWL_SEC5_CTA: 'आपके लोगों का भाग्य अब आरंभ होता है!',
      CRAWL_DONT_SHOW: 'यह परिचय दोबारा न दिखाएँ',
      CRAWL_SKIP: 'छोड़ें ▶',
      CRAWL_SETTING: 'सिनेमाई परिचय'
    },
    bn: {
      CRAWL_TITLE: 'সীমান্তের ইতিবৃত্ত',
      CRAWL_SEC1_TITLE: 'কমান্ড ডেক',
      CRAWL_SEC1_DESC: 'উপরে রয়েছে প্রধান মেনু, পালা গণনা ও সম্পদ ভাণ্ডার। পাশে দৃশ্য নির্বাচক সাধারণ, যুদ্ধ, রাজনৈতিক ও সম্পদ মানচিত্র এবং স্কোরবোর্ডের মধ্যে বদলায়।',
      CRAWL_SEC2_TITLE: 'সম্মুখের অভিযান',
      CRAWL_SEC2_DESC: 'নিচে আপনার আদেশ: বসতি স্থাপন, সৈন্য নিয়োগ, পদক্ষেপ বাতিল এবং কৌশল ঠিক হলে পালা শেষ।',
      CRAWL_SEC3_TITLE: 'ভূমি ও তার সম্পদ',
      CRAWL_SEC3_DESC: 'এই জগৎ সমুদ্র, সমতল, পাহাড় ও পর্বতের ষড়ভুজে গড়া, যেখানে গম, কাঠ ও সোনা ফলে। ঘন বন পথ আটকায়, সৈন্যদের তা কাটতে হয়। আপনার রঙে রাঙা প্রতিটি ঘর আপনার সভ্যতার ভাণ্ডার ভরে।',
      CRAWL_SEC4_TITLE: 'বিস্তারের নীতি',
      CRAWL_SEC4_DESC: 'সাম্রাজ্যের সূচনায় ভূমি দখল করুন এবং শস্য ও সোনা নিশ্চিত করুন। পরে উদ্বৃত্তে দুর্গ ও রাজপথ গড়ুন। শেষে গিরিপথ নিয়ন্ত্রণ করে শত্রুর সরবরাহ বন্ধ করুন।',
      CRAWL_SEC5_CTA: 'আপনার জাতির ভাগ্য এখনই শুরু!',
      CRAWL_DONT_SHOW: 'এই ভূমিকা আর দেখাবেন না',
      CRAWL_SKIP: 'এড়িয়ে যান ▶',
      CRAWL_SETTING: 'সিনেমাটিক ভূমিকা'
    },
    ar: {
      CRAWL_TITLE: 'سجلّات الحدود',
      CRAWL_SEC1_TITLE: 'منصّة القيادة',
      CRAWL_SEC1_DESC: 'في الأعلى القائمة الرئيسية وعدّاد الأدوار ومخزون الموارد. وبجانبه مبدّل العرض للتبديل بين خرائط عادية وقتالية وسياسية وموارد، مع لوحة النتائج.',
      CRAWL_SEC2_TITLE: 'عمليات الجبهة',
      CRAWL_SEC2_DESC: 'في الأسفل أوامرك: إنشاء المستوطنات، تجنيد الفرق، التراجع عن المناورات، وإنهاء الدور حين تستقر خطتك.',
      CRAWL_SEC3_TITLE: 'الأرض وثرواتها',
      CRAWL_SEC3_DESC: 'العالم مبنيّ من سداسيات البحر والسهل والتل والجبل، تنمو فيها القمح والأخشاب والذهب. الغابات الكثيفة تسدّ الطريق ويجب أن يقطعها جنودك. كل خانة مصبوغة بألوانك تغذّي خزائن حضارتك.',
      CRAWL_SEC4_TITLE: 'عقيدة التوسّع',
      CRAWL_SEC4_DESC: 'في فجر إمبراطوريتك طالب بالأرض وأمّن الحبوب والذهب. لاحقًا ستبني الفوائض الحصون والطرق. وأخيرًا ستسيطر على الممرات وتخنق خطوط إمداد أعدائك.',
      CRAWL_SEC5_CTA: 'مصير شعبك يبدأ الآن!',
      CRAWL_DONT_SHOW: 'عدم إظهار هذه المقدمة مجددًا',
      CRAWL_SKIP: 'تخطّي ▶',
      CRAWL_SETTING: 'مقدمة سينمائية'
    }
  };
  for (const k in CRAWL) if (HF.LOCALES[k]) Object.assign(HF.LOCALES[k], CRAWL[k]);

  // Prólogo del final del crawl (antes del CTA): 13 idiomas.
  const CRAWL_PRO = {
    es: `El Imperio ha muerto.

Hay calzadas rotas, arcas vacías y sin Corona.

Sobre las cenizas del viejo orden, los señores reclaman valles, ríos y las calzadas que antaño alimentaron a millones.

En este tablero no hay dioses que escuchen tus plegarias ni dados que tuerzan el destino. Solo impera la ley de la logística y el hierro, la división que avance sin pan perecerá en la nieve; el bastión protegido resistirá por los siglos.

Los mapas están desplegados, las fichas esperan tu orden.`,
    en: `The Empire is dead.

Broken roads remain, treasuries lie empty, and there is no Crown.

Upon the ashes of the old order, lords claim valleys, rivers, and the roads that once fed millions.

On this board there are no gods to hear your prayers, nor dice to bend fate. Only the law of logistics and iron holds sway, the division that marches without bread shall perish in the snow; the protected bastion shall stand for centuries.

The maps are unfurled, the pieces await your command.`,
    fr: `L'Empire est mort.

Il reste des routes brisées, des coffres vides et plus de Couronne.

Sur les cendres de l'ancien ordre, les seigneurs revendiquent vallées, rivières et les routes qui nourrissaient jadis des millions d'âmes.

Sur ce plateau, nul dieu n'écoute tes prières, nul dé ne courbe le destin. Seule règne la loi de la logistique et du fer, la division qui avance sans pain périra dans la neige ; le bastion protégé résistera pendant des siècles.

Les cartes sont déployées, les pièces attendent ton ordre.`,
    it: `L'Impero è morto.

Restano strade spezzate, casse vuote e nessuna Corona.

Sulle ceneri del vecchio ordine, i signori rivendicano valli, fiumi e le strade che un tempo nutrivano milioni di persone.

Su questa plancia non ci sono dèi che ascoltino le tue preghiere né dadi che pieghino il destino. Regna solo la legge della logistica e del ferro, la divisione che avanza senza pane perirà nella neve; il bastione protetto resisterà per secoli.

Le mappe sono dispiegate, i pezzi attendono il tuo ordine.`,
    pt: `O Império morreu.

Restam estradas quebradas, cofres vazios e nenhuma Coroa.

Sobre as cinzas da velha ordem, os senhores reclamam vales, rios e as estradas que outrora alimentaram milhões.

Neste tabuleiro não há deuses que ouçam as tuas preces nem dados que torçam o destino. Só impera a lei da logística e do ferro, a divisão que avança sem pão perecerá na neve; o bastião protegido resistirá por séculos.

Os mapas estão abertos, as peças aguardam a tua ordem.`,
    de: `Das Imperium ist tot.

Gebrochene Straßen, leere Kassen und keine Krone.

Auf der Asche der alten Ordnung erheben die Herren Anspruch auf Täler, Flüsse und die Straßen, die einst Millionen nährten.

Auf diesem Brett gibt es keine Götter, die deine Gebete hören, und keine Würfel, die das Schicksal beugen. Nur das Gesetz der Logistik und des Eisens herrscht, die Division, die ohne Brot marschiert, vergeht im Schnee; die geschützte Bastion wird Jahrhunderte überdauern.

Die Karten sind entrollt, die Figuren erwarten deinen Befehl.`,
    ru: `Империя мертва.

Остались разбитые дороги, пустые казны и нет Короны.

На пепле старого порядка государи требуют долины, реки и дороги, что некогда кормили миллионы.

На этой доске нет богов, что услышат твои молитвы, и нет костей, что изменят судьбу. Правит лишь закон логистики и железа, дивизия, идущая без хлеба, погибнет в снегах; защищённый бастион простоит века.

Карты развёрнуты, фигуры ждут твоего приказа.`,
    zh: `帝国已亡。

道路破碎，国库空虚，王冠不再。

在旧秩序的灰烬之上，诸侯争夺山谷、河流，以及曾经养活千万人的道路。

在这张棋盘上，没有神明聆听你的祈祷，也没有骰子能扭转命运。唯有后勤与钢铁的法则：无粮而进的军队将葬身风雪；受护的堡垒将屹立百年。

地图已展开，棋子等待你的号令。`,
    ja: `帝国は死んだ。

壊れた街道、空の財庫、そして王冠はない。

旧秩序の灰の上で、領主たちは谷と川、かつて何百万もの人々を養った道を求めている。

この盤上に祈りを聞く神も、運命を曲げる賽もない。あるのは兵站と鉄の掟だけだ。パンなく進む部隊は雪中に果て、守られた要塞は幾世紀も耐える。

地図は広げられ、駒はあなたの命令を待つ。`,
    ko: `제국은 죽었다.

부서진 길, 텅 빈 금고, 그리고 왕관은 없다.

옛 질서의 재 위에서 군주들은 계곡과 강, 한때 수백만을 먹여 살린 길을 요구한다.

이 판 위에는 기도를 듣는 신도, 운명을 비트는 주사위도 없다. 오직 병참과 철의 법칙만이 군림한다. 빵 없이 나아가는 부대는 눈 속에서 쓰러지고, 보호된 요새는 수백 년을 버틴다.

지도는 펼쳐졌고, 말들은 너의 명령을 기다린다.`,
    hi: `साम्राज्य मर चुका है।

टूटी सड़कें, खाली कोष, और कोई मुकुट नहीं।

पुरानी व्यवस्था की राख पर, सरदार घाटियों, नदियों और उन मार्गों पर दावा करते हैं जो कभी लाखों का पेट भरते थे।

इस बिसात पर न कोई देवता हैं जो तुम्हारी प्रार्थना सुनें, न कोई पासा जो भाग्य मोड़े। केवल रसद और लोहे का नियम चलता है: बिना रोटी के बढ़ता दल बर्फ़ में मिट जाएगा; सुरक्षित गढ़ सदियों तक टिकेगा।

नक्शे खुले हैं, मोहरे तुम्हारे आदेश की प्रतीक्षा करते हैं।`,
    bn: `সাম্রাজ্য মরে গেছে।

ভাঙা রাজপথ, শূন্য ভাণ্ডার, আর কোনো মুকুট নেই।

পুরনো ব্যবস্থার ছাইয়ের উপর, প্রভুরা উপত্যকা, নদী আর সেই পথগুলো দাবি করে যা একদিন লক্ষ লক্ষ মানুষকে খাওয়াত।

এই বোর্ডে কোনো দেবতা নেই যিনি তোমার প্রার্থনা শোনেন, কোনো পাশা নেই যা ভাগ্য বদলায়। কেবল সরবরাহ ও লোহার নিয়ম চলে: রুটি ছাড়া অগ্রসর হওয়া বাহিনী তুষারে মরবে; সুরক্ষিত দুর্গ শতাব্দী ধরে টিকে থাকবে।

মানচিত্র খোলা, গুটিগুলো তোমার আদেশের অপেক্ষায়।`,
    ar: `ماتت الإمبراطورية.

بقيت طرق مكسورة وخزائن فارغة ولا تاج.

على رماد النظام القديم، يطالب السادة بالوديان والأنهار والطرق التي كانت تُطعم الملايين.

على هذه الرقعة لا آلهة تسمع صلاتك ولا نرد يلوي القدر. لا يحكم إلا قانون الإمداد والحديد: الفرقة التي تتقدم بلا خبز تهلك في الثلج؛ والحصن المحصّن يصمد قرونًا.

الخرائط منشورة، والقطع تنتظر أمرك.`
  };
  for (const k in CRAWL_PRO) if (HF.LOCALES[k]) HF.LOCALES[k].CRAWL_PROLOGUE = CRAWL_PRO[k];

  HF.t = function (key, fallback) {
    const s = HF.settings ? HF.settings() : {};
    const dict = HF.LOCALES[s.lang] || HF.LOCALES.es;
    if (dict[key] != null) return dict[key];
    const base = HF.LOCALES.en || HF.LOCALES.es;
    return base[key] != null ? base[key] : (fallback != null ? fallback : key);
  };
  HF.lang = () => {
    const lang = HF.settings ? (HF.settings().lang || 'es') : 'es';
    return HF.LOCALES[lang] ? lang : 'es';
  };
  HF.setLang = lang => {
    if (!HF.LOCALES[lang]) lang = 'es';
    const s = HF.settings ? HF.settings() : {};
    s.lang = lang; HF.store.set('settings', s);
    if (G.document && G.document.documentElement) {
      G.document.documentElement.lang = lang;
      G.document.documentElement.dir = (HF.LANGS.find(x => x.code === lang) || {}).rtl ? 'rtl' : 'ltr';
    }
    if (HF.bgm) HF.bgm.refresh();
    return lang;
  };
  if (G.document && G.document.documentElement) {
    const lang = HF.lang();
    G.document.documentElement.lang = lang;
    G.document.documentElement.dir = (HF.LANGS.find(x => x.code === lang) || {}).rtl ? 'rtl' : 'ltr';
  }
})(typeof window !== 'undefined' ? window : globalThis);
