// ============================================================
//  events.js — อีเวนต์ระหว่างวัน (เกิดหลังจบช่วงเช้า ก่อนกลางคืน)
//  โอกาสเกิดต่อวันอยู่ที่ eventChance ใน CONFIG.difficultyStages, ตั้งค่าอื่นอยู่ที่ CONFIG.events
//
//  ช่องของอีเวนต์
//    id, type (ประเภทใน EVENT_TYPES), icon (ไอคอนพิกเซลใน icons.js), weight (ยิ่งมากยิ่งออกบ่อย)
//    weather  = เกิดเฉพาะวันที่อากาศเป็นแบบนี้ (ไม่ใส่ = ทุกอากาศ)
//    name, desc (+ en) — desc ใส่ {daysLeft} ได้ = อีกกี่วันหน่วยกู้ภัยจะมา
//    choices  = ทางเลือก 2-3 ทาง
//
//  ช่องของทางเลือก
//    label (+ en)  ข้อความบนปุ่ม
//    cost          ผลที่เกิดทันทีเมื่อเลือก เช่น { food: -15 } (ค่าที่ต้องจ่ายต้องมีพอ ไม่งั้นเลือกไม่ได้)
//    give          ต้องยกของชิ้นใดชิ้นหนึ่งในรายการให้ เช่น ['bandage', 'first_aid']
//    requires      'weapon' = ต้องมีอาวุธในกระเป๋า / 'gun' = ต้องมีปืนในกระเป๋า
//    check+chance  ต้องลุ้น: chance = % สำเร็จพื้นฐาน, check = นิสัยที่มีผล
//                    friendly  = +โอกาสผู้รอดชีวิตเป็นมิตร   scam = −โอกาสถูกหลอก
//                    emergency = −โอกาสพลาดในเหตุฉุกเฉิน      luck = +โอกาสเจอของหายาก
//    success       ผลเมื่อสำเร็จ (ทางที่ไม่ต้องลุ้นใช้ผลนี้เสมอ)
//    fail          ผลเมื่อพลาด (ต้องมีถ้ามี check)
//
//  ช่องของผล: effects (ค่าสถานะ), items (ได้ของตาม id), randomItems (สุ่มของ n ชิ้น),
//             loseItems (เสียของในกระเป๋าแบบสุ่ม n ชิ้น), text (+ en) คำบรรยาย
//  ความแรงระดับ "กลาง": ค่าสถานะ ±10-25, เสียของ 1-2 ชิ้น, พลังชีวิตลดได้ไม่เกิน 20 ต่อครั้ง
// ============================================================

const EVENT_TYPES = {
  survivor:  { name: 'ผู้รอดชีวิต', en: { name: 'Survivors' } },
  emergency: { name: 'เหตุฉุกเฉิน', en: { name: 'Emergency' } },
  discovery: { name: 'ค้นพบ',       en: { name: 'Discovery' } },
  story:     { name: 'เรื่องเล่า',  en: { name: 'Story' } },
};

