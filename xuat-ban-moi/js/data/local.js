/*
 * local.js — Bộ dữ liệu "chế độ thử": lưu trong localStorage, báo thay đổi qua BroadcastChannel.
 * Mở hai tab trên cùng trình duyệt, đăng nhập hai tên khác nhau để giả làm hai học sinh.
 * Giao diện hàm giống hệt firebase.js — xem mô tả đầy đủ ở js/data/index.js.
 */
import { maNgauNhien } from '../tienich.js';
import { phanLoai } from '../cham-diem.js';
import { BAN_HOC_MAU } from './hoc-sinh-mau.js';

const K = {
  taiKhoan: 'pl_taikhoan',      // { tenThuong: { uid, pin } }
  congKhai: 'pl_congkhai',      // { uid: hồ sơ công khai }
  rieng: 'pl_rieng',            // { uid: dữ liệu riêng }
  loiMoi: 'pl_loimoi',          // [ lời mời ]
  baoCao: 'pl_baocao',          // [ tin nhắn bị báo cáo ]
  ketBan: 'pl_ketban',          // { mã cặp: lời mời / quan hệ bạn bè }
  viPham: 'pl_vipham',          // [ { den, muc, loai, ngay, luc } ] — lần bị trừ uy tín
  daToCao: 'pl_datocao',        // { 'tu_den_ngày': true } — mỗi người chỉ trừ uy tín một bạn một lần mỗi ngày
  doi: 'pl_doi',                // { mã đội: đội thi đấu }
  ketQua: 'pl_ketqua',          // { 'kỳ_mã đội': kết quả thi đấu }
  tran: (ky, doi) => 'pl_tran_' + ky + '_' + doi,   // phòng thi của một đội trong một kỳ
  phong: (ma) => 'pl_phong_' + ma,
  de: (ma) => 'pl_de_' + ma,            // đề bài đang dùng của phòng (để riêng vì ảnh khá nặng)
  deCho: (ma) => 'pl_decho_' + ma,      // { uid: đề đang chờ trưởng phòng duyệt }
  phien: 'pl_phien'             // uid đang đăng nhập
};

const doc = (k, macDinh) => { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? macDinh; } catch (e) { return macDinh; } };
const ghi = (k, v) => localStorage.setItem(k, JSON.stringify(v));
const xoa = (k) => localStorage.removeItem(k);

/* ---------- Báo thay đổi giữa các tab ---------- */
const kenh = 'BroadcastChannel' in window ? new BroadcastChannel('peer-learning') : null;
const nguoiNghe = new Map(); // chuDe -> Set(hàm)
function phat(chuDe) {
  (nguoiNghe.get(chuDe) || []).forEach((f) => f());
  kenh && kenh.postMessage({ chuDe });
}
if (kenh) kenh.onmessage = (e) => (nguoiNghe.get(e.data.chuDe) || []).forEach((f) => f());
function nghe(chuDe, f) {
  if (!nguoiNghe.has(chuDe)) nguoiNghe.set(chuDe, new Set());
  nguoiNghe.get(chuDe).add(f);
  return () => nguoiNghe.get(chuDe).delete(f);
}

/* ---------- Bạn học mẫu (để màn hình tìm bạn không trống) ---------- */
(function gieoBanMau() {
  const ck = doc(K.congKhai, {});
  let doi = false;
  BAN_HOC_MAU.forEach((b, i) => {
    if (ck[b.uid]) {
      if (!ck[b.uid].maId) { ck[b.uid].maId = 'MAU' + String(i + 1).padStart(5, '0'); doi = true; } // bạn mẫu tạo từ bản cũ chưa có ID
      return;
    }
    const { manh, yeu } = phanLoai(b.diem);
    ck[b.uid] = { ...b, manh, yeu, mau: true, maId: 'MAU' + String(i + 1).padStart(5, '0'), capNhat: Date.now() };
    doi = true;
  });
  if (doi) ghi(K.congKhai, ck);
})();

/* ---------- Đăng nhập ---------- */
let uidHienTai = null;
const nguoiNgheDangNhap = new Set();
const bamPin = (ten, pin) => { let x = 5381; for (const c of 'pl|' + ten + '|' + pin) x = (x * 33) ^ c.charCodeAt(0); return (x >>> 0).toString(36); };
function datPhien(uid) {
  uidHienTai = uid;
  // Mỗi tab giữ phiên riêng (sessionStorage) để hai tab có thể là hai học sinh khác nhau
  try { uid ? sessionStorage.setItem(K.phien, uid) : sessionStorage.removeItem(K.phien); } catch (e) { /* bỏ qua */ }
  try { uid ? localStorage.setItem(K.phien, uid) : localStorage.removeItem(K.phien); } catch (e) { /* bỏ qua */ }
  nguoiNgheDangNhap.forEach((f) => f(uid ? { uid } : null));
}

function riengMacDinh() {
  return {
    chuoi: 0, chuoiDaiNhat: 0, ngayCuoi: '',
    diemChamChi: 0, msHoc: 0, lanThuongCuoi: 0,
    soHuu: { ban: ['go-soi'], phuKien: ['khong'], mauToc: [] },
    kiemTra: null
  };
}

export const cheDo = 'local';
export const hoTro = { google: false, email: false, tenPin: true };

export async function khoiDong() {
  let uid = null;
  try { uid = sessionStorage.getItem(K.phien) || localStorage.getItem(K.phien); } catch (e) { /* bỏ qua */ }
  const tk = Object.values(doc(K.taiKhoan, {}));
  if (uid && !tk.some((t) => t.uid === uid)) uid = null;
  datPhien(uid);
  return uid ? { uid } : null;
}
export const nguoiDung = () => (uidHienTai ? { uid: uidHienTai } : null);
export function theoDoiDangNhap(f) { nguoiNgheDangNhap.add(f); return () => nguoiNgheDangNhap.delete(f); }

