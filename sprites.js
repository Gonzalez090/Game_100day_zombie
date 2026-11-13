// ============================================================
//  sprites.js — แผนที่พิกเซลของภาพทั้งหมด (ตัวละคร + ภาพประกอบ)
//  1 ตัวอักษร = 1 พิกเซล, '.' = โปร่งใส, '_' = ลบจุดที่วาดไว้ก่อนหน้า (ใช้ตอนซ้อนชั้น)
//  สไตล์ตัวเล็กหันหน้าตรง หัวโต สีเรียบ เส้นขอบดำ (game.js ใส่เส้นขอบ K ให้อัตโนมัติ ไม่ต้องวาดเอง)
//  สีของแต่ละตัวอักษรคำนวณใน game.js (buildHeroPalette / SCENE_PALETTES)
//  แก้ภาพได้ที่นี่ แต่ทุกแถวของภาพเดียวกันต้องยาวเท่ากัน (เกมจะเตือนใน Console ถ้าผิด)
// ============================================================

// ------------------------------------------------------------
// ตัวละครของผู้เล่นในภาพประกอบ (หันหน้าตรง ตัวเต็ม) กว้าง 14 สูง 22 จุด (ก่อนใส่เส้นขอบ)
//   (รูปตัวละครครึ่งตัว 64x64 อยู่ใน portrait.js)
//   วาดซ้อนกันตามลำดับ: เป้ → ขา → ชุด → สายเป้ → หัว → หนวดเครา → ผม/หมวกกันน็อก → หมวก → ของประดับ → แว่น → อาวุธ → ไฟฉาย
//   แถว 0-2 เว้นไว้ให้ผมทรงสูง/หมวก / หัว 3-10 / ลำตัว 11-17 (มือขวาอยู่คอลัมน์ 11-12 แถว 16) / ขา 18-21
//   S ผิว, s ผิวเงา, l ผิวสว่าง (หัวล้าน), E ตา, m ปาก, H ผม, h ผมเงา/คิ้ว, j ผมเงาวาว, z หนวดเคราบาง
//   T ชุด, t ชุดเงา, u ปกเสื้อสว่าง, W เสื้อเชิ้ตขาว, k เน็คไท/เข็มขัด, o กระดุม, f ลายดอก
//   P กางเกง, F รองเท้า, G กรอบแว่น, g เลนส์, X ขอบหมวกกันน็อก, R หมวกกันน็อก, A หมวก, a หมวกเงา
//   r ผ้าโพกหัว, y ทอง/เกสรดอกไม้, B เป้, b สายเป้, w ด้าม, L ใบมีด, d ไม้, M เหล็ก, O ไฟฉาย, Y แสงไฟ
// ------------------------------------------------------------
const HERO_WIDTH = 14;
const HERO_HEIGHT = 22;

const HERO_HEAD = { top: 3, rows: [
  '....SSSSSS....',
  '...SSSSSSSS...',
  '..SSSSSSSSSS..',
  '..SShhSShhSS..',
  '..SSSESSESSS..',
  '...SSSSsSSS...',
  '...SSSmmSSS...',
  '....sSSSSs....',
] };

