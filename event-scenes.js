// ============================================================
//  event-scenes.js — ภาพประกอบตอนเกิดอีเวนต์ (บ่าย): ทุกอีเวนต์ใน events.js มีฉากของตัวเอง
//  ฉาก = เมืองของวันนั้น (buildScene ใน game.js) + คน ของ ร้าน ที่เกี่ยวกับอีเวนต์ + ฟองอารมณ์เหนือหัว
//  คนที่โผล่มา (คนแปลกหน้า ผู้บาดเจ็บ โจร) ใช้ภาพตัวละครแบบเดียวกับผู้เล่น (HERO_* และ EVENT_* ใน sprites.js)
//  หน้าตาคนสุ่มจากเลขประจำเกม+วัน: วันเดิมได้คนหน้าตาเดิม
//  เลือกทางแล้วภาพเปลี่ยนตามผล เช่น โจรเดินจากไป ไฟดับ ประตูห้องใต้ดินเปิด
//  ไฟล์นี้เรียกฟังก์ชันวาดภาพของ game.js ตอนเล่นเท่านั้น จึงโหลดก่อน game.js ได้
//
//  ช่องของแต่ละฉากใน EVENT_SCENES
//    ambient = ซอมบี้เดินเตร่ที่เหลือในภาพ (ไม่ใส่ = 2 ตัว เดินอยู่แค่ริมภาพ ไม่บังเรื่องราว)
//    ambientRanges = ช่วงที่ซอมบี้เดินเตร่เดินได้ (ไม่ใส่ = ริมซ้ายกับริมขวา)
//    setup(scene, model, random)  วางตัวละคร/คน/ของ (random = สุ่มแบบกำหนดเลขตั้งต้นของวันนั้น)
//    after(scene, model, result)  ภาพหลังเลือกทาง: result = { choice: ลำดับทางที่เลือก (0 = ทางแรก), success: true/false/null }
//    back(ctx, scene, model)      วาดทุกเฟรม ทับตึก ก่อนคน (ป้ายไฟกะพริบ ไฟไหม้ หลังคาปลิว)
//    front(ctx, scene, model)     วาดทุกเฟรม ทับทุกอย่าง (คลื่นวิทยุ ประกายของ ฟองความคิด)
//    step(scene, model)           ขยับของในฉาก 1 เฟรม
// ============================================================

// สีเพิ่มสำหรับท่าทาง/ของในมือ (ตัวอักษรตรงกับคำอธิบายใน sprites.js)
const EVENT_PROP_COLORS = {
  0: '#8a1a1e', 1: '#6a2a24', 2: '#e8e0c8', 3: '#8a5a30', 4: '#e8d8b8',
  5: '#5a4a3a', 6: '#3a3a42', 7: '#16161c', 8: '#e8c060', 9: '#9a9aa2', q: '#8a3434', Q: '#5e2020',
};

const EVENT_INK = '#1a1418';   // เส้นขอบของ/ฟองคำพูด
const EVENT_PAPER = '#f4efe4'; // พื้นฟองคำพูด
const CELLAR_COLORS = { d: '#7a5232', D: '#5a3a24', M: '#9a9aa2', y: '#d8b040', s: '#3a3238', k: '#0e0a0c', x: '#3a3034' };
const VENDING_COLORS = {
  R: '#a83434', r: '#6a2020', L: '#f0e0a0', g: '#1e2a36', a: '#e8c040', b: '#4a9ad8', c: '#e8e8e0',
  p: '#3a2e30', y: '#f0e060', k: '#120e10', x: '#c8dce8',
};
const EVENT_PROP_PALETTES = { // ชุดสีของ EVENT_PROPS (ชื่อเดียวกัน)
  bucket: { R: '#7aa8d8', i: '#141820', B: '#3a6aa8', b: '#5a8ac8' },
  cellar: CELLAR_COLORS,
  cellarOpen: CELLAR_COLORS,
  crate: { D: '#a87a48', d: '#6a4a2a', w: '#7a5230' },
  vending: VENDING_COLORS,
  vendingBroken: VENDING_COLORS,
  shoe: { S: '#4a3424', s: '#1e140e' },
};
const EMOTE_COLORS = { r: '#d83a3a', b: '#3a6ad8', k: '#2a2228', p: '#e0507a' };
const EMOTE_CYCLE = 56; // ฟองอารมณ์โผล่ซ้ำทุกกี่เฟรม (8 เฟรม = 1 วินาที)
const EMOTE_SHOWN = 38; // ...และค้างอยู่กี่เฟรมในรอบนั้น
const BUCKET_WATER = '#5a9ad8';
const EVENT_AMBIENT_RANGES = [[2, 38], [204, 222]]; // ซอมบี้เดินเตร่อยู่แค่ริมซ้าย/ขวาของภาพ (ขอบซ้ายของตัว)
const EVENT_FACADE_X = 168; // ร้าน/โรงเรียนของอีเวนต์อยู่ทางขวาของที่พักเสมอ

// ------------------------------------------------------------
// สร้างฉาก / อัปเดตตามสถานะเกม
// ------------------------------------------------------------

// ใส่ฉากอีเวนต์ลงในภาพเมืองที่สร้างแล้ว (เรียกจาก showAnimatedScene ใน game.js)
function setupEventScene(model, eventId, runSeed, day) {
  const spec = EVENT_SCENES[eventId];
  if (!spec) return;
  const scene = {
    id: eventId,
    hero: makeEventPerson({ x: model.shelter.doorX, feetY: HERO_FEET_Y }),
    npcs: [],
    props: [],
    state: {},
    resolved: false,
    backLayer: null,
  };
  model.eventScene = scene;
  keepAmbientZombies(model, spec.ambient ?? 2, spec.ambientRanges);
  spec.setup(scene, model, createSeededRandom(mixSeed(runSeed, day, SEED_SALT.event)));
}

// ตัวละครของผู้เล่นในฉาก: หน้าตา/ของที่ถือเหมือนในภาพปกติ / เลือกทางแล้ว → เปลี่ยนภาพตามผล (ครั้งเดียว)
function updateEventScene(model) {
  const scene = model.eventScene;
  if (!scene) return;
  Object.assign(scene.hero, {
    look: model.hero.look,
    palette: { ...model.hero.palette, ...EVENT_PROP_COLORS },
    gear: model.hero.gear,
  });
  if (game.event?.resolved && !scene.resolved) {
    scene.resolved = true;
    EVENT_SCENES[scene.id].after?.(scene, model, { choice: game.event.choiceIndex, success: game.event.success });
  }
}

// ซอมบี้เดินเตร่ที่เหลือ: เก็บไว้ไม่กี่ตัว ให้เดินอยู่แค่ริมภาพ (ตัวใหญ่/ตัวที่กำลังรุมประตูเอาออก)
// ranges = ช่วงที่แต่ละตัวเดินได้ (ขอบซ้ายของตัว) ฉากที่ตัวละครอยู่ริมซ้ายให้ซอมบี้อยู่ฝั่งขวาแทน
function keepAmbientZombies(model, count, ranges = EVENT_AMBIENT_RANGES) {
  model.zombies = model.zombies.filter(zombie => zombie.target == null && zombie.kind !== 'boss').slice(0, count);
  model.zombies.forEach((zombie, index) => {
    const [from, to] = ranges[index % ranges.length];
    zombie.range = [from, to];
    zombie.x = randomInt(from, to);
  });
}

function stepEventScene(model) {
  const scene = model.eventScene;
  if (!scene) return;
  [scene.hero, ...scene.npcs].forEach(stepEventPerson);
  EVENT_SCENES[scene.id].step?.(scene, model);
}

// ------------------------------------------------------------
// คนในฉาก (ตัวละครของผู้เล่น + คนที่โผล่มา)
//   x = กึ่งกลางตัว, feetY = แถวที่เท้าแตะพื้น, dir = 1 หันขวา / -1 หันซ้าย
//   pose: stand / wave / sit / phone / armsUp / window (แอบอยู่ในหน้าต่างที่พัก)
//   hold = ของที่ถือที่อก (EVENT_HELD_ITEMS), walk = กำลังเดินไปที่ไหน, gone = ออกจากภาพไปแล้ว
// ------------------------------------------------------------
function makeEventPerson(fields) {
  return { dir: 1, pose: 'stand', hold: null, gear: {}, emote: null, emoteFrame: 0, walk: null, gone: false, phase: randomInt(0, 3), ...fields };
}