export async function dangNhapTen(ten, pin) {
  ten = String(ten || '').trim().replace(/\s+/g, ' ');
  if (!ten) throw new Error('Vui lòng nhập tên của bạn.');
  if (!/^\d{4}$/.test(pin)) throw new Error('Mã PIN gồm đúng 4 chữ số.');
  const khoa = ten.toLowerCase();
  const tk = doc(K.taiKhoan, {});
  if (tk[khoa]) {
    if (tk[khoa].pin !== bamPin(khoa, pin)) throw new Error('Sai mã PIN cho tên này. Nếu bạn là người mới, hãy chọn tên khác.');
  } else {
    tk[khoa] = { uid: 'n_' + maNgauNhien(10).toLowerCase(), pin: bamPin(khoa, pin), tenGoc: ten };
    ghi(K.taiKhoan, tk);
  }
  datPhien(tk[khoa].uid);
  return { uid: tk[khoa].uid, tenGoiY: ten };
}
export async function dangNhapGoogle() { throw new Error('Chế độ thử chưa hỗ trợ Google. Hãy đăng nhập bằng tên và mã PIN.'); }
export async function dangNhapEmail() { throw new Error('Chế độ thử chưa hỗ trợ email. Hãy đăng nhập bằng tên và mã PIN.'); }
export const dangKyEmail = dangNhapEmail;
export async function dangXuat() { datPhien(null); }

/* ---------- Hồ sơ ---------- */
export async function layCongKhai(uid = uidHienTai) { return doc(K.congKhai, {})[uid] || null; }
export async function dsCongKhai() { return Object.values(doc(K.congKhai, {})); }
/** Tìm hồ sơ công khai theo ID tài khoản (8 kí tự). */
export async function timTheoId(maId) {
  return Object.values(doc(K.congKhai, {})).find((h) => h.maId === maId) || null;
}
export async function luuCongKhai(phan) {
  const ck = doc(K.congKhai, {});
  ck[uidHienTai] = { ...(ck[uidHienTai] || {}), ...phan, uid: uidHienTai, capNhat: Date.now() };
  ghi(K.congKhai, ck);
  phat('congkhai');
  return ck[uidHienTai];
}
export async function layRieng() {
  const r = doc(K.rieng, {})[uidHienTai];
  return { ...riengMacDinh(), ...(r || {}) };
}
export async function luuRieng(phan) {
  const tat = doc(K.rieng, {});
  tat[uidHienTai] = { ...riengMacDinh(), ...(tat[uidHienTai] || {}), ...phan };
  ghi(K.rieng, tat);
  phat('rieng:' + uidHienTai);
  return tat[uidHienTai];
}
export function theoDoiRieng(f) {
  const uid = uidHienTai;
  return nghe('rieng:' + uid, async () => f(await layRieng()));
}

/* ---------- Sổ tay cảm xúc (riêng tư, chỉ chủ tài khoản) ---------- */
const khoaNhatKy = () => 'pl_nhatky_' + uidHienTai;
/** Các trang nhật ký từ ngày `tu` (YYYY-MM-DD) trở đi: { 'YYYY-MM-DD': trang } */
export async function docNhatKy(tu) {
  const tat = doc(khoaNhatKy(), {});
  return Object.fromEntries(Object.entries(tat).filter(([ngay]) => ngay >= tu));
}
export async function ghiNhatKy(ngay, trang) {
  const tat = doc(khoaNhatKy(), {});
  tat[ngay] = { ...trang, ngay, capNhat: Date.now() };
  try { ghi(khoaNhatKy(), tat); }
  catch (e) { throw new Error('Bộ nhớ của chế độ thử đã đầy, chưa lưu được trang này.'); }
}

/* ---------- Bạn bè & tin nhắn riêng ----------
 * Kết bạn: { id (= mã cặp), tu, den, thanhVien: [a, b], trangThai: 'cho' | 'ban', luc }
 * Từ chối / huỷ kết bạn = xoá. Chỉ bạn bè (trangThai 'ban') mới nhắn tin riêng được.
 */