// ชุด (ชื่อตรงกับ CONFIG.appearance.outfits) torso = ลำตัวแถว 11-17, skirt = ส่วนที่คลุมขาแถว 18-19
// legs: 'jacket' = กางเกงสีเดียวกับชุด (สูท), 'skin' = ขาเปลือย (ชุดเดรส)
const HERO_OUTFITS = {
  tshirt: { torso: [
    '.TTTTtSStTTTT.',
    '.TTTTTTTTTTTT.',
    '.SSTTTTTTTTSS.',
    '.SSTTTTTTTTSS.',
    '.SStTTTTTTtSS.',
    '.SSPPPPPPPPSS.',
    '...PPPPPPPP...',
  ] },
  shirt: { torso: [
    '.TTTTWSSWTTTT.',
    '.TfTTTWWTTTfT.',
    '.SSTTfTTTTTSS.',
    '.SSTTTTTfTTSS.',
    '.SSfTTTTTTfSS.',
    '.SSPPPPPPPPSS.',
    '...PPPPPPPP...',
  ] },
  suit: { legs: 'jacket', torso: [
    '.TTTTTWWTTTTT.',
    '.TTTTTkkTTTTT.',
    '.TTTTTkkTTTTT.',
    '.TTTTTTkTTTTT.',
    '.TtTTTTTTTTtT.',
    '.SSPPPPPPPPSS.',
    '...PPPPPPPP...',
  ] },
  vest: { torso: [
    '.WWTTTWWTTTWW.',
    '.WWTTTWWTTTWW.',
    '.WWTTTTWTTTWW.',
    '.WWTTToTTTTWW.',
    '.WWTTToTTTTWW.',
    '.SSPPPPPPPPSS.',
    '...PPPPPPPP...',
  ] },
  coat: { torso: [
    '.TTTuTTTTuTTT.',
    '.TTTTuTTuTTTT.',
    '.TTTTTTTTTTTT.',
    '.TTTTTTTTTTTT.',
    '.TTkkkkkkkkTT.',
    '.SSTTTTTTTTSS.',
    '...TTTTTTTT...',
  ], skirt: [
    '...TTTTTTTT...',
    '...TTT..TTT...',
  ] },
  dress: { legs: 'skin', torso: [
    '.TTTTTSSTTTTT.',
    '.TTTTTTTTTTTT.',
    '.SSTTTTTTTTSS.',
    '.SSTTTTTTTTSS.',
    '.SStTTTTTTtSS.',
    '.SSTTTTTTTTSS.',
    '..TTTTTTTTTT..',
  ], skirt: [
    '..TTTTTTTTTT..',
    '..tTTTTTTTTt..',
  ] },
};

const HERO_LEGS = { // แถว 18-21: ยืน / ก้าวขาซ้าย / ก้าวขาขวา (หันหน้าตรงแบบเกม RPG)
  stand: [
    '...PPP..PPP...',
    '...PPP..PPP...',
    '...PPP..PPP...',
    '..FFFF..FFFF..',
  ],
  stride: [
    '...PPP..PPP...',
    '...PPP..PPP...',
    '..FFFF..PPP...',
    '........FFFF..',
  ],
  pass: [
    '...PPP..PPP...',
    '...PPP..PPP...',
    '...PPP..FFFF..',
    '..FFFF........',
  ],
};

const HERO_HAIR = { // ทรงผม (ชื่อตรงกับ CONFIG.appearance.hairStyles)
  short: { top: 1, rows: [
    '....HHHHHH....',
    '...HHjHHHHH...',
    '..HHHHHHHHHH..',
    '..HHHHHHHHHH..',
    '..HHH....HHH..',
    '..H........H..',
  ] },
  buzz: { top: 2, rows: [
    '....hhhhhh....',
    '...hhhhhhhh...',
    '..hh......hh..',
  ] },
  spiky: { top: 0, rows: [
    '...H..H..H....',
    '...HH.HH.HH...',
    '...HHjHHHHH...',
    '..HHHHHHHHHH..',
    '..HHHHHHHHHH..',
    '..HHH....HHH..',
    '..H........H..',
  ] },
  bun: { top: 0, rows: [
    '.....HHHH.....',
    '.....HjHH.....',
    '...HHHHHHHH...',
    '..HHHHHHHHHH..',
    '..HHHHHHHHHH..',
    '..HH......HH..',
  ] },
  long: { top: 1, rows: [
    '....HHHHHH....',
    '...HHjHHHHH...',
    '..HHHHHHHHHH..',
    '..HHHHHHHHHH..',
    '..HHH....HHH..',
    '..HH......HH..',
    '..HH......HH..',
    '..HH......HH..',
    '..HH......HH..',
    '..HH......HH..',
    '..HH......HH..',
    '..HH......HH..',
    '..HH......HH..',
    '..hh......hh..',
  ] },
  ponytail: { top: 1, rows: [
    '....HHHHHH....',
    '...HHjHHHHH...',
    '..HHHHHHHHHHH.',
    '..HHHHHHHHHHHH',
    '..HHH....HHHHH',
    '..H........HHH',
    '............HH',
    '............HH',
    '............Hh',
    '.............h',
  ] },
  bob: { top: 1, rows: [
    '....HHHHHH....',
    '...HHjHHHHH...',
    '..HHHHHHHHHH..',
    '..HHHHHHHHHH..',
    '..HHHHHHHHHH..',
    '..HH......HH..',
    '..HH......HH..',
    '..HH......HH..',
    '..HH......HH..',
    '..hh......hh..',
  ] },
  bald: { top: 3, rows: [ // หัวล้าน: เงาวาวบนหัว + ผมข้างหูเหลือนิดหน่อย
    '.....ll.......',
    '..............',
    '..H........H..',
    '..H........H..',
  ] },
};

