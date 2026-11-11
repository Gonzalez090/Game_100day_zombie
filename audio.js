// ============================================================
//  audio.js — เพลงพื้นหลังแนวหม่น ๆ เอาชีวิตรอดอยู่คนเดียว สร้างเสียงสดด้วย Web Audio API (ไม่ใช้ไฟล์เพลง)
//  แต่งขึ้นเองทั้งหมด: คอร์ดไมเนอร์ช้า ๆ + เสียงแพดทึบ ๆ + เสียงทุ้มยาว (โดรน)
//                    + เปียโนห่าง ๆ ก้องไกล + ลมพัดเป็นระลอกในเมืองร้าง
//  ความดัง/ความเร็ว ตั้งใน CONFIG.music
//  ใช้งาน: startMusic() / stopMusic() / isMusicPlaying() / isMusicAudible() (ปุ่มลำโพงอยู่ใน game.js)
// ============================================================
'use strict';

// คอร์ดวนซ้ำในบันไดเสียงเรไมเนอร์ (เลข MIDI: 60 = โดกลาง) แต่ละคอร์ดยาว MUSIC_BARS_PER_CHORD ห้อง
const MUSIC_PROGRESSION = [
  { bass: 38, pad: [50, 53, 57, 64] }, // เรไมเนอร์ 9      — เริ่มเงียบ ๆ
  { bass: 34, pad: [53, 57, 58, 62] }, // ทีแฟลตเมเจอร์ 7   — อบอุ่นแวบเดียว
  { bass: 31, pad: [50, 53, 55, 58] }, // ซอลไมเนอร์ 9     — หม่นลง
  { bass: 33, pad: [52, 57, 60, 62] }, // ลาไมเนอร์ (add11) — ค้างไว้ไม่จบ เหมือนยังรอ
];
const MUSIC_BARS_PER_CHORD = 2;

// ทำนองเปียโนจากเรไมเนอร์เพนทาโทนิก (เร ฟา ซอล ลา โด) ช่วงเสียงกลาง ๆ ฟังเหงา
const MUSIC_MELODY_NOTES = [62, 65, 67, 69, 72, 74, 77];

// โอกาสที่เปียโนจะดังในแต่ละจังหวะย่อย (ห้องละ 8) ตั้งไว้ต่ำให้มีช่องว่างเยอะ ๆ
const MUSIC_STEP_CHANCE = [0.7, 0, 0.25, 0.08, 0.45, 0, 0.18, 0.08];
const MUSIC_SILENT_BAR_EVERY = 8;  // ทุก ๆ 8 ห้อง มีห้องที่เปียโนเงียบ (เหลือแต่ลมกับแพด)
const MUSIC_LOOKAHEAD = 3;         // วางโน้ตล่วงหน้ากี่วินาที (สลับแท็บแล้วเพลงไม่สะดุด)

// สถานะของเพลง: ctx/master/reverb สร้างครั้งเดียว, session = รอบที่กำลังเล่น (ปิดแล้วทิ้ง)
const music = { ctx: null, master: null, reverb: null, session: null, timer: null, nextBarTime: 0, bar: 0, lastNote: null };

// ------------------------------------------------------------
// ตัวช่วยเล็ก ๆ
// ------------------------------------------------------------
function isMusicSupported() {
  return Boolean(window.AudioContext || window.webkitAudioContext);
}

function isMusicPlaying() {
  return music.session !== null;
}

// เล่นอยู่และได้ยินจริงไหม (เบราว์เซอร์อาจยังพักระบบเสียงไว้จนกว่าผู้เล่นจะคลิก)
function isMusicAudible() {
  return isMusicPlaying() && music.ctx.state === 'running';
}

// ปลุกระบบเสียงที่เบราว์เซอร์พักไว้ (เรียกตอนผู้เล่นคลิก)
function resumeMusic() {
  if (isMusicPlaying() && music.ctx.state === 'suspended') music.ctx.resume();
}