export const maCap = (a, b) => [a, b].sort().join('~');
const khoaTinRieng = (cap) => 'pl_tr_' + cap;
export async function guiKetBan(den) {
  const ds = doc(K.ketBan, {});
  const id = maCap(uidHienTai, den);
  if (ds[id]) return ds[id];
  ds[id] = { id, tu: uidHienTai, den, thanhVien: [uidHienTai, den], trangThai: 'cho', luc: Date.now() };
  ghi(K.ketBan, ds);
  phat('ketban');
  // Chế độ thử: bạn mẫu tự đồng ý sau một chút để thử được nhắn tin
  if (den.startsWith('mau_')) {
    setTimeout(() => {
      const d = doc(K.ketBan, {});
      if (d[id]?.trangThai === 'cho') { d[id].trangThai = 'ban'; d[id].luc = Date.now(); ghi(K.ketBan, d); phat('ketban'); }
    }, 1500);
  }
  return ds[id];
}
export async function traLoiKetBan(id, dongY) {
  const ds = doc(K.ketBan, {});
  if (!ds[id] || ds[id].den !== uidHienTai) throw new Error('Lời mời kết bạn không còn nữa.');
  if (dongY) { ds[id].trangThai = 'ban'; ds[id].luc = Date.now(); } else delete ds[id];
  ghi(K.ketBan, ds);
  phat('ketban');
}
export async function huyKetBan(id) {
  const ds = doc(K.ketBan, {});
  if (!ds[id]?.thanhVien.includes(uidHienTai)) return;
  delete ds[id];
  ghi(K.ketBan, ds);
  phat('ketban');
}
/** f(danhSách kết bạn có mình) */
export function theoDoiKetBan(f) {
  const uid = uidHienTai;
  const goi = () => f(Object.values(doc(K.ketBan, {})).filter((k) => k.thanhVien.includes(uid)));
  goi();
  return nghe('ketban', goi);
}
function laBanBe(ban) {
  return doc(K.ketBan, {})[maCap(uidHienTai, ban)]?.trangThai === 'ban';
}
export async function guiTinRieng(ban, noiDung) {
  if (!laBanBe(ban)) throw new Error('Hai bạn cần kết bạn trước khi nhắn tin.');
  const cap = maCap(uidHienTai, ban);
  const ds = doc(khoaTinRieng(cap), []);
  ds.push({ id: maNgauNhien(10), tu: uidHienTai, noiDung, luc: Date.now() });
  try { ghi(khoaTinRieng(cap), ds.slice(-300)); }
  catch (e) { throw new Error('Bộ nhớ của chế độ thử đã đầy.'); }
  phat('tinrieng:' + cap);
}
/** f(danh sách tin nhắn, cũ → mới) */
export function theoDoiTinRieng(ban, f) {
  const cap = maCap(uidHienTai, ban);
  const goi = () => f(laBanBe(ban) ? doc(khoaTinRieng(cap), []) : []);
  goi();
  const h1 = nghe('tinrieng:' + cap, goi);
  const h2 = nghe('ketban', goi);
  return () => { h1(); h2(); };
}
/** f(tin cuối cùng hoặc null) — dùng để đếm tin chưa đọc */
export function theoDoiTinCuoi(ban, f) {
  return theoDoiTinRieng(ban, (ds) => f(ds[ds.length - 1] || null));
}

/* ---------- Lời mời ---------- */
const HAN_LOI_MOI = 2 * 60 * 60 * 1000; // lời mời quá 2 giờ thì bỏ
export async function guiLoiMoi({ den, maPhong, loai }) {
  const ds = doc(K.loiMoi, []).filter((x) => Date.now() - x.luc < HAN_LOI_MOI);
  const toi = await layCongKhai();
  const lm = { id: maNgauNhien(10), tu: uidHienTai, tenTu: toi?.ten || '', den, maPhong, loai, trangThai: 'cho', luc: Date.now() };
  ds.push(lm);
  ghi(K.loiMoi, ds);
  phat('loimoi');
  return lm.id;
}
/** Gọi f(danhSách) mỗi khi có thay đổi: các lời mời gửi tới tôi hoặc do tôi gửi (còn hạn). */
export function theoDoiLoiMoi(f) {
  const uid = uidHienTai;
  const goi = () => f(doc(K.loiMoi, []).filter((x) => (x.den === uid || x.tu === uid) && Date.now() - x.luc < HAN_LOI_MOI));
  goi();
  return nghe('loimoi', goi);
}
export async function traLoiLoiMoi(id, dongY) {
  const ds = doc(K.loiMoi, []);
  const lm = ds.find((x) => x.id === id && x.den === uidHienTai);
  if (!lm) throw new Error('Lời mời không còn nữa.');
  lm.trangThai = dongY ? 'nhan' : 'tuchoi';
  ghi(K.loiMoi, ds);
  phat('loimoi');
  return lm;
}

/* ---------- Phòng học ---------- */
export async function taoPhong({ loai, soCho }) {
  let ma;
  do { ma = maNgauNhien(6); } while (localStorage.getItem(K.phong(ma)));
  const thoiLuong = 25 * 60 * 1000;
  ghi(K.phong(ma), {
    ma, loai, soCho, chuPhong: uidHienTai, taoLuc: Date.now(),
    cho: Array(soCho).fill(null),          // cho[i] = uid người ngồi ghế i
    thanhVien: {},                          // uid -> { ten, nhanVat, ban, monManh, trangThai, cho, nhip }
    tin: [], net: {},
    dongHo: { thoiLuongMs: thoiLuong, conLaiMs: thoiLuong, batDauLuc: null, dangChay: false },
    trongTu: null                           // lúc phòng bắt đầu không còn ai
  });
  return ma;
}

const NHIP_MS = 20 * 1000;          // mỗi 20 giây báo "tôi vẫn ở đây"
const MAT_NHIP_MS = 150 * 1000;     // quá 150 giây không báo thì coi như đã rời (tab bị tắt đột ngột)
const AN_HAN_MS = 60 * 1000;        // phòng trống quá 60 giây thì đóng (chừa thời gian tải lại trang)
const PHONG_CHUA_VAO_MS = 2 * 60 * 60 * 1000; // phòng tạo xong mà không ai vào quá 2 giờ thì đóng

