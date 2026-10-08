/* chuoi.js — Giữ chuỗi ngày đăng nhập (tính theo giờ Việt Nam). */
import { ngayVN, ngayHomTruoc } from './tienich.js';

/**
 * Tính chuỗi mới từ dữ liệu riêng. Trả về { thayDoi, vuaTang, chuoi, chuoiDaiNhat, ngayCuoi }.
 * - Hôm nay đã tính rồi: không đổi.
 * - Lần cuối là hôm qua: chuỗi + 1.
 * - Bỏ lỡ từ một ngày trở lên (hoặc lần đầu): chuỗi về 1.
 */
export function tinhChuoi(rieng, homNay = ngayVN()) {
  const { chuoi = 0, chuoiDaiNhat = 0, ngayCuoi = '' } = rieng || {};
  if (ngayCuoi === homNay) return { thayDoi: false, vuaTang: false, chuoi, chuoiDaiNhat, ngayCuoi };
  const moi = ngayCuoi === ngayHomTruoc(homNay) ? chuoi + 1 : 1;
  return { thayDoi: true, vuaTang: moi > chuoi, chuoi: moi, chuoiDaiNhat: Math.max(chuoiDaiNhat, moi), ngayCuoi: homNay };
}
