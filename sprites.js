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
