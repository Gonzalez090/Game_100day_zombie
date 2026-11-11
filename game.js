// ============================================================
//  game.js — ตรรกะหลักของเกม "100 วันรอดซอมบี้"
//  ขั้นที่ 1: หน้าจอ, ค่าสถานะ, สุ่มตัวละคร, บันทึกตัวละคร, เลือกภาษาไทย/อังกฤษ
//  ขั้นที่ 2: ของ กระเป๋า และการหาของตอนเช้า
//  ขั้นที่ 3: กลางคืน (ซอมบี้บุก) สรุปวัน และบันทึกสาเหตุที่พลังชีวิตลด
//  ค่าตั้งค่าอยู่ใน config.js / รายชื่ออยู่ใน names.js / ข้อความหน้าจออยู่ใน lang.js
// ============================================================
'use strict';

// ------------------------------------------------------------
// 0) ภาษา
// ------------------------------------------------------------
const STORAGE_KEY_LANGUAGE = 'zombie100.language';
let currentLanguage = loadLanguage();

// โหลดภาษาที่เลือกไว้ (ไม่มีหรืออ่านไม่ได้ = ภาษาไทย)
function loadLanguage() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_LANGUAGE);
    return TEXT[saved] ? saved : DEFAULT_LANGUAGE;
  } catch (error) {
    return DEFAULT_LANGUAGE;
  }
}

function saveLanguage(language) {
  try {
    localStorage.setItem(STORAGE_KEY_LANGUAGE, language);
  } catch (error) {
    console.warn('[ภาษา] บันทึกภาษาที่เลือกไม่ได้', error);
  }
}

// ข้อความหน้าจอจาก lang.js เช่น t('dayCounter', 3, 100) → "วันที่ 3 / 100"
function t(key, ...args) {
  const entry = TEXT[currentLanguage][key] ?? TEXT[DEFAULT_LANGUAGE][key];
  if (entry === undefined) {
    console.warn('[ภาษา] ไม่มีข้อความ', key);
    return key;
  }
  return typeof entry === 'function' ? entry(...args) : entry;
}

// ข้อความของข้อมูลเกมตามภาษา เช่น tr(trait, 'name') → "ใจเย็น" หรือ "Calm"
// (ถ้ายังไม่มีคำแปลจะใช้ภาษาไทย)
function tr(entry, field) {
  return entry[currentLanguage]?.[field] ?? entry[field];
}

// ------------------------------------------------------------
// 1) ฟังก์ชันสุ่มพื้นฐาน
// ------------------------------------------------------------

// สุ่มจำนวนเต็มตั้งแต่ min ถึง max (รวมทั้งสองค่า)
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// หยิบ 1 ตัวจากรายการ (โอกาสเท่ากันทุกตัว)
function pickRandom(list) {
  return list[Math.floor(Math.random() * list.length)];
}

// หยิบ 1 ตัวตามน้ำหนัก (weight มาก = ออกบ่อย, ไม่ใส่ weight = 1)
function pickWeighted(list) {
  const totalWeight = list.reduce((sum, item) => sum + (item.weight ?? 1), 0);
  let roll = Math.random() * totalWeight;
  for (const item of list) {
    roll -= item.weight ?? 1;
    if (roll < 0) return item;
  }
  return list[list.length - 1];
}