// เลข MIDI → ความถี่ (Hz)
function midiToHz(midi) {
  return 440 * 2 ** ((midi - 69) / 12);
}

// ความยาว 1 จังหวะ (วินาที)
function getBeatLength() {
  return 60 / CONFIG.music.bpm;
}

// ความดังขึ้น-ค้าง-ลง (attack/hold/release) ของเสียงหนึ่งตัว
function shapeVolume(param, start, attack, hold, release, peak) {
  const holdEnd = start + Math.max(attack, hold);
  param.setValueAtTime(0.0001, start);
  param.linearRampToValueAtTime(peak, start + attack);
  param.setValueAtTime(peak, holdEnd);
  param.exponentialRampToValueAtTime(0.0001, holdEnd + release);
}

// เร่ง/หรี่ความดังรวมแบบนุ่ม ๆ
function fadeMaster(target, seconds) {
  const gain = music.master.gain;
  const now = music.ctx.currentTime;
  gain.cancelScheduledValues(now);
  gain.setValueAtTime(gain.value, now);
  gain.linearRampToValueAtTime(target, now + seconds);
}

// ------------------------------------------------------------
// เสียงพื้นฐาน (สร้างครั้งเดียวตอนเปิดเพลงครั้งแรก)
// ------------------------------------------------------------

// เสียงก้องห้องโล่ง ๆ ยาว ๆ: สร้างจากเสียงซ่าที่ค่อย ๆ จางหาย
function createReverbImpulse(ctx, seconds) {
  const length = Math.floor(ctx.sampleRate * seconds);
  const impulse = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let channel = 0; channel < 2; channel++) {
    const data = impulse.getChannelData(channel);
    for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length) ** 2.5;
  }
  return impulse;
}

// เสียงซ่า (ใช้ทำเสียงลม)
function createNoiseBuffer(ctx, seconds) {
  const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * seconds), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}

// ทางเดินเสียงหลัก: master → กรองเสียงแหลมให้ทึบ → คุมความดัง → ลำโพง (+ ห้องก้อง)
function buildMusicGraph() {
  const Context = window.AudioContext || window.webkitAudioContext;
  const ctx = new Context();
  const master = ctx.createGain();
  master.gain.value = 0;
  const darkness = ctx.createBiquadFilter();
  darkness.type = 'lowpass';
  darkness.frequency.value = 3800;
  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = -18;
  limiter.ratio.value = 3;
  master.connect(darkness);
  darkness.connect(limiter);
  limiter.connect(ctx.destination);

  const reverb = ctx.createConvolver();
  reverb.buffer = createReverbImpulse(ctx, 5);
  const reverbLevel = ctx.createGain();
  reverbLevel.gain.value = 0.6;
  reverb.connect(reverbLevel);
  reverbLevel.connect(master);

  Object.assign(music, { ctx, master, reverb });
}

// เสียงสะท้อนให้เปียโน: ดังซ้ำเบาลงเรื่อย ๆ เหมือนเล่นในตึกร้าง
function createEcho(ctx, output) {
  const input = ctx.createGain();
  input.gain.value = 0.3;
  const delay = ctx.createDelay(3);
  delay.delayTime.value = getBeatLength() * 1.5;
  const feedback = ctx.createGain();
  feedback.gain.value = 0.38;
  const tone = ctx.createBiquadFilter();
  tone.type = 'lowpass';
  tone.frequency.value = 1400;
  input.connect(delay);
  delay.connect(tone);
  tone.connect(feedback);
  feedback.connect(delay);
  tone.connect(output);
  return input;
}

// ------------------------------------------------------------
// เครื่องดนตรี (แต่ละตัวต่อเข้า session.bus = เสียงตรง, session.send = ไปห้องก้อง)
// ------------------------------------------------------------