const HERO_FACIAL_HAIR = { // หนวดเครา (ชื่อตรงกับ CONFIG.appearance.facialHair)
  stubble: { top: 9, rows: [
    '...zz....zz...',
    '....zzzzzz....',
  ] },
  beard: { top: 8, rows: [
    '...H......H...',
    '...HHH..HHH...',
    '....HHHHHH....',
    '.....HHHH.....',
  ] },
};

const HERO_GLASSES = { top: 6, rows: [
  '....GGGGGG....',
  '....g.gg.g....',
] };

const HERO_HELMET = { top: 1, rows: [ // หมวกกันน็อก (ใส่แทนผม เปิดหน้า)
  '....XXXXXX....',
  '...XRRjRRRX...',
  '..XRRRRRRRRX..',
  '..XRRRRRRRRX..',
  '..XRX....XRX..',
  '..XX......XX..',
] };

const HERO_HATS = { // หมวก (ชื่อตรงกับ CONFIG.appearance.hats)
  cap: { top: 1, rows: [
    '....AAAAAA....',
    '...AAjAAAAA...',
    '..AAAAAAAAAA..',
    '.aaaaaaaaaaaa.',
  ] },
  fedora: { top: 0, rows: [
    '....AAAAAA....',
    '...AAAAAAAA...',
    '...aaaaaaaa...',
    'AAAAAAAAAAAAAA',
    '.aaaaaaaaaaaa.',
  ] },
  beanie: { top: 1, rows: [
    '....AAAAAA....',
    '...AAjAAAAA...',
    '..AAAAAAAAAA..',
    '..aAaAaAaAaA..',
  ] },
};

const HERO_ACCESSORIES = { // ของประดับ (ชื่อตรงกับ CONFIG.appearance.accessories)
  flower: { top: 3, rows: ['..fy..........', '..ff..........'] },
  bandana: { top: 5, rows: ['..rrrrrrrrrr..', '...........rr.'] },
  earrings: { top: 8, rows: ['..y........y..'] },
};

const HERO_BACKPACK = { top: 11, rows: [ // เป้ด้านหลัง โผล่ข้างไหล่ (วาดก่อนลำตัว)
  'B............B',
  'B............B',
  'b............b',
  'b............b',
] };

const HERO_BACKPACK_STRAP = { top: 11, rows: [ // สายเป้พาดไหล่
  '....b....b....',
  '....b....b....',
  '....b....b....',
  '....b....b....',
] };

const HERO_WEAPONS = { // อาวุธข้างมือขวา (ใส่เฉพาะอาวุธที่มีภาพ)
  kitchen_knife: { top: 17, rows: ['............w.', '............L.', '............L.'] },
  baseball_bat: { top: 10, rows: [
    '.............d',
    '.............d',
    '.............d',
    '.............d',
    '.............d',
    '.............d',
    '.............w',
    '.............w',
  ] },
  pistol: { top: 15, rows: ['.............M', '.............M'] },
  shotgun: { top: 9, rows: [
    '.............M',
    '.............M',
    '.............M',
    '.............M',
    '.............M',
    '.............M',
    '.............d',
    '.............d',
    '.............d',
  ] },
};

const HERO_FLASHLIGHT = { top: 16, rows: ['.....OY.......'] }; // ไฟฉายเหน็บเอว

// โบกมือเรียกเฮลิคอปเตอร์ (สลับ 2 ท่า): ยกแขนซ้ายขึ้น ลบแขนที่ห้อยอยู่เดิม
const HERO_WAVE = [
  { top: 7, rows: [
    'S.............',
    'S.............',
    't.............',
    't.............',
    '..............',
    '..............',
    '.__...........',
    '.__...........',
    '.__...........',
    '.__...........',
  ] },
  { top: 6, rows: [
    'S.............',
    'S.............',
    't.............',
    't.............',
    't.............',
    '..............',
    '..............',
    '.__...........',
    '.__...........',
    '.__...........',
    '.__...........',
  ] },
];