const docPhong = (ma) => doc(K.phong(ma), null);
/** Sửa phòng: hàm `f(phong)` thay đổi trực tiếp; trả về false để không lưu. */
function suaPhong(ma, f) {
  const p = docPhong(ma);
  if (!p) throw new Error(`Phòng ${ma} không còn nữa.`);
  if (f(p) === false) return p;
  ghi(K.phong(ma), p);
  phat('phong:' + ma);
  return p;
}
/** Bỏ thành viên đã mất nhịp; trả về true nếu có thay đổi. */
function donThanhVien(p) {
  let doi = false;
  Object.entries(p.thanhVien).forEach(([uid, tv]) => {
    if (Date.now() - tv.nhip > MAT_NHIP_MS) {
      delete p.thanhVien[uid];
      p.cho = p.cho.map((u) => (u === uid ? null : u));
      doi = true;
    }
  });
  if (doi) chuyenChuPhong(p);
  return doi;
}
/** Trưởng phòng vắng mặt quá AN_HAN_MS (không phải chỉ tải lại trang) thì chuyển quyền cho người vào sớm nhất. */
function chuyenChuPhong(p) {
  const con = Object.keys(p.thanhVien);
  // Ai đã rời phòng thì cũng rời cuộc gọi video; cuộc gọi không còn ai thì kết thúc
  if (p.goi) {
    Object.keys(p.goi.thamGia || {}).forEach((u) => { if (!p.thanhVien[u]) delete p.goi.thamGia[u]; });
    if (!Object.keys(p.goi.thamGia || {}).length) delete p.goi;
  }
  if (!con.length) { p.trongTu = p.trongTu || Date.now(); return; }
  p.trongTu = null;
  if (p.thanhVien[p.chuPhong]) { p.chuVangTu = null; return; }
  if (p.chuVangTu && Date.now() - p.chuVangTu < AN_HAN_MS) return; // chờ trưởng phòng quay lại
  p.chuVangTu = null;
  p.chuPhong = con.sort((a, b) => p.thanhVien[a].vaoLuc - p.thanhVien[b].vaoLuc)[0];
}
/** Phòng đã đóng chưa (không còn ai đủ lâu). */
function daDong(p) {
  if (Object.keys(p.thanhVien).length) return false;
  if (p.trongTu) return Date.now() - p.trongTu > AN_HAN_MS;
  return Date.now() - p.taoLuc > PHONG_CHUA_VAO_MS;
}

/** Xoá phòng cùng đề bài của phòng. */
function xoaPhongHet(ma) {
  xoa(K.phong(ma));
  xoa(K.de(ma));
  xoa(K.deCho(ma));
}

// Dọn phòng đã đóng (không còn ai đủ lâu) mỗi lần mở trang
setTimeout(() => {
  Object.keys(localStorage).filter((k) => k.startsWith('pl_phong_')).forEach((k) => {
    const p = doc(k, null);
    if (p && !Object.keys(p.thanhVien).length && daDong(p)) xoaPhongHet(k.slice(9));
  });
  // Đề của phòng không còn tồn tại
  Object.keys(localStorage).filter((k) => /^pl_de(cho)?_/.test(k)).forEach((k) => {
    if (!localStorage.getItem('pl_phong_' + k.split('_').pop())) xoa(k);
  });
}, 0);

let nhipHienTai = null;
export async function vaoPhong(ma, { ten, nhanVat, ban, monManh }) {
  const p0 = docPhong(ma);
  if (!p0) throw new Error(`Không tìm thấy phòng ${ma}. Kiểm tra lại mã hoặc nhờ bạn gửi mã mới.`);
  let loi = null;
  const p = suaPhong(ma, (p) => {
    donThanhVien(p);
    if (!p.thanhVien[uidHienTai] && daDong(p)) { loi = `Phòng ${ma} đã đóng vì không còn ai. Hãy tạo phòng mới ở trang chủ.`; return false; }
    let cho = p.cho.indexOf(uidHienTai);
    if (cho < 0) cho = p.cho.indexOf(null);
    if (cho < 0) { loi = `Phòng ${ma} đã đủ ${p.soCho} người. Bạn hỏi lại bạn mình hoặc tạo phòng mới nhé.`; return false; }
    p.cho[cho] = uidHienTai;
    const cu = p.thanhVien[uidHienTai];
    p.thanhVien[uidHienTai] = { ten, nhanVat, ban, monManh, trangThai: cu?.trangThai || 'vui-ve', cho, vaoLuc: cu?.vaoLuc || Date.now(), nhip: Date.now() };
    chuyenChuPhong(p);
  });
  if (loi) { if (daDong(p)) xoaPhongHet(ma); throw new Error(loi); }

  // Nhịp tim + rời phòng khi đóng tab
  clearInterval(nhipHienTai);
  nhipHienTai = setInterval(() => {
    try {
      suaPhong(ma, (p) => {
        donThanhVien(p);
        chuyenChuPhong(p);
        if (p.thanhVien[uidHienTai]) p.thanhVien[uidHienTai].nhip = Date.now();
      });
    } catch (e) { clearInterval(nhipHienTai); }
  }, NHIP_MS);
  addEventListener('pagehide', () => roiPhong(ma, { tamThoi: true }), { once: true });
  return p;
}

/** Rời phòng. `tamThoi`: đóng/tải lại tab — phòng trống vẫn giữ thêm một lúc. */
export async function roiPhong(ma, { tamThoi = false } = {}) {
  clearInterval(nhipHienTai);
  if (!docPhong(ma)) return;
  const p = suaPhong(ma, (p) => {
    if (!p.thanhVien[uidHienTai]) return false;
    delete p.thanhVien[uidHienTai];
    p.cho = p.cho.map((u) => (u === uidHienTai ? null : u));
    // Tải lại trang: giữ quyền trưởng phòng thêm một lúc; bấm "Rời phòng": chuyển quyền ngay
    if (p.chuPhong === uidHienTai) p.chuVangTu = tamThoi ? Date.now() : null;
    chuyenChuPhong(p);
  });
  if (!tamThoi && !Object.keys(p.thanhVien).length) { xoaPhongHet(ma); phat('phong:' + ma); }
}

export async function layPhong(ma) { return docPhong(ma); }
export function theoDoiPhong(ma, f) {
  f(docPhong(ma));
  return nghe('phong:' + ma, () => f(docPhong(ma)));
}
export async function capNhatToi(ma, phan) {
  suaPhong(ma, (p) => { if (!p.thanhVien[uidHienTai]) return false; Object.assign(p.thanhVien[uidHienTai], phan); });
}

