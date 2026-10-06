/*
 * thu-cung.js — Danh sách thú ảo (giống trang cũ) và bộ sticker cảm xúc của từng con.
 * Thú mở khoá khi chuỗi ngày (chuỗi hiện tại hoặc chuỗi dài nhất) đạt mốc `m`.
 * Mỗi thú có 5 sticker cảm xúc, dùng được khi đã mở khoá thú đó.
 */
export const THU_CUNG = [
  { m: 0, e: '🐣', ten: 'Gà Con Tò Mò', tieng: 'Chíp', sang: '' },
  { m: 10, e: '🐱', ten: 'Mèo Thí Nghiệm', tieng: 'Meo', sang: '' },
  { m: 20, e: '🐶', ten: 'Cún Vật Lý', tieng: 'Gâu', sang: '' },
  { m: 30, e: '🐰', ten: 'Thỏ Thiên Văn', tieng: 'Púp', sang: '#7dd3fc' },
  { m: 40, e: '🦊', ten: 'Cáo Hóa Học', tieng: 'Ằng', sang: '#fdba74' },
  { m: 50, e: '🐼', ten: 'Gấu Trúc Sinh Học', tieng: 'Ụp', sang: '#86efac' },
  { m: 60, e: '🦉', ten: 'Cú Mèo Thông Thái', tieng: 'Hú', sang: '#c4b5fd' },
  { m: 70, e: '🤖', ten: 'Robot Tí Hon', tieng: 'Bíp', sang: '#38bdf8', vet: true },
  { m: 80, e: '🦄', ten: 'Kỳ Lân Lượng Tử', tieng: 'Hí', sang: '#f0abfc', vet: true },
  { m: 90, e: '🦖', ten: 'Khủng Long Kỷ Jura', tieng: 'Gràoo', sang: '#f87171', vet: true },
  { m: 100, e: '🐲', ten: 'Rồng Vàng Huyền Thoại', tieng: 'Grừ', sang: '#facc15', vet: true }
];

/** 5 cảm xúc của sticker — mỗi thú có đủ 5 sticker này. */
export const CAM_XUC_STICKER = [
  { e: '😄', chu: 'Vui quá!', nen: '#fef08a' },
  { e: '😢', chu: 'Buồn xíu...', nen: '#bfdbfe' },
  { e: '😴', chu: 'Mệt rồi', nen: '#ddd6fe' },
  { e: '🥰', chu: 'Thương mình', nen: '#fbcfe8' },
  { e: '💪', chu: 'Cố lên!', nen: '#bbf7d0' }
];

/** Chuỗi tốt nhất của người dùng (dùng để mở khoá). */
export const chuoiTotNhat = (rieng) => Math.max(rieng?.chuoi || 0, rieng?.chuoiDaiNhat || 0);
/** Thú thứ i đã mở khoá chưa. */
export const daMoThu = (rieng, i) => THU_CUNG[i].m === 0 || chuoiTotNhat(rieng) >= THU_CUNG[i].m;

/** HTML một sticker (thú + cảm xúc + lời). */
export function htmlSticker(p, e, { lop = '', thuocTinh = '', kieu = '' } = {}) {
  const T = THU_CUNG[p];
  const C = CAM_XUC_STICKER[e];
  return `<div class="stk ${lop}" ${thuocTinh} style="${kieu}--nen:${C.nen};${T.sang ? '--sang:' + T.sang : ''}" ` +
    `role="img" aria-label="Sticker ${T.ten}: ${C.chu}">` +
    `<span class="stk-thu" aria-hidden="true">${T.e}</span><span class="stk-cx" aria-hidden="true">${C.e}</span>` +
    `<span class="stk-chu" aria-hidden="true">${T.tieng}~ ${C.chu}</span></div>`;
}