// ------------------------------------------------------------
// ซอมบี้ในภาพประกอบ (หันหน้าตรง สไตล์เดียวกับตัวละคร)
//   S ผิว, s ผิวเงา, l ผิวสว่าง, g ตุ่มหนอง, H ผมแห้ง ๆ, E ตา, r เลือด/ปาก, W ฟัน
//   C เสื้อขาด ๆ, c เสื้อเงา, P กางเกง, p เท้า/กางเกงเงา
//   walk = ท่าเดิน 2 ท่า (ท่าแรกใช้ตอนยืนด้วย), look = อ้าปากคำราม (เหตุการณ์เล็ก ๆ ในภาพ)
// ------------------------------------------------------------
const ZOMBIE_WALKER_A_TOP = [
  '....HH.H......',
  '....SSSSSS....',
  '...SSSSSSSS...',
  '..SSSSSSSSSS..',
  '..SsSSSSSSsS..',
  '..SSESSSSESS..',
  '...SSSSSSSS...',
  '...SSrWWrSS...',
  '....sSSSSs....',
  'SS.CCCCCCCC.SS',
  '.SSCCCCCCCCSS.',
  '...cCCrCCCc...',
  '...cCCCCCCc...',
  '...cC.CC.Cc...',
  '...PPPPPPPP...',
];
const ZOMBIE_WALKER_B_TOP = [
  '....SSSSSS....',
  '...SSrSSSSS...',
  '..SSrrSSSSSS..',
  '..SSSSSSSSSS..',
  '..SSESSSSESS..',
  '..SSSSSSSSSS..',
  '...SSrrrrSS...',
  '....sSSSSs....',
  '..CCCCCCCCCC..',
  '.SCCCCCCCCCCSS',
  '.ScCCCrCCCCc..',
  '.S.cCCCCCCc...',
  '.S.cCCCCCCc...',
  '...PPPPPPPP...',
];
const ZOMBIE_LEGS_STAND = ['...PPP..PPP...', '...PPP..PPP...', '...PPP..PPP...', '..ppp....ppp..'];
const ZOMBIE_LEGS_STEP = ['...PPP..PPP...', '...PPP..PPP...', '..ppp...PPP...', '........ppp...'];
const roarFace = rows => rows.map((row, index) => (index === 7 ? '...SrrrrrrS...' : row)); // อ้าปากกว้าง

