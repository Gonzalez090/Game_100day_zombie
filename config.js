// ============================================================
//  config.js — ค่าตั้งค่าเกม "100 วันรอดซอมบี้"
//  ปรับสมดุลเกมได้ที่ไฟล์นี้ไฟล์เดียว ไม่ต้องแก้ game.js
//  ช่อง en = คำแปลภาษาอังกฤษ (ข้อความหน้าจออื่น ๆ อยู่ใน lang.js)
// ============================================================

const CONFIG = {
  totalDays: 100, // รอดครบกี่วันถึงจะชนะ

  // ---------- ค่าสถานะพื้นฐาน ----------
  // ค่าก่อนปรับตามอายุ/อาชีพ/นิสัย
  //   start  = ค่าตอนเริ่มเกม, max = ค่าสูงสุด
  //   warnAt = ถึงค่านี้แล้วขึ้นสีเตือน
  //   higherIsWorse: true = ยิ่งมากยิ่งแย่ (ความเหนื่อย, ความเครียด)
  // พลังชีวิตสูงสุดของแต่ละคนเปลี่ยนตามผล maxHp
  stats: {
    hp:      { name: 'พลังชีวิต',   en: { name: 'Health' },  icon: 'heart', start: 100, max: 100, warnAt: 25 },
    food:    { name: 'อาหาร',      en: { name: 'Food' },    icon: 'meat', start: 100, max: 100, warnAt: 25 },
    water:   { name: 'น้ำ',         en: { name: 'Water' },   icon: 'water_drop', start: 100, max: 100, warnAt: 25 },
    ammo:    { name: 'กระสุน',     en: { name: 'Ammo' },    icon: 'bullets', start: 15,  max: 50,  warnAt: 3 },
    fatigue: { name: 'ความเหนื่อย', en: { name: 'Fatigue' }, icon: 'tired', start: 0,   max: 100, warnAt: 75, higherIsWorse: true },
    stress:  { name: 'ความเครียด',  en: { name: 'Stress' },  icon: 'sweat', start: 0,   max: 100, warnAt: 75, higherIsWorse: true },
  },

  inventory: {
    baseSlots: 5, // ช่องเก็บของพื้นฐาน
  },

  // ---------- การหาของตอนเช้า (ข้อมูลของอยู่ใน items.js) ----------
  loot: {
    offerMin: 3,           // เช้านี้เจอของอย่างน้อยกี่ชิ้น
    offerMax: 4,           // มากสุดกี่ชิ้น (ไฟฉายเพิ่มได้อีก)
    maxPicks: 2,           // เก็บได้กี่ชิ้นต่อเช้า
    extraPickFatigue: 15,  // ชิ้นที่ 2 ขึ้นไปต้องแลกด้วยความเหนื่อยเท่านี้
    // โอกาสออกของแต่ละความหายาก (สัดส่วน)
    rarityWeights: { common: 70, rare: 25, epic: 5 },
    // ของหายาก/หายากมากลดลงเรื่อย ๆ จนเหลือ (1 - ค่านี้) ในวันสุดท้าย: 0.5 = เหลือครึ่งเดียวที่วัน 100
    lateGameRareCut: 0.5,
  },
  itemImages: false, // true = ใช้รูป images/items/<id>.png แทนไอคอนพิกเซลใน icons.js (ต้องมีรูปครบทุกชิ้น)

  // เพศมีผลแค่ชื่อกับรูปลักษณ์ ไม่มีผลต่อค่าสถานะหรือความยาก
  genders: {
    male:   { name: 'ชาย',  en: { name: 'Male' } },
    female: { name: 'หญิง', en: { name: 'Female' } },
  },

  // ---------- อายุ ----------
  age: { min: 18, max: 45 },

  // ผลของช่วงอายุ: อายุน้อยร่างกายดีแต่ขาดประสบการณ์ / อายุมากประสบการณ์สูงแต่ร่างกายอ่อนกว่า
  // mods = ผลที่ได้ (ความหมายของแต่ละตัวดูที่ MOD_INFO ท้ายไฟล์)
  ageGroups: [
    {
      id: 'young', name: 'หนุ่มสาว', minAge: 18, maxAge: 25,
      desc: 'ร่างกายฟิต ฟื้นตัวไว แต่ยังขาดประสบการณ์ ดูของไม่ค่อยเป็น',
      en: { name: 'Young adult', desc: 'Fit and quick to recover, but too inexperienced to judge gear well.' },
      mods: { maxHp: 5, fatigueGain: -5, lootLuck: -5, riskyChance: 5 },
    },
    {
      id: 'adult', name: 'วัยทำงาน', minAge: 26, maxAge: 35,
      desc: 'ร่างกายกับประสบการณ์สมดุลกัน',
      en: { name: 'Working age', desc: 'A good balance of body and experience.' },
      mods: {},
    },
    {
      id: 'middle', name: 'วัยกลางคน', minAge: 36, maxAge: 45,
      desc: 'ผ่านโลกมามาก ดูออกว่าของไหนใช้ได้ แต่ร่างกายเริ่มไม่ไหว',
      en: { name: 'Middle-aged', desc: 'Has seen a lot and knows what is useful, but the body is slowing down.' },
      mods: { lootLuck: 5, riskyChance: -5, maxHp: -5, fatigueGain: 5 },
    },
  ],

  // ---------- อาชีพก่อนวันสิ้นโลก ----------
  // nameFemale     = ชื่อเรียกตอนเป็นผู้หญิง (ใส่เฉพาะอาชีพที่เรียกต่างกัน)
  // minAge, maxAge = จำกัดช่วงอายุของอาชีพนี้ (ไม่ใส่ = ใช้ช่วงอายุปกติ 18-45)
  // startItems     = ของติดตัวตอนเริ่มเกม (id ใน items.js)
  occupations: [
    {
      id: 'nurse', name: 'พยาบาล', icon: 'nurse_cap',
      desc: 'ทำแผลและใช้ยาเป็น ยารักษาได้ผลกว่าคนอื่น แต่ไม่เคยจับปืน',
      en: { name: 'Nurse', desc: 'Knows wound care and medicine, so healing works better, but has never held a gun.' },
      mods: { healPower: 25, ammo: -3 },
      startItems: ['bandage'],
    },
    {
      id: 'mechanic', name: 'ช่างซ่อม', icon: 'wrench',
      desc: 'ซ่อมประตูหน้าต่างให้แน่นหนาได้ดีกว่าใคร แต่งานช่างใช้แรงจนเหนื่อยง่าย',
      en: { name: 'Mechanic', desc: 'Reinforces doors and windows better than anyone, but the heavy work is tiring.' },
      mods: { defensePower: 20, fatigueGain: 5 },
      startItems: ['wooden_planks'],
    },
    {
      id: 'student', name: 'นักเรียน', icon: 'book', minAge: 18, maxAge: 22,
      desc: 'ตาไว รู้ว่าร้านสะดวกซื้อซ่อนของไว้ตรงไหน แต่ไม่เคยต่อสู้จริง',
      en: { name: 'Student', desc: 'Sharp-eyed and knows where convenience stores hide supplies, but has never really fought.' },
      mods: { lootLuck: 15, zombieDamage: 5 },
      startItems: ['chocolate'],
    },
    {
      id: 'soldier', name: 'ทหารเกณฑ์', icon: 'army_helmet', minAge: 18, maxAge: 26,
      desc: 'ผ่านการฝึกยิงปืนและมีกระสุนติดตัวมา แต่ชินกับการกินทีละเยอะ ๆ',
      en: { name: 'Conscript', desc: 'Trained to shoot and carries spare ammo, but is used to eating big portions.' },
      mods: { ammo: 10, ammoPower: 15, foodUse: 5 },
      startItems: ['kitchen_knife'],
    },
    {
      id: 'cook', name: 'พ่อครัว', nameFemale: 'แม่ครัว', icon: 'frying_pan',
      desc: 'ปรุงเสบียงให้อิ่มนานขึ้น แต่ชอบรสจัดจนคอแห้งบ่อย',
      en: { name: 'Cook', desc: 'Makes rations last longer, but loves spicy food and gets thirsty often.' },
      mods: { foodPower: 20, waterUse: 5 },
      startItems: ['canned_fish'],
    },
    {
      id: 'farmer', name: 'เกษตรกร', icon: 'farmer_hat',
      desc: 'รู้วิธีหาและประหยัดน้ำ แต่ไม่คุ้นกับซอกซอยในเมือง',
      en: { name: 'Farmer', desc: 'Knows how to find and save water, but gets lost in city alleys.' },
      mods: { waterUse: -15, lootLuck: -5 },
      startItems: ['water_bottle'],
    },
    {
      id: 'office', name: 'พนักงานออฟฟิศ', icon: 'briefcase',
      desc: 'ชินกับแรงกดดันจากงานจนเครียดยาก แต่นั่งโต๊ะมาทั้งชีวิต ร่างกายไม่ค่อยฟิต',
      en: { name: 'Office worker', desc: 'Used to workplace pressure so stress builds slowly, but a desk job left the body out of shape.' },
      mods: { stressGain: -15, maxHp: -5 },
      startItems: ['energy_drink'],
    },
  ],

  // ---------- นิสัย ----------
  traitCount: 2, // สุ่มกี่อย่างต่อตัวละคร
  // ทุกนิสัยต้องมีทั้งข้อดีและข้อเสีย
  // conflicts = นิสัยที่ห้ามอยู่คู่กัน (ระบบเช็กทั้งสองทาง ใส่ฝั่งเดียวก็ได้)
  traits: [
    // --- 6 นิสัยตามสเปก ---
    {
      id: 'calm', name: 'ใจเย็น', icon: 'calm',
      desc: 'สติดี ไม่ตื่นตูมเวลาเจอซอมบี้ แต่คิดนานเกินไปเวลามีเรื่องด่วน',
      en: { name: 'Calm', desc: 'Keeps a cool head around zombies, but overthinks emergencies.' },
      mods: { zombieDamage: -10, emergencyFail: 10 },
      conflicts: ['coward', 'hothead'],
    },
    {
      id: 'coward', name: 'ขี้กลัว', icon: 'scared',
      desc: 'ได้ยินเสียงนิดเดียวก็หนีทัน แต่ใจเต้นแรงจนเครียดง่าย',
      en: { name: 'Cowardly', desc: 'Bolts at the slightest sound, but a racing heart makes stress build fast.' },
      mods: { nightDamage: -10, stressGain: 10 },
      conflicts: ['calm', 'optimist'],
    },
    {
      id: 'strong', name: 'ร่างกายแข็งแรง', icon: 'muscle',
      desc: 'ร่างกายทนทาน รับแผลได้มากกว่าคนอื่น แต่ก็หิวบ่อยกว่า',
      en: { name: 'Tough body', desc: 'Can take more punishment than most, but gets hungry more often.' },
      mods: { maxHp: 10, foodUse: 10 },
      conflicts: ['smallEater'],
    },
    {
      id: 'observant', name: 'นักสังเกต', icon: 'magnifier',
      desc: 'สายตาไว เจอของดีที่คนอื่นมองข้าม แต่สมองไม่หยุดคิดจนนอนไม่ค่อยหลับ',
      en: { name: 'Observant', desc: 'Spots good stuff others miss, but a restless mind makes sleep hard.' },
      mods: { lootLuck: 10, restRecovery: -10 },
      conflicts: ['deepSleeper'],
    },
    {
      id: 'kind', name: 'ใจดี', icon: 'kind_heart',
      desc: 'ผู้รอดชีวิตคนอื่นมักเป็นมิตรด้วย แต่ก็ถูกหลอกได้ง่าย',
      en: { name: 'Kind-hearted', desc: 'Other survivors tend to be friendly, but is easy to fool.' },
      mods: { survivorLuck: 10, scamRisk: 10 },
      conflicts: ['stingy'],
    },
    {
      id: 'stingy', name: 'ขี้เหนียว', icon: 'coin',
      desc: 'ยัดของได้มากกว่าคนอื่น แต่เสียดายจนทิ้งอะไรไม่ค่อยลง',
      en: { name: 'Stingy', desc: 'Crams in more stuff than anyone, but hates throwing anything away.' },
      mods: { slots: 1, discardStress: 5 },
      conflicts: ['kind'],
    },
    // --- นิสัยที่ออกแบบเพิ่ม (ลบทิ้งได้ถ้าไม่ต้องการ) ---
    {
      id: 'hothead', name: 'ใจร้อน', icon: 'fire',
      desc: 'ตัดสินใจไวเวลามีเรื่องด่วน แต่ชอบบุ่มบ่ามเข้าใส่ซอมบี้',
      en: { name: 'Hot-headed', desc: 'Decides fast in emergencies, but charges at zombies recklessly.' },
      mods: { emergencyFail: -10, zombieDamage: 10 },
      conflicts: ['calm'],
    },
    {
      id: 'deepSleeper', name: 'ขี้เซา', icon: 'sleepy',
      desc: 'หลับลึกจนฟื้นแรงได้เต็มที่ แต่ตื่นช้าเวลาซอมบี้บุก',
      en: { name: 'Heavy sleeper', desc: 'Sleeps deeply and recovers fully, but wakes up late when zombies attack.' },
      mods: { restRecovery: 10, nightDamage: 10 },
      conflicts: ['observant'],
    },
    {
      id: 'smallEater', name: 'กินน้อย', icon: 'rice_bowl',
      desc: 'กินนิดเดียวก็อยู่ได้ แต่ร่างกายบอบบางกว่าคนอื่น',
      en: { name: 'Light eater', desc: 'Gets by on very little food, but has a frailer body.' },
      mods: { foodUse: -10, maxHp: -10 },
      conflicts: ['strong'],
    },
    {
      id: 'optimist', name: 'มองโลกในแง่ดี', icon: 'sun_cloud',
      desc: 'คิดบวกจนเครียดยาก แต่ชอบคิดว่าของเสี่ยง ๆ ไม่เป็นไรหรอก',
      en: { name: 'Optimist', desc: 'Positive thinking keeps stress low, but assumes risky stuff will be fine.' },
      mods: { stressGain: -10, riskyChance: 10 },
      conflicts: ['coward'],
    },
  ],

  // ---------- กฎความสมดุลตอนสุ่มตัวละคร ----------
  // ถ้าชุดที่สุ่มได้ผิดกฎข้อใดข้อหนึ่ง ระบบจะสุ่มใหม่ให้อัตโนมัติ
  balance: {
    maxRollAttempts: 500, // สุ่มซ้ำได้สูงสุดกี่ครั้งต่อการกด 1 ครั้ง (กันวนไม่จบ)

    // กฎ 1: นิสัยที่ขัดกัน (ดูช่อง conflicts ของนิสัย) ห้ามอยู่ด้วยกัน

    // กฎ 2: ข้อเสียซ้อนกัน — แต่ละแหล่งที่มีข้อเสียในหมวดเดียวกัน (area ใน MOD_INFO) ได้คะแนนตามนี้
    //       ถ้าหมวดไหนคะแนนรวมเกิน maxWeaknessScore ถือว่าซ้อนเกินไป
    //       ผลคือ: นิสัย 2 อย่างมีจุดอ่อนหมวดเดียวกันไม่ได้ (2+2=4)
    //              อายุ + อาชีพ + นิสัย อ่อนหมวดเดียวกันพร้อมกันไม่ได้ (1+1+2=4)
    weaknessScore: { age: 1, occupation: 1, trait: 2 },
    maxWeaknessScore: 3,

    // กฎ 3: ค่าเริ่มต้นต้องไม่แย่เกินนี้ (min = ต่ำสุดที่ยอมได้, max = สูงสุดที่ยอมได้)
    startLimits: {
      maxHp:   { min: 85 },
      food:    { min: 60 },
      water:   { min: 60 },
      ammo:    { min: 5 },
      fatigue: { max: 30 },
      stress:  { max: 30 },
    },

    // กันพลาดชั้นสุดท้าย: ผลแบบ % ที่รวมกันแล้ว จะถูกจำกัดไม่ให้เกิน ±ค่านี้
    modPercentLimit: 30,
  },

  // ---------- ภาพประกอบช่วงของวัน ----------
  // ใส่ path รูปเมื่อมีรูปจริงแล้ว เช่น 'images/backgrounds/morning.png'
  // ปล่อยว่าง = เกมวาดภาพพิกเซลให้เอง
  sceneImages: {
    morning: '',
    night: '',
  },

  // ---------- ช่วงความยากตามวัน ----------
  //   nightAttack   = แรงบุกตอนกลางคืน [ต่ำสุด, สูงสุด] (สุ่มทุกคืน)
  //   specialChance = โอกาส % ที่คืนนั้นมีซอมบี้พิเศษ (ดู nightThreats ที่ special: true)
  //   ที่เหลือใช้กับภาพประกอบ (จำนวนซอมบี้/ความพังของเมือง)
  difficultyStages: [
    { id: 'early', fromDay: 1,  name: 'ช่วงต้น',  en: { name: 'Early' },  nightAttack: [3, 8],   specialChance: 0,  sceneZombies: [2, 4],   specialZombies: 0, boss: false, extraFires: 0 },
    { id: 'mid',   fromDay: 31, name: 'ช่วงกลาง', en: { name: 'Middle' }, nightAttack: [7, 14],  specialChance: 30, sceneZombies: [5, 8],   specialZombies: 2, boss: false, extraFires: 1 },
    { id: 'late',  fromDay: 71, name: 'ช่วงท้าย', en: { name: 'Late' },   nightAttack: [12, 20], specialChance: 0,  sceneZombies: [10, 16], specialZombies: 3, boss: true,  extraFires: 3 },
  ],

  // ---------- กลางคืน: ซอมบี้บุกที่พัก ----------
  // ความเสียหาย = แรงบุก − (ที่พัก + ของป้องกัน + พลังโจมตี)  แล้วลดด้วยหมวก (damageReduction)
  //              และปรับด้วยผลของตัวละคร (zombieDamage + nightDamage)
  night: {
    shelterBase: 2,                     // ที่พักกันได้เองทุกคืน (ความแข็งแรงของที่พัก)
    noiseAttack: 1,                     // เสียงปืน 1 หน่วย = แรงบุก +เท่านี้
    hordeNights: { from: 73, every: 5 }, // คลื่นซอมบี้ใหญ่: คืนที่ 73, 78, 83, … (ไม่ชนคืนบอส)
    bossNights: [80, 90, 100],          // คืนที่บอสบุก
    maxDamageReduction: 75,             // หมวกหลายใบรวมกันลดความเสียหายได้ไม่เกิน %
  },

  // ชนิดการบุก (ชื่อใช้บอกผู้เล่นตอนกลางคืน และเป็นสาเหตุการตาย)
  //   attackBonus = แรงบุกเพิ่มจากปกติ / special = สุ่มได้ในคืนที่มีซอมบี้พิเศษ
  nightThreats: [
    {
      id: 'wanderers', icon: 'zombie', attackBonus: 0,
      name: 'ซอมบี้เร่ร่อน', desc: 'ซอมบี้กลุ่มเล็กเดินตามกลิ่นมาเคาะประตูทั้งคืน',
      en: { name: 'Wandering zombies', desc: 'A small group follows your scent and pounds on the door all night.' },
    },
    {
      id: 'runner', icon: 'runner', attackBonus: 4, special: true,
      name: 'ซอมบี้วิ่งไว', desc: 'พุ่งเข้าหาเร็วจนแทบตั้งตัวไม่ทัน',
      en: { name: 'Runner', desc: 'Charges in so fast you barely have time to react.' },
    },
    {
      id: 'bloater', icon: 'germ', attackBonus: 4, special: true,
      name: 'ซอมบี้ตัวบวม', desc: 'ตัวพองใหญ่ ทิ้งน้ำหนักทั้งตัวกระแทกประตูจนสั่น',
      en: { name: 'Bloater', desc: 'A swollen hulk that throws its whole weight against the door.' },
    },
    {
      id: 'screamer', icon: 'screamer', attackBonus: 4, special: true,
      name: 'ซอมบี้กรีดร้อง', desc: 'เสียงกรีดร้องเรียกพวกมันมารุมจากทุกซอย',
      en: { name: 'Screamer', desc: 'Its shriek calls the others in from every alley.' },
    },
    {
      id: 'horde', icon: 'horde', attackBonus: 8,
      name: 'คลื่นซอมบี้ใหญ่', desc: 'ฝูงซอมบี้นับร้อยไหลมาตามถนนเหมือนน้ำป่า',
      en: { name: 'Zombie horde', desc: 'Hundreds of them pour down the street like a flash flood.' },
    },
    {
      id: 'boss', icon: 'ogre', attackBonus: 15,
      name: 'ซอมบี้ยักษ์', desc: 'ร่างสูงเกือบสามเมตร ทุบกำแพงทีเดียวก็ร้าว',
      en: { name: 'Hulking brute', desc: 'Nearly three meters tall. One blow cracks the wall.' },
    },
  ],

  // ---------- สรุปวัน (หลังผ่านกลางคืน) ----------
  // ค่าก่อนปรับด้วยผลของตัวละคร: foodUse/waterUse คูณอาหาร/น้ำที่ลด, restRecovery คูณการหายเหนื่อย
  //                              stressGain คูณความเครียดที่เพิ่ม
  dayEnd: {
    foodDrain: 12,         // อาหารลดต่อวัน
    waterDrain: 10,        // น้ำลดต่อวัน (เดิม 15 — ทดสอบแล้วน้ำในแผนที่มีไม่พอ จึงลดเหลือ 10)
    starveDamage: 10,      // อาหารเป็น 0 → พลังชีวิตลดเท่านี้ (อดอาหาร)
    thirstDamage: 15,      // น้ำเป็น 0 → พลังชีวิตลดเท่านี้ (ขาดน้ำ)
    regenHp: 3,            // อาหารและน้ำยังไม่หมด → พลังชีวิตฟื้นเอง
    restFatigue: 30,       // นอนหลับหายเหนื่อย
    restFatigueHurt: 15,   // คืนที่โดนทำร้าย หายเหนื่อยแค่นี้
    stressHurt: 8,         // คืนที่โดนทำร้าย เครียดเพิ่ม
    stressCalm: 5,         // คืนที่ไม่โดนทำร้าย เครียดลด
    exhaustedAt: 100,      // ความเหนื่อยถึงนี้ตอนกลางคืน → พลังชีวิตลด (เหนื่อยล้าเกินขีด)
    exhaustDamage: 10,
    stressedAt: 75,        // ความเครียดถึงนี้ → นอนหายเหนื่อยได้แค่ stressedRestFactor เท่า
    stressedRestFactor: 0.5,
  },

  // ---------- ข้อความปิดท้ายในหน้าสรุปตอนจบเกม ----------
  // died = ตาย: ใช้ข้อความของช่วงที่ fromDay มากที่สุดที่ไม่เกินวันที่ตาย (เรียง fromDay จากน้อยไปมาก)
  // won  = รอดครบทุกวัน
  endings: {
    died: [
      { fromDay: 1,  desc: 'โลกใหม่ไม่ให้เวลาใครตั้งตัว ยังไม่ทันจำทางกลับที่พักได้ ทุกอย่างก็จบลงแล้ว',
        en: { desc: 'The new world gives no one time to adjust. Before you even learned the way back to the shelter, it was over.' } },
      { fromDay: 4,  desc: 'ไม่กี่วันที่ผ่านมาพอให้รู้ว่าเมืองนี้ไม่เหลือใครแล้ว… และในที่สุดก็ไม่เหลือคุณด้วย',
        en: { desc: 'A few days were enough to learn that no one was left in this city… and in the end, that included you.' } },
      { fromDay: 16, desc: 'คุณเรียนรู้ที่จะฟังเสียงฝีเท้าในความมืด แต่คืนนั้นมันเงียบเกินกว่าจะได้ยินทัน',
        en: { desc: 'You learned to listen for footsteps in the dark. That night they were too quiet to hear in time.' } },
      { fromDay: 41, desc: 'ปฏิทินบนผนังมีรอยขีดมากกว่าช่องว่างแล้ว… แต่จะไม่มีใครขีดต่อจากนี้อีก',
        en: { desc: 'The calendar on the wall had more marks than blank days… but no one will add another.' } },
      { fromDay: 71, desc: 'วิทยุยังส่งเสียงแผ่ว ๆ ทุกเช้าว่าความช่วยเหลือใกล้มาถึง ใกล้มาก… แต่ไม่ใกล้พอ',
        en: { desc: 'Every morning the radio still crackled that help was close. Very close… just not close enough.' } },
      { fromDay: 95, desc: 'อีกไม่กี่วันเสียงใบพัดที่รอคอยคงดังขึ้นเหนือเมือง แต่จะไม่มีใครเหลืออยู่บนดาดฟ้าให้โบกมือ',
        en: { desc: 'In a few days the rotor blades will finally sound over the city, but no one will be left on the rooftop to wave.' } },
    ],
    won: {
      desc: 'รุ่งเช้า เสียงใบพัดเฮลิคอปเตอร์ดังขึ้นเหนือเมืองที่เงียบงัน คุณโบกมือจากดาดฟ้าด้วยแขนที่สั่นเทา มองเมืองที่เคยเป็นบ้านเป็นครั้งสุดท้าย คุณรอดแล้ว… แต่บางส่วนของคุณจะอยู่ที่นี่ตลอดไป',
      en: { desc: 'At dawn, rotor blades thundered over the silent city. You waved from the rooftop with shaking arms and looked at the city that used to be home one last time. You made it… but part of you will stay here forever.' },
    },
  },

  sceneNightZombieBonus: 50, // ภาพตอนกลางคืนมีซอมบี้มากกว่าตอนเช้ากี่ % (มีผลแค่ภาพ)

  // ---------- สภาพอากาศสุ่มรายวัน (ตอนนี้มีผลแค่ภาพ) ----------
  // แต่ละเกมสุ่มลำดับอากาศไม่เหมือนกัน (ใช้เลขสุ่มประจำเกมที่เก็บไว้ในเซฟ)
  // coversSky = เมฆบังดวงอาทิตย์/ดาว/พระจันทร์, birds: false = ไม่มีอีกาบิน
  weather: [
    { id: 'clear',  icon: 'sun', name: 'ฟ้าโปร่ง', en: { name: 'Clear' },    weight: 55 },
    { id: 'cloudy', icon: 'cloud', name: 'ฟ้าครึ้ม', en: { name: 'Overcast' }, weight: 20, coversSky: true },
    { id: 'rain',   icon: 'rain', name: 'ฝนตก',    en: { name: 'Rain' },     weight: 15, coversSky: true, birds: false },
    { id: 'fog',    icon: 'fog', name: 'หมอกลง',  en: { name: 'Fog' },      weight: 10 },
  ],

  // ---------- เพลงพื้นหลัง (แต่งและสร้างเสียงสดใน audio.js) ----------
  // เบราว์เซอร์ให้เริ่มเสียงได้หลังผู้เล่นคลิกครั้งแรก เพลงจึงเริ่มตอนนั้น (ปุ่มลำโพงมุมขวาบน)
  // แนวเพลง: หม่น ๆ เอาชีวิตรอดอยู่คนเดียว (คอร์ดไมเนอร์ช้า เปียโนห่าง ๆ เสียงลม)
  music: {
    enabledByDefault: true, // เปิดเกมครั้งแรกให้เพลงเปิดอยู่ (ผู้เล่นปิดแล้วเกมจะจำไว้)
    volume: 0.4,            // ความดังรวม 0-1
    bpm: 56,                // ความเร็วเพลง (จังหวะต่อนาที) ช้า ๆ ให้รู้สึกโดดเดี่ยว
  },

  // ---------- ภาพเปลี่ยนตามสภาพตัวละคร ----------
  sceneMood: {
    hurtBelowPercent: 30, // พลังชีวิตต่ำกว่า % นี้ของค่าสูงสุด → ขอบภาพแดงกะพริบ
    stressAbove: 60,      // ความเครียดเกินนี้ → ภาพสีหม่น
    fatigueAbove: 70,     // ความเหนื่อยเกินนี้ → ขอบบนล่างมืดเหมือนตาจะปิด
  },

  // ---------- ชุดตัวเลือกรูปลักษณ์ (สุ่มประกอบกัน) ----------
  // weight = โอกาสออก (ไม่ใส่ = 1) / ทรงผมหรือรูปร่างใหม่ต้องเพิ่มแผนที่พิกเซลใน sprites.js ด้วย
  appearance: {
    skinTones: [
      { id: 'fair',   name: 'ผิวขาว',       en: { name: 'Fair skin' },   color: '#f4d5bc' },
      { id: 'light',  name: 'ผิวขาวเหลือง',  en: { name: 'Light skin' },  color: '#e8c39e' },
      { id: 'medium', name: 'ผิวสองสี',     en: { name: 'Olive skin' },  color: '#d09f76' },
      { id: 'tan',    name: 'ผิวแทน',       en: { name: 'Tan skin' },    color: '#b07a52' },
      { id: 'deep',   name: 'ผิวเข้ม',      en: { name: 'Deep skin' },   color: '#86573a' },
    ],
    hairStyles: [
      { id: 'short',    name: 'ผมสั้นเรียบ', en: { name: 'short hair' },         genders: ['male', 'female'] },
      { id: 'buzz',     name: 'หัวเกรียน',   en: { name: 'buzz cut' },           genders: ['male'] },
      { id: 'spiky',    name: 'ผมตั้ง',      en: { name: 'spiky hair' },         genders: ['male'] },
      { id: 'bun',      name: 'มวยผม',      en: { name: 'bun' },                genders: ['male', 'female'] },
      { id: 'long',     name: 'ผมยาวตรง',   en: { name: 'long straight hair' }, genders: ['female'] },
      { id: 'ponytail', name: 'ผมหางม้า',   en: { name: 'ponytail' },           genders: ['female'] },
      { id: 'bob',      name: 'ผมบ็อบ',     en: { name: 'bob' },                genders: ['female'] },
    ],
    hairColors: [
      { id: 'black',  name: 'ดำ',           en: { name: 'black' },       color: '#1e1b1b', weight: 4 },
      { id: 'dark',   name: 'น้ำตาลเข้ม',    en: { name: 'dark brown' },  color: '#3e2a1f', weight: 3 },
      { id: 'brown',  name: 'น้ำตาลอ่อน',    en: { name: 'light brown' }, color: '#7b5235' },
      { id: 'blonde', name: 'ทอง',          en: { name: 'blonde' },      color: '#c9a45c' },
      { id: 'red',    name: 'แดงเบอร์กันดี',  en: { name: 'burgundy' },    color: '#7e2b2e' },
      { id: 'ash',    name: 'เทาควันบุหรี่',   en: { name: 'ash gray' },    color: '#8d8a86' },
    ],
    bodyTypes: [
      { id: 'thin',   name: 'ผอม',  en: { name: 'Thin' } },
      { id: 'normal', name: 'ปกติ', en: { name: 'Average' } },
      { id: 'stocky', name: 'ล่ำ',  en: { name: 'Stocky' } },
    ],
    shirtColors: [
      { id: 'red',     name: 'แดง',           en: { name: 'Red' },         color: '#a8383a' },
      { id: 'blue',    name: 'น้ำเงิน',        en: { name: 'Blue' },        color: '#2f5a96' },
      { id: 'olive',   name: 'เขียวขี้ม้า',     en: { name: 'Olive green' }, color: '#5b6a37' },
      { id: 'mustard', name: 'เหลืองมัสตาร์ด',  en: { name: 'Mustard' },     color: '#c3962c' },
      { id: 'gray',    name: 'เทา',           en: { name: 'Gray' },        color: '#6a6e75' },
      { id: 'white',   name: 'ขาวหม่น',        en: { name: 'Off-white' },   color: '#d6d0c2' },
      { id: 'black',   name: 'ดำ',            en: { name: 'Black' },       color: '#2b2b30' },
      { id: 'orange',  name: 'ส้ม',           en: { name: 'Orange' },      color: '#c4632c' },
      { id: 'purple',  name: 'ม่วง',          en: { name: 'Purple' },      color: '#68478a' },
      { id: 'sky',     name: 'ฟ้า',           en: { name: 'Sky blue' },    color: '#5a9cc4' },
    ],
    // ของประกอบที่สุ่มได้ ('none' = ไม่มี / weight ของ 'none' ยิ่งสูง ของประกอบยิ่งออกน้อย)
    glasses: [
      { id: 'none',    name: '',        en: { name: '' },        weight: 4 },
      { id: 'glasses', name: 'ใส่แว่น', en: { name: 'Glasses' }, weight: 1 },
    ],
    // หนวดเครา (เฉพาะผู้ชาย) ภาพอยู่ใน sprites.js (PORTRAIT_FACIAL_HAIR)
    facialHair: [
      { id: 'none',    name: '',            en: { name: '' },           genders: ['male', 'female'], weight: 3 },
      { id: 'stubble', name: 'หนวดเคราบาง', en: { name: 'Stubble' },    genders: ['male'] },
      { id: 'beard',   name: 'เคราเต็มหน้า', en: { name: 'Full beard' }, genders: ['male'] },
    ],
    pantsColor: '#39414f',
    shoeColor: '#2a211a',
    eyeColor: '#161414',
  },
};