// หยิบ count ตัวแบบไม่ซ้ำกัน
function pickUnique(list, count) {
  const pool = [...list];
  const picked = [];
  while (picked.length < count && pool.length > 0) {
    const index = Math.floor(Math.random() * pool.length);
    picked.push(pool.splice(index, 1)[0]);
  }
  return picked;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

// ------------------------------------------------------------
// 2) ค้นข้อมูลจาก config และสร้างคำบรรยาย
// ------------------------------------------------------------
function findById(list, id) {
  return list.find(item => item.id === id);
}

function getOccupation(id) {
  return findById(CONFIG.occupations, id);
}

function getTrait(id) {
  return findById(CONFIG.traits, id);
}

function getAgeGroup(age) {
  return CONFIG.ageGroups.find(group => age >= group.minAge && age <= group.maxAge);
}

// ชื่ออาชีพตามเพศและภาษา เช่น พ่อครัว / แม่ครัว / Cook
function getOccupationName(occupation, gender) {
  const femaleName = currentLanguage === DEFAULT_LANGUAGE
    ? occupation.nameFemale
    : occupation[currentLanguage]?.nameFemale;
  return gender === 'female' && femaleName ? femaleName : tr(occupation, 'name');
}

// ชื่อตัวละครตามภาษา (เซฟเก็บชื่อไทย ภาษาอื่นหาคำอ่านจาก names.js)
function getDisplayName(character) {
  if (currentLanguage === DEFAULT_LANGUAGE) return character.name;
  const entry = (NAMES[character.gender] ?? []).find(name => name.th === character.name);
  return entry?.[currentLanguage] ?? character.name;
}

// สรุปตัวละครบรรทัดเดียว เช่น "สมชาย อายุ 32 อดีตพยาบาล ใจเย็น/ขี้เหนียว"
function describeCharacter(character) {
  const occupation = getOccupation(character.occupationId);
  const traitNames = character.traitIds.map(id => tr(getTrait(id), 'name')).join('/');
  return t('characterSummary', getDisplayName(character), character.age,
    getOccupationName(occupation, character.gender), traitNames);
}

// คำบรรยายรูปลักษณ์ เช่น ["ผิวสองสี", "ผมสั้นเรียบสีดำ", "รูปร่างปกติ", "เสื้อสีแดง"]
function describeLook(look) {
  const options = CONFIG.appearance;
  const nameOf = (list, id) => tr(findById(list, id), 'name');
  return [
    nameOf(options.skinTones, look.skin),
    t('lookHair', nameOf(options.hairStyles, look.hairStyle), nameOf(options.hairColors, look.hairColor)),
    t('lookBody', nameOf(options.bodyTypes, look.body)),
    t('lookShirt', nameOf(options.shirtColors, look.shirt)),
    // ของประกอบ (แว่น/หนวดเครา) ใส่เฉพาะที่มี — เซฟเก่าที่ไม่มีช่องนี้ถือว่าไม่มี
    ...[findById(options.glasses, look.glasses), findById(options.facialHair, look.facialHair)]
      .filter(item => item && item.id !== 'none')
      .map(item => tr(item, 'name')),
  ];
}

// ------------------------------------------------------------
// 3) สุ่มตัวละคร (แยกเป็นส่วนย่อย ๆ)
// ------------------------------------------------------------

// เพศ: ชาย/หญิง ครึ่งต่อครึ่ง
function rollGender() {
  return Math.random() < 0.5 ? 'male' : 'female';
}

// ชื่อ: สุ่มจากรายชื่อของเพศนั้นใน names.js (เก็บเป็นชื่อไทย)
function rollName(gender) {
  return pickRandom(NAMES[gender]).th;
}

// อาชีพ: ทุกอาชีพมีโอกาสเท่ากัน
function rollOccupation() {
  return pickRandom(CONFIG.occupations);
}

// อายุ: 18-45 ปี แต่ถ้าอาชีพจำกัดอายุไว้ (เช่น นักเรียน) จะสุ่มในช่วงของอาชีพนั้น
function rollAge(occupation) {
  const min = Math.max(CONFIG.age.min, occupation.minAge ?? CONFIG.age.min);
  const max = Math.min(CONFIG.age.max, occupation.maxAge ?? CONFIG.age.max);
  return randomInt(min, max);
}

// นิสัย: สุ่มแบบไม่ซ้ำกัน (เรื่องนิสัยขัดกันไปเช็กใน findBalanceProblems)
function rollTraitIds() {
  return pickUnique(CONFIG.traits, CONFIG.traitCount).map(trait => trait.id);
}

// รูปลักษณ์: หยิบจากชุดตัวเลือกสำเร็จรูปมาประกอบกัน (ทรงผมเลือกตามเพศ)
function rollLook(gender) {
  const options = CONFIG.appearance;
  const hairStylesForGender = options.hairStyles.filter(style => style.genders.includes(gender));
  return {
    skin: pickWeighted(options.skinTones).id,
    hairStyle: pickWeighted(hairStylesForGender).id,
    hairColor: pickWeighted(options.hairColors).id,
    body: pickWeighted(options.bodyTypes).id,
    shirt: pickWeighted(options.shirtColors).id,
    glasses: pickWeighted(options.glasses).id,
    facialHair: pickWeighted(options.facialHair.filter(item => item.genders.includes(gender))).id,
  };
}

// สุ่มตัวละคร 1 ตัว (ยังไม่เช็กความสมดุล)
function rollCharacter() {
  const gender = rollGender();
  const occupation = rollOccupation();
  return {
    gender,
    name: rollName(gender),
    age: rollAge(occupation),
    occupationId: occupation.id,
    traitIds: rollTraitIds(),
    look: rollLook(gender),
  };
}

// บันทึกการสุ่มครั้งล่าสุด (พิมพ์ lastGeneration ใน Console เพื่อดูว่ากฎสมดุลตัดชุดไหนทิ้ง)
let lastGeneration = { attempts: 0, rejected: [] };

// สุ่มซ้ำจนได้ตัวละครที่ผ่านกฎความสมดุลทุกข้อ
function generateCharacter() {
  lastGeneration = { attempts: 0, rejected: [] };
  let leastBad = null;
  for (let attempt = 1; attempt <= CONFIG.balance.maxRollAttempts; attempt++) {
    const character = rollCharacter();
    const problems = findBalanceProblems(character);
    lastGeneration.attempts = attempt;
    if (problems.length === 0) return character;
    lastGeneration.rejected.push({ character: describeCharacter(character), problems });
    if (!leastBad || problems.length < leastBad.problems.length) leastBad = { character, problems };
  }
  // ไม่ควรเกิดถ้า config ปกติ: เตือนใน Console แล้วใช้ตัวที่มีปัญหาน้อยที่สุด
  console.warn('[สมดุล] สุ่มไม่ผ่านกฎเลย ลองตรวจ CONFIG.balance', leastBad.problems);
  return leastBad.character;
}

// ------------------------------------------------------------
// 4) รวมผลจาก อายุ + อาชีพ + นิสัย แล้วคำนวณค่าเริ่มต้น
// ------------------------------------------------------------

// แหล่งที่มาของผลทั้งหมด (ใช้ทั้งคำนวณ เช็กสมดุล และแสดงที่มาของตัวเลข)
function getModSources(character) {
  const ageGroup = getAgeGroup(character.age);
  const occupation = getOccupation(character.occupationId);
  const traits = character.traitIds.map(id => getTrait(id));
  return [
    { kind: 'age', name: tr(ageGroup, 'name'), mods: ageGroup.mods },
    { kind: 'occupation', name: getOccupationName(occupation, character.gender), mods: occupation.mods },
    ...traits.map(trait => ({ kind: 'trait', name: tr(trait, 'name'), mods: trait.mods })),
  ];
}

// รวมผลชนิดเดียวกันจากทุกแหล่ง (บวกกันตรง ๆ)
function sumMods(sources) {
  const total = {};
  for (const source of sources) {
    for (const [key, value] of Object.entries(source.mods)) {
      total[key] = (total[key] ?? 0) + value;
    }
  }
  return total;
}

// กันพลาด: ผลแบบ % ที่รวมแล้วต้องไม่เกิน ±modPercentLimit
function limitPercentMods(mods) {
  const limit = CONFIG.balance.modPercentLimit;
  const limited = {};
  for (const [key, value] of Object.entries(mods)) {
    limited[key] = MOD_INFO[key]?.unit === '%' ? clamp(value, -limit, limit) : value;
  }
  return limited;
}

// ผลรวมสุดท้ายของตัวละคร เช่น { maxHp: 15, foodUse: 10, lootLuck: -5 }
function getCharacterMods(character) {
  return limitPercentMods(sumMods(getModSources(character)));
}

// สูตรค่าเริ่มต้น = ค่าพื้นฐานใน config + ผลรวมของตัวละคร แล้วตัดให้อยู่ในช่วง 0..ค่าสูงสุด
function calcStartingStats(character) {
  const mods = getCharacterMods(character);
  const base = CONFIG.stats;
  const bonus = key => mods[key] ?? 0;
  const maxHp = Math.max(1, base.hp.max + bonus('maxHp'));
  return {
    maxHp,
    hp:      clamp(base.hp.start + bonus('maxHp'), 1, maxHp), // เริ่มเกมพลังชีวิตเต็มตามค่าสูงสุดใหม่
    food:    clamp(base.food.start + bonus('food'), 0, base.food.max),
    water:   clamp(base.water.start + bonus('water'), 0, base.water.max),
    ammo:    clamp(base.ammo.start + bonus('ammo'), 0, base.ammo.max),
    fatigue: clamp(base.fatigue.start + bonus('fatigue'), 0, base.fatigue.max),
    stress:  clamp(base.stress.start + bonus('stress'), 0, base.stress.max),
  };
}

// ช่องเก็บของ = ค่าพื้นฐาน + ผลจากอาชีพ/นิสัย
function calcInventorySlots(character) {
  return CONFIG.inventory.baseSlots + (getCharacterMods(character).slots ?? 0);
}

// ค่าสูงสุดของค่าสถานะ (พลังชีวิตสูงสุดขึ้นกับตัวละคร)
function getStatMax(statKey, stats) {
  return statKey === 'hp' ? stats.maxHp : CONFIG.stats[statKey].max;
}

// ------------------------------------------------------------
// 5) กฎความสมดุล — คืนรายการปัญหาเป็นข้อความ (ว่าง = ผ่าน) ใช้ดูใน Console
// ------------------------------------------------------------
function findBalanceProblems(character) {
  return [
    ...findTraitConflicts(character),
    ...findStackedWeaknesses(character),
    ...findBadStartingStats(character),
  ];
}

// กฎ 1: นิสัยที่ขัดกันห้ามอยู่ด้วยกัน
function findTraitConflicts(character) {
  const traits = character.traitIds.map(id => getTrait(id));
  const problems = [];
  for (let i = 0; i < traits.length; i++) {
    for (let j = i + 1; j < traits.length; j++) {
      if (traitsConflict(traits[i], traits[j])) {
        problems.push(`นิสัยขัดกัน: ${traits[i].name} กับ ${traits[j].name}`);
      }
    }
  }
  return problems;
}

// เช็กทั้งสองทาง: a ห้ามคู่กับ b หรือ b ห้ามคู่กับ a
function traitsConflict(a, b) {
  return (a.conflicts ?? []).includes(b.id) || (b.conflicts ?? []).includes(a.id);
}

// ผลนี้เป็นข้อเสียไหม เช่น foodUse +10 = เสีย, maxHp -5 = เสีย
function isBadMod(key, value) {
  const info = MOD_INFO[key];
  if (!info || value === 0) return false;
  return info.better === 'up' ? value < 0 : value > 0;
}

// หมวดจุดอ่อนของแหล่งหนึ่ง (แหล่งเดียวนับหมวดละครั้ง)
function getWeakAreas(mods) {
  const areas = new Set();
  for (const [key, value] of Object.entries(mods)) {
    if (isBadMod(key, value)) areas.add(MOD_INFO[key].area);
  }
  return areas;
}

// กฎ 2: ข้อเสียหมวดเดียวกันซ้อนกันเกินคะแนนที่กำหนด
function findStackedWeaknesses(character) {
  const { weaknessScore, maxWeaknessScore } = CONFIG.balance;
  const areaScores = {};  // หมวด → คะแนนรวม
  const areaSources = {}; // หมวด → ชื่อแหล่งที่อ่อนหมวดนี้
  for (const source of getModSources(character)) {
    for (const area of getWeakAreas(source.mods)) {
      areaScores[area] = (areaScores[area] ?? 0) + weaknessScore[source.kind];
      if (!areaSources[area]) areaSources[area] = [];
      areaSources[area].push(source.name);
    }
  }
  return Object.keys(areaScores)
    .filter(area => areaScores[area] > maxWeaknessScore)
    .map(area => `ข้อเสียด้าน${AREA_NAMES[area]}ซ้อนกัน: ${areaSources[area].join(' + ')}`);
}

// กฎ 3: ค่าเริ่มต้นต้องไม่แย่เกินขีดที่กำหนด
function findBadStartingStats(character) {
  const stats = calcStartingStats(character);
  const problems = [];
  for (const [key, limit] of Object.entries(CONFIG.balance.startLimits)) {
    const label = key === 'maxHp' ? 'พลังชีวิตสูงสุด' : CONFIG.stats[key].name;
    if (limit.min !== undefined && stats[key] < limit.min) {
      problems.push(`${label}เริ่มต้นต่ำเกินไป (${stats[key]} ต่ำกว่า ${limit.min})`);
    }
    if (limit.max !== undefined && stats[key] > limit.max) {
      problems.push(`${label}เริ่มต้นสูงเกินไป (${stats[key]} เกิน ${limit.max})`);
    }
  }
  return problems;
}

// ------------------------------------------------------------
// 6) บันทึก/โหลดด้วย localStorage
//    zombie100.run = เกมที่กำลังเล่น (ขั้นนี้เก็บตัวละคร ความคืบหน้ารายวันจะเพิ่มในขั้นที่ 6)
// ------------------------------------------------------------
const STORAGE_KEY_RUN = 'zombie100.run';
const SAVE_VERSION = 1;
let hasWarnedBadSave = false;

// seed = เลขสุ่มประจำเกม (ใช้สุ่มภาพเมือง/สภาพอากาศของแต่ละวัน ให้แต่ละเกมไม่เหมือนกัน)
function saveRun(character, seed) {
  const data = { version: SAVE_VERSION, status: 'playing', character, seed, savedAt: Date.now() };
  try {
    localStorage.setItem(STORAGE_KEY_RUN, JSON.stringify(data));
    return true;
  } catch (error) {
    console.warn('[เซฟ] บันทึกลง localStorage ไม่ได้', error);
    return false;
  }
}

// โหลดเกมที่บันทึกไว้ ถ้าไม่มีหรือข้อมูลเสียจะคืน null
function loadRun() {
  let raw = null;
  try {
    raw = localStorage.getItem(STORAGE_KEY_RUN);
  } catch (error) {
    console.warn('[เซฟ] อ่าน localStorage ไม่ได้', error);
    return null;
  }
  if (!raw) return null;
  try {
    const run = JSON.parse(raw);
    if (isValidRun(run)) return run;
  } catch (error) {
    // JSON เสีย: ไปแจ้งเตือนด้านล่าง
  }
  if (!hasWarnedBadSave) {
    console.warn('[เซฟ] ข้อมูลเซฟเสียหายหรือไม่ตรงกับ config ปัจจุบัน จึงไม่นำมาใช้');
    hasWarnedBadSave = true;
  }
  return null;
}

// สุ่มเลขประจำเกมใหม่ (จำนวนเต็มบวก 32 บิต)
function createRunSeed() {
  return Math.floor(Math.random() * 0x100000000) >>> 0;
}

function clearRun() {
  try {
    localStorage.removeItem(STORAGE_KEY_RUN);
  } catch (error) {
    console.warn('[เซฟ] ลบเซฟไม่ได้', error);
  }
}

// เซฟใช้ได้ไหม (กันกรณีแก้ config แล้ว id ที่อยู่ในเซฟหายไป)
function isValidRun(run) {
  return Boolean(run) && run.version === SAVE_VERSION && run.status === 'playing' && isValidCharacter(run.character);
}

function isValidCharacter(character) {
  if (!character || typeof character !== 'object') return false;
  const { gender, name, age, occupationId, traitIds, look } = character;
  if (!CONFIG.genders[gender] || typeof name !== 'string' || name === '') return false;
  if (!Number.isInteger(age) || !getAgeGroup(age) || !getOccupation(occupationId)) return false;
  if (!Array.isArray(traitIds) || traitIds.length !== CONFIG.traitCount) return false;
  if (new Set(traitIds).size !== traitIds.length || !traitIds.every(id => getTrait(id))) return false;
  if (!look || typeof look !== 'object') return false;
  const options = CONFIG.appearance;
  return Boolean(
    findById(options.skinTones, look.skin)
    && findById(options.hairStyles, look.hairStyle)
    && findById(options.hairColors, look.hairColor)
    && findById(options.bodyTypes, look.body)
    && findById(options.shirtColors, look.shirt)
    && (look.glasses === undefined || findById(options.glasses, look.glasses))
    && (look.facialHair === undefined || findById(options.facialHair, look.facialHair)),
  );
}

// ------------------------------------------------------------
// 7) ตัวละครพิกเซลแบบครึ่งตัว 32x32 — แผนที่พิกเซลอยู่ใน sprites.js
//    วาดด้วย canvas ไปก่อนจนกว่าจะมีรูปจริงใน images/characters
// ------------------------------------------------------------

// แปลงสี #rrggbb ↔ [r, g, b]
function hexToRgb(hex) {
  const value = parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function rgbToHex(channels) {
  return '#' + channels.map(channel => clamp(Math.round(channel), 0, 255).toString(16).padStart(2, '0')).join('');
}

// ปรับสี: amount ติดลบ = เข้มขึ้น, บวก = สว่างขึ้น (เช่น -0.2 = เข้มขึ้น 20%)
function shadeColor(hex, amount) {
  return rgbToHex(hexToRgb(hex).map(channel => (amount < 0 ? channel * (1 + amount) : channel + (255 - channel) * amount)));
}

// ผสมสี a กับ b (amount 0 = สี a ล้วน, 1 = สี b ล้วน)
function mixColors(hexA, hexB, amount) {
  const b = hexToRgb(hexB);
  return rgbToHex(hexToRgb(hexA).map((channel, index) => channel + (b[index] - channel) * amount));
}

// สีโปร่งแสง (alpha 0-1)
function withAlpha(hex, alpha) {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// สีของภาพตัวละคร คำนวณจากผิว/ผม/เสื้อที่สุ่มได้ (ตัวอักษรตรงกับคำอธิบายใน sprites.js)
function buildPortraitPalette(look, gender) {
  const options = CONFIG.appearance;
  const skin = findById(options.skinTones, look.skin).color;
  const hair = findById(options.hairColors, look.hairColor).color;
  const shirt = findById(options.shirtColors, look.shirt).color;
  return {
    S: skin, s: shadeColor(skin, -0.14), l: shadeColor(skin, 0.14), K: shadeColor(skin, -0.58), n: shadeColor(skin, -0.28),
    M: gender === 'female' ? mixColors(skin, '#c2465a', 0.6) : mixColors(skin, '#6e2a2a', 0.65),
    r: 'rgba(222, 110, 120, 0.43)',
    W: '#f2eee6', E: options.eyeColor, b: shadeColor(hair, -0.2),
    H: hair, h: shadeColor(hair, -0.32), j: shadeColor(hair, 0.3), k: shadeColor(hair, -0.62),
    z: withAlpha(shadeColor(hair, -0.2), 0.37),
    T: shirt, t: shadeColor(shirt, -0.25), u: shadeColor(shirt, 0.15), q: shadeColor(shirt, -0.58), C: shadeColor(shirt, 0.32),
    G: '#1c1c22', g: 'rgba(200, 220, 255, 0.18)',
  };
}

// วาดแผนที่พิกเซลทีละจุด เริ่มที่แถว startRow
function drawPixelRows(ctx, rows, palette, startRow) {
  rows.forEach((row, rowIndex) => {
    for (let x = 0; x < row.length; x++) {
      const color = palette[row[x]];
      if (!color) continue; // '.' = โปร่งใส
      ctx.fillStyle = color;
      ctx.fillRect(x, startRow + rowIndex, 1, 1);
    }
  });
}

// วาดตัวละครลง canvas: ลำตัว → หน้า → ขนตา/แก้ม (หญิง) → หนวดเครา → ผม → แว่น
function drawCharacter(canvas, character) {
  const { look, gender } = character;
  canvas.width = PORTRAIT_SIZE;
  canvas.height = PORTRAIT_SIZE;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, PORTRAIT_SIZE, PORTRAIT_SIZE);
  const palette = buildPortraitPalette(look, gender);
  drawPixelRows(ctx, PORTRAIT_BODIES[look.body] ?? PORTRAIT_BODIES.normal, palette, PORTRAIT_BODY_TOP);
  drawPixelRows(ctx, PORTRAIT_FACE, palette, 0);
  if (gender === 'female') drawPixelRows(ctx, PORTRAIT_FEMALE_DETAILS, palette, 0);
  const facialHair = PORTRAIT_FACIAL_HAIR[look.facialHair];
  if (facialHair) drawPixelRows(ctx, facialHair, palette, 0);
  drawPixelRows(ctx, PORTRAIT_HAIR[look.hairStyle] ?? PORTRAIT_HAIR.short, palette, 0);
  if (look.glasses === 'glasses') drawPixelRows(ctx, PORTRAIT_GLASSES, palette, 0);
  canvas.setAttribute('aria-label', t('spriteLabel', describeLook(look).join(' ')));
}

// ------------------------------------------------------------
// 7.1) ภาพประกอบช่วงของวัน — วาดภาพพิกเซลเมืองร้างลง canvas (ใช้แทนรูปจริงไปก่อน)
//      ถ้าใส่ path รูปไว้ใน CONFIG.sceneImages จะแสดงรูปนั้นแทน
// ------------------------------------------------------------
const SCENE_WIDTH = 240;
const SCENE_HEIGHT = 90;
const SCENE_GROUND = 64; // แถวที่ตึกตั้งอยู่ (ต่ำกว่านี้คือทางเท้าและถนน)

// ชุดสีของแต่ละช่วงเวลา (กลางคืน: ฟ้ามืด ดาว พระจันทร์ ไฟหน้าต่าง ตาซอมบี้เรืองแสง)
const SCENE_PALETTES = {
  morning: {
    sky: ['#241b3a', '#33244a', '#4a2f57', '#683b5c', '#8c4a5d', '#b05d5a', '#cf7554', '#e59456', '#f2b468'], // บนลงล่าง
    sun: '#ffd98f',
    sunCore: '#fff1c9',
    sunGlow: ['rgba(255, 196, 120, 0.10)', 'rgba(255, 196, 120, 0.20)'],
    cloud: ['#5a3550', '#a8586a', '#f0a77a'], // ขอบบน / ตัวเมฆ / ท้องเมฆที่โดนแดด
    crow: '#120e14',
    farBuildings: '#7a4a66',
    farAccent: '#6a3f5c',
    midBuildings: '#33253a',
    midEdge: '#45334c',
    window: '#251b2a',
    litWindow: '#f2b35a',
    fireWindow: '#ff7a3a',
    smoke: ['rgba(38, 30, 38, 0.55)', 'rgba(70, 55, 66, 0.45)'],
    shophouse: '#1f1822',
    shophouseLight: '#2c2232',
    shutter: '#3a3038',
    shutterLine: '#272027',
    signs: ['#8a3a3a', '#3a5a8a', '#a8873a', '#3a7a5a', '#7a4a8a'],
    signText: 'rgba(255, 240, 220, 0.6)',
    sidewalk: '#2e2628',
    curb: '#4a3d3f',
    road: '#1f1a1c',
    roadSpeck: '#2a2326',
    lane: '#7a6a52',
    crack: '#141012',
    lampPole: '#3a3236',
    lampLight: '#ffd27a',
    lampGlow: 'rgba(255, 210, 122, 0.25)',
    car: { K: '#120e10', B: '#5d6f78', b: '#3f4c53', w: '#1c2329', W: '#6a6468' },
    cone: { O: '#d0612e', W: '#e8e0d0', K: '#2a2020' },
    zombies: [
      { S: '#7d9a55', s: '#5c7440', E: '#e04a3a', C: '#5a4040', c: '#3e2c2c', P: '#2c2c34' },
      { S: '#8aa060', s: '#667a44', E: '#e04a3a', C: '#3e4f63', c: '#2b3745', P: '#33302c' },
    ],
    specialZombie: { S: '#9a8ab0', s: '#76688c', E: '#ffe14a', C: '#4a3a5a', c: '#33283f', P: '#2a2430' },
    boss: { S: '#7a3a3a', s: '#5a2828', E: '#ffe14a', C: '#2a1a1a', c: '#1a1010', P: '#141010' },
  },
  night: {
    sky: ['#05060f', '#080b1a', '#0c1024', '#10152e', '#151a36', '#1b1f3d', '#222443', '#2a2848', '#33304e'],
    moon: '#e8e6d8',
    moonShade: '#a9a698',
    moonGlow: ['rgba(180, 200, 255, 0.06)', 'rgba(180, 200, 255, 0.12)'],
    star: '#cfd6ff',
    cloud: ['#0d1020', '#1a1e34', '#2a2e48'],
    crow: '#05060c',
    farBuildings: '#141831',
    farAccent: '#10142a',
    midBuildings: '#0e0f1c',
    midEdge: '#171a2c',
    window: '#0b0c16',
    litWindow: '#e8b25a',
    fireWindow: '#ff6a2a',
    smoke: ['rgba(10, 10, 18, 0.6)', 'rgba(30, 30, 44, 0.5)'],
    shophouse: '#0b0b14',
    shophouseLight: '#14152a',
    shutter: '#1a1b2c',
    shutterLine: '#101120',
    signs: ['#4a2028', '#203252', '#56482a', '#204238', '#3e2a4e'],
    signText: 'rgba(255, 240, 220, 0.35)',
    sidewalk: '#14131c',
    curb: '#22202c',
    road: '#0e0d14',
    roadSpeck: '#16151e',
    lane: '#4a4238',
    crack: '#07070b',
    lampPole: '#1e1d28',
    lampLight: '#ffd27a',
    lampGlow: 'rgba(255, 210, 122, 0.35)',
    car: { K: '#05050a', B: '#2c3640', b: '#1e262d', w: '#0a0e12', W: '#3a3640' },
    cone: { O: '#8a3a1c', W: '#a8a090', K: '#141010' },
    zombies: [
      { S: '#4f6638', s: '#3a4c28', E: '#ff3a2a', C: '#3a2828', c: '#261a1a', P: '#18181e' },
      { S: '#5a6a40', s: '#42502e', E: '#ff3a2a', C: '#26323f', c: '#1a222c', P: '#1e1c1a' },
    ],
    specialZombie: { S: '#6a5a80', s: '#4e4262', E: '#ffe14a', C: '#2e2440', c: '#201a2c', P: '#18141e' },
    boss: { S: '#5a2a2a', s: '#401c1c', E: '#ffe14a', C: '#1a1010', c: '#100a0a', P: '#0c0808' },
  },
};

// ข้อความอธิบายภาพ (สำหรับโปรแกรมอ่านหน้าจอ) คีย์อยู่ใน lang.js
const SCENE_LABEL_KEYS = { morning: 'sceneMorning', night: 'sceneNight' };

// ช่วงความยากของวันนั้น (ตาราง CONFIG.difficultyStages)
function getStage(day) {
  return [...CONFIG.difficultyStages].reverse().find(stage => day >= stage.fromDay) ?? CONFIG.difficultyStages[0];
}

// รวมเลขสุ่มประจำเกม + วัน + ชนิดของสิ่งที่จะสุ่ม เป็นเลขตั้งต้นเดียว
// (แต่ละเกมได้ภาพ/อากาศไม่ซ้ำกัน แต่ในเกมเดียวกันวันเดิมได้ผลเดิมเสมอ)
const SEED_SALT = { weather: 1, city: 2, sky: 3, clouds: 4, rain: 5, morningZombies: 6, nightZombies: 7, zombieCount: 8 };

function mixSeed(runSeed, day, salt) {
  let value = (runSeed ^ Math.imul(day, 0x9e3779b1) ^ Math.imul(salt, 0x85ebca6b)) >>> 0;
  value = Math.imul(value ^ (value >>> 16), 0x7feb352d) >>> 0;
  return (value ^ (value >>> 15)) >>> 0;
}

// สภาพอากาศของวัน: วันเดียวกันในเกมเดียวกันได้แบบเดิมเสมอ (ทั้งเช้าและกลางคืน)
function getWeather(day, runSeed) {
  const random = createSeededRandom(mixSeed(runSeed, day, SEED_SALT.weather));
  let roll = random() * CONFIG.weather.reduce((sum, weather) => sum + weather.weight, 0);
  for (const weather of CONFIG.weather) {
    roll -= weather.weight;
    if (roll < 0) return weather;
  }
  return CONFIG.weather[0];
}

// ตารางไล่ระดับแบบ Bayer 4x4 ใช้ผสมสีท้องฟ้าให้ดูเนียนแบบเกมยุคเก่า
const BAYER_4X4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

// สุ่มแบบกำหนดเลขตั้งต้น: วันเดียวกันได้ภาพเดิมทุกครั้งที่วาด (สูตร mulberry32)
function createSeededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

// สุ่มจำนวนเต็ม min..max จากตัวสุ่มแบบกำหนดเลขตั้งต้น
function randomBetween(random, min, max) {
  return Math.floor(random() * (max - min + 1)) + min;
}

// ระบายสี่เหลี่ยมพิกเซล (ค่าเริ่มต้น 1 จุด)
function fillPixels(ctx, color, x, y, width = 1, height = 1) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, width, height);
}

// วงกลมแบบพิกเซล (ใช้วาดดวงอาทิตย์ แสงไฟ และกลุ่มควัน)
function fillPixelCircle(ctx, centerX, centerY, radius, color) {
  ctx.fillStyle = color;
  for (let y = -radius; y <= radius; y++) {
    const half = Math.floor(Math.sqrt(radius * radius - y * y));
    ctx.fillRect(centerX - half, centerY + y, half * 2 + 1, 1);
  }
}

// วาดภาพพิกเซลเล็ก ๆ จากแผนที่ใน sprites.js (mirrored = กลับซ้ายขวา)
// scale = ขยายกี่เท่า (ใช้วาดซอมบี้พิเศษ/บอสตัวโต)
function drawMiniSprite(ctx, rows, palette, left, top, mirrored, scale = 1) {
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const color = palette[row[x]];
      if (!color) continue;
      const column = mirrored ? row.length - 1 - x : x;
      fillPixels(ctx, color, left + column * scale, top + y * scale, scale, scale);
    }
  });
}