/* Trò chuyện */
export async function guiTin(ma, noiDung) {
  suaPhong(ma, (p) => {
    const tv = p.thanhVien[uidHienTai];
    if (!tv) return false;
    p.tin.push({ id: maNgauNhien(10), uid: uidHienTai, ten: tv.ten, noiDung, luc: Date.now() });
    if (p.tin.length > 200) p.tin = p.tin.slice(-200);
  });
}
export async function baoCao({ maPhong, tin, lyDo }) {
  const ds = doc(K.baoCao, []);
  ds.push({ maPhong, tin, lyDo: lyDo || '', nguoiBao: uidHienTai, luc: Date.now() });
  ghi(K.baoCao, ds);
}

/* Bảng trắng: mỗi nét là { id, uid, mau, co, tay, diem: [[x,y],...] } với x, y trong khoảng 0–1 */
export async function themNet(ma, net) {
  suaPhong(ma, (p) => {
    if (!p.thanhVien[uidHienTai]) return false;
    p.net[net.id] = { ...net, uid: uidHienTai, luc: Date.now() };
  });
}
export async function xoaNet(ma, id) {
  suaPhong(ma, (p) => { if (p.net[id]?.uid !== uidHienTai) return false; delete p.net[id]; });
}
export async function xoaBang(ma) {
  suaPhong(ma, (p) => { if (!p.thanhVien[uidHienTai]) return false; p.net = {}; });
}

/* Trang trí phòng chung (chỉ trưởng phòng): tường và kiểu kệ sách của cả phòng */
export async function trangTriPhong(ma, { tuong, ke }) {
  suaPhong(ma, (p) => {
    if (p.chuPhong !== uidHienTai) return false;
    if (tuong) p.tuong = String(tuong).slice(0, 30);
    if (ke) p.ke = String(ke).slice(0, 30);
  });
  if (docPhong(ma)?.chuPhong !== uidHienTai) throw new Error('Chỉ trưởng phòng mới trang trí được phòng.');
}

/* Gọi video — p.goi ={ id, nguoiMo, tenNguoiMo, luc, thamGia: { uid: mã phiên }, tuChoi: { uid: true } }
 * Ai trong phòng cũng bắt đầu được; mỗi người tự đồng ý thì mới vào. */
export async function batDauGoi(ma, phien) {
  suaPhong(ma, (p) => {
    const tv = p.thanhVien[uidHienTai];
    if (!tv) return false;
    if (!p.goi) p.goi = { id: maNgauNhien(8), nguoiMo: uidHienTai, tenNguoiMo: tv.ten, luc: Date.now(), thamGia: {}, tuChoi: {} };
    p.goi.thamGia[uidHienTai] = phien;
    delete p.goi.tuChoi?.[uidHienTai];
  });
  return docPhong(ma).goi;
}
export async function thamGiaGoi(ma, phien) {
  suaPhong(ma, (p) => {
    if (!p.goi || !p.thanhVien[uidHienTai]) return false;
    p.goi.thamGia[uidHienTai] = phien;
    delete p.goi.tuChoi?.[uidHienTai];
  });
  if (!docPhong(ma)?.goi) throw new Error('Cuộc gọi đã kết thúc.');
}
export async function tuChoiGoi(ma) {
  suaPhong(ma, (p) => { if (!p.goi) return false; p.goi.tuChoi = { ...(p.goi.tuChoi || {}), [uidHienTai]: true }; });
}
export async function roiGoi(ma) {
  if (!docPhong(ma)) return;
  suaPhong(ma, (p) => {
    if (!p.goi?.thamGia?.[uidHienTai]) return false;
    delete p.goi.thamGia[uidHienTai];
    if (!Object.keys(p.goi.thamGia).length) delete p.goi;
  });
}
// Tín hiệu kết nối (offer / answer / ice) giữa hai tab: gửi thẳng qua BroadcastChannel, không lưu lại
const kenhTinHieu = 'BroadcastChannel' in window ? new BroadcastChannel('pl-tin-hieu') : null;
export async function guiTinHieu(ma, den, goiTin) {
  kenhTinHieu?.postMessage({ ma, den, ...goiTin, tu: uidHienTai });
}
export function ngheTinHieu(ma, f) {
  if (!kenhTinHieu) return () => {};
  const nghe1 = (e) => { if (e.data.ma === ma && e.data.den === uidHienTai) f(e.data); };
  kenhTinHieu.addEventListener('message', nghe1);
  return () => kenhTinHieu.removeEventListener('message', nghe1);
}

/* Đề bài chung — ai cũng gửi được, trưởng phòng duyệt; đề của trưởng phòng lên ngay.
 * Đề: { nguoiGui, ten, tenFile, soTrang, luc, trang: [dataURL JPEG] } */