// หน้าตาคนที่โผล่ในอีเวนต์: ช่องที่ไม่ได้กำหนดสุ่มจาก CONFIG.appearance (ใส่เป็นรายการ = สุ่มจากในรายการ)
// สุ่มทุกช่องตามลำดับเดิมเสมอ วันเดิมจึงได้คนหน้าตาเดิม
function makeNpcLook(random, gender, fixed = {}) {
  const options = CONFIG.appearance;
  const forGender = list => list.filter(option => !option.genders || option.genders.includes(gender));
  const pick = (key, list) => {
    const pool = Array.isArray(fixed[key]) ? fixed[key] : forGender(list).map(option => option.id);
    const id = pool[Math.floor(random() * pool.length)];
    return typeof fixed[key] === 'string' ? fixed[key] : id;
  };
  return {
    skin: pick('skin', options.skinTones),
    hairColor: pick('hairColor', options.hairColors.filter(color => (color.weight ?? 1) >= 1)), // สีผมสด ๆ ไม่ใช้กับคนแปลกหน้า
    hairStyle: pick('hairStyle', options.hairStyles.filter(style => !style.minAge)),
    shirt: pick('shirt', options.shirtColors),
    outfit: pick('outfit', options.outfits),
    pants: pick('pants', options.pantsColors),
    hat: pick('hat', [{ id: 'none' }]),
    accessory: pick('accessory', [{ id: 'none' }]),
    glasses: pick('glasses', [{ id: 'none' }]),
    facialHair: pick('facialHair', [{ id: 'none' }]),
  };
}

// เพิ่มคนที่โผล่ในอีเวนต์ (def = ช่องของคน + gender, look = หน้าตาที่กำหนด, weapon/backpack = ของที่ถือ)
function addEventNpc(scene, random, def) {
  const { gender, look: fixedLook, weapon = null, backpack = false, ...fields } = def;
  const look = makeNpcLook(random, gender, fixedLook);
  const person = makeEventPerson({
    ...fields,
    look,
    palette: { ...buildHeroPalette({ look, gender }), ...EVENT_PROP_COLORS },
    gear: { weapon, backpack },
  });
  scene.npcs.push(person);
  return person;
}

function placeHero(scene, fields) {
  Object.assign(scene.hero, fields);
  return scene.hero;
}

function setEmote(person, kind, model) {
  person.emote = kind;
  person.emoteFrame = model.frame;
}

// เดินไปที่ x (leave = เดินพ้นขอบภาพแล้วหายไป, limp = เดินกะเผลก)
// ผู้เล่นที่ตั้งลดการเคลื่อนไหวไว้ เห็นไปถึงที่ทันที
function walkTo(person, x, speed, options = {}) {
  person.walk = { to: x, speed, ...options };
  person.dir = Math.sign(x - person.x) || person.dir;
  if (prefersReducedMotion()) finishWalk(person);
}

function leaveScene(person, dir, speed, options = {}) {
  walkTo(person, dir > 0 ? SCENE_WIDTH + 12 : -12, speed, { ...options, leave: true });
}

function finishWalk(person) {
  person.x = person.walk.to;
  if (person.walk.leave) person.gone = true;
  person.walk = null;
}

function stepEventPerson(person) {
  if (!person.walk) return;
  const distance = person.walk.to - person.x;
  if (Math.abs(distance) <= person.walk.speed) finishWalk(person);
  else person.x += Math.sign(distance) * person.walk.speed;
}

// ประกอบภาพคน: ภาพตัวละครปกติ (composeHeroContent) + เป้ใหญ่ ผ้าปิดหน้า ท่าทาง ของในมือ แผล ท่านั่ง
function composeEventPerson(person, frame) {
  const step = frame + person.phase;
  const busyHands = person.hold || ['sit', 'phone', 'armsUp'].includes(person.pose);
  const gear = busyHands ? { ...person.gear, weapon: null } : person.gear;
  let legs = 'stand';
  if (person.walk) {
    legs = person.walk.limp ? ['pass', 'pass', 'stand', 'stand'][step % 4] : (Math.floor(step / 2) % 2 ? 'pass' : 'stride');
  }
  const wave = person.pose === 'wave' ? Math.floor(step / 3) % 2 : null;
  const grid = composeHeroContent(person.look, gear, legs, { wave, hideBelt: person.pose === 'sit' });
  // under = เติมเฉพาะจุดที่ยังว่าง (ของที่อยู่หลังตัว)
  const paint = (part, under = false) => part.rows.forEach((row, y) => {
    const target = grid[part.top + y];
    if (!target) return;
    for (let x = 0; x < row.length; x++) {
      if (row[x] === '.') continue;
      if (row[x] === '_') target[x] = '.';
      else if (!under || target[x] === '.') target[x] = row[x];
    }
  });
  if (person.bigPack) paint(EVENT_BIG_PACK, true);
  if (person.mask) paint(EVENT_MASK);
  if (EVENT_POSES[person.pose]) paint(EVENT_POSES[person.pose]);
  if (person.hold) {
    paint(EVENT_POSES.hold);
    paint(EVENT_HELD_ITEMS[person.hold]);
  }
  if (person.pose !== 'sit') return outlineSprite(grid);
  // นั่ง: ขาแถว 18-21 เปลี่ยนเป็นขาเหยียดมาข้างหน้า 2 แถว (กระโปรง/ชายเสื้อโค้ตยังคลุมแถวแรก)
  for (let y = 18; y < HERO_HEIGHT; y++) grid[y].fill('.');
  paint({ top: 18, rows: EVENT_SIT_LEGS });
  const skirt = HERO_OUTFITS[person.look.outfit]?.skirt;
  if (skirt) paint({ top: 18, rows: [skirt[0]] });
  if (person.wound) paint(EVENT_LEG_WOUND);
  if (person.bandage) paint(EVENT_LEG_BANDAGE);
  return outlineSprite(grid.slice(0, 18 + EVENT_SIT_LEGS.length));
}

// ไข้ขึ้น: หน้าแดงเรื่อ
function flushedPalette(person) {
  if (person.flushCache?.base !== person.palette) {
    const { S, s } = person.palette;
    person.flushCache = { base: person.palette, palette: { ...person.palette, S: mixColors(S, '#e0504a', 0.3), s: mixColors(s, '#c0383a', 0.3) } };
  }
  return person.flushCache.palette;
}

function drawEventPerson(ctx, person, model) {
  if (person.gone) return;
  const palette = person.flushed ? flushedPalette(person) : person.palette;
  if (person.pose === 'window') { // แอบในหน้าต่างชั้น 2 ของที่พัก (ตัดส่วนที่เกินกรอบ)
    const win = model.shelter.window;
    ctx.save();
    ctx.beginPath();
    ctx.rect(win.x, win.y, win.w, win.h);
    ctx.clip();
    drawMiniSprite(ctx, composeHero(person.look, person.gear, 'stand', { weaponShift: -4, hideBelt: true }), palette, win.x, win.y + 2, person.dir < 0);
    ctx.restore();
    person.drawn = null;
    return;
  }
  const rows = composeEventPerson(person, model.frame);
  const shake = person.shiver ? (model.frame % 2) * 2 - 1 : 0; // ตัวสั่น ±1 จุด
  const bob = person.bob && !person.walk ? Math.floor((model.frame + person.phase) / 4) % 2 : 0; // โยกตัวข่มขู่
  const left = Math.round(person.x) - Math.floor(HERO_DRAWN_WIDTH / 2) + shake;
  const top = person.feetY - rows.length + 1 - bob;
  drawMiniSprite(ctx, rows, palette, left, top, person.dir < 0);
  person.drawn = { left, top, width: rows[0].length };
}

// ------------------------------------------------------------
// ของบนพื้น (EVENT_PROPS): x = ขอบซ้าย, feetY = แถวล่างสุด
// ------------------------------------------------------------
function makeProp(id, x, feetY) {
  const prop = { x, feetY };
  setPropSprite(prop, id);
  return prop;
}

// เปลี่ยนภาพของชิ้นเดิม (เช่น ประตูห้องใต้ดินเปิด / ตู้กดน้ำกระจกแตก)
function setPropSprite(prop, id) {
  prop.id = id;
  prop.rows = outlineSprite(EVENT_PROPS[id]);
  prop.palette = { K: EVENT_INK, ...EVENT_PROP_PALETTES[id] };
}

function addProp(scene, id, x, feetY) {
  const prop = makeProp(id, x, feetY);
  scene.props.push(prop);
  return prop;
}

function drawEventProp(ctx, prop) {
  drawMiniSprite(ctx, prop.rows, prop.palette, prop.x, prop.feetY - prop.rows.length + 1, false);
}