// ท้องฟ้าไล่สีแบบ dithering
function drawSky(ctx, colors) {
  const stops = colors.sky;
  for (let y = 0; y < SCENE_GROUND; y++) {
    const position = (y / (SCENE_GROUND - 1)) * (stops.length - 1);
    const index = Math.min(Math.floor(position), stops.length - 2);
    const blend = position - index;
    fillPixels(ctx, stops[index], 0, y, SCENE_WIDTH, 1);
    ctx.fillStyle = stops[index + 1];
    for (let x = 0; x < SCENE_WIDTH; x++) {
      if ((BAYER_4X4[(y % 4) * 4 + (x % 4)] + 0.5) / 16 < blend) ctx.fillRect(x, y, 1, 1);
    }
  }
}

// ดวงอาทิตย์ยามเช้าต่ำ ๆ ใกล้ขอบฟ้า มีแสงเรือง
function drawSun(ctx, colors) {
  const x = 184;
  const y = 30;
  fillPixelCircle(ctx, x, y, 22, colors.sunGlow[0]);
  fillPixelCircle(ctx, x, y, 16, colors.sunGlow[1]);
  fillPixelCircle(ctx, x, y, 11, colors.sun);
  fillPixelCircle(ctx, x - 2, y - 2, 6, colors.sunCore);
}

// แสงบนฟ้า: เช้า = ดวงอาทิตย์ / กลางคืน = ดาวกับพระจันทร์
// random เป็นตัวสุ่มแยก ตึกจะได้ตำแหน่งเดิมทั้งเช้าและกลางคืน
function drawSkyLight(ctx, colors, random) {
  if (!colors.moon) {
    drawSun(ctx, colors);
    return;
  }
  for (let i = 0; i < 45; i++) fillPixels(ctx, colors.star, randomBetween(random, 0, SCENE_WIDTH - 1), randomBetween(random, 0, 40));
  fillPixelCircle(ctx, 60, 20, 15, colors.moonGlow[0]);
  fillPixelCircle(ctx, 60, 20, 11, colors.moonGlow[1]);
  fillPixelCircle(ctx, 60, 20, 7, colors.moonShade);
  fillPixelCircle(ctx, 58, 19, 6, colors.moon);
}

// สภาพอากาศชั้นหลัง (วาดก่อนตึก): ฟ้าครึ้มมีเมฆหนาบังฟ้า
function drawWeatherBack(ctx, random, colors, weatherId) {
  if (weatherId !== 'cloudy' && weatherId !== 'rain') return;
  fillPixels(ctx, 'rgba(40, 36, 52, 0.35)', 0, 0, SCENE_WIDTH, SCENE_GROUND);
  for (let i = 0; i < 7; i++) {
    const y = randomBetween(random, 0, 26);
    const x = randomBetween(random, -30, SCENE_WIDTH - 20);
    const length = randomBetween(random, 40, 90);
    fillPixels(ctx, colors.cloud[0], x, y, length, 3);
    fillPixels(ctx, colors.cloud[1], x + 6, y + 3, length - 12, 1);
  }
}

// สภาพอากาศชั้นหน้า (วาดทับทุกอย่าง): สายฝน / หมอก
function drawWeatherFront(ctx, random, weatherId) {
  if (weatherId === 'rain') {
    fillPixels(ctx, 'rgba(20, 24, 40, 0.25)', 0, 0, SCENE_WIDTH, SCENE_HEIGHT);
    for (let i = 0; i < 170; i++) {
      const x = randomBetween(random, 0, SCENE_WIDTH);
      const y = randomBetween(random, 0, SCENE_HEIGHT);
      fillPixels(ctx, 'rgba(170, 190, 230, 0.45)', x, y, 1, 3);
      fillPixels(ctx, 'rgba(170, 190, 230, 0.3)', x - 1, y + 3, 1, 2);
    }
  }
  if (weatherId === 'fog') {
    // หมอกจางทั้งภาพ + หนาที่สุดตรงแนวพื้นถนน แล้วค่อย ๆ จางขึ้นบน/ลงล่าง
    fillPixels(ctx, 'rgba(165, 160, 175, 0.18)', 0, 0, SCENE_WIDTH, SCENE_HEIGHT);
    for (let y = SCENE_GROUND - 36; y < SCENE_HEIGHT; y++) {
      const thickness = 1 - Math.abs(y - SCENE_GROUND) / 36;
      fillPixels(ctx, `rgba(190, 185, 200, ${(0.42 * Math.max(0, thickness)).toFixed(3)})`, 0, y, SCENE_WIDTH, 1);
    }
    for (let i = 0; i < 9; i++) { // ก้อนหมอกลอยเป็นริ้ว
      const y = randomBetween(random, SCENE_GROUND - 30, SCENE_HEIGHT - 6);
      fillPixels(ctx, 'rgba(210, 205, 220, 0.16)', randomBetween(random, -40, SCENE_WIDTH - 40), y, randomBetween(random, 50, 110), 3);
    }
  }
}

// เมฆเป็นริ้วยาว ท้องเมฆโดนแดดเช้า
function drawClouds(ctx, random, colors) {
  for (let i = 0; i < 5; i++) {
    const length = randomBetween(random, 18, 48);
    const left = randomBetween(random, -10, SCENE_WIDTH - 20);
    const y = randomBetween(random, 6, 34);
    fillPixels(ctx, colors.cloud[0], left + 6, y - 1, Math.floor(length * 0.55), 1);
    fillPixels(ctx, colors.cloud[1], left, y, length, 1);
    fillPixels(ctx, colors.cloud[2], left + 3, y + 1, Math.floor(length * 0.8), 1);
    if (random() < 0.5) fillPixels(ctx, colors.cloud[1], left + length - 6, y - 1, 8, 1);
  }
}

// อีกาบินเป็นรูปตัว v เล็ก ๆ
function drawCrows(ctx, random, colors) {
  for (let i = 0; i < 4; i++) {
    const x = randomBetween(random, 20, SCENE_WIDTH - 20);
    const y = randomBetween(random, 8, 26);
    fillPixels(ctx, colors.crow, x, y);
    fillPixels(ctx, colors.crow, x + 1, y + 1);
    fillPixels(ctx, colors.crow, x + 2, y);
    if (random() < 0.5) {
      fillPixels(ctx, colors.crow, x - 1, y - 1);
      fillPixels(ctx, colors.crow, x + 3, y - 1);
    }
  }
}

// ตึกสูงไกล ๆ สีจางกลืนกับฟ้า มีเสาอากาศและเครนก่อสร้างที่ทิ้งค้าง
function drawFarSkyline(ctx, random, colors) {
  let x = -randomBetween(random, 0, 8);
  while (x < SCENE_WIDTH) {
    const width = randomBetween(random, 10, 22);
    const top = SCENE_GROUND - randomBetween(random, 18, 40);
    fillPixels(ctx, colors.farBuildings, x, top, width, SCENE_GROUND - top);
    fillPixels(ctx, colors.farAccent, x + width - 2, top, 2, SCENE_GROUND - top);
    if (random() < 0.35) fillPixels(ctx, colors.farAccent, x + Math.floor(width / 2), top - randomBetween(random, 3, 8), 1, 8);
    x += width + randomBetween(random, 0, 4);
  }
  const craneX = randomBetween(random, 30, 110);
  const craneTop = SCENE_GROUND - 52;
  fillPixels(ctx, colors.farAccent, craneX, craneTop, 2, 40);       // เสาเครน
  fillPixels(ctx, colors.farAccent, craneX - 8, craneTop, 30, 1);   // แขนเครน
  fillPixels(ctx, colors.farAccent, craneX - 8, craneTop + 1, 4, 2); // ตุ้มถ่วง
  fillPixels(ctx, colors.farAccent, craneX + 18, craneTop + 1, 1, 9); // สลิง
  fillPixels(ctx, colors.farAccent, craneX + 17, craneTop + 10, 3, 2); // ตะขอ
}

// ควันลอยจากตึกที่ไหม้ (เอียงไปทางขวาตามลม)
function drawSmoke(ctx, random, colors, originX, originY) {
  let x = originX;
  let y = originY;
  for (let puff = 0; puff < 10; puff++) {
    fillPixelCircle(ctx, x, y, 2 + Math.floor(puff / 2), colors.smoke[puff % 2]);
    x += randomBetween(random, 2, 4);
    y -= randomBetween(random, 3, 5);
  }
}

// ตึกชั้นกลาง: หน้าต่างดับ/ติดไฟ/ไฟไหม้ มีถังน้ำและเสาอากาศบนหลังคา
// คืนตำแหน่งหลังคาตึกที่ไฟไหม้ไว้ใช้วาดควัน
function drawMidBuildings(ctx, random, colors) {
  const fires = [];
  let x = -randomBetween(random, 0, 10);
  while (x < SCENE_WIDTH) {
    const width = randomBetween(random, 14, 26);
    const top = SCENE_GROUND - randomBetween(random, 22, 46);
    fillPixels(ctx, colors.midBuildings, x, top, width, SCENE_GROUND - top);
    fillPixels(ctx, colors.midEdge, x, top, 1, SCENE_GROUND - top);
    let onFire = false;
    for (let windowY = top + 3; windowY < SCENE_GROUND - 3; windowY += 5) {
      for (let windowX = x + 3; windowX < x + width - 3; windowX += 4) {
        const roll = random();
        const color = roll < 0.03 ? colors.fireWindow : roll < 0.2 ? colors.litWindow : colors.window;
        if (color === colors.fireWindow) onFire = true;
        fillPixels(ctx, color, windowX, windowY, 2, 3);
      }
    }
    if (random() < 0.4) { // ถังน้ำบนหลังคา
      const tankX = x + randomBetween(random, 2, Math.max(2, width - 8));
      fillPixels(ctx, colors.midEdge, tankX, top - 5, 6, 4);
      fillPixels(ctx, colors.midBuildings, tankX + 1, top - 1, 1, 1);
      fillPixels(ctx, colors.midBuildings, tankX + 4, top - 1, 1, 1);
    } else if (random() < 0.4) { // เสาอากาศ
      fillPixels(ctx, colors.midEdge, x + Math.floor(width / 3), top - 7, 1, 7);
      fillPixels(ctx, colors.midEdge, x + Math.floor(width / 3) - 2, top - 5, 5, 1);
    }
    if (onFire || (fires.length === 0 && random() < 0.15)) fires.push({ x: x + Math.floor(width / 2), y: top - 2 });
    x += width + randomBetween(random, 1, 5);
  }
  return fires;
}

// ตึกแถวริมถนน: หน้าต่างชั้นบน ระเบียง ป้ายร้าน และประตูม้วนที่ปิดตาย
function drawShophouses(ctx, random, colors) {
  let x = -randomBetween(random, 0, 12);
  while (x < SCENE_WIDTH) {
    const width = randomBetween(random, 20, 28);
    const top = SCENE_GROUND - randomBetween(random, 17, 22);
    fillPixels(ctx, colors.shophouse, x, top, width, SCENE_GROUND - top);
    fillPixels(ctx, colors.shophouseLight, x, top, 1, SCENE_GROUND - top);
    fillPixels(ctx, colors.shophouseLight, x, top, width, 1);
    for (const windowX of [x + 4, x + width - 9]) { // หน้าต่างชั้นบน 2 บาน
      fillPixels(ctx, colors.shophouseLight, windowX - 1, top + 2, 6, 6);
      fillPixels(ctx, random() < 0.25 ? colors.litWindow : colors.window, windowX, top + 3, 4, 4);
    }
    fillPixels(ctx, colors.shophouseLight, x + 2, top + 8, width - 4, 1); // ราวระเบียง
    const signColor = colors.signs[randomBetween(random, 0, colors.signs.length - 1)];
    fillPixels(ctx, signColor, x + 2, top + 10, width - 4, 3); // ป้ายร้าน
    for (let textX = x + 4; textX < x + width - 4; textX += 2) {
      if (random() < 0.7) fillPixels(ctx, colors.signText, textX, top + 11);
    }
    const doorTop = top + 14; // ประตูม้วน (บางร้านเปิดค้างครึ่งเดียว)
    const doorHeight = SCENE_GROUND - doorTop;
    fillPixels(ctx, colors.window, x + 2, doorTop, width - 4, doorHeight);
    const shutterHeight = random() < 0.3 ? Math.floor(doorHeight / 2) : doorHeight;
    fillPixels(ctx, colors.shutter, x + 2, doorTop, width - 4, shutterHeight);
    ctx.fillStyle = colors.shutterLine;
    for (let lineY = doorTop + 1; lineY < doorTop + shutterHeight; lineY += 2) ctx.fillRect(x + 2, lineY, width - 4, 1);
    x += width;
  }
}

// ทางเท้า ขอบถนน และถนนที่มีรอยแตก
function drawStreet(ctx, random, colors) {
  fillPixels(ctx, colors.sidewalk, 0, SCENE_GROUND, SCENE_WIDTH, 4);
  fillPixels(ctx, colors.curb, 0, SCENE_GROUND + 4, SCENE_WIDTH, 1);
  fillPixels(ctx, colors.road, 0, SCENE_GROUND + 5, SCENE_WIDTH, SCENE_HEIGHT - SCENE_GROUND - 5);
  for (let i = 0; i < 140; i++) {
    fillPixels(ctx, colors.roadSpeck, randomBetween(random, 0, SCENE_WIDTH - 1), randomBetween(random, SCENE_GROUND + 6, SCENE_HEIGHT - 1));
  }
  for (let x = 4; x < SCENE_WIDTH; x += 14) fillPixels(ctx, colors.lane, x, SCENE_GROUND + 15, 7, 1);
  for (let i = 0; i < 6; i++) { // รอยแตกบนถนน
    let x = randomBetween(random, 0, SCENE_WIDTH - 1);
    let y = randomBetween(random, SCENE_GROUND + 7, SCENE_HEIGHT - 2);
    for (let step = 0; step < 6; step++) {
      fillPixels(ctx, colors.crack, x, y);
      x += randomBetween(random, 1, 2);
      y += randomBetween(random, -1, 1);
    }
  }
}

// เสาไฟริมทาง (หัวโคมงอ ไฟยังติดอยู่ดวงเดียว)
function drawLamp(ctx, colors, x) {
  fillPixels(ctx, colors.lampPole, x, SCENE_GROUND - 24, 1, 27);
  fillPixels(ctx, colors.lampPole, x + 1, SCENE_GROUND - 25, 4, 1);
  fillPixels(ctx, colors.lampPole, x + 5, SCENE_GROUND - 24, 1, 1);
  fillPixelCircle(ctx, x + 5, SCENE_GROUND - 22, 3, colors.lampGlow);
  fillPixels(ctx, colors.lampLight, x + 4, SCENE_GROUND - 23, 3, 1);
}

// ซอมบี้บนทางเท้าและถนน จำนวนตามช่วงความยาก + ซอมบี้พิเศษตัวโต + บอส (วาดตัวไกลก่อน ตัวใกล้ทับทีหลัง)
// baseCount = จำนวนซอมบี้ธรรมดาของวันนั้น, bonusPercent = เพิ่มกี่ % (ตอนกลางคืน จึงมากกว่าตอนเช้าเสมอ)
function drawSceneZombies(ctx, random, colors, stage, baseCount, bonusPercent) {
  const count = Math.round(baseCount * (1 + bonusPercent / 100));
  const makeZombie = (palette, scale) => ({
    x: randomBetween(random, 4, SCENE_WIDTH - 6 * scale - 4),
    feetY: randomBetween(random, SCENE_GROUND + 3, SCENE_HEIGHT - 2),
    variant: randomBetween(random, 0, SCENE_ZOMBIES.length - 1),
    palette,
    scale,
    mirrored: random() < 0.5,
  });
  const zombies = Array.from({ length: count },
    () => makeZombie(colors.zombies[randomBetween(random, 0, colors.zombies.length - 1)], 1));
  for (let i = 0; i < stage.specialZombies; i++) zombies.push(makeZombie(colors.specialZombie, 2));
  if (stage.boss) zombies.push(makeZombie(colors.boss, 3));
  zombies
    .sort((a, b) => a.feetY - b.feetY)
    .forEach(zombie => {
      const rows = SCENE_ZOMBIES[zombie.variant];
      const top = Math.min(zombie.feetY, SCENE_HEIGHT - 1) - rows.length * zombie.scale + 1;
      drawMiniSprite(ctx, rows, zombie.palette, zombie.x, top, zombie.mirrored, zombie.scale);
    });
}