export const kichThuocAnhDe = 110 * 1000; // localStorage chỉ ~5 MB nên ảnh ở chế độ thử nén nhỏ hơn
function ghiDe(k, v) {
  try { ghi(k, v); }
  catch (e) { throw new Error('Bộ nhớ của chế độ thử đã đầy. Hãy gửi ít trang hơn (bản chạy thật không bị giới hạn này).'); }
}
/** Đề đổi hoặc bị gỡ thì ghi chú của trưởng phòng trên đề cũ cũng bỏ đi. */
function xoaHetGhiChu(ma) {
  if (docPhong(ma)?.ghiChuDe) suaPhong(ma, (p) => { delete p.ghiChuDe; });
}
export async function guiDe(ma, { tenFile, trang }) {
  const p = docPhong(ma);
  const tv = p?.thanhVien[uidHienTai];
  if (!tv) throw new Error('Bạn cần ở trong phòng để gửi đề.');
  const de = { nguoiGui: uidHienTai, ten: tv.ten, tenFile, soTrang: trang.length, luc: Date.now(), trang };
  if (p.chuPhong === uidHienTai) {
    ghiDe(K.de(ma), de);
    xoaHetGhiChu(ma);
  } else {
    const cho = doc(K.deCho(ma), {});
    cho[uidHienTai] = { ...de, trangThai: 'cho' };
    ghiDe(K.deCho(ma), cho);
  }
  phat('de:' + ma);
  return p.chuPhong === uidHienTai ? 'da-dua-len' : 'cho-duyet';
}
export async function duyetDe(ma, uid, dongY) {
  const p = docPhong(ma);
  if (p?.chuPhong !== uidHienTai) throw new Error('Chỉ trưởng phòng mới duyệt được đề.');
  const cho = doc(K.deCho(ma), {});
  const de = cho[uid];
  if (!de) throw new Error('Đề này không còn chờ duyệt nữa.');
  if (dongY) {
    const { trangThai, ...sach } = de;
    ghiDe(K.de(ma), sach);
    xoaHetGhiChu(ma);
    delete cho[uid];
  } else cho[uid].trangThai = 'tuchoi';
  ghi(K.deCho(ma), cho);
  phat('de:' + ma);
}
/** Người gửi huỷ đề đang chờ (hoặc xác nhận đã biết bị từ chối). */
export async function huyDeCho(ma) {
  const cho = doc(K.deCho(ma), {});
  delete cho[uidHienTai];
  ghi(K.deCho(ma), cho);
  phat('de:' + ma);
}
export async function goDe(ma) {
  if (docPhong(ma)?.chuPhong !== uidHienTai) throw new Error('Chỉ trưởng phòng mới gỡ được đề.');
  xoa(K.de(ma));
  xoaHetGhiChu(ma);
  phat('de:' + ma);
}

/* Ghi chú trên đề (chỉ trưởng phòng vẽ, cả phòng xem): p.ghiChuDe = { số trang: { id: nét } }
 * Nét cùng dạng với bảng trắng (toạ độ 0–1 theo khung ảnh của trang đề). */
export async function themGhiChu(ma, trang, net) {
  suaPhong(ma, (p) => {
    if (p.chuPhong !== uidHienTai) return false;
    p.ghiChuDe = p.ghiChuDe || {};
    p.ghiChuDe[trang] = { ...(p.ghiChuDe[trang] || {}), [net.id]: { ...net, uid: uidHienTai, luc: Date.now() } };
  });
  if (docPhong(ma)?.chuPhong !== uidHienTai) throw new Error('Chỉ trưởng phòng mới ghi chú được trên đề.');
}
export async function xoaGhiChu(ma, trang, id) {
  suaPhong(ma, (p) => {
    if (p.chuPhong !== uidHienTai || !p.ghiChuDe?.[trang]) return false;
    if (id) delete p.ghiChuDe[trang][id];
    else delete p.ghiChuDe[trang];
  });
}
/** f({ số trang: { id: nét } }) */
export function theoDoiGhiChu(ma, f) {
  let dau = null;
  const goi = () => {
    const g = docPhong(ma)?.ghiChuDe || {};
    const moi = JSON.stringify(g);
    if (moi === dau) return;
    dau = moi;
    f(g);
  };
  goi();
  return nghe('phong:' + ma, goi);
}

/* Chuyển quyền trưởng phòng (chỉ trưởng phòng hiện tại, cho người đang ở trong phòng) */
export async function chuyenTruongPhong(ma, uid) {
  let loi = '';
  suaPhong(ma, (p) => {
    if (p.chuPhong !== uidHienTai) { loi = 'Chỉ trưởng phòng mới chuyển quyền được.'; return false; }
    if (!p.thanhVien[uid]) { loi = 'Bạn này không còn ở trong phòng.'; return false; }
    p.chuPhong = uid;
    p.chuVangTu = null;
  });
  if (loi) throw new Error(loi);
}
/** f({ de, deCho }) — deCho: trưởng phòng thấy mọi đề chờ duyệt, người khác chỉ thấy đề của mình. */
export function theoDoiDe(ma, f) {
  const goi = () => {
    const p = docPhong(ma);
    const tatCa = doc(K.deCho(ma), {});
    const deCho = p?.chuPhong === uidHienTai ? tatCa : (tatCa[uidHienTai] ? { [uidHienTai]: tatCa[uidHienTai] } : {});
    f({ de: doc(K.de(ma), null), deCho });
  };
  goi();
  let chuCu = docPhong(ma)?.chuPhong;
  const h1 = nghe('de:' + ma, goi);
  const h2 = nghe('phong:' + ma, () => { // chỉ đọc lại đề khi trưởng phòng đổi người
    const chu = docPhong(ma)?.chuPhong;
    if (chu !== chuCu) { chuCu = chu; goi(); }
  });
  return () => { h1(); h2(); };
}

/* Đồng hồ phòng — chỉ trưởng phòng điều khiển. Mốc bắt đầu lấy theo giờ "máy chủ".
 * Chế độ thử có thể giả lập giờ khác (plDoiGio trong Console) để thử Thi Đấu ngoài cuối tuần. */
