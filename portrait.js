// ============================================================
//  portrait.js — รูปตัวละครครึ่งตัว 64x64 (ภาพพิกเซลสีเรียบ เส้นขอบดำ หันหน้าตรง)
//  วาดด้วยโค้ดเป็นชั้น ๆ: ผมด้านหลัง → คอ → ลำตัว/ชุด → แขน → หู → หน้า → หนวดเครา → ผม → หมวก → ของประดับ → แว่น
//  แต่ละชั้นมีสีหลัก + สีเงา (+ สีสว่าง) แสงมาจากซ้าย แล้วใส่เส้นขอบดำรอบตัวและรอยต่อระหว่างชิ้น
//  หน้าตามาจากที่สุ่มได้ (getLook ใน game.js): ผิว ทรงผม สีผม รูปร่าง ชุด สีชุด หมวก ของประดับ แว่น หนวดเครา เพศ อายุ
// ============================================================
const PORTRAIT_RES = 64;
const PORTRAIT_OUTLINE = '#1a1416';

// ---------- รูปทรง (หันหน้าตรง กึ่งกลาง x = 32) ----------
const PORTRAIT_FACE = {
  skull: { cx: 32, cy: 24, rx: 10.5, ry: 11.5 },
  jaw: {
    male: [[21.6, 25], [22.4, 31], [25, 35], [29, 37.6], [35, 37.6], [39, 35], [41.6, 31], [42.4, 25]],
    female: [[21.8, 25], [22.8, 31], [25.5, 35], [29.5, 37.2], [34.5, 37.2], [38.5, 35], [41.2, 31], [42.2, 25]],
  },
  ears: [{ cx: 20.8, cy: 27, rx: 1.8, ry: 3 }, { cx: 43.2, cy: 27, rx: 1.8, ry: 3 }],
  neck: [[28, 34], [28, 42], [36, 42], [36, 34]],
};
// ลำตัวและแขนตามรูปร่าง (ผอม / ปกติ / ล่ำ): torso = ลำตัว, arm = แขนซ้าย (แขนขวากลับด้าน)
const PORTRAIT_BODY = {
  thin: {
    torso: [[20, 46], [21, 43], [24, 41], [29, 40], [35, 40], [40, 41], [43, 43], [44, 46], [44, 64], [20, 64]],
    arm: [[15, 64], [15.5, 47], [17, 43.5], [20, 42.5], [22, 46], [21.5, 64]],
  },
  normal: {
    torso: [[18, 46], [19, 43], [22, 41], [28, 40], [36, 40], [42, 41], [45, 43], [46, 46], [46, 64], [18, 64]],
    arm: [[12.5, 64], [13, 47], [14.5, 43.5], [18, 42], [20.5, 46], [20, 64]],
  },
  stocky: {
    torso: [[16, 46], [17, 43], [21, 40.5], [28, 40], [36, 40], [43, 40.5], [47, 43], [48, 46], [48, 64], [16, 64]],
    arm: [[9.5, 64], [10, 47], [12, 43], [16, 41.5], [19, 46], [18.5, 64]],
  },
};
const PORTRAIT_BODY_SCALE = Object.fromEntries(Object.keys(PORTRAIT_BODY).map(id => [id, true])); // ไว้ตรวจว่ามีครบทุกรูปร่าง