// วาดภาพเมืองร้างของวันนั้น: ช่วงเวลา (เช้า/กลางคืน) + สภาพอากาศ + ช่วงความยาก
// runSeed = เลขสุ่มประจำเกม: ถนนเดิมทั้งเช้าและกลางคืน แต่ละวัน/แต่ละเกมหน้าตาต่างกัน
// ซอมบี้สุ่มแยกตามช่วงเวลา กลางคืนจึงมีจำนวนและตำแหน่งต่างจากตอนเช้า
function drawScene(canvas, phase, day, runSeed) {
  canvas.width = SCENE_WIDTH;
  canvas.height = SCENE_HEIGHT;
  const ctx = canvas.getContext('2d');
  const colors = SCENE_PALETTES[phase] ?? SCENE_PALETTES.morning;
  const seeded = salt => createSeededRandom(mixSeed(runSeed, day, salt));
  const random = seeded(SEED_SALT.city);
  const weather = getWeather(day, runSeed);
  const weatherId = weather.id;
  const stage = getStage(day);
  const isNight = phase === 'night';
  drawSky(ctx, colors);
  if (!weather.coversSky) drawSkyLight(ctx, colors, seeded(SEED_SALT.sky)); // ฟ้าครึ้ม/ฝนตก: เมฆบังหมด
  drawClouds(ctx, random, colors);
  drawWeatherBack(ctx, seeded(SEED_SALT.clouds), colors, weatherId);
  if (weather.birds !== false) drawCrows(ctx, random, colors);
  drawFarSkyline(ctx, random, colors);
  const fires = drawMidBuildings(ctx, random, colors);
  for (let i = 0; i < stage.extraFires; i++) fires.push({ x: randomBetween(random, 10, SCENE_WIDTH - 30), y: SCENE_GROUND - randomBetween(random, 24, 40) });
  fires.slice(0, 2 + stage.extraFires).forEach(fire => drawSmoke(ctx, random, colors, fire.x, fire.y));
  drawShophouses(ctx, random, colors);
  drawStreet(ctx, random, colors);
  drawLamp(ctx, colors, randomBetween(random, 30, SCENE_WIDTH - 40));
  const carX = randomBetween(random, 10, SCENE_WIDTH - 40);
  drawMiniSprite(ctx, SCENE_CAR, colors.car, carX, SCENE_GROUND + 7, random() < 0.5);
  drawMiniSprite(ctx, SCENE_CONE, colors.cone, carX + 28, SCENE_GROUND + 12, false);
  // จำนวนพื้นฐานสุ่มครั้งเดียวต่อวัน (เช้า/กลางคืนใช้ร่วมกัน) ส่วนตำแหน่งสุ่มแยกตามช่วงเวลา
  const baseCount = randomBetween(seeded(SEED_SALT.zombieCount), ...stage.sceneZombies);
  const zombieRandom = seeded(isNight ? SEED_SALT.nightZombies : SEED_SALT.morningZombies);
  drawSceneZombies(ctx, zombieRandom, colors, stage, baseCount, isNight ? CONFIG.sceneNightZombieBonus : 0);
  drawWeatherFront(ctx, seeded(SEED_SALT.rain), weatherId);
}

// ภาพเปลี่ยนตามสภาพตัวละคร: คืนชื่อ class ที่ต้องใส่ให้กรอบภาพ
function getSceneMoodClasses() {
  const mood = CONFIG.sceneMood;
  const stats = game.stats;
  return {
    'mood-hurt': stats.hp <= (stats.maxHp * mood.hurtBelowPercent) / 100,
    'mood-stressed': stats.stress > mood.stressAbove,
    'mood-exhausted': stats.fatigue > mood.fatigueAbove,
  };
}

// แสดงภาพประกอบ: มีรูปจริงใน CONFIG.sceneImages → ใช้รูป, ไม่มี → วาดภาพพิกเซล
function renderScene(phase, day, runSeed) {
  const canvas = byId('phase-scene');
  const image = byId('phase-scene-image');
  const imagePath = CONFIG.sceneImages[phase];
  const weather = getWeather(day, runSeed);
  const label = `${t(SCENE_LABEL_KEYS[phase])} (${tr(weather, 'name')})`;
  byId('scene-weather').textContent = `${weather.icon} ${tr(weather, 'name')}`;
  for (const [className, active] of Object.entries(getSceneMoodClasses())) {
    canvas.parentElement.classList.toggle(className, active);
  }
  if (imagePath) {
    image.src = imagePath;
    image.alt = label;
    image.hidden = false;
    canvas.hidden = true;
  } else {
    image.hidden = true;
    canvas.hidden = false;
    drawScene(canvas, phase, day, runSeed);
    canvas.setAttribute('aria-label', label);
  }
}

// ------------------------------------------------------------
// 8) แสดงผลบนหน้าจอ
// ------------------------------------------------------------
function byId(id) {
  return document.getElementById(id);
}

// สลับหน้าจอ: title / reveal / game
function showScreen(name) {
  document.querySelectorAll('.screen').forEach(screen => {
    screen.hidden = screen.id !== `screen-${name}`;
  });
  window.scrollTo(0, 0);
}

// ใส่ข้อความตามภาษาให้ทุกจุดที่ติดป้าย data-i18n ใน index.html
function applyStaticTexts() {
  document.documentElement.lang = currentLanguage;
  document.title = t('pageTitle');
  document.querySelectorAll('[data-i18n]').forEach(element => {
    element.textContent = t(element.dataset.i18n);
  });
  // ข้อความที่มี <br> (มาจาก lang.js เท่านั้น ไม่ใช่ข้อมูลจากผู้เล่น)
  document.querySelectorAll('[data-i18n-html]').forEach(element => {
    element.innerHTML = t(element.dataset.i18nHtml);
  });
  byId('language-switch').setAttribute('aria-label', t('languageLabel'));
  document.querySelectorAll('[data-language]').forEach(button => {
    button.setAttribute('aria-pressed', String(button.dataset.language === currentLanguage));
  });
}

