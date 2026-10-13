/*
 * thi-dau-chung.js — Phần dùng chung của Thi Đấu: điều kiện đội, tạo phòng thi, tính điểm trận,
 * bảng vàng và nhận giải (ngôi sao) cho các đội top 3.
 */
import { duLieu } from './data/index.js';
import { esc, thongBao } from './tienich.js';
import { bocCau } from './ngan-hang.js';
import { layUyTin, UY_TIN_THI_DAU } from './uy-tin.js';
import { nhanGiai } from './diem.js';
import { capNhatDauTrang } from './khung.js';
import { kyDaXongGanDay, kyVuaXong, top3TheoKy, cungThanhVien } from './lich-thi.js';
import { DOI_MIN, DOI_MAX, THI_SO_CAU_MOI_MON, THI_GIAY_MOI_CAU, THI_GIAY_NGHI } from './config.js';

export const DIEM_CAU = 10;        // trả lời đúng
export const THUONG_NHANH = 5;     // trả lời càng nhanh càng được thêm, tối đa 5
export const HUY_CHUONG = ['🥇', '🥈', '🥉'];

/* ---------- Hồ sơ & uy tín thành viên (đọc một lần mỗi trang) ---------- */
const hoSo = new Map();
const uyTin = new Map();
export async function layHoSo(uid) {
  if (!hoSo.has(uid)) hoSo.set(uid, await duLieu.layCongKhai(uid).catch(() => null));
  return hoSo.get(uid);
}
export async function layUyTinCache(uid, moi = false) {
  if (moi || !uyTin.has(uid)) uyTin.set(uid, await layUyTin(uid));
  return uyTin.get(uid);
}

/** Danh sách điều kiện của đội: [{ ok, chu }] — đủ người, mỗi người một môn khác nhau, uy tín đủ. */
export async function dieuKienDoi(doi) {
  const n = doi.thanhVien.length;
  const chon = doi.thanhVien.map((u) => doi.mon[u]).filter(Boolean);
  const khongTrung = new Set(chon).size === chon.length;
  const thieuUyTin = [];
  for (const u of doi.thanhVien) {
    if ((await layUyTinCache(u)) < UY_TIN_THI_DAU) thieuUyTin.push((await layHoSo(u))?.ten || 'Một bạn');
  }
  return [
    { ok: n >= DOI_MIN && n <= DOI_MAX, chu: `Đội có ${n} người (cần ${DOI_MIN}–${DOI_MAX} người, mỗi người thi một môn)` },
    { ok: chon.length === n && khongTrung, chu: chon.length === n ? (khongTrung ? 'Mọi người đã chọn môn, không trùng nhau' : 'Có hai bạn chọn trùng môn') : `Còn ${n - chon.length} bạn chưa chọn môn` },
    { ok: !thieuUyTin.length, chu: thieuUyTin.length ? `Chưa đủ uy tín (cần ${UY_TIN_THI_DAU}): ${thieuUyTin.map(esc).join(', ')}` : `Uy tín mọi người từ ${UY_TIN_THI_DAU} trở lên` }
  ];
}

/** Đội có được vào kì `ky` không (thi tháng / quý cần lọt top 3 vòng trước, cùng đúng các thành viên). */
export function duocVaoKy(ky, doi, top3) {
  if (!ky.vongTruoc) return { ok: true };
  const dat = ky.vongTruoc.flatMap((id) => (top3[id] || []).map((x, h) => ({ ...x, hang: h })))
    .find((x) => x.maDoi === doi.ma && cungThanhVien(x.thanhVien, doi.thanhVien));
  return dat ? { ok: true, dat } : { ok: false };
}

/** Bộ câu hỏi cho phòng thi: thành viên lần lượt theo thứ tự trong đội, mỗi người THI_SO_CAU_MOI_MON câu môn của mình. */
export async function taoTranMoi(doi, nh) {
  const thanhVien = {};
  const phan = [];
  const cau = [];
  for (const uid of doi.thanhVien) {
    const mon = doi.mon[uid];
    thanhVien[uid] = { ten: (await layHoSo(uid))?.ten || 'Bạn', mon };
    bocCau(nh.monTheoId[mon].questions, THI_SO_CAU_MOI_MON).forEach((c) => {
      cau.push({ mon, id: c.id, hoanVi: c.hoanVi });
      phan.push(uid);
    });
  }
  return { ten: doi.ten, thanhVien, phan, cau, hanMs: THI_GIAY_MOI_CAU * 1000, nghiMs: THI_GIAY_NGHI * 1000 };
}

/**
 * Tính trạng thái trận lúc `bay` (giống nhau trên mọi máy vì chỉ dựa vào giờ máy chủ):
 *   Câu đầu bắt đầu sau một quãng chuẩn bị (nghiMs). Mỗi câu có hanMs để trả lời; trả lời xong (hoặc hết giờ)
 *   thì xem đáp án nghiMs rồi sang câu sau.
 * Trả về { ds: [{ i, chon, ok, diem, xongLuc, hetGio }], hienTai: { i, batDau, han } | null, ketThuc, xong }.
 */