// ---------- ทรงผม (ชื่อตรงกับ CONFIG.appearance.hairStyles) ----------
//   cap = ผมคลุมหัว (เหนือแนวไรผม), front = ชิ้นผมด้านหน้า, back = ผมด้านหลัง (หลังคอ/ไหล่)
//   hairline.top = ไรผมกลางหน้าผาก (ยิ่งน้อยยิ่งสูง)
const mirrorPortrait = points => points.map(([x, y]) => [64 - x, y]);
const PORTRAIT_SIDE = [[20.2, 17], [20, 25], [22.6, 25], [23, 18]];
const PORTRAIT_HAIR = {
  short: { cap: true, front: [
    [[22, 15], [22, 21], [25, 19], [27, 22], [30, 19], [33, 21], [36, 19], [39, 21], [42, 19], [42, 15]],
    PORTRAIT_SIDE, mirrorPortrait(PORTRAIT_SIDE),
  ] },
  buzz: { cap: true, hairline: { top: 16, curve: 3 }, buzz: true, front: [] },
  spiky: { cap: true, front: [
    [[22, 15], [22, 20], [25, 18], [28, 20], [31, 18], [34, 20], [37, 18], [40, 20], [42, 18], [42, 15]],
    [[22, 15], [19, 6], [27, 11]], [[26, 12], [28, 3], [32, 11]], [[31, 11], [35, 3], [37, 12]], [[36, 12], [44, 6], [42, 16]],
    PORTRAIT_SIDE, mirrorPortrait(PORTRAIT_SIDE),
  ] },
  bun: { cap: true, hairline: { top: 16, curve: 4 }, front: [], bun: { cx: 32, cy: 8.5, rx: 5, ry: 4.5 } },
  long: { cap: true, front: [
    [[22, 15], [22, 24], [25, 20], [29, 17], [31.5, 14]],
    [[32.5, 14], [35, 17], [39, 20], [42, 24], [42, 15]],
    [[19.6, 18], [17.5, 30], [17, 50], [21, 52], [22.6, 40], [23, 25]],
    mirrorPortrait([[19.6, 18], [17.5, 30], [17, 50], [21, 52], [22.6, 40], [23, 25]]),
  ], back: [[[18, 24], [15.5, 56], [48.5, 56], [46, 24]]] },
  ponytail: { cap: true, hairline: { top: 16, curve: 4 }, front: [
    [[22, 15], [23, 20], [27, 17.5], [33, 16], [39, 18], [42, 15]],
  ], back: [[[40, 16], [47, 20], [49.5, 32], [47, 45], [44.5, 36], [43, 24]]], tie: [[41, 17], [42, 18], [43, 19]] },
  bob: { cap: true, front: [
    [[21.5, 15], [21.5, 21], [42.5, 21], [42.5, 15]],
    [[19.6, 17], [19, 33], [21, 37.5], [24.6, 37.5], [23.6, 28], [23, 20]],
    mirrorPortrait([[19.6, 17], [19, 33], [21, 37.5], [24.6, 37.5], [23.6, 28], [23, 20]]),
  ] },
  bald: { cap: false, front: [
    [[20, 20], [20, 28], [22.8, 28], [22.8, 21]],
    mirrorPortrait([[20, 20], [20, 28], [22.8, 28], [22.8, 21]]),
  ] },
};

// ---------- หมวก (ชื่อตรงกับ CONFIG.appearance.hats) ----------
const PORTRAIT_HATS = {
  cap: { crown: { cx: 32, cy: 19, rx: 12.6, ry: 9, below: 19 }, brim: [[19, 18], [45, 18], [47, 21.5], [17, 21.5]] },
  fedora: { crown: [[24, 7], [40, 7], [41.5, 16], [22.5, 16]], band: [13, 15], brim: [[13, 15], [51, 15], [49, 18.5], [15, 18.5]] },
  beanie: { crown: { cx: 32, cy: 19, rx: 12, ry: 9.5, below: 21 }, cuff: [17, 21] },
};

// ---------- เครื่องมือ ----------
function portraitIndex(x, y) {
  return y * PORTRAIT_RES + x;
}

function insideEllipse(x, y, shape) {
  const dx = (x + 0.5 - shape.cx) / shape.rx;
  const dy = (y + 0.5 - shape.cy) / shape.ry;
  return dx * dx + dy * dy <= 1;
}

