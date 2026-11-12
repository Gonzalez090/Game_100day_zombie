// ============================================================
//  items.js — ข้อมูลของทั้งหมดในเกม (แยกจากตรรกะใน game.js)
//  แต่ละชิ้นมี:
//    id      = ชื่อเฉพาะ (ใช้เป็นชื่อไฟล์รูป images/items/<id>.png ด้วย)
//    type    = ประเภท (ดู ITEM_TYPES), rarity = ความหายาก (ดู ITEM_RARITIES, โอกาสออกอยู่ใน CONFIG.loot)
//    uses    = ของที่กดใช้: ใช้ได้กี่ครั้ง / ของติดตัว: ใช้งานได้กี่วัน (0 = ตลอด)
//    use     = ผลทันทีตอนกด "ใช้" เช่น { food: 25 } (ค่าติดลบ = ข้อเสีย)
//    risk    = ของเสี่ยง: { chance: โอกาสเกิดผลร้าย %, effects: ผลร้าย }  + riskText อธิบายผลร้าย
//    passive = ผลติดตัวขณะอยู่ในกระเป๋าหรือขณะใส่อยู่ (ดู ITEM_PASSIVE_INFO)
//    wear    = ของสวมใส่: เก็บแล้วใส่ทันที ไม่กินช่องในกระเป๋า ใส่ได้ช่องละ 1 ชิ้น (ดู ITEM_WEAR_SLOTS)
//    en      = คำแปลภาษาอังกฤษ
// ============================================================

// ประเภทของ
const ITEM_TYPES = {
  supply:  { name: 'เสบียง',     en: { name: 'Supply' } },
  weapon:  { name: 'อาวุธ',      en: { name: 'Weapon' } },
  defense: { name: 'ป้องกัน',    en: { name: 'Defense' } },
  tool:    { name: 'เครื่องมือ',  en: { name: 'Tool' } },
  risky:   { name: 'ของเสี่ยง',   en: { name: 'Risky' } },
};

// ความหายาก (โอกาสออกตั้งค่าใน CONFIG.loot.rarityWeights)
const ITEM_RARITIES = {
  common: { name: 'ทั่วไป',    en: { name: 'Common' } },
  rare:   { name: 'หายาก',    en: { name: 'Rare' } },
  epic:   { name: 'หายากมาก', en: { name: 'Very rare' } },
};

// ช่องสวมใส่ (แสดงแยกจากช่องในกระเป๋า) — ตอนนี้มีช่องเดียวคือส่วนใส่กระเป๋า
const ITEM_WEAR_SLOTS = {
  bag: { name: 'ส่วนใส่กระเป๋า', en: { name: 'Worn bag' } },
};

// ความหมายของผลติดตัว (passive)
//   weaponPower/ammoPerNight/noise/defense/damageReduction มีผลตอนกลางคืน
//   ปืน (มี ammoPerNight) ยิงได้เฉพาะคืนที่กระสุนพอ ยิงแล้วเกิดเสียง (noise) เรียกซอมบี้เพิ่ม
const ITEM_PASSIVE_INFO = {
  weaponPower:     { name: 'พลังโจมตี',             en: { name: 'Attack power' },        better: 'up' },
  ammoPerNight:    { name: 'ใช้กระสุนต่อคืน',        en: { name: 'Ammo per night' },      better: 'down' },
  noise:           { name: 'เสียงดังเรียกซอมบี้',     en: { name: 'Noise (draws zombies)' }, better: 'down' },
  defense:         { name: 'ความแข็งแรงที่พัก',       en: { name: 'Shelter strength' },    better: 'up' },
  damageReduction: { name: 'ลดความเสียหายที่ได้รับ',  en: { name: 'Damage reduction' },    better: 'up', unit: '%' },
  slots:           { name: 'ช่องเก็บของ',            en: { name: 'Bag slots' },           better: 'up' },
  morningChoices:  { name: 'ของที่เจอตอนเช้า',        en: { name: 'Morning finds' },       better: 'up' },
};