let lechGioThu = Number(localStorage.getItem('pl_lech_gio')) || 0;
export const gioMayChu = () => Date.now() + lechGioThu;
export function datLechGio(ms) {
  lechGioThu = Number(ms) || 0;
  lechGioThu ? localStorage.setItem('pl_lech_gio', String(lechGioThu)) : localStorage.removeItem('pl_lech_gio');
}
export async function dieuKhienDongHo(ma, hanhDong, phut) {
  suaPhong(ma, (p) => {
    if (p.chuPhong !== uidHienTai) return false;
    const d = p.dongHo;
    const conLai = d.dangChay ? Math.max(0, d.conLaiMs - (gioMayChu() - d.batDauLuc)) : d.conLaiMs;
    if (hanhDong === 'batDau' && !d.dangChay && conLai > 0) p.dongHo = { ...d, conLaiMs: conLai, batDauLuc: gioMayChu(), dangChay: true };
    else if (hanhDong === 'tamDung') p.dongHo = { ...d, conLaiMs: conLai, batDauLuc: null, dangChay: false };
    else if (hanhDong === 'datLai') p.dongHo = { ...d, conLaiMs: d.thoiLuongMs, batDauLuc: null, dangChay: false };
    else if (hanhDong === 'datThoiLuong') {
      const ms = Math.round(phut * 60 * 1000);
      p.dongHo = { thoiLuongMs: ms, conLaiMs: ms, batDauLuc: null, dangChay: false };
    } else return false;
  });
}

/* ---------- Uy tín ----------
 * Mỗi lần bị trừ là một bản ghi { den, muc, loai: 'toCao' | 'vangTuc', ngay, luc }. Không lưu ai tố cáo.
 * Uy tín = 100 − tổng mức bị trừ + số điểm đã hồi (hồ sơ công khai: uyTinCong), giữ trong 0–100 (xem js/uy-tin.js).
 */
const ngaySo = () => Math.floor((gioMayChu() + 7 * 3600e3) / 864e5); // số thứ tự ngày theo giờ Việt Nam
/** Tố cáo: trừ uy tín bạn `den`. Mỗi người chỉ trừ một bạn một lần mỗi ngày. Trả về { daTruTruoc } */
export async function toCao({ den, muc }) {
  if (!den || den === uidHienTai) throw new Error('Không tự tố cáo chính mình được.');
  const khoa = uidHienTai + '_' + den + '_' + ngaySo();
  const da = doc(K.daToCao, {});
  if (da[khoa]) return { daTruTruoc: true };
  da[khoa] = true;
  ghi(K.daToCao, da);
  const ds = doc(K.viPham, []);
  ds.push({ den, muc: Math.max(5, Math.min(10, Math.round(muc))), loai: 'toCao', ngay: ngaySo(), luc: gioMayChu() });
  ghi(K.viPham, ds);
  phat('vipham');
  return { daTruTruoc: false };
}
/** Văng tục: tự trừ uy tín của chính mình. */
export async function ghiVangTuc(muc) {
  const ds = doc(K.viPham, []);
  ds.push({ den: uidHienTai, muc: Math.max(5, Math.min(10, Math.round(muc))), loai: 'vangTuc', ngay: ngaySo(), luc: gioMayChu() });
  ghi(K.viPham, ds);
  phat('vipham');
}
export async function dsViPham(uid = uidHienTai) {
  return doc(K.viPham, []).filter((v) => v.den === uid);
}
/** f(danh sách lần bị trừ uy tín của `uid`) */
export function theoDoiViPham(uid, f) {
  const goi = () => f(doc(K.viPham, []).filter((v) => v.den === uid));
  goi();
  return nghe('vipham', goi);
}

/* ---------- Đội thi đấu: { ma, ten, truong, thanhVien: [uid], mon: { uid: mã môn }, taoLuc } ---------- */
const docDoi = () => doc(K.doi, {});
function suaDoi(ma, f) {
  const ds = docDoi();
  const d = ds[ma];
  if (!d) throw new Error('Không tìm thấy đội ' + ma + '. Kiểm tra lại mã đội.');
  const kq = f(d);
  if (kq === 'xoa') delete ds[ma];
  ghi(K.doi, ds);
  phat('doi');
  return ds[ma] || null;
}
export async function taoDoi(ten) {
  let ma;
  do { ma = maNgauNhien(6); } while (docDoi()[ma]);
  const ds = docDoi();
  ds[ma] = { ma, ten: String(ten).slice(0, 30), truong: uidHienTai, thanhVien: [uidHienTai], mon: {}, taoLuc: Date.now() };
  ghi(K.doi, ds);
  phat('doi');
  return ma;
}
export async function layDoi(ma) { return docDoi()[ma] || null; }
export async function doiCuaToi() { return Object.values(docDoi()).filter((d) => d.thanhVien.includes(uidHienTai)); }
export function theoDoiDoiCuaToi(f) {
  const uid = uidHienTai;
  const goi = () => f(Object.values(docDoi()).filter((d) => d.thanhVien.includes(uid)));
  goi();
  return nghe('doi', goi);
}
export async function vaoDoi(ma, toiDa) {
  suaDoi(ma, (d) => {
    if (d.thanhVien.includes(uidHienTai)) return;
    if (d.thanhVien.length >= toiDa) throw new Error(`Đội đã đủ ${toiDa} người.`);
    d.thanhVien.push(uidHienTai);
  });
}
export async function roiDoi(ma) {
  suaDoi(ma, (d) => {
    if (d.truong === uidHienTai) throw new Error('Đội trưởng không rời đội được. Bạn có thể giải tán đội.');
    d.thanhVien = d.thanhVien.filter((u) => u !== uidHienTai);
    delete d.mon[uidHienTai];
  });
}
/** Đội trưởng mời một thành viên ra khỏi đội. */
export async function boKhoiDoi(ma, uid) {
  suaDoi(ma, (d) => {
    if (d.truong !== uidHienTai) throw new Error('Chỉ đội trưởng mới làm được việc này.');
    if (uid === d.truong) return;
    d.thanhVien = d.thanhVien.filter((u) => u !== uid);
    delete d.mon[uid];
  });
}
export async function doiTenDoi(ma, ten) {
  suaDoi(ma, (d) => {
    if (d.truong !== uidHienTai) throw new Error('Chỉ đội trưởng mới đổi được tên đội.');
    d.ten = String(ten).slice(0, 30);
  });
}
/** Chọn môn mình sẽ thi trong đội (mỗi người một môn, không trùng nhau). */
export async function chonMonDoi(ma, mon) {
  suaDoi(ma, (d) => {
    if (!d.thanhVien.includes(uidHienTai)) throw new Error('Bạn không còn ở trong đội này.');
    if (mon && Object.entries(d.mon).some(([u, m]) => u !== uidHienTai && m === mon)) throw new Error('Môn này đã có bạn khác trong đội chọn.');
    if (mon) d.mon[uidHienTai] = mon; else delete d.mon[uidHienTai];
  });
}
export async function giaiTanDoi(ma) {
  suaDoi(ma, (d) => {
    if (d.truong !== uidHienTai) throw new Error('Chỉ đội trưởng mới giải tán được đội.');
    return 'xoa';
  });
}