const ZOMBIE_SPRITES = {
  // ซอมบี้ธรรมดา ก: ยกแขนยื่นมาข้างหน้า ผมแห้งเหลือไม่กี่เส้น
  walkerA: {
    walk: [[...ZOMBIE_WALKER_A_TOP, ...ZOMBIE_LEGS_STAND], [...ZOMBIE_WALKER_A_TOP, ...ZOMBIE_LEGS_STEP]],
    look: [...roarFace(ZOMBIE_WALKER_A_TOP), ...ZOMBIE_LEGS_STAND],
  },
  // ซอมบี้ธรรมดา ข: หัวโล้นมีแผล แขนข้างหนึ่งห้อยต่องแต่ง
  walkerB: {
    walk: [[...ZOMBIE_WALKER_B_TOP, ...ZOMBIE_LEGS_STAND], [...ZOMBIE_WALKER_B_TOP, ...ZOMBIE_LEGS_STEP]],
    look: [...ZOMBIE_WALKER_B_TOP.map((row, index) => (index === 6 ? '...SrrrrrrS...' : row)), ...ZOMBIE_LEGS_STAND],
  },
  // ซอมบี้วิ่งไว: ตัวผอม แขนแกว่งสลับ ก้าวขากว้าง
  runner: { walk: [
    [
      '.....SSSS.....',
      '....SSSSSS....',
      '...SSSSSSSS...',
      '...SESSSSES...',
      '...SSSSSSSS...',
      '...SSrWWrSS...',
      '....sSSSSs....',
      '...CCCCCCCCSS.',
      '..SCCCCCCCCS..',
      '.S.cCCCCCCc...',
      'S..cCCCCCCc...',
      '....PPPPPP....',
      '...PPP..PPP...',
      '..PPP....PPP..',
      '..PP......PP..',
      '.ppp......ppp.',
    ],
    [
      '.....SSSS.....',
      '....SSSSSS....',
      '...SSSSSSSS...',
      '...SESSSSES...',
      '...SSSSSSSS...',
      '...SSrWWrSS...',
      '....sSSSSs....',
      '.SSCCCCCCCC...',
      '..SCCCCCCCCS..',
      '...cCCCCCCc.S.',
      '...cCCCCCCc..S',
      '....PPPPPP....',
      '....PPPPPP....',
      '....PP..PP....',
      '...PP....PP...',
      '..ppp....ppp..',
    ],
  ] },
  // ซอมบี้ตัวบวม: พุงพองใหญ่ มีตุ่มหนอง หัวเล็ก
  bloater: { walk: [
    [
      '.......SSSSSS.......',
      '......SSSSSSSS......',
      '......SESSSSES......',
      '......SSSrrSSS......',
      '.......sSSSSs.......',
      '....SSCCCCCCCCSS....',
      '..SSSSSSSSSSSSSSSS..',
      '.SSSSSSlSSSSSSgSSSS.',
      '.SSSSSllSSSSSSSSSSS.',
      'SSSgSSSSSSSSSSSSSSSS',
      '.SSSSSSSSSSSSgSSSSS.',
      '.sSSSSSSSSSSSSSSSSs.',
      '..sSSSSSSSSSSSSSSs..',
      '...ssSSSSSSSSSSss...',
      '.....PPPPPPPPPP.....',
      '.....PPPP..PPPP.....',
      '.....PPP....PPP.....',
      '....ppp......ppp....',
    ],
    [
      '.......SSSSSS.......',
      '......SSSSSSSS......',
      '......SESSSSES......',
      '......SSSrrSSS......',
      '.......sSSSSs.......',
      '....SSCCCCCCCCSS....',
      '..SSSSSSSSSSSSSSSS..',
      '.SSSSSSlSSSSSSgSSSS.',
      '.SSSSSllSSSSSSSSSSS.',
      'SSSgSSSSSSSSSSSSSSSS',
      '.SSSSSSSSSSSSgSSSSS.',
      '.sSSSSSSSSSSSSSSSSs.',
      '..sSSSSSSSSSSSSSSs..',
      '...ssSSSSSSSSSSss...',
      '.....PPPPPPPPPP.....',
      '.....PPPP..PPPP.....',
      '....ppp....PPP......',
      '...........ppp......',
    ],
  ] },
  // ซอมบี้กรีดร้อง: อ้าปากกว้าง ชูแขนสองข้าง (2 ท่าสลับกันตอนร้อง)
  screamer: { walk: [
    [
      'S..............S',
      'SS...SSSSSS...SS',
      '.S..SSSSSSSS..S.',
      '.SSSSSSSSSSSSSS.',
      '..SSEESSSSEESS..',
      '...SSSSSSSSSS...',
      '...SSrrrrrrSS...',
      '...SSrWrrWrSS...',
      '....sSrrrrSs....',
      '....CCCCCCCC....',
      '...CCCCCCCCCC...',
      '...cCCrCCCCCc...',
      '...cCCCCCCCCc...',
      '....PPPPPPPP....',
      '....PPP..PPP....',
      '....PPP..PPP....',
      '...ppp....ppp...',
    ],
    [
      '................',
      'S....SSSSSS....S',
      'SS..SSSSSSSS..SS',
      '.SSSSSSSSSSSSSS.',
      '..SSEESSSSEESS..',
      '...SSSSSSSSSS...',
      '...SSSrrrrSSS...',
      '...SSrWrrWrSS...',
      '....sSSrrSSs....',
      '....CCCCCCCC....',
      '...CCCCCCCCCC...',
      '...cCCrCCCCCc...',
      '...cCCCCCCCCc...',
      '....PPPPPPPP....',
      '....PPP..PPP....',
      '....PPP..PPP....',
      '...ppp....ppp...',
    ],
  ] },
  // ซอมบี้ยักษ์ (บอส): ตัวใหญ่ไหล่กว้าง แขนยาวถึงเข่า
  boss: { walk: [
    [
      '.......SSSSSSSS.......',
      '......SSSSSSSSSS......',
      '......SSESSSSESS......',
      '......SSSSSSSSSS......',
      '......SSrWWWWrSS......',
      '.......sSSSSSSs.......',
      '...SSSSSSCCCCSSSSSS...',
      '..SSSSSSSSSSSSSSSSSS..',
      '.SSSSlSSSSSSSSSSlSSSS.',
      '.SSSSSSSSSrSSSSSSSSSS.',
      'SSSSs.SSSSSSSSSS.sSSSS',
      'SSSSs.sSSSSSSSSs.sSSSS',
      'SSSSs.sSSSSSSSSs.sSSSS',
      'SSSS..CCCCCCCCCC..SSSS',
      '.SSS..CCCCCCCCCC..SSS.',
      '.SSS..PPPPPPPPPP..SSS.',
      '..S...PPPPPPPPPP...S..',
      '......PPPP..PPPP......',
      '......PPPP..PPPP......',
      '......PPPP..PPPP......',
      '.....pppp....pppp.....',
    ],
    [
      '.......SSSSSSSS.......',
      '......SSSSSSSSSS......',
      '......SSESSSSESS......',
      '......SSSSSSSSSS......',
      '......SSrWWWWrSS......',
      '.......sSSSSSSs.......',
      '...SSSSSSCCCCSSSSSS...',
      '..SSSSSSSSSSSSSSSSSS..',
      '.SSSSlSSSSSSSSSSlSSSS.',
      '.SSSSSSSSSrSSSSSSSSSS.',
      'SSSSs.SSSSSSSSSS.sSSSS',
      'SSSSs.sSSSSSSSSs.sSSSS',
      'SSSSs.sSSSSSSSSs.sSSSS',
      'SSSS..CCCCCCCCCC..SSSS',
      '.SSS..CCCCCCCCCC..SSS.',
      '.SSS..PPPPPPPPPP..SSS.',
      '..S...PPPPPPPPPP...S..',
      '......PPPP..PPPP......',
      '......PPPP..PPPP......',
      '.....pppp...PPPP......',
      '............pppp......',
    ],
  ] },
};