const EVENTS = [
  // ---------- ผู้รอดชีวิต ----------
  {
    id: 'stranger_trade', type: 'survivor', icon: 'stranger', weight: 10,
    name: 'คนแปลกหน้าขอแลกของ',
    desc: 'ชายผอมโซสะพายเป้ใบใหญ่โบกมือจากอีกฝั่งถนน เขาบอกว่ามีของจะแลก ถ้าคุณมีอาหารหรือน้ำ',
    en: { name: 'A stranger wants to trade', desc: 'A gaunt man with a huge backpack waves from across the street. He has things to trade, if you have food or water.' },
    choices: [
      {
        label: 'เอาอาหารแลกกระสุน', en: { label: 'Trade food for ammo' },
        cost: { food: -15 }, requires: 'gun', check: 'scam', chance: 70, // ไม่มีปืน แลกมาก็ไม่ได้ใช้
        success: { effects: { ammo: 8 }, text: 'เขานับกระสุนใส่มือคุณครบทุกนัด', en: { text: 'He counts every round into your hand.' } },
        fail: { effects: { stress: 10 }, text: 'กล่องที่ได้มามีแต่ปลอกกระสุนเปล่า และเขาหายไปแล้ว', en: { text: 'The box holds only empty casings, and he is already gone.' } },
      },
      {
        label: 'เอาน้ำแลกผ้าพันแผล', en: { label: 'Trade water for bandages' },
        cost: { water: -15 }, check: 'scam', chance: 70,
        success: { items: ['bandage'], text: 'ผ้าพันแผลยังอยู่ในซองสะอาด', en: { text: 'The bandages are still sealed and clean.' } },
        fail: { effects: { stress: 10 }, text: 'ในห่อมีแต่เศษผ้าขี้ริ้ว', en: { text: 'The package holds nothing but rags.' } },
      },
      {
        label: 'ส่ายหัวแล้วเดินจากไป', en: { label: 'Shake your head and walk away' },
        success: { text: 'คุณไม่เสี่ยง และไม่ได้อะไรกลับมา', en: { text: 'No risk taken, nothing gained.' } },
      },
    ],
  },
  {
    id: 'injured_survivor', type: 'survivor', icon: 'blood', weight: 9,
    name: 'ผู้รอดชีวิตบาดเจ็บ',
    desc: 'หญิงสาวคนหนึ่งนั่งพิงกำแพง ขาของเธอเลือดออกไม่หยุด เธอขอความช่วยเหลือด้วยเสียงแหบแห้ง',
    en: { name: 'An injured survivor', desc: 'A young woman slumps against a wall, her leg bleeding badly. She begs for help in a hoarse voice.' },
    choices: [
      {
        label: 'ให้ผ้าพันแผลหรือชุดปฐมพยาบาล', en: { label: 'Give her bandages or a first aid kit' },
        give: ['bandage', 'first_aid'], check: 'friendly', chance: 60,
        success: { items: ['canned_fish', 'water_bottle'], effects: { stress: -10 }, text: 'เธอขอบคุณ แล้วแบ่งเสบียงที่ซ่อนไว้ให้', en: { text: 'She thanks you and shares the supplies she had hidden.' } },
        fail: { effects: { stress: -10 }, text: 'เธอเดินกะเผลกจากไปโดยไม่มีอะไรตอบแทน แต่ใจคุณเบาลง', en: { text: 'She limps away with nothing to give back, but your heart feels lighter.' } },
      },
      {
        label: 'แบ่งอาหารให้', en: { label: 'Share some food' },
        cost: { food: -15 }, check: 'friendly', chance: 50,
        success: { effects: { ammo: 6, stress: -10 }, text: 'เธอยื่นกระสุนที่เหลือให้ บอกว่าตัวเองยิงปืนไม่เป็น', en: { text: "She hands over her spare ammo, saying she can't shoot anyway." } },
        fail: { effects: { stress: -5 }, text: 'เธอกินอย่างหิวโหย แล้วหลับไปพิงกำแพง', en: { text: 'She eats hungrily, then falls asleep against the wall.' } },
      },
      {
        label: 'ทำเป็นไม่เห็น', en: { label: 'Pretend not to see her' },
        success: { effects: { stress: 15 }, text: 'เสียงเรียกของเธอยังดังอยู่ในหัวไปทั้งบ่าย', en: { text: 'Her voice keeps echoing in your head all afternoon.' } },
      },
    ],
  },
  {
    id: 'bandits', type: 'survivor', icon: 'bandit', weight: 8,
    name: 'โจรดักปล้น',
    desc: 'ชายสามคนถือไม้เบสบอลยืนขวางทางกลับที่พัก เรียกเก็บค่าผ่านทาง',
    en: { name: 'Bandits on the road', desc: 'Three men with baseball bats block the way back to your shelter and demand a toll.' },
    choices: [
      {
        label: 'ยอมให้ของไปหนึ่งชิ้น', en: { label: 'Hand over one item' },
        success: { loseItems: 1, effects: { stress: 5 }, text: 'พวกมันคว้าของไปแล้วหัวเราะใส่', en: { text: 'They grab something and laugh in your face.' } },
      },
      {
        label: 'พูดคุยต่อรอง', en: { label: 'Try to talk your way out' },
        check: 'friendly', chance: 45,
        success: { effects: { stress: -5 }, text: 'คุณเล่าเรื่องตลกร้ายจนพวกมันหัวเราะ แล้วปล่อยให้ผ่านไป', en: { text: 'Your dark joke makes them laugh, and they let you pass.' } },
        fail: { loseItems: 2, effects: { stress: 10 }, text: 'พวกมันไม่ฟัง แถมเอาของไปสองชิ้น', en: { text: 'They will not listen, and take two things instead.' } },
      },
      {
        label: 'สู้กับพวกมัน', en: { label: 'Fight them' },
        requires: 'weapon', check: 'emergency', chance: 60,
        success: { effects: { ammo: 6, stress: 5 }, text: 'พวกมันวิ่งหนี ทิ้งกระสุนไว้ข้างทาง', en: { text: 'They run off, leaving some ammo behind.' } },
        fail: { effects: { hp: -20, stress: 10 }, text: 'คุณโดนไม้ฟาดจนล้ม แต่ยังลากตัวกลับมาได้', en: { text: 'A bat knocks you down, but you drag yourself home.' } },
      },
    ],
  },
  {
    id: 'radio_call', type: 'survivor', icon: 'radio', weight: 8,
    name: 'เสียงเรียกจากวิทยุสื่อสาร',
    desc: 'วิทยุสื่อสารที่เก็บได้มีเสียงผู้ชายพูดว่า มีเสบียงซ่อนอยู่ใต้เคาน์เตอร์ร้านสะดวกซื้อหัวมุม',
    en: { name: 'A voice on the radio', desc: 'A man on the walkie-talkie says supplies are hidden under the counter of the corner store.' },
    choices: [
      {
        label: 'ไปตามที่เขาบอก', en: { label: 'Go where he says' },
        cost: { fatigue: 15 }, check: 'scam', chance: 60,
        success: { effects: { food: 20, water: 20 }, text: 'ใต้เคาน์เตอร์มีอาหารกับน้ำจริง ๆ', en: { text: 'There really is food and water under the counter.' } },
        fail: { effects: { hp: -15, stress: 10 }, text: 'มันคือกับดัก มีคนซุ่มอยู่ คุณหนีออกมาได้พร้อมแผล', en: { text: 'It was a trap. Someone was waiting, and you escape wounded.' } },
      },
      {
        label: 'ไม่ไว้ใจ ปิดวิทยุ', en: { label: 'Trust no one, switch it off' },
        success: { text: 'คุณปิดวิทยุ เมืองกลับมาเงียบเหมือนเดิม', en: { text: 'You switch it off. The city falls silent again.' } },
      },
    ],
  },

  // ---------- เหตุฉุกเฉิน ----------
  {
    id: 'shelter_fire', type: 'emergency', icon: 'fire', weight: 8,
    name: 'ไฟไหม้ในที่พัก',
    desc: 'เทียนล้มใส่กองผ้าห่ม ไฟลุกขึ้นอย่างรวดเร็ว ควันเริ่มเต็มห้อง',
    en: { name: 'Fire in the shelter', desc: 'A candle tips onto a pile of blankets. Flames spread fast and smoke fills the room.' },
    choices: [
      {
        label: 'ราดน้ำดับไฟ', en: { label: 'Douse it with water' },
        cost: { water: -20 }, check: 'emergency', chance: 75,
        success: { text: 'ไฟดับทัน ของทุกอย่างปลอดภัย', en: { text: 'The fire is out in time. Everything is safe.' } },
        fail: { loseItems: 1, effects: { hp: -10 }, text: 'ไฟดับ แต่ของไหม้ไปหนึ่งชิ้น และมือคุณพองเป็นแผล', en: { text: 'The fire goes out, but one item burns and your hands blister.' } },
      },
      {
        label: 'คว้าของแล้ววิ่งออกไป', en: { label: 'Grab your things and run' },
        check: 'emergency', chance: 65,
        success: { loseItems: 1, text: 'คุณคว้าของออกมาได้เกือบหมด เหลือในกองไฟแค่ชิ้นเดียว', en: { text: 'You save almost everything. Only one item is left to the flames.' } },
        fail: { loseItems: 2, effects: { hp: -10 }, text: 'ควันหนาจนมองไม่เห็น ของหายไปสองชิ้น', en: { text: 'The smoke is blinding. Two items are lost.' } },
      },
    ],
  },
  {
    id: 'storm_leak', type: 'emergency', icon: 'storm', weight: 12, weather: ['rain', 'cloudy'],
    name: 'พายุพัดหลังคาเปิด',
    desc: 'ลมแรงพัดแผ่นหลังคาที่พักเปิดออก น้ำฝนเริ่มไหลลงมาใส่กองของ',
    en: { name: 'The storm rips the roof', desc: 'Strong wind tears open the shelter roof, and rain pours onto your things.' },
    choices: [
      {
        label: 'ปีนขึ้นไปซ่อมทันที', en: { label: 'Climb up and fix it now' },
        cost: { fatigue: 20 }, check: 'emergency', chance: 70,
        success: { text: 'คุณซ่อมเสร็จก่อนของจะเปียก', en: { text: 'You patch it before anything gets soaked.' } },
        fail: { loseItems: 1, effects: { hp: -10 }, text: 'คุณลื่นตกลงมา และของชิ้นหนึ่งเปียกจนใช้ไม่ได้', en: { text: 'You slip and fall, and one item is ruined by water.' } },
      },
      {
        label: 'เอาถังมารองน้ำฝนไว้', en: { label: 'Set out buckets for the rain' },
        success: { effects: { water: 20, stress: 10 }, loseItems: 1, text: 'ได้น้ำมาเต็มถัง แต่ของชิ้นหนึ่งพังเพราะน้ำ', en: { text: 'The buckets fill up, but one item is ruined by the water.' } },
      },
    ],
  },
  {
    id: 'daytime_zombies', type: 'emergency', icon: 'zombie', weight: 10,
    name: 'ซอมบี้โผล่กลางวัน',
    desc: 'ซอมบี้สามตัวเดินโซเซเข้ามาใกล้ที่พักกลางวันแสก ๆ',
    en: { name: 'Zombies in broad daylight', desc: 'Three zombies stagger toward your shelter in broad daylight.' },
    choices: [
      {
        label: 'ออกไปจัดการ', en: { label: 'Go out and deal with them' },
        requires: 'weapon', check: 'emergency', chance: 65,
        success: { effects: { stress: -10 }, text: 'คุณจัดการได้ทั้งสามตัว รู้สึกว่ายังควบคุมสถานการณ์ได้', en: { text: 'You take down all three and feel back in control.' } },
        fail: { effects: { hp: -20, stress: 10 }, text: 'ตัวหนึ่งกัดแขนคุณก่อนจะล้มลง', en: { text: 'One of them bites your arm before it goes down.' } },
      },
      {
        label: 'ซ่อนตัวเงียบ ๆ', en: { label: 'Hide and stay quiet' },
        check: 'emergency', chance: 70,
        success: { text: 'พวกมันเดินผ่านไปโดยไม่สังเกต', en: { text: 'They shuffle past without noticing you.' } },
        fail: { effects: { hp: -10, stress: 15 }, text: 'ตัวหนึ่งได้กลิ่น คุณต้องดิ้นรนหนีจนบาดเจ็บ', en: { text: 'One catches your scent, and you get hurt fighting free.' } },
      },
      {
        label: 'หนีไปหลบอีกฝั่ง', en: { label: 'Flee to the other side' },
        success: { effects: { fatigue: 20 }, loseItems: 1, text: 'คุณวิ่งหนีจนหอบ และทำของหล่นไปหนึ่งชิ้น', en: { text: 'You run until you are gasping, and drop one item on the way.' } },
      },
    ],
  },
  {
    id: 'fever', type: 'emergency', icon: 'thermometer', weight: 8,
    name: 'ไข้ขึ้นสูง',
    desc: 'ตัวร้อนจี๋ หัวหนักตั้งแต่บ่าย ร่างกายสั่นเทาทั้งที่อากาศไม่หนาว',
    en: { name: 'A high fever', desc: 'You are burning up and shivering, even though it is not cold.' },
    choices: [
      {
        label: 'ใช้ชุดปฐมพยาบาลหรือผ้าพันแผล', en: { label: 'Use a first aid kit or bandages' },
        give: ['first_aid', 'bandage'],
        success: { effects: { stress: -5 }, text: 'ยาในกล่องช่วยให้ไข้ลดลง', en: { text: 'The medicine brings the fever down.' } },
      },
      {
        label: 'นอนพักให้เหงื่อออก', en: { label: 'Sweat it out in bed' },
        check: 'emergency', chance: 60,
        success: { effects: { hp: -5, fatigue: -10 }, text: 'ไข้ค่อย ๆ ลดลงหลังหลับไปหลายชั่วโมง', en: { text: 'The fever breaks after hours of sleep.' } },
        fail: { effects: { hp: -20, stress: 10 }, text: 'ไข้ขึ้นสูงจนเพ้อ ร่างกายทรุดหนัก', en: { text: 'The fever spikes until you are delirious.' } },
      },
      {
        label: 'กินให้อิ่มเพื่อบำรุงร่างกาย', en: { label: 'Eat well to build strength' },
        cost: { food: -20 },
        success: { effects: { hp: -5 }, text: 'อาหารช่วยให้มีแรงสู้กับไข้', en: { text: 'The food gives you strength to fight it off.' } },
      },
    ],
  },

  // ---------- ค้นพบ ----------
  {
    id: 'supply_cache', type: 'discovery', icon: 'crate', weight: 9,
    name: 'ห้องใต้ดินที่ถูกล็อก',
    desc: 'ประตูห้องใต้ดินของร้านค้าถูกล็อกด้วยโซ่หนา ข้างในอาจมีของที่ยังไม่มีใครแตะ',
    en: { name: 'A locked cellar', desc: 'A store cellar is chained shut. Something untouched might still be inside.' },
    choices: [
      {
        label: 'งัดโซ่เข้าไป', en: { label: 'Break the chain' },
        cost: { fatigue: 15 }, check: 'luck', chance: 65,
        success: { randomItems: 2, text: 'ข้างในมีของที่ยังใช้ได้', en: { text: 'There are still useful things inside.' } },
        fail: { effects: { hp: -10, stress: 10 }, text: 'ซอมบี้ที่ติดอยู่ข้างในพุ่งออกมา คุณหนีออกมาได้พร้อมรอยข่วน', en: { text: 'A zombie trapped inside lunges out. You escape with scratches.' } },
      },
      {
        label: 'ไม่เสี่ยง เดินผ่านไป', en: { label: 'Not worth it, walk on' },
        success: { text: 'คุณเดินผ่านไป เสียงโซ่ยังกระทบกันเบา ๆ อยู่ข้างหลัง', en: { text: 'You walk on, the chain still clinking softly behind you.' } },
      },
    ],
  },
  {
    id: 'pharmacy', type: 'discovery', icon: 'first_aid', weight: 8,
    name: 'ร้านขายยาร้าง',
    desc: 'ร้านขายยาประตูกระจกแตก ชั้นวางยาล้มระเนระนาด',
    en: { name: 'An abandoned pharmacy', desc: 'The glass door is shattered and the medicine shelves are knocked over.' },
    choices: [
      {
        label: 'ค้นตู้ยาด้านหลัง', en: { label: 'Search the back cabinets' },
        check: 'luck', chance: 60,
        success: { items: ['first_aid'], text: 'เจอชุดปฐมพยาบาลที่ยังไม่เปิดใช้', en: { text: 'You find an unopened first aid kit.' } },
        fail: { items: ['mystery_pills'], text: 'เจอแค่ขวดยาไม่มีฉลาก', en: { text: 'All you find is an unlabeled bottle of pills.' } },
      },
      {
        label: 'หยิบแค่ของที่หล่นอยู่หน้าร้าน', en: { label: 'Just take what lies by the door' },
        success: { items: ['bandage'], text: 'ได้ผ้าพันแผลมาหนึ่งม้วน', en: { text: 'You pick up a roll of bandages.' } },
      },
    ],
  },
  {
    id: 'rain_collect', type: 'discovery', icon: 'rain', weight: 14, weather: ['rain'],
    name: 'ฝนตกหนักทั้งบ่าย',
    desc: 'เสียงฝนกลบเสียงซอมบี้ เมืองเงียบลงชั่วคราว',
    en: { name: 'Heavy afternoon rain', desc: 'The rain drowns out the zombies. For a while, the city goes quiet.' },
    choices: [
      {
        label: 'รองน้ำฝนเก็บไว้', en: { label: 'Collect rainwater' },
        success: { effects: { water: 25 }, text: 'ถังทุกใบเต็มไปด้วยน้ำฝน', en: { text: 'Every container fills with rainwater.' } },
      },
      {
        label: 'นั่งฟังเสียงฝนพักใจ', en: { label: 'Sit and listen to the rain' },
        success: { effects: { stress: -15, fatigue: -10 }, text: 'เป็นครั้งแรกในรอบหลายวันที่ใจสงบ', en: { text: 'For the first time in days, your mind is calm.' } },
      },
    ],
  },
  {
    id: 'vending_machine', type: 'discovery', icon: 'vending', weight: 9,
    name: 'ตู้กดน้ำหน้าโรงเรียน',
    desc: 'ตู้กดน้ำหน้าโรงเรียนยังมีกระป๋องเหลืออยู่ข้างใน',
    en: { name: 'A vending machine', desc: 'The vending machine outside the school still has cans inside.' },
    choices: [
      {
        label: 'ทุบกระจกเอาออกมา', en: { label: 'Smash the glass' },
        check: 'luck', chance: 70,
        success: { effects: { water: 20, food: 10 }, text: 'ได้เครื่องดื่มกับขนมมาเต็มกระเป๋า', en: { text: 'You fill your pockets with drinks and snacks.' } },
        fail: { effects: { hp: -10, stress: 5 }, text: 'เสียงดังเรียกซอมบี้มา คุณหนีออกมามือเปล่าพร้อมแผล', en: { text: 'The noise draws zombies. You flee empty-handed and hurt.' } },
      },
      {
        label: 'ค่อย ๆ งัดอย่างเงียบ ๆ', en: { label: 'Pry it open quietly' },
        cost: { fatigue: 10 },
        success: { effects: { water: 10 }, text: 'งัดได้ไม่กี่กระป๋อง แต่ไม่มีอะไรตามมา', en: { text: 'Only a few cans, but nothing follows you.' } },
      },
    ],
  },

  // ---------- เรื่องเล่า ----------
  {
    id: 'radio_news', type: 'story', icon: 'radio', weight: 8,
    name: 'ประกาศจากวิทยุ',
    desc: 'วิทยุส่งเสียงซ่าแล้วมีประกาศจากหน่วยกู้ภัย: "ยังอยู่ระหว่างทาง โปรดอดทนอีก {daysLeft} วัน"',
    en: { name: 'A radio broadcast', desc: 'Through the static, the rescue team announces: "We are on our way. Hold on for {daysLeft} more days."' },
    choices: [
      {
        label: 'ฟังจนจบ แล้วขีดปฏิทิน', en: { label: 'Listen to the end and mark the calendar' },
        success: { effects: { stress: -15 }, text: 'อีกไม่นาน... คุณพูดกับตัวเองซ้ำ ๆ', en: { text: 'Not long now... you keep telling yourself.' } },
      },
      {
        label: 'เปิดฟังเพลงเก่าต่อ แล้วงีบ', en: { label: 'Play old songs and take a nap' },
        success: { effects: { stress: -10, fatigue: -10 }, text: 'เพลงเก่าพาคุณกลับไปในวันที่โลกยังปกติ', en: { text: 'The old songs take you back to when the world was normal.' } },
      },
    ],
  },
  {
    id: 'old_photo', type: 'story', icon: 'photo', weight: 7,
    name: 'รูปครอบครัวในบ้านร้าง',
    desc: 'บนโต๊ะในบ้านร้างหลังหนึ่ง มีรูปครอบครัวที่ยิ้มแย้มวางอยู่ ฝุ่นจับหนา',
    en: { name: 'A family photo', desc: 'In an abandoned house, a dusty photo of a smiling family sits on the table.' },
    choices: [
      {
        label: 'เก็บรูปไว้เป็นกำลังใจ', en: { label: 'Keep the photo for comfort' },
        success: { effects: { stress: -10 }, text: 'อย่างน้อยก็เคยมีคนมีความสุขอยู่ที่นี่', en: { text: 'At least someone was happy here once.' } },
      },
      {
        label: 'คว่ำรูปลง แล้วค้นบ้านต่อ', en: { label: 'Turn it face down and search the house' },
        success: { randomItems: 1, effects: { stress: 10 }, text: 'คุณได้ของมา แต่ใบหน้าในรูปยังติดตา', en: { text: 'You find something, but the faces in the photo stay with you.' } },
      },
    ],
  },
  {
    id: 'diary', type: 'story', icon: 'book', weight: 7,
    name: 'สมุดบันทึกของคนก่อน',
    desc: 'สมุดบันทึกเปื้อนเลือดของผู้รอดชีวิตคนก่อน หน้าสุดท้ายเขียนถึงที่ซ่อนเสบียง',
    en: { name: "A survivor's diary", desc: 'A bloodstained diary. The last page mentions a hidden stash.' },
    choices: [
      {
        label: 'ตามหาที่ซ่อนตามบันทึก', en: { label: 'Look for the hidden stash' },
        cost: { fatigue: 15 }, check: 'luck', chance: 55,
        success: { randomItems: 2, effects: { stress: 5 }, text: 'เจอของที่เขาซ่อนไว้ แต่เขาไม่เคยกลับมาเอามันอีกเลย', en: { text: 'You find his stash. He never came back for it.' } },
        fail: { effects: { stress: 15 }, text: 'ที่ซ่อนว่างเปล่า มีเพียงรองเท้าข้างเดียวของเขา', en: { text: 'The hiding place is empty except for one of his shoes.' } },
      },
      {
        label: 'ปิดสมุดแล้ววางไว้ที่เดิม', en: { label: 'Close it and leave it be' },
        success: { effects: { stress: 5 }, text: 'บางเรื่องก็ไม่อยากรู้ตอนจบ', en: { text: 'Some stories you would rather not know the end of.' } },
      },
    ],
  },
];
