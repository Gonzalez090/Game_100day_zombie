// ============================================================
//  names.js — รายชื่อไทยสำหรับสุ่มตัวละคร (แยกตามเพศ)
//  th = ชื่อภาษาไทย (ใช้เก็บในเซฟ), en = คำอ่านอักษรอังกฤษ (ใช้ตอนเลือกภาษาอังกฤษ)
//  เพิ่ม/ลบชื่อได้ตามใจ ขอแค่ใส่ทั้ง th และ en
// ============================================================

const NAMES = {
  male: [
    { th: 'สมชาย', en: 'Somchai' },       { th: 'สมศักดิ์', en: 'Somsak' },
    { th: 'ประเสริฐ', en: 'Prasert' },     { th: 'วิชัย', en: 'Wichai' },
    { th: 'สุรชัย', en: 'Surachai' },      { th: 'ธนากร', en: 'Thanakorn' },
    { th: 'ณัฐวุฒิ', en: 'Nattawut' },     { th: 'กิตติพงษ์', en: 'Kittipong' },
    { th: 'อนุชา', en: 'Anucha' },        { th: 'ชัยวัฒน์', en: 'Chaiwat' },
    { th: 'พงศกร', en: 'Pongsakorn' },    { th: 'ศุภชัย', en: 'Supachai' },
    { th: 'ธีรภัทร', en: 'Teerapat' },     { th: 'ภานุวัฒน์', en: 'Panuwat' },
    { th: 'วรวุฒิ', en: 'Worawut' },       { th: 'เอกชัย', en: 'Ekkachai' },
    { th: 'สุรเชษฐ์', en: 'Surachet' },     { th: 'อภิชาติ', en: 'Apichat' },
    { th: 'ปิยะพงษ์', en: 'Piyapong' },    { th: 'นพดล', en: 'Noppadon' },
    { th: 'ไพโรจน์', en: 'Pairoj' },       { th: 'บุญมี', en: 'Boonmee' },
    { th: 'สมบัติ', en: 'Sombat' },        { th: 'จักรพันธ์', en: 'Jakkapan' },
    { th: 'ธนวัฒน์', en: 'Thanawat' },     { th: 'กฤษดา', en: 'Kritsada' },
    { th: 'ศักดิ์ชัย', en: 'Sakchai' },     { th: 'อาทิตย์', en: 'Arthit' },
    { th: 'ปกรณ์', en: 'Pakorn' },        { th: 'ชาญวิทย์', en: 'Chanwit' },
    { th: 'ณัฐพล', en: 'Nattapon' },      { th: 'วีรยุทธ', en: 'Weerayut' },
  ],
  female: [
    { th: 'สมหญิง', en: 'Somying' },      { th: 'สุดารัตน์', en: 'Sudarat' },
    { th: 'วิไลวรรณ', en: 'Wilaiwan' },    { th: 'กาญจนา', en: 'Kanjana' },
    { th: 'ปิยะนุช', en: 'Piyanuch' },     { th: 'ศิริพร', en: 'Siriporn' },
    { th: 'นภัสสร', en: 'Napatsorn' },     { th: 'ธิดารัตน์', en: 'Thidarat' },
    { th: 'พิมพ์ชนก', en: 'Pimchanok' },   { th: 'อรุณี', en: 'Arunee' },
    { th: 'จันทร์เพ็ญ', en: 'Janpen' },     { th: 'รัตนา', en: 'Rattana' },
    { th: 'สุภาพร', en: 'Supaporn' },      { th: 'วนิดา', en: 'Wanida' },
    { th: 'ณัฐธิดา', en: 'Nattida' },      { th: 'กมลชนก', en: 'Kamonchanok' },
    { th: 'ปวีณา', en: 'Paweena' },       { th: 'อัญชลี', en: 'Anchalee' },
    { th: 'เบญจวรรณ', en: 'Benjawan' },    { th: 'ชนิดา', en: 'Chanida' },
    { th: 'มาลัย', en: 'Malai' },         { th: 'บุษบา', en: 'Butsaba' },
    { th: 'ประภาพร', en: 'Praphaporn' },   { th: 'สายสุนีย์', en: 'Saisunee' },
    { th: 'เพ็ญศรี', en: 'Pensri' },       { th: 'ดวงใจ', en: 'Duangjai' },
    { th: 'อรวรรณ', en: 'Orawan' },       { th: 'ชุติมา', en: 'Chutima' },
    { th: 'พัชรินทร์', en: 'Patcharin' },   { th: 'ขวัญใจ', en: 'Kwanjai' },
    { th: 'น้ำฝน', en: 'Namfon' },         { th: 'ลลิตา', en: 'Lalita' },
  ],
};