// แพด: คอร์ดทึบ ๆ ค่อย ๆ ดังขึ้นช้า ๆ แล้วจางยาว
function playPad(notes, start, duration) {
  const { ctx } = music;
  const { bus, send } = music.session;
  notes.forEach(midi => {
    [-7, 7].forEach(cents => {
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = midiToHz(midi);
      osc.detune.value = cents;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 650;
      const gain = ctx.createGain();
      shapeVolume(gain.gain, start, 3, duration, 3.5, 0.018);
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(bus);
      gain.connect(send);
      osc.start(start);
      osc.stop(start + duration + 4);
    });
  });
}

// โดรน: เสียงทุ้มต่ำลากยาวตลอดคอร์ด (ไซน์ 2 ตัว ห่างกัน 1 ช่วงทบ)
function playDrone(midi, start, duration) {
  const { ctx } = music;
  [[0, 0.07], [12, 0.025]].forEach(([shift, level]) => {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = midiToHz(midi + shift);
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 280;
    const gain = ctx.createGain();
    shapeVolume(gain.gain, start, 2, duration, 3, level);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(music.session.bus);
    osc.start(start);
    osc.stop(start + duration + 3.5);
  });
}

// เปียโน: ตีเบา ๆ แล้วปล่อยให้เสียงค่อย ๆ จางหายไปในห้องก้อง
function playPiano(midi, start, velocity) {
  const { ctx } = music;
  const { bus, send, echo } = music.session;
  const out = ctx.createGain();
  out.gain.setValueAtTime(0.0001, start);
  out.gain.linearRampToValueAtTime(0.05 * velocity, start + 0.008);
  out.gain.exponentialRampToValueAtTime(0.0001, start + 3.2);
  const tone = ctx.createBiquadFilter();
  tone.type = 'lowpass';
  tone.frequency.value = 2200;
  [[1, 1], [2, 0.3], [4, 0.05]].forEach(([ratio, level]) => {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = midiToHz(midi) * ratio;
    const gain = ctx.createGain();
    gain.gain.value = level;
    osc.connect(gain);
    gain.connect(tone);
    osc.start(start);
    osc.stop(start + 3.3);
  });
  tone.connect(out);
  out.connect(bus);
  out.connect(send);
  out.connect(echo);
}

// ลมพัดในเมืองร้าง: เสียงซ่าผ่านตัวกรองที่ค่อย ๆ เลื่อนความถี่ + ความดังขึ้นลงเป็นระลอก
// คืนรายการเสียงที่ต้องสั่งหยุดตอนปิดเพลง
function startWind(ctx, bus) {
  const noise = ctx.createBufferSource();
  noise.buffer = createNoiseBuffer(ctx, 4);
  noise.loop = true;
  const band = ctx.createBiquadFilter();
  band.type = 'bandpass';
  band.frequency.value = 450;
  band.Q.value = 0.9;
  const level = ctx.createGain();
  level.gain.value = 0.035;

  const sweep = ctx.createOscillator(); // เลื่อนเสียงลมสูง-ต่ำช้า ๆ
  sweep.frequency.value = 0.06;
  const sweepDepth = ctx.createGain();
  sweepDepth.gain.value = 260;
  sweep.connect(sweepDepth);
  sweepDepth.connect(band.frequency);

  const gust = ctx.createOscillator(); // ลมแรง-เบาเป็นระลอก
  gust.frequency.value = 0.037;
  const gustDepth = ctx.createGain();
  gustDepth.gain.value = 0.022;
  gust.connect(gustDepth);
  gustDepth.connect(level.gain);

  noise.connect(band);
  band.connect(level);
  level.connect(bus);
  [noise, sweep, gust].forEach(source => source.start());
  return [noise, sweep, gust];
}

// ------------------------------------------------------------
// แต่งเพลงทีละห้อง
// ------------------------------------------------------------