// ของทั้งหมด 21 ชิ้น (ของที่ใช้งานเป็นวันจะลด 1 ทุกสิ้นวัน)
const ITEMS = [
  // ---------- เสบียง ----------
  {
    id: 'canned_fish', icon: 'canned_fish', type: 'supply', rarity: 'common', uses: 1,
    name: 'ปลากระป๋อง', desc: 'อิ่มท้องแน่นอน เปิดกินได้ทันที',
    en: { name: 'Canned fish', desc: 'Reliable protein, ready to eat.' },
    use: { food: 25 },
  },
  {
    id: 'instant_noodles', icon: 'instant_noodles', type: 'supply', rarity: 'common', uses: 1,
    name: 'บะหมี่กึ่งสำเร็จรูป', desc: 'อิ่มนาน แต่ต้องเสียน้ำต้ม',
    en: { name: 'Instant noodles', desc: 'Filling, but costs water to cook.' },
    use: { food: 30, water: -8 },
  },
  {
    id: 'water_bottle', icon: 'water_bottle', type: 'supply', rarity: 'common', uses: 1,
    name: 'น้ำดื่มขวด', desc: 'น้ำสะอาดปิดฝาสนิท ดื่มได้เลย',
    en: { name: 'Bottled water', desc: 'Sealed, clean water.' },
    use: { water: 30 },
  },
  {
    id: 'rice_bag', icon: 'rice_bag', type: 'supply', rarity: 'rare', uses: 3,
    name: 'ข้าวสารถุง', desc: 'หุงได้หลายมื้อ แต่ทุกมื้อต้องใช้น้ำ',
    en: { name: 'Bag of rice', desc: 'Several meals, but each one needs water.' },
    use: { food: 20, water: -5 },
  },
  {
    id: 'energy_drink', icon: 'energy_drink', type: 'supply', rarity: 'common', uses: 1,
    name: 'เครื่องดื่มชูกำลัง', desc: 'หายเหนื่อยทันตาเห็น แต่ใจสั่น',
    en: { name: 'Energy drink', desc: 'Kills the fatigue fast, but makes you jittery.' },
    use: { fatigue: -25, stress: 5 },
  },
  {
    id: 'chocolate', icon: 'chocolate', type: 'supply', rarity: 'common', uses: 1,
    name: 'ช็อกโกแลต', desc: 'หวานนิดเดียวก็ทำให้ใจชื้นขึ้น',
    en: { name: 'Chocolate bar', desc: 'A little sweetness lifts the mood.' },
    use: { food: 10, stress: -12 },
  },
  {
    id: 'bandage', icon: 'bandage', type: 'supply', rarity: 'common', uses: 2,
    name: 'ผ้าพันแผล', desc: 'ห้ามเลือดแผลเล็ก ๆ ได้สองครั้ง',
    en: { name: 'Bandages', desc: 'Patches up small wounds, twice.' },
    use: { hp: 15 },
  },
  {
    id: 'first_aid', icon: 'first_aid', type: 'supply', rarity: 'rare', uses: 1,
    name: 'ชุดปฐมพยาบาล', desc: 'ยาและอุปกรณ์ครบ รักษาแผลหนักได้',
    en: { name: 'First aid kit', desc: 'A full kit that treats serious wounds.' },
    use: { hp: 40, stress: -5 },
  },
  {
    id: 'ammo_box', icon: 'ammo_box', type: 'supply', rarity: 'rare', uses: 1,
    name: 'กล่องกระสุน', desc: 'กระสุนปืนครึ่งกล่องที่ใครสักคนทิ้งไว้',
    en: { name: 'Box of ammo', desc: 'A half-full box of rounds someone left behind.' },
    use: { ammo: 8 },
  },

  // ---------- อาวุธ (มีผลตอนกลางคืน) ----------
  {
    id: 'kitchen_knife', icon: 'kitchen_knife', type: 'weapon', rarity: 'common', uses: 6,
    name: 'มีดทำครัว', desc: 'เงียบและเบา แต่ต้องเข้าประชิดตัว',
    en: { name: 'Kitchen knife', desc: 'Quiet and light, but you have to get close.' },
    passive: { weaponPower: 1 },
  },
  {
    id: 'baseball_bat', icon: 'baseball_bat', type: 'weapon', rarity: 'common', uses: 8,
    name: 'ไม้เบสบอล', desc: 'ฟาดหัวซอมบี้ได้แรง ทนทานพอสมควร',
    en: { name: 'Baseball bat', desc: 'Hits hard and lasts a while.' },
    passive: { weaponPower: 2 },
  },
  {
    id: 'pistol', icon: 'pistol', type: 'weapon', rarity: 'rare', uses: 20,
    name: 'ปืนพก', desc: 'ยิงจากระยะไกลได้ แต่กินกระสุนและเสียงดัง',
    en: { name: 'Pistol', desc: 'Kills from a distance, but eats ammo and makes noise.' },
    passive: { weaponPower: 4, ammoPerNight: 2, noise: 1 },
  },
  {
    id: 'shotgun', icon: 'shotgun', type: 'weapon', rarity: 'epic', uses: 15,
    name: 'ปืนลูกซอง', desc: 'นัดเดียวกระจุย แต่เสียงดังจนซอมบี้แห่มาเพิ่ม',
    en: { name: 'Shotgun', desc: 'Devastating, but so loud it draws more zombies.' },
    passive: { weaponPower: 7, ammoPerNight: 3, noise: 3 },
  },

  // ---------- ป้องกัน (มีผลตอนกลางคืน) ----------
  {
    id: 'wooden_planks', icon: 'wooden_planks', type: 'defense', rarity: 'common', uses: 4,
    name: 'แผ่นไม้ตีหน้าต่าง', desc: 'ตีปิดหน้าต่างกันซอมบี้ได้ไม่กี่คืน',
    en: { name: 'Wooden planks', desc: 'Boards up windows for a few nights.' },
    passive: { defense: 2 },
  },
  {
    id: 'barbed_wire', icon: 'barbed_wire', type: 'defense', rarity: 'rare', uses: 6,
    name: 'ลวดหนาม', desc: 'ขึงรอบที่พัก ซอมบี้ฝ่าเข้ามายากขึ้นมาก',
    en: { name: 'Barbed wire', desc: 'Wrapped around the shelter, it slows zombies down a lot.' },
    passive: { defense: 4 },
  },
  {
    id: 'motorcycle_helmet', icon: 'motorcycle_helmet', type: 'defense', rarity: 'rare', uses: 10,
    name: 'หมวกกันน็อก', desc: 'ใส่นอนก็อุ่นใจ กันกัดกันข่วนได้บ้าง',
    en: { name: 'Motorcycle helmet', desc: 'Keeps bites and scratches off your head.' },
    passive: { damageReduction: 15 },
  },

  // ---------- เครื่องมือ ----------
  {
    id: 'flashlight', icon: 'flashlight', type: 'tool', rarity: 'common', uses: 5,
    name: 'ไฟฉาย', desc: 'ส่องหาของในมุมมืดได้มากขึ้น ถ่านอยู่ได้ไม่กี่วัน',
    en: { name: 'Flashlight', desc: 'Lights up dark corners to find more, until the batteries die.' },
    passive: { morningChoices: 1 },
  },
  {
    id: 'backpack', icon: 'backpack', type: 'tool', rarity: 'rare', uses: 0, wear: 'bag',
    name: 'กระเป๋าเป้', desc: 'เก็บแล้วสะพายทันที ได้ช่องเก็บของเพิ่ม (ใส่ได้ทีละใบ)',
    en: { name: 'Backpack', desc: 'You put it on as soon as you pick it up for extra bag space (one at a time).' },
    passive: { slots: 2 },
  },

  // ---------- ของเสี่ยง ----------
  {
    id: 'expired_can', icon: 'expired_can', type: 'risky', rarity: 'common', uses: 1,
    name: 'อาหารกระป๋องหมดอายุ', desc: 'กระป๋องบวมนิด ๆ แต่ในนั้นอาหารเพียบ',
    riskText: 'ท้องเสียจากอาหารหมดอายุ',
    en: { name: 'Expired canned food', desc: 'The can is a little swollen, but it is full of food.', riskText: 'food poisoning from expired food' },
    use: { food: 35 },
    risk: { chance: 35, effects: { hp: -15 } },
  },
  {
    id: 'rain_water', icon: 'rain_water', type: 'risky', rarity: 'common', uses: 1,
    name: 'น้ำฝนในถัง', desc: 'มีน้ำเต็มถัง แต่ไม่รู้ว่าสะอาดแค่ไหน',
    riskText: 'ท้องร่วงจากน้ำไม่สะอาด',
    en: { name: 'Bucket of rainwater', desc: 'A full bucket, but who knows how clean it is.', riskText: 'sick from dirty water' },
    use: { water: 35 },
    risk: { chance: 30, effects: { hp: -10, stress: 5 } },
  },
  {
    id: 'mystery_pills', icon: 'mystery_pills', type: 'risky', rarity: 'rare', uses: 1,
    name: 'ยาไม่มีฉลาก', desc: 'อาจเป็นยาแก้ปวดชั้นดี... หรืออะไรก็ไม่รู้',
    riskText: 'แพ้ยาจนอาการทรุด',
    en: { name: 'Unlabeled pills', desc: 'Could be strong painkillers... or anything else.', riskText: 'a bad reaction to the pills' },
    use: { hp: 30 },
    risk: { chance: 40, effects: { hp: -45, fatigue: 20 } },
  },
];
