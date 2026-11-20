export const CATEGORIES = [
  { key:'perayaan', label:'Perayaan', hint:'Ulang tahun, aqiqah, lebaran, syukuran', color:'#d9604e', emoji:'🎂' },
  { key:'langkah', label:'Langkah dan gerak', hint:'Tengkurap, merangkak, berjalan, bersepeda', color:'#4e9a5c', emoji:'👣' },
  { key:'bicara', label:'Kata dan suara', hint:'Tawa pertama, kata pertama, ucapan lucu', color:'#4a88c2', emoji:'💬' },
  { key:'sekolah', label:'Sekolah dan belajar', hint:'Hari pertama sekolah, belajar baca, prestasi', color:'#b5834a', emoji:'📚' },
  { key:'makan', label:'Makan dan rasa', hint:'MPASI pertama, makanan favorit, masak bersama', color:'#d99a1f', emoji:'🍓' },
  { key:'alam', label:'Alam dan jalan-jalan', hint:'Liburan, taman, pantai, perjalanan', color:'#2f9c94', emoji:'🌿' },
  { key:'bermain', label:'Bermain', hint:'Mainan favorit, teman, permainan baru', color:'#d5649a', emoji:'🧸' },
  { key:'keluarga', label:'Keluarga dan rumah', hint:'Kumpul keluarga, pindah rumah, tradisi', color:'#9a63bf', emoji:'🏡' },
  { key:'tumbuh', label:'Tumbuh dan sehat', hint:'Gigi pertama, tinggi badan, imunisasi', color:'#82a22c', emoji:'🌱' },
  { key:'tidur', label:'Tidur dan mimpi', hint:'Dongeng malam, tidur sendiri, mimpi lucu', color:'#5f6bc4', emoji:'🌙' },
  { key:'spesial', label:'Momen spesial', hint:'Hal yang tidak masuk kategori lain', color:'#c99a2e', emoji:'✨' }
];

export const RELATIONS = ['ayah','ibu','kakak','adik','kakek','nenek','paman','bibi','sepupu','teman','guru','lain'];
export const PALETTES = ['mawar','sage','langit','kraft','kunyit','lavender'];
export const FRAMES = ['polaroid','kayu','kain'];

export function ageLabel(birth, date) {
  if (!birth || !date) return '';
  const b = new Date(`${birth}T00:00:00`);
  const d = new Date(`${date}T00:00:00`);
  if (Number.isNaN(+b) || Number.isNaN(+d) || d < b) return '';
  let months = (d.getFullYear()-b.getFullYear())*12 + d.getMonth()-b.getMonth();
  if (d.getDate() < b.getDate()) months--;
  const years = Math.floor(months/12), rem = months%12;
  return years ? `${years} th ${rem} bln` : `${months} bulan`;
}