// ------------------------------------------------------------
// ของประกอบฉาก
//   รถ: K เส้นขอบ, B ตัวรถ, b ตัวรถเงา, w กระจก, W ล้อ
//   กรวยจราจร: O ส้ม, W แถบขาว, K ฐาน
// ------------------------------------------------------------
const SCENE_CAR = [
  '........KKKKKKKK........',
  '.......KwwwKKwwwK.......',
  '......KwwwwKKwwwwK......',
  '..KKKKBBBBBBBBBBBBKKKK..',
  '.KBBBBBBBBBBBBBBBBBBBBK.',
  'KBBbbBBBBBBBBBBBBBBbbBBK',
  'KBBBBBBBBBBBBBBBBBBBBBBK',
  'KbbKKKKbbbbbbbbbbKKKKbbK',
  '..KWWK..........KWWK....',
  '...KK............KK.....',
];

const SCENE_CONE = [
  '.O.',
  '.O.',
  'OWO',
  'OOO',
  'KKK',
];

// ------------------------------------------------------------
// ภาพประกอบอีเวนต์ (วาดใน event-scenes.js)
//   คนที่โผล่ในอีเวนต์ใช้ภาพตัวละครชุดเดียวกับผู้เล่น (HERO_*) แล้ววาดท่าทาง/ของในมือทับ
//   ทุกส่วนกว้าง 14 จุดเท่าตัวละคร: '.' = ไม่เปลี่ยน, '_' = ลบจุดเดิม
//   สีเพิ่ม (EVENT_PROP_COLORS ใน event-scenes.js): 0 เลือด, 1 ปกสมุด, 2 กระดาษ, 3 กรอบรูปไม้,
//   4 รูปถ่าย, 5 คนในรูป, 6 ตัววิทยุ, 7 ลำโพง, 8 หน้าปัด, 9 เสาอากาศ, q ผ้าปิดหน้า
// ------------------------------------------------------------
const EVENT_POSES = {
  // สองมือถือของไว้ที่อก (ของอยู่คอลัมน์ 4-9 แถว 13-16 ดู EVENT_HELD_ITEMS)
  hold: { top: 14, rows: [
    '._SS......SS_.',
    '.__S......S__.',
    '.__........__.',
  ] },
  // ยกวิทยุสื่อสารแนบหูขวา
  phone: { top: 4, rows: [
    '.............9',
    '.............9',
    '............66',
    '............67',
    '............66',
    '...........S66',
    '............SS',
    '.............t',
    '.............t',
    '...........__.',
    '...........__.',
    '...........__.',
    '...........__.',
  ] },
  // ชูสองแขน
  armsUp: { top: 7, rows: [
    'S............S',
    'S............S',
    't............t',
    't............t',
    '..............',
    '..............',
    '.__........__.',
    '.__........__.',
    '.__........__.',
    '.__........__.',
  ] },
};

// นั่งกับพื้นเหยียดขามาข้างหน้า: ใช้แทนขาแถว 18-21 (ภาพเตี้ยลงเหลือ 20 แถว)
const EVENT_SIT_LEGS = [
  '.PPPPP..PPPPP.',
  '.FFFF....FFFF.',
];

