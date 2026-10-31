/* Generador de nombres de tribu.
   5 fórmulas gramaticales + base silábica procedural + bancos por idioma.
   Se usa al crear el perfil, al pulsar el dado en la pantalla de Tribu y para
   migrar los perfiles antiguos que aún se llamaban "Mi Tribu". */
(function (G) {
  const HF = G.HF;
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const cap = s => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

  // --- base silábica (inicio + núcleo + final) ---
  const SYL = {
    epic: {
      start: ['Eld', 'Mar', 'Val', 'Kor', 'Thal', 'Dra', 'Aer', 'Lum', 'Ser', 'Tor', 'Ven', 'Aur'],
      mid: ['an', 'is', 'or', 'en', 'ar', 'el', 'in', 'ath', 'er', 'un'],
      end: ['is', 'os', 'us', 'dor', 'ian', 'eth', 'ar', 'on', 'iel', 'or']
    },
    rugged: {
      start: ['Gar', 'Grim', 'Vorn', 'Brag', 'Krag', 'Thar', 'Drok', 'Ul', 'Mor', 'Rok', 'Zag', 'Dur'],
      mid: ['ak', 'ok', 'ur', 'ag', 'ar', 'og', 'un', 'ir', 'al', 'um'],
      end: ['an', 'or', 'uk', 'arn', 'ash', 'og', 'ak', 'ur', 'dan', 'gar']
    },
    light: {
      start: ['Syl', 'Ly', 'Ny', 'Ze', 'Fi', 'Ari', 'Eli', 'Io', 'Mira', 'Se', 'Va', 'Lia'],
      mid: ['ra', 'el', 'ri', 'mi', 'la', 'ne', 'sa', 'vi', 'li', 'na'],
      end: ['is', 'a', 'en', 'al', 'iel', 'ia', 'in', 'elle', 'ys', 'ine']
    }
  };

  function syllabic(style) {
    const s = SYL[style] || SYL.epic;
    let out = pick(s.start) + pick(s.mid) + pick(s.end);
    out = out.replace(/(.)\1{2,}/g, '$1$1');   // sin triples letras
    return cap(out.toLowerCase());
  }

  // Fórmula D: compuesta, a veces con guion.
  function compound(style) {
    const s = SYL[style] || SYL.rugged;
    const a = pick(s.start), b = pick(s.end);
    const raw = a + (Math.random() < .45 ? '-' : '') + b;
    return cap(raw.toLowerCase());
  }

  // --- bancos por idioma ---
  // native: la base es un sustantivo del propio idioma (para escrituras no
  // latinas, evita mezclar "Kael" con devanagari/árabe/CJK).
  const BANKS = {
    es: {
      titles: ['Capitán', 'Guardián', 'Pionera', 'Centinela', 'Mariscal', 'Cazador', 'Vanguardia', 'Explorador'],
      adjs: ['Sereno', 'Implacable', 'Vigilante', 'Furtivo', 'Feroz', 'Radiante', 'Tenaz', 'Sagaz'],
      elems: ['Hierro', 'Ceniza', 'Viento', 'Escarcha', 'Abismo', 'Fuego', 'Tormenta', 'Hielo'],
      nouns: ['Garra', 'Escudo', 'Sombra', 'Hoja', 'Cuervo', 'Llama', 'Tótem', 'Ancla'],
      a: (t, b) => `${t} ${b}`,
      b: (b, a) => `${b} ${a}`,
      c: (b, e) => `${b} de ${e}`,
      e: (n1, n2) => `${n1} de ${n2}`
    },
    en: {
      titles: ['Commander', 'Guardian', 'Pioneer', 'Sentinel', 'Marshal', 'Hunter', 'Vanguard', 'Pathfinder'],
      adjs: ['Serene', 'Relentless', 'Vigilant', 'Stealthy', 'Fierce', 'Radiant', 'Stalwart', 'Sly'],
      elems: ['Iron', 'Ash', 'Wind', 'Frost', 'Abyss', 'Fire', 'Storm', 'Ice'],
      nouns: ['Claw', 'Shield', 'Shadow', 'Blade', 'Raven', 'Flame', 'Forge', 'Crown'],
      a: (t, b) => `${t} ${b}`,
      b: (b, a) => `${b} the ${a}`,
      c: (b, e) => `${b} of ${e}`,
      e: (n1, n2) => `${n1}${n2.toLowerCase()}`
    },
    fr: {
      titles: ['Commandant', 'Gardien', 'Pionnier', 'Sentinelle', 'Maréchal', 'Chasseur'],
      adjs: ['Serein', 'Implacable', 'Vigilant', 'Furtif', 'Féroce', 'Radieux'],
      elems: ['Fer', 'Cendre', 'Vent', 'Givre', 'Abîme', 'Feu'],
      nouns: ['Griffe', 'Bouclier', 'Ombre', 'Lame', 'Corbeau', 'Flamme'],
      a: (t, b) => `${t} ${b}`,
      b: (b, a) => `${b} ${a}`,
      c: (b, e) => `${b} de ${e}`,
      e: (n1, n2) => `${n1} et ${n2}`
    },
    it: {
      titles: ['Comandante', 'Guardiano', 'Pioniere', 'Sentinella', 'Maresciallo', 'Cacciatore'],
      adjs: ['Sereno', 'Implacabile', 'Vigile', 'Furtivo', 'Feroce', 'Radioso'],
      elems: ['Ferro', 'Cenere', 'Vento', 'Gelo', 'Abisso', 'Fuoco'],
      nouns: ['Artiglio', 'Scudo', 'Ombra', 'Lama', 'Corvo', 'Fiamma'],
      a: (t, b) => `${t} ${b}`,
      b: (b, a) => `${b} ${a}`,
      c: (b, e) => `${b} di ${e}`,
      e: (n1, n2) => `${n1} di ${n2}`
    },
    pt: {
      titles: ['Comandante', 'Guardião', 'Pioneiro', 'Sentinela', 'Marechal', 'Caçador'],
      adjs: ['Sereno', 'Implacável', 'Vigilante', 'Furtivo', 'Feroz', 'Radiante'],
      elems: ['Ferro', 'Cinza', 'Vento', 'Geada', 'Abismo', 'Fogo'],
      nouns: ['Garra', 'Escudo', 'Sombra', 'Lâmina', 'Corvo', 'Chama'],
      a: (t, b) => `${t} ${b}`,
      b: (b, a) => `${b} ${a}`,
      c: (b, e) => `${b} de ${e}`,
      e: (n1, n2) => `${n1} de ${n2}`
    },
    de: {
      titles: ['Kommandant', 'Wächter', 'Pionier', 'Sentinel', 'Marschall', 'Jäger'],
      adjs: ['Gelassen', 'Unerbittlich', 'Wachsam', 'Verborgen', 'Wild', 'Strahlend'],
      elems: ['Eisen', 'Asche', 'Wind', 'Frost', 'Abgrund', 'Feuer'],
      nouns: ['Klaue', 'Schild', 'Schatten', 'Klinge', 'Rabe', 'Flamme'],
      a: (t, b) => `${t} ${b}`,
      b: (b, a) => `${b} ${a}`,
      c: (b, e) => `${b} aus ${e}`,
      e: (n1, n2) => `${n1}${n2.toLowerCase()}`
    },
    ru: {
      titles: ['Капитан', 'Страж', 'Пионер', 'Часовой', 'Маршал', 'Охотник', 'Вождь', 'Рыцарь'],
      adjs: ['Безмятежный', 'Неумолимый', 'Зоркий', 'Скрытный', 'Свирепый', 'Сияющий', 'Храбрый', 'Мудрый'],
      elems: ['Железо', 'Пепел', 'Ветер', 'Мороз', 'Бездна', 'Огонь', 'Гроза', 'Лёд'],
      nouns: ['Коготь', 'Щит', 'Тень', 'Клинок', 'Ворон', 'Пламя', 'Корона', 'Стрела'],
      native: true,
      a: (t, b) => `${t} ${b}`,
      b: (b, a) => `${a} ${b}`,
      c: (b, e) => `${b} и ${e}`,
      e: (n1, n2) => `${n1} и ${n2}`
    },
    zh: {
      titles: ['统帅', '守卫', '先驱', '哨兵', '元帅', '猎手', '将军', '总督'],
      adjs: ['沉静', '无情', '警觉', '隐秘', '凶猛', '光辉', '坚毅', '迅捷'],
      elems: ['铁', '灰', '风', '霜', '深渊', '火', '雷', '冰'],
      nouns: ['爪', '盾', '影', '刃', '鸦', '焰', '塔', '旗'],
      native: true,
      a: (t, b) => `${t}${b}`,
      b: (b, a) => `${a}之${b}`,
      c: (b, e) => `${e}之${b}`,
      e: (n1, n2) => `${n1}${n2}`
    },
    ja: {
      titles: ['隊長', '守護者', '先駆者', '哨戒兵', '元帥', '狩人', '将軍', '族長'],
      adjs: ['静謐', '容赦ない', '警戒', '隠密', '獰猛', '輝く', '勇敢', '賢い'],
      elems: ['鉄', '灰', '風', '霜', '深淵', '火', '雷', '氷'],
      nouns: ['爪', '盾', '影', '刃', '鴉', '炎', '王冠', '矢'],
      native: true,
      a: (t, b) => `${t} ${b}`,
      b: (b, a) => `${a}の${b}`,
      c: (b, e) => `${e}の${b}`,
      e: (n1, n2) => `${n1}${n2}`
    },
    ko: {
      titles: ['대장', '수호자', '선구자', '초병', '원수', '사냥꾼', '장군', '족장'],
      adjs: ['고요한', '무자비한', '경계하는', '은밀한', '사나운', '빛나는', '용감한', '지혜로운'],
      elems: ['철', '재', '바람', '서리', '심연', '불', '번개', '얼음'],
      nouns: ['발톱', '방패', '그림자', '칼날', '까마귀', '불꽃', '왕관', '화살'],
      native: true,
      a: (t, b) => `${t} ${b}`,
      b: (b, a) => `${a} ${b}`,
      c: (b, e) => `${e}의 ${b}`,
      e: (n1, n2) => `${n1}${n2}`
    },
    hi: {
      titles: ['सेनापति', 'संरक्षक', 'अग्रणी', 'प्रहरी', 'मार्शल', 'शिकारी', 'योद्धा', 'नायक'],
      adjs: ['शांत', 'निर्दयी', 'सतर्क', 'गुप्त', 'भयंकर', 'दीप्तिमान', 'वीर', 'चतुर'],
      elems: ['लोहा', 'राख', 'हवा', 'पाला', 'पाताल', 'अग्नि', 'बादल', 'समुद्र'],
      nouns: ['पंजा', 'ढाल', 'छाया', 'तलवार', 'कौआ', 'ज्वाला', 'धनुष', 'कवच'],
      native: true,
      a: (t, b) => `${t} ${b}`,
      b: (b, a) => `${a} ${b}`,
      c: (b, e) => `${e} ${b}`,
      e: (n1, n2) => `${n1} और ${n2}`
    },
    bn: {
      titles: ['সেনাপতি', 'অভিভাবক', 'অগ্রগামী', 'প্রহরী', 'মার্শাল', 'শিকারি', 'যোদ্ধা', 'নেতা'],
      adjs: ['শান্ত', 'নির্দয়', 'সতর্ক', 'গোপন', 'ভয়ংকর', 'উজ্জ্বল', 'সাহসী', 'চতুর'],
      elems: ['লোহা', 'ছাই', 'বাতাস', 'তুষার', 'অতল', 'আগুন', 'মেঘ', 'সমুদ্র'],
      nouns: ['নখ', 'ঢাল', 'ছায়া', 'তলোয়ার', 'কাক', 'শিখা', 'ধনুক', 'বর্ম'],
      native: true,
      a: (t, b) => `${t} ${b}`,
      b: (b, a) => `${a} ${b}`,
      c: (b, e) => `${e} ${b}`,
      e: (n1, n2) => `${n1} ও ${n2}`
    },
    ar: {
      titles: ['القائد', 'الحارس', 'الرائد', 'المرشد', 'المشير', 'الصياد', 'الفارس', 'الأمير'],
      adjs: ['الهادئ', 'العنيد', 'اليقظ', 'الخفي', 'الشرس', 'المشع', 'الصامت', 'القوي'],
      elems: ['الحديد', 'الرماد', 'الريح', 'الصقيع', 'الهاوية', 'النار', 'الظلام', 'الضوء'],
      nouns: ['المخلب', 'الدرع', 'الظل', 'النصل', 'الغراب', 'اللهب', 'التاج', 'السهم'],
      native: true,
      a: (t, b) => `${t} ${b.replace(/^ال/, '')}`,
      b: (b, a) => `${b} ${a}`,
      c: (b, e) => `${b} من ${e}`,
      e: (n1, n2) => `${n1} و${n2}`
    }
  };
  const FORMULAS = ['A', 'B', 'C', 'D', 'E'];

  function tidy(s) {
    return String(s || '').replace(/\s+/g, ' ').trim();
  }

  HF.genTribeName = function (lang) {
    const code = lang || (HF.lang && HF.lang()) || 'es';
    const L = BANKS[code] || BANKS.es;
    // Las escrituras no latinas usan un sustantivo propio como nombre base.
    const base = L.native ? pick(L.nouns) : syllabic();
    // Se prueban fórmulas hasta dar con una que quepa en 20 caracteres sin
    // partir palabras; si ninguna cabe se usa el compuesto silábico (corto).
    for (let attempt = 0; attempt < 4; attempt++) {
      const f = pick(FORMULAS);
      let name;
      if (f === 'A') name = L.a(pick(L.titles), base);
      else if (f === 'B') name = L.b(base, pick(L.adjs));
      else if (f === 'C') name = L.c(base, pick(L.elems));
      else if (f === 'E') {
        // Compuestos con sustantivos y elementos (Ironclaw, Garra de Hierro,
        // 铁爪): multiplica la variedad sin inventar vocabulario nuevo.
        const pool = L.nouns.concat(L.elems || []);
        const n1 = pick(pool);
        const rest = pool.filter(x => x !== n1);
        const n2 = rest.length ? pick(rest) : n1;
        name = L.e(n1, n2);
      } else name = compound();
      name = tidy(name);
      if (name && name.length <= 20) return cap(name);
    }
    return cap(compound());
  };

  HF.nameBanks = BANKS;   // expuesto para pruebas
})(typeof window !== 'undefined' ? window : globalThis);
