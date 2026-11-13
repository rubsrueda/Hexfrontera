/* ===========================================================================
 * replay-caster-langs.js — Banco de relato do Replay Audio Caster
 * ---------------------------------------------------------------------------
 * Catálogo obrigatorio de acontecementos dramáticos (13 idiomas):
 *   supply, expansion, keyPoints, siege, massacre, cityFall, rhythm, pyrrhic,
 *   finalSummary.
 *
 * Só texto interno para o motor de voz. NUNCA se pinta na pantalla.
 * Placeholders: {actor} {victim} {unit} {place} {turn} {gain} {key} {lost}
 *               {wcities} {lcities} {wgold} {wfood} {wwood}
 *               {lgold} {lfood} {lwood} {wunits} {lunits}
 * =========================================================================== */
(function (G) {
  const HF = G.HF = G.HF || {};

  const TAGS = {
    es: 'es-ES', en: 'en-US', zh: 'zh-CN', hi: 'hi-IN', fr: 'fr-FR',
    ar: 'ar-SA', bn: 'bn-BD', pt: 'pt-BR', ru: 'ru-RU', de: 'de-DE',
    ja: 'ja-JP', ko: 'ko-KR', it: 'it-IT'
  };

  const UNITS = {
    es: { INF: 'Infantería', ENG: 'Ingeniero', ARC: 'Arquero', CAB: 'Caballería', SIE: 'Asedio', BAR: 'Barco' },
    en: { INF: 'Infantry', ENG: 'Engineer', ARC: 'Archer', CAB: 'Cavalry', SIE: 'Siege', BAR: 'Ship' },
    zh: { INF: '步兵', ENG: '工程师', ARC: '弓箭手', CAB: '骑兵', SIE: '攻城器', BAR: '战船' },
    hi: { INF: 'पैदल सेना', ENG: 'इंजीनियर', ARC: 'धनुर्धर', CAB: 'घुड़सवार', SIE: 'घेराबंदी', BAR: 'जहाज़' },
    fr: { INF: 'Infanterie', ENG: 'Ingénieur', ARC: 'Archer', CAB: 'Cavalerie', SIE: 'Siège', BAR: 'Navire' },
    ar: { INF: 'مشاة', ENG: 'مهندس', ARC: 'رامي', CAB: 'فرسان', SIE: 'حصار', BAR: 'سفينة' },
    bn: { INF: 'পদাতিক', ENG: 'প্রকৌশলী', ARC: 'তীরন্দাজ', CAB: 'অশ্বারোহী', SIE: 'অবরোধ', BAR: 'জাহাজ' },
    pt: { INF: 'Infantaria', ENG: 'Engenheiro', ARC: 'Arqueiro', CAB: 'Cavalaria', SIE: 'Cerco', BAR: 'Navio' },
    ru: { INF: 'Пехота', ENG: 'Инженер', ARC: 'Лучник', CAB: 'Кавалерия', SIE: 'Осада', BAR: 'Корабль' },
    de: { INF: 'Infanterie', ENG: 'Pionier', ARC: 'Bogenschütze', CAB: 'Kavallerie', SIE: 'Belagerung', BAR: 'Schiff' },
    ja: { INF: '歩兵', ENG: '工兵', ARC: '弓兵', CAB: '騎兵', SIE: '攻城兵器', BAR: '船' },
    ko: { INF: '보병', ENG: '공병', ARC: '궁수', CAB: '기병', SIE: '공성', BAR: '배' },
    it: { INF: 'Fanteria', ENG: 'Geniere', ARC: 'Arciere', CAB: 'Cavalleria', SIE: 'Assedio', BAR: 'Nave' }
  };

  const NEUTRAL = {
    es: 'territorio neutral', en: 'neutral ground', zh: '中立地带', hi: 'तटस्थ इलाका',
    fr: 'terrain neutre', ar: 'أرض محايدة', bn: 'নিরপেক্ষ ভূমি', pt: 'terreno neutro',
    ru: 'нейтральная земля', de: 'neutrales Land', ja: '中立地帯', ko: '중립 지역', it: 'terreno neutrale'
  };

  const PLACES = {
    es: { capital: 'la capital', city: 'la ciudad', bastion: 'el bastión' },
    en: { capital: 'the capital', city: 'the city', bastion: 'the bastion' },
    zh: { capital: '首都', city: '城市', bastion: '堡垒' },
    hi: { capital: 'राजधानी', city: 'शहर', bastion: 'बस्तियन' },
    fr: { capital: 'la capitale', city: 'la ville', bastion: 'le bastion' },
    ar: { capital: 'العاصمة', city: 'المدينة', bastion: 'الحصن' },
    bn: { capital: 'রাজধানী', city: 'শহর', bastion: 'দুর্গ' },
    pt: { capital: 'a capital', city: 'a cidade', bastion: 'o bastião' },
    ru: { capital: 'столицу', city: 'город', bastion: 'бастион' },
    de: { capital: 'die Hauptstadt', city: 'die Stadt', bastion: 'die Bastion' },
    ja: { capital: '首都', city: '都市', bastion: '要塞' },
    ko: { capital: '수도', city: '도시', bastion: '요새' },
    it: { capital: 'la capitale', city: 'la città', bastion: 'il bastione' }
  };

  const STYLE = {
    supply: { rate: 1.08, pitch: 1.12 },
    expansion: { rate: 1.15, pitch: 1.2 },
    keyPoints: { rate: 1.1, pitch: 1.15 },
    siege: { rate: 1.18, pitch: 1.25 },
   massacre: { rate: 1.25, pitch: 1.3 },
    rhythm: { rate: 1.2, pitch: 1.25 },
    pyrrhic: { rate: 1.0, pitch: 1.05 },
    finalSummary: { rate: 1.12, pitch: 1.2 }
  };

  const BANK = {
    es: {
      supply: ['¡Números rojos para {victim}! ¡Se le corta el suministro y el vestuario está en llamas!'],
      expansion: ['¡{actor} se expande como un vendaval! {gain} hexágonos ganados; al cierre del turno suma {hexes} hexágonos y {recursos} recursos ({gold} de oro, {food} de trigo, {wood} de madera), con {cities} ciudades y {units} tropas; el turno deja {perdidas} bajas.'],
      keyPoints: ['¡{actor} pone la directa sobre los recursos! {key} puntos clave bajo control: oro y madera para rato.'],
      siege: ['¡Ratonera! ¡{unit} de {victim} queda rodeada y sin salida! ¡No hay por dónde escapar!'],
      massacre: ['¡Masacre! ¡{unit} de {victim} desaparece del tablero! ¡{actor} no deja ni las cenizas!'],
      cityFall: ['¡{actor} toma {place} de {victim}! ¡La defensa se parte por la mitad!'],
      rhythm: ['¡Cambio de ritmo! {actor} aguantó y ahora lanza el contragolpe: {gain} hexágonos de golpe. ¡Se acabó la defensa pasiva!'],
      pyrrhic: ['¡Victoria pírrica para {actor}! Gana terreno, pero pierde {lost} unidades por el camino. ¡Triunfo con sabor amargo!'],
      finalSummary: ['¡Silbatazo final! La repetición termina en el turno {turn}. {actor}: {wcities} ciudades, {wgold} de oro, {wfood} de trigo, {wwood} de madera y {wunits} tropas. {victim}: {lcities} ciudades, {lgold} de oro, {lfood} de trigo, {lwood} de madera y {lunits} tropas. ¡Un cierre de campeonato!']
    },
    en: {
      supply: ['Red numbers for {victim}! The supply line is cut and the locker room is on fire!'],
      expansion: ['{actor} expands like a storm! {gain} hexes gained; at the close of the turn they hold {hexes} hexes and {recursos} resources ({gold} gold, {food} food, {wood} wood), with {cities} cities and {units} troops; the turn leaves {perdidas} casualties.'],
      keyPoints: ['{actor} locks down the resources! {key} key points under control: gold and timber for days.'],
      siege: ['Mousetrap! {victim}’s {unit} is surrounded with no way out! There’s no escape!'],
      massacre: ['Massacre! {victim}’s {unit} is wiped off the board! {actor} leaves nothing behind!'],
      cityFall: ['{actor} takes {place} of {victim}! The defense splits wide open!'],
      rhythm: ['Change of rhythm! {actor} absorbed the pressure and now launches the counterattack: {gain} hexes at once! The passive defense is over!'],
      pyrrhic: ['A pyrrhic victory for {actor}! They gain ground but lose {lost} units along the way. A bitter win!'],
      finalSummary: ['Final whistle! The replay ends in turn {turn}. {actor}: {wcities} cities, {wgold} gold, {wfood} food, {wwood} wood and {wunits} troops. {victim}: {lcities} cities, {lgold} gold, {lfood} food, {lwood} wood and {lunits} troops. What a finish!']
    },
    zh: {
      supply: ['{victim} 出现赤字！补给线被切断，更衣室炸锅了！'],
      expansion: ['{actor} 如风暴般扩张！一回合拿下 {gain} 个格子；回合结束时控制 {hexes} 个格子、{recursos} 资源（{gold} 黄金、{food} 粮食、{wood} 木材），以及 {cities} 座城市和 {units} 支部队；本回合共有 {perdidas} 伤亡。'],
      keyPoints: ['{actor} 牢牢控制资源！{key} 个关键点在手：黄金和木材源源不断。'],
      siege: ['陷阱！{victim} 的{unit}被团团围住，无路可逃！'],
      massacre: ['屠杀！{victim} 的{unit}被彻底抹去！{actor} 不留活口！'],
      cityFall: ['{actor} 攻陷 {victim} 的{place}！防线彻底崩溃！'],
      rhythm: ['节奏突变！{actor} 顶住压力后突然反击：一口气拿下 {gain} 个格子！被动防守结束！'],
      pyrrhic: ['{actor} 的惨胜！拿下了地盘，却损失了 {lost} 支部队。苦胜！'],
      finalSummary: ['终场哨响！回放在第 {turn} 回合结束。{actor}：{wcities} 座城市、{wgold} 黄金、{wfood} 粮食、{wwood} 木材、{wunits} 支部队。{victim}：{lcities} 座城市、{lgold} 黄金、{lfood} 粮食、{lwood} 木材、{lunits} 支部队。完美收官！']
    },
    hi: {
      supply: ['{victim} के खाते में लाल आँकड़े! आपूर्ति कट गई और ड्रेसिंग रूम में आग लगी है!'],
      expansion: ['{actor} तूफान की तरह फैलता है! एक ही दौर में {gain} खाने जीते; दौर के अंत में {hexes} खाने और {recursos} संसाधन ({gold} सोना, {food} भोजन, {wood} लकड़ी), {cities} शहर और {units} सैनिक हैं; इस दौर में {perdidas} हताहत।'],
      keyPoints: ['{actor} संसाधनों पर कब्जा करता है! {key} प्रमुख बिंदु नियंत्रण में: सोना और लकड़ी।'],
      siege: ['चूहेदानी! {victim} की {unit} घिर गई, कोई रास्ता नहीं!'],
      massacre: ['नरसंहार! {victim} की {unit} मिटा दी गई! {actor} कुछ नहीं छोड़ता!'],
      cityFall: ['{actor} ने {victim} का {place} ले लिया! रक्षा टूट गई!'],
      rhythm: ['लय बदली! {actor} ने दबाव झेला और अचानक पलटवार किया: एक साथ {gain} खाने!'],
      pyrrhic: ['{actor} की पायरस जीत! जमीन मिली, पर {lost} इकाइयाँ गईं। कड़वी जीत!'],
      finalSummary: ['अंतिम सीटी! रिप्ले {turn}वें दौर में खत्म। {actor}: {wcities} शहर, {wgold} सोना, {wfood} भोजन, {wwood} लकड़ी, {wunits} सैनिक। {victim}: {lcities} शहर, {lgold} सोना, {lfood} भोजन, {lwood} लकड़ी, {lunits} सैनिक। शानदार समापन!']
    },
    fr: {
      supply: ['Les comptes sont dans le rouge pour {victim} ! La ligne d’approvisionnement est coupée et le vestiaire est en feu !'],
      expansion: ['{actor} se déploie comme une tempête ! {gain} hexagones gagnés ; à la fin du tour, il contrôle {hexes} hexagones et {recursos} ressources ({gold} or, {food} nourriture, {wood} bois), avec {cities} villes et {units} troupes ; le tour laisse {perdidas} pertes.'],
      keyPoints: ['{actor} verrouille les ressources ! {key} points clés contrôlés : or et bois en abondance.'],
      siege: ['Souricière ! La {unit} de {victim} est encerclée, aucune issue !'],
      massacre: ['Massacre ! La {unit} de {victim} est rayée du plateau ! {actor} ne laisse rien !'],
      cityFall: ['{actor} prend {place} de {victim} ! La défense vole en éclats !'],
      rhythm: ['Changement de rythme ! {actor} a encaissé puis lance la contre-attaque : {gain} hexagones d’un coup !'],
      pyrrhic: ['Victoire à la Pyrrhus pour {actor} ! Ils gagnent du terrain mais perdent {lost} unités. Un goût amer !'],
      finalSummary: ['Coup de sifflet final ! La rediffusion se termine au tour {turn}. {actor} : {wcities} villes, {wgold} or, {wfood} nourriture, {wwood} bois et {wunits} troupes. {victim} : {lcities} villes, {lgold} or, {lfood} nourriture, {lwood} bois et {lunits} troupes. Quelle fin !']
    },
    ar: {
      supply: ['أرقام حمراء لـ {victim}! خط الإمداد مقطوع وغرفة الملابس مشتعلة!'],
      expansion: ['{actor} يتوسع كالعاصفة! {gain} خانات في جولة واحدة؛ وفي نهاية الجولة يسيطر على {hexes} خانة و{recursos} موارد ({gold} ذهب، {food} طعام، {wood} خشب)، مع {cities} مدن و{units} جندي؛ الجولة تخلف {perdidas} خسائر.'],
      keyPoints: ['{actor} يسيطر على الموارد! {key} نقاط رئيسية تحت السيطرة: ذهب وخشب.'],
      siege: ['فخ! {unit} {victim} محاصرة بلا مخرج!'],
      massacre: ['مذبحة! {unit} {victim} تُمحى من اللوحة! {actor} لا يترك أثرًا!'],
      cityFall: ['{actor} يأخذ {place} من {victim}! الدفاع انشق!'],
      rhythm: ['تغيّر الإيقاع! {actor} صمد ثم شن الهجوم المضاد: {gain} خانات دفعة واحدة!'],
      pyrrhic: ['انتصار باهظ لـ {actor}! يكسب الأرض لكنه يخسر {lost} وحدات. فوز مرّ!'],
      finalSummary: ['صافرة النهاية! تنتهي الإعادة في الجولة {turn}. {actor}: {wcities} مدن، {wgold} ذهب، {wfood} طعام، {wwood} خشب، {wunits} جندي. {victim}: {lcities} مدن، {lgold} ذهب، {lfood} طعام، {lwood} خشب، {lunits} جندي. ختام رائع!']
    },
    bn: {
      supply: ['{victim}-এর হিসাবে লাল অঙ্ক! সরবরাহ লাইন কাটা, ড্রেসিং রুমে আগুন!'],
      expansion: ['{actor} ঝড়ের মতো ছড়িয়ে পড়ে! এক রাউন্ডে {gain} ঘর দখল; রাউন্ড শেষে {hexes} ঘর ও {recursos} সম্পদ ({gold} সোনা, {food} খাদ্য, {wood} কাঠ), {cities} শহর এবং {units} সৈন্য নিয়ন্ত্রণে; এই রাউন্ডে {perdidas} হতাহত।'],
      keyPoints: ['{actor} সম্পদ দখল করে! {key} মূল পয়েন্ট নিয়ন্ত্রণে: সোনা ও কাঠ।'],
      siege: ['ফাঁদ! {victim}-এর {unit} ঘেরাও, কোনো পথ নেই!'],
      massacre: ['নিধন! {victim}-এর {unit} মাঠ থেকে মুছে গেল! {actor} কিছুই রাখল না!'],
      cityFall: ['{actor} {victim}-এর {place} নিল! রক্ষণ ভেঙে পড়ল!'],
      rhythm: ['গতির পরিবর্তন! {actor} চাপ সামলে হঠাৎ পাল্টা আক্রমণ: একসাথে {gain} ঘর!'],
      pyrrhic: ['{actor}-এর পাইরিক জয়! জমি পেল, কিন্তু {lost} ইউনিট হারাল। তিক্ত জয়!'],
      finalSummary: ['শেষ বাঁশি! রিপ্লে {turn}তম রাউন্ডে শেষ। {actor}: {wcities} শহর, {wgold} সোনা, {wfood} খাদ্য, {wwood} কাঠ, {wunits} সৈন্য। {victim}: {lcities} শহর, {lgold} সোনা, {lfood} খাদ্য, {lwood} কাঠ, {lunits} সৈন্য। দারুণ সমাপ্তি!']
    },
    pt: {
      supply: ['Números vermelhos para {victim}! A linha de suprimentos foi cortada e o vestiário está pegando fogo!'],
      expansion: ['{actor} se expande como uma tempestade! {gain} hexágonos ganhos; ao fechar o turno controla {hexes} hexágonos e {recursos} recursos ({gold} de ouro, {food} de comida, {wood} de madeira), com {cities} cidades e {units} tropas; o turno deixa {perdidas} baixas.'],
      keyPoints: ['{actor} domina os recursos! {key} pontos-chave sob controle: ouro e madeira.'],
      siege: ['Ratoeira! A {unit} de {victim} está cercada sem saída!'],
      massacre: ['Massacre! A {unit} de {victim} some do tabuleiro! {actor} não deixa nada!'],
      cityFall: ['{actor} toma {place} de {victim}! A defesa se abre!'],
      rhythm: ['Mudança de ritmo! {actor} segurou a pressão e agora lança o contra-ataque: {gain} hexágonos de uma vez!'],
      pyrrhic: ['Vitória pírrica para {actor}! Ganham terreno, mas perdem {lost} unidades. Um triunfo amargo!'],
      finalSummary: ['Apito final! A repetição termina no turno {turn}. {actor}: {wcities} cidades, {wgold} de ouro, {wfood} de comida, {wwood} de madeira e {wunits} tropas. {victim}: {lcities} cidades, {lgold} de ouro, {lfood} de comida, {lwood} de madeira e {lunits} tropas. Que final!']
    },
    ru: {
      supply: ['Красные цифры у {victim}! Линия снабжения перерезана, раздевалка в огне!'],
      expansion: ['{actor} расширяется как ураган! {gain} гексов за ход; к концу хода под контролем {hexes} гексов и {recursos} ресурсов ({gold} золота, {food} еды, {wood} дерева), а также {cities} городов и {units} войск; за ход {perdidas} потерь.'],
      keyPoints: ['{actor} берёт ресурсы под контроль! {key} ключевых точек: золото и древесина.'],
      siege: ['Мышеловка! {unit} {victim} в окружении, выхода нет!'],
      massacre: ['Резня! {unit} {victim} стирается с поля! {actor} не оставляет следов!'],
      cityFall: ['{actor} берёт {place} {victim}! Оборона трещит по швам!'],
      rhythm: ['Смена ритма! {actor} выдержал давление и бросается в контратаку: {gain} гексов разом!'],
      pyrrhic: ['Пиррова победа {actor}! Земля взята, но потеряно {lost} юнитов. Горький триумф!'],
      finalSummary: ['Финальный свисток! Повтор заканчивается на {turn}-м ходу. {actor}: {wcities} городов, {wgold} золота, {wfood} еды, {wwood} дерева, {wunits} войск. {victim}: {lcities} городов, {lgold} золота, {lfood} еды, {lwood} дерева, {lunits} войск. Отличный финал!']
    },
    de: {
      supply: ['Rote Zahlen für {victim}! Die Versorgungslinie ist gekappt, die Kabine brennt!'],
      expansion: ['{actor} breitet sich wie ein Sturm aus! {gain} Felder gewonnen; zum Rundenende kontrolliert er {hexes} Felder und {recursos} Ressourcen ({gold} Gold, {food} Nahrung, {wood} Holz), dazu {cities} Städte und {units} Truppen; die Runde fordert {perdidas} Verluste.'],
      keyPoints: ['{actor} sichert die Ressourcen! {key} Schlüsselpunkte unter Kontrolle: Gold und Holz.'],
      siege: ['Mausefalle! Die {unit} von {victim} ist eingekreist, kein Ausweg!'],
      massacre: ['Massaker! Die {unit} von {victim} wird vom Feld gefegt! {actor} lässt nichts übrig!'],
      cityFall: ['{actor} nimmt {place} von {victim}! Die Abwehr bricht auseinander!'],
      rhythm: ['Rhythmuswechsel! {actor} hielt den Druck aus und startet den Konter: {gain} Felder auf einmal!'],
      pyrrhic: ['Ein Pyrrhussieg für {actor}! Land gewonnen, aber {lost} Einheiten verloren. Ein bitterer Sieg!'],
      finalSummary: ['Schlusspfiff! Das Replay endet in Runde {turn}. {actor}: {wcities} Städte, {wgold} Gold, {wfood} Nahrung, {wwood} Holz und {wunits} Truppen. {victim}: {lcities} Städte, {lgold} Gold, {lfood} Nahrung, {lwood} Holz und {lunits} Truppen. Was für ein Finish!']
    },
    ja: {
      supply: ['{victim} に赤字！補給線が断たれ、ロッカールームは大炎上！'],
      expansion: ['{actor} が嵐のように拡大！1ターンで {gain} マスを獲得；ターン終了時点で {hexes} マスと {recursos} 資源（金 {gold}、食料 {food}、木材 {wood}）、{cities} 都市、{units} 部隊を保持；このターンで {perdidas} の損害。'],
      keyPoints: ['{actor} が資源を確保！{key} の重要地点を掌握：金と木材。'],
      siege: ['わなだ！{victim} の{unit}が包囲され、逃げ道がない！'],
      massacre: ['大虐殺！{victim} の{unit}が盤上から消えた！{actor} は何も残さない！'],
      cityFall: ['{actor} が {victim} の{place}を奪取！守備が崩壊！'],
      rhythm: ['リズムチェンジ！{actor} が耐えてから反撃に転じ、一気に {gain} マスを奪取！'],
      pyrrhic: ['{actor} のピュロスの勝利！土地は得たが {lost} 部隊を失った。苦い勝利だ！'],
      finalSummary: ['試合終了！リプレイは {turn} ターンで終了。{actor}：都市 {wcities}、金 {wgold}、食料 {wfood}、木材 {wwood}、部隊 {wunits}。{victim}：都市 {lcities}、金 {lgold}、食料 {lfood}、木材 {lwood}、部隊 {lunits}。最高の幕切れ！']
    },
    ko: {
      supply: ['{victim}의 숫자가 빨갛습니다! 보급선이 끊겼고 라커룸이 불타고 있습니다!'],
      expansion: ['{actor}가 폭풍처럼 확장합니다! 한 턴에 {gain}칸을 얻고, 턴 종료 시 {hexes}칸과 {recursos} 자원(금 {gold}, 식량 {food}, 목재 {wood}), {cities}개 도시, 병력 {units}을 보유합니다; 이번 턴 {perdidas}명의 사상자.'],
      keyPoints: ['{actor}가 자원을 장악합니다! {key}개의 핵심 거점 확보: 금과 목재.'],
      siege: ['덫! {victim}의 {unit}이 포위되어 탈출구가 없습니다!'],
      massacre: ['대학살! {victim}의 {unit}이 보드에서 사라집니다! {actor}는 아무것도 남기지 않습니다!'],
      cityFall: ['{actor}가 {victim}의 {place}을 차지합니다! 수비가 무너집니다!'],
      rhythm: ['리듬 변화! {actor}가 버티다가 반격에 나섭니다: 한 번에 {gain}칸!'],
      pyrrhic: ['{actor}의 피로스의 승리! 땅은 얻었지만 {lost}개 부대를 잃었습니다. 쓴 승리!'],
      finalSummary: ['경기 종료! 리플레이는 {turn}턴에 끝납니다. {actor}: 도시 {wcities}, 금 {wgold}, 식량 {wfood}, 목재 {wwood}, 병력 {wunits}. {victim}: 도시 {lcities}, 금 {lgold}, 식량 {lfood}, 목재 {lwood}, 병력 {lunits}. 멋진 마무리!']
    },
    it: {
      supply: ['Numeri in rosso per {victim}! La linea di rifornimento è tagliata e lo spogliatoio è in fiamme!'],
      expansion: ['{actor} si espande come una tempesta! {gain} esagoni conquistati; a fine turno controlla {hexes} esagoni e {recursos} risorse ({gold} oro, {food} cibo, {wood} legno), con {cities} città e {units} truppe; il turno costa {perdidas} perdite.'],
      keyPoints: ['{actor} mette le mani sulle risorse! {key} punti chiave sotto controllo: oro e legname.'],
      siege: ['Trappola! La {unit} di {victim} è circondata, nessuna via d’uscita!'],
      massacre: ['Massacro! La {unit} di {victim} sparisce dal tabellone! {actor} non lascia nulla!'],
      cityFall: ['{actor} conquista {place} di {victim}! La difesa si spacca!'],
      rhythm: ['Cambio di ritmo! {actor} ha resistito e ora lancia il contropiede: {gain} esagoni in un colpo!'],
      pyrrhic: ['Vittoria di Pirro per {actor}! Guadagnano terreno ma perdono {lost} unità. Un trionfo amaro!'],
      finalSummary: ['Fischio finale! Il replay termina al turno {turn}. {actor}: {wcities} città, {wgold} oro, {wfood} cibo, {wwood} legno e {wunits} truppe. {victim}: {lcities} città, {lgold} oro, {lfood} cibo, {lwood} legno e {lunits} truppe. Che finale!']
    }
  };

  HF.REPLAY_CASTER_LANGS = { TAGS, UNITS, NEUTRAL, PLACES, STYLE, BANK };
})(typeof window !== 'undefined' ? window : globalThis);
