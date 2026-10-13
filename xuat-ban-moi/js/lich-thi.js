/*
 * lich-thi.js — Lịch Thi Đấu (giờ Việt Nam) và xếp hạng.
 *   Thi tuần:  mỗi Thứ 7 – Chủ nhật. Đội nào đủ điều kiện cũng thi được.
 *   Thi tháng (của tháng M): cuối tuần đầu tiên của tháng M+1, dành cho các đội lọt top 3 một kì thi tuần
 *              có Thứ 7 thuộc tháng M.
 *   Thi quý (của quý Q):     cuối tuần thứ hai của tháng đầu quý sau (để kịp có kết quả thi tháng cuối quý),
 *              dành cho các đội lọt top 3 một kì thi tháng trong quý Q.
 * Mỗi kì mở từ 0:00 Thứ 7 tới hết 23:59 Chủ nhật. Mã kì: tuan-YYYY-MM-DD (ngày Thứ 7), thang-YYYY-MM, quy-YYYY-Qn.
 */
import { ngayCong } from './tienich.js';
import { GIAI_THUONG } from './config.js';

const VN = 7 * 3600 * 1000;
const NGAY = 864e5;
const tach = (ymd) => ymd.split('-').map(Number);
/** Ngày (YYYY-MM-DD) theo giờ Việt Nam của mốc `ms`. */
export const ngayCua = (ms) => new Date(ms + VN).toISOString().slice(0, 10);
/** 0:00 giờ Việt Nam của ngày `ymd`, tính bằng ms. */
export const dauNgay = (ymd) => { const [y, m, d] = tach(ymd); return Date.UTC(y, m - 1, d) - VN; };
/** Thứ trong tuần: 0 = Chủ nhật, 6 = Thứ 7. */
const thu = (ymd) => { const [y, m, d] = tach(ymd); return new Date(Date.UTC(y, m - 1, d)).getUTCDay(); };
const hai = (n) => String(n).padStart(2, '0');

function thuBayDau(y, m) {
  for (let d = 1; d <= 7; d++) { const s = `${y}-${hai(m)}-${hai(d)}`; if (thu(s) === 6) return s; }
  return null;
}
const thangSau = (y, m) => (m === 12 ? [y + 1, 1] : [y, m + 1]);
const thangTruoc = (y, m) => (m === 1 ? [y - 1, 12] : [y, m - 1]);
/** Các ngày Thứ 7 trong tháng y-m. */
function cacThuBay(y, m) {
  const ds = [];
  for (let s = thuBayDau(y, m); s && tach(s)[1] === m; s = ngayCong(s, 7)) ds.push(s);
  return ds;
}
const dd = (ymd) => { const [, m, d] = tach(ymd); return `${hai(d)}/${hai(m)}`; };

export const TEN_LOAI = { tuan: 'Thi tuần', thang: 'Thi tháng', quy: 'Thi quý' };

function taoKy(loai, id, ten, thuBay, vongTruoc = null) {
  const tu = dauNgay(thuBay);
  return { id, loai, ten, thuBay, tu, den: tu + 2 * NGAY, vongTruoc, giai: GIAI_THUONG[loai] };
}
export function kyTuan(thuBay) {
  return taoKy('tuan', 'tuan-' + thuBay, `Thi tuần ${dd(thuBay)}–${dd(ngayCong(thuBay, 1))}`, thuBay);
}
export function kyThang(y, m) {
  const [y2, m2] = thangSau(y, m);
  return taoKy('thang', `thang-${y}-${hai(m)}`, `Thi tháng ${m}/${y}`, thuBayDau(y2, m2),
    cacThuBay(y, m).map((s) => 'tuan-' + s));
}
export function kyQuy(y, q) {
  const [y2, m2] = thangSau(y, q * 3);
  return taoKy('quy', `quy-${y}-Q${q}`, `Thi quý ${q}/${y}`, ngayCong(thuBayDau(y2, m2), 7),
    [1, 2, 3].map((k) => `thang-${y}-${hai(q * 3 - 3 + k)}`));
}
/** Dựng lại kì từ mã kì. */
export function kyTheoId(id) {
  let m;
  if ((m = id.match(/^tuan-(\d{4}-\d{2}-\d{2})$/))) return kyTuan(m[1]);
  if ((m = id.match(/^thang-(\d{4})-(\d{2})$/))) return kyThang(Number(m[1]), Number(m[2]));
  if ((m = id.match(/^quy-(\d{4})-Q([1-4])$/))) return kyQuy(Number(m[1]), Number(m[2]));
  return null;
}

