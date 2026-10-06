/*
 * index.js — Chọn tầng dữ liệu: "firebase" nếu js/firebase-config.js đã điền apiKey, ngược lại "local".
 *
 * Hai bộ cài đặt (local.js, firebase.js) có cùng giao diện hàm:
 *
 *   cheDo                       'local' | 'firebase'
 *   hoTro                       { google, email, tenPin } — cách đăng nhập được hỗ trợ
 *   khoiDong()                  → { uid } | null   khôi phục phiên đăng nhập
 *   nguoiDung()                 → { uid } | null   (đồng bộ)
 *   theoDoiDangNhap(f)          → hàm huỷ
 *   dangNhapTen(ten, pin)       chỉ chế độ thử
 *   dangNhapGoogle()  dangNhapEmail(email, mk)  dangKyEmail(email, mk)  dangXuat()
 *
 *   Hồ sơ công khai — ai cũng đọc được: { uid, ten, nhanVat, ban, diem, manh, yeu }
 *   layCongKhai(uid?)  dsCongKhai()  luuCongKhai(phan)
 *   Dữ liệu riêng — chỉ chủ tài khoản: { chuoi, chuoiDaiNhat, ngayCuoi, diemChamChi, msHoc,
 *                                         lanThuongCuoi, soHuu, kiemTra }
 *   layRieng()  luuRieng(phan)  theoDoiRieng(f)
 *
 *   Sổ tay cảm xúc (riêng tư): trang = { ngay, cauHoi, traLoi, daLam, chuaLam, ngayMai, camXuc, sticker: [{ p, e, x, y, r }] }
 *   docNhatKy(tuNgay) → { 'YYYY-MM-DD': trang }      ghiNhatKy(ngay, trang)
 *
 *   Lời mời:{ id, tu, tenTu, den, maPhong, loai, trangThai: 'cho'|'nhan'|'tuchoi', luc }
 *   guiLoiMoi({ den, maPhong, loai }) → id
 *   theoDoiLoiMoi(f)            f(danhSách lời mời gửi tới tôi hoặc do tôi gửi) → hàm huỷ
 *   traLoiLoiMoi(id, dongY)
 *
 *   Phòng học
 *   Phòng: { ma, loai, soCho, chuPhong, cho: [uid|null], thanhVien: { uid: { ten, nhanVat, ban, monManh,
 *            trangThai, cho } }, tin: [...], net: { id: nét }, dongHo: { thoiLuongMs, conLaiMs, batDauLuc, dangChay } }
 *   taoPhong({ loai: 'doi'|'nhom', soCho }) → mã 6 kí tự
 *   vaoPhong(ma, { ten, nhanVat, ban, monManh })   lỗi kèm lời hướng dẫn nếu không có / đầy / đã đóng
 *   roiPhong(ma)                chỗ ngồi trống lại; phòng không còn ai thì tự đóng
 *   layPhong(ma)  theoDoiPhong(ma, f) → hàm huỷ    capNhatToi(ma, { trangThai })
 *   guiTin(ma, noiDung)         baoCao({ maPhong, tin, lyDo })
 *   themNet(ma, net)  xoaNet(ma, id)  xoaBang(ma)  — nét: { id, mau, co, tay, diem: [[x, y], ...] } (x, y: 0–1)
 *   gioMayChu() → ms            dieuKhienDongHo(ma, 'batDau'|'tamDung'|'datLai'|'datThoiLuong', phut)
 */
import { firebaseConfig } from '../firebase-config.js';

const coFirebase = Boolean(firebaseConfig && firebaseConfig.apiKey);

/** Trả về module dữ liệu phù hợp (đã nạp xong). */
export const duLieu = await (coFirebase ? import('./firebase.js') : import('./local.js'));
