/*
 * uy-tin.js — Uy tín của học sinh.
 *  - Ai cũng bắt đầu với UY_TIN_GOC (100) điểm.
 *  - Bị tố cáo: trừ 5–10 (lí do nặng trừ nhiều hơn). Mỗi người chỉ trừ một bạn một lần mỗi ngày.
 *  - Nhắn tin văng tục (trong phòng học hoặc tin nhắn riêng): tin bị che chữ và tự trừ 5–10.
 *  - Học đủ GIO_HOI_UY_TIN giờ liên tiếp (theo đồng hồ phòng) mà không bị trừ lần nào → hồi 1 điểm, tối đa 100.
 *  - Dưới UY_TIN_THI_DAU (70) thì không vào được Thi Đấu.
 * Uy tín = 100 − tổng mức bị trừ + số điểm đã hồi (uyTinCong trong hồ sơ công khai), giữ trong 0–100.
 */
import { duLieu } from './data/index.js';
import { thongBao } from './tienich.js';
import { demTuCam } from './loc-tu.js';
import {
  UY_TIN_GOC, UY_TIN_THI_DAU, GIO_HOI_UY_TIN,
  TRU_TO_CAO_NANG, TRU_TO_CAO_NHE, TRU_VANG_TUC, TRU_VANG_TUC_NANG
} from './config.js';

export const MS_HOI_UY_TIN = GIO_HOI_UY_TIN * 3600 * 1000;
export { UY_TIN_GOC, UY_TIN_THI_DAU };

/** Lí do tố cáo bị trừ mức nặng. */
export const LY_DO_NANG = ['Nói tục, xúc phạm', 'Bắt nạt, đe doạ', 'Xin thông tin cá nhân'];

export function tinhUyTin(dsViPham, uyTinCong = 0) {
  const tru = (dsViPham || []).reduce((s, v) => s + (Number(v.muc) || 0), 0);
  return Math.max(0, Math.min(UY_TIN_GOC, UY_TIN_GOC - tru + (Number(uyTinCong) || 0)));
}

/** Uy tín của một bạn bất kì (đọc hồ sơ công khai + các lần bị trừ). */
export async function layUyTin(uid) {
  if (!duLieu.dsViPham) return UY_TIN_GOC;
  const [ck, ds] = await Promise.all([duLieu.layCongKhai(uid).catch(() => null), duLieu.dsViPham(uid).catch(() => [])]);
  return tinhUyTin(ds, ck?.uyTinCong);
}

/** Màu / chữ theo mức uy tín. */
export function mucUyTin(diem) {
  if (diem >= 90) return { lop: 'ut-tot', chu: 'Rất tốt' };
  if (diem >= UY_TIN_THI_DAU) return { lop: 'ut-kha', chu: 'Ổn' };
  return { lop: 'ut-thap', chu: `Dưới ${UY_TIN_THI_DAU} — chưa vào được Thi Đấu` };
}

/**
 * Theo dõi uy tín của tôi: ctx.uyTin = { diem, viPhamCuoi, ds }.
 * Phát sự kiện 'pl:uytin' khi đổi; báo cho học sinh khi vừa bị trừ do tố cáo.
 */
export function batDauUyTin(ctx) {
  ctx.uyTin = { diem: tinhUyTin([], ctx.congKhai.uyTinCong), viPhamCuoi: 0, ds: [] };
  if (!duLieu.theoDoiViPham) return;
  let daBiet = null;
  duLieu.theoDoiViPham(ctx.uid, (ds) => {
    const moi = daBiet ? ds.filter((v) => !daBiet.has(v.id || v.luc + ':' + v.muc)) : [];
    daBiet = new Set(ds.map((v) => v.id || v.luc + ':' + v.muc));
    moi.filter((v) => v.loai === 'toCao').forEach((v) => {
      thongBao(`⚠️ Bạn vừa bị một bạn trong phòng tố cáo nên bị trừ <b>${v.muc} uy tín</b>. Hãy giữ lời nói lịch sự để lấy lại uy tín nhé.`, { loai: 'err', thoiGian: 8000 });
    });
    capNhatUyTin(ctx, ds);
  });
}

/** Tính lại uy tín (sau khi bị trừ hoặc vừa hồi điểm). */
export function capNhatUyTin(ctx, ds = ctx.uyTin?.ds || []) {
  ctx.uyTin = {
    diem: tinhUyTin(ds, ctx.congKhai.uyTinCong),
    viPhamCuoi: ds.reduce((m, v) => Math.max(m, v.luc || 0), 0),
    ds
  };
  document.dispatchEvent(new CustomEvent('pl:uytin', { detail: ctx.uyTin }));
}

/**
 * Gọi trước khi gửi tin nhắn: nếu có từ văng tục thì tự trừ uy tín và báo cho người gửi.
 * Tin nhắn vẫn gửi đi nhưng từ cấm đã được che.
 */
export async function xetVangTuc(noiDung) {
  const n = demTuCam(noiDung);
  if (!n || !duLieu.ghiVangTuc) return 0;
  const muc = n >= 2 ? TRU_VANG_TUC_NANG : TRU_VANG_TUC;
  try {
    await duLieu.ghiVangTuc(muc);
    thongBao(`Tin nhắn có từ ngữ không phù hợp nên đã bị che. Bạn bị trừ <b>${muc} uy tín</b>.`, { loai: 'err', thoiGian: 7000 });
  } catch (e) { /* không trừ được thì thôi, tin nhắn vẫn đã bị che */ }
  return muc;
}

/** Tố cáo một bạn (kèm báo cáo tin nhắn): trừ uy tín theo lí do. */
export async function toCaoBan(den, lyDo) {
  if (!duLieu.toCao) return { daTruTruoc: true };
  return duLieu.toCao({ den, muc: LY_DO_NANG.includes(lyDo) ? TRU_TO_CAO_NANG : TRU_TO_CAO_NHE });
}

/**
 * Hồi 1 điểm uy tín (gọi khi đã học đủ GIO_HOI_UY_TIN giờ liên tiếp không bị trừ).
 * Trả về true nếu hồi được.
 */
export async function hoiUyTin(ctx) {
  if ((ctx.uyTin?.diem ?? UY_TIN_GOC) >= UY_TIN_GOC) return false;
  try {
    ctx.congKhai = await duLieu.luuCongKhai({ uyTinCong: (Number(ctx.congKhai.uyTinCong) || 0) + 1, uyTinLuc: duLieu.gioMayChu() });
    capNhatUyTin(ctx);
    thongBao(`🛡️ Bạn đã học ${GIO_HOI_UY_TIN} giờ liên tiếp rất lịch sự: được hồi <b>1 uy tín</b> (giờ là ${ctx.uyTin.diem}).`, { loai: 'ok' });
    return true;
  } catch (e) {
    return false;
  }
}
