/*
 * diem.js — Điểm chăm chỉ: cộng dồn thời gian học và mua đồ trong cửa hàng.
 * Dùng chung cho cả hai tầng dữ liệu (chỉ gọi layRieng / luuRieng / luuCongKhai).
 */
import { duLieu } from './data/index.js';
import { ngayVN, ngayCong } from './tienich.js';
import { PHUT_MOI_LAN_THUONG, DIEM_MOI_LAN_THUONG } from './config.js';
import { MS_HOI_UY_TIN } from './uy-tin.js';

export const MS_MOI_LAN = PHUT_MOI_LAN_THUONG * 60 * 1000;
const GIU_HOC_CUNG_NGAY = 14; // nhật ký "học cùng ai" giữ 14 ngày (bài test tuần dùng 7 ngày gần nhất)

/**
 * Cộng thêm `ms` thời gian học. Đủ PHUT_MOI_LAN_THUONG phút thì nhận DIEM_MOI_LAN_THUONG điểm
 * (mỗi lần ghi chỉ thưởng một lần, phần dư giữ lại cho lần sau).
 * opts:
 *   banHoc: { uid: { ten, mon, ms } } — học cùng những ai trong khoảng thời gian này (cho bài test tuần)
 *   viPhamCuoi: mốc lần bị trừ uy tín gần nhất — có lần trừ mới thì đếm lại giờ học "sạch" từ đầu
 *   coTheHoiUyTin: uy tín đang dưới 100
 * Trả về { rieng, thuong: true|false, duHoiUyTin: true|false }.
 */
export async function congThoiGianHoc(ms, { banHoc = {}, viPhamCuoi = 0, coTheHoiUyTin = false } = {}) {
  const r = await duLieu.layRieng();
  ms = Math.max(0, ms);
  const phan = {};

  // Học cùng ai, mỗi ngày một mục
  if (Object.keys(banHoc).length) {
    const hom = ngayVN(new Date(duLieu.gioMayChu()));
    const cu = Object.fromEntries(Object.entries(r.hocCung || {}).filter(([ngay]) => ngay >= ngayCong(hom, -GIU_HOC_CUNG_NGAY)));
    const ngay = { ...(cu[hom] || {}) };
    Object.entries(banHoc).forEach(([uid, b]) => {
      ngay[uid] = { ten: b.ten, mon: b.mon || '', ms: (ngay[uid]?.ms || 0) + b.ms };
    });
    phan.hocCung = { ...cu, [hom]: ngay };
  }

  // Giờ học "sạch" liên tiếp để hồi uy tín
  let msSach = (r.sachTu || 0) >= viPhamCuoi ? (r.msSach || 0) : 0;
  msSach += ms;
  let duHoiUyTin = false;
  if (msSach >= MS_HOI_UY_TIN) {
    if (coTheHoiUyTin) { msSach -= MS_HOI_UY_TIN; duHoiUyTin = true; } else msSach = MS_HOI_UY_TIN;
  }
  phan.msSach = msSach;
  phan.sachTu = Math.max(r.sachTu || 0, viPhamCuoi);

  let msHoc = (r.msHoc || 0) + ms;
  if (msHoc >= MS_MOI_LAN) {
    msHoc -= MS_MOI_LAN;
    const rieng = await duLieu.luuRieng({
      ...phan,
      msHoc: Math.min(msHoc, MS_MOI_LAN - 1),
      diemChamChi: (r.diemChamChi || 0) + DIEM_MOI_LAN_THUONG,
      lanThuongCuoi: duLieu.gioMayChu ? duLieu.gioMayChu() : Date.now()
    });
    return { rieng, thuong: true, duHoiUyTin };
  }
  return { rieng: await duLieu.luuRieng({ ...phan, msHoc }), thuong: false, duHoiUyTin };
}

/**
 * Nhận giải Thi Đấu: cộng `sao` điểm chăm chỉ một lần cho mỗi kết quả (khoá "kỳ_mã đội").
 * Trả về rieng mới, hoặc null nếu đã nhận rồi.
 */
export async function nhanGiai(khoa, sao) {
  const r = await duLieu.layRieng();
  if (r.giaiDaNhan?.[khoa] !== undefined) return null;
  return duLieu.luuRieng({ diemChamChi: (r.diemChamChi || 0) + sao, giaiDaNhan: { ...(r.giaiDaNhan || {}), [khoa]: sao } });
}

/** Danh mục cửa hàng lấy từ peer-assets.js: bàn học, tường, kệ sách, áo, phụ kiện, màu tóc đặc biệt. */
export function danhMuc() {
  const o = PeerAssets.CHARACTER_OPTIONS;
  return {
    ban: PeerAssets.DESKS.map((d) => ({ id: d.id, ten: d.name, gia: d.price || 0, ghiChu: d.note || '' })),
    ao: (o.outfits || []).map((a) => ({ id: a.id, ten: a.name, gia: a.price || 0 })),
    tuong: (PeerAssets.WALLS || []).map((w) => ({ id: w.id, ten: w.name, gia: w.price || 0 })),
    ke: (PeerAssets.SHELVES || []).map((k) => ({ id: k.id, ten: k.name, gia: k.price || 0 })),
    phuKien: o.accessories.filter((a) => a.id !== 'khong').map((a) => ({ id: a.id, ten: a.name, gia: a.price || 0 })),
    mauToc: o.hairColors.filter((c) => c.unlockPrice).map((c) => ({ id: c.id, ten: c.name, gia: c.unlockPrice, mau: c.hex }))
  };
}

/** Các món đã có của một quầy (kể cả món miễn phí) — dùng cho đổi bàn / trang trí trong phòng. */
export function monDaCo(rieng, quay) {
  return danhMuc()[quay].filter((m) => daCo(rieng, quay, m));
}

/** Món `id` thuộc quầy `quay` đã sở hữu chưa (món giá 0 coi như có sẵn). */
export function daCo(rieng, quay, mon) {
  return mon.gia === 0 || (rieng.soHuu?.[quay] || []).includes(mon.id);
}

/** Mua một món: trừ điểm, thêm vào đồ sở hữu. Ném lỗi kèm lời hướng dẫn nếu không mua được. */
export async function muaDo(quay, mon) {
  const r = await duLieu.layRieng();
  if (daCo(r, quay, mon)) return r;
  const thieu = mon.gia - (r.diemChamChi || 0);
  if (thieu > 0) throw new Error(`Bạn cần thêm ${thieu} điểm chăm chỉ. Vào phòng học và chạy đồng hồ để tích điểm nhé.`);
  const soHuu = { ban: ['go-soi'], phuKien: ['khong'], mauToc: [], ao: [], tuong: [], ke: [], ...(r.soHuu || {}) };
  soHuu[quay] = [...new Set([...(soHuu[quay] || []), mon.id])];
  return duLieu.luuRieng({ diemChamChi: r.diemChamChi - mon.gia, soHuu });
}