// ------------------------------------------------------------
// วาดฉากทีละชั้น (เรียกจาก drawSceneFrame ใน game.js)
// ------------------------------------------------------------
function drawEventBack(ctx, model) {
  const scene = model.eventScene;
  if (scene.backLayer) ctx.drawImage(scene.backLayer, 0, 0);
  EVENT_SCENES[scene.id].back?.(ctx, scene, model);
}

// คน ซอมบี้ และของบนพื้น เรียงตามระยะ (ตัวที่ยืนต่ำกว่า = ใกล้กว่า วาดทับทีหลัง)
function drawEventActors(ctx, model) {
  const scene = model.eventScene;
  const layers = [
    ...model.zombies.map(zombie => ({ y: zombie.feetY, draw: () => drawSceneZombies(ctx, [zombie], model.frame) })),
    ...scene.props.map(prop => ({ y: prop.feetY, draw: () => drawEventProp(ctx, prop) })),
    ...[scene.hero, ...scene.npcs].map(person => ({
      y: person.pose === 'window' ? -1 : person.feetY,
      draw: () => drawEventPerson(ctx, person, model),
    })),
  ];
  layers.sort((a, b) => a.y - b.y).forEach(layer => layer.draw());
}

function drawEventFront(ctx, model) {
  const scene = model.eventScene;
  EVENT_SCENES[scene.id].front?.(ctx, scene, model);
  [scene.hero, ...scene.npcs].forEach(person => {
    if (!person.emote || person.gone || !person.drawn) return;
    if ((model.frame - person.emoteFrame) % EMOTE_CYCLE >= EMOTE_SHOWN) return;
    drawEmote(ctx, person.emote, person.drawn.left + Math.floor(person.drawn.width / 2), person.drawn.top - 1);
  });
}

// ฟองคำพูดเล็ก ๆ เหนือหัว: กล่อง 9x7 + หางชี้ลง (bottomY = แถวล่างสุดของหาง)
function drawEmote(ctx, kind, centerX, bottomY) {
  const left = centerX - 4;
  const top = bottomY - 8;
  fillPixels(ctx, EVENT_INK, left + 1, top, 7, 1);
  fillPixels(ctx, EVENT_INK, left, top + 1, 1, 5);
  fillPixels(ctx, EVENT_INK, left + 8, top + 1, 1, 5);
  fillPixels(ctx, EVENT_INK, left + 1, top + 6, 7, 1);
  fillPixels(ctx, EVENT_PAPER, left + 1, top + 1, 7, 5);
  fillPixels(ctx, EVENT_PAPER, left + 4, top + 6);
  fillPixels(ctx, EVENT_INK, left + 3, top + 7);
  fillPixels(ctx, EVENT_PAPER, left + 4, top + 7);
  fillPixels(ctx, EVENT_INK, left + 5, top + 7);
  fillPixels(ctx, EVENT_INK, left + 4, top + 8);
  EVENT_EMOTES[kind].forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      if (row[x] !== '.') fillPixels(ctx, EMOTE_COLORS[row[x]], left + 2 + x, top + 1 + y);
    }
  });
}

// ฟองความคิดขยายของในมือให้เห็นชัด: กล่องมุมมน + วงกลมเล็ก ๆ ไล่ลงไปหาหัวคน
function drawThoughtBubble(ctx, box, person, drawContent) {
  const { x, y, w, h } = box;
  fillPixels(ctx, EVENT_INK, x + 2, y, w - 4, 1);
  fillPixels(ctx, EVENT_INK, x + 2, y + h - 1, w - 4, 1);
  fillPixels(ctx, EVENT_INK, x, y + 2, 1, h - 4);
  fillPixels(ctx, EVENT_INK, x + w - 1, y + 2, 1, h - 4);
  [[1, 1], [w - 2, 1], [1, h - 2], [w - 2, h - 2]].forEach(([dx, dy]) => fillPixels(ctx, EVENT_INK, x + dx, y + dy));
  fillPixels(ctx, EVENT_PAPER, x + 2, y + 1, w - 4, h - 2);
  fillPixels(ctx, EVENT_PAPER, x + 1, y + 2, w - 2, h - 4);
  drawContent(ctx, x + 2, y + 2);
  if (!person.drawn) return;
  // ปลายทางอยู่ข้างหัว (ไม่ทับฟองอารมณ์ที่อยู่เหนือหัว)
  const toX = person.drawn.left + person.drawn.width + 1;
  const toY = person.drawn.top + 4;
  [[0.35, 2], [0.75, 1]].forEach(([t, size]) => {
    const cx = Math.round(x + 6 + (toX - x - 6) * t);
    const cy = Math.round(y + h + (toY - y - h) * t);
    fillPixels(ctx, EVENT_INK, cx - size, cy - size + 1, size * 2 + 1, size * 2 - 1);
    fillPixels(ctx, EVENT_INK, cx - size + 1, cy - size, size * 2 - 1, size * 2 + 1);
    fillPixels(ctx, EVENT_PAPER, cx - size + 1, cy - size + 1, size * 2 - 1, size * 2 - 1);
  });
}

// ------------------------------------------------------------
// ของประกอบที่วาดด้วยโค้ด (ร้านค้า โรงเรียน ไฟไหม้ หลังคา คลื่นวิทยุ ประกาย)
// ------------------------------------------------------------

// ป้ายร้าน/อาคารวาดทับตึกแถวเดิม: เสาไฟที่โดนบังไม่ต้องวาดแสงไฟ และปูทางเท้าทับโคนเสา
function makeFacadeLayer(scene, model, from, to, draw) {
  const lamp = model.lamp;
  if (lamp.x + 6 >= from && lamp.x <= to) lamp.hidden = true;
  scene.backLayer = createSceneLayer(ctx => {
    draw(ctx);
    fillPixels(ctx, model.colors.sidewalk, from, SCENE_GROUND, to - from, 4);
  });
}

// ผนังตึกแถว 1 คูหา (กรอบ + หน้าต่างชั้นบนมืด 2 บาน) คืนแถวบนสุดของตึก
function drawFacadeShell(ctx, colors, x, width, height) {
  const top = SCENE_GROUND - height;
  fillPixels(ctx, colors.shophouse, x, top, width, height);
  fillPixels(ctx, colors.shophouseLight, x, top, width, 1);
  fillPixels(ctx, colors.shophouseLight, x, top, 1, height);
  fillPixels(ctx, colors.shophouseLight, x + width - 1, top, 1, height);
  for (const windowX of [x + 6, x + width - 12]) {
    fillPixels(ctx, colors.shophouseLight, windowX - 1, top + 2, 8, 6);
    fillPixels(ctx, colors.window, windowX, top + 3, 6, 4);
  }
  return top;
}

// ร้านขายยา: ป้ายเขียว กระจกหน้าร้านแตก ชั้นวางยาล้มระเนระนาดอยู่ข้างใน
function drawPharmacy(ctx, colors, x, random) {
  const width = 46;
  const top = drawFacadeShell(ctx, colors, x, width, 24);
  fillPixels(ctx, '#1d3d2e', x + 2, top + 9, width - 4, 4);
  for (let textX = x + 6; textX < x + width - 10; textX += 2) {
    if (random() < 0.75) fillPixels(ctx, 'rgba(210, 240, 220, 0.55)', textX, top + 10, 1, 2);
  }
  const glassTop = top + 14;
  const glassHeight = SCENE_GROUND - glassTop;
  fillPixels(ctx, '#121c24', x + 2, glassTop, width - 4, glassHeight);
  // ชั้นวางล้มเอียง + กล่องยาหล่นเกลื่อนพื้นร้าน
  for (let i = 0; i < 9; i++) fillPixels(ctx, '#3e3238', x + 5 + i, glassTop + 2 + Math.floor(i * 0.7), 1, 2);
  for (let i = 0; i < 8; i++) fillPixels(ctx, '#3e3238', x + 31 + i, glassTop + 7 - Math.floor(i * 0.6), 1, 2);
  for (let i = 0; i < 14; i++) {
    fillPixels(ctx, ['#d8d0c0', '#c84a4a', '#4a7ac8', '#e8c060'][i % 4], x + 4 + randomBetween(random, 0, width - 10), SCENE_GROUND - 1 - randomBetween(random, 0, 2));
  }
  // กรอบกระจก + ประตูกระจกที่แตกเป็นรู มีรอยร้าวแตกออกไปรอบ ๆ
  for (const frameX of [x + 2, x + 16, x + 29, x + width - 3]) fillPixels(ctx, colors.shophouseLight, frameX, glassTop, 1, glassHeight);
  const holeX = x + 22;
  const holeY = glassTop + 4;
  fillPixels(ctx, '#05080a', holeX - 2, holeY - 1, 4, 3);
  fillPixels(ctx, '#05080a', holeX - 1, holeY - 2, 2, 5);
  const crack = 'rgba(190, 215, 230, 0.7)';
  [[-1, -1], [1, -1], [-1, 1], [1, 1], [0, 1], [1, 0]].forEach(([dx, dy]) => {
    for (let i = 2; i < 6; i++) fillPixels(ctx, crack, holeX + dx * i + (dx === 0 ? (i % 2) : 0), holeY + dy * i);
  });
}