// เป้ใบใหญ่มีม้วนผ้าห่มด้านบน (วาดไว้หลังตัว: เติมเฉพาะจุดที่ยังว่าง)
const EVENT_BIG_PACK = { top: 5, rows: [
  'dddddddddddddd',
  'dwdwdwdwdwdwdw',
  'BBBBBBBBBBBBBB',
  'BBBBBBBBBBBBBB',
  'BBBBBBBBBBBBBB',
  'BBBBBBBBBBBBBB',
  'BBBBBBBBBBBBBB',
  'BBBBBBBBBBBBBB',
  'bBBBBBBBBBBBBb',
  'bBBBBBBBBBBBBb',
  'bBBBBBBBBBBBBb',
  '.bbbbbbbbbbbb.',
] };

// ผ้าโพกปิดจมูกถึงคาง ชายผ้าเป็นมุมแหลมห้อยลงใต้คาง (โจร)
const EVENT_MASK = { top: 8, rows: [
  '..qqqqqqqqqq..',
  '...qqqQqqqq...',
  '....qqQqqq....',
  '......qq......',
] };

// แผลที่ขาซ้ายตอนนั่ง / ผ้าพันแผลที่พันแล้ว
const EVENT_LEG_WOUND = { top: 18, rows: ['..00..........'] };
const EVENT_LEG_BANDAGE = { top: 18, rows: ['..WWW.........'] };

// ของที่ถือไว้ที่อก (ใช้คู่กับท่า hold)
const EVENT_HELD_ITEMS = {
  book: { top: 13, rows: [
    '....111111....',
    '....122221....',
    '....122221....',
    '....111111....',
  ] },
  photo: { top: 13, rows: [
    '....333333....',
    '....345543....',
    '....344443....',
    '....333333....',
  ] },
  radio: { top: 11, rows: [
    '.........9....',
    '.........9....',
    '....666666....',
    '....677686....',
    '....677666....',
    '....666666....',
  ] },
  firstAid: { top: 13, rows: [
    '....WWrrWW....',
    '....WrrrrW....',
    '....WWrrWW....',
    '....WWWWWW....',
  ] },
};

// สัญลักษณ์ในฟองคำพูดเหนือหัว 5x5 (r แดง, b น้ำเงิน, k ดำ, p ชมพู)
const EVENT_EMOTES = {
  alert:    ['..r..', '..r..', '..r..', '.....', '..r..'],
  question: ['.bbb.', '....b', '..bb.', '.....', '..b..'],
  dots:     ['.....', '.....', 'k.k.k', '.....', '.....'],
  heart:    ['.....', 'pp.pp', 'ppppp', '.ppp.', '..p..'],
  note:     ['..bb.', '..b.b', '..b..', 'bbb..', 'bb...'],
  sweat:    ['...b.', '..bb.', '.bbbb', '.bbbb', '..bb.'],
  sleep:    ['kkkk.', '...k.', '..k..', '.k...', 'kkkk.'],
  anger:    ['.r.r.', 'rr.rr', '.....', 'rr.rr', '.r.r.'],
};