function insidePolygon(x, y, points) {
  const px = x + 0.5;
  const py = y + 0.5;
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [xi, yi] = points[i];
    const [xj, yj] = points[j];
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

// สุ่มตามตำแหน่ง 0-99 (เหมือนกันทุกครั้ง) ใช้วางลายเสื้อ/เส้นผม/หนวด
function portraitNoise(x, y) {
  let value = Math.imul(x * 374761393 + y * 668265263, 1274126177) >>> 0;
  value = Math.imul(value ^ (value >>> 13), 1103515245) >>> 0;
  return (value >>> 8) % 100;
}

function hexLuminance(hex) {
  const [r, g, b] = hexToRgb(hex);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

// ชุดสี 3 ระดับ: เงา / หลัก / สว่าง
function portraitTones(base, shadowTint = '#3a1830') {
  return {
    shade: mixColors(shadeColor(base, -0.24), shadowTint, 0.12),
    base,
    light: mixColors(base, '#fff6e6', 0.22),
  };
}

// ---------- วาดรูป ----------
// คืนรายการสีของทุกจุด (null = โปร่งใส) ขนาด 64x64
function renderPortraitPixels(character) {
  const look = getLook(character);
  const female = character.gender === 'female';
  const appearance = CONFIG.appearance;
  const skinBase = findById(appearance.skinTones, look.skin)?.color ?? '#d09f76';
  const hairBase = findById(appearance.hairColors, look.hairColor)?.color ?? '#3e2a1f';
  const clothBase = findById(appearance.shirtColors, look.shirt)?.color ?? '#6a6e75';
  const skin = portraitTones(skinBase, '#8a3040');
  const hairTones = portraitTones(hairBase, '#1a1830');
  if (hexLuminance(hairBase) < 0.2) hairTones.light = mixColors(hairBase, '#8a96b4', 0.45); // ผมดำ: เงาวาวอมเทาฟ้า
  const cloth = portraitTones(clothBase);
  const shirtUnder = portraitTones('#e6e0d6'); // เสื้อเชิ้ตตัวในสีขาว (สูท/เสื้อกั๊ก)
  const style = PORTRAIT_HAIR[look.hairStyle] ?? PORTRAIT_HAIR.short;
  const body = PORTRAIT_BODY[look.body] ?? PORTRAIT_BODY.normal;
  const size = PORTRAIT_RES * PORTRAIT_RES;
  const color = new Array(size).fill(null);
  const group = new Array(size).fill(null); // ชิ้นส่วน (ไว้วาดเส้นขอบตรงรอยต่อ)
  const depth = new Array(size).fill(0);    // ลำดับการวาด (ชิ้นที่วาดทีหลังอยู่ข้างหน้า)
  let layer = 0;
  const inBounds = (x, y) => x >= 0 && y >= 0 && x < PORTRAIT_RES && y < PORTRAIT_RES;
  const put = (x, y, value, kind) => {
    if (!inBounds(x, y) || !value) return;
    const index = portraitIndex(x, y);
    color[index] = value;
    group[index] = kind;
    depth[index] = layer;
  };
  const tint = (x, y, value) => { // เปลี่ยนสีแต่คงชิ้นส่วนเดิม (ตา คิ้ว แก้ม ลายเสื้อ)
    if (inBounds(x, y) && color[portraitIndex(x, y)]) color[portraitIndex(x, y)] = value;
  };
  const groupAt = (x, y) => (inBounds(x, y) ? group[portraitIndex(x, y)] : null);
  const fillShape = (test, kind, colorAt) => {
    layer += 1;
    for (let y = 0; y < PORTRAIT_RES; y++) {
      for (let x = 0; x < PORTRAIT_RES; x++) if (test(x, y)) put(x, y, colorAt(x, y), kind);
    }
  };
  const jaw = PORTRAIT_FACE.jaw[female ? 'female' : 'male'];
  const inFace = (x, y) => insideEllipse(x, y, PORTRAIT_FACE.skull) || insidePolygon(x, y, jaw);

  // ---- ผม: สีตามตำแหน่ง (ซ้ายบนสว่าง ขวาและปลายผมเป็นเงา มีเส้นผมเข้มบาง ๆ) ----
  const hairColorAt = (x, y, bottom = 64) => {
    if (style.buzz) return portraitNoise(x, y) < 30 ? hairTones.shade : mixColors(hairBase, skinBase, 0.25);
    if (x >= 38 || y >= bottom - 2) return hairTones.shade;
    const shine = (y === 14 && x >= 25 && x <= 29) || (y === 15 && x >= 24 && x <= 26) || (y === 16 && x === 24); // แถบแสงบนผมด้านซ้าย
    if (shine) return hairTones.light;
    if (portraitNoise(x, y) < 9) return hairTones.shade; // เส้นผม
    return hairTones.base;
  };
  const polygonBottom = points => Math.max(...points.map(([, y]) => y));

  // 1) ผมด้านหลัง
  (style.back ?? []).forEach(points => {
    const bottom = polygonBottom(points);
    fillShape((x, y) => insidePolygon(x, y, points), 'hairBack', (x, y) => (x >= 36 ? hairTones.shade : hairColorAt(x, y, bottom)));
  });

  // 2) คอ (ใต้คางเป็นเงา)
  fillShape((x, y) => insidePolygon(x, y, PORTRAIT_FACE.neck), 'neck', (x, y) => (y <= 39 || x >= 35 ? skin.shade : skin.base));

  // 3) ลำตัว + ชุด
  const outfit = look.outfit;
  const longSleeves = outfit === 'suit' || outfit === 'coat' || outfit === 'vest';
  const sleeveEnd = { tshirt: 51, shirt: 51, dress: 47 }[outfit] ?? 64;
  const lit = (x, tones) => (x >= 39 ? tones.shade : x <= 23 ? tones.light : tones.base); // แสงจากซ้าย
  const torsoColor = (x, y) => {
    const nearCenter = Math.abs(x + 0.5 - 32);
    if (outfit === 'suit') {
      if (y >= 40 && y <= 52 && nearCenter <= (y - 39) * 0.35 + 1) { // เสื้อเชิ้ตขาว + เน็คไท
        if (nearCenter <= 1 && y >= 42) return y === 42 ? '#7a1e28' : '#9a2a34';
        return lit(x, shirtUnder);
      }
      return lit(x, cloth);
    }
    if (outfit === 'vest') {
      if (nearCenter <= (y < 50 ? 2.5 + (y - 40) * 0.25 : 1)) return lit(x, shirtUnder); // ช่องเปิดหน้าเสื้อกั๊ก
      return lit(x, cloth);
    }
    if (outfit === 'coat') {
      if (y >= 40 && y <= 49 && nearCenter <= (y - 39) * 0.4) return '#3a3438'; // เสื้อตัวในเข้ม
      return lit(x, cloth);
    }
    if (outfit === 'dress') {
      if (y <= 43 && nearCenter <= 5 - (y - 40)) return y <= 41 ? skin.shade : skin.base; // คอเสื้อกว้างเห็นผิว
      return lit(x, cloth);
    }
    return lit(x, cloth); // เสื้อยืด / เสื้อเชิ้ต
  };
  fillShape((x, y) => insidePolygon(x, y, body.torso), 'torso', torsoColor);

  // 4) แขนซ้ายขวา: แขนเสื้อ + ผิว (แขนขวาอยู่ฝั่งเงา)
  [body.arm, mirrorPortrait(body.arm)].forEach((points, side) => {
    const sleeveTones = longSleeves && outfit === 'vest' ? shirtUnder : cloth;
    fillShape((x, y) => insidePolygon(x, y, points), side === 0 ? 'armLeft' : 'armRight', (x, y) => {
      const sleeve = y < sleeveEnd;
      const tones = sleeve ? sleeveTones : skin;
      if (side === 1) return tones.shade;
      return x <= 14 || (sleeve && y <= 45) ? tones.light : tones.base;
    });
  });

  // รายละเอียดชุด (วาดทับ ไม่เพิ่มเส้นขอบ)
  const detail = (x, y, value) => tint(x, y, value);
  const line = (x0, y0, x1, y1, value) => {
    const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
    for (let i = 0; i <= steps; i++) detail(Math.round(x0 + ((x1 - x0) * i) / steps), Math.round(y0 + ((y1 - y0) * i) / steps), value);
  };
  const collarColor = shadeColor(clothBase, -0.45);
  if (outfit === 'tshirt') {
    for (let x = 27; x <= 37; x++) detail(x, 40 + (Math.abs(x - 32) <= 3 ? 1 : 0), collarColor); // คอกลม
  }
  if (outfit === 'shirt') { // คอปก + กระดุม + ลายดอกไม้ใบไม้
    line(27, 40, 32, 46, PORTRAIT_OUTLINE);
    line(37, 40, 32, 46, PORTRAIT_OUTLINE);
    for (let y = 47; y < 64; y++) detail(32, y, collarColor);
    [50, 55, 60].forEach(y => detail(32, y, '#f0ece0'));
    const petal = mixColors(clothBase, hexLuminance(clothBase) > 0.6 ? '#d0485a' : '#f6e8e0', 0.75);
    const leaf = mixColors(clothBase, '#3e7a3a', 0.7);
    // ลายเป็นช่อง 7x7: บางช่องมีดอกไม้ (กลีบ 4 ทิศ + เกสรเหลือง) บางช่องมีใบไม้ (เฉียง 3 จุด)
    for (let y = 41; y < 64; y += 1) {
      for (let x = 9; x < 56; x += 1) {
        const kind = groupAt(x, y);
        if (kind !== 'torso' && kind !== 'armLeft' && kind !== 'armRight') continue;
        if (kind !== 'torso' && y >= sleeveEnd) continue;
        const cellX = Math.floor((x + 2) / 7);
        const cellY = Math.floor((y + 1) / 7);
        const roll = portraitNoise(cellX, cellY);
        const cx = cellX * 7 + 1;
        const cy = cellY * 7 + 2;
        const dx = x - cx;
        const dy = y - cy;
        if (roll < 45 && Math.abs(dx) + Math.abs(dy) <= 2 && !(Math.abs(dx) === 1 && Math.abs(dy) === 1)) {
          detail(x, y, dx === 0 && dy === 0 ? '#f2d24a' : Math.abs(dx) + Math.abs(dy) === 2 ? petal : mixColors(petal, '#ffffff', 0.35));
        } else if (roll >= 45 && roll < 75 && dx === dy && Math.abs(dx) <= 1) {
          detail(x, y, leaf);
        }
      }
    }
  }
  if (outfit === 'suit') { // ปกสูท + กระดุม
    line(28, 40, 30, 53, collarColor);
    line(36, 40, 34, 53, collarColor);
    [56, 60].forEach(y => detail(32, y, collarColor));
  }
  if (outfit === 'vest') {
    [46, 50, 54, 58, 62].forEach(y => detail(y < 50 ? 35 : 33, y, collarColor));
    for (let y = 41; y < 64; y++) { detail(29 - (y > 50 ? 0 : 0), y, collarColor); }
  }
  if (outfit === 'coat') { // ปกเสื้อโค้ตกว้าง + กระดุม 2 แถว + เข็มขัด
    line(26, 40, 30, 50, collarColor);
    line(38, 40, 34, 50, collarColor);
    [52, 57].forEach(y => { detail(29, y, collarColor); detail(35, y, collarColor); });
    for (let x = 18; x <= 46; x++) if (groupAt(x, 60) === 'torso') detail(x, 60, shadeColor(clothBase, -0.35));
  }
  if (outfit === 'dress') {
    for (let x = 18; x <= 46; x++) if (groupAt(x, 57) === 'torso') detail(x, 57, shadeColor(clothBase, -0.3)); // เอวชุด
    for (let x = 27; x <= 37; x++) if (Math.abs(x - 32) >= 4) detail(x, 40, collarColor);
  }

  // 5) หู 6) หน้า (ใต้ผมหน้าม้าเป็นเงา ฝั่งขวาเป็นเงา)
  PORTRAIT_FACE.ears.forEach((ear, side) => fillShape((x, y) => insideEllipse(x, y, ear), 'ear', () => (side === 0 ? skin.base : skin.shade)));
  fillShape(inFace, 'face', (x, y) => (x >= 40 || (y >= 35 && x >= 35) ? skin.shade : skin.base));

  // หน้า: ตา คิ้ว จมูก ปาก แก้ม (วาดทับผิวหน้า)
  const browColor = look.hairStyle === 'bald' ? shadeColor(hairBase, -0.2) : shadeColor(hairBase, hexLuminance(hairBase) > 0.35 ? -0.45 : -0.1);
  [[25, 23], [26, 23], [27, 23], [28, 23], [35, 23], [36, 23], [37, 23], [38, 23]].forEach(([x, y]) => tint(x, y, browColor));
  if (!female) [[27, 24], [28, 24], [35, 24], [36, 24]].forEach(([x, y]) => tint(x, y, browColor)); // ผู้ชายคิ้วหนากว่า
  const lash = '#1c1416';
  const iris = shadeColor(findById(appearance.hairColors, 'dark').color, -0.1);
  [[26, 27], [37, 27]].forEach(([x, y]) => { // ตา: ขอบตาบน + ตาดำ 2x3 + แสงในตา + ตาขาวด้านนอก
    const outer = x < 32 ? -1 : 2;
    [x - 1, x, x + 1, x + 2].forEach(lx => tint(lx - (x < 32 ? 0 : 1), y - 2, lash));
    tint(x, y - 1, '#ffffff');
    tint(x + 1, y - 1, lash);
    tint(x, y, lash);
    tint(x + 1, y, lash);
    tint(x, y + 1, iris);
    tint(x + 1, y + 1, iris);
    tint(x + outer, y, '#f2eee8');
    if (female) tint(x < 32 ? x - 2 : x + 3, y - 3, lash); // ขนตางอนหางตา
  });
  [[33, 29], [33, 30], [33, 31], [32, 32]].forEach(([x, y]) => tint(x, y, skin.shade)); // จมูก
  if (female) {
    const lip = mixColors(skinBase, '#c44a5c', 0.5);
    [[30, 34], [31, 34], [32, 34], [33, 34]].forEach(([x, y]) => tint(x, y, shadeColor(lip, -0.3)));
    [[31, 35], [32, 35]].forEach(([x, y]) => tint(x, y, lip));
  } else {
    [[30, 34], [31, 34], [32, 34], [33, 34]].forEach(([x, y]) => tint(x, y, mixColors(skin.shade, '#3a1a1a', 0.45)));
  }
  const blush = mixColors(skinBase, '#ffe2d4', 0.5); // แก้มกลม ๆ สีอ่อน
  [[24, 30], [25, 30], [26, 30], [24, 31], [25, 31], [26, 31], [25, 29], [38, 30], [39, 30], [40, 30], [38, 31], [39, 31], [40, 31], [39, 29]]
    .forEach(([x, y]) => tint(x, y, blush));
  if (character.age >= 55) { // คนสูงวัย: ร่องแก้ม ถุงใต้ตา
    [[28, 31], [28, 32], [36, 31], [36, 32], [25, 28], [26, 28], [37, 28], [38, 28]].forEach(([x, y]) => tint(x, y, skin.shade));
  }

  // 7) หนวดเครา
  if (look.facialHair === 'stubble') {
    for (let y = 30; y <= 38; y++) {
      for (let x = 22; x <= 42; x++) {
        const area = y >= 33 || x <= 23 || x >= 41 || (y >= 32 && x >= 29 && x <= 35);
        if (groupAt(x, y) === 'face' && area && portraitNoise(x, y) < 38) tint(x, y, mixColors(color[portraitIndex(x, y)], hairTones.shade, 0.45));
      }
    }
  }
  if (look.facialHair === 'beard') {
    const mouth = (x, y) => y >= 34 && y <= 35 && x >= 30 && x <= 33;
    fillShape((x, y) => {
      if (mouth(x, y)) return false;
      const inLower = inFace(x, y) && (y >= 31 || ((x <= 23 || x >= 41) && y >= 26));
      const underChin = y >= 37 && y <= 40 && inFace(x, y - 3);
      const mustache = y >= 32 && y <= 33 && x >= 28 && x <= 35;
      return inLower || underChin || mustache;
    }, 'beard', (x, y) => (x >= 37 || y >= 39 ? hairTones.shade : portraitNoise(x, y) < 14 ? hairTones.light : hairTones.base));
  }

  // 8) ผม: คลุมหัว + ชิ้นหน้า + มวย
  const hairline = style.hairline ?? { top: 17, curve: 4 };
  const hairlineY = x => {
    const offset = Math.abs(x + 0.5 - 32);
    return offset <= 10 ? hairline.top + hairline.curve * (offset / 10) ** 2 : 23;
  };
  // ใส่หมวก: ผมส่วนที่สูงกว่าขอบหมวก (ผมตั้ง/มวย) ถูกหมวกครอบไว้ ไม่โผล่ทะลุ
  const hatTop = look.hat !== 'none' ? 13 : -1;
  const belowHat = y => y >= hatTop;
  if (style.cap) fillShape((x, y) => insideEllipse(x, y, { cx: 32, cy: 21.5, rx: 12.2, ry: 11 }) && y + 0.5 < hairlineY(x) && belowHat(y), 'hair', (x, y) => hairColorAt(x, y));
  if (style.bun && look.hat === 'none') fillShape((x, y) => insideEllipse(x, y, style.bun), 'hair', (x, y) => hairColorAt(x, y));
  (style.front ?? []).forEach(points => {
    const bottom = polygonBottom(points);
    fillShape((x, y) => insidePolygon(x, y, points) && belowHat(y), 'hair', (x, y) => hairColorAt(x, y, bottom));
  });
  if (style.tie) style.tie.forEach(([x, y]) => tint(x, y, '#c84a5a'));
  if (look.hairStyle === 'bald') { // หัวล้านมีเงาวาว
    [[27, 15], [28, 15], [26, 16], [27, 16]].forEach(([x, y]) => tint(x, y, mixColors(skinBase, '#ffffff', 0.45)));
  }

  // 9) หมวก
  const hat = PORTRAIT_HATS[look.hat];
  if (hat) {
    const hatBase = findById(appearance.hats, look.hat).color;
    const hatTones = portraitTones(hatBase);
    const hatColor = x => (x >= 38 ? hatTones.shade : x <= 25 ? hatTones.light : hatTones.base);
    const crownTest = (x, y) => (Array.isArray(hat.crown) ? insidePolygon(x, y, hat.crown) : insideEllipse(x, y, hat.crown) && y < hat.crown.below);
    fillShape(crownTest, 'hat', hatColor);
    if (hat.band) for (let y = hat.band[0]; y < hat.band[1]; y++) for (let x = 0; x < 64; x++) if (groupAt(x, y) === 'hat') tint(x, y, '#2a2224');
    if (hat.cuff) {
      for (let y = hat.cuff[0]; y < hat.cuff[1]; y++) {
        for (let x = 0; x < 64; x++) if (groupAt(x, y) === 'hat') tint(x, y, x % 2 ? hatTones.shade : hatTones.base); // ขอบหมวกไหมพรมเป็นริ้ว
      }
    }
    if (hat.brim) fillShape((x, y) => insidePolygon(x, y, hat.brim), 'hatBrim', x => (x >= 40 ? hatTones.shade : hatTones.base));
  }

  // 10) ของประดับ
  if (look.accessory === 'flower') { // ดอกไม้ทัดผมด้านซ้าย
    fillShape((x, y) => Math.abs(x - 22) + Math.abs(y - 16) <= 2, 'flower', (x, y) => (x === 22 && y === 16 ? '#f4d040' : (x + y) % 2 ? '#f2a0b0' : '#e0607a'));
  }
  if (look.accessory === 'bandana') { // ผ้าโพกคาดหน้าผาก + ปมด้านขวา
    fillShape((x, y) => y >= hairlineY(x) - 2.5 && y <= hairlineY(x) && x >= 21 && x <= 43 && (groupAt(x, y) === 'hair' || groupAt(x, y) === 'face'),
      'bandana', (x, y) => ((x + y) % 4 === 0 ? '#f0e0d0' : x >= 38 ? '#9a2a2a' : '#c83a3a'));
    fillShape((x, y) => Math.abs(x - 44.5) + Math.abs(y - 21) <= 1.5, 'bandana', () => '#9a2a2a');
  }
  if (look.accessory === 'earrings') [[20, 30], [43, 30], [20, 31], [43, 31]].forEach(([x, y]) => put(x, y, y === 30 ? '#f4d870' : '#c8a030', 'earring'));

  // 11) แว่น: กรอบ + เลนส์อ่อน ๆ + แสงสะท้อน
  if (look.glasses === 'glasses') {
    [[24, 29], [35, 40]].forEach(([x1, x2]) => {
      for (let y = 24; y <= 29; y++) {
        for (let x = x1; x <= x2; x++) {
          const border = x === x1 || x === x2 || y === 24 || y === 29;
          if (border) put(x, y, '#2a2226', 'glasses');
          else if (color[portraitIndex(x, y)] && groupAt(x, y) === 'face') tint(x, y, mixColors(color[portraitIndex(x, y)], '#e0f0ff', 0.2));
        }
      }
      put(x1 + 1, 25, '#ffffff', 'glasses');
    });
    [30, 31, 32, 33, 34].forEach(x => put(x, 25, '#2a2226', 'glasses'));
    [[22, 25], [23, 25], [41, 25], [42, 25]].forEach(([x, y]) => put(x, y, '#2a2226', 'glasses'));
  }

  // 12) เงาตก: ใต้ผม/หมวกบนหน้า 1 จุด / ใต้คางบนคอ / ใต้หัวบนเสื้อ
  const shadow = [];
  for (let y = 1; y < PORTRAIT_RES; y++) {
    for (let x = 0; x < PORTRAIT_RES; x++) {
      const kind = groupAt(x, y);
      const above = groupAt(x, y - 1);
      if (kind === 'face' && (above === 'hair' || above === 'hatBrim' || above === 'hat' || above === 'bandana')) shadow.push([x, y, skin.shade]);
    }
  }
  shadow.forEach(([x, y, value]) => tint(x, y, value));

  // 13) เส้นขอบ: รอยต่อระหว่างชิ้น (ชิ้นที่อยู่หน้าวาดเส้นที่ขอบตัวเอง) + รอบตัวด้านนอก
  const NO_EDGE = new Set(['glasses', 'earring']);
  const edges = [];
  for (let y = 0; y < PORTRAIT_RES; y++) {
    for (let x = 0; x < PORTRAIT_RES; x++) {
      const index = portraitIndex(x, y);
      const kind = group[index];
      if (!kind || NO_EDGE.has(kind)) continue;
      const touchesBehind = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => {
        if (!inBounds(x + dx, y + dy)) return false;
        const other = portraitIndex(x + dx, y + dy);
        return group[other] && group[other] !== kind && !NO_EDGE.has(group[other]) && depth[other] < depth[index]
          && !(kind === 'hatBrim' && group[other] === 'hat');
      });
      if (touchesBehind) edges.push(index);
    }
  }
  edges.forEach(index => { color[index] = PORTRAIT_OUTLINE; });
  const outer = [];
  for (let y = 0; y < PORTRAIT_RES; y++) {
    for (let x = 0; x < PORTRAIT_RES; x++) {
      if (color[portraitIndex(x, y)]) continue;
      const touches = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => inBounds(x + dx, y + dy) && color[portraitIndex(x + dx, y + dy)]);
      if (touches) outer.push(portraitIndex(x, y));
    }
  }
  outer.forEach(index => { color[index] = PORTRAIT_OUTLINE; });
  return color;
}

// รูปที่วาดแล้วเก็บไว้ (หน้าเกมวาดใหม่บ่อย ไม่ต้องคำนวณซ้ำ)
const portraitCache = new Map();

function getPortraitCanvas(character) {
  const key = JSON.stringify([character.name, character.gender, character.age, getLook(character)]);
  if (!portraitCache.has(key)) {
    const canvas = document.createElement('canvas');
    canvas.width = PORTRAIT_RES;
    canvas.height = PORTRAIT_RES;
    const ctx = canvas.getContext('2d');
    renderPortraitPixels(character).forEach((value, index) => {
      if (!value) return;
      ctx.fillStyle = value;
      ctx.fillRect(index % PORTRAIT_RES, Math.floor(index / PORTRAIT_RES), 1, 1);
    });
    portraitCache.set(key, canvas);
  }
  return portraitCache.get(key);
}