// ============================================================
//  ความหมายของผลแต่ละชนิด (ใช้ในช่อง mods ของอายุ/อาชีพ/นิสัย)
//    unit   : '' = บวก/ลบตรง ๆ, '%' = เปอร์เซ็นต์
//    better : 'up' = ยิ่งมากยิ่งดี, 'down' = ยิ่งน้อยยิ่งดี
//    area   : หมวดของจุดอ่อน ใช้เช็ก "ข้อเสียซ้อนกัน" ตอนสุ่มตัวละคร
//  หมายเหตุ: กลุ่ม "เหตุการณ์" จะเริ่มมีผลในขั้นที่ 5 กลุ่มอื่นมีผลแล้ว
// ============================================================
const MOD_INFO = {
  // --- ค่าเริ่มต้น (ขั้นที่ 1) ---
  maxHp:         { name: 'พลังชีวิตสูงสุด',           en: { name: 'Max health' },                unit: '',  better: 'up',   area: 'hp' },
  food:          { name: 'อาหารเริ่มต้น',             en: { name: 'Starting food' },             unit: '',  better: 'up',   area: 'food' },
  water:         { name: 'น้ำเริ่มต้น',                en: { name: 'Starting water' },            unit: '',  better: 'up',   area: 'water' },
  ammo:          { name: 'กระสุนเริ่มต้น',            en: { name: 'Starting ammo' },             unit: '',  better: 'up',   area: 'ammo' },
  fatigue:       { name: 'ความเหนื่อยเริ่มต้น',        en: { name: 'Starting fatigue' },          unit: '',  better: 'down', area: 'fatigue' },
  stress:        { name: 'ความเครียดเริ่มต้น',         en: { name: 'Starting stress' },           unit: '',  better: 'down', area: 'stress' },
  slots:         { name: 'ช่องเก็บของ',               en: { name: 'Bag slots' },                 unit: '',  better: 'up',   area: 'inventory' },
  // --- อัตราต่อวัน (สรุปวัน) ---
  foodUse:       { name: 'อาหารที่ใช้ต่อวัน',           en: { name: 'Daily food use' },            unit: '%', better: 'down', area: 'food' },
  waterUse:      { name: 'น้ำที่ใช้ต่อวัน',             en: { name: 'Daily water use' },           unit: '%', better: 'down', area: 'water' },
  fatigueGain:   { name: 'ความเหนื่อยที่เพิ่มขึ้น',      en: { name: 'Fatigue gain' },              unit: '%', better: 'down', area: 'fatigue' },
  restRecovery:  { name: 'การฟื้นความเหนื่อยตอนนอน',   en: { name: 'Rest recovery' },             unit: '%', better: 'up',   area: 'fatigue' },
  stressGain:    { name: 'ความเครียดที่เพิ่มขึ้น',       en: { name: 'Stress gain' },               unit: '%', better: 'down', area: 'stress' },
  // --- การต่อสู้กลางคืน ---
  nightDamage:   { name: 'ความเสียหายตอนกลางคืน',     en: { name: 'Night damage taken' },        unit: '%', better: 'down', area: 'damage' },
  zombieDamage:  { name: 'ความเสียหายจากซอมบี้',      en: { name: 'Zombie damage taken' },       unit: '%', better: 'down', area: 'damage' },
  ammoPower:     { name: 'ความแม่นในการยิง',          en: { name: 'Shooting accuracy' },         unit: '%', better: 'up',   area: 'ammo' },
  defensePower:  { name: 'ผลของของป้องกัน/ซ่อมที่พัก',  en: { name: 'Defense & repair effect' },   unit: '%', better: 'up',   area: 'defense' },
  // --- ของ (ขั้นที่ 2) ---
  lootLuck:      { name: 'โอกาสเจอของหายาก',          en: { name: 'Rare item chance' },          unit: '%', better: 'up',   area: 'loot' },
  riskyChance:   { name: 'โอกาสของเสี่ยงให้ผลร้าย',     en: { name: 'Risky item backfire chance' }, unit: '%', better: 'down', area: 'loot' },
  healPower:     { name: 'ผลการรักษาของยา',            en: { name: 'Healing effect' },            unit: '%', better: 'up',   area: 'heal' },
  foodPower:     { name: 'ค่าที่ได้จากเสบียงอาหาร',      en: { name: 'Food item value' },           unit: '%', better: 'up',   area: 'food' },
  discardStress: { name: 'ความเครียดทุกครั้งที่ทิ้งของ',  en: { name: 'Stress per discarded item' }, unit: '',  better: 'down', area: 'inventory' },
  // --- เหตุการณ์ (ขั้นที่ 5) ---
  survivorLuck:  { name: 'โอกาสผู้รอดชีวิตเป็นมิตร',    en: { name: 'Friendly survivor chance' },  unit: '%', better: 'up',   area: 'social' },
  scamRisk:      { name: 'โอกาสถูกหลอก',              en: { name: 'Chance of being scammed' },   unit: '%', better: 'down', area: 'social' },
  emergencyFail: { name: 'โอกาสพลาดในเหตุฉุกเฉิน',     en: { name: 'Emergency failure chance' },  unit: '%', better: 'down', area: 'emergency' },
};

// ชื่อหมวดจุดอ่อน (ใช้ในข้อความตรวจสมดุลใน Console)
const AREA_NAMES = {
  hp: 'พลังชีวิต',
  food: 'อาหาร',
  water: 'น้ำ',
  ammo: 'กระสุน',
  fatigue: 'ความเหนื่อย',
  stress: 'ความเครียด',
  damage: 'การรับความเสียหาย',
  defense: 'การป้องกัน',
  loot: 'การหาของ',
  heal: 'การรักษา',
  inventory: 'การเก็บของ',
  social: 'การเจอผู้รอดชีวิต',
  emergency: 'เหตุฉุกเฉิน',
};