// กางเขนสีเขียวหน้าร้านขายยา (ไฟใกล้เสีย กะพริบเป็นพัก ๆ)
function drawPharmacyCross(ctx, x, on) {
  const top = SCENE_GROUND - 24 + 1;
  const color = on ? '#4ae08a' : '#1e4a34';
  if (on) fillPixelCircle(ctx, x + 3, top + 3, 6, 'rgba(74, 224, 138, 0.18)');
  fillPixels(ctx, color, x + 2, top, 3, 7);
  fillPixels(ctx, color, x, top + 2, 7, 3);
}

// ตัวเลขพิกเซล 3x5 (ใช้บนป้ายร้าน "24")
const SIGN_DIGITS = {
  2: ['111', '..1', '111', '1..', '111'],
  4: ['1.1', '1.1', '111', '..1', '..1'],
};

// ร้านสะดวกซื้อหัวมุม: ป้ายเปิด 24 ชม. แถบขาว-น้ำเงิน-แดง ชั้นวางของหลังกระจกมืด ๆ
function drawCornerStore(ctx, colors, x, random) {
  const width = 44;
  const top = drawFacadeShell(ctx, colors, x, width, 24);
  fillPixels(ctx, '#e8e0d0', x + 2, top + 8, width - 4, 1);
  fillPixels(ctx, '#2a4a8a', x + 2, top + 9, width - 4, 5);
  fillPixels(ctx, '#c84a3a', x + 2, top + 14, width - 4, 1);
  [2, 4].forEach((digit, index) => SIGN_DIGITS[digit].forEach((row, y) => {
    for (let dx = 0; dx < 3; dx++) if (row[dx] === '1') fillPixels(ctx, '#f0d060', x + 5 + index * 4 + dx, top + 9 + y);
  }));
  const glassTop = top + 16;
  fillPixels(ctx, '#121820', x + 2, glassTop, width - 4, SCENE_GROUND - glassTop);
  for (let shelfY = glassTop + 3; shelfY < SCENE_GROUND - 1; shelfY += 3) { // ชั้นวางของ + ของที่เหลืออยู่ประปราย
    fillPixels(ctx, '#2e2a34', x + 3, shelfY, 13, 1);
    fillPixels(ctx, '#2e2a34', x + width - 16, shelfY, 13, 1);
    for (let itemX = x + 3; itemX < x + width - 3; itemX += 2) {
      if (random() < 0.3 && (itemX < x + 16 || itemX >= x + width - 16)) {
        fillPixels(ctx, ['#a85a4a', '#4a7aa8', '#c8a848', '#6a9a5a'][randomBetween(random, 0, 3)], itemX, shelfY - 1);
      }
    }
  }
  fillPixels(ctx, colors.shophouseLight, x + 17, glassTop, 1, SCENE_GROUND - glassTop); // ประตูบานเลื่อนตรงกลาง
  fillPixels(ctx, colors.shophouseLight, x + width - 18, glassTop, 1, SCENE_GROUND - glassTop);
  fillPixels(ctx, '#0a0e12', x + 18, glassTop + 1, width - 36, SCENE_GROUND - glassTop - 1);
}

// โรงเรียน: ตึกเรียนมีนาฬิกา รั้วกำแพงเตี้ย ประตูเหล็ก ป้ายชื่อโรงเรียน
function drawSchool(ctx, colors, x) {
  const top = SCENE_GROUND - 30;
  const right = SCENE_WIDTH;
  fillPixels(ctx, '#2e2434', x, top, right - x, SCENE_GROUND - top);
  fillPixels(ctx, '#3e3242', x, top, right - x, 2);
  for (let row = 0; row < 2; row++) {
    for (let windowX = x + 4; windowX < right - 4; windowX += 7) {
      fillPixels(ctx, '#1a1420', windowX, top + 5 + row * 9, 5, 5);
      fillPixels(ctx, '#3e3242', windowX, top + 7 + row * 9, 5, 1);
    }
  }
  const clockX = x + 36; // นาฬิกาหน้าตึก (หยุดเดินไปนานแล้ว)
  fillPixelCircle(ctx, clockX, top - 2, 4, '#3e3242');
  fillPixelCircle(ctx, clockX, top - 2, 3, '#c8b8a0');
  fillPixels(ctx, '#2a2228', clockX, top - 4, 1, 3);
  fillPixels(ctx, '#2a2228', clockX, top - 2, 2, 1);
  // กำแพงรั้ว + ซี่รั้วเหล็กด้านบน
  fillPixels(ctx, '#4a3c48', x, SCENE_GROUND - 8, right - x, 8);
  fillPixels(ctx, '#5c4c58', x, SCENE_GROUND - 9, right - x, 1);
  for (let barX = x + 1; barX < right; barX += 3) fillPixels(ctx, '#1a141c', barX, SCENE_GROUND - 15, 1, 6);
  fillPixels(ctx, '#1a141c', x, SCENE_GROUND - 15, right - x, 1);
  // ประตูโรงเรียน: เสา 2 ต้น + ประตูเหล็ก
  const gateX = x + 42;
  fillPixels(ctx, '#0e0a10', gateX + 4, SCENE_GROUND - 15, 20, 15);
  for (let barX = gateX + 5; barX < gateX + 24; barX += 2) fillPixels(ctx, '#3a3a46', barX, SCENE_GROUND - 13, 1, 13);
  fillPixels(ctx, '#3a3a46', gateX + 4, SCENE_GROUND - 13, 20, 1);
  fillPixels(ctx, '#3a3a46', gateX + 4, SCENE_GROUND - 6, 20, 1);
  for (const pillarX of [gateX, gateX + 24]) {
    fillPixels(ctx, '#5c4c58', pillarX, SCENE_GROUND - 18, 4, 18);
    fillPixels(ctx, '#6c5c68', pillarX, SCENE_GROUND - 19, 4, 1);
  }
  fillPixels(ctx, '#c8c0a8', x + 26, SCENE_GROUND - 7, 12, 4); // ป้ายชื่อโรงเรียน
  for (let textX = x + 27; textX < x + 37; textX += 2) fillPixels(ctx, '#4a3c48', textX, SCENE_GROUND - 6, 1, 2);
}

// ช่องหน้าต่างของที่พัก (ไฟไหม้): ชั้น 3 สามบาน + ชั้น 2 สองบาน
function shelterFireSpots(shelter) {
  const { x, top, window: win } = shelter;
  return [
    { x: x + 6, y: top + 4, w: 6, h: 5 },
    { x: x + 20, y: top + 4, w: 6, h: 5 },
    { x: x + 34, y: top + 4, w: 6, h: 5 },
    { x: win.x, y: win.y, w: win.w, h: win.h },
    { x: x + 29, y: top + 14, w: 13, h: 10 },
  ];
}

const STEAM_COLORS = { smoke: ['rgba(150, 150, 160, 0.35)', 'rgba(110, 110, 120, 0.3)'] };

function drawShelterFire(ctx, scene, model) {
  const { colors, shelter } = model;
  const spots = shelterFireSpots(shelter);
  if (scene.state.fireOut) { // ดับแล้ว: หน้าต่างดำเป็นตอตะโก
    spots.forEach(spot => fillPixels(ctx, '#0c080a', spot.x, spot.y, spot.w, spot.h));
  } else {
    fillPixels(ctx, 'rgba(255, 120, 40, 0.1)', shelter.x - 4, shelter.top - 8, shelter.width + 8, SCENE_GROUND - shelter.top + 8);
    spots.forEach(spot => {
      for (let y = 0; y < spot.h; y++) { // ล่างร้อนจัด บนแดงเข้ม
        const roll = Math.random();
        const hot = y > spot.h / 2;
        const color = hot ? (roll < 0.5 ? colors.fireBright : colors.fireWindow) : (roll < 0.5 ? colors.fireWindow : colors.fireDim);
        fillPixels(ctx, color, spot.x, spot.y + y, spot.w, 1);
      }
      for (let x = 0; x < spot.w; x++) { // เปลวไฟเลียออกนอกกรอบหน้าต่าง
        if (Math.random() < 0.45) fillPixels(ctx, Math.random() < 0.5 ? colors.fireBright : colors.fireWindow, spot.x + x, spot.y - randomInt(1, 3), 1, 2);
      }
    });
  }
  scene.state.smokes.forEach(points => drawSmoke(ctx, scene.state.fireOut ? STEAM_COLORS : colors, points, model.frame));
}

