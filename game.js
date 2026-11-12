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
//    zombie100.save = เกมที่บันทึกไว้ (มีได้ 1 เกม) { version: 3, savedAt, rev, game }
//       game = สถานะเกมทั้งหมด (วัน ช่วงของวัน ค่าสถานะ กระเป๋า ของตอนเช้า บันทึกของวัน สถิติ)
//       ผู้เล่นกด "บันทึกและออก" เอง ได้เฉพาะตอนเริ่มวันใหม่ (ช่วงเช้าก่อนทำอะไร) — ดู canSaveNow
//       ตายหรือรอดครบแล้วเซฟของเกมนั้นถูกลบ (จบถาวร)
//       rev = เลขรุ่น เพิ่มทุกครั้งที่บันทึก ใช้รู้ว่าเซฟถูกบันทึกจากแท็บอื่นหลังจากที่แท็บนี้โหลดมาไหม
//    zombie100.slot1-5 = เซฟรุ่นก่อน (บันทึกอัตโนมัติ) / zombie100.run = เซฟรุ่นเก่ากว่า (มีแค่ตัวละคร)
//       ย้ายเป็นเซฟแบบใหม่ให้ตอนเปิดเกม (ถ้ายังไม่มีเซฟ) แล้วลบคีย์เก่า
//    zombie100.best = สถิติดีที่สุดข้ามเกม
// ------------------------------------------------------------
const SAVE_VERSION = 3;
const STORAGE_KEY_SAVE = 'zombie100.save';
const STORAGE_KEY_OLD_RUN = 'zombie100.run';
const OLD_RUN_VERSION = 1;
const OLD_SLOT_VERSION = 2;
const OLD_SLOT_KEYS = [1, 2, 3, 4, 5].map(slot => `zombie100.slot${slot}`);
const GAME_PHASES = ['morning', 'event', 'night', 'summary', 'dead', 'won'];

function readStorage(key) {
  try {
    return localStorage.getItem(key);
  } catch (error) {
    console.warn('[เซฟ] อ่าน localStorage ไม่ได้', error);
    return null;
  }
}

function removeStorage(key) {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.warn('[เซฟ] ลบข้อมูลใน localStorage ไม่ได้', error);
  }
}

// บันทึกเกม (สำเร็จ = true)
function writeSave(state, rev, savedAt = Date.now()) {
  const data = { version: SAVE_VERSION, savedAt, rev, game: state };
  try {
    localStorage.setItem(STORAGE_KEY_SAVE, JSON.stringify(data));
    return true;
  } catch (error) {
    console.warn('[เซฟ] บันทึกลง localStorage ไม่ได้', error);
    return false;
  }
}

// อ่านเซฟ → { status: 'empty' } / { status: 'broken' } / { status: 'saved', savedAt, rev, game }
function loadSave() {
  const raw = readStorage(STORAGE_KEY_SAVE);
  if (!raw) return { status: 'empty' };
  try {
    const data = JSON.parse(raw);
    const state = data?.version === SAVE_VERSION ? restoreGame(data.game) : null;
    if (state && !state.result) {
      return { status: 'saved', savedAt: data.savedAt, rev: Number.isInteger(data.rev) ? data.rev : 0, game: state };
    }
  } catch (error) {
    // JSON เสีย: ไปแจ้งเตือนด้านล่าง
  }
  console.warn('[เซฟ] เซฟเสียหายหรือไม่ตรงกับ config ปัจจุบัน จึงไม่นำมาใช้');
  return { status: 'broken' };
}

function deleteSave() {
  removeStorage(STORAGE_KEY_SAVE);
}

// ตรวจเกมที่โหลดมา และเติมช่องที่เซฟรุ่นก่อนยังไม่มี (ใช้ไม่ได้ เช่น id ของหายไปจาก config → null)
function restoreGame(saved) {
  if (!saved || typeof saved !== 'object' || !isValidCharacter(saved.character)) return null;
  if (!GAME_PHASES.includes(saved.phase) || !Number.isInteger(saved.seed)) return null;
  if (!Number.isInteger(saved.day) || saved.day < 1 || saved.day > CONFIG.totalDays) return null;
  const base = createGame(saved.character, saved.seed);
  const state = { ...base, ...saved, stats: { ...base.stats, ...saved.stats }, tally: { ...base.tally, ...saved.tally } };
  const isNumber = value => typeof value === 'number' && Number.isFinite(value);
  const isBagEntry = entry => Boolean(entry && getItem(entry.id)) && Number.isInteger(entry.usesLeft);
  const wornItem = state.worn?.bag ? getItem(state.worn.bag) : null;
  const checks = [
    Object.keys(base.stats).every(key => isNumber(state.stats[key])),
    Array.isArray(state.inventory) && state.inventory.every(isBagEntry),
    !state.worn?.bag || Boolean(wornItem && isWearable(wornItem)),
    Array.isArray(state.log) && Array.isArray(state.eventHistory),
    state.phase !== 'morning' || (Array.isArray(state.morning?.offer) && state.morning.offer.every(id => getItem(id))),
    state.phase !== 'event' || Boolean(getEvent(state.event?.id)),
    state.phase !== 'night' || Boolean(getThreat(state.night?.threatId)),
    !['dead', 'won'].includes(state.phase) || Boolean(state.result),
    state.phase !== 'dead' || Boolean(state.death),
  ];
  return checks.every(Boolean) ? state : null;
}

// ย้ายเซฟรุ่นก่อนเป็นเซฟแบบใหม่ (ทำเฉพาะตอนยังไม่มีเซฟ) แล้วลบคีย์เก่าทั้งหมด
//   1) ช่องเซฟบันทึกอัตโนมัติ (zombie100.slot1-5): เอาเกมที่ยังเล่นอยู่และบันทึกล่าสุด (เกมที่จบแล้วทิ้ง)
//   2) เซฟรุ่นเก่ากว่า (zombie100.run มีแค่ตัวละคร): เริ่มวันที่ 1 ด้วยตัวละครเดิม
function migrateOldSaves() {
  let migrated = readStorage(STORAGE_KEY_SAVE) !== null;
  const candidates = OLD_SLOT_KEYS.map(key => {
    try {
      const data = JSON.parse(readStorage(key));
      const state = data?.version === OLD_SLOT_VERSION && data.status === 'playing' ? restoreGame(data.game) : null;
      return state && !state.result ? { state, savedAt: Number(data.savedAt) || 0 } : null;
    } catch (error) {
      return null;
    }
  }).filter(Boolean).sort((a, b) => b.savedAt - a.savedAt);
  if (!migrated && candidates.length > 0) migrated = writeSave(candidates[0].state, 1, candidates[0].savedAt || Date.now()); // คงเวลาบันทึกเดิม
  if (!migrated) {
    try {
      const run = JSON.parse(readStorage(STORAGE_KEY_OLD_RUN));
      if (run?.version === OLD_RUN_VERSION && run.status === 'playing' && isValidCharacter(run.character)) {
        writeSave(createGame(run.character, Number.isInteger(run.seed) ? run.seed : createRunSeed()), 1);
      }
    } catch (error) {
      console.warn('[เซฟ] เซฟรุ่นเก่าเสียหาย จึงไม่นำมาใช้', error);
    }
  }
  [...OLD_SLOT_KEYS, STORAGE_KEY_OLD_RUN].forEach(key => {
    if (readStorage(key) !== null) removeStorage(key);
  });
}

// สุ่มเลขประจำเกมใหม่ (จำนวนเต็มบวก 32 บิต) — ใช้สุ่มภาพเมือง/สภาพอากาศของแต่ละวัน และใช้ระบุว่าเป็นเกมไหน
function createRunSeed() {
  return Math.floor(Math.random() * 0x100000000) >>> 0;
}

// สถิติดีที่สุด (เก็บข้ามเกม) คีย์ zombie100.best:
//   { version, bestDay: วันที่ไปได้ไกลสุด, wins: จำนวนครั้งที่รอดครบ, runs: จำนวนเกมที่เล่นจบ (ตายหรือรอด) }
const STORAGE_KEY_BEST = 'zombie100.best';
const BEST_VERSION = 1;

function createEmptyBest() {
  return { version: BEST_VERSION, bestDay: 0, wins: 0, runs: 0 };
}

// โหลดสถิติดีที่สุด ถ้าไม่มีหรือข้อมูลเสียจะได้ค่าว่าง (ยังไม่เคยเล่นจบ)
function loadBest() {
  try {
    const best = JSON.parse(localStorage.getItem(STORAGE_KEY_BEST));
    const isCount = value => Number.isInteger(value) && value >= 0;
    if (best?.version === BEST_VERSION && isCount(best.bestDay) && isCount(best.wins) && isCount(best.runs)) {
      return { ...best, bestDay: Math.min(best.bestDay, CONFIG.totalDays) };
    }
  } catch (error) {
    console.warn('[สถิติ] อ่านสถิติดีที่สุดไม่ได้', error);
  }
  return createEmptyBest();
}

function saveBest(best) {
  try {
    localStorage.setItem(STORAGE_KEY_BEST, JSON.stringify(best));
  } catch (error) {
    console.warn('[สถิติ] บันทึกสถิติดีที่สุดไม่ได้', error);
  }
}