// กันข้อความกลายเป็น HTML (เช่น ชื่อจากเซฟที่ถูกแก้)
function escapeHtml(text) {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return String(text).replace(/[&<>"']/g, ch => map[ch]);
}

// ตัวเลขพร้อมเครื่องหมาย เช่น +5, −10
function formatSigned(value) {
  return value > 0 ? `+${value}` : `−${Math.abs(value)}`;
}

// ข้อความของผล เช่น "พลังชีวิตสูงสุด +10", "อาหารที่ใช้ต่อวัน +10%"
function formatMod(key, value) {
  const info = MOD_INFO[key];
  return `${tr(info, 'name')} ${formatSigned(value)}${info.unit}`;
}

// ชิปแสดงผล: เขียว = ข้อดี, แดง = ข้อเสีย (ข้อดีขึ้นก่อน)
function renderModChips(mods) {
  const entries = Object.entries(mods).filter(([key, value]) => value !== 0 && MOD_INFO[key]);
  if (entries.length === 0) return `<span class="chip chip-neutral">${escapeHtml(t('noEffects'))}</span>`;
  entries.sort(([keyA, valueA], [keyB, valueB]) => Number(isBadMod(keyA, valueA)) - Number(isBadMod(keyB, valueB)));
  return entries.map(([key, value]) => {
    const bad = isBadMod(key, value);
    return `<span class="chip ${bad ? 'chip-bad' : 'chip-good'}">${bad ? '✘' : '✔'} ${escapeHtml(formatMod(key, value))}</span>`;
  }).join('');
}

// กล่องผลของแหล่งหนึ่ง (ช่วงอายุ / อาชีพ / นิสัย)
function renderEffectBlock(title, desc, mods) {
  return `
    <p class="effect-title">${escapeHtml(title)}</p>
    <p class="effect-desc">${escapeHtml(desc)}</p>
    <div class="chip-list">${renderModChips(mods)}</div>`;
}

// หน้าแรก: ถ้ามีเซฟจะโชว์ปุ่ม "เล่นต่อ"
function renderTitle() {
  const savedRun = loadRun();
  byId('btn-continue').hidden = !savedRun;
  byId('btn-new-game').classList.toggle('btn-primary', !savedRun);
  byId('title-save-info').textContent = savedRun ? t('lastSave', describeCharacter(savedRun.character)) : '';
}

// หน้า "คุณถูกสุ่มเกิดเป็น..."
function renderReveal(character) {
  const occupation = getOccupation(character.occupationId);
  const occupationName = getOccupationName(occupation, character.gender);
  const ageGroup = getAgeGroup(character.age);

  drawCharacter(byId('reveal-sprite'), character);
  byId('reveal-name').textContent = getDisplayName(character);
  byId('reveal-basic').textContent = t('genderAge', tr(CONFIG.genders[character.gender], 'name'), character.age);
  byId('reveal-occupation').textContent = `${occupation.icon} ${t('formerJob', occupationName)}`;
  byId('reveal-look').textContent = describeLook(character.look).join(' · ');

  byId('reveal-age').innerHTML = renderEffectBlock(
    t('ageRange', tr(ageGroup, 'name'), ageGroup.minAge, ageGroup.maxAge), tr(ageGroup, 'desc'), ageGroup.mods);
  byId('reveal-job').innerHTML = renderEffectBlock(
    `${occupation.icon} ${occupationName}`, tr(occupation, 'desc'), occupation.mods);
  byId('reveal-traits').innerHTML = character.traitIds
    .map(id => getTrait(id))
    .map(trait => `<article class="trait-card">${renderEffectBlock(`${trait.icon} ${tr(trait, 'name')}`, tr(trait, 'desc'), trait.mods)}</article>`)
    .join('');
  byId('reveal-stats').innerHTML = renderStartingStats(character);

  replayAnimation(byId('reveal-card'));
}

// ค่าเริ่มต้นทั้งหมด + ส่วน "ดูที่มาของตัวเลข"
function renderStartingStats(character) {
  const stats = calcStartingStats(character);
  const items = Object.entries(CONFIG.stats).map(([key, def]) => `
    <li class="start-stat stat-${key}">
      <span class="start-stat-name">${def.icon} ${escapeHtml(tr(def, 'name'))}</span>
      <span class="start-stat-value"><b>${stats[key]}</b> / ${getStatMax(key, stats)}</span>
    </li>`);
  items.push(`
    <li class="start-stat">
      <span class="start-stat-name">🎒 ${escapeHtml(t('slotsLabel'))}</span>
      <span class="start-stat-value"><b>${calcInventorySlots(character)}</b> ${escapeHtml(t('slotsUnit'))}</span>
    </li>`);
  const breakdown = getStartBreakdown(character).map(line => `<li>${formatBreakdownLine(line)}</li>`).join('');
  return `
    <ul class="start-stats">${items.join('')}</ul>
    <details class="breakdown">
      <summary>${escapeHtml(t('breakdownToggle'))}</summary>
      <ul>${breakdown}</ul>
    </details>`;
}

// ที่มาของค่าเริ่มต้นแต่ละตัว: ค่าพื้นฐาน + ผลจากแต่ละแหล่ง = ผลลัพธ์
function getStartBreakdown(character) {
  const sources = getModSources(character);
  const stats = calcStartingStats(character);
  const base = CONFIG.stats;
  const lines = [
    { label: t('maxHpLabel'),         modKey: 'maxHp',   base: base.hp.max,        result: stats.maxHp },
    { label: tr(base.food, 'name'),    modKey: 'food',    base: base.food.start,    result: stats.food },
    { label: tr(base.water, 'name'),   modKey: 'water',   base: base.water.start,   result: stats.water },
    { label: tr(base.ammo, 'name'),    modKey: 'ammo',    base: base.ammo.start,    result: stats.ammo },
    { label: tr(base.fatigue, 'name'), modKey: 'fatigue', base: base.fatigue.start, result: stats.fatigue },
    { label: tr(base.stress, 'name'),  modKey: 'stress',  base: base.stress.start,  result: stats.stress },
    { label: t('slotsLabel'),         modKey: 'slots',   base: CONFIG.inventory.baseSlots, result: calcInventorySlots(character) },
  ];
  return lines.map(line => ({
    ...line,
    parts: sources
      .filter(source => source.mods[line.modKey])
      .map(source => ({ name: source.name, value: source.mods[line.modKey] })),
  }));
}

// เช่น "พลังชีวิตสูงสุด: พื้นฐาน 100 · หนุ่มสาว +5 · ร่างกายแข็งแรง +10 = 115"
function formatBreakdownLine(line) {
  const parts = line.parts.map(part => `${escapeHtml(part.name)} ${formatSigned(part.value)}`);
  const rawTotal = line.base + line.parts.reduce((sum, part) => sum + part.value, 0);
  const note = rawTotal !== line.result ? ` <small>${escapeHtml(t('breakdownClamped'))}</small>` : '';
  return `<b>${escapeHtml(line.label)}</b>: ${[escapeHtml(t('breakdownBase', line.base)), ...parts].join(' · ')} = <b>${line.result}</b>${note}`;
}

// หน้าเล่นเกม
function renderGame() {
  renderTopBar();
  renderStats();
  renderBag();
  renderCharacterPanel();
  renderPhase();
}

// แถบด้านบน: วันที่ (ชื่อ อายุ อาชีพ แสดงในแผงตัวละคร)
function renderTopBar() {
  byId('topbar-day').textContent = t('dayCounter', game.day, CONFIG.totalDays);
}

// แผงค่าสถานะ (หลอด + ตัวเลข) สร้างตามลำดับใน CONFIG.stats
function renderStats() {
  const stats = game.stats;
  byId('stats-list').innerHTML = Object.entries(CONFIG.stats).map(([key, def]) => {
    const value = stats[key];
    const max = getStatMax(key, stats);
    const percent = max > 0 ? clamp(Math.round((value / max) * 100), 0, 100) : 0;
    const critical = isStatCritical(key, value);
    const name = escapeHtml(tr(def, 'name'));
    return `
      <li class="stat stat-${key}${critical ? ' is-critical' : ''}" data-stat="${key}">
        <div class="stat-head">
          <span class="stat-name">${def.icon} ${name}</span>
          <span class="stat-value">${value} / ${max}</span>
        </div>
        <div class="stat-bar" role="progressbar" aria-label="${name}"
             aria-valuemin="0" aria-valuemax="${max}" aria-valuenow="${value}">
          <div class="stat-fill" style="width: ${percent}%"></div>
        </div>
      </li>`;
  }).join('');
}

// ค่าสถานะถึงขั้นอันตรายไหม (ใช้ขึ้นสีเตือน)
function isStatCritical(key, value) {
  const def = CONFIG.stats[key];
  return def.higherIsWorse ? value >= def.warnAt : value <= def.warnAt;
}

// แผงตัวละคร: รูป ชื่อ เพศ/ช่วงอายุ อายุ/อาชีพ นิสัย และผลรวมทั้งหมด
// (คำบรรยายรูปลักษณ์ เช่น ทรงผม รูปร่าง แสดงเฉพาะหน้าสุ่มตัวละคร)
function renderCharacterPanel() {
  const { character } = game;
  const occupation = getOccupation(character.occupationId);
  const jobLabel = `${occupation.icon} ${t('formerJob', getOccupationName(occupation, character.gender))}`;
  drawCharacter(byId('panel-sprite'), character);
  byId('panel-name').textContent = getDisplayName(character);
  byId('panel-identity').textContent =
    `${tr(CONFIG.genders[character.gender], 'name')} · ${tr(getAgeGroup(character.age), 'name')}`;
  byId('panel-job').textContent = t('characterAgeJob', character.age, jobLabel);
  byId('panel-traits').innerHTML = character.traitIds
    .map(id => getTrait(id))
    .map(trait => `<span class="trait-tag" title="${escapeHtml(tr(trait, 'desc'))}">${trait.icon} ${escapeHtml(tr(trait, 'name'))}</span>`)
    .join('');
  byId('panel-slots').textContent = t('slotsCount', game.inventorySlots);
  byId('panel-effects').innerHTML = renderModChips(getCharacterMods(character));
}

// ช่วงของวัน: เช้า (เก็บของ) → กลางคืน (เตรียมรับมือ) → สรุปวัน → เช้าวันใหม่ / เสียชีวิต / รอดครบ
const PHASE_VIEWS = {
  morning: { title: day => t('morningTitle', day), scene: 'morning', body: renderMorningBody },
  night:   { title: day => t('nightTitle', day),   scene: 'night',   body: renderNightBody },
  summary: { title: day => t('summaryTitle', day), scene: 'night',   body: renderSummaryBody },
  dead:    { title: () => t('deadTitle'),          scene: 'night',   body: renderDeadBody },
  won:     { title: () => t('wonTitle'),           scene: 'morning', body: renderWonBody },
};

function renderPhase() {
  const view = PHASE_VIEWS[game.phase];
  byId('phase-title').textContent = view.title(game.day);
  // ตายตอนเช้า (เช่น ของเสี่ยง) ใช้ภาพตอนเช้า
  const scene = game.phase === 'dead' && game.death?.phase === 'morning' ? 'morning' : view.scene;
  renderScene(scene, game.day, game.seed);
  byId('phase-body').innerHTML = view.body() + renderDayLog();
}

// บันทึกสิ่งที่ทำในวันนี้ (เก็บของ ใช้ของ ทิ้งของ)
function renderDayLog() {
  if (game.log.length === 0) return '';
  return `<ul class="day-log">${game.log.map(entry => `<li>${escapeHtml(formatLogEntry(entry))}</li>`).join('')}</ul>`;
}

// ปุ่มหลักของช่วงนั้น (ชิดขวา)
function phaseButton(action, label) {
  return `<div class="phase-actions"><button class="btn btn-primary" type="button" data-action="${action}">${escapeHtml(label)}</button></div>`;
}

// เช้า: การ์ดของที่เจอ + ปุ่มจบช่วงเช้า (ข้อความเปิดเรื่องวันที่ 1 อยู่ใต้การ์ด การ์ดจะได้ไม่ตกขอบจอ)
function renderMorningBody() {
  const intro = game.day === 1
    ? `<div class="intro-note"><p>${escapeHtml(t('introWake'))}</p><p>${escapeHtml(t('introRadio', CONFIG.totalDays))}</p></div>`
    : '';
  return `<p>${escapeHtml(t('morningFound'))}</p>
    <div class="item-grid">${game.morning.offer.map(renderOfferCard).join('')}</div>
    <p class="pick-status">${escapeHtml(t('pickStatus', game.morning.picks, CONFIG.loot.maxPicks, CONFIG.loot.extraPickFatigue))}</p>
    ${phaseButton('end-morning', t('endMorningButton'))}
    ${intro}`;
}

// กลางคืน: บอกชนิดการบุก แรงบุกโดยประมาณ การป้องกันที่มี และความเสียหายที่คาดว่าจะได้รับ
function renderNightBody() {
  const plan = getNightPlan();
  const threat = getThreat(game.night.threatId);
  const { weapons, defense } = plan;
  const damageMod = (plan.mods.zombieDamage ?? 0) + (plan.mods.nightDamage ?? 0);
  const chip = (text, tone = 'neutral') => `<span class="chip chip-${tone}">${escapeHtml(text)}</span>`;
  const chips = [
    chip(t('nightShelter', defense.shelter)),
    defense.items > 0 ? chip(t('nightDefenseItems', defense.items), 'good') : '',
    plan.mods.defensePower ? chip(t('nightDefenseBonus', formatSigned(plan.mods.defensePower)), plan.mods.defensePower > 0 ? 'good' : 'bad') : '',
    weapons.power > 0 ? chip(t('nightWeapons', weapons.power), 'good') : chip(t('nightNoWeapons')),
    plan.reduction > 0 ? chip(t('nightReduction', plan.reduction), 'good') : '',
    damageMod ? chip(t('nightDamageMod', formatSigned(damageMod)), damageMod > 0 ? 'bad' : 'good') : '',
    weapons.noise > 0 ? chip(t('nightNoise', weapons.noise * CONFIG.night.noiseAttack), 'bad') : '',
  ].join('');
  // ปืน: เลือกได้ว่าจะยิงคืนนี้ไหม (ประหยัดกระสุนได้ แต่พลังโจมตีลดลง)
  const allGuns = planWeapons(game.inventory, game.stats.ammo, true, plan.mods);
  const gunIds = [...allGuns.fired, ...allGuns.silent];
  const gunToggle = gunIds.length === 0 ? '' : `
    <label class="night-toggle">
      <input type="checkbox" data-action="toggle-guns"${game.night.useGuns ? ' checked' : ''}${allGuns.fired.length === 0 ? ' disabled' : ''}>
      ${escapeHtml(allGuns.fired.length > 0 ? t('nightUseGuns', allGuns.ammoUsed, game.stats.ammo) : t('nightNoAmmo'))}
    </label>`;
  const [minDamage, maxDamage] = plan.damageRange;
  return `
    <div class="night-threat">
      <p class="night-threat-name">${escapeHtml(t('nightThreat', threat.icon, tr(threat, 'name')))}</p>
      <p class="night-threat-desc">${escapeHtml(tr(threat, 'desc'))}</p>
      <p>${escapeHtml(t('nightAttackRange', ...plan.attackRange))}</p>
    </div>
    <div class="chip-list">${chips}</div>
    ${gunToggle}
    <p class="night-expect${maxDamage > 0 ? ' is-danger' : ''}">${escapeHtml(t('nightBlockTotal', plan.block))} · ${escapeHtml(t('nightExpect', minDamage, maxDamage))}</p>
    <p class="pick-status">${escapeHtml(t('nightHint'))}</p>
    ${phaseButton('resolve-night', t('resolveNightButton'))}`;
}

// สรุปวัน: ผลการบุก การนอน อาหาร/น้ำ ของสึกหรอ แล้วปุ่มเริ่มวันใหม่
function renderSummaryBody() {
  const isLastDay = game.day >= CONFIG.totalDays;
  return `${renderReport()}
    ${phaseButton('next-day', isLastDay ? t('finishButton') : t('nextDayButton', game.day + 1))}`;
}

function renderReport() {
  if (!game.report?.length) return '';
  return `<ul class="night-report">${game.report.map(entry => `<li>${escapeHtml(formatLogEntry(entry))}</li>`).join('')}</ul>`;
}

// เสียชีวิต: บอกวันและสาเหตุ (หน้าจอสรุปเต็มอยู่ในขั้นที่ 4)
function renderDeadBody() {
  const { death, character } = game;
  return `
    <div class="death-box">
      <p class="death-message">${escapeHtml(t('deadMessage', getDisplayName(character), death.day, CONFIG.totalDays))}</p>
      <p class="death-cause">${escapeHtml(t('deadCause', describeCause(death.cause)))}</p>
    </div>
    ${renderReport()}
    <p class="dev-note">${escapeHtml(t('deadNote'))}</p>
    ${phaseButton('new-game', t('newGameButton'))}`;
}

// รอดครบทุกวัน (หน้าจอชนะเต็มอยู่ในขั้นที่ 4)
function renderWonBody() {
  return `
    <div class="death-box is-win"><p class="death-message">${escapeHtml(t('wonMessage', getDisplayName(game.character), CONFIG.totalDays))}</p></div>
    ${renderReport()}
    <p class="dev-note">${escapeHtml(t('wonNote'))}</p>
    ${phaseButton('new-game', t('newGameButton'))}`;
}

// เล่นแอนิเมชันซ้ำ (ให้รู้ว่าสุ่มใหม่แล้ว)
function replayAnimation(element) {
  element.classList.remove('pop-in');
  void element.offsetWidth; // บังคับให้เบราว์เซอร์รีเซ็ตแอนิเมชัน
  element.classList.add('pop-in');
}

// กล่องยืนยัน (ใช้แทน confirm() ของเบราว์เซอร์)
let confirmAction = null;

let focusBeforeModal = null; // ปุ่มที่กดเปิดกล่อง ปิดกล่องแล้วคืนโฟกัสให้

function openConfirm(title, message, confirmText, onConfirm) {
  byId('modal-title').textContent = title;
  byId('modal-message').textContent = message;
  byId('modal-confirm').textContent = confirmText;
  confirmAction = onConfirm;
  showModal();
}

function showModal() {
  focusBeforeModal = document.activeElement;
  byId('modal').hidden = false;
  byId('modal-cancel').focus();
}

function closeConfirm() {
  byId('modal').hidden = true;
  byId('modal-confirm').hidden = false;
  confirmAction = null;
  swapAction = null;
  // คืนโฟกัสให้ปุ่มเดิม (ถ้าปุ่มนั้นยังอยู่ — บางปุ่มถูกวาดใหม่หลังกด)
  if (focusBeforeModal?.isConnected) focusBeforeModal.focus();
  focusBeforeModal = null;
}

// กด Tab ในกล่อง: วนโฟกัสอยู่แค่ปุ่มในกล่อง ไม่หลุดไปหน้าข้างหลัง
function trapModalFocus(event) {
  const buttons = [...byId('modal').querySelectorAll('button')].filter(button => !button.hidden && !button.disabled);
  if (buttons.length === 0) return;
  const first = buttons[0];
  const last = buttons[buttons.length - 1];
  const inside = byId('modal').contains(document.activeElement);
  if (event.shiftKey && (document.activeElement === first || !inside)) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && (document.activeElement === last || !inside)) {
    event.preventDefault();
    first.focus();
  }
}

// ------------------------------------------------------------
// 8.5) ของ กระเป๋า และการหาของตอนเช้า (ข้อมูลของอยู่ใน items.js)
// ------------------------------------------------------------
function getItem(id) {
  return findById(ITEMS, id);
}

// ของ 1 ชิ้นในกระเป๋า: จำ id กับจำนวนครั้ง/วันที่ยังใช้ได้
function createBagItem(id) {
  return { id, usesLeft: getItem(id).uses };
}

// รวมผลติดตัวของทุกชิ้นในกระเป๋า เช่น passiveTotal(inventory, 'slots')
function passiveTotal(inventory, key) {
  return inventory.reduce((sum, entry) => sum + (getItem(entry.id).passive?.[key] ?? 0), 0);
}

// ของที่ใส่อยู่ (เช่น กระเป๋าเป้ในส่วนใส่กระเป๋า) — ไม่กินช่องในกระเป๋า
function getWornItems() {
  return Object.values(game.worn).filter(Boolean).map(getItem);
}

// ความจุกระเป๋า = ช่องของตัวละคร + ช่องจากกระเป๋าที่ใส่อยู่ (เช่น 5 + เป้ 2 = 7)
function getBagCapacity() {
  return game.inventorySlots + getWornItems().reduce((sum, item) => sum + (item.passive?.slots ?? 0), 0);
}

// ของสวมใส่ไหม (เช่น กระเป๋าเป้ wear: 'bag') — เก็บแล้วใส่ทันที ไม่ลงช่องในกระเป๋า
function isWearable(item) {
  return Boolean(item.wear);
}

// ใส่ได้ไหม: ช่องสวมใส่นั้นต้องว่างอยู่ (กระเป๋าเป้ใส่ได้ทีละใบ)
function canWear(item) {
  return isWearable(item) && !game.worn[item.wear];
}

// ทิ้งของที่ใส่อยู่ได้ไหม: ทิ้งแล้วของในกระเป๋าต้องยังใส่ช่องที่เหลือได้พอ
function canRemoveWorn(slot) {
  const itemId = game.worn[slot];
  if (!itemId) return false;
  return game.inventory.length <= getBagCapacity() - (getItem(itemId).passive?.slots ?? 0);
}

// น้ำหนักความหายากตามวัน: ของหายากลดลงเรื่อย ๆ ตาม lateGameRareCut และ lootLuck ของตัวละครช่วยเพิ่ม
function getRarityWeights(day, character) {
  const { rarityWeights, lateGameRareCut } = CONFIG.loot;
  const progress = (day - 1) / Math.max(1, CONFIG.totalDays - 1);
  const luck = Math.max(0, 1 + (getCharacterMods(character).lootLuck ?? 0) / 100);
  const scarcity = 1 - lateGameRareCut * progress;
  return Object.entries(rarityWeights)
    .map(([id, weight]) => ({ id, weight: id === 'common' ? weight : weight * scarcity * luck }));
}

// สุ่มของ 1 ชิ้นตามความหายาก โดยไม่ซ้ำกับที่สุ่มได้แล้วในเช้านี้
function rollLootItem(day, character, excludeIds) {
  const rarity = pickWeighted(getRarityWeights(day, character)).id;
  const pool = ITEMS.filter(item => !excludeIds.includes(item.id));
  const sameRarity = pool.filter(item => item.rarity === rarity);
  return pickRandom(sameRarity.length > 0 ? sameRarity : pool).id;
}

// ของที่เจอตอนเช้า: 3-4 ชิ้น (+ ไฟฉายในกระเป๋า)
function rollMorningOffer(day, character, inventory) {
  const count = randomInt(CONFIG.loot.offerMin, CONFIG.loot.offerMax) + passiveTotal(inventory, 'morningChoices');
  const offer = [];
  while (offer.length < Math.min(count, ITEMS.length)) offer.push(rollLootItem(day, character, offer));
  return { offer, taken: [], picks: 0 };
}

// เปลี่ยนค่าสถานะ 1 ตัว (ตัดให้อยู่ในช่วง 0..สูงสุด) แล้วคืนค่าที่เปลี่ยนจริง
// ผลจากอาชีพ/นิสัย: healPower เพิ่มพลังชีวิตที่ได้, foodPower เพิ่มอาหารที่ได้, fatigueGain/stressGain เพิ่มความเหนื่อย/เครียด
// cause = สาเหตุ ใช้บันทึกเมื่อพลังชีวิตลด (ใช้บอกสาเหตุการตาย)
// useBoost = false: ไม่ใช้ผลของตัวละคร (เช่น พลังชีวิตฟื้นเองตอนพัก ไม่ใช่ยา จึงไม่ได้ผล healPower)
function changeStat(key, amount, cause, useBoost = true) {
  const mods = getCharacterMods(game.character);
  const boost = useBoost ? { hp: 'healPower', food: 'foodPower', fatigue: 'fatigueGain', stress: 'stressGain' }[key] : null;
  const delta = Math.round(amount > 0 && boost ? amount * (1 + (mods[boost] ?? 0) / 100) : amount);
  const before = game.stats[key];
  game.stats[key] = clamp(before + delta, 0, getStatMax(key, game.stats));
  const changed = game.stats[key] - before;
  if (key === 'hp' && changed < 0 && cause) game.lastDamageCause = cause;
  return changed;
}

// ใช้ผลหลายตัวพร้อมกัน คืนค่าที่เปลี่ยนจริง เช่น [['food', 25], ['water', -8]]
function applyEffects(effects, cause) {
  return Object.entries(effects).map(([key, amount]) => [key, changeStat(key, amount, cause)]);
}

// ข้อความของผลที่เปลี่ยน เช่น "อาหาร +25, น้ำ −8"
function formatEffectList(list) {
  return list.map(([key, changed]) => `${tr(CONFIG.stats[key], 'name')} ${changed === 0 ? '0' : formatSigned(changed)}`).join(', ');
}

// โอกาสที่ของเสี่ยงจะให้ผลร้าย (นิสัย/อายุที่มี riskyChance ปรับได้)
function getRiskChance(item) {
  return clamp(item.risk.chance + (getCharacterMods(game.character).riskyChance ?? 0), 0, 95);
}

// บันทึกของวัน: เก็บเป็นข้อมูล (คีย์ข้อความ + ค่า) แล้วค่อยแปลตอนแสดง เปลี่ยนภาษาแล้วจะแปลตามได้
//   ค่าที่ใส่ได้: ตัวเลข, { item: id } = ชื่อของ, { items: [id] } = ชื่อของหลายชิ้น,
//   { riskOf: id } = ผลร้ายของของ, { threat: id } = ชื่อชนิดการบุก, [[stat, ค่า]] = ผลที่เปลี่ยน
//   (สรุปผลกลางคืนใน game.report ก็ใช้รูปแบบเดียวกันนี้)
function addLog(key, ...args) {
  game.log.push({ key, args });
  if (game.log.length > 8) game.log.shift();
}

function formatLogEntry(entry) {
  const resolve = arg => {
    if (Array.isArray(arg)) return formatEffectList(arg);
    if (arg?.item) return tr(getItem(arg.item), 'name');
    if (arg?.items) return arg.items.map(id => tr(getItem(id), 'name')).join(', ');
    if (arg?.riskOf) return tr(getItem(arg.riskOf), 'riskText');
    if (arg?.threat) return tr(getThreat(arg.threat), 'name');
    return arg;
  };
  return t(entry.key, ...entry.args.map(resolve));
}

// ใช้ของแล้วมีผลดีอย่างน้อย 1 อย่างไหม (เช่น อาหารเต็มแล้ว กินอาหารกระป๋องก็ไม่ได้อะไร → ยังไม่จำเป็น)
// ผลดี = ค่าที่ดีขึ้น (ค่าสูงดีต้องยังไม่เต็ม / ค่าสูงแย่ต้องยังไม่เป็น 0) ใช้ได้แม้จะได้ผลไม่เต็มจำนวน
function isItemUseful(item) {
  return Object.entries(item.use ?? {}).some(([key, amount]) => {
    const def = CONFIG.stats[key];
    const isGood = def.higherIsWorse ? amount < 0 : amount > 0;
    if (!isGood) return false;
    const value = game.stats[key];
    return amount > 0 ? value < getStatMax(key, game.stats) : value > 0;
  });
}

// กด "ใช้": ได้ผลทันที ของเสี่ยงสุ่มผลร้าย ใช้หมดแล้วหายจากกระเป๋า
function useItem(index) {
  const entry = game.inventory[index];
  const item = getItem(entry.id);
  if (!item.use || !isItemUseful(item) || !isPlayable()) return;
  const hpBefore = game.stats.hp;
  const ref = { item: item.id };
  addLog('logUsed', ref, applyEffects(item.use));
  if (item.risk) {
    if (Math.random() * 100 < getRiskChance(item)) {
      const effects = applyEffects(item.risk.effects, { kind: 'item', itemId: item.id });
      addLog('logRiskBad', ref, { riskOf: item.id }, effects);
    } else {
      addLog('logRiskSafe', ref);
    }
  }
  entry.usesLeft -= 1;
  if (entry.usesLeft <= 0) game.inventory.splice(index, 1);
  if (isDead()) markDead(); // ของเสี่ยงทำให้ตายได้ทุกช่วงของวัน
  renderGame();
  if (game.lastDamageCause?.kind === 'item' && hpBefore > game.stats.hp) playHitEffect();
}

// เก็บของชิ้นนี้ได้เลยไหม (ไม่ต้องทิ้งอะไร): ของสวมใส่ไม่กินช่อง / ของทั่วไปต้องมีช่องว่าง
function hasRoomFor(itemId) {
  return isWearable(getItem(itemId)) || game.inventory.length < getBagCapacity();
}

// นิสัยขี้เหนียว: ทิ้งของทีไรเครียดเพิ่ม
function addDiscardStress() {
  const discardStress = getCharacterMods(game.character).discardStress ?? 0;
  if (discardStress > 0) addLog('logDiscardStress', changeStat('stress', discardStress));
}

// ข้อความเตือนในกล่องยืนยันการทิ้ง (เฉพาะคนขี้เหนียว)
function discardStressNote() {
  const discardStress = getCharacterMods(game.character).discardStress ?? 0;
  return discardStress > 0 ? ` ${t('stingyNote', discardStress)}` : '';
}

// ทิ้งของในกระเป๋า (ของในกระเป๋าทิ้งได้เสมอ)
function discardItem(index) {
  const item = getItem(game.inventory[index].id);
  game.inventory.splice(index, 1);
  addLog('logDiscarded', { item: item.id });
  addDiscardStress();
  return true;
}

function confirmDiscard(index) {
  const item = getItem(game.inventory[index].id);
  openConfirm(t('discardConfirmTitle', tr(item, 'name')), t('discardConfirmMessage') + discardStressNote(), t('discardConfirmButton'), () => {
    discardItem(index);
    renderGame();
  });
}

// ทิ้งของที่ใส่อยู่ (เช่น กระเป๋าเป้) — ทำไม่ได้ถ้าของในกระเป๋าจะล้นช่องที่เหลือ
function removeWorn(slot) {
  const itemId = game.worn[slot];
  if (!canRemoveWorn(slot)) {
    if (itemId) addLog('logCannotDiscard', { item: itemId });
    return false;
  }
  game.worn[slot] = null;
  addLog('logDiscarded', { item: itemId });
  addDiscardStress();
  return true;
}

function confirmRemoveWorn(slot) {
  if (!canRemoveWorn(slot)) return; // ปุ่มถูกปิดไว้แล้ว กันไว้อีกชั้น
  const item = getItem(game.worn[slot]);
  openConfirm(t('discardConfirmTitle', tr(item, 'name')), t('discardConfirmMessage') + discardStressNote(), t('discardConfirmButton'), () => {
    removeWorn(slot);
    renderGame();
  });
}

// เก็บของตอนเช้า: ชิ้นที่ 2 ขึ้นไปต้องแลกด้วยความเหนื่อย
//   ของสวมใส่ (กระเป๋าเป้) ใส่ทันทีถ้าช่องสวมใส่ว่าง / ของทั่วไปถ้ากระเป๋าเต็มต้องเลือกทิ้งก่อน
function pickOfferItem(offerIndex) {
  const morning = game.morning;
  if (game.phase !== 'morning' || morning.taken.includes(offerIndex) || morning.picks >= CONFIG.loot.maxPicks) return;
  const itemId = morning.offer[offerIndex];
  const item = getItem(itemId);
  if (isWearable(item) && !canWear(item)) return; // ใส่อยู่แล้ว 1 ใบ
  const take = () => {
    if (morning.picks >= 1) addLog('logExtraPickCost', changeStat('fatigue', CONFIG.loot.extraPickFatigue));
    if (isWearable(item)) {
      game.worn[item.wear] = itemId;
      addLog('logWore', { item: itemId }, item.passive?.slots ?? 0);
    } else {
      game.inventory.push(createBagItem(itemId));
      addLog('logPicked', { item: itemId });
    }
    morning.taken.push(offerIndex);
    morning.picks += 1;
    renderGame();
  };
  if (hasRoomFor(itemId)) take();
  else openSwapModal(itemId, take);
}

// กล่องเลือกของที่จะทิ้งเมื่อกระเป๋าเต็ม (แลกของ)
let swapAction = null;

function openSwapModal(newItemId, onTake) {
  const discardStress = getCharacterMods(game.character).discardStress ?? 0;
  const note = discardStress > 0 ? ` <small>${escapeHtml(t('stingyNote', discardStress))}</small>` : '';
  // ตัวเลือกบอกจำนวนที่เหลือของแต่ละชิ้น (กระเป๋าเป้ที่ใส่อยู่ไม่อยู่ในรายการนี้)
  const options = game.inventory.map((entry, index) => {
    const item = getItem(entry.id);
    const left = usesLeftText(item, entry);
    return `<button class="btn btn-small" type="button" data-swap-index="${index}">${itemIconHtml(item)} ${escapeHtml(tr(item, 'name'))}${left ? ` <small>(${escapeHtml(left)})</small>` : ''}</button>`;
  }).join('');
  byId('modal-title').textContent = t('swapTitle');
  byId('modal-message').innerHTML = `${escapeHtml(t('swapMessage', tr(getItem(newItemId), 'name')))}${note}<span class="swap-list">${options}</span>`;
  byId('modal-confirm').hidden = true;
  swapAction = index => {
    discardItem(index);
    onTake();
  };
  showModal();
}

// จำนวนที่เหลือของของ 1 ชิ้น เช่น "เหลือ 2 ครั้ง" (ของใช้ได้ตลอดคืนค่าว่าง)
function usesLeftText(item, entry) {
  if (item.uses === 0) return '';
  return item.use ? t('usesLeftTimes', entry.usesLeft) : t('usesLeftDays', entry.usesLeft);
}

// จบช่วงเช้า: สุ่มว่าคืนนี้อะไรจะบุก (บอกผู้เล่นก่อน จะได้เตรียมตัว)
function endMorning() {
  if (game.phase !== 'morning') return;
  game.phase = 'night';
  game.night = { threatId: rollNightThreat(game.day), useGuns: true };
  renderGame();
}

// ------------------------------------------------------------
// 8.6) กลางคืนและสรุปวัน — สูตรแยกเป็นฟังก์ชันเล็ก ๆ ตัวเลขทั้งหมดอยู่ใน config.js
//      (CONFIG.night, CONFIG.nightThreats, CONFIG.difficultyStages, CONFIG.dayEnd)
// ------------------------------------------------------------

// ปรับค่าด้วยผล % เช่น withPercent(12, 10) → 13.2 (ไม่มีผล = ค่าเดิม)
function withPercent(value, percent) {
  return value * (1 + (percent ?? 0) / 100);
}

function getThreat(id) {
  return findById(CONFIG.nightThreats, id);
}

function isDead() {
  return game.stats.hp <= 0;
}

// คืนนี้เป็นคืนคลื่นซอมบี้ใหญ่ไหม (เริ่มคืนที่ from แล้วทุก every คืน)
function isHordeNight(day) {
  const { from, every } = CONFIG.night.hordeNights;
  return day >= from && (day - from) % every === 0;
}

// ชนิดการบุกของคืนนี้: บอส > คลื่นใหญ่ > ซอมบี้พิเศษ (สุ่มตาม specialChance ของช่วงวัน) > ซอมบี้เร่ร่อน
function rollNightThreat(day) {
  if (CONFIG.night.bossNights.includes(day)) return 'boss';
  if (isHordeNight(day)) return 'horde';
  if (Math.random() * 100 < getStage(day).specialChance) {
    return pickRandom(CONFIG.nightThreats.filter(threat => threat.special)).id;
  }
  return 'wanderers';
}

// ช่วงแรงบุก [ต่ำสุด, สูงสุด] = แรงบุกตามช่วงวัน + แรงบุกเพิ่มของชนิดนั้น + เสียงปืน
function getAttackRange(day, threatId, noise) {
  const [min, max] = getStage(day).nightAttack;
  const extra = getThreat(threatId).attackBonus + noise * CONFIG.night.noiseAttack;
  return [min + extra, max + extra];
}

// การป้องกัน = ความแข็งแรงของที่พัก + ของป้องกันในกระเป๋า แล้วคูณผล defensePower (เช่น ช่างซ่อม +20%)
function calcDefense(inventory, mods) {
  const shelter = CONFIG.night.shelterBase;
  const items = passiveTotal(inventory, 'defense');
  return { shelter, items, total: Math.round(withPercent(shelter + items, mods.defensePower)) };
}

// อาวุธคืนนี้: อาวุธประชิดใช้ได้เสมอ ปืนยิงได้เมื่อกระสุนพอ (ยิงกระบอกที่แรงกว่าก่อน)
// ปืนที่ยิงทำให้เกิดเสียง (noise) และได้ผล ammoPower (เช่น ทหารเกณฑ์ +15%)
function planWeapons(inventory, ammo, useGuns, mods) {
  let melee = 0;
  let gunPower = 0;
  let ammoLeft = ammo;
  let noise = 0;
  const fired = [];
  const silent = [];
  const guns = [];
  inventory.forEach(entry => {
    const passive = getItem(entry.id).passive ?? {};
    if (!passive.weaponPower) return;
    if (passive.ammoPerNight) guns.push(entry.id);
    else melee += passive.weaponPower;
  });
  guns
    .sort((a, b) => getItem(b).passive.weaponPower - getItem(a).passive.weaponPower)
    .forEach(id => {
      const passive = getItem(id).passive;
      if (useGuns && ammoLeft >= passive.ammoPerNight) {
        gunPower += passive.weaponPower;
        ammoLeft -= passive.ammoPerNight;
        noise += passive.noise ?? 0;
        fired.push(id);
      } else {
        silent.push(id);
      }
    });
  const power = melee + Math.round(withPercent(gunPower, mods.ammoPower));
  return { power, ammoUsed: ammo - ammoLeft, noise, fired, silent };
}

// ลดความเสียหายจากหมวก (หลายใบรวมกันได้ไม่เกิน maxDamageReduction %)
function calcDamageReduction(inventory) {
  return Math.min(CONFIG.night.maxDamageReduction, passiveTotal(inventory, 'damageReduction'));
}

// สูตรความเสียหายตอนกลางคืน:
//   (แรงบุก − การป้องกัน − พลังโจมตี) ไม่ต่ำกว่า 0 → ลดด้วยหมวก % → ปรับด้วย zombieDamage + nightDamage ของตัวละคร
function calcNightDamage(attack, defense, weaponPower, reductionPercent, mods) {
  const raw = Math.max(0, attack - defense - weaponPower);
  const afterHelmet = raw * (1 - reductionPercent / 100);
  const characterPercent = (mods.zombieDamage ?? 0) + (mods.nightDamage ?? 0);
  return Math.max(0, Math.round(withPercent(afterHelmet, characterPercent)));
}

// สรุปการรับมือคืนนี้ (ใช้ทั้งแสดงก่อนผ่านคืน และตอนคำนวณจริง)
function getNightPlan() {
  const mods = getCharacterMods(game.character);
  const weapons = planWeapons(game.inventory, game.stats.ammo, game.night.useGuns, mods);
  const defense = calcDefense(game.inventory, mods);
  const reduction = calcDamageReduction(game.inventory);
  const attackRange = getAttackRange(game.day, game.night.threatId, weapons.noise);
  const damageRange = attackRange.map(attack => calcNightDamage(attack, defense.total, weapons.power, reduction, mods));
  return { mods, weapons, defense, reduction, attackRange, damageRange, block: defense.total + weapons.power };
}

// กด "ผ่านคืนนี้": ซอมบี้บุก → เหนื่อยล้าเกินขีด → สิ้นวัน (อาหาร/น้ำ/พักฟื้น) → นอน → ของสึกหรอ
// ถ้าพลังชีวิตหมดกลางทาง ขั้นที่เหลือไม่ทำต่อ สาเหตุการตายจึงเป็นสิ่งที่ทำให้เป็น 0 จริง ๆ
function resolveNight() {
  if (game.phase !== 'night') return;
  const report = [];
  const lost = runZombieAttack(report);
  const steps = [
    () => runExhaustion(report),
    () => runDailyNeeds(report),
    () => runRest(report, lost > 0),
    () => runWear(report),
  ];
  for (const step of steps) {
    if (isDead()) break;
    step();
  }
  game.report = report;
  if (isDead()) markDead();
  else game.phase = 'summary';
  renderGame();
  if (lost > 0) playHitEffect();
  scrollPhaseIntoView();
}

// ซอมบี้บุก: ยิงปืน (ใช้กระสุน) แล้วคำนวณความเสียหาย คืนค่าพลังชีวิตที่เสียจริง
function runZombieAttack(report) {
  const plan = getNightPlan();
  const threat = getThreat(game.night.threatId);
  const attack = randomInt(...plan.attackRange);
  const damage = calcNightDamage(attack, plan.defense.total, plan.weapons.power, plan.reduction, plan.mods);
  if (plan.weapons.ammoUsed > 0) {
    changeStat('ammo', -plan.weapons.ammoUsed);
    report.push({ key: 'reportAmmo', args: [{ items: plan.weapons.fired }, plan.weapons.ammoUsed] });
  }
  const lost = damage > 0 ? -changeStat('hp', -damage, { kind: 'night', threatId: threat.id }) : 0;
  // บอกความเสียหายเต็ม ๆ ของการโจมตี (ตัวเลขจะตรงกับสูตร แม้พลังชีวิตจะเหลือน้อยกว่านั้น)
  report.unshift({ key: 'reportAttack', args: [{ threat: threat.id }, attack, plan.block, damage] });
  return lost;
}

// เหนื่อยจนถึงขีด (เช่น ออกค้นของรอบสองหลายวันติด) → ร่างกายทรุด
function runExhaustion(report) {
  const { exhaustedAt, exhaustDamage } = CONFIG.dayEnd;
  if (game.stats.fatigue < exhaustedAt) return;
  const lost = -changeStat('hp', -exhaustDamage, { kind: 'exhaust' });
  report.push({ key: 'reportExhausted', args: [lost] });
}

// อาหาร/น้ำที่ใช้ต่อวัน (ปรับด้วย foodUse/waterUse ของตัวละคร)
function calcDailyDrain(mods) {
  const { foodDrain, waterDrain } = CONFIG.dayEnd;
  return {
    food: Math.round(withPercent(foodDrain, mods.foodUse)),
    water: Math.round(withPercent(waterDrain, mods.waterUse)),
  };
}

// สิ้นวัน: อาหาร/น้ำลด ถ้าหมดเสียพลังชีวิต ถ้ายังไม่หมดทั้งคู่พลังชีวิตฟื้นเอง
function runDailyNeeds(report) {
  const settings = CONFIG.dayEnd;
  const drain = calcDailyDrain(getCharacterMods(game.character));
  const food = changeStat('food', -drain.food);
  const water = changeStat('water', -drain.water);
  report.push({ key: 'reportNeeds', args: [[['food', food], ['water', water]]] });
  if (game.stats.food === 0) {
    report.push({ key: 'reportStarving', args: [-changeStat('hp', -settings.starveDamage, { kind: 'starve' })] });
  }
  if (!isDead() && game.stats.water === 0) {
    report.push({ key: 'reportThirsty', args: [-changeStat('hp', -settings.thirstDamage, { kind: 'thirst' })] });
  }
  if (!isDead() && game.stats.food > 0 && game.stats.water > 0) {
    const gained = changeStat('hp', settings.regenHp, null, false); // พักฟื้นเอง ไม่ใช่ยา จึงไม่ได้ผล healPower
    if (gained > 0) report.push({ key: 'reportRegen', args: [gained] });
  }
}

// หายเหนื่อยตอนนอน: คืนที่โดนทำร้ายหายน้อยลง, เครียดถึงขีดหายได้แค่บางส่วน, ปรับด้วย restRecovery
function calcRest(hurt, stress, mods) {
  const settings = CONFIG.dayEnd;
  const base = hurt ? settings.restFatigueHurt : settings.restFatigue;
  const factor = stress >= settings.stressedAt ? settings.stressedRestFactor : 1;
  return Math.round(withPercent(base, mods.restRecovery) * factor);
}

// นอน: ความเหนื่อยลด / ความเครียดเพิ่มถ้าโดนทำร้าย ลดถ้าคืนนี้สงบ
function runRest(report, hurt) {
  const settings = CONFIG.dayEnd;
  const stressed = game.stats.stress >= settings.stressedAt;
  const fatigue = changeStat('fatigue', -calcRest(hurt, game.stats.stress, getCharacterMods(game.character)));
  const stress = changeStat('stress', hurt ? settings.stressHurt : -settings.stressCalm);
  report.push({ key: stressed ? 'reportRestStressed' : 'reportRest', args: [[['fatigue', fatigue], ['stress', stress]]] });
}

// ของที่ใช้งานเป็นวัน (อาวุธ ของป้องกัน หมวก ไฟฉาย) ลด 1 ทุกสิ้นวัน หมดแล้วหายจากกระเป๋า
function runWear(report) {
  const broken = [];
  game.inventory = game.inventory.filter(entry => {
    const item = getItem(entry.id);
    if (item.use || item.uses === 0) return true;
    entry.usesLeft -= 1;
    if (entry.usesLeft > 0) return true;
    broken.push(item.id);
    return false;
  });
  if (broken.length > 0) report.push({ key: 'reportBroken', args: [{ items: broken }] });
}

// บันทึกการตาย: วัน ช่วงเวลา และสาเหตุล่าสุดที่ทำให้พลังชีวิตลด (= สาเหตุที่ทำให้เป็น 0)
function markDead() {
  game.death = { day: game.day, phase: game.phase, cause: game.lastDamageCause ?? { kind: 'unknown' } };
  game.phase = 'dead';
}

// ข้อความสาเหตุการตาย (ขั้นที่ 4 จะใช้ในหน้าจอแพ้ด้วย)
function describeCause(cause) {
  switch (cause?.kind) {
    case 'night': {
      const threat = getThreat(cause.threatId);
      if (threat.id === 'horde') return t('causeHorde');
      if (threat.id === 'boss') return t('causeBoss', tr(threat, 'name'));
      return t('causeNight', tr(threat, 'name'));
    }
    case 'starve': return t('causeStarve');
    case 'thirst': return t('causeThirst');
    case 'exhaust': return t('causeExhaust');
    case 'item': return t('causeItem', tr(getItem(cause.itemId), 'name'), tr(getItem(cause.itemId), 'riskText'));
    default: return t('causeUnknown');
  }
}

// กด "เริ่มวันที่ N": ขึ้นวันใหม่ สุ่มของตอนเช้า (วันสุดท้ายผ่านไปแล้ว = รอดครบ)
function startNextDay() {
  if (game.phase !== 'summary') return;
  if (game.day >= CONFIG.totalDays) {
    game.phase = 'won';
  } else {
    game.day += 1;
    game.phase = 'morning';
    game.morning = rollMorningOffer(game.day, game.character, game.inventory);
    game.night = null;
    game.report = null;
    game.log = [];
  }
  renderGame();
  scrollPhaseIntoView();
}

// ซอมบี้ทำร้าย: จอกะพริบแดง + สั่น (ตั้งค่าใน style.css)
function playHitEffect() {
  const flash = byId('hit-flash');
  const screen = byId('screen-game');
  [flash, screen].forEach(element => {
    element.classList.remove('is-hit');
    void element.offsetWidth; // รีเซ็ตแอนิเมชันให้เล่นใหม่ได้
    element.classList.add('is-hit');
  });
}

// จอเล็ก: ถ้าหัวข้อช่วงของวันเลื่อนพ้นจอไปแล้ว เลื่อนกลับมาให้เห็นผล
function scrollPhaseIntoView() {
  const title = byId('phase-title');
  if (title.getBoundingClientRect().top < 0) title.scrollIntoView({ block: 'start' });
}

// เล่นต่อได้ไหม (ตายหรือรอดครบแล้วใช้/ทิ้งของไม่ได้)
function isPlayable() {
  return ['morning', 'night', 'summary'].includes(game.phase);
}

// ไอคอนของ: อีโมจิไปก่อน ถ้าเปิด CONFIG.itemImages จะใช้รูป images/items/<id>.png
function itemIconHtml(item) {
  return CONFIG.itemImages
    ? `<img class="item-icon" src="images/items/${item.id}.png" alt="">`
    : `<span class="item-icon" aria-hidden="true">${item.icon}</span>`;
}

function usesText(item) {
  if (item.use) return t('usesTimes', item.uses);
  return item.uses === 0 ? t('usesPermanent') : t('usesDays', item.uses);
}

// ชิปบอกผลของของ: ผลตอนใช้ / ผลติดตัว / ความเสี่ยง
function renderItemChips(item) {
  const chip = (good, text) => `<span class="chip ${good ? 'chip-good' : 'chip-bad'}">${good ? '✔' : '✘'} ${escapeHtml(text)}</span>`;
  const chips = Object.entries(item.use ?? {}).map(([key, value]) => {
    const def = CONFIG.stats[key];
    return chip(def.higherIsWorse ? value < 0 : value > 0, `${tr(def, 'name')} ${formatSigned(value)}`);
  });
  Object.entries(item.passive ?? {}).forEach(([key, value]) => {
    const info = ITEM_PASSIVE_INFO[key];
    chips.push(chip(info.better === 'up' ? value > 0 : value < 0, `${tr(info, 'name')} ${formatSigned(value)}${info.unit ?? ''}`));
  });
  if (item.risk) {
    const effects = Object.entries(item.risk.effects).map(([key, value]) => `${tr(CONFIG.stats[key], 'name')} ${formatSigned(value)}`).join(', ');
    chips.push(`<span class="chip chip-risk">⚠ ${escapeHtml(t('riskChip', getRiskChance(item), tr(item, 'riskText'), effects))}</span>`);
  }
  return chips.join('');
}

// การ์ดของที่เจอตอนเช้า
function renderOfferCard(itemId, index) {
  const morning = game.morning;
  const item = getItem(itemId);
  const taken = morning.taken.includes(index);
  const wear = isWearable(item); // ของสวมใส่ใช้คำว่า "ใส่" แทน "เก็บ"
  const wornAlready = wear && !taken && !canWear(item);
  const canTake = !taken && !wornAlready && morning.picks < CONFIG.loot.maxPicks;
  const label = taken ? t(wear ? 'wornLabel' : 'takenLabel')
    : wornAlready ? t('wornAlreadyLabel')
    : !canTake ? t('pickFullLabel')
    : morning.picks >= 1 ? t(wear ? 'wearExtraButton' : 'takeExtraButton', CONFIG.loot.extraPickFatigue)
    : t(wear ? 'wearButton' : 'takeButton');
  return `
    <article class="item-card rarity-${item.rarity}${taken ? ' is-taken' : ''}">
      <div class="item-card-head">
        ${itemIconHtml(item)}
        <div>
          <p class="item-name">${escapeHtml(tr(item, 'name'))}</p>
          <p class="item-meta">${escapeHtml(tr(ITEM_TYPES[item.type], 'name'))} · <span class="rarity-label">${escapeHtml(tr(ITEM_RARITIES[item.rarity], 'name'))}</span> · ${escapeHtml(usesText(item))}</p>
        </div>
      </div>
      <p class="item-desc">${escapeHtml(tr(item, 'desc'))}</p>
      <div class="chip-list">${renderItemChips(item)}</div>
      <button class="btn btn-small${canTake ? ' btn-primary' : ''}" type="button" data-action="pick" data-index="${index}"${canTake ? '' : ' disabled'}>${escapeHtml(label)}</button>
    </article>`;
}

// แผงกระเป๋า: ของแต่ละชิ้น + ปุ่มใช้/ทิ้ง + ช่องว่าง
function renderBag() {
  const capacity = getBagCapacity();
  byId('bag-count').textContent = t('bagCount', game.inventory.length, capacity);
  const rows = game.inventory.map((entry, index) => {
    const item = getItem(entry.id);
    const leftText = usesLeftText(item, entry);
    const left = leftText ? ` <small>(${escapeHtml(leftText)})</small>` : '';
    const useButton = !item.use ? ''
      : isItemUseful(item) ? `<button class="btn btn-small btn-primary" type="button" data-action="use" data-index="${index}">${escapeHtml(t('useButton'))}</button>`
      : `<button class="btn btn-small" type="button" disabled title="${escapeHtml(t('notNeededHint'))}">${escapeHtml(t('notNeededButton'))}</button>`;
    const discardButton = `<button class="btn btn-small" type="button" data-action="discard" data-index="${index}">${escapeHtml(t('discardButton'))}</button>`;
    return `
      <li class="bag-item rarity-${item.rarity}" title="${escapeHtml(tr(item, 'desc'))}">
        ${itemIconHtml(item)}
        <span class="bag-item-name">${escapeHtml(tr(item, 'name'))}${left}</span>
        ${isPlayable() ? `<span class="bag-item-actions">${useButton}${discardButton}</span>` : ''}
      </li>`;
  });
  // ช่องว่างแสดงเป็นช่องสี่เหลี่ยมเล็ก ๆ แถวเดียว ไม่กินพื้นที่
  const emptySlots = capacity - game.inventory.length;
  if (emptySlots > 0) {
    const label = escapeHtml(t('bagEmptySlots', emptySlots));
    rows.push(`<li class="bag-empty-row" title="${label}" aria-label="${label}">${'<span class="bag-empty-slot"></span>'.repeat(emptySlots)}</li>`);
  }
  byId('bag-list').innerHTML = rows.join('');
  renderWornSlot();
}

// ส่วนใส่กระเป๋า: แสดงกระเป๋าเป้ที่ใส่อยู่ (+ช่องที่ได้) หรือบอกว่ายังไม่ได้ใส่
function renderWornSlot() {
  const label = `<span class="worn-label">${escapeHtml(tr(ITEM_WEAR_SLOTS.bag, 'name'))}</span>`;
  const itemId = game.worn.bag;
  if (!itemId) {
    byId('bag-worn').innerHTML = `${label}<span class="worn-empty">${escapeHtml(t('wornEmpty'))}</span>`;
    return;
  }
  const item = getItem(itemId);
  const removeButton = !isPlayable() ? ''
    : canRemoveWorn('bag')
      ? `<button class="btn btn-small" type="button" data-action="remove-worn" data-slot="bag">${escapeHtml(t('discardButton'))}</button>`
      : `<button class="btn btn-small" type="button" disabled title="${escapeHtml(t('cannotDiscardHint'))}">${escapeHtml(t('discardButton'))}</button>`;
  byId('bag-worn').innerHTML = `${label}
    <div class="bag-item worn-item rarity-${item.rarity}" title="${escapeHtml(tr(item, 'desc'))}">
      ${itemIconHtml(item)}
      <span class="bag-item-name">${escapeHtml(tr(item, 'name'))} <small>(${escapeHtml(t('wornSlotsBonus', item.passive?.slots ?? 0))})</small></span>
      <span class="bag-item-actions">${removeButton}</span>
    </div>`;
}

// ------------------------------------------------------------
// 9) ลำดับการเล่น
// ------------------------------------------------------------
let game = null;            // เกมที่กำลังเล่น { day, phase, seed, character, stats, inventory, ... }
let revealCharacter = null; // ตัวละครในหน้าสุ่ม (ยังไม่ล็อก กดสุ่มใหม่ได้)

function goToTitle() {
  renderTitle();
  showScreen('title');
}

// ปุ่มเลือกภาษา: เปลี่ยนภาษา จำไว้ แล้ววาดทุกหน้าที่มีข้อมูลใหม่
function changeLanguage(language) {
  if (!TEXT[language] || language === currentLanguage) return;
  currentLanguage = language;
  saveLanguage(language);
  applyStaticTexts();
  renderSoundButton();
  renderTitle();
  if (revealCharacter) renderReveal(revealCharacter);
  if (game) renderGame();
}

// ปุ่ม "เริ่มเกมใหม่": ถ้ามีเกมค้างอยู่ ถามยืนยันก่อน
function onNewGameClick() {
  const savedRun = loadRun();
  if (!savedRun) {
    startNewGame();
    return;
  }
  openConfirm(
    t('newGameConfirmTitle'),
    t('newGameConfirmMessage', getDisplayName(savedRun.character)),
    t('newGameConfirmButton'),
    startNewGame,
  );
}

// เริ่มเกมใหม่: สุ่มตัวละครใหม่ (เกม/เซฟเดิมยังอยู่จนกว่าจะกดเริ่มวันที่ 1 จึงถูกเขียนทับ
// ถ้ากดกลับหน้าหลักก่อน ยังเล่นเกมเดิมต่อได้)
function startNewGame() {
  revealCharacter = generateCharacter();
  renderReveal(revealCharacter);
  showScreen('reveal');
}

// ปุ่ม "สุ่มใหม่": ใช้ได้เฉพาะหน้าเปิดตัวละคร ก่อนเริ่มวันที่ 1 เท่านั้น
function rerollCharacter() {
  if (!revealCharacter) { // revealCharacter มีค่าเฉพาะตอนอยู่หน้าสุ่มตัวละคร
    console.warn('สุ่มตัวละครใหม่ได้เฉพาะตอนเริ่มเกมใหม่ ห้ามสุ่มใหม่กลางเกม');
    return false;
  }
  revealCharacter = generateCharacter();
  renderReveal(revealCharacter);
  return true;
}

// ปุ่ม "กลับหน้าหลัก" ในหน้าสุ่ม: ทิ้งตัวละครที่ยังไม่ล็อก แล้วกลับหน้าแรก (เซฟเดิมไม่หาย)
function backFromReveal() {
  revealCharacter = null;
  goToTitle();
}

// ยืนยันตัวละคร → ล็อก บันทึก แล้วเริ่มวันที่ 1
function startDayOne() {
  if (!revealCharacter) return;
  const character = revealCharacter;
  revealCharacter = null; // จากนี้ไปสุ่มใหม่ไม่ได้แล้ว
  const seed = createRunSeed();
  saveRun(character, seed);
  game = createGame(character, seed);
  renderGame();
  showScreen('game');
}

// ปุ่ม "เล่นต่อ": ถ้าเกมเดิมยังเปิดค้างอยู่ (กดหน้าแรกแล้วกลับมา) เล่นต่อจากเดิมเลย
// ไม่งั้นโหลดตัวละครจากเซฟ (หลังรีเฟรชหน้าจะเริ่มวันที่ 1 ใหม่ — เซฟความคืบหน้าจริงในขั้นที่ 6)
function continueGame() {
  const savedRun = loadRun();
  if (!savedRun) {
    goToTitle();
    return;
  }
  revealCharacter = null;
  if (!game || game.seed !== savedRun.seed) {
    let seed = savedRun.seed;
    if (!Number.isInteger(seed)) { // เซฟรุ่นก่อนยังไม่มีเลขสุ่มประจำเกม → สุ่มให้แล้วเซฟเพิ่ม
      seed = createRunSeed();
      saveRun(savedRun.character, seed);
    }
    game = createGame(savedRun.character, seed);
  }
  renderGame();
  showScreen('game');
}

// สร้างข้อมูลเกมวันที่ 1 จากตัวละคร
// (ขั้นนี้ยังไม่เซฟความคืบหน้ารายวัน: เล่นต่อหลังรีเฟรชจะได้กระเป๋า/ของตอนเช้าใหม่ — เซฟจริงในขั้นที่ 6)
function createGame(character, seed) {
  const inventory = (getOccupation(character.occupationId).startItems ?? []).map(id => createBagItem(id));
  return {
    day: 1,
    phase: 'morning', // morning → night → summary → morning ... / dead / won
    seed,             // เลขสุ่มประจำเกม (ภาพเมือง/สภาพอากาศ)
    character,
    stats: calcStartingStats(character),
    inventorySlots: calcInventorySlots(character),
    inventory,
    worn: { bag: null }, // ของที่ใส่อยู่ (ช่องสวมใส่ → id ของ) เช่น { bag: 'backpack' }
    morning: rollMorningOffer(1, character, inventory),
    night: null,      // { threatId, useGuns } ตั้งตอนจบช่วงเช้า
    report: null,     // สรุปผลกลางคืน/สิ้นวัน (รูปแบบเดียวกับ log)
    log: [],
    lastDamageCause: null, // สาเหตุล่าสุดที่ทำให้พลังชีวิตลด
    death: null,      // { day, phase, cause } เมื่อพลังชีวิตหมด
  };
}

// ------------------------------------------------------------
// 10) ตรวจ config ตอนเปิดเกม — ถ้าพิมพ์ผิดหรือคำแปลขาด จะเตือนใน Console เป็นภาษาไทย
// ------------------------------------------------------------
function validateConfig() {
  const errors = [];
  const checkMods = (owner, mods) => {
    for (const key of Object.keys(mods)) {
      if (!MOD_INFO[key]) errors.push(`${owner}: ไม่รู้จักผล "${key}" (ต้องมีใน MOD_INFO)`);
    }
  };

  CONFIG.ageGroups.forEach(group => checkMods(`ช่วงอายุ ${group.name}`, group.mods));
  for (let age = CONFIG.age.min; age <= CONFIG.age.max; age++) {
    if (!getAgeGroup(age)) errors.push(`อายุ ${age} ไม่อยู่ในช่วงอายุใดเลย (ตรวจ ageGroups)`);
  }

  CONFIG.occupations.forEach(job => {
    checkMods(`อาชีพ ${job.name}`, job.mods);
    const min = Math.max(CONFIG.age.min, job.minAge ?? CONFIG.age.min);
    const max = Math.min(CONFIG.age.max, job.maxAge ?? CONFIG.age.max);
    if (min > max) errors.push(`อาชีพ ${job.name}: ช่วงอายุ ${min}-${max} เป็นไปไม่ได้`);
  });

  CONFIG.traits.forEach(trait => {
    checkMods(`นิสัย ${trait.name}`, trait.mods);
    const effects = Object.entries(trait.mods).filter(([, value]) => value !== 0);
    const hasBad = effects.some(([key, value]) => isBadMod(key, value));
    const hasGood = effects.some(([key, value]) => !isBadMod(key, value));
    if (!hasBad || !hasGood) errors.push(`นิสัย ${trait.name}: ต้องมีทั้งข้อดีและข้อเสีย`);
    (trait.conflicts ?? []).forEach(id => {
      if (!getTrait(id)) errors.push(`นิสัย ${trait.name}: conflicts อ้างถึง "${id}" ที่ไม่มีอยู่`);
    });
  });

  for (const gender of Object.keys(CONFIG.genders)) {
    if (!NAMES[gender]?.length) errors.push(`names.js ไม่มีรายชื่อของเพศ ${gender}`);
    if (!CONFIG.appearance.hairStyles.some(style => style.genders.includes(gender))) {
      errors.push(`ไม่มีทรงผมสำหรับเพศ ${gender}`);
    }
  }

  // แผนที่พิกเซลใน sprites.js ต้องครบทุกตัวเลือก และทุกแถวของภาพเดียวกันยาวเท่ากัน
  const checkPixelRows = (owner, rows, width = PORTRAIT_SIZE) => rows.forEach((row, index) => {
    if (row.length !== width) errors.push(`sprites.js ${owner} แถวที่ ${index}: ยาว ${row.length} ตัว (ต้อง ${width})`);
  });
  const checkPortraitMaps = (owner, options, maps) => options.forEach(option => {
    if (option.id === 'none') return;
    if (!maps[option.id]) errors.push(`${owner} "${option.id}" ยังไม่มีแผนที่พิกเซลใน sprites.js`);
    else checkPixelRows(`${owner}.${option.id}`, maps[option.id]);
  });
  checkPixelRows('PORTRAIT_FACE', PORTRAIT_FACE);
  checkPixelRows('PORTRAIT_FEMALE_DETAILS', PORTRAIT_FEMALE_DETAILS);
  checkPixelRows('PORTRAIT_GLASSES', PORTRAIT_GLASSES);
  checkPortraitMaps('PORTRAIT_HAIR', CONFIG.appearance.hairStyles, PORTRAIT_HAIR);
  checkPortraitMaps('PORTRAIT_BODIES', CONFIG.appearance.bodyTypes, PORTRAIT_BODIES);
  checkPortraitMaps('PORTRAIT_FACIAL_HAIR', CONFIG.appearance.facialHair, PORTRAIT_FACIAL_HAIR);
  [['SCENE_CAR', SCENE_CAR], ['SCENE_CONE', SCENE_CONE], ...SCENE_ZOMBIES.map((rows, index) => [`SCENE_ZOMBIES[${index}]`, rows])]
    .forEach(([owner, rows]) => checkPixelRows(owner, rows, rows[0].length));

  // ของใน items.js
  ITEMS.forEach(item => {
    if (!ITEM_TYPES[item.type]) errors.push(`items.js ${item.id}: ไม่รู้จักประเภท "${item.type}"`);
    if (!ITEM_RARITIES[item.rarity] || CONFIG.loot.rarityWeights[item.rarity] === undefined) {
      errors.push(`items.js ${item.id}: ไม่รู้จักความหายาก "${item.rarity}"`);
    }
    if (!item.use && !item.passive) errors.push(`items.js ${item.id}: ต้องมี use หรือ passive อย่างน้อยหนึ่งอย่าง`);
    [...Object.keys(item.use ?? {}), ...Object.keys(item.risk?.effects ?? {})].forEach(key => {
      if (!CONFIG.stats[key]) errors.push(`items.js ${item.id}: ไม่รู้จักค่าสถานะ "${key}"`);
    });
    Object.keys(item.passive ?? {}).forEach(key => {
      if (!ITEM_PASSIVE_INFO[key]) errors.push(`items.js ${item.id}: ไม่รู้จักผลติดตัว "${key}"`);
    });
    if (item.risk && !item.riskText) errors.push(`items.js ${item.id}: ของเสี่ยงต้องมี riskText`);
    if (item.wear && !ITEM_WEAR_SLOTS[item.wear]) errors.push(`items.js ${item.id}: ไม่รู้จักช่องสวมใส่ "${item.wear}" (ต้องมีใน ITEM_WEAR_SLOTS)`);
    if (item.wear && item.use) errors.push(`items.js ${item.id}: ของสวมใส่ต้องไม่มี use (ใส่แล้วติดตัว ไม่ใช่ของกดใช้)`);
  });
  if (new Set(ITEMS.map(item => item.id)).size !== ITEMS.length) errors.push('items.js: มี id ซ้ำกัน');
  CONFIG.occupations.forEach(job => (job.startItems ?? []).forEach(id => {
    if (!getItem(id)) errors.push(`อาชีพ ${job.name}: ของติดตัว "${id}" ไม่มีใน items.js`);
  }));

  // ภาพประกอบทุกช่วงเวลาต้องมีชุดสีและข้อความอธิบาย
  Object.keys(CONFIG.sceneImages).forEach(phase => {
    if (!SCENE_PALETTES[phase]) errors.push(`ภาพประกอบ "${phase}" ยังไม่มีชุดสีใน SCENE_PALETTES`);
    if (!SCENE_LABEL_KEYS[phase]) errors.push(`ภาพประกอบ "${phase}" ยังไม่มีคีย์ข้อความใน SCENE_LABEL_KEYS`);
  });

  // ช่วงความยาก: ช่วงแรกต้องเริ่มวันที่ 1 และเรียงวันจากน้อยไปมาก
  const stages = CONFIG.difficultyStages;
  if (stages[0]?.fromDay !== 1) errors.push('difficultyStages: ช่วงแรกต้องเริ่ม fromDay: 1');
  stages.forEach((stage, index) => {
    if (index > 0 && stage.fromDay <= stages[index - 1].fromDay) errors.push(`difficultyStages ${stage.id}: fromDay ต้องมากกว่าช่วงก่อนหน้า`);
    const [min, max] = stage.sceneZombies ?? [];
    if (!(min >= 0 && max >= min)) errors.push(`difficultyStages ${stage.id}: sceneZombies ต้องเป็น [น้อยสุด, มากสุด]`);
  });

  // สภาพอากาศ: น้ำหนักต้องมากกว่า 0 และ id ไม่ซ้ำ
  CONFIG.weather.forEach(weather => {
    if (!(weather.weight > 0)) errors.push(`weather ${weather.id}: weight ต้องมากกว่า 0`);
  });
  if (new Set(CONFIG.weather.map(weather => weather.id)).size !== CONFIG.weather.length) errors.push('weather: มี id ซ้ำกัน');
  if (!(CONFIG.sceneNightZombieBonus >= 0)) errors.push('sceneNightZombieBonus ต้องเป็นตัวเลขตั้งแต่ 0 ขึ้นไป');
  if (!(CONFIG.music.volume >= 0 && CONFIG.music.volume <= 1)) errors.push('music.volume ต้องอยู่ระหว่าง 0-1');
  if (!(CONFIG.music.bpm >= 40 && CONFIG.music.bpm <= 200)) errors.push('music.bpm ควรอยู่ระหว่าง 40-200');

  // กลางคืน: แรงบุกของทุกช่วงวัน ชนิดการบุกที่ระบบต้องใช้ และคืนบอสต้องอยู่ในเกม
  stages.forEach(stage => {
    const [min, max] = stage.nightAttack ?? [];
    if (!(min >= 0 && max >= min)) errors.push(`difficultyStages ${stage.id}: nightAttack ต้องเป็น [ต่ำสุด, สูงสุด]`);
    if (!(stage.specialChance >= 0 && stage.specialChance <= 100)) errors.push(`difficultyStages ${stage.id}: specialChance ต้องอยู่ระหว่าง 0-100`);
  });
  ['wanderers', 'horde', 'boss'].forEach(id => {
    if (!getThreat(id)) errors.push(`nightThreats: ต้องมีชนิด "${id}"`);
  });
  if (stages.some(stage => stage.specialChance > 0) && !CONFIG.nightThreats.some(threat => threat.special)) {
    errors.push('nightThreats: มี specialChance แต่ยังไม่มีชนิดที่ special: true');
  }
  if (new Set(CONFIG.nightThreats.map(threat => threat.id)).size !== CONFIG.nightThreats.length) errors.push('nightThreats: มี id ซ้ำกัน');
  CONFIG.night.bossNights.forEach(day => {
    if (day < 1 || day > CONFIG.totalDays) errors.push(`night.bossNights: คืนที่ ${day} อยู่นอกช่วง 1-${CONFIG.totalDays}`);
  });
  Object.entries(CONFIG.dayEnd).forEach(([key, value]) => {
    if (!(typeof value === 'number' && value >= 0)) errors.push(`dayEnd.${key} ต้องเป็นตัวเลขตั้งแต่ 0 ขึ้นไป`);
  });

  // คำแปลต้องครบทุกภาษา: ข้อความหน้าจอใน lang.js และชื่อ/คำอธิบายใน config.js, names.js
  const otherLanguages = Object.keys(TEXT).filter(language => language !== DEFAULT_LANGUAGE);
  for (const language of otherLanguages) {
    Object.keys(TEXT[DEFAULT_LANGUAGE]).forEach(key => {
      if (TEXT[language][key] === undefined) errors.push(`lang.js: ภาษา ${language} ไม่มีข้อความ "${key}"`);
    });
    const checkTranslation = (owner, entry) => ['name', 'desc', 'riskText'].forEach(field => {
      if (entry[field] !== undefined && entry[language]?.[field] === undefined) {
        errors.push(`${owner}: ยังไม่มีคำแปล ${language}.${field}`);
      }
    });
    Object.entries(CONFIG.stats).forEach(([key, stat]) => checkTranslation(`ค่าสถานะ ${key}`, stat));
    Object.entries(CONFIG.genders).forEach(([key, gender]) => checkTranslation(`เพศ ${key}`, gender));
    CONFIG.ageGroups.forEach(group => checkTranslation(`ช่วงอายุ ${group.id}`, group));
    CONFIG.occupations.forEach(job => checkTranslation(`อาชีพ ${job.id}`, job));
    CONFIG.traits.forEach(trait => checkTranslation(`นิสัย ${trait.id}`, trait));
    CONFIG.difficultyStages.forEach(stage => checkTranslation(`ช่วงความยาก ${stage.id}`, stage));
    CONFIG.weather.forEach(weather => checkTranslation(`สภาพอากาศ ${weather.id}`, weather));
    CONFIG.nightThreats.forEach(threat => checkTranslation(`ชนิดการบุก ${threat.id}`, threat));
    Object.entries(MOD_INFO).forEach(([key, info]) => checkTranslation(`MOD_INFO ${key}`, info));
    ITEMS.forEach(item => checkTranslation(`ของ ${item.id}`, item));
    [ITEM_TYPES, ITEM_RARITIES, ITEM_PASSIVE_INFO, ITEM_WEAR_SLOTS].forEach(table => {
      Object.entries(table).forEach(([key, entry]) => checkTranslation(`items.js ${key}`, entry));
    });
    Object.entries(CONFIG.appearance).forEach(([group, options]) => {
      if (Array.isArray(options)) options.forEach(option => checkTranslation(`รูปลักษณ์ ${group}.${option.id}`, option));
    });
    Object.values(NAMES).flat().forEach(name => {
      if (!name[language]) errors.push(`names.js: ชื่อ ${name.th} ยังไม่มีคำอ่าน ${language}`);
    });
  }

  errors.forEach(message => console.error('[config]', message));
  return errors;
}

// ------------------------------------------------------------
// 10.5) เพลงพื้นหลัง: ปุ่มลำโพงมุมขวาบน (ตัวสร้างเพลงอยู่ใน audio.js)
//       จำว่าเปิด/ปิดไว้ใน localStorage คีย์ zombie100.sound ('on' / 'off')
// ------------------------------------------------------------
const STORAGE_KEY_SOUND = 'zombie100.sound';
let soundEnabled = loadSoundSetting();

function loadSoundSetting() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_SOUND);
    return saved === null ? CONFIG.music.enabledByDefault : saved === 'on';
  } catch (error) {
    return CONFIG.music.enabledByDefault;
  }
}