// แผ่นสังกะสีบนหลังคาที่พักโดนลมตีขึ้นลง (ซ่อมแล้ว = แนบหลังคา มีหัวตะปู)
const ROOF_SHEET_LENGTH = 16;
function drawRoofSheet(ctx, scene, model) {
  const { x, top } = model.shelter;
  const hingeX = x + 24;
  if (scene.state.roofFixed) {
    fillPixels(ctx, '#9aa2ac', hingeX, top - 1, ROOF_SHEET_LENGTH, 1);
    for (let nailX = hingeX + 1; nailX < hingeX + ROOF_SHEET_LENGTH; nailX += 4) fillPixels(ctx, '#e8e4dc', nailX, top - 1);
    return;
  }
  fillPixels(ctx, '#06040a', hingeX, top, ROOF_SHEET_LENGTH, 2); // ช่องโหว่บนหลังคา
  const angle = [0.45, 0.85, 1.2, 0.9, 0.6][Math.floor(model.frame / 2) % 5];
  for (let i = 0; i < ROOF_SHEET_LENGTH; i++) {
    const px = Math.round(hingeX + Math.cos(angle) * i);
    const py = Math.round(top - 1 - Math.sin(angle) * i);
    fillPixels(ctx, i % 3 === 0 ? '#5a626c' : '#9aa2ac', px, py, 2, 2); // ลอนสังกะสี
  }
}

// คลื่นวิทยุ: เส้นโค้งเล็ก ๆ กระจายออกจากเสาอากาศ (dir = ทิศที่คลื่นกระจายออกไป)
function drawRadioWaves(ctx, x, y, dir, frame) {
  for (let ring = 0; ring < 3; ring++) {
    if ((Math.floor(frame / 2) + ring) % 3 === 0) continue;
    const distance = 2 + ring * 2;
    const color = `rgba(255, 240, 200, ${0.85 - ring * 0.2})`;
    fillPixels(ctx, color, x + dir * distance, y - 1, 1, 3);
    fillPixels(ctx, color, x + dir * (distance - 1), y - 2);
    fillPixels(ctx, color, x + dir * (distance - 1), y + 2);
  }
}

// ตำแหน่งปลายเสาอากาศของวิทยุที่คนถืออยู่ (ภาพที่วาดแล้ว: +1 จุดเพราะเส้นขอบ)
function radioTip(person) {
  const { left, top, width } = person.drawn;
  const column = person.hold === 'radio' ? 10 : 14; // วิทยุพกพาที่อก / วิทยุสื่อสารแนบหู
  const row = person.hold === 'radio' ? 12 : 5;
  return { x: left + (person.dir < 0 ? width - 1 - column : column), y: top + row };
}

// ประกายแวววาว (+) เล็ก ๆ กะพริบ
function drawSparkle(ctx, x, y, frame, offset = 0) {
  const cycle = (frame + offset) % 16;
  if (cycle > 5) return;
  const color = 'rgba(255, 250, 220, 0.95)';
  fillPixels(ctx, color, x, y);
  if (cycle > 0 && cycle < 5) {
    fillPixels(ctx, color, x - 1, y);
    fillPixels(ctx, color, x + 1, y);
    fillPixels(ctx, color, x, y - 1);
    fillPixels(ctx, color, x, y + 1);
  }
}

// โน้ตเพลงลอยขึ้นจากวิทยุ
function drawMusicNotes(ctx, x, y, frame) {
  for (let i = 0; i < 2; i++) {
    const age = (frame + i * 12) % 24;
    const noteX = x + 2 + Math.floor(age / 4) + i * 3;
    const noteY = y - 2 - Math.floor(age / 2);
    const color = `rgba(255, 236, 190, ${(1 - age / 24).toFixed(2)})`;
    fillPixels(ctx, color, noteX, noteY + 2, 2, 1);
    fillPixels(ctx, color, noteX + 1, noteY, 1, 2);
    fillPixels(ctx, color, noteX + 2, noteY);
  }
}

// ฝนหนักขึ้น (อีเวนต์ฝน/พายุ): เติมสายฝนอีก 2 ชุด
function makeHeavyRain(model) {
  model.weatherId = 'rain';
  model.rain.push(...makeRain(Math.random, 'rain'), ...makeRain(Math.random, 'rain'));
}

// พายุ: ฟ้าแลบบ่อยกว่าปกติ
function stepStorm(model, chance) {
  if (!model.bolt && Math.random() < chance) startLightning(model);
}

// เลือดค่อย ๆ นองใต้ขาที่บาดเจ็บ + หยดเลือดไหลลงพื้น
// (วาดก่อนตัวคน: แอ่งเลือดอยู่ใต้ขาแล้วไหลเลยปลายเท้าออกมา)
function drawBloodPool(ctx, scene, person) {
  if (person.gone || person.pose !== 'sit') return;
  const size = Math.min(16, 6 + Math.floor(scene.state.bleed / 10));
  const left = Math.round(person.x) - 9;
  fillPixels(ctx, '#7a1216', left + 1, person.feetY, size, 2);
  fillPixels(ctx, '#7a1216', left + 3, person.feetY + 2, Math.max(2, size - 5), 1);
  fillPixels(ctx, '#a82a2a', left + 3, person.feetY + 1, 2, 1); // เงาสะท้อนบนแอ่งเลือด
}

// หยดเลือดจากแผลที่ขา (วาดทับตัวคน)
function drawBloodDrip(ctx, person, frame) {
  if (person.gone || person.pose !== 'sit' || person.bandage || !person.drawn || frame % 8 > 4) return;
  const x = person.drawn.left + (person.dir < 0 ? person.drawn.width - 4 : 3); // แผลอยู่ขาซ้าย (คอลัมน์ 3 รวมเส้นขอบ)
  fillPixels(ctx, '#a01c20', x, person.drawn.top + 19 + Math.floor((frame % 8) / 3));
}

// กระป๋องน้ำกลิ้งเกลื่อนพื้นหน้าตู้กดน้ำ
function dropCans(scene, count, machine) {
  scene.state.cans = Array.from({ length: count }, (_, i) => ({
    x: machine.x + 1 + ((i * 5 + randomInt(0, 2)) % 18),
    y: machine.feetY + 2 + (i % 3),
    color: ['#e8c040', '#4a9ad8', '#e8e8e0'][i % 3],
  }));
}

function drawCans(ctx, cans) {
  (cans ?? []).forEach(can => {
    fillPixels(ctx, EVENT_INK, can.x - 1, can.y - 1, 4, 3);
    fillPixels(ctx, can.color, can.x, can.y, 2, 1);
    fillPixels(ctx, '#c8ccd0', can.x + 2, can.y);
  });
}

// ซอมบี้ที่อีเวนต์เรียกเข้ามา (เดินมาหยุดที่ targetX แล้วโยกตัว)
function addEventZombie(model, kind, x, feetY, targetX, faceX) {
  const zombie = createSceneZombie(kind, model.colors.zombies[randomInt(0, model.colors.zombies.length - 1)], false, x, feetY, Math.sign(targetX - x) || 1);
  zombie.speed = 0.16;
  zombie.target = targetX;
  zombie.faceX = faceX;
  model.zombies.push(zombie);
  return zombie;
}