/** Các kì đang mở lúc `bay` (có thể nhiều kì cùng một cuối tuần). */
export function kyDangMo(bay) {
  const hom = ngayCua(bay);
  const t = thu(hom);
  if (t !== 6 && t !== 0) return [];
  const thuBay = t === 6 ? hom : ngayCong(hom, -1);
  const [y, m] = tach(thuBay);
  const ds = [kyTuan(thuBay)];
  if (thuBayDau(y, m) === thuBay) ds.push(kyThang(...thangTruoc(y, m)));
  if ([1, 4, 7, 10].includes(m) && ngayCong(thuBayDau(y, m), 7) === thuBay) {
    const [yq, mq] = thangTruoc(y, m);
    ds.push(kyQuy(yq, mq / 3));
  }
  return ds.filter((k) => bay >= k.tu && bay < k.den);
}

/** Kì gần nhất (của từng loại) đã kết thúc trước `bay`. */
export function kyVuaXong(loai, bay) {
  if (loai === 'tuan') {
    let s = ngayCua(bay);
    while (thu(s) !== 6) s = ngayCong(s, -1);
    let k = kyTuan(s);
    if (k.den > bay) k = kyTuan(ngayCong(s, -7));
    return k;
  }
  let [y, m] = tach(ngayCua(bay));
  for (let i = 0; i < 8; i++) {
    const k = loai === 'thang' ? kyThang(y, m) : (m % 3 === 0 ? kyQuy(y, m / 3) : null);
    if (k && k.den <= bay) return k;
    [y, m] = thangTruoc(y, m);
  }
  return null;
}

/** Các kì đã kết thúc gần đây (để nhận giải): `soTuan` kì tuần, 3 kì tháng, 2 kì quý gần nhất. */
export function kyDaXongGanDay(bay, soTuan = 6) {
  const ds = [];
  let k = kyVuaXong('tuan', bay);
  for (let i = 0; i < soTuan && k; i++) { ds.push(k); k = kyTuan(ngayCong(k.thuBay, -7)); }
  let [y, m] = tach(ngayCua(bay));
  for (let i = 0, thang = 0, quy = 0; i < 9; i++) {
    const kt = kyThang(y, m);
    if (kt.den <= bay && thang < 3) { ds.push(kt); thang++; }
    if (m % 3 === 0) { const kq = kyQuy(y, m / 3); if (kq.den <= bay && quy < 2) { ds.push(kq); quy++; } }
    [y, m] = thangTruoc(y, m);
  }
  return ds;
}

/** Lần mở tiếp theo của mỗi loại (để hiện lịch). */
export function kyTiepTheo(bay) {
  let s = ngayCua(bay);
  while (thu(s) !== 6) s = ngayCong(s, 1);
  const kq = { tuan: kyTuan(s) };
  let [y, m] = tach(ngayCua(bay));
  for (let i = 0; i < 6 && (!kq.thang || !kq.quy); i++) {
    const kt = kyThang(...thangTruoc(y, m));
    if (!kq.thang && kt.den > bay) kq.thang = kt;
    if (!kq.quy && [1, 4, 7, 10].includes(m)) {
      const [yq, mq] = thangTruoc(y, m);
      const kqq = kyQuy(yq, mq / 3);
      if (kqq.den > bay) kq.quy = kqq;
    }
    [y, m] = thangSau(y, m);
  }
  return kq;
}

/** Ngày giờ dễ đọc: "Thứ 7, 17/10". */
export function hienNgay(ymd) {
  const t = thu(ymd);
  return `${t === 0 ? 'Chủ nhật' : 'Thứ ' + (t + 1)}, ${dd(ymd)}`;
}

/** Xếp hạng kết quả một kì: điểm cao trước, cùng điểm thì làm nhanh hơn trước, rồi nộp sớm hơn. */
export function xepHang(ds) {
  return [...ds].sort((a, b) => b.diem - a.diem || (a.thoiGianMs || 0) - (b.thoiGianMs || 0) || (a.luc || 0) - (b.luc || 0));
}
/** Top 3 từng kì: { mã kì: [kết quả hạng 1, 2, 3] } */
export function top3TheoKy(dsKetQua) {
  const nhom = {};
  dsKetQua.forEach((x) => { (nhom[x.ky] = nhom[x.ky] || []).push(x); });
  return Object.fromEntries(Object.entries(nhom).map(([ky, ds]) => [ky, xepHang(ds).slice(0, 3)]));
}
/** Hai danh sách thành viên giống nhau (không kể thứ tự). */
export const cungThanhVien = (a, b) => a.length === b.length && [...a].sort().join() === [...b].sort().join();