export function tinhTran(t, bay, nh) {
  const ds = [];
  let moc = t.batDauLuc + t.nghiMs;
  for (let i = 0; i < t.cau.length; i++) {
    const c = t.cau[i];
    const han = moc + t.hanMs;
    const tl = t.traLoi?.[i];
    const dapAn = nh.timCau(c.mon, c.id)?.answer;
    if (tl && tl.luc <= han) {
      const ok = tl.chon === dapAn;
      const conLai = Math.min(t.hanMs, han - Math.max(tl.luc, moc));
      ds.push({ i, chon: tl.chon, ok, diem: ok ? DIEM_CAU + Math.round(THUONG_NHANH * conLai / t.hanMs) : 0, xongLuc: Math.max(tl.luc, moc), hetGio: false });
      moc = Math.max(tl.luc, moc) + t.nghiMs;
    } else if (bay >= han) {
      ds.push({ i, chon: null, ok: false, diem: 0, xongLuc: han, hetGio: true });
      moc = han + t.nghiMs;
    } else {
      return { ds, hienTai: { i, batDau: moc, han }, ketThuc: null, xong: false };
    }
  }
  return { ds, hienTai: null, ketThuc: moc, xong: bay >= moc };
}

/** Kết quả cuối trận để lưu và xếp hạng. */
export function ketQuaTran(t, trang) {
  const tong = trang.ds.reduce((s, x) => s + x.diem, 0);
  const toiDa = (DIEM_CAU + THUONG_NHANH) * t.cau.length;
  const cuoi = trang.ds.at(-1)?.xongLuc || t.batDauLuc;
  return {
    ky: t.ky, maDoi: t.maDoi, tenDoi: t.ten,
    thanhVien: Object.keys(t.thanhVien),
    ten: Object.fromEntries(Object.entries(t.thanhVien).map(([u, x]) => [u, x.ten])),
    mon: Object.fromEntries(Object.entries(t.thanhVien).map(([u, x]) => [u, x.mon])),
    diem: Math.round((1000 * tong) / toiDa),
    dung: trang.ds.filter((x) => x.ok).length,
    soCau: t.cau.length,
    thoiGianMs: Math.max(0, Math.round(cuoi - t.batDauLuc))
  };
}

/* ---------- Bảng vàng ---------- */
/** Top 3 của kì tuần / tháng / quý gần nhất đã kết thúc. */
export async function layBangVang() {
  if (!duLieu.dsKetQua) return [];
  const bay = duLieu.gioMayChu();
  const kys = ['tuan', 'thang', 'quy'].map((l) => kyVuaXong(l, bay)).filter(Boolean);
  const ds = await duLieu.dsKetQua(kys.map((k) => k.id)).catch(() => []);
  const top = top3TheoKy(ds);
  return kys.map((k) => ({ ky: k, top: top[k.id] || [] }));
}

export function htmlBangVang(bv, tenMon, { gon = false } = {}) {
  return `<div class="bv-luoi${gon ? ' gon' : ''}">` + bv.map(({ ky, top }) =>
    `<div class="bv-ky"><h3>${esc(ky.ten)}</h3>` +
    (top.length
      ? `<ol class="bv-ds">` + top.map((x, h) =>
        `<li><span class="bv-huy" aria-hidden="true">${HUY_CHUONG[h]}</span><span class="sr-only">Hạng ${h + 1}: </span>` +
        `<span class="bv-ten"><b>${esc(x.tenDoi)}</b><small>${x.thanhVien.map((u) => esc(x.ten?.[u] || '') + (x.mon?.[u] ? ` (${esc(tenMon(x.mon[u]))})` : '')).join(', ')}</small></span>` +
        `<span class="bv-diem">${x.diem}<small> điểm</small></span></li>`).join('') + `</ol>`
      : `<p class="small muted">Chưa có đội nào thi kì này.</p>`) +
    `</div>`).join('') + `</div>`;
}

/* ---------- Nhận giải ---------- */
/** Cộng ngôi sao cho các giải (top 3) của tôi ở các kì vừa kết thúc mà chưa nhận. */
export async function nhanGiaiConLai(ctx) {
  if (!duLieu.dsKetQua) return;
  const kys = kyDaXongGanDay(duLieu.gioMayChu());
  const ds = await duLieu.dsKetQua(kys.map((k) => k.id)).catch(() => []);
  const top = top3TheoKy(ds);
  for (const k of kys) {
    const dsTop = top[k.id] || [];
    for (let h = 0; h < dsTop.length; h++) {
      const x = dsTop[h];
      if (!x.thanhVien.includes(ctx.uid)) continue;
      const khoa = x.ky + '_' + x.maDoi;
      if (ctx.rieng.giaiDaNhan?.[khoa] !== undefined) continue;
      try {
        const r = await nhanGiai(khoa, k.giai[h]);
        if (!r) continue;
        ctx.rieng = r;
        capNhatDauTrang(ctx);
        thongBao(`${HUY_CHUONG[h]} Đội <b>${esc(x.tenDoi)}</b> đạt hạng ${h + 1} ${esc(k.ten)}! Bạn nhận <b>${k.giai[h]} ⭐</b>.`, { loai: 'ok', thoiGian: 9000 });
      } catch (e) { /* lần sau thử lại */ }
    }
  }
}