// เลือกโน้ตเปียโนตัวถัดไป: ขยับใกล้ ๆ ตัวก่อน (ไม่เกิน 5 ครึ่งเสียง) ไม่ซ้ำตัวเดิม และมักไหลลงต่ำ (ฟังเศร้า)
function pickMelodyNote(chord) {
  const candidates = [...new Set([...MUSIC_MELODY_NOTES, ...chord.pad.map(note => note + 12)])];
  const near = music.lastNote === null
    ? candidates
    : candidates.filter(note => note !== music.lastNote && Math.abs(note - music.lastNote) <= 5);
  let pool = near.length > 0 ? near : candidates;
  if (music.lastNote !== null && Math.random() < 0.6) {
    const lower = pool.filter(note => note < music.lastNote);
    if (lower.length > 0) pool = lower;
  }
  music.lastNote = pool[Math.floor(Math.random() * pool.length)];
  return music.lastNote;
}

function getChordForBar(bar) {
  return MUSIC_PROGRESSION[Math.floor(bar / MUSIC_BARS_PER_CHORD) % MUSIC_PROGRESSION.length];
}

// วางโน้ตทั้งห้อง: แพด + โดรนตอนเปลี่ยนคอร์ด, เปียโนห่าง ๆ (ห้องแรกและบางห้องเงียบ)
function scheduleBar(bar, start) {
  const beat = getBeatLength();
  const chord = getChordForBar(bar);
  if (bar % MUSIC_BARS_PER_CHORD === 0) {
    const chordLength = beat * 4 * MUSIC_BARS_PER_CHORD;
    playPad(chord.pad, start, chordLength);
    playDrone(chord.bass, start, chordLength);
  }
  if (bar === 0 || bar % MUSIC_SILENT_BAR_EVERY === MUSIC_SILENT_BAR_EVERY - 1) return;
  for (let step = 0; step < 8; step++) {
    if (Math.random() < MUSIC_STEP_CHANCE[step]) {
      playPiano(pickMelodyNote(chord), start + (step * beat) / 2, 0.5 + Math.random() * 0.4);
    }
  }
}

// วางโน้ตล่วงหน้าเรื่อย ๆ ให้เต็มช่วง MUSIC_LOOKAHEAD วินาที
function scheduleMusic() {
  const barLength = getBeatLength() * 4;
  while (music.session && music.nextBarTime < music.ctx.currentTime + MUSIC_LOOKAHEAD) {
    scheduleBar(music.bar, music.nextBarTime);
    music.nextBarTime += barLength;
    music.bar += 1;
  }
}

// ------------------------------------------------------------
// เปิด/ปิดเพลง
// ------------------------------------------------------------

// เปิดเพลง (ต้องเรียกหลังผู้เล่นคลิก/กดปุ่มแล้ว เบราว์เซอร์ถึงยอมให้มีเสียง) คืน true ถ้าเริ่มได้
function startMusic() {
  if (!isMusicSupported()) return false;
  if (!music.ctx) buildMusicGraph();
  if (music.session) return true;
  const { ctx } = music;
  ctx.resume();
  const bus = ctx.createGain();
  bus.connect(music.master);
  const send = ctx.createGain();
  send.connect(music.reverb);
  const echo = createEcho(ctx, bus);
  music.session = { bus, send, echo, ambience: startWind(ctx, bus) };
  music.nextBarTime = ctx.currentTime + 0.1;
  music.bar = 0;
  music.lastNote = null;
  fadeMaster(CONFIG.music.volume, 3); // ค่อย ๆ ดังขึ้นช้า ๆ
  scheduleMusic();
  music.timer = setInterval(scheduleMusic, 250);
  return true;
}

// ปิดเพลง: หรี่เสียงลงแล้วตัดทั้งรอบทิ้ง (โน้ตที่วางล่วงหน้าไว้จะไม่ดังค้าง) แล้วพักระบบเสียง
function stopMusic() {
  if (!music.session) return;
  const { session, ctx } = music;
  music.session = null;
  clearInterval(music.timer);
  music.timer = null;
  fadeMaster(0, 0.6);
  setTimeout(() => {
    session.ambience.forEach(source => source.stop());
    [session.bus, session.send, session.echo].forEach(node => node.disconnect());
    if (!music.session) ctx.suspend();
  }, 700);
}
