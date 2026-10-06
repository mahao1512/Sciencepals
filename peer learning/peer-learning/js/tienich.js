/* tienich.js — Hàm nhỏ dùng chung: thoát HTML, ngày giờ Việt Nam, thông báo, cửa sổ, giao diện sáng/tối. */
import { MUI_GIO } from './config.js';

/** Thoát kí tự HTML để chèn chữ người dùng nhập vào trang an toàn. */
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const fmtNgay = new Intl.DateTimeFormat('en-CA', { timeZone: MUI_GIO, year: 'numeric', month: '2-digit', day: '2-digit' });
/** Ngày theo giờ Việt Nam, dạng YYYY-MM-DD. */
export const ngayVN = (d = new Date()) => fmtNgay.format(d);
/** Ngày liền trước của một chuỗi YYYY-MM-DD. */
export function ngayHomTruoc(ymd) {
  const [y, m, d] = ymd.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d - 1));
  return t.toISOString().slice(0, 10);
}
/** Cộng / trừ `n` ngày cho chuỗi YYYY-MM-DD. */
export function ngayCong(ymd, n) {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}
/** Số ngày từ `a` tới `b` (YYYY-MM-DD). */
export function soNgay(a, b) {
  const t = (s) => { const [y, m, d] = s.split('-').map(Number); return Date.UTC(y, m - 1, d); };
  return Math.round((t(b) - t(a)) / 864e5);
}
const fmtGio =new Intl.DateTimeFormat('vi-VN', { timeZone: MUI_GIO, hour: '2-digit', minute: '2-digit' });
/** Giờ:phút theo giờ Việt Nam. */
export const gioVN = (ms) => fmtGio.format(new Date(ms));

/** Đọc file JSON trong thư mục data/. */
export async function taiJSON(duongDan) {
  const r = await fetch(duongDan, { cache: 'no-cache' });
  if (!r.ok) throw new Error('Không tải được ' + duongDan);
  return r.json();
}

/** Nạp thêm một file CSS (một lần) — dùng cho tính năng mở thêm như thú ảo, sổ tay. */
export function napCss(href) {
  if (document.querySelector(`link[href="${href}"]`)) return;
  const l = document.createElement('link');
  l.rel = 'stylesheet';
  l.href = href;
  document.head.appendChild(l);
}

/* ---------- Thông báo nổi ---------- */
function vungThongBao() {
  let v = document.getElementById('toasts');
  if (!v) {
    v = document.createElement('div');
    v.id = 'toasts';
    v.className = 'toasts';
    v.setAttribute('role', 'status');
    v.setAttribute('aria-live', 'polite');
    document.body.appendChild(v);
  }
  return v;
}
/**
 * Hiện thông báo nổi. `loai`: '' | 'ok' | 'err'.
 * `nut`: [{ chu, kieu, bam }] — khi có nút, thông báo không tự tắt.
 */
export function thongBao(noiDung, { loai = '', nut = [], thoiGian = 4500 } = {}) {
  const t = document.createElement('div');
  t.className = 'toast ' + loai;
  t.innerHTML = `<span>${noiDung}</span>`;
  if (nut.length) {
    const act = document.createElement('div');
    act.className = 'act';
    nut.forEach((n) => {
      const b = document.createElement('button');
      b.className = 'btn ' + (n.kieu || 'btn-secondary');
      b.textContent = n.chu;
      b.addEventListener('click', () => { t.remove(); n.bam && n.bam(); });
      act.appendChild(b);
    });
    t.appendChild(act);
  } else {
    setTimeout(() => t.remove(), thoiGian);
  }
  vungThongBao().appendChild(t);
  return t;
}

/* ---------- Cửa sổ ---------- */
/**
 * Mở cửa sổ với nội dung HTML. Trả về phần tử <dialog>.
 * Đóng bằng nút ×, phím Esc hoặc bấm ra ngoài (trừ khi `batBuoc`).
 */
export function moCuaSo(html, { tieuDe = '', batBuoc = false, khiDong } = {}) {
  const d = document.createElement('dialog');
  d.className = 'modal';
  const idTieuDe = 'td-' + Math.random().toString(36).slice(2, 8);
  d.setAttribute('aria-labelledby', idTieuDe);
  d.innerHTML =
    `<div class="modal-body">` +
    (batBuoc ? '' : `<button type="button" class="modal-close" aria-label="Đóng"><i class="fas fa-times" aria-hidden="true"></i></button>`) +
    (tieuDe ? `<h2 id="${idTieuDe}">${tieuDe}</h2>` : '') +
    `<div class="modal-content">${html}</div></div>`;
  document.body.appendChild(d);
  // Dọn dẹp ngay khi đóng: không chờ sự kiện "close" vì trình duyệt có thể hoãn nó khi tab bị ẩn
  let daDon = false;
  const donDep = () => { if (daDon) return; daDon = true; d.remove(); khiDong && khiDong(); };
  const dongGoc = d.close.bind(d);
  d.close = (v) => { if (d.open) dongGoc(v); donDep(); };
  const dong = () => d.close();
  d.querySelector('.modal-close')?.addEventListener('click', dong);
  d.addEventListener('cancel', (e) => { if (batBuoc) e.preventDefault(); });
  d.addEventListener('click', (e) => { if (!batBuoc && e.target === d) dong(); });
  d.addEventListener('close', donDep);
  d.showModal();
  return d;
}

/* ---------- Sáng / tối (dùng chung khoá 'theme' với trang cũ) ---------- */
export function apDungGiaoDien() {
  let toi = false;
  try {
    const t = localStorage.getItem('theme');
    toi = t === 'dark' || (!t && matchMedia('(prefers-color-scheme: dark)').matches);
  } catch (e) { /* bỏ qua */ }
  document.documentElement.classList.toggle('dark', toi);
  return toi;
}
export function doiGiaoDien() {
  const toi = document.documentElement.classList.toggle('dark');
  try { localStorage.setItem('theme', toi ? 'dark' : 'light'); } catch (e) { /* bỏ qua */ }
  return toi;
}

/** Tạo mã ngẫu nhiên (bỏ các kí tự dễ nhầm O/0, I/1). */
export function maNgauNhien(doDai = 6) {
  const kt = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  const a = crypto.getRandomValues(new Uint32Array(doDai));
  for (const x of a) s += kt[x % kt.length];
  return s;
}