function saveSoundSetting(enabled) {
  try {
    localStorage.setItem(STORAGE_KEY_SOUND, enabled ? 'on' : 'off');
  } catch (error) {
    console.warn('[เพลง] บันทึกการตั้งค่าเสียงไม่ได้', error);
  }
}

// ไอคอนลำโพง: 🔊 = เปิดอยู่ (กดเพื่อปิด) / 🔇 = ปิดอยู่ (กดเพื่อเปิด)
function renderSoundButton() {
  const button = byId('sound-toggle');
  const label = soundEnabled ? t('soundMute') : t('soundUnmute');
  button.hidden = !isMusicSupported();
  button.textContent = soundEnabled ? '🔊' : '🔇';
  button.title = label;
  button.setAttribute('aria-label', label);
  button.setAttribute('aria-pressed', String(soundEnabled));
}

// กดปุ่มลำโพง: เปิด ↔ ปิด
// (ตั้งเปิดไว้แต่ยังไม่ได้ยินเพราะเบราว์เซอร์รอให้คลิกก่อน → กดครั้งนี้เริ่ม/ปลุกเพลงแทนการปิด)
function onSoundToggle() {
  if (soundEnabled && !isMusicAudible()) {
    if (isMusicPlaying()) resumeMusic();
    else startMusic();
    return;
  }
  soundEnabled = !soundEnabled;
  saveSoundSetting(soundEnabled);
  if (soundEnabled) startMusic();
  else stopMusic();
  renderSoundButton();
}