// ------------------------------------------------------------
// ฉากของแต่ละอีเวนต์ (ชื่อตรงกับ id ใน events.js)
// ------------------------------------------------------------
const EVENT_SCENES = {
  // คนแปลกหน้าสะพายเป้ใบใหญ่โบกมือจากทางเท้าอีกฝั่ง
  stranger_trade: {
    setup(scene, model, random) {
      placeHero(scene, { x: 84, feetY: HERO_FEET_Y, dir: 1 });
      setEmote(scene.hero, 'question', model);
      scene.state.stranger = addEventNpc(scene, random, {
        gender: 'male', x: 176, feetY: SCENE_GROUND + 3, dir: -1, pose: 'wave', bigPack: true,
        look: { outfit: 'coat', hairStyle: ['short', 'buzz'], facialHair: 'stubble', hat: 'beanie', shirt: ['olive', 'gray', 'mustard', 'black'] },
      });
    },
    after(scene, model, { choice, success }) {
      const stranger = scene.state.stranger;
      stranger.pose = 'stand';
      if (success === false) { // โดนหลอก: เขาวิ่งหนีไปแล้ว
        setEmote(scene.hero, 'anger', model);
        leaveScene(stranger, 1, 1.4);
        return;
      }
      const walkedAway = choice === 2;
      setEmote(stranger, walkedAway ? 'dots' : 'note', model);
      setEmote(scene.hero, walkedAway ? 'dots' : 'note', model);
      leaveScene(stranger, 1, 0.4);
    },
  },

  // หญิงสาวนั่งพิงกำแพง ขาเลือดออก เลือดค่อย ๆ นองพื้น
  injured_survivor: {
    setup(scene, model, random) {
      placeHero(scene, { x: 146, feetY: SCENE_GROUND + 18, dir: 1 });
      setEmote(scene.hero, 'alert', model);
      scene.state.bleed = 0;
      scene.state.woman = addEventNpc(scene, random, {
        gender: 'female', x: 180, feetY: SCENE_GROUND + 3, dir: -1, pose: 'sit', wound: true,
        look: { outfit: ['tshirt', 'shirt', 'vest'], hairStyle: ['ponytail', 'long', 'bob', 'short'] },
      });
      setEmote(scene.state.woman, 'sweat', model);
    },
    step(scene) {
      if (!scene.state.woman.bandage) scene.state.bleed++;
    },
    back(ctx, scene) {
      drawBloodPool(ctx, scene, scene.state.woman);
    },
    front(ctx, scene, model) {
      drawBloodDrip(ctx, scene.state.woman, model.frame);
    },
    after(scene, model, { choice, success }) {
      const { woman } = scene.state;
      const hero = scene.hero;
      if (choice === 2) { // ทำเป็นไม่เห็น: เดินจากไป เธอยังนั่งอยู่ตรงนั้น
        setEmote(woman, 'dots', model);
        setEmote(hero, 'dots', model);
        walkTo(hero, 40, 0.6);
        return;
      }
      if (choice === 0) {
        woman.wound = false;
        woman.bandage = true;
      }
      if (success) {
        setEmote(woman, 'heart', model);
        setEmote(hero, 'note', model);
      } else if (choice === 0) { // พันแผลให้แล้ว เธอเดินกะเผลกจากไป
        woman.pose = 'stand';
        woman.emote = null;
        setEmote(hero, 'dots', model);
        leaveScene(woman, 1, 0.25, { limp: true });
      } else { // กินแล้วหลับไปพิงกำแพง
        setEmote(woman, 'sleep', model);
        setEmote(hero, 'dots', model);
      }
    },
  },

  // โจรสามคนปิดหน้า ถือไม้เบสบอล ยืนขวางหน้าประตูที่พัก
  bandits: {
    ambient: 1,
    setup(scene, model, random) {
      const doorX = model.shelter.doorX;
      const hero = placeHero(scene, { x: doorX + 34, feetY: HERO_FEET_Y, dir: -1 });
      setEmote(hero, 'alert', model);
      scene.state.bandits = [-18, 0, 18].map((offset, index) => addEventNpc(scene, random, {
        gender: 'male', x: doorX + offset, feetY: SCENE_GROUND + (index === 1 ? 12 : 8),
        dir: Math.sign(hero.x - (doorX + offset)) || 1, mask: true, bob: true, weapon: 'baseball_bat',
        look: {
          outfit: ['vest', 'tshirt', 'coat'], shirt: ['black', 'gray', 'olive', 'red'], hat: ['cap', 'beanie', 'none'],
          hairStyle: ['buzz', 'spiky', 'short'], facialHair: ['none', 'stubble', 'beard'],
        },
      }));
      setEmote(scene.state.bandits[1], 'anger', model);
    },
    after(scene, model, { choice, success }) {
      const bandits = scene.state.bandits;
      bandits.forEach(bandit => { bandit.bob = false; });
      if (choice === 2 && success) { // สู้ชนะ: วิ่งหนีกระเจิง
        bandits.forEach((bandit, index) => {
          setEmote(bandit, 'sweat', model);
          leaveScene(bandit, index === 2 ? 1 : -1, 1.6);
        });
        setEmote(scene.hero, 'note', model);
        return;
      }
      if (choice === 2) scene.hero.pose = 'sit'; // โดนไม้ฟาดจนล้ม
      setEmote(scene.hero, choice === 2 ? 'sweat' : success ? 'note' : 'anger', model);
      bandits.forEach(bandit => {
        setEmote(bandit, 'note', model); // หัวเราะเยาะแล้วเดินจากไป
        leaveScene(bandit, -1, 0.45);
      });
    },
  },

  // เสียงผู้ชายจากวิทยุสื่อสาร บอกว่ามีเสบียงใต้เคาน์เตอร์ร้านสะดวกซื้อหัวมุม
  radio_call: {
    setup(scene, model, random) {
      const storeX = EVENT_FACADE_X + 4;
      scene.state.storeDoor = storeX + 22;
      makeFacadeLayer(scene, model, storeX, storeX + 44, ctx => drawCornerStore(ctx, model.colors, storeX, random));
      placeHero(scene, { x: 136, feetY: SCENE_GROUND + 18, dir: 1, pose: 'phone' });
      setEmote(scene.hero, 'question', model);
    },
    front(ctx, scene, model) {
      const hero = scene.hero;
      if (hero.pose !== 'phone' || !hero.drawn) return;
      const tip = radioTip(hero);
      drawRadioWaves(ctx, tip.x, tip.y, hero.dir, model.frame);
    },
    after(scene, model, { choice, success }) {
      const hero = scene.hero;
      hero.pose = 'stand';
      if (choice === 1) {
        setEmote(hero, 'dots', model);
        return;
      }
      walkTo(hero, scene.state.storeDoor, 0.6);
      setEmote(hero, success ? 'note' : 'sweat', model);
    },
  },

  // เทียนล้ม ไฟลุกในที่พัก เปลวไฟพุ่งออกหน้าต่าง ควันโขมง
  shelter_fire: {
    ambient: 1,
    setup(scene, model) {
      const { shelter } = model;
      scene.state.smokes = shelterFireSpots(shelter).slice(0, 3).map(spot => makeSmoke(Math.random, spot.x + 3, spot.y - 3));
      placeHero(scene, { x: shelter.doorX + 30, feetY: SCENE_GROUND + 16, dir: -1 });
      setEmote(scene.hero, 'alert', model);
    },
    back: drawShelterFire,
    after(scene, model, { choice, success }) {
      if (choice === 0) { // ราดน้ำ: ไฟดับ เหลือควันจาง ๆ สายเดียว
        scene.state.fireOut = true;
        scene.state.smokes = scene.state.smokes.slice(1, 2);
        setEmote(scene.hero, success ? 'note' : 'sweat', model);
        return;
      }
      walkTo(scene.hero, model.shelter.doorX + 70, 0.9); // คว้าของวิ่งหนีออกมา ไฟยังไหม้อยู่
      setEmote(scene.hero, 'sweat', model);
    },
  },

  // พายุพัดแผ่นหลังคาที่พักเปิด ฝนกระหน่ำ ฟ้าแลบบ่อย
  storm_leak: {
    ambient: 1,
    setup(scene, model) {
      makeHeavyRain(model);
      placeHero(scene, { x: model.shelter.doorX + 24, feetY: SCENE_GROUND + 14, dir: -1 });
      setEmote(scene.hero, 'alert', model);
    },
    step(scene, model) {
      stepStorm(model, 0.02);
      const { bucket } = scene.state;
      if (!bucket) return;
      scene.state.fill = Math.min(1, scene.state.fill + 0.01);
      bucket.palette.i = mixColors(EVENT_PROP_PALETTES.bucket.i, BUCKET_WATER, scene.state.fill);
    },
    back: drawRoofSheet,
    front(ctx, scene, model) {
      const { bucket } = scene.state;
      if (!bucket) return;
      // น้ำหยดจากขอบระเบียงลงถัง
      const dripX = bucket.x + 4;
      const fromY = model.shelter.top + 28;
      for (let y = fromY + ((model.frame * 3) % 6); y < bucket.feetY - 6; y += 6) fillPixels(ctx, 'rgba(150, 190, 240, 0.8)', dripX, y, 1, 2);
    },
    after(scene, model, { choice, success }) {
      const hero = scene.hero;
      if (choice === 1) { // เอาถังมารองน้ำที่รั่ว
        scene.state.fill = 0;
        scene.state.bucket = addProp(scene, 'bucket', model.shelter.doorX - 6, SCENE_GROUND + 3);
        setEmote(hero, 'dots', model);
        return;
      }
      if (success) { // ปีนขึ้นไปตอกตะปูบนหลังคา (ตัวโยกขึ้นลงเหมือนกำลังตอก ฟองอารมณ์จะเกินขอบภาพจึงไม่ใส่)
        scene.state.roofFixed = true;
        placeHero(scene, { x: model.shelter.x + 32, feetY: model.shelter.top - 2, dir: -1, bob: true });
        hero.emote = null;
      } else { // ลื่นตกลงมา
        hero.pose = 'sit';
        setEmote(hero, 'sweat', model);
      }
    },
  },

  // ซอมบี้สามตัวเดินโซเซเข้ามาหาที่พักกลางวันแสก ๆ
  daytime_zombies: {
    ambient: 0,
    setup(scene, model) {
      const doorX = model.shelter.doorX;
      const hero = placeHero(scene, { x: doorX - 6, feetY: SCENE_GROUND + 10, dir: 1 });
      setEmote(hero, 'alert', model);
      scene.state.zombies = [['walkerA', 200, 70], ['walkerB', 214, 78], ['walkerA', 228, 84]]
        .map(([kind, x, feetY], index) => addEventZombie(model, kind, x, feetY, hero.x + 18 + index * 12, hero.x));
    },
    after(scene, model, { choice, success }) {
      const hero = scene.hero;
      const zombies = scene.state.zombies;
      if (choice === 0) { // ออกไปจัดการ: เดินไปยืนท่ามกลางซอมบี้ที่ล้มลงทั้งสามตัว
        zombies.forEach(zombie => { zombie.down = true; });
        walkTo(hero, Math.min(...zombies.map(zombie => zombie.x)) - 4, 0.9);
        setEmote(hero, success ? 'note' : 'sweat', model);
        return;
      }
      if (choice === 1 && success) { // ซ่อนตัวในที่พัก มันเดินผ่านไป
        hero.pose = 'window';
        zombies.forEach((zombie, index) => {
          zombie.target = -40 - index * 16;
          zombie.faceX = -200;
        });
        return;
      }
      // ถูกได้กลิ่น/วิ่งหนี: ตัวละครวิ่งออกไปทางซ้าย ซอมบี้ตามไปรุมหน้าประตู
      walkTo(hero, 24, 1.1);
      setEmote(hero, 'sweat', model);
      zombies.forEach((zombie, index) => {
        zombie.target = model.shelter.doorX - 12 + index * 10;
        zombie.faceX = model.shelter.doorX;
      });
    },
  },

  // ไข้ขึ้นสูง: นั่งพิงประตูที่พัก หน้าแดง ตัวสั่น เหงื่อแตก
  fever: {
    setup(scene, model) {
      const hero = placeHero(scene, { x: model.shelter.doorX - 6, feetY: SCENE_GROUND + 3, dir: 1, pose: 'sit', flushed: true, shiver: true });
      setEmote(hero, 'sweat', model);
    },
    front(ctx, scene, model) {
      const hero = scene.hero;
      if (!hero.flushed || !hero.drawn) return;
      [[2, 0], [hero.drawn.width - 3, 3]].forEach(([dx, offset]) => { // เหงื่อไหลลงข้างแก้ม
        const age = (model.frame + offset) % 6;
        fillPixels(ctx, 'rgba(170, 210, 255, 0.85)', hero.drawn.left + dx, hero.drawn.top + 6 + age, 1, 2);
      });
    },
    after(scene, model, { choice, success }) {
      const hero = scene.hero;
      if (choice === 1 && !success) { // ไข้ขึ้นจนเพ้อ
        setEmote(hero, 'sweat', model);
        return;
      }
      hero.shiver = false;
      hero.flushed = false;
      if (choice === 0) hero.hold = 'firstAid';
      setEmote(hero, choice === 0 ? 'heart' : choice === 1 ? 'sleep' : 'note', model);
    },
  },

  // ประตูห้องใต้ดินคล้องโซ่หนาหน้าร้านค้า
  supply_cache: {
    setup(scene, model) {
      scene.state.cellar = addProp(scene, 'cellar', 168, SCENE_GROUND + 3);
      placeHero(scene, { x: 150, feetY: SCENE_GROUND + 16, dir: 1 });
      setEmote(scene.hero, 'question', model);
    },
    front(ctx, scene, model) {
      const { cellar, crate } = scene.state;
      if (cellar.id === 'cellar') drawSparkle(ctx, cellar.x + 12, cellar.feetY - 3, model.frame); // แม่กุญแจวาว
      if (crate) {
        drawSparkle(ctx, crate.x + 2, crate.feetY - 9, model.frame);
        drawSparkle(ctx, crate.x + 10, crate.feetY - 5, model.frame, 8);
      }
    },
    after(scene, model, { choice, success }) {
      const hero = scene.hero;
      if (choice === 1) {
        setEmote(hero, 'dots', model);
        walkTo(hero, 56, 0.6);
        return;
      }
      setPropSprite(scene.state.cellar, 'cellarOpen');
      if (success) { // ข้างในมีของ
        scene.state.crate = addProp(scene, 'crate', scene.state.cellar.x + 6, SCENE_GROUND + 9);
        setEmote(hero, 'note', model);
        return;
      }
      // ซอมบี้ที่ติดอยู่ข้างในพุ่งออกมา คำรามใส่ แล้วเดินเตร่
      const zombie = createSceneZombie('walkerB', model.colors.zombies[1], false, scene.state.cellar.x + 4, SCENE_GROUND + 6, -1);
      Object.assign(zombie, { state: 'look', timer: 24, range: [96, 200] });
      model.zombies.push(zombie);
      setEmote(hero, 'sweat', model);
      walkTo(hero, 124, 0.8);
    },
  },

  // ร้านขายยาร้าง ป้ายกางเขนเขียวไฟติด ๆ ดับ ๆ เศษกระจกเกลื่อนทางเท้า
  pharmacy: {
    setup(scene, model, random) {
      const x = EVENT_FACADE_X + 4;
      scene.state.crossX = x + 38;
      scene.state.cross = { on: true, pattern: [] };
      scene.state.shards = Array.from({ length: 9 }, () => ({ x: x + randomBetween(random, 8, 36), y: SCENE_GROUND + randomBetween(random, 0, 3) }));
      makeFacadeLayer(scene, model, x, x + 46, ctx => drawPharmacy(ctx, model.colors, x, random));
      placeHero(scene, { x: 160, feetY: SCENE_GROUND + 16, dir: 1 });
      setEmote(scene.hero, 'question', model);
    },
    step(scene) {
      stepLamp(scene.state.cross);
    },
    back(ctx, scene) {
      drawPharmacyCross(ctx, scene.state.crossX, scene.state.cross.on);
    },
    front(ctx, scene, model) {
      scene.state.shards.forEach((shard, index) => {
        fillPixels(ctx, 'rgba(190, 215, 230, 0.55)', shard.x, shard.y);
        drawSparkle(ctx, shard.x, shard.y, model.frame, index * 7);
      });
    },
    after(scene, model, { choice, success }) {
      if (choice === 0 && success) scene.hero.hold = 'firstAid';
      setEmote(scene.hero, choice === 0 && !success ? 'dots' : 'note', model);
    },
  },

  // ฝนตกหนักทั้งบ่าย เมืองเงียบ ไม่มีซอมบี้เดินให้เห็น
  rain_collect: {
    ambient: 0,
    setup(scene, model) {
      makeHeavyRain(model);
      scene.state.fill = 0;
      scene.state.buckets = [];
      placeHero(scene, { x: model.shelter.doorX + 20, feetY: SCENE_GROUND + 14, dir: -1 });
      setEmote(scene.hero, 'dots', model);
    },
    step(scene) {
      if (scene.state.buckets.length === 0) return;
      scene.state.fill = Math.min(1, scene.state.fill + 0.008);
      scene.state.buckets.forEach(bucket => { bucket.palette.i = mixColors(EVENT_PROP_PALETTES.bucket.i, BUCKET_WATER, scene.state.fill); });
    },
    front(ctx, scene) {
      scene.state.buckets.forEach(bucket => { // น้ำฝนกระเซ็นในถัง
        if (Math.random() < 0.5) fillPixels(ctx, 'rgba(190, 220, 255, 0.9)', bucket.x + randomInt(2, 7), bucket.feetY - 7 - randomInt(0, 1));
      });
    },
    after(scene, model, { choice }) {
      const hero = scene.hero;
      if (choice === 0) { // วางถังรองน้ำเรียงหน้าที่พัก
        const { x } = model.shelter;
        scene.state.buckets = [x - 2, x + 10, x + 22].map(bucketX => addProp(scene, 'bucket', bucketX, SCENE_GROUND + 3));
        hero.pose = 'armsUp';
        setEmote(hero, 'note', model);
        return;
      }
      placeHero(scene, { x: model.shelter.doorX - 6, feetY: SCENE_GROUND + 3, pose: 'sit' }); // นั่งฟังฝนใต้ชายคา
      setEmote(hero, 'note', model);
    },
  },

  // ตู้กดน้ำหน้าโรงเรียน ป้ายไฟยังติด ๆ ดับ ๆ
  vending_machine: {
    setup(scene, model) {
      makeFacadeLayer(scene, model, EVENT_FACADE_X, SCENE_WIDTH, ctx => drawSchool(ctx, model.colors, EVENT_FACADE_X));
      scene.state.machine = addProp(scene, 'vending', EVENT_FACADE_X + 12, SCENE_GROUND + 2);
      scene.state.sign = { on: true, pattern: [] };
      placeHero(scene, { x: EVENT_FACADE_X - 4, feetY: SCENE_GROUND + 16, dir: 1 });
      setEmote(scene.hero, 'question', model);
    },
    step(scene) {
      const { machine, sign } = scene.state;
      stepLamp(sign);
      machine.palette.L = sign.on ? VENDING_COLORS.L : '#6a5a48';
    },
    back(ctx, scene) {
      drawCans(ctx, scene.state.cans);
    },
    after(scene, model, { choice, success }) {
      const { machine } = scene.state;
      const hero = scene.hero;
      if (choice === 1) { // งัดเงียบ ๆ ได้ไม่กี่กระป๋อง
        dropCans(scene, 2, machine);
        setEmote(hero, 'note', model);
        return;
      }
      setPropSprite(machine, 'vendingBroken');
      dropCans(scene, success ? 6 : 2, machine);
      setEmote(hero, success ? 'note' : 'sweat', model);
      if (!success) { // เสียงดังเรียกซอมบี้มา
        addEventZombie(model, 'walkerA', -16, SCENE_GROUND + 10, hero.x - 40, hero.x);
        addEventZombie(model, 'walkerB', -34, SCENE_GROUND + 20, hero.x - 56, hero.x);
      }
    },
  },

  // วิทยุพกพาส่งประกาศจากหน่วยกู้ภัย นั่งฟังอยู่หน้าที่พัก
  radio_news: {
    setup(scene, model) {
      placeHero(scene, { x: model.shelter.doorX - 6, feetY: SCENE_GROUND + 3, dir: 1, pose: 'sit', hold: 'radio' });
      setEmote(scene.hero, 'dots', model);
    },
    front(ctx, scene, model) {
      const hero = scene.hero;
      if (!hero.drawn) return;
      const tip = radioTip(hero);
      if (scene.state.music) drawMusicNotes(ctx, tip.x, tip.y, model.frame);
      else drawRadioWaves(ctx, tip.x, tip.y, 1, model.frame);
    },
    after(scene, model, { choice }) {
      if (choice === 1) scene.state.music = true; // เปิดเพลงเก่าแล้วงีบ
      setEmote(scene.hero, choice === 1 ? 'sleep' : 'heart', model);
    },
  },

  // รูปครอบครัวในบ้านร้าง (ขยายให้เห็นในฟองความคิด)
  old_photo: {
    ambientRanges: [[150, 222]],
    setup(scene, model) {
      placeHero(scene, { x: 56, feetY: SCENE_GROUND + 20, dir: 1, hold: 'photo' });
      setEmote(scene.hero, 'dots', model);
      scene.state.inset = true;
    },
    front(ctx, scene) {
      if (scene.state.inset) drawThoughtBubble(ctx, { x: 70, y: 8, w: 32, h: 20 }, scene.hero, drawFamilyPhoto);
    },
    after(scene, model, { choice }) {
      if (choice === 1) { // คว่ำรูปลงแล้วค้นบ้านต่อ
        scene.hero.hold = null;
        scene.state.inset = false;
      }
      setEmote(scene.hero, choice === 1 ? 'sweat' : 'heart', model);
    },
  },

  // สมุดบันทึกเปื้อนเลือด หน้าสุดท้ายเขียนถึงที่ซ่อนเสบียง
  diary: {
    ambientRanges: [[150, 222]],
    setup(scene, model, random) {
      placeHero(scene, { x: 56, feetY: SCENE_GROUND + 20, dir: 1, hold: 'book' });
      setEmote(scene.hero, 'dots', model);
      scene.state.inset = true;
      scene.state.lines = Array.from({ length: 10 }, () => randomBetween(random, 5, 11)); // ความยาวลายมือแต่ละบรรทัด
    },
    front(ctx, scene, model) {
      if (scene.state.inset) drawThoughtBubble(ctx, { x: 70, y: 8, w: 34, h: 20 }, scene.hero, (c, x, y) => drawDiaryPages(c, x, y, scene.state.lines));
      if (scene.state.crate) drawSparkle(ctx, scene.state.crate.x + 3, scene.state.crate.feetY - 9, model.frame);
    },
    after(scene, model, { choice, success }) {
      scene.hero.hold = null;
      scene.state.inset = false;
      if (choice === 0 && success) scene.state.crate = addProp(scene, 'crate', 70, SCENE_GROUND + 22); // ของที่เขาซ่อนไว้
      if (choice === 0 && !success) addProp(scene, 'shoe', 72, SCENE_GROUND + 22); // เหลือแค่รองเท้าข้างเดียว
      setEmote(scene.hero, 'dots', model);
    },
  },
};