/* ---------- Phòng thi của đội trong một kỳ ----------
 * { ky, maDoi, ten, truong, thanhVien: { uid: { ten, mon } }, phan: [uid trả lời câu i], cau: [{ mon, id, hoanVi }],
 *   hanMs, nghiMs, batDauLuc (0 = chưa bắt đầu), mat: { uid: lúc báo có mặt }, traLoi: { i: { chon, luc } }, xong }
 */
const MAT_TRAN_MS = 15 * 1000;
const docTran = (ky, doi) => doc(K.tran(ky, doi), null);
function suaTran(ky, doi, f) {
  const t = docTran(ky, doi);
  if (!t) throw new Error('Phòng thi không còn nữa.');
  if (f(t) === false) return t;
  ghi(K.tran(ky, doi), t);
  phat('tran:' + ky + '_' + doi);
  return t;
}
/** Bỏ người lâu không báo có mặt (tab đã đóng). */
function locMat(t) {
  if (!t) return t;
  const mat = Object.fromEntries(Object.entries(t.mat || {}).filter(([, luc]) => Date.now() - luc < MAT_TRAN_MS));
  return { ...t, mat };
}
export async function moTran(ky, doi, tran) {
  if (docTran(ky, doi)) return locMat(docTran(ky, doi));
  const t = { ...tran, ky, maDoi: doi, truong: uidHienTai, batDauLuc: 0, mat: {}, traLoi: {}, xong: false };
  ghi(K.tran(ky, doi), t);
  phat('tran:' + ky + '_' + doi);
  return t;
}
export async function layTran(ky, doi) { return locMat(docTran(ky, doi)); }
export function theoDoiTran(ky, doi, f) {
  const goi = () => f(locMat(docTran(ky, doi)));
  goi();
  const h = nghe('tran:' + ky + '_' + doi, goi);
  const lap = setInterval(goi, 5000); // để thấy người vừa rời (không còn báo có mặt)
  return () => { h(); clearInterval(lap); };
}
/** Báo "tôi đang ở phòng thi" cho tới khi gọi hàm trả về. */
export function coMatTran(ky, doi) {
  const bao = () => { try { suaTran(ky, doi, (t) => { if (!t.thanhVien[uidHienTai]) return false; t.mat = { ...(t.mat || {}), [uidHienTai]: Date.now() }; }); } catch (e) { /* phòng thi đã bị huỷ */ } };
  bao();
  const lap = setInterval(bao, 5000);
  const roi = () => {
    clearInterval(lap);
    try { suaTran(ky, doi, (t) => { if (!t.mat?.[uidHienTai]) return false; delete t.mat[uidHienTai]; }); } catch (e) { /* bỏ qua */ }
  };
  addEventListener('pagehide', roi, { once: true });
  return roi;
}
export async function batDauTran(ky, doi) {
  suaTran(ky, doi, (t) => {
    if (t.truong !== uidHienTai || t.batDauLuc) return false;
    t.batDauLuc = gioMayChu();
  });
}
export async function huyTran(ky, doi) {
  const t = docTran(ky, doi);
  if (t && t.truong === uidHienTai && !t.batDauLuc) { xoa(K.tran(ky, doi)); phat('tran:' + ky + '_' + doi); }
}
export async function traLoiTran(ky, doi, i, chon) {
  suaTran(ky, doi, (t) => {
    if (!t.batDauLuc || t.phan[i] !== uidHienTai || t.traLoi?.[i]) return false;
    t.traLoi = { ...(t.traLoi || {}), [i]: { chon, luc: gioMayChu() } };
  });
}
export async function xongTran(ky, doi) {
  suaTran(ky, doi, (t) => { if (t.xong) return false; t.xong = true; });
}

/* ---------- Kết quả thi đấu: { ky, maDoi, tenDoi, thanhVien: [uid], ten: { uid: tên }, mon: { uid: môn }, diem, dung, soCau, thoiGianMs, luc } ---------- */
export async function ghiKetQua(kq) {
  const ds = doc(K.ketQua, {});
  const id = kq.ky + '_' + kq.maDoi;
  if (ds[id]) return ds[id];
  if (!kq.thanhVien.includes(uidHienTai)) throw new Error('Bạn không ở trong đội này.');
  ds[id] = { ...kq, luc: gioMayChu() };
  ghi(K.ketQua, ds);
  phat('ketqua');
  return ds[id];
}
/** Kết quả của các kỳ trong danh sách `kys`. */
export async function dsKetQua(kys) {
  const ds = doc(K.ketQua, {});
  return Object.values(ds).filter((x) => kys.includes(x.ky));
}