// เบราว์เซอร์ยอมให้มีเสียงหลังผู้เล่นคลิก/กดแป้น → เริ่มเพลงตอนนั้น (ถ้าตั้งเปิดไว้)
function startMusicOnGesture(event) {
  if (event.type === 'keydown' && event.key === 'Escape') return; // Esc ไม่นับเป็นการอนุญาตให้มีเสียง
  if (event.target.closest?.('#sound-toggle')) return;            // ปุ่มลำโพงจัดการเอง
  if (!soundEnabled || isMusicAudible()) return;
  if (isMusicPlaying()) resumeMusic();
  else startMusic();
}

// ------------------------------------------------------------
// 11) ผูกปุ่ม แล้วเริ่มที่หน้าแรก
// ------------------------------------------------------------
function bindEvents() {
  byId('btn-new-game').addEventListener('click', onNewGameClick);
  byId('btn-continue').addEventListener('click', continueGame);
  byId('btn-reroll').addEventListener('click', rerollCharacter);
  byId('btn-reveal-back').addEventListener('click', backFromReveal);
  byId('btn-start-day').addEventListener('click', startDayOne);
  byId('btn-home').addEventListener('click', goToTitle);
  byId('sound-toggle').addEventListener('click', onSoundToggle);
  document.addEventListener('click', startMusicOnGesture);
  document.addEventListener('keydown', startMusicOnGesture);
  document.querySelectorAll('[data-language]').forEach(button => {
    button.addEventListener('click', () => changeLanguage(button.dataset.language));
  });
  byId('modal-cancel').addEventListener('click', closeConfirm);
  byId('modal-confirm').addEventListener('click', () => {
    const action = confirmAction;
    closeConfirm();
    if (action) action();
  });
  byId('modal').addEventListener('click', event => {
    if (event.target === byId('modal')) closeConfirm(); // คลิกพื้นหลังเพื่อปิด
    const swapButton = event.target.closest('[data-swap-index]');
    if (swapButton && !swapButton.disabled && swapAction) {
      const action = swapAction;
      closeConfirm();
      action(Number(swapButton.dataset.swapIndex));
    }
  });
  // ปุ่มในการ์ดของตอนเช้าและในกระเป๋า (สร้างใหม่ทุกครั้งที่วาด จึงดักที่กล่องแม่)
  byId('phase-body').addEventListener('click', event => {
    const button = event.target.closest('button[data-action]');
    if (!button || !game) return;
    const action = button.dataset.action;
    if (action === 'pick') pickOfferItem(Number(button.dataset.index));
    if (action === 'end-morning') endMorning();
    if (action === 'resolve-night') resolveNight();
    if (action === 'next-day') startNextDay();
    if (action === 'new-game') onNewGameClick();
  });
  // ติ๊ก "ยิงปืนคืนนี้" แล้ววาดตัวเลขคาดการณ์ใหม่
  byId('phase-body').addEventListener('change', event => {
    if (event.target.dataset.action !== 'toggle-guns' || game?.phase !== 'night') return;
    game.night.useGuns = event.target.checked;
    renderPhase();
  });
  byId('bag-list').addEventListener('click', event => {
    const button = event.target.closest('[data-action]');
    if (!button || !game || !isPlayable()) return;
    if (button.dataset.action === 'use') useItem(Number(button.dataset.index));
    if (button.dataset.action === 'discard') confirmDiscard(Number(button.dataset.index));
  });
  byId('bag-worn').addEventListener('click', event => {
    const button = event.target.closest('[data-action="remove-worn"]');
    if (button && game && isPlayable()) confirmRemoveWorn(button.dataset.slot);
  });
  document.addEventListener('keydown', event => {
    if (byId('modal').hidden) return;
    if (event.key === 'Escape') closeConfirm();
    if (event.key === 'Tab') trapModalFocus(event);
  });
}

function init() {
  validateConfig();
  bindEvents();
  applyStaticTexts();
  renderSoundButton();
  goToTitle();
}

init();