// เนื้อหาในฟองความคิด: รูปครอบครัวสีซีด ๆ ในกรอบไม้ (กว้าง 28 สูง 16)
const FAMILY_PHOTO_COLORS = {
  '.': '#d8c49a', H: '#3a2a20', h: '#6a3a28', k: '#3a2a20', S: '#e8c8a0', E: '#2a1e18', m: '#a04a3a',
  T: '#4a6a8a', t: '#b06a7a', c: '#d8a040',
};
function drawFamilyPhoto(ctx, x, y) {
  fillPixels(ctx, '#6a4220', x, y, 28, 16);
  fillPixels(ctx, '#8a5a30', x + 1, y + 1, 26, 14);
  const sepia = Object.fromEntries(Object.entries(FAMILY_PHOTO_COLORS).map(([key, color]) => [key, mixColors(color, '#c8a878', 0.3)]));
  EVENT_FAMILY_PHOTO.forEach((row, rowY) => {
    for (let column = 0; column < row.length; column++) fillPixels(ctx, sepia[row[column]], x + 2 + column, y + 2 + rowY);
  });
  for (let i = 0; i < 6; i++) fillPixels(ctx, 'rgba(255, 255, 255, 0.35)', x + 14 + i, y + 2 + i * 2); // รอยร้าวบนกระจกกรอบรูป
}