// รวมผลเกมที่เพิ่งจบเข้ากับสถิติเดิม (ไม่แก้ของเดิม คืนสถิติใหม่)
function mergeBest(best, dayReached, won) {
  return {
    version: BEST_VERSION,
    bestDay: Math.max(best.bestDay, dayReached),
    wins: best.wins + (won ? 1 : 0),
    runs: best.runs + 1,
  };
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
// 7.1) ภาพประกอบช่วงของวัน — วาดภาพพิกเซลเมืองร้างลง canvas แบบเคลื่อนไหว (ใช้แทนรูปจริงไปก่อน)
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

// ------------------------------------------------------------
// ภาพเคลื่อนไหว: ส่วนที่ไม่ขยับ (ฟ้า ตึก ถนน) วาดครั้งเดียวเป็นชั้น ๆ เก็บไว้
// ส่วนที่ขยับ (ดาว เมฆ อีกา ไฟหน้าต่าง ควัน ไฟถนน ซอมบี้ ฝน หมอก) วาดใหม่ทุกเฟรม
// ตำแหน่งตั้งต้นยังสุ่มจากเลขประจำเกม+วัน ภาพวันเดิมจึงหน้าตาเดิม ส่วนการขยับใช้ Math.random (มีผลแค่ภาพ)
// ------------------------------------------------------------
const SCENE_FPS = 8;                  // ภาพต่อวินาที (ขยับทีละเฟรมแบบเกมพิกเซล)
const SCENE_EVENT_GAP = [40, 110];    // เหตุการณ์เล็ก ๆ ห่างกันกี่เฟรม (8 เฟรม = 1 วินาที)
const SMOKE_PUFFS = 10;
const SMOKE_FLOW = 0.1;               // ก้อนควันเลื่อนขึ้นกี่ช่องต่อเฟรม
const SCENE_ZOMBIE_WALK = SCENE_ZOMBIES.map((rows, index) => [rows, SCENE_ZOMBIE_STEPS[index]]);

// สุ่มด้วย Math.random (ใช้กับการขยับที่ไม่ต้องซ้ำเดิม)
function randomInt(min, max) {
  return randomBetween(Math.random, min, max);
}

// ของที่เลื่อนพ้นขอบขวาให้กลับมาเข้าทางซ้าย (และกลับกัน) width = ความกว้างของสิ่งนั้น
function wrapSceneX(x, width) {
  const span = SCENE_WIDTH + width * 2;
  return ((((x + width) % span) + span) % span) - width;
}

// สร้างชั้นภาพนิ่งขนาดเท่าภาพจริง (พื้นโปร่งใส) แล้ววาดลงไปทันที
function createSceneLayer(draw) {
  const layer = document.createElement('canvas');
  layer.width = SCENE_WIDTH;
  layer.height = SCENE_HEIGHT;
  draw(layer.getContext('2d'));
  return layer;
}

// ---------- ท้องฟ้า ----------
// ดาวกลางคืน: บางดวงกะพริบหรี่ลงแวบหนึ่ง
// random เป็นตัวสุ่มแยก ตึกจะได้ตำแหน่งเดิมทั้งเช้าและกลางคืน
function makeStars(random) {
  return Array.from({ length: 45 }, () => ({
    x: randomBetween(random, 0, SCENE_WIDTH - 1),
    y: randomBetween(random, 0, 40),
    dim: 0, // เหลืออีกกี่เฟรมที่หรี่อยู่
  }));
}

function drawStars(ctx, colors, stars) {
  stars.forEach(star => {
    ctx.globalAlpha = star.dim > 0 ? 0.3 : 1;
    fillPixels(ctx, colors.star, star.x, star.y);
  });
  ctx.globalAlpha = 1;
}

// พระจันทร์มีแสงเรือง (วาดทับดาว)
function drawMoon(ctx, colors) {
  fillPixelCircle(ctx, 60, 20, 15, colors.moonGlow[0]);
  fillPixelCircle(ctx, 60, 20, 11, colors.moonGlow[1]);
  fillPixelCircle(ctx, 60, 20, 7, colors.moonShade);
  fillPixelCircle(ctx, 58, 19, 6, colors.moon);
}

// เมฆเป็นริ้วยาว ท้องเมฆโดนแดดเช้า ลอยไปทางขวาช้า ๆ (ก้อนที่อยู่สูงลอยเร็วกว่านิดหน่อย)
function makeClouds(random) {
  return Array.from({ length: 5 }, () => {
    const length = randomBetween(random, 18, 48);
    const left = randomBetween(random, -10, SCENE_WIDTH - 20);
    const y = randomBetween(random, 6, 34);
    const tail = random() < 0.5;
    return { length, left, y, tail, speed: 0.16 - y * 0.003 };
  });
}

function drawClouds(ctx, colors, clouds, frame) {
  clouds.forEach(cloud => {
    const { length, y } = cloud;
    const left = Math.round(wrapSceneX(cloud.left + cloud.speed * frame, length + 2));
    fillPixels(ctx, colors.cloud[0], left + 6, y - 1, Math.floor(length * 0.55), 1);
    fillPixels(ctx, colors.cloud[1], left, y, length, 1);
    fillPixels(ctx, colors.cloud[2], left + 3, y + 1, Math.floor(length * 0.8), 1);
    if (cloud.tail) fillPixels(ctx, colors.cloud[1], left + length - 6, y - 1, 8, 1);
  });
}

// ฟ้าครึ้ม/ฝนตก: ฟ้าหม่น + เมฆหนาเป็นแถบ ๆ (ชั้นหลัง วาดก่อนตึก) เลื่อนช้า ๆ
function makeOvercast(random, weatherId) {
  if (weatherId !== 'cloudy' && weatherId !== 'rain') return [];
  return Array.from({ length: 7 }, () => {
    const y = randomBetween(random, 0, 26);
    const x = randomBetween(random, -30, SCENE_WIDTH - 20);
    const length = randomBetween(random, 40, 90);
    return { x, y, length, speed: 0.05 + (y % 3) * 0.02 };
  });
}

function drawOvercast(ctx, colors, strips, frame) {
  if (strips.length === 0) return;
  fillPixels(ctx, 'rgba(40, 36, 52, 0.35)', 0, 0, SCENE_WIDTH, SCENE_GROUND);
  strips.forEach(strip => {
    const x = Math.round(wrapSceneX(strip.x + strip.speed * frame, strip.length));
    fillPixels(ctx, colors.cloud[0], x, strip.y, strip.length, 3);
    fillPixels(ctx, colors.cloud[1], x + 6, strip.y + 3, strip.length - 12, 1);
  });
}

// ฟ้าแลบ: สายฟ้าซิกแซกหลังตึก (เส้นขาวต่อกันเป็นสาย + แสงเรืองรอบ ๆ)
function drawBolt(ctx, bolt) {
  bolt.points.forEach(point => fillPixels(ctx, 'rgba(200, 190, 255, 0.35)', point.x - 1, point.y - 1, 3, 5));
  bolt.points.forEach((point, index) => {
    fillPixels(ctx, '#f4f0ff', point.x, point.y, 1, 3);
    const next = bolt.points[index + 1];
    if (next && next.x !== point.x) fillPixels(ctx, '#f4f0ff', Math.min(point.x, next.x), point.y + 2, Math.abs(next.x - point.x) + 1, 1);
  });
}

// อีกา: ปีกยก = ตัว v / ปีกลง = ตัว ^ (ตัวใหญ่มีปลายปีกเพิ่มข้างละจุด)
function makeCrows(random) {
  return Array.from({ length: 4 }, () => {
    const x = randomBetween(random, 20, SCENE_WIDTH - 20);
    const y = randomBetween(random, 8, 26);
    const big = random() < 0.5;
    return { x, y, big, dir: Math.random() < 0.5 ? -1 : 1, speed: 0.25 + Math.random() * 0.3, flap: randomInt(0, 3) };
  });
}

function drawCrow(ctx, color, x, y, wingsUp, big) {
  const points = wingsUp ? [[0, 0], [1, 1], [2, 0]] : [[0, 1], [1, 0], [2, 1]];
  if (big) points.push(...(wingsUp ? [[-1, -1], [3, -1]] : [[-1, 2], [3, 2]]));
  points.forEach(([dx, dy]) => fillPixels(ctx, color, x + dx, y + dy));
}

function drawCrows(ctx, colors, crows, frame) {
  crows.forEach(crow => {
    const wingsUp = Math.floor((frame + crow.flap) / 2) % 2 === 0;
    drawCrow(ctx, colors.crow, Math.round(crow.x), crow.y, wingsUp, crow.big);
  });
}

// ---------- ตึก ----------
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

// ตึกชั้นกลาง: หน้าต่างดับ/ติดไฟ/ไฟไหม้ มีถังน้ำและเสาอากาศบนหลังคา
// จดตำแหน่งหน้าต่างลง windows (ไว้ทำไฟกะพริบ) และคืนตำแหน่งหลังคาตึกที่ไฟไหม้ไว้ใช้วาดควัน
function drawMidBuildings(ctx, random, colors, windows) {
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
        const kind = roll < 0.03 ? 'fire' : roll < 0.2 ? 'lit' : 'dark';
        if (kind === 'fire') onFire = true;
        fillPixels(ctx, { fire: colors.fireWindow, lit: colors.litWindow, dark: colors.window }[kind], windowX, windowY, 2, 3);
        windows[kind].push({ x: windowX, y: windowY, w: 2, h: 3 });
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

// ตึกแถวริมถนน: หน้าต่างชั้นบน ระเบียง ป้ายร้าน และประตูม้วนที่ปิดตาย (จดหน้าต่างลง windows)
function drawShophouses(ctx, random, colors, windows) {
  let x = -randomBetween(random, 0, 12);
  while (x < SCENE_WIDTH) {
    const width = randomBetween(random, 20, 28);
    const top = SCENE_GROUND - randomBetween(random, 17, 22);
    fillPixels(ctx, colors.shophouse, x, top, width, SCENE_GROUND - top);
    fillPixels(ctx, colors.shophouseLight, x, top, 1, SCENE_GROUND - top);
    fillPixels(ctx, colors.shophouseLight, x, top, width, 1);
    for (const windowX of [x + 4, x + width - 9]) { // หน้าต่างชั้นบน 2 บาน
      fillPixels(ctx, colors.shophouseLight, windowX - 1, top + 2, 6, 6);
      const lit = random() < 0.25;
      fillPixels(ctx, lit ? colors.litWindow : colors.window, windowX, top + 3, 4, 4);
      windows[lit ? 'lit' : 'dark'].push({ x: windowX, y: top + 3, w: 4, h: 4 });
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

// ไฟหน้าต่างติด ๆ ดับ ๆ: เลือกบานที่เปิดไฟอยู่บางบาน (ดับแวบ/ดับนาน) + บานมืดบางบาน (เปิดไฟแป๊บหนึ่ง)
function makeWindowFlickers(windows) {
  const pick = (list, count) => [...list].sort(() => Math.random() - 0.5).slice(0, count);
  return [
    ...pick(windows.lit, 6).map(spot => ({ ...spot, lit: true, toggled: 0 })),
    ...pick(windows.dark, 4).map(spot => ({ ...spot, lit: false, toggled: 0 })),
  ];
}

// toggled = เหลืออีกกี่เฟรมที่บานนี้สลับจากปกติ (ติด → ดับ / ดับ → ติด)
function stepWindowFlicker(spot) {
  if (spot.toggled > 0) {
    spot.toggled--;
    return;
  }
  const roll = Math.random();
  if (spot.lit && roll < 0.012) spot.toggled = randomInt(1, 4);         // ไฟตกแวบเดียว
  else if (spot.lit && roll < 0.014) spot.toggled = randomInt(20, 60);  // ปิดไฟไปพักหนึ่ง
  else if (!spot.lit && roll < 0.004) spot.toggled = randomInt(16, 48); // มีคนเปิดไฟแป๊บหนึ่ง
}

function drawWindowFlickers(ctx, colors, spots) {
  spots.forEach(spot => {
    if (spot.toggled > 0) fillPixels(ctx, spot.lit ? colors.window : colors.litWindow, spot.x, spot.y, spot.w, spot.h);
  });
}

// หน้าต่างที่ไฟไหม้: สีไฟเปลี่ยนทุกเฟรม + เปลวไฟเลียขอบหน้าต่างด้านบน
function drawFireWindows(ctx, colors, spots) {
  spots.forEach(spot => {
    const roll = Math.random();
    const color = roll < 0.35 ? colors.fireBright : roll < 0.6 ? colors.fireDim : colors.fireWindow;
    fillPixels(ctx, color, spot.x, spot.y, spot.w, spot.h);
    if (Math.random() < 0.55) fillPixels(ctx, colors.fireBright, spot.x + randomInt(0, spot.w - 1), spot.y - 1);
  });
}

// ควันลอยจากตึกที่ไหม้ (เอียงไปทางขวาตามลม): สุ่มเส้นทางไว้ แล้วให้ก้อนควันไหลขึ้นตามเส้นทางทีละนิด
function makeSmoke(random, originX, originY) {
  const points = [];
  let x = originX;
  let y = originY;
  for (let puff = 0; puff < SMOKE_PUFFS; puff++) {
    points.push({ x, y });
    x += randomBetween(random, 2, 4);
    y -= randomBetween(random, 3, 5);
  }
  points.push({ x, y }); // ปลายทาง: ก้อนบนสุดค่อย ๆ จางหายตรงนี้
  return points;
}

function drawSmoke(ctx, colors, points, frame) {
  const flow = frame * SMOKE_FLOW;
  const shift = flow % 1;
  const cycle = Math.floor(flow);
  for (let i = 0; i < SMOKE_PUFFS; i++) {
    const position = i + shift;
    const index = Math.floor(position);
    const blend = position - index;
    const from = points[index];
    const to = points[index + 1];
    // ก้อนล่างสุดค่อย ๆ โผล่ ก้อนบนสุดค่อย ๆ จาง
    ctx.globalAlpha = position < 1 ? position : position > SMOKE_PUFFS - 2 ? (SMOKE_PUFFS - position) / 2 : 1;
    const color = colors.smoke[(((i - cycle) % 2) + 2) % 2]; // สีติดไปกับก้อนเดิมตอนเลื่อน
    fillPixelCircle(ctx, Math.round(from.x + (to.x - from.x) * blend), Math.round(from.y + (to.y - from.y) * blend),
      2 + Math.floor(position / 2), color);
  }
  ctx.globalAlpha = 1;
}

// ---------- ถนน ----------
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

// เสาไฟริมทาง (หัวโคมงอ) อยู่ในชั้นนิ่ง ส่วนแสงไฟวาดทุกเฟรม
function drawLampPole(ctx, colors, x) {
  fillPixels(ctx, colors.lampPole, x, SCENE_GROUND - 24, 1, 27);
  fillPixels(ctx, colors.lampPole, x + 1, SCENE_GROUND - 25, 4, 1);
  fillPixels(ctx, colors.lampPole, x + 5, SCENE_GROUND - 24, 1, 1);
}

// ไฟใกล้เสีย: นาน ๆ ทีจะกะพริบติด ๆ ดับ ๆ เป็นชุด (pattern = ติด/ดับของเฟรมถัด ๆ ไป)
function stepLamp(lamp) {
  if (lamp.pattern.length > 0) {
    lamp.on = lamp.pattern.shift();
    return;
  }
  lamp.on = true;
  if (Math.random() < 0.025) lamp.pattern = Array.from({ length: randomInt(3, 8) }, () => Math.random() < 0.4);
}

function drawLampLight(ctx, colors, lamp) {
  if (!lamp.on) return;
  fillPixelCircle(ctx, lamp.x + 5, SCENE_GROUND - 22, 3, colors.lampGlow);
  fillPixels(ctx, colors.lampLight, lamp.x + 4, SCENE_GROUND - 23, 3, 1);
}

// ---------- ซอมบี้ ----------
// ซอมบี้บนทางเท้าและถนน จำนวนตามช่วงความยาก + ซอมบี้พิเศษตัวโต + บอส (เรียงตัวไกลก่อน ตัวใกล้วาดทับทีหลัง)
// baseCount = จำนวนซอมบี้ธรรมดาของวันนั้น, bonusPercent = เพิ่มกี่ % (ตอนกลางคืน จึงมากกว่าตอนเช้าเสมอ)
// เดินโซเซสลับกับยืนนิ่ง ตัวโตเดินช้ากว่า เดินพ้นขอบภาพแล้ววนกลับมาอีกฝั่ง
function makeSceneZombies(random, colors, stage, baseCount, bonusPercent) {
  const count = Math.round(baseCount * (1 + bonusPercent / 100));
  const makeZombie = (palette, scale) => {
    const x = randomBetween(random, 4, SCENE_WIDTH - 6 * scale - 4);
    const feetY = randomBetween(random, SCENE_GROUND + 3, SCENE_HEIGHT - 2);
    const variant = randomBetween(random, 0, SCENE_ZOMBIES.length - 1);
    const mirrored = random() < 0.5;
    const facing = SCENE_ZOMBIE_FACING[variant];
    const walking = Math.random() < 0.6;
    return {
      x, feetY, variant, palette, scale,
      dir: mirrored ? -facing : facing,
      speed: (0.22 + Math.random() * 0.2) * (scale === 1 ? 1 : scale === 2 ? 0.7 : 0.5),
      state: walking ? 'walk' : 'idle',
      timer: walking ? randomInt(24, 72) : randomInt(8, 32),
      phase: randomInt(0, 3), // ก้าวเท้าไม่พร้อมกันทุกตัว
    };
  };
  const zombies = Array.from({ length: count },
    () => makeZombie(colors.zombies[randomBetween(random, 0, colors.zombies.length - 1)], 1));
  for (let i = 0; i < stage.specialZombies; i++) zombies.push(makeZombie(colors.specialZombie, 2));
  if (stage.boss) zombies.push(makeZombie(colors.boss, 3));
  return zombies.sort((a, b) => a.feetY - b.feetY);
}

// state: walk = เดิน / idle = ยืนนิ่ง / look = หันมามองจอ
function stepZombie(zombie) {
  zombie.timer--;
  if (zombie.state === 'walk') zombie.x = wrapSceneX(zombie.x + zombie.dir * zombie.speed, 6 * zombie.scale);
  if (zombie.timer > 0) return;
  if (zombie.state === 'walk') {
    zombie.state = 'idle';
    zombie.timer = randomInt(8, 32);
  } else {
    zombie.state = 'walk';
    zombie.timer = randomInt(24, 72);
    if (Math.random() < 0.35) zombie.dir *= -1; // หันกลับไปเดินอีกทาง
  }
}

function drawSceneZombies(ctx, zombies, frame) {
  zombies.forEach(zombie => {
    let rows = SCENE_ZOMBIE_FRONT;
    if (zombie.state !== 'look') {
      const step = zombie.state === 'walk' ? Math.floor((frame + zombie.phase) / (zombie.scale + 1)) % 2 : 0;
      rows = SCENE_ZOMBIE_WALK[zombie.variant][step];
    }
    const top = Math.min(zombie.feetY, SCENE_HEIGHT - 1) - rows.length * zombie.scale + 1;
    const mirrored = zombie.state !== 'look' && zombie.dir !== SCENE_ZOMBIE_FACING[zombie.variant];
    drawMiniSprite(ctx, rows, zombie.palette, Math.round(zombie.x), top, mirrored, zombie.scale);
  });
}

// ---------- อากาศชั้นหน้า (วาดทับทุกอย่าง): ฝน / หมอก ----------
function makeRain(random, weatherId) {
  if (weatherId !== 'rain') return [];
  return Array.from({ length: 170 }, () => ({ x: randomBetween(random, 0, SCENE_WIDTH), y: randomBetween(random, 0, SCENE_HEIGHT) }));
}

// สายฝนตกเฉียงลงซ้าย ตกพ้นขอบล่างแล้วกลับไปเริ่มด้านบน
function stepRain(drop) {
  drop.y += 6;
  drop.x -= 2;
  if (drop.y > SCENE_HEIGHT) drop.y -= SCENE_HEIGHT + 6;
  drop.x = ((drop.x % SCENE_WIDTH) + SCENE_WIDTH) % SCENE_WIDTH;
}

function makeFog(random, weatherId) {
  if (weatherId !== 'fog') return [];
  return Array.from({ length: 9 }, () => { // ก้อนหมอกลอยเป็นริ้ว
    const y = randomBetween(random, SCENE_GROUND - 30, SCENE_HEIGHT - 6);
    const x = randomBetween(random, -40, SCENE_WIDTH - 40);
    const width = randomBetween(random, 50, 110);
    return { x, y, width, speed: 0.08 + Math.random() * 0.1 };
  });
}

function drawWeatherFront(ctx, model) {
  if (model.weatherId === 'rain') {
    fillPixels(ctx, 'rgba(20, 24, 40, 0.25)', 0, 0, SCENE_WIDTH, SCENE_HEIGHT);
    model.rain.forEach(drop => {
      const x = Math.round(drop.x);
      const y = Math.round(drop.y);
      fillPixels(ctx, 'rgba(170, 190, 230, 0.45)', x, y, 1, 3);
      fillPixels(ctx, 'rgba(170, 190, 230, 0.3)', x - 1, y + 3, 1, 2);
    });
  }
  if (model.weatherId === 'fog') {
    // หมอกจางทั้งภาพ + หนาที่สุดตรงแนวพื้นถนน แล้วค่อย ๆ จางขึ้นบน/ลงล่าง
    fillPixels(ctx, 'rgba(165, 160, 175, 0.18)', 0, 0, SCENE_WIDTH, SCENE_HEIGHT);
    for (let y = SCENE_GROUND - 36; y < SCENE_HEIGHT; y++) {
      const thickness = 1 - Math.abs(y - SCENE_GROUND) / 36;
      fillPixels(ctx, `rgba(190, 185, 200, ${(0.42 * Math.max(0, thickness)).toFixed(3)})`, 0, y, SCENE_WIDTH, 1);
    }
    model.fog.forEach(strip => {
      const x = Math.round(wrapSceneX(strip.x + strip.speed * model.frame, strip.width));
      fillPixels(ctx, 'rgba(210, 205, 220, 0.16)', x, strip.y, strip.width, 3);
    });
  }
}

// ---------- เหตุการณ์เล็ก ๆ เป็นพัก ๆ: ฟ้าแลบ (ฝนตก) / ฝูงอีกาบินผ่าน / ซอมบี้หันมามองจอ ----------
function startLightning(model) {
  const points = [];
  const length = randomInt(28, 44);
  let x = randomInt(20, SCENE_WIDTH - 20);
  for (let y = 0; y < length; y += 3) {
    points.push({ x, y });
    x += randomInt(-2, 2);
  }
  model.bolt = { points, frames: 2 };
  model.flash = [0.5, 0.12, 0.35, 0.08]; // ฟ้าสว่างวาบ 2 จังหวะ
}

function startFlock(model) {
  const dir = Math.random() < 0.5 ? 1 : -1;
  const startX = dir > 0 ? -8 : SCENE_WIDTH + 8;
  const baseY = randomInt(8, 22);
  model.flock = Array.from({ length: randomInt(5, 8) }, (_, i) => {
    const rank = Math.ceil(i / 2); // บินเป็นรูปตัว V: ตัวนำอยู่หน้า ที่เหลือเยื้องบน/ล่างตามหลัง
    return {
      x: startX - dir * (rank * 6 + randomInt(0, 2)),
      y: baseY + rank * (i % 2 ? 2 : -2),
      big: Math.random() < 0.5,
      dir,
      speed: 2.4,
      flap: randomInt(0, 3),
    };
  });
}

function startZombieLook(model) {
  const candidates = model.zombies.filter(zombie => zombie.state !== 'look'
    && zombie.x > 0 && zombie.x < SCENE_WIDTH - 6 * zombie.scale);
  if (candidates.length === 0) return;
  const zombie = candidates[randomInt(0, candidates.length - 1)];
  zombie.state = 'look';
  zombie.timer = randomInt(20, 32);
}

function runSceneEvents(model) {
  if (model.frame < model.nextEvent) return;
  model.nextEvent = model.frame + randomInt(...SCENE_EVENT_GAP);
  const events = [startZombieLook];
  if (model.weatherId === 'rain') events.push(startLightning);
  if (model.birds && model.flock.length === 0) events.push(startFlock);
  events[randomInt(0, events.length - 1)](model);
}

// ---------- ประกอบภาพ ----------
// วาดภาพเมืองร้างของวันนั้น: ช่วงเวลา (เช้า/กลางคืน) + สภาพอากาศ + ช่วงความยาก
// runSeed = เลขสุ่มประจำเกม: ถนนเดิมทั้งเช้าและกลางคืน แต่ละวัน/แต่ละเกมหน้าตาต่างกัน
// ซอมบี้สุ่มแยกตามช่วงเวลา กลางคืนจึงมีจำนวนและตำแหน่งต่างจากตอนเช้า
// (ลำดับการสุ่มต้องเหมือนเดิมทุกครั้ง ภาพวันเดิมจึงออกมาเหมือนเดิม)
function buildScene(phase, day, runSeed) {
  const colors = SCENE_PALETTES[phase] ?? SCENE_PALETTES.morning;
  const seeded = salt => createSeededRandom(mixSeed(runSeed, day, salt));
  const random = seeded(SEED_SALT.city);
  const weather = getWeather(day, runSeed);
  const stage = getStage(day);
  const isNight = phase === 'night';
  const showSkyLight = !weather.coversSky; // ฟ้าครึ้ม/ฝนตก: เมฆบังหมด
  const sky = createSceneLayer(ctx => drawSky(ctx, colors));
  const stars = showSkyLight && colors.moon ? makeStars(seeded(SEED_SALT.sky)) : [];
  const light = createSceneLayer(ctx => {
    if (!showSkyLight) return;
    if (colors.moon) drawMoon(ctx, colors);
    else drawSun(ctx, colors);
  });
  const clouds = makeClouds(random);
  const overcast = makeOvercast(seeded(SEED_SALT.clouds), weather.id);
  const crows = weather.birds !== false ? makeCrows(random) : [];
  const midWindows = { lit: [], dark: [], fire: [] };
  let fires = [];
  const city = createSceneLayer(ctx => {
    drawFarSkyline(ctx, random, colors);
    fires = drawMidBuildings(ctx, random, colors, midWindows);
  });
  for (let i = 0; i < stage.extraFires; i++) fires.push({ x: randomBetween(random, 10, SCENE_WIDTH - 30), y: SCENE_GROUND - randomBetween(random, 24, 40) });
  const smokes = fires.slice(0, 2 + stage.extraFires).map(fire => makeSmoke(random, fire.x, fire.y));
  const shopWindows = { lit: [], dark: [] };
  let lampX = 0;
  const street = createSceneLayer(ctx => {
    drawShophouses(ctx, random, colors, shopWindows);
    drawStreet(ctx, random, colors);
    lampX = randomBetween(random, 30, SCENE_WIDTH - 40);
    drawLampPole(ctx, colors, lampX);
    const carX = randomBetween(random, 10, SCENE_WIDTH - 40);
    drawMiniSprite(ctx, SCENE_CAR, colors.car, carX, SCENE_GROUND + 7, random() < 0.5);
    drawMiniSprite(ctx, SCENE_CONE, colors.cone, carX + 28, SCENE_GROUND + 12, false);
  });
  // จำนวนพื้นฐานสุ่มครั้งเดียวต่อวัน (เช้า/กลางคืนใช้ร่วมกัน) ส่วนตำแหน่งสุ่มแยกตามช่วงเวลา
  const baseCount = randomBetween(seeded(SEED_SALT.zombieCount), ...stage.sceneZombies);
  const zombieRandom = seeded(isNight ? SEED_SALT.nightZombies : SEED_SALT.morningZombies);
  return {
    colors: { ...colors, fireBright: shadeColor(colors.fireWindow, 0.35), fireDim: shadeColor(colors.fireWindow, -0.3) },
    weatherId: weather.id,
    birds: weather.birds !== false,
    layers: { sky, light, city, street },
    stars,
    clouds,
    overcast,
    crows,
    flock: [],
    smokes,
    windows: { mid: makeWindowFlickers(midWindows), shop: makeWindowFlickers(shopWindows), fire: midWindows.fire },
    lamp: { x: lampX, on: true, pattern: [] },
    zombies: makeSceneZombies(zombieRandom, colors, stage, baseCount, isNight ? CONFIG.sceneNightZombieBonus : 0),
    rain: makeRain(seeded(SEED_SALT.rain), weather.id),
    fog: makeFog(seeded(SEED_SALT.rain), weather.id),
    bolt: null,
    flash: [],
    flashAlpha: 0,
    frame: 0,
    nextEvent: randomInt(24, 80),
  };
}

// ขยับทุกอย่างไป 1 เฟรม (เมฆ หมอก ควัน คำนวณตำแหน่งจากเลขเฟรมตอนวาด)
function stepScene(model) {
  model.frame++;
  if (model.bolt && --model.bolt.frames <= 0) model.bolt = null;
  model.stars.forEach(star => {
    if (star.dim > 0) star.dim--;
    else if (Math.random() < 0.006) star.dim = randomInt(1, 3);
  });
  model.crows.forEach(crow => { crow.x = wrapSceneX(crow.x + crow.dir * crow.speed, 4); });
  model.flock.forEach(bird => { bird.x += bird.dir * bird.speed; });
  model.flock = model.flock.filter(bird => (bird.dir > 0 ? bird.x < SCENE_WIDTH + 6 : bird.x > -6));
  model.windows.mid.forEach(stepWindowFlicker);
  model.windows.shop.forEach(stepWindowFlicker);
  stepLamp(model.lamp);
  model.zombies.forEach(stepZombie);
  model.rain.forEach(stepRain);
  runSceneEvents(model);
  model.flashAlpha = model.flash.shift() ?? 0;
}

// วาด 1 เฟรม เรียงจากไกลไปใกล้
function drawSceneFrame(ctx, model) {
  const { colors, layers, frame } = model;
  ctx.clearRect(0, 0, SCENE_WIDTH, SCENE_HEIGHT);
  ctx.drawImage(layers.sky, 0, 0);
  drawStars(ctx, colors, model.stars);
  ctx.drawImage(layers.light, 0, 0);
  drawClouds(ctx, colors, model.clouds, frame);
  drawOvercast(ctx, colors, model.overcast, frame);
  if (model.bolt) drawBolt(ctx, model.bolt);
  drawCrows(ctx, colors, model.crows, frame);
  drawCrows(ctx, colors, model.flock, frame);
  ctx.drawImage(layers.city, 0, 0);
  drawWindowFlickers(ctx, colors, model.windows.mid);
  drawFireWindows(ctx, colors, model.windows.fire);
  model.smokes.forEach(points => drawSmoke(ctx, colors, points, frame));
  ctx.drawImage(layers.street, 0, 0);
  drawWindowFlickers(ctx, colors, model.windows.shop);
  drawLampLight(ctx, colors, model.lamp);
  drawSceneZombies(ctx, model.zombies, frame);
  drawWeatherFront(ctx, model);
  if (model.flashAlpha > 0) fillPixels(ctx, `rgba(225, 228, 255, ${model.flashAlpha})`, 0, 0, SCENE_WIDTH, SCENE_HEIGHT);
}

// ภาพที่กำลังแสดง: ช่วงเวลา/วัน/เกมเดิมไม่สร้างใหม่ ซอมบี้จึงเดินต่อจากที่เดิม ไม่กระโดดทุกครั้งที่กดปุ่ม
const sceneView = { key: null, model: null, running: false, lastTime: 0 };

function showAnimatedScene(canvas, phase, day, runSeed) {
  const key = `${phase}:${day}:${runSeed}`;
  if (sceneView.key !== key) {
    sceneView.key = key;
    sceneView.model = buildScene(phase, day, runSeed);
    canvas.width = SCENE_WIDTH;
    canvas.height = SCENE_HEIGHT;
    drawSceneFrame(canvas.getContext('2d'), sceneView.model);
  }
  startSceneLoop();
}

// เล่นภาพเคลื่อนไหว: หยุดเองเมื่อออกจากหน้าเล่นเกม (แท็บที่ถูกซ่อน เบราว์เซอร์พัก requestAnimationFrame ให้เอง)
// ผู้เล่นที่ตั้ง "ลดการเคลื่อนไหว" ไว้ เห็นเป็นภาพนิ่งเหมือนเดิม
function startSceneLoop() {
  if (sceneView.running || prefersReducedMotion()) return;
  sceneView.running = true;
  sceneView.lastTime = performance.now();
  requestAnimationFrame(sceneTick);
}

function sceneTick(now) {
  const canvas = byId('phase-scene');
  if (!sceneView.running || !sceneView.model || canvas.hidden || byId('screen-game').hidden || prefersReducedMotion()) {
    sceneView.running = false;
    return;
  }
  if (now - sceneView.lastTime >= 1000 / SCENE_FPS) {
    sceneView.lastTime = now;
    stepScene(sceneView.model);
    drawSceneFrame(canvas.getContext('2d'), sceneView.model);
  }
  requestAnimationFrame(sceneTick);
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
  byId('scene-weather').innerHTML = iconLabel(weather.icon, tr(weather, 'name'));
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
    showAnimatedScene(canvas, phase, day, runSeed);
    canvas.setAttribute('aria-label', label);
  }
}

// ------------------------------------------------------------
// 8) แสดงผลบนหน้าจอ
// ------------------------------------------------------------
function byId(id) {
  return document.getElementById(id);
}

// สลับหน้าจอ: title / reveal / game / end
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
  // data-icon = ไอคอนพิกเซลหน้าข้อความ (เช่น ปุ่มสุ่มใหม่)
  document.querySelectorAll('[data-i18n]').forEach(element => {
    const text = t(element.dataset.i18n);
    if (element.dataset.icon) element.innerHTML = iconLabel(element.dataset.icon, text);
    else element.textContent = text;
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

// ------------------------------------------------------------
// ไอคอนพิกเซล (แผนที่พิกเซลอยู่ใน icons.js): แปลงเป็นภาพ SVG ครั้งเดียวแล้วจำไว้
// ------------------------------------------------------------
const iconUrlCache = new Map();

// ชั้นของไอคอน: ไอคอนชั้นเดียว = รายการแถว / หลายชั้น = รายการของชั้น
function getIconLayers(id) {
  const icon = PIXEL_ICONS[id];
  return typeof icon[0] === 'string' ? [icon] : icon;
}

// รวมทุกชั้นเป็นตาราง 16x16 ของสี (null = โปร่งใส)
function buildIconGrid(id) {
  const grid = Array.from({ length: ICON_SIZE }, () => Array(ICON_SIZE).fill(null));
  getIconLayers(id).forEach(rows => rows.forEach((row, y) => {
    [...row].forEach((ch, x) => {
      if (ICON_COLORS[ch] && y < ICON_SIZE && x < ICON_SIZE) grid[y][x] = ICON_COLORS[ch];
    });
  }));
  return grid;
}

// ภาพ SVG ของไอคอน (พิกเซลสีเดียวกันที่ติดกันในแถวรวมเป็นสี่เหลี่ยมเดียว ไฟล์จะได้เล็ก)
function iconUrl(id) {
  if (!iconUrlCache.has(id)) {
    let rects = '';
    buildIconGrid(id).forEach((row, y) => {
      for (let x = 0; x < ICON_SIZE;) {
        const color = row[x];
        let end = x + 1;
        while (end < ICON_SIZE && row[end] === color) end++;
        if (color) rects += `<rect x="${x}" y="${y}" width="${end - x}" height="1" fill="${color}"/>`;
        x = end;
      }
    });
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${ICON_SIZE} ${ICON_SIZE}" shape-rendering="crispEdges">${rects}</svg>`;
    iconUrlCache.set(id, `data:image/svg+xml,${encodeURIComponent(svg)}`);
  }
  return iconUrlCache.get(id);
}

// แท็กรูปไอคอนสำหรับใส่ใน innerHTML: scale 1 = 16px, 2 = 32px, 3 = 48px (เท่าตัวพอดี พิกเซลจะคม)
// ไอคอนเป็นแค่ภาพประกอบ ข้อความข้าง ๆ บอกความหมายอยู่แล้ว จึงซ่อนจากโปรแกรมอ่านหน้าจอ
function iconHtml(id, scale = 1, extraClass = '') {
  if (!PIXEL_ICONS[id]) return ''; // ไม่มีไอคอนนี้ (validateConfig เตือนใน Console แล้ว)
  const classes = ['px-icon', scale > 1 ? `px-icon-${scale}x` : '', extraClass].filter(Boolean).join(' ');
  return `<img class="${classes}" src="${iconUrl(id)}" alt="" aria-hidden="true" draggable="false">`;
}

// ข้อความที่มีไอคอนอยู่กลางประโยค: ส่ง ICON_SLOT แทนตำแหน่งไอคอนเข้าไปใน t(...) แล้วแทนด้วยรูปหลัง escape
//   เช่น withIcon(t('nightThreat', ICON_SLOT, name), 'zombie') → "คืนนี้: [รูป] ซอมบี้เร่ร่อน"
const ICON_SLOT = '\u0001';
function withIcon(text, iconId, scale = 1) {
  return escapeHtml(text).replace(ICON_SLOT, iconHtml(iconId, scale));
}

// ไอคอน + ข้อความ (escape ข้อความให้แล้ว)
function iconLabel(iconId, text, scale = 1) {
  return `${iconHtml(iconId, scale)} ${escapeHtml(text)}`;
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
    return `<span class="chip ${bad ? 'chip-bad' : 'chip-good'}">${iconLabel(bad ? 'cross' : 'check', formatMod(key, value))}</span>`;
  }).join('');
}

// กล่องผลของแหล่งหนึ่ง (ช่วงอายุ / อาชีพ / นิสัย)
// icon = ชื่อไอคอนพิกเซลหน้าหัวข้อ (ไม่ใส่ก็ได้)
function renderEffectBlock(title, desc, mods, icon = null) {
  return `
    <p class="effect-title">${icon ? iconLabel(icon, title) : escapeHtml(title)}</p>
    <p class="effect-desc">${escapeHtml(desc)}</p>
    <div class="chip-list">${renderModChips(mods)}</div>`;
}

// หน้าแรก: มีเกมที่บันทึกไว้ → การ์ดเซฟ (เล่นต่อ / เริ่มเกมใหม่) / ไม่มี → ปุ่ม "เริ่มเกม" ตามปกติ
// เคยเล่นจบแล้วโชว์สถิติดีที่สุด
function renderTitle() {
  const save = loadSave();
  const hasSave = save.status === 'saved';
  byId('save-heading').hidden = !hasSave;
  byId('save-card').innerHTML = hasSave ? renderSaveCard(save)
    : save.status === 'broken'
      ? `<p class="save-broken">${escapeHtml(t('saveBroken'))} <button class="btn btn-small" type="button" data-save-action="delete">${escapeHtml(t('deleteSaveButton'))}</button></p>`
      : '';
  byId('btn-start-game').hidden = hasSave;
  if (hasSave) drawCharacter(byId('save-card').querySelector('canvas'), save.game.character);
  const best = loadBest();
  byId('title-best').hidden = best.runs === 0;
  byId('title-best').innerHTML = iconLabel('trophy', t('bestLine', best.bestDay, best.wins, best.runs));
}

// ชื่อช่วงของวัน (เซฟรุ่นก่อนอาจค้างอยู่กลางวัน)
const PHASE_NAME_KEYS = { morning: 'phaseMorning', event: 'phaseEvent', night: 'phaseNight', summary: 'phaseSummary' };

// เวลาที่บันทึก เช่น "12 พ.ย. 2569 14:03" / "12 Nov 2026, 14:03"
function formatSavedAt(savedAt) {
  if (!Number.isFinite(savedAt)) return '';
  return new Date(savedAt).toLocaleString(currentLanguage === 'th' ? 'th-TH' : 'en-GB', { dateStyle: 'medium', timeStyle: 'short' });
}

// การ์ดเกมที่บันทึกไว้: รูป ชื่อ อายุ/อาชีพ วันที่ เวลาบันทึก + ปุ่มเล่นต่อ / เริ่มเกมใหม่
function renderSaveCard({ savedAt, game: saved }) {
  const { character } = saved;
  const occupation = getOccupation(character.occupationId);
  const job = t('characterAgeJob', character.age, t('formerJob', getOccupationName(occupation, character.gender)));
  const button = (action, label, primary) =>
    `<button class="btn btn-small${primary ? ' btn-primary' : ''}" type="button" data-save-action="${action}">${escapeHtml(label)}</button>`;
  return `
    <div class="slot is-playing">
      <div class="sprite-frame slot-frame"><canvas class="sprite sprite-small" role="img" aria-label="${escapeHtml(getDisplayName(character))}"></canvas></div>
      <div class="slot-info">
        <p class="slot-title">${escapeHtml(getDisplayName(character))} <small>${escapeHtml(job)}</small></p>
        <p class="slot-progress">${escapeHtml(t('slotProgress', saved.day, t(PHASE_NAME_KEYS[saved.phase])))}</p>
        <p class="slot-time">${escapeHtml(t('slotSavedAt', formatSavedAt(savedAt)))}</p>
      </div>
      <div class="slot-actions">${button('continue', t('continueButton'), true)}${button('new', t('newGameButton'), false)}${button('delete', t('deleteSaveButton'), false)}</div>
    </div>`;
}

// ปุ่ม "ลบเซฟ": ถามยืนยันก่อน (ลบแล้วกู้คืนไม่ได้) แล้ววาดหน้าแรกใหม่
function confirmDeleteSave() {
  const save = loadSave();
  if (save.status === 'empty') return;
  const message = save.status === 'saved'
    ? t('deleteSaveMessage', getDisplayName(save.game.character), save.game.day)
    : t('deleteBrokenSaveMessage');
  openConfirm(t('deleteSaveTitle'), message, t('deleteSaveConfirm'), () => {
    deleteSave();
    renderTitle();
  });
}

// หน้า "คุณถูกสุ่มเกิดเป็น..."
function renderReveal(character) {
  const occupation = getOccupation(character.occupationId);
  const occupationName = getOccupationName(occupation, character.gender);
  const ageGroup = getAgeGroup(character.age);

  drawCharacter(byId('reveal-sprite'), character);
  byId('reveal-name').textContent = getDisplayName(character);
  byId('reveal-basic').textContent = t('genderAge', tr(CONFIG.genders[character.gender], 'name'), character.age);
  byId('reveal-occupation').innerHTML = iconLabel(occupation.icon, t('formerJob', occupationName));
  byId('reveal-look').textContent = describeLook(character.look).join(' · ');

  byId('reveal-age').innerHTML = renderEffectBlock(
    t('ageRange', tr(ageGroup, 'name'), ageGroup.minAge, ageGroup.maxAge), tr(ageGroup, 'desc'), ageGroup.mods);
  byId('reveal-job').innerHTML = renderEffectBlock(
    occupationName, tr(occupation, 'desc'), occupation.mods, occupation.icon);
  byId('reveal-traits').innerHTML = character.traitIds
    .map(id => getTrait(id))
    .map(trait => `<article class="trait-card">${renderEffectBlock(tr(trait, 'name'), tr(trait, 'desc'), trait.mods, trait.icon)}</article>`)
    .join('');
  byId('reveal-stats').innerHTML = renderStartingStats(character);

  replayAnimation(byId('reveal-card'));
}

// ค่าเริ่มต้นทั้งหมด + ส่วน "ดูที่มาของตัวเลข"
function renderStartingStats(character) {
  const stats = calcStartingStats(character);
  const items = Object.entries(CONFIG.stats).map(([key, def]) => `
    <li class="start-stat stat-${key}">
      <span class="start-stat-name">${iconLabel(def.icon, tr(def, 'name'))}</span>
      <span class="start-stat-value"><b>${stats[key]}</b> / ${getStatMax(key, stats)}</span>
    </li>`);
  items.push(`
    <li class="start-stat">
      <span class="start-stat-name">${iconLabel('backpack', t('slotsLabel'))}</span>
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
  byId('btn-save').hidden = !canSaveNow(); // ปุ่มบันทึกโผล่เฉพาะตอนเริ่มวันใหม่
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
          <span class="stat-name">${iconHtml(def.icon)} ${name}</span>
          <span class="stat-value">${value} / ${max}</span>
        </div>
        <div class="stat-bar" role="progressbar" aria-label="${name}"
             aria-valuemin="0" aria-valuemax="${max}" aria-valuenow="${value}">
          <div class="stat-fill" style="width: ${percent}%"></div>
        </div>
      </li>`;
  }).join('');
  showStatChanges();
}

// ---------- เอฟเฟกต์ (ขั้นที่ 7): ตัวเลขเด้งตอนค่าเปลี่ยน / จอมืดตอนเปลี่ยนช่วง ----------
let lastStatsSnapshot = null; // { game, stats } ค่าสถานะตอนวาดแผงครั้งก่อน
let lastPhaseKey = null;      // ช่วงของวันที่เล่นจอมืดไปแล้ว (วาดช่วงเดิมซ้ำ เช่น เปลี่ยนภาษา จะไม่เล่นอีก)
const FLOAT_NUM_MS = 1100;
const FLOAT_NUM_DELAY_MS = 1750; // ถ้าจอมืดกำลังเล่น รอให้เกือบสว่างก่อนค่อยเด้งตัวเลข
const PHASE_FADE_MS = 2000;      // มืดลง 0.3 วิ → ค้างชื่อช่วง 1 วิ → สว่าง 0.7 วิ (ต้องตรงกับ .phase-fade ใน style.css)

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function currentPhaseKey() {
  return `${game.seed}:${game.day}:${game.phase}`;
}

// ตัวเลข +/− ลอยขึ้นข้างค่าที่เปลี่ยน (เทียบกับตอนวาดครั้งก่อนของเกมเดียวกัน เปิดเกม/โหลดเซฟไม่เด้ง)
function showStatChanges() {
  const previous = lastStatsSnapshot;
  lastStatsSnapshot = { game, stats: { ...game.stats } };
  if (!previous || previous.game !== game || prefersReducedMotion()) return;
  const list = byId('stats-list');
  const panel = list.closest('.panel-stats');
  const delay = currentPhaseKey() !== lastPhaseKey ? FLOAT_NUM_DELAY_MS : 0;
  Object.entries(CONFIG.stats).forEach(([key, def]) => {
    const diff = game.stats[key] - previous.stats[key];
    if (diff === 0) return;
    const value = list.querySelector(`[data-stat="${key}"] .stat-value`);
    const good = def.higherIsWorse ? diff < 0 : diff > 0;
    const popup = document.createElement('span');
    popup.className = `float-num ${good ? 'is-good' : 'is-bad'}`;
    popup.textContent = formatSigned(diff);
    popup.setAttribute('aria-hidden', 'true');
    // วางชิดซ้ายของตัวเลข "ค่า / สูงสุด" (ตำแหน่งวัดจากแผงค่าสถานะ)
    popup.style.top = `${value.offsetTop - 2}px`;
    popup.style.right = `${panel.clientWidth - value.offsetLeft + 6}px`;
    popup.style.animationDelay = `${delay}ms`;
    panel.appendChild(popup);
    setTimeout(() => popup.remove(), delay + FLOAT_NUM_MS + 1500); // เผื่อเวลาไว้ ถ้าแตะข้ามจอมืดแล้วตัวเลขเริ่มเด้งใหม่
  });
}

// จอมืดพร้อมชื่อช่วงของวัน เล่นครั้งเดียวต่อช่วง (แตะจอเพื่อข้ามได้ ระหว่างนั้นกดปุ่มข้างใต้ไม่ได้)
let phaseFadeTimer = null;
function playPhaseFade(titleHtml) {
  const key = currentPhaseKey();
  if (key === lastPhaseKey) return;
  lastPhaseKey = key;
  if (prefersReducedMotion()) return;
  const fade = byId('phase-fade');
  byId('phase-fade-title').innerHTML = titleHtml;
  byId('phase-fade-skip').textContent = t('phaseFadeSkip');
  fade.hidden = true;
  void fade.offsetWidth; // รีเซ็ตแอนิเมชันให้เล่นใหม่ได้
  fade.hidden = false;
  clearTimeout(phaseFadeTimer);
  phaseFadeTimer = setTimeout(() => { fade.hidden = true; }, PHASE_FADE_MS + 50);
}

// แตะจอมืด: ปิดทันที และตัวเลขเด้งที่รออยู่เด้งเลยไม่ต้องรอ
function skipPhaseFade() {
  clearTimeout(phaseFadeTimer);
  byId('phase-fade').hidden = true;
  document.querySelectorAll('.float-num').forEach(popup => {
    if (popup.style.animationDelay === '0ms') return;
    popup.style.animation = 'none';
    void popup.offsetWidth; // เริ่มแอนิเมชันใหม่ตั้งแต่ต้น
    popup.style.animation = '';
    popup.style.animationDelay = '0ms';
  });
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
  const jobLabel = `${ICON_SLOT} ${t('formerJob', getOccupationName(occupation, character.gender))}`;
  drawCharacter(byId('panel-sprite'), character);
  byId('panel-name').textContent = getDisplayName(character);
  byId('panel-identity').textContent =
    `${tr(CONFIG.genders[character.gender], 'name')} · ${tr(getAgeGroup(character.age), 'name')}`;
  byId('panel-job').innerHTML = withIcon(t('characterAgeJob', character.age, jobLabel), occupation.icon);
  byId('panel-traits').innerHTML = renderTraitTags(character);
  byId('panel-slots').innerHTML = iconLabel('backpack', t('slotsCount', game.inventorySlots));
  byId('panel-effects').innerHTML = renderModChips(getCharacterMods(character));
}

// ป้ายนิสัย (ไอคอน + ชื่อ, ชี้เมาส์ดูคำอธิบาย) ใช้ในแผงตัวละครและหน้าสรุป
function renderTraitTags(character) {
  return character.traitIds
    .map(id => getTrait(id))
    .map(trait => `<span class="trait-tag" title="${escapeHtml(tr(trait, 'desc'))}">${iconLabel(trait.icon, tr(trait, 'name'))}</span>`)
    .join('');
}

// ช่วงของวัน: เช้า (เก็บของ) → กลางคืน (เตรียมรับมือ) → สรุปวัน → เช้าวันใหม่ / เสียชีวิต / รอดครบ
// icon = ไอคอนพิกเซลหน้าหัวข้อ
const PHASE_VIEWS = {
  morning: { icon: 'sun',        title: day => t('morningTitle', day), scene: 'morning', body: renderMorningBody },
  event:   { icon: 'sun_cloud',  title: day => t('eventTitle', day),   scene: 'morning', body: renderEventBody },
  night:   { icon: 'moon',       title: day => t('nightTitle', day),   scene: 'night',   body: renderNightBody },
  summary: { icon: 'sunrise',    title: day => t('summaryTitle', day), scene: 'night',   body: renderSummaryBody },
  dead:    { icon: 'skull',      title: () => t('deadTitle'),          scene: 'night',   body: renderDeadBody },
  won:     { icon: 'helicopter', title: () => t('wonTitle'),           scene: 'morning', body: renderWonBody },
};

function renderPhase() {
  const view = PHASE_VIEWS[game.phase];
  byId('phase-title').innerHTML = iconLabel(view.icon, view.title(game.day));
  playPhaseFade(`${iconHtml(view.icon, 3)}<span>${escapeHtml(view.title(game.day))}</span>`);
  // ตายตอนกลางวัน (ของเสี่ยงตอนเช้า / อีเวนต์ตอนบ่าย) ใช้ภาพตอนกลางวัน
  const diedInDaylight = ['morning', 'event'].includes(game.death?.phase);
  const scene = game.phase === 'dead' && diedInDaylight ? 'morning' : view.scene;
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

// บ่าย (อีเวนต์): ยังไม่เลือก = การ์ดทางเลือก / เลือกแล้ว = ผลที่ได้ + ปุ่มเข้าสู่กลางคืน
function renderEventBody() {
  const event = getEvent(game.event.id);
  const head = `
    <div class="event-head">
      ${iconHtml(event.icon, 2)}
      <div>
        <span class="event-type event-type-${event.type}">${escapeHtml(tr(EVENT_TYPES[event.type], 'name'))}</span>
        <p class="event-name">${escapeHtml(tr(event, 'name'))}</p>
      </div>
    </div>
    <p class="event-desc">${escapeHtml(getEventDesc(event, game.day))}</p>`;
  if (!game.event.resolved) {
    return `${head}
      <div class="event-choices">${event.choices.map(renderEventChoice).join('')}</div>
      <p class="pick-status">${escapeHtml(t('eventHint'))}</p>`;
  }
  return `${head}${renderEventResult(event)}${phaseButton('end-event', t('eventContinueButton'))}`;
}

// ปุ่มทางเลือก 1 ทาง: % สำเร็จ, สิ่งที่ต้องจ่าย, ผลถ้าสำเร็จ/พลาด (ทางที่ไม่ต้องลุ้นบอกผลเดียว)
function renderEventChoice(choice, index) {
  const block = getChoiceBlock(choice);
  let odds = `<span class="chip chip-neutral">${escapeHtml(t('eventCertain'))}</span>`;
  if (choice.check) {
    const { chance, bonus } = getChoiceChance(choice);
    odds = `<span class="chip chip-odds">${iconLabel('dice', t('eventChance', chance, bonus ? formatSigned(bonus) : ''))}</span>`;
  }
  const giveChip = choice.give
    ? `<span class="chip chip-bad">${escapeHtml(t('eventGiveChip', choice.give.map(id => tr(getItem(id), 'name')).join(t('orJoin'))))}</span>`
    : '';
  const costLine = choice.give || choice.cost
    ? eventLine(t('eventCostLabel'), giveChip + (choice.cost ? renderOutcomeChips({ effects: choice.cost }) : ''))
    : '';
  const outcomes = choice.check
    ? eventLine(t('eventSuccessLabel'), renderOutcomeChips(choice.success)) + eventLine(t('eventFailLabel'), renderOutcomeChips(choice.fail))
    : eventLine(t('eventResultLabel'), renderOutcomeChips(choice.success));
  return `
    <button class="event-choice" type="button" data-action="event-choice" data-index="${index}"${block ? ' disabled' : ''}>
      <span class="event-choice-head">
        <span class="event-choice-label">${escapeHtml(tr(choice, 'label'))}</span>
        ${odds}
      </span>
      ${costLine}
      ${outcomes}
      ${block ? `<span class="event-block">${iconLabel('cross', block)}</span>` : ''}
    </button>`;
}

// แถวในปุ่มทางเลือก: หัวข้อสั้น ๆ + ชิป
function eventLine(label, chipsHtml) {
  return `<span class="event-line"><b>${escapeHtml(label)}</b><span class="chip-list">${chipsHtml}</span></span>`;
}

// ชิปของผล: ค่าสถานะ (เขียว = ดี, แดง = แย่), ได้ของ, ของสุ่ม, เสียของ
function renderOutcomeChips(outcome) {
  const chip = (good, html) => `<span class="chip ${good ? 'chip-good' : 'chip-bad'}">${html}</span>`;
  const chips = Object.entries(outcome.effects ?? {}).map(([key, value]) => {
    const def = CONFIG.stats[key];
    return chip(def.higherIsWorse ? value < 0 : value > 0, iconLabel(def.icon, `${tr(def, 'name')} ${formatSigned(value)}`));
  });
  (outcome.items ?? []).forEach(id => chips.push(chip(true, iconLabel(getItem(id).icon, t('eventGetItem', tr(getItem(id), 'name'))))));
  if (outcome.randomItems) chips.push(chip(true, iconLabel('crate', t('eventRandomItems', outcome.randomItems))));
  if (outcome.loseItems) chips.push(chip(false, iconLabel('backpack', t('eventLoseItems', outcome.loseItems))));
  return chips.length > 0 ? chips.join('') : `<span class="chip chip-neutral">${escapeHtml(t('eventNothing'))}</span>`;
}

// ผลหลังเลือก: ทางที่เลือก, สำเร็จ/พลาด, คำบรรยาย, สิ่งที่เปลี่ยนจริง
function renderEventResult(event) {
  const { choiceIndex, success, report } = game.event;
  const choice = event.choices[choiceIndex];
  const outcome = success === false ? choice.fail : choice.success;
  const tone = success === null ? 'neutral' : success ? 'good' : 'bad';
  const verdict = success === null ? '' : `<p class="event-verdict">${escapeHtml(t(success ? 'eventSuccess' : 'eventFail'))}</p>`;
  const lines = report.map(entry => `<li>${escapeHtml(formatLogEntry(entry))}</li>`).join('');
  return `
    <div class="event-result is-${tone}">
      <p class="event-result-choice">${escapeHtml(t('eventYouChose', tr(choice, 'label')))}</p>
      ${verdict}
      <p class="event-result-text">${escapeHtml(tr(outcome, 'text'))}</p>
      ${lines ? `<ul class="night-report">${lines}</ul>` : ''}
    </div>`;
}

// กลางคืน: บอกชนิดการบุก แรงบุกโดยประมาณ การป้องกันที่มี และความเสียหายที่คาดว่าจะได้รับ
function renderNightBody() {
  const plan = getNightPlan();
  const threat = getThreat(game.night.threatId);
  const { weapons, defense } = plan;
  const damageMod = (plan.mods.zombieDamage ?? 0) + (plan.mods.nightDamage ?? 0);
  const chip = (icon, text, tone = 'neutral') => `<span class="chip chip-${tone}">${iconLabel(icon, text)}</span>`;
  const chips = [
    chip('house', t('nightShelter', defense.shelter)),
    defense.items > 0 ? chip('bricks', t('nightDefenseItems', defense.items), 'good') : '',
    plan.mods.defensePower ? chip('wrench', t('nightDefenseBonus', formatSigned(plan.mods.defensePower)), plan.mods.defensePower > 0 ? 'good' : 'bad') : '',
    weapons.power > 0 ? chip('swords', t('nightWeapons', weapons.power), 'good') : chip('swords', t('nightNoWeapons')),
    plan.reduction > 0 ? chip('motorcycle_helmet', t('nightReduction', plan.reduction), 'good') : '',
    damageMod ? chip('blood', t('nightDamageMod', formatSigned(damageMod)), damageMod > 0 ? 'bad' : 'good') : '',
    weapons.noise > 0 ? chip('speaker', t('nightNoise', weapons.noise * CONFIG.night.noiseAttack), 'bad') : '',
    // วันนี้ได้กิน/ดื่มหรือยัง (บอกล่วงหน้าว่าสิ้นวันแผลจะฟื้นไหม)
    game.fed
      ? chip('meat', t('nightFed', CONFIG.dayEnd.regenFed), 'good')
      : chip('meat', t('nightNotFed', CONFIG.dayEnd.regenUnfed), 'bad'),
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
      <p class="night-threat-name">${withIcon(t('nightThreat', ICON_SLOT, tr(threat, 'name')), threat.icon, 2)}</p>
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

// เสียชีวิต: บอกวันและสาเหตุ + รายงานคืนสุดท้าย แล้วกดไปหน้าสรุปเต็มจอ
function renderDeadBody() {
  const { death, character } = game;
  return `
    <div class="death-box">
      <p class="death-message">${escapeHtml(t('deadMessage', getDisplayName(character), death.day, CONFIG.totalDays))}</p>
      <p class="death-cause">${escapeHtml(t('deadCause', describeCause(death.cause)))}</p>
    </div>
    ${death.phase === 'event' && game.event?.resolved ? renderEventResult(getEvent(game.event.id)) : renderReport()}
    ${phaseButton('show-end', t('endSummaryButton'))}`;
}

// รอดครบทุกวัน (ปกติไปหน้าสรุปเต็มจอทันที แผงนี้ใช้กรณีกลับมาที่หน้าเล่นเกม)
function renderWonBody() {
  return `
    <div class="death-box is-win"><p class="death-message">${escapeHtml(t('wonMessage', getDisplayName(game.character), CONFIG.totalDays))}</p></div>
    ${renderReport()}
    ${phaseButton('show-end', t('endSummaryButton'))}`;
}

// ------------------------------------------------------------
// 8.5) หน้าสรุปตอนจบเกม: ตัวละคร ไปได้กี่วัน สาเหตุ ข้อความปิดท้าย สถิติเกมนี้ และสถิติดีที่สุด
// ------------------------------------------------------------

// ข้อความปิดท้าย: รอดครบใช้ won / ตายใช้ช่วงที่ fromDay มากที่สุดที่ไม่เกินวันที่ตาย
function getEnding(won, day) {
  const { died, won: wonEnding } = CONFIG.endings;
  if (won) return wonEnding;
  return [...died].reverse().find(ending => day >= ending.fromDay) ?? died[0];
}

function showEndScreen() {
  if (!game?.result) return;
  renderEnd();
  showScreen('end');
  replayAnimation(byId('end-card'));
}

function renderEnd() {
  const { character, result } = game;
  const occupation = getOccupation(character.occupationId);
  const total = CONFIG.totalDays;
  const card = byId('end-card');
  card.classList.toggle('is-won', result.won);
  card.classList.toggle('is-dead', !result.won);

  const title = byId('end-title');
  title.innerHTML = result.won ? iconLabel('helicopter', t('wonTitle'), 3) : iconLabel('skull', t('deadTitle'), 3);
  title.classList.toggle('is-won', result.won);
  title.classList.toggle('is-dead', !result.won);
  drawCharacter(byId('end-sprite'), character);
  byId('end-name').textContent = getDisplayName(character);
  byId('end-basic').textContent = t('genderAge', tr(CONFIG.genders[character.gender], 'name'), character.age);
  byId('end-occupation').innerHTML = iconLabel(occupation.icon, t('formerJob', getOccupationName(occupation, character.gender)));
  byId('end-traits').innerHTML = renderTraitTags(character);

  // ไปได้กี่วัน: หลอดเต็มเมื่อรอดครบ
  const daysText = result.won ? t('endDaysWon', total) : t('endDaysDead', result.dayReached, total);
  byId('end-days').textContent = daysText;
  const bar = byId('end-bar');
  bar.setAttribute('aria-valuemax', String(total));
  bar.setAttribute('aria-valuenow', String(result.dayReached));
  bar.setAttribute('aria-label', daysText);
  byId('end-bar-fill').style.width = `${clamp(Math.round((result.dayReached / total) * 100), 0, 100)}%`;
  byId('end-cause').hidden = result.won;
  byId('end-cause').textContent = result.won ? '' : t('deadCause', describeCause(game.death.cause));

  byId('end-epilogue').textContent = tr(getEnding(result.won, result.dayReached), 'desc');
  byId('end-stats').innerHTML = renderEndStats();
  byId('end-best').innerHTML = renderEndBest(result);
}

// สถิติเกมนี้ 3 หมวด: การต่อสู้ / ของ / ร่างกาย
function renderEndStats() {
  const { tally, stats } = game;
  const row = (label, value) => `
    <li class="end-stat"><span class="end-stat-label">${escapeHtml(label)}</span><b class="end-stat-value">${escapeHtml(String(value))}</b></li>`;
  const group = (icon, title, rows, extra = '') => `
    <section class="info-block end-group">
      <h4>${iconLabel(icon, title)}</h4>
      <ul class="end-stat-list">${rows.join('')}</ul>
      ${extra}
    </section>`;
  const worst = tally.worstNight
    ? t('statWorstValue', tally.worstNight.day, tr(getThreat(tally.worstNight.threatId), 'name'), tally.worstNight.damage)
    : t('statWorstNone');
  // ค่าสถานะตอนจบ เช่น [หัวใจ] 0  [อาหาร] 34  [น้ำ] 12 ...
  const finalStats = Object.entries(CONFIG.stats).map(([key, def]) => `
    <li class="end-final stat-${key}" title="${escapeHtml(tr(def, 'name'))}">${iconLabel(def.icon, stats[key])}</li>`).join('');

  return [
    group('swords', t('endCombatHeading'), [
      row(t('statNights'), t('unitNights', tally.nightsSurvived)),
      row(t('statAttack'), `${tally.attackTotal} / ${tally.blockedTotal}`),
      row(t('statHpLost'), tally.hpLost),
      row(t('statWorstNight'), worst),
      row(t('statHordes'), t('unitTimes', tally.hordesSurvived)),
      row(t('statBosses'), `${tally.bossesSurvived} / ${CONFIG.night.bossNights.length}`),
    ]),
    group('backpack', t('endItemsHeading'), [
      row(t('statPicked'), t('unitPieces', tally.itemsPicked)),
      row(t('statUsed'), t('unitTimes', tally.itemsUsed)),
      row(t('statAmmoFired'), t('unitRounds', tally.ammoFired)),
      row(t('statBroken'), t('unitPieces', tally.itemsBroken)),
    ]),
    group('body', t('endBodyHeading'), [
      row(t('statFoodEmpty'), t('unitDays', tally.foodEmptyDays)),
      row(t('statWaterEmpty'), t('unitDays', tally.waterEmptyDays)),
      row(t('statMaxStress'), tally.maxStress),
    ], `<p class="end-final-title">${escapeHtml(t('statFinal'))}</p><ul class="end-final-list">${finalStats}</ul>`),
    group('radio', t('endEventsHeading'), [
      row(t('statEventsSeen'), t('unitTimes', tally.eventsSeen)),
      row(t('statEventChecks'), `${tally.eventWins} / ${tally.eventChecks}`),
    ]),
  ].join('');
}

// สถิติดีที่สุด (รวมเกมที่เพิ่งจบแล้ว) + ป้าย "สถิติใหม่!"
function renderEndBest(result) {
  const { best, isNewBest } = result;
  return `
    <span class="end-best-title">${iconLabel('trophy', t('endBestHeading'))}</span>
    <span class="end-best-line">${escapeHtml(t('bestLine', best.bestDay, best.wins, best.runs))}</span>
    ${isNewBest ? `<span class="end-new-best">${iconLabel('sparkle', t('endNewBest'))}</span>` : ''}`;
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

// กล่องแจ้งเตือนที่มีปุ่มเดียว ("ตกลง")
function openNotice(title, message) {
  openConfirm(title, message, t('noticeOkButton'), null);
  byId('modal-cancel').hidden = true;
  byId('modal-confirm').classList.replace('btn-danger', 'btn-primary'); // แค่รับทราบ ไม่ใช่ปุ่มอันตราย
  byId('modal-confirm').focus();
}

function showModal() {
  focusBeforeModal = document.activeElement;
  byId('modal').hidden = false;
  byId('modal-cancel').focus();
}

function closeConfirm() {
  byId('modal').hidden = true;
  byId('modal-confirm').hidden = false;
  byId('modal-confirm').classList.replace('btn-primary', 'btn-danger');
  byId('modal-cancel').hidden = false;
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
  if (key === 'hp' && changed < 0) game.tally.hpLost -= changed; // สถิติ: พลังชีวิตที่เสียไปทุกสาเหตุ
  if ((key === 'food' || key === 'water') && changed > 0) game.fed = true; // ได้กิน/ดื่มจริง → สิ้นวันแผลฟื้น
  if (key === 'stress') game.tally.maxStress = Math.max(game.tally.maxStress, game.stats.stress);
  return changed;
}

// ใช้ผลหลายตัวพร้อมกัน คืนค่าที่เปลี่ยนจริง เช่น [['food', 25], ['water', -8]]
function applyEffects(effects, cause) {
  return Object.entries(effects).map(([key, amount]) => [key, changeStat(key, amount, cause)]);
}

// ข้อความของผลที่เปลี่ยน เช่น "อาหาร +25, น้ำ −8"
// ค่าที่ไม่เปลี่ยน (0 เช่น ไม่เหนื่อยอยู่แล้ว) ไม่แสดง ถ้าไม่มีอะไรเปลี่ยนเลยบอกว่า "ไม่มีอะไรเปลี่ยน"
function formatEffectList(list) {
  const changes = list.filter(([, changed]) => changed !== 0);
  if (changes.length === 0) return t('effectNoChange');
  return changes.map(([key, changed]) => `${tr(CONFIG.stats[key], 'name')} ${formatSigned(changed)}`).join(', ');
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
    if (arg?.event) return tr(getEvent(arg.event), 'name');
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
  game.tally.itemsUsed += 1;
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
    game.tally.itemsPicked += 1;
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
    return `<button class="btn btn-small" type="button" data-swap-index="${index}">${itemIconHtml(item, 1)} ${escapeHtml(tr(item, 'name'))}${left ? ` <small>(${escapeHtml(left)})</small>` : ''}</button>`;
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

// จบช่วงเช้า: สุ่มว่าบ่ายนี้มีอีเวนต์ไหม ถ้าไม่มีเข้ากลางคืนเลย
function endMorning() {
  if (game.phase !== 'morning') return;
  const eventId = rollEvent(game.day);
  if (eventId) startEvent(eventId);
  else startNight();
  renderGame();
  scrollPhaseIntoView();
}

// เข้ากลางคืน: สุ่มว่าคืนนี้อะไรจะบุก (บอกผู้เล่นก่อน จะได้เตรียมตัว)
function startNight() {
  game.phase = 'night';
  game.night = { threatId: rollNightThreat(game.day), useGuns: true };
}

// ------------------------------------------------------------
// 8.55) อีเวนต์ระหว่างวัน (ข้อมูลอยู่ใน events.js, ตั้งค่าอยู่ที่ CONFIG.events)
//       เกิดหลังจบช่วงเช้า → ผู้เล่นเลือก 1 ทาง → เห็นผล → เข้ากลางคืน
// ------------------------------------------------------------

// ผลของนิสัย/อายุ/อาชีพที่ใช้กับ % สำเร็จ: [ชื่อผล, ทิศทาง] (+1 = บวกเพิ่ม, −1 = ลบออก)
const EVENT_CHECK_MODS = {
  friendly:  ['survivorLuck', 1],  // ผู้รอดชีวิตเป็นมิตร
  scam:      ['scamRisk', -1],     // ถูกหลอก
  emergency: ['emergencyFail', -1], // พลาดในเหตุฉุกเฉิน
  luck:      ['lootLuck', 1],      // โชคในการเจอของ
};

function getEvent(id) {
  return findById(EVENTS, id);
}

// ข้อความบรรยายอีเวนต์ ({daysLeft} = อีกกี่วันหน่วยกู้ภัยจะมา)
function getEventDesc(event, day) {
  return tr(event, 'desc').replace('{daysLeft}', String(CONFIG.totalDays - day + 1));
}

// อีเวนต์นี้เกิดได้ไหมวันนี้: ถึงวันแรกแล้ว, อากาศตรง (ถ้ากำหนด), ไม่เพิ่งเกิดไปไม่กี่วันก่อน
function isEventAvailable(event, day) {
  if (day < CONFIG.events.firstDay) return false;
  if (event.weather && !event.weather.includes(getWeather(day, game.seed).id)) return false;
  return !game.eventHistory.some(entry => entry.id === event.id && day - entry.day < CONFIG.events.noRepeatDays);
}

// สุ่มอีเวนต์ของวันนี้: โอกาสเกิดตาม eventChance ของช่วงวัน แล้วเลือกตามน้ำหนัก (null = ไม่มีอีเวนต์)
function rollEvent(day) {
  if (day < CONFIG.events.firstDay) return null;
  if (Math.random() * 100 >= getStage(day).eventChance) return null;
  const pool = EVENTS.filter(event => isEventAvailable(event, day));
  if (pool.length === 0) return null;
  return pickWeighted(pool.map(event => ({ id: event.id, weight: event.weight ?? 10 }))).id;
}

function startEvent(eventId) {
  game.phase = 'event';
  game.event = { id: eventId, resolved: false, choiceIndex: null, success: null, report: [] };
  game.eventHistory.push({ day: game.day, id: eventId });
  game.tally.eventsSeen += 1;
}

// % สำเร็จของทางเลือกหลังรวมผลของตัวละคร → { chance, bonus } (bonus = ส่วนที่ตัวละครเพิ่ม/ลด)
function getChoiceChance(choice) {
  const [modKey, direction] = EVENT_CHECK_MODS[choice.check];
  const bonus = direction * (getCharacterMods(game.character)[modKey] ?? 0);
  const { minChance, maxChance } = CONFIG.events;
  return { chance: clamp(choice.chance + bonus, minChance, maxChance), bonus };
}

function hasWeapon() {
  return game.inventory.some(entry => getItem(entry.id).passive?.weaponPower);
}

// เลือกทางนี้ได้ไหม: คืนเหตุผลที่เลือกไม่ได้ (null = เลือกได้)
//   ค่าที่ต้องจ่าย (อาหาร/น้ำ/กระสุน) ต้องมีพอ, ของที่ต้องให้ต้องมีในกระเป๋า, ทางที่ต้องสู้ต้องมีอาวุธ
function getChoiceBlock(choice) {
  for (const [key, amount] of Object.entries(choice.cost ?? {})) {
    if (amount < 0 && !CONFIG.stats[key].higherIsWorse && game.stats[key] < -amount) {
      return t('eventNeedStat', tr(CONFIG.stats[key], 'name'), -amount);
    }
  }
  if (choice.give && !game.inventory.some(entry => choice.give.includes(entry.id))) {
    return t('eventNeedItem', choice.give.map(id => tr(getItem(id), 'name')).join(t('orJoin')));
  }
  if (choice.requires === 'weapon' && !hasWeapon()) return t('eventNeedWeapon');
  return null;
}

// กดเลือกทาง: จ่าย → ลุ้น (ถ้ามี) → ได้ผล → บันทึก แล้ววาดผลให้ดู
function chooseEventOption(index) {
  if (game.phase !== 'event' || game.event.resolved) return;
  const event = getEvent(game.event.id);
  const choice = event.choices[index];
  if (!choice || getChoiceBlock(choice)) return;
  const hpBefore = game.stats.hp;
  const cause = { kind: 'event', eventId: event.id };
  const report = [];
  if (choice.give) {
    const giveIndex = game.inventory.findIndex(entry => choice.give.includes(entry.id));
    const [given] = game.inventory.splice(giveIndex, 1);
    report.push({ key: 'eventGaveReport', args: [{ item: given.id }] });
  }
  if (choice.cost) report.push({ key: 'eventCostReport', args: [applyEffects(choice.cost, cause)] });
  let success = null;
  if (choice.check) {
    success = Math.random() * 100 < getChoiceChance(choice).chance;
    game.tally.eventChecks += 1;
    if (success) game.tally.eventWins += 1;
  }
  if (!isDead()) applyEventOutcome(success === false ? choice.fail : choice.success, cause, report);
  game.event = { ...game.event, resolved: true, choiceIndex: index, success, report };
  addLog(success === null ? 'logEventDone' : success ? 'logEventSuccess' : 'logEventFail', { event: event.id });
  if (isDead()) markDead();
  renderGame();
  if (game.stats.hp < hpBefore) playHitEffect();
}

// ผลของทางที่เลือก: ค่าสถานะ → ได้ของ → เสียของ
function applyEventOutcome(outcome, cause, report) {
  if (outcome.effects) report.push({ key: 'eventEffectsReport', args: [applyEffects(outcome.effects, cause)] });
  if (isDead()) return;
  const randomIds = Array.from({ length: outcome.randomItems ?? 0 }, () => rollLootItem(game.day, game.character, []));
  [...(outcome.items ?? []), ...randomIds].forEach(id => giveEventItem(id, report));
  if (outcome.loseItems) loseRandomItems(outcome.loseItems, report);
}

// ได้ของจากอีเวนต์: ของสวมใส่ใส่ทันทีถ้าช่องว่าง / ของทั่วไปถ้ากระเป๋าเต็มต้องทิ้งไว้
function giveEventItem(itemId, report) {
  const item = getItem(itemId);
  if (isWearable(item) ? canWear(item) : game.inventory.length < getBagCapacity()) {
    if (isWearable(item)) game.worn[item.wear] = itemId;
    else game.inventory.push(createBagItem(itemId));
    report.push({ key: 'eventGotItemReport', args: [{ item: itemId }] });
  } else {
    report.push({ key: 'eventBagFullReport', args: [{ item: itemId }] });
  }
}

// เสียของในกระเป๋าแบบสุ่ม (ของที่ใส่อยู่ เช่น กระเป๋าเป้ ไม่หาย)
function loseRandomItems(count, report) {
  const lost = [];
  for (let i = 0; i < count && game.inventory.length > 0; i++) {
    const [entry] = game.inventory.splice(Math.floor(Math.random() * game.inventory.length), 1);
    lost.push(entry.id);
  }
  report.push(lost.length > 0 ? { key: 'eventLostReport', args: [{ items: lost }] } : { key: 'eventNothingToLose', args: [] });
}

// กด "เข้าสู่กลางคืน" หลังเห็นผลอีเวนต์
function endEvent() {
  if (game.phase !== 'event' || !game.event.resolved) return;
  startNight();
  renderGame();
  scrollPhaseIntoView();
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
  if (isDead()) {
    markDead();
  } else {
    countSurvivedNight(game.night.threatId);
    game.phase = 'summary';
  }
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
  countAttack(attack, plan.block, damage, plan.weapons.ammoUsed, threat.id);
  return lost;
}

// สถิติการบุกคืนนี้: แรงบุก ส่วนที่กันได้ กระสุนที่ยิง และคืนที่หนักที่สุด (ใช้ความเสียหายตามสูตร เหมือนในรายงาน)
function countAttack(attack, block, damage, ammoUsed, threatId) {
  const tally = game.tally;
  tally.attackTotal += attack;
  tally.blockedTotal += Math.min(attack, block);
  tally.ammoFired += ammoUsed;
  if (damage > 0 && damage > (tally.worstNight?.damage ?? 0)) {
    tally.worstNight = { day: game.day, threatId, damage };
  }
}

// รอดคืนนี้ครบทุกขั้น (ไม่ตายระหว่างบุก/สิ้นวัน) → นับคืนที่รอด และคลื่นใหญ่/บอสที่ผ่านมาได้
function countSurvivedNight(threatId) {
  const tally = game.tally;
  tally.nightsSurvived += 1;
  if (threatId === 'horde') tally.hordesSurvived += 1;
  if (threatId === 'boss') tally.bossesSurvived += 1;
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
  if (game.stats.food === 0) game.tally.foodEmptyDays += 1;
  if (game.stats.water === 0) game.tally.waterEmptyDays += 1;
  if (game.stats.food === 0) {
    report.push({ key: 'reportStarving', args: [-changeStat('hp', -settings.starveDamage, { kind: 'starve' })] });
  }
  if (!isDead() && game.stats.water === 0) {
    report.push({ key: 'reportThirsty', args: [-changeStat('hp', -settings.thirstDamage, { kind: 'thirst' })] });
  }
  // พักฟื้น: วันที่ได้กิน/ดื่มจริง (game.fed) ฟื้นมากกว่า — ไม่ใช่ยา จึงไม่ได้ผล healPower
  if (!isDead() && game.stats.food > 0 && game.stats.water > 0) {
    const regen = game.fed ? settings.regenFed : settings.regenUnfed;
    const gained = regen > 0 ? changeStat('hp', regen, null, false) : 0;
    if (gained > 0) report.push({ key: game.fed ? 'reportRegenFed' : 'reportRegenUnfed', args: [gained] });
    else if (!game.fed && game.stats.hp < game.stats.maxHp) report.push({ key: 'reportNoRegen', args: [] });
  }
  game.fed = false; // เริ่มนับใหม่: กิน/ดื่มหลังจากนี้ (รวมตอนดูสรุปวัน) นับให้สิ้นวันถัดไป
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
  game.tally.itemsBroken += broken.length;
  if (broken.length > 0) report.push({ key: 'reportBroken', args: [{ items: broken }] });
}

// บันทึกการตาย: วัน ช่วงเวลา และสาเหตุล่าสุดที่ทำให้พลังชีวิตลด (= สาเหตุที่ทำให้เป็น 0)
function markDead() {
  game.death = { day: game.day, phase: game.phase, cause: game.lastDamageCause ?? { kind: 'unknown' } };
  game.phase = 'dead';
  finishRun(false);
}

// จบเกมถาวร (ตายหรือรอดครบ): บันทึกสถิติดีที่สุด แล้วช่องเซฟกลายเป็น "จบแล้ว" — ทำครั้งเดียวต่อเกม
// game.result = { won, dayReached, isNewBest, best } ใช้วาดหน้าสรุป
function finishRun(won) {
  if (game.result) return;
  const dayReached = won ? CONFIG.totalDays : game.death.day;
  const before = loadBest();
  const best = mergeBest(before, dayReached, won);
  saveBest(best);
  // เกมนี้จบถาวร: ลบเซฟของเกมนี้ (ถ้าบันทึกไว้) จะได้กลับไปเล่นจากวันก่อนตายไม่ได้ — เซฟของเกมอื่นไม่แตะ
  const save = loadSave();
  if (save.status === 'saved' && save.game.seed === game.seed) deleteSave();
  game.result = { won, dayReached, isNewBest: dayReached > before.bestDay, best };
}

// ข้อความสาเหตุการตาย (ใช้ทั้งแผงตอนตายและหน้าสรุป)
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
    case 'event': return t('causeEvent', tr(getEvent(cause.eventId), 'name'));
    default: return t('causeUnknown');
  }
}

// กด "เริ่มวันที่ N": ขึ้นวันใหม่ สุ่มของตอนเช้า (วันสุดท้ายผ่านไปแล้ว = รอดครบ → หน้าสรุป)
function startNextDay() {
  if (game.phase !== 'summary') return;
  if (game.day >= CONFIG.totalDays) {
    game.phase = 'won';
    finishRun(true);
    renderGame();
    showEndScreen();
    return;
  }
  game.day += 1;
  game.phase = 'morning';
  game.morning = rollMorningOffer(game.day, game.character, game.inventory);
  game.event = null;
  game.night = null;
  game.report = null;
  game.log = [];
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
  return ['morning', 'event', 'night', 'summary'].includes(game.phase);
}

// ไอคอนของ: ไอคอนพิกเซลใน icons.js (scale 2 = 32px) ถ้าเปิด CONFIG.itemImages จะใช้รูป images/items/<id>.png
function itemIconHtml(item, scale = 2) {
  return CONFIG.itemImages
    ? `<img class="item-icon" src="images/items/${item.id}.png" alt="">`
    : iconHtml(item.icon, scale, scale === 2 ? 'item-icon' : '');
}

function usesText(item) {
  if (item.use) return t('usesTimes', item.uses);
  return item.uses === 0 ? t('usesPermanent') : t('usesDays', item.uses);
}

// ชิปบอกผลของของ: ผลตอนใช้ / ผลติดตัว / ความเสี่ยง
function renderItemChips(item) {
  const chip = (good, text) => `<span class="chip ${good ? 'chip-good' : 'chip-bad'}">${iconLabel(good ? 'check' : 'cross', text)}</span>`;
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
    chips.push(`<span class="chip chip-risk">${iconLabel('warning', t('riskChip', getRiskChance(item), tr(item, 'riskText'), effects))}</span>`);
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
let loadedSaveRev = null;   // เลขรุ่นของเซฟตอนที่เกมนี้โหลด/บันทึกล่าสุด (null = เกมนี้ยังไม่เคยบันทึก)
let lastSavedJson = null;   // สถานะเกมตอนโหลด/บันทึกล่าสุด (ไว้ดูว่ามีความคืบหน้าที่ยังไม่ได้บันทึกไหม)

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
  if (game && !byId('screen-game').hidden) renderGame();
  if (game?.result && !byId('screen-end').hidden) renderEnd();
}

// เริ่มเกมใหม่: สุ่มตัวละครใหม่ — เกมที่บันทึกไว้ (ถ้ามี) ยังอยู่
// จนกว่าจะกด "บันทึกและออก" ในเกมใหม่ (ตอนนั้นจะถามยืนยันก่อนทับ)
function startNewGame() {
  revealCharacter = generateCharacter();
  renderReveal(revealCharacter);
  showScreen('reveal');
}

// ปุ่ม "เล่นต่อ": โหลดเกมที่บันทึกไว้กลับมาตรงจุดที่บันทึก
function continueSavedGame() {
  const save = loadSave();
  if (save.status !== 'saved') {
    goToTitle();
    return;
  }
  revealCharacter = null;
  game = save.game;
  loadedSaveRev = save.rev;
  lastSavedJson = JSON.stringify(game);
  renderGame();
  showScreen('game');
}

// บันทึกได้ตอนนี้ไหม: เฉพาะตอนเริ่มวันใหม่ = ช่วงเช้าที่ยังไม่ได้ทำอะไรเลย (ยังไม่เก็บ/ใช้/ทิ้งของ)
// และเกมยังไม่จบ (ตายหรือรอดครบแล้วบันทึกไม่ได้)
function canSaveNow() {
  return Boolean(game) && !game.result && game.phase === 'morning' && game.log.length === 0;
}

// มีความคืบหน้าที่ยังไม่ได้บันทึกไหม (เกมที่จบแล้วไม่นับ เพราะบันทึกไม่ได้อยู่แล้ว)
function hasUnsavedProgress() {
  return Boolean(game) && !game.result && JSON.stringify(game) !== lastSavedJson;
}

// ปุ่ม "บันทึกและออก": ถ้ามีเซฟของเกมอื่นอยู่ หรือเซฟถูกบันทึกจากแท็บอื่นหลังจากที่เกมนี้โหลดมา → ถามยืนยันก่อนทับ
function onSaveAndQuit() {
  if (!canSaveNow()) return;
  const existing = loadSave();
  const isAnotherSave = existing.status === 'saved' && (existing.game.seed !== game.seed || existing.rev !== loadedSaveRev);
  if (!isAnotherSave) {
    saveAndQuit();
    return;
  }
  openConfirm(
    t('overwriteSaveTitle'),
    t('overwriteSaveMessage', getDisplayName(existing.game.character), existing.game.day),
    t('overwriteSaveButton'),
    saveAndQuit,
  );
}

function saveAndQuit() {
  if (!canSaveNow()) return;
  const existing = loadSave();
  const rev = (existing.status === 'saved' ? existing.rev : 0) + 1;
  if (!writeSave(game, rev)) {
    openNotice(t('saveFailedTitle'), t('saveFailedMessage'));
    return;
  }
  leaveGame();
  showToast(t('savedToast'));
}

// ปุ่ม "หน้าแรก" ระหว่างเล่น: ยังมีความคืบหน้าที่ไม่ได้บันทึก → ถามก่อน (ออกแล้วความคืบหน้านั้นหาย)
function onHomeClick() {
  if (!hasUnsavedProgress()) {
    leaveGame();
    return;
  }
  openConfirm(t('leaveGameTitle'), t('leaveGameMessage'), t('leaveGameButton'), leaveGame);
}

// ออกจากเกมกลับหน้าแรก (เกมที่ไม่ได้บันทึกถูกทิ้ง เล่นต่อได้จากเซฟเท่านั้น)
function leaveGame() {
  game = null;
  loadedSaveRev = null;
  lastSavedJson = null;
  lastStatsSnapshot = null;
  lastPhaseKey = null;
  goToTitle();
}

// ข้อความสั้น ๆ ที่โผล่แล้วหายเอง เช่น "บันทึกแล้ว"
let toastTimer = null;
function showToast(text) {
  const toast = byId('toast');
  toast.textContent = text;
  toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.hidden = true; }, 2500);
}

// แท็บอื่นบันทึก/ลบเซฟ → ถ้าเปิดหน้าแรกอยู่ วาดการ์ดเซฟใหม่
function onStorageChanged(event) {
  if (event.key === STORAGE_KEY_SAVE && !byId('screen-title').hidden) renderTitle();
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

// ปุ่ม "กลับหน้าหลัก" ในหน้าสุ่ม: ทิ้งตัวละครที่ยังไม่ล็อก แล้วกลับหน้าแรก (เซฟไม่เปลี่ยน)
function backFromReveal() {
  revealCharacter = null;
  goToTitle();
}

// ยืนยันตัวละคร → ล็อก แล้วเริ่มวันที่ 1 (ยังไม่บันทึก — บันทึกได้ด้วยปุ่ม "บันทึกและออก" ตอนเริ่มวัน)
function startDayOne() {
  if (!revealCharacter) return;
  const character = revealCharacter;
  revealCharacter = null; // จากนี้ไปสุ่มใหม่ไม่ได้แล้ว
  game = createGame(character, createRunSeed());
  loadedSaveRev = null;
  lastSavedJson = null;
  renderGame();
  showScreen('game');
}

// สร้างข้อมูลเกมวันที่ 1 จากตัวละคร (โหลดเซฟก็ใช้เป็นค่าตั้งต้นของช่องที่เซฟรุ่นก่อนยังไม่มี)
function createGame(character, seed) {
  const inventory = (getOccupation(character.occupationId).startItems ?? []).map(id => createBagItem(id));
  const stats = calcStartingStats(character);
  return {
    day: 1,
    phase: 'morning', // morning → night → summary → morning ... / dead / won
    seed,             // เลขสุ่มประจำเกม (ภาพเมือง/สภาพอากาศ)
    character,
    stats,
    inventorySlots: calcInventorySlots(character),
    inventory,
    worn: { bag: null }, // ของที่ใส่อยู่ (ช่องสวมใส่ → id ของ) เช่น { bag: 'backpack' }
    morning: rollMorningOffer(1, character, inventory),
    night: null,      // { threatId, useGuns } ตั้งตอนจบช่วงเช้า
    report: null,     // สรุปผลกลางคืน/สิ้นวัน (รูปแบบเดียวกับ log)
    log: [],
    lastDamageCause: null, // สาเหตุล่าสุดที่ทำให้พลังชีวิตลด
    death: null,      // { day, phase, cause } เมื่อพลังชีวิตหมด
    fed: false,       // ได้กิน/ดื่มตั้งแต่สิ้นวันก่อนไหม (อาหารหรือน้ำเพิ่มขึ้นจริง) — ใช้ตัดสินว่าแผลฟื้นไหม
    event: null,      // อีเวนต์ช่วงบ่าย { id, resolved, choiceIndex, success, report }
    eventHistory: [], // อีเวนต์ที่เคยเกิด [{ day, id }] (กันเกิดซ้ำถี่เกินไป)
    tally: createTally(stats), // สถิติของเกมนี้ (แสดงในหน้าสรุปตอนจบ)
    result: null,     // { won, dayReached, isNewBest, best } เมื่อเกมจบ (ตาย/รอดครบ)
  };
}

// สถิติของเกมนี้: นับไปเรื่อย ๆ ระหว่างเล่น แสดงในหน้าสรุปตอนจบ
function createTally(stats) {
  return {
    nightsSurvived: 0, // คืนที่ผ่านครบทุกขั้นโดยไม่ตาย
    attackTotal: 0,    // แรงบุกรวมทุกคืน
    blockedTotal: 0,   // แรงบุกที่กันได้ (ไม่เกินแรงบุกของคืนนั้น)
    hpLost: 0,         // พลังชีวิตที่เสียไปทุกสาเหตุ
    worstNight: null,  // { day, threatId, damage } คืนที่เสียหายมากที่สุด
    hordesSurvived: 0,
    bossesSurvived: 0,
    itemsPicked: 0,
    itemsUsed: 0,
    ammoFired: 0,
    itemsBroken: 0,
    foodEmptyDays: 0,  // สิ้นวันแล้วอาหารเป็น 0
    waterEmptyDays: 0, // สิ้นวันแล้วน้ำเป็น 0
    maxStress: stats.stress,
    eventsSeen: 0,     // อีเวนต์ที่เจอ
    eventChecks: 0,    // ทางเลือกที่ต้องลุ้น
    eventWins: 0,      // ลุ้นแล้วสำเร็จ
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


  // ข้อความปิดท้ายตอนตาย: ช่วงแรกต้องเริ่มวันที่ 1 และเรียงวันจากน้อยไปมาก
  const deathEndings = CONFIG.endings.died;
  if (deathEndings[0]?.fromDay !== 1) errors.push('endings.died: ช่วงแรกต้องเริ่ม fromDay: 1');
  deathEndings.forEach((ending, index) => {
    if (index > 0 && ending.fromDay <= deathEndings[index - 1].fromDay) errors.push(`endings.died[${index}]: fromDay ต้องมากกว่าช่วงก่อนหน้า`);
    if (!ending.desc) errors.push(`endings.died[${index}]: ต้องมี desc (ข้อความปิดท้าย)`);
  });
  if (!CONFIG.endings.won?.desc) errors.push('endings.won: ต้องมี desc (ข้อความปิดท้ายตอนรอดครบ)');

  // อีเวนต์ (events.js): ประเภท ทางเลือก 2-3 ทาง ผลต้องใช้ค่าสถานะ/ของที่มีจริง ทางที่ต้องลุ้นต้องมีผลตอนพลาด
  stages.forEach(stage => {
    if (!(stage.eventChance >= 0 && stage.eventChance <= 100)) errors.push(`difficultyStages ${stage.id}: eventChance ต้องอยู่ระหว่าง 0-100`);
  });
  if (new Set(EVENTS.map(event => event.id)).size !== EVENTS.length) errors.push('events.js: มี id ซ้ำกัน');
  EVENTS.forEach(event => {
    const owner = `events.js ${event.id}`;
    if (!EVENT_TYPES[event.type]) errors.push(`${owner}: ไม่รู้จักประเภท "${event.type}"`);
    if (!(event.weight > 0)) errors.push(`${owner}: weight ต้องมากกว่า 0`);
    (event.weather ?? []).forEach(id => {
      if (!findById(CONFIG.weather, id)) errors.push(`${owner}: ไม่รู้จักสภาพอากาศ "${id}"`);
    });
    if (!(event.choices?.length >= 2 && event.choices.length <= 3)) errors.push(`${owner}: ต้องมีทางเลือก 2-3 ทาง`);
    (event.choices ?? []).forEach((choice, index) => {
      const where = `${owner} ทางที่ ${index + 1}`;
      if (!choice.label) errors.push(`${where}: ต้องมี label`);
      if (choice.check && !EVENT_CHECK_MODS[choice.check]) errors.push(`${where}: ไม่รู้จัก check "${choice.check}"`);
      if (choice.check && !(choice.chance >= 0 && choice.chance <= 100)) errors.push(`${where}: chance ต้องอยู่ระหว่าง 0-100`);
      if (choice.check && !choice.fail) errors.push(`${where}: ทางที่ต้องลุ้นต้องมี fail`);
      if (!choice.check && choice.fail) errors.push(`${where}: มี fail แต่ไม่มี check (จะไม่มีวันพลาด)`);
      if (!choice.success) errors.push(`${where}: ต้องมี success`);
      if (choice.requires && choice.requires !== 'weapon') errors.push(`${where}: ไม่รู้จัก requires "${choice.requires}"`);
      [...(choice.give ?? []), ...(choice.success?.items ?? []), ...(choice.fail?.items ?? [])].forEach(id => {
        if (!getItem(id)) errors.push(`${where}: ไม่มีของ "${id}" ใน items.js`);
      });
      [choice.cost, choice.success?.effects, choice.fail?.effects].forEach(effects => Object.keys(effects ?? {}).forEach(key => {
        if (!CONFIG.stats[key]) errors.push(`${where}: ไม่รู้จักค่าสถานะ "${key}"`);
      }));
      [choice.success, choice.fail].filter(Boolean).forEach(outcome => {
        if (!outcome.text) errors.push(`${where}: ผลทุกแบบต้องมี text`);
      });
    });
  });

  // ไอคอนพิกเซล (icons.js): แผนที่พิกเซลต้องไม่เกิน 16x16 และใช้แต่สีที่มีใน ICON_COLORS
  Object.keys(PIXEL_ICONS).forEach(id => getIconLayers(id).forEach(rows => {
    if (rows.length > ICON_SIZE) errors.push(`icons.js ${id}: เกิน ${ICON_SIZE} แถว`);
    rows.forEach((row, y) => {
      if (row.length > ICON_SIZE) errors.push(`icons.js ${id} แถวที่ ${y + 1}: ยาวเกิน ${ICON_SIZE} ตัว`);
      const unknown = [...row].find(ch => ch !== '.' && !ICON_COLORS[ch]);
      if (unknown) errors.push(`icons.js ${id} แถวที่ ${y + 1}: ตัวอักษร "${unknown}" ไม่มีสีใน ICON_COLORS`);
    });
  }));
  // ทุกช่อง icon ต้องมีไอคอนใน icons.js
  [
    ...Object.entries(CONFIG.stats).map(([key, stat]) => [`ค่าสถานะ ${key}`, stat.icon]),
    ...CONFIG.occupations.map(job => [`อาชีพ ${job.id}`, job.icon]),
    ...CONFIG.traits.map(trait => [`นิสัย ${trait.id}`, trait.icon]),
    ...CONFIG.nightThreats.map(threat => [`ชนิดการบุก ${threat.id}`, threat.icon]),
    ...CONFIG.weather.map(weather => [`สภาพอากาศ ${weather.id}`, weather.icon]),
    ...ITEMS.map(item => [`items.js ${item.id}`, item.icon]),
    ...EVENTS.map(event => [`events.js ${event.id}`, event.icon]),
    ...UI_ICON_IDS.map(id => ['หน้าจอ (UI_ICON_IDS)', id]),
  ].forEach(([owner, id]) => {
    if (!PIXEL_ICONS[id]) errors.push(`${owner}: ไม่มีไอคอน "${id}" ใน icons.js`);
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
    CONFIG.endings.died.forEach(ending => checkTranslation(`ข้อความปิดท้ายวันที่ ${ending.fromDay}+`, ending));
    checkTranslation('ข้อความปิดท้ายตอนรอดครบ', CONFIG.endings.won);
    Object.entries(EVENT_TYPES).forEach(([key, type]) => checkTranslation(`ประเภทอีเวนต์ ${key}`, type));
    EVENTS.forEach(event => {
      checkTranslation(`events.js ${event.id}`, event);
      event.choices.forEach((choice, index) => {
        if (choice.label && !choice[language]?.label) errors.push(`events.js ${event.id} ทางที่ ${index + 1}: ยังไม่มีคำแปล ${language}.label`);
        [choice.success, choice.fail].filter(Boolean).forEach(outcome => {
          if (outcome.text && !outcome[language]?.text) errors.push(`events.js ${event.id} ทางที่ ${index + 1}: ยังไม่มีคำแปล ${language}.text`);
        });
      });
    });
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

// ไอคอนลำโพง: มีคลื่นเสียง = เปิดอยู่ (กดเพื่อปิด) / มีกากบาท = ปิดอยู่ (กดเพื่อเปิด)
function renderSoundButton() {
  const button = byId('sound-toggle');
  const label = soundEnabled ? t('soundMute') : t('soundUnmute');
  button.hidden = !isMusicSupported();
  button.innerHTML = iconHtml(soundEnabled ? 'speaker' : 'speaker_off', 2);
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
  byId('phase-fade').addEventListener('click', skipPhaseFade);
  // หน้าแรก: ปุ่ม "เริ่มเกม" (ไม่มีเซฟ) และปุ่มในการ์ดเซฟ (สร้างใหม่ทุกครั้งที่วาด จึงดักที่กล่องแม่)
  byId('btn-start-game').addEventListener('click', startNewGame);
  byId('save-card').addEventListener('click', event => {
    const action = event.target.closest('button[data-save-action]')?.dataset.saveAction;
    if (action === 'continue') continueSavedGame();
    if (action === 'new') startNewGame();
    if (action === 'delete') confirmDeleteSave();
  });
  byId('btn-reroll').addEventListener('click', rerollCharacter);
  byId('btn-reveal-back').addEventListener('click', backFromReveal);
  byId('btn-start-day').addEventListener('click', startDayOne);
  byId('btn-save').addEventListener('click', onSaveAndQuit);
  byId('btn-home').addEventListener('click', onHomeClick);
  byId('btn-end-home').addEventListener('click', leaveGame);
  byId('btn-end-new-game').addEventListener('click', startNewGame);
  byId('sound-toggle').addEventListener('click', onSoundToggle);
  document.addEventListener('click', startMusicOnGesture);
  document.addEventListener('keydown', startMusicOnGesture);
  window.addEventListener('storage', onStorageChanged); // แท็บอื่นบันทึก/ลบเซฟ
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
    if (action === 'show-end') showEndScreen();
    if (action === 'event-choice') chooseEventOption(Number(button.dataset.index));
    if (action === 'end-event') endEvent();
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
  migrateOldSaves(); // เซฟรุ่นก่อน (บันทึกอัตโนมัติ / มีแค่ตัวละคร) → เซฟแบบใหม่
  byId('favicon').href = iconUrl('zombie'); // ไอคอนแท็บเป็นซอมบี้พิกเซล
  bindEvents();
  applyStaticTexts();
  renderSoundButton();
  goToTitle();
}

init();
