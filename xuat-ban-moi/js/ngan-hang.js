/*
 * ngan-hang.js — Đọc ngân hàng câu hỏi (data/ngan-hang-cau-hoi-thpt.json) và bốc câu ngẫu nhiên.
 * Dùng cho bài test tuần và Thi Đấu (bài kiểm tra đầu vào có cách bốc riêng trong kiem-tra.js).
 */
import { taiJSON } from './tienich.js';
import { DE_FILE } from './config.js';

let cache = null;
export async function taiNganHang() {
  if (!cache) {
    const de = await taiJSON(DE_FILE);
    const monTheoId = Object.fromEntries(de.subjects.map((m) => [m.id, m]));
    const cauTheoId = new Map();
    de.subjects.forEach((m) => m.questions.forEach((q) => cauTheoId.set(m.id + ':' + q.id, q)));
    cache = {
      de,
      monTheoId,
      tenMon: (id) => monTheoId[id]?.name || id,
      timCau: (mon, id) => cauTheoId.get(mon + ':' + id) || null
    };
  }
  return cache;
}

export function xao(mang) {
  const a = [...mang];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Bốc `n` câu ngẫu nhiên trong `cauHoi`, mỗi câu kèm thứ tự phương án đã xáo: [{ id, hoanVi }]. */
export function bocCau(cauHoi, n) {
  return xao(cauHoi).slice(0, n).map((q) => ({ id: q.id, hoanVi: xao(q.options.map((_, i) => i)) }));
}

/**
 * Các câu học sinh đã làm ĐÚNG ở bài kiểm tra đầu vào: { môn: Set(id) }.
 * Gộp danh sách tích luỹ (kiemTra.daDung) với chi tiết lần thi gần nhất của từng môn.
 */
export function cauDaDung(rieng, nh) {
  const kq = {};
  const them = (mon, id) => { (kq[mon] = kq[mon] || new Set()).add(id); };
  Object.entries(rieng?.kiemTra?.daDung || {}).forEach(([mon, ds]) => ds.forEach((id) => them(mon, id)));
  Object.entries(rieng?.kiemTra?.chiTiet || {}).forEach(([mon, ds]) => ds.forEach((c) => {
    if (c.chon === nh.timCau(mon, c.id)?.answer) them(mon, c.id);
  }));
  return kq;
}

/** Các câu đã từng làm (đúng hoặc sai) ở bài đầu vào: { môn: Set(id) } — để biết câu "từng sai". */
export function cauDaLam(rieng) {
  const kq = {};
  const them = (mon, id) => { (kq[mon] = kq[mon] || new Set()).add(id); };
  Object.entries(rieng?.kiemTra?.daLam || {}).forEach(([mon, ds]) => ds.forEach((id) => them(mon, id)));
  Object.entries(rieng?.kiemTra?.chiTiet || {}).forEach(([mon, ds]) => ds.forEach((c) => them(mon, c.id)));
  return kq;
}