// เนื้อหาในฟองความคิด: สมุดเปิดสองหน้า ลายมือเป็นเส้น ๆ คราบเลือดหน้าขวา กากบาทที่ซ่อนของ (กว้าง 30 สูง 16)
function drawDiaryPages(ctx, x, y, lines) {
  fillPixels(ctx, '#6a2a24', x, y, 30, 16);
  fillPixels(ctx, '#e8e0c8', x + 1, y + 1, 13, 14);
  fillPixels(ctx, '#e0d6bc', x + 16, y + 1, 13, 14);
  fillPixels(ctx, '#b8ac90', x + 14, y + 1, 2, 14);
  lines.forEach((length, index) => {
    const pageX = index < 5 ? x + 2 : x + 17;
    fillPixels(ctx, '#5a5048', pageX, y + 3 + (index % 5) * 2, length, 1);
  });
  fillPixels(ctx, '#8a1a1e', x + 21, y + 8, 5, 3);
  fillPixels(ctx, '#8a1a1e', x + 23, y + 6, 3, 6);
  fillPixels(ctx, '#6a1014', x + 25, y + 11, 1, 3);
  [[18, 12], [17, 11], [19, 11], [17, 13], [19, 13]].forEach(([dx, dy]) => fillPixels(ctx, '#c83a3a', x + dx, y + dy));
}
