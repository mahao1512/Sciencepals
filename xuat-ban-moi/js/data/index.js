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
 *   Bạn bè: { id (mã cặp), tu, den, thanhVien: [a, b], trangThai: 'cho'|'ban', luc }
 *   guiKetBan(den)  traLoiKetBan(id, dongY)  huyKetBan(id)  theoDoiKetBan(f) → hàm huỷ
 *   guiTinRieng(ban, noiDung)  theoDoiTinRieng(ban, f)  theoDoiTinCuoi(ban, f)   — chỉ bạn bè
 *
 *   Gọi video trong phòng: phong.goi = { id, nguoiMo, tenNguoiMo, luc, thamGia: { uid: phiên }, tuChoi }
 *   batDauGoi(ma, phien)  thamGiaGoi(ma, phien)  tuChoiGoi(ma)  roiGoi(ma)
 *   guiTinHieu(ma, den, goiTin)  ngheTinHieu(ma, f) → hàm huỷ    (offer / answer / ice của WebRTC)
 *
 *   Lời mời: { id, tu, tenTu, den, maPhong, loai, trangThai: 'cho'|'nhan'|'tuchoi', luc }
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
 *   chuyenTruongPhong(ma, uid)  — chỉ trưởng phòng hiện tại
 *   Ghi chú trên đề (trưởng phòng vẽ, cả phòng xem): themGhiChu(ma, trang, nét)  xoaGhiChu(ma, trang, id?)
 *                                                     theoDoiGhiChu(ma, f) — f({ trang: { id: nét } })
 *
 *   Uy tín: lần bị trừ = { den, muc, loai: 'toCao'|'vangTuc', ngay, luc } (không lưu người tố cáo)
 *   toCao({ den, muc }) → { daTruTruoc }   ghiVangTuc(muc)   dsViPham(uid)   theoDoiViPham(uid, f)
 *   Hồ sơ công khai có thêm uyTinCong (số điểm đã hồi), uyTinLuc (lần hồi gần nhất)
 *
 *   Đội thi đấu: { ma, ten, truong, thanhVien: [uid], mon: { uid: môn }, taoLuc }
 *   taoDoi(ten) → mã   layDoi(ma)   doiCuaToi()   theoDoiDoiCuaToi(f)   vaoDoi(ma, toiDa)   roiDoi(ma)
 *   boKhoiDoi(ma, uid)   doiTenDoi(ma, ten)   chonMonDoi(ma, mon)   giaiTanDoi(ma)
 *   Phòng thi: { ky, maDoi, ten, truong, thanhVien: { uid: { ten, mon } }, phan: [uid], cau: [{ mon, id, hoanVi }],
 *                hanMs, nghiMs, batDauLuc, mat: { uid }, traLoi: { i: { chon, luc } }, xong }
 *   moTran(ky, doi, tran)  layTran  theoDoiTran(ky, doi, f)  coMatTran(ky, doi) → hàm rời
 *   batDauTran  huyTran  traLoiTran(ky, doi, i, chon)  xongTran
 *   Kết quả: ghiKetQua(kq)  dsKetQua([kỳ])
 */
import { firebaseConfig } from '../firebase-config.js';

const coFirebase = Boolean(firebaseConfig && firebaseConfig.apiKey);

/** Trả về module dữ liệu phù hợp (đã nạp xong). */
export const duLieu = await (coFirebase ? import('./firebase.js') : import('./local.js'));