// ของประกอบฉากที่วางบนพื้น (game.js ใส่เส้นขอบดำให้อัตโนมัติ) สีอยู่ใน EVENT_PROP_PALETTES (event-scenes.js)
const EVENT_PROPS = {
  // ถังรองน้ำ: R ขอบถัง, i ข้างในถัง (ค่อย ๆ เปลี่ยนเป็นสีน้ำ), B ตัวถัง, b ตัวถังสว่าง
  bucket: [
    '.RRRRRR.',
    'RiiiiiiR',
    '.BBBBBB.',
    '.BbBBBB.',
    '.BbBBBB.',
    '..BBBB..',
  ],
  // ประตูห้องใต้ดินคล้องโซ่: d ขอบไม้, D บานไม้, M โซ่/หูจับ, y แม่กุญแจ, s ฐานปูน
  cellar: [
    '..dddddddddddddddddd..',
    '.dDDDDDMDDddDDMDDDDDd.',
    '.dDDDDDMDDddDDMDDDDDd.',
    'dDDDDDDMMMyyMMMDDDDDDd',
    'dDDDDDDDDDyyDDDDDDDDDd',
    'dDDDDDDDDDddDDDDDDDDDd',
    'ssssssssssssssssssssss',
  ],
  // เปิดแล้ว: บานไม้พับลงสองข้าง เห็นขั้นบันไดมืด ๆ (k ช่องมืด, x ขั้นบันได)
  cellarOpen: [
    'dd..................dd',
    'dDd.kkkkkkkkkkkkkk.dDd',
    'dDdkkkkkkkkkkkkkkkkdDd',
    'dDdkxxxxxxxxxxxxxxkdDd',
    'dDdkkkkkkkkkkkkkkkkdDd',
    'dDdkkxxxxxxxxxxxxkkdDd',
    'ssssssssssssssssssssss',
  ],
  // ลังไม้: D แผ่นไม้, d ร่องไม้, w ไม้คาดเฉียง
  crate: [
    'DDDDDDDDDD',
    'dddddddddd',
    'DDwDDDDwDD',
    'DDDwDDwDDD',
    'DDDDwwDDDD',
    'DDDwDDwDDD',
    'dddddddddd',
    'DDDDDDDDDD',
  ],
  // ตู้กดน้ำ: R ตัวตู้, r ขาตู้, L ป้ายไฟ, g กระจก, a/b/c กระป๋อง, p แผงปุ่ม, y ปุ่ม, k ช่องหยอดเหรียญ/ช่องรับของ
  vending: [
    'RRRRRRRRRRRRRR',
    'RLLLLLLLLLLLLR',
    'RRRRRRRRRRRRRR',
    'RggggggggRpppR',
    'RgabcabcgRpypR',
    'RgabcabcgRpppR',
    'RggggggggRpypR',
    'RgcabcabgRpppR',
    'RgcabcabgRpypR',
    'RggggggggRpppR',
    'RgbcabcagRpppR',
    'RgbcabcagRpkpR',
    'RggggggggRpppR',
    'RggggggggRpppR',
    'RRRRRRRRRRRRRR',
    'RRRRRRRRRRRRRR',
    'RRkkkkkkkkkkRR',
    'RRkkkkkkkkkkRR',
    'RRRRRRRRRRRRRR',
    'rRRRRRRRRRRRRr',
    'rr..........rr',
  ],
  // ตู้กดน้ำที่กระจกแตกแล้ว (x รอยร้าว) กระป๋องหายไปหลายช่อง
  vendingBroken: [
    'RRRRRRRRRRRRRR',
    'RLLLLLLLLLLLLR',
    'RRRRRRRRRRRRRR',
    'RggxgggggRpppR',
    'RgaxggbcgRpypR',
    'RggxxggcgRpppR',
    'RgggxxgggRpypR',
    'RgcggxxbgRpppR',
    'RggagggxgRpypR',
    'RggggggxgRpppR',
    'RgbggggxgRpppR',
    'RgggcaxggRpkpR',
    'RggggxgggRpppR',
    'RggggggggRpppR',
    'RRRRRRRRRRRRRR',
    'RRRRRRRRRRRRRR',
    'RRkkkkkkkkkkRR',
    'RRkkkkkkkkkkRR',
    'RRRRRRRRRRRRRR',
    'rRRRRRRRRRRRRr',
    'rr..........rr',
  ],
  // รองเท้าข้างเดียว (S หนัง, s พื้นรองเท้า)
  shoe: [
    'SS...',
    'SSSSS',
    'sssss',
  ],
};

// รูปครอบครัวในกรอบ (ภาพขยายในฟองความคิด): พ่อ ลูก แม่ ยิ้มแย้ม
//   '.' พื้นรูป, H ผมพ่อ, h ผมแม่, k ผมลูก, S ผิว, E ตา, m ปาก, T เสื้อพ่อ, t เสื้อแม่, c เสื้อลูก
const EVENT_FAMILY_PHOTO = [
  '........................',
  '..HHHHH...........hhhh..',
  '.HHHHHHH.........hhhhhh.',
  '.HSSSSSH.........hSSSSh.',
  '.SESSSES..kkkk...hESSEh.',
  '.SSSmSSS.kkkkkk..hSmmSh.',
  '..SSSSS..kSSSSk..hSSSSh.',
  '.TTTTTTT.SESSES.tttttttt',
  'TTTTTTTT.SSmmSS.tttttttt',
  'TTTTTTTT.cccccc.tttttttt',
  'TTTTTTTTcccccccctttttttt',
  'TTTTTTTTcccccccctttttttt',
];
