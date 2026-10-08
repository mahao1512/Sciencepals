/*
 * diem.js — Điểm chăm chỉ: cộng dồn thời gian học và mua đồ trong cửa hàng.
 * Dùng chung cho cả hai tầng dữ liệu (chỉ gọi layRieng / luuRieng / luuCongKhai).
 */
import { duLieu } from './data/index.js';
import { PHUT_MOI_LAN_THUONG, DIEM_MOI_LAN_THUONG } from './config.js';

export const MS_MOI_LAN = PHUT_MOI_LAN_THUONG * 60 * 1000;

/**
 * Cộng thêm `ms` thời gian học. Đủ PHUT_MOI_LAN_THUONG phút thì nhận DIEM_MOI_LAN_THUONG điểm
 * (mỗi lần ghi chỉ thưởng một lần, phần dư giữ lại cho lần sau).
 * Trả về { rieng, thuong: true|false }.
 */
export async function congThoiGianHoc(ms) {
  const r = await duLieu.layRieng();
  let msHoc = (r.msHoc || 0) + Math.max(0, ms);
  if (msHoc >= MS_MOI_LAN) {
    msHoc -= MS_MOI_LAN;
    const rieng = await duLieu.luuRieng({
      msHoc: Math.min(msHoc, MS_MOI_LAN - 1),
      diemChamChi: (r.diemChamChi || 0) + DIEM_MOI_LAN_THUONG,
      lanThuongCuoi: duLieu.gioMayChu ? duLieu.gioMayChu() : Date.now()
    });
    return { rieng, thuong: true };
  }
  return { rieng: await duLieu.luuRieng({ msHoc }), thuong: false };
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
