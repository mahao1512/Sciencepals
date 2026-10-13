/*
 * firebase.js — Bộ dữ liệu thật, dùng khi js/firebase-config.js đã điền.
 *   Authentication: đăng nhập Google, email + mật khẩu.
 *   Firestore: congKhai/{uid}, rieng/{uid}, loiMoi/{id}, baoCao/{id}.
 *   Realtime Database: phong/{ma}/{meta, cho, thanhVien, tin, net, dongHo}.
 * Giao diện hàm giống hệt local.js — xem mô tả ở js/data/index.js.
 * Luật bảo mật đi kèm: firestore.rules và database.rules.json (xem HUONG_DAN.md).
 */
import { firebaseConfig } from '../firebase-config.js';
import { maNgauNhien } from '../tienich.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {
  getAuth, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signInWithRedirect,
  signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import {
  getFirestore, doc, getDoc, setDoc, getDocs, updateDoc, addDoc, deleteDoc, collection, query, where, limit,
  orderBy, limitToLast as fsLimitToLast, onSnapshot, serverTimestamp, writeBatch, arrayUnion, arrayRemove, deleteField
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import {
  getDatabase, ref, get, set, update, push, remove, onValue, onChildAdded, onDisconnect, runTransaction,
  query as rQuery, limitToLast, serverTimestamp as rTs
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
auth.languageCode = 'vi';
const fs = getFirestore(app);
const db = getDatabase(app);

export const cheDo = 'firebase';
export const hoTro = { google: true, email: true, tenPin: false };

/* ---------- Giờ máy chủ ---------- */
let lechGio = 0;
onValue(ref(db, '.info/serverTimeOffset'), (s) => { lechGio = s.val() || 0; });
export const gioMayChu = () => Date.now() + lechGio;

/* ---------- Đăng nhập ---------- */
const LOI_DANG_NHAP = {
  'auth/invalid-email': 'Email chưa đúng dạng, ví dụ ten@gmail.com.',
  'auth/missing-password': 'Bạn chưa nhập mật khẩu.',
  'auth/weak-password': 'Mật khẩu cần ít nhất 6 kí tự.',
  'auth/email-already-in-use': 'Email này đã có tài khoản. Hãy chọn “Đăng nhập”.',
  'auth/invalid-credential': 'Sai email hoặc mật khẩu. Kiểm tra lại, hoặc chọn “Tạo tài khoản” nếu bạn chưa có.',
  'auth/wrong-password': 'Sai mật khẩu. Hãy thử lại.',
  'auth/user-not-found': 'Chưa có tài khoản với email này. Hãy chọn “Tạo tài khoản”.',
  'auth/too-many-requests': 'Bạn thử sai quá nhiều lần. Đợi vài phút rồi thử lại nhé.',
  'auth/network-request-failed': 'Mất kết nối mạng. Kiểm tra Wi-Fi hoặc 4G rồi thử lại.',
  'auth/popup-closed-by-user': 'Bạn đã đóng cửa sổ đăng nhập Google. Bấm lại nút nếu muốn tiếp tục.',
  'auth/unauthorized-domain': 'Tên miền này chưa được phép đăng nhập. Người quản lí cần thêm tên miền vào Firebase (xem HUONG_DAN.md, bước 5).',
  'auth/invalid-api-key': 'Cấu hình Firebase chưa đúng. Người quản lí kiểm tra lại apiKey trong js/firebase-config.js (HUONG_DAN.md, bước 3).',
  'auth/api-key-not-valid.-please-pass-a-valid-api-key.': 'Cấu hình Firebase chưa đúng. Người quản lí kiểm tra lại apiKey trong js/firebase-config.js (HUONG_DAN.md, bước 3).',
  'auth/operation-not-allowed': 'Cách đăng nhập này chưa được bật trong Firebase (xem HUONG_DAN.md, bước 2).'
};
const loiDe = (e) => new Error(LOI_DANG_NHAP[e?.code] || 'Đăng nhập chưa được, hãy thử lại. (' + (e?.code || e?.message) + ')');

let nguoiHienTai = null;
const nguoiNgheDangNhap = new Set();
let daSan;
const san = new Promise((r) => { daSan = r; });
onAuthStateChanged(auth, (u) => {
  nguoiHienTai = u;
  daSan();
  nguoiNgheDangNhap.forEach((f) => f(u ? { uid: u.uid } : null));
});
const uidToi = () => nguoiHienTai?.uid;

export async function khoiDong() {
  await san;
  return nguoiHienTai ? { uid: nguoiHienTai.uid } : null;
}
export const nguoiDung = () => (nguoiHienTai ? { uid: nguoiHienTai.uid } : null);
export function theoDoiDangNhap(f) { nguoiNgheDangNhap.add(f); return () => nguoiNgheDangNhap.delete(f); }

export async function dangNhapGoogle() {
  const nhaCC = new GoogleAuthProvider();
  try {
    const kq = await signInWithPopup(auth, nhaCC);
    nguoiHienTai = kq.user;
    return { uid: kq.user.uid, tenGoiY: kq.user.displayName || '' };
  } catch (e) {
    // Trình duyệt chặn cửa sổ bật lên (hay gặp trên điện thoại) → chuyển trang để đăng nhập
    if (e.code === 'auth/popup-blocked' || e.code === 'auth/operation-not-supported-in-this-environment') {
      await signInWithRedirect(auth, nhaCC);
      return null;
    }
    throw loiDe(e);
  }
}
export async function dangNhapEmail(email, mk) {
  try { const kq = await signInWithEmailAndPassword(auth, email, mk); nguoiHienTai = kq.user; return { uid: kq.user.uid, tenGoiY: '' }; }
  catch (e) { throw loiDe(e); }
}
export async function dangKyEmail(email, mk) {
  try { const kq = await createUserWithEmailAndPassword(auth, email, mk); nguoiHienTai = kq.user; return { uid: kq.user.uid, tenGoiY: '' }; }
  catch (e) { throw loiDe(e); }
}
export async function dangXuat() { await signOut(auth); }
export function dangNhapTen() { throw new Error('Bản chạy thật dùng Google hoặc email để đăng nhập.'); }

/* ---------- Hồ sơ công khai (Firestore: congKhai/{uid}) ---------- */
const TRUONG_CONG_KHAI = ['ten', 'nhanVat', 'ban', 'tuong', 'ke', 'maId', 'diem', 'manh', 'yeu', 'kiemTraLuc', 'uyTinCong', 'uyTinLuc'];
/** Tìm hồ sơ công khai theo ID tài khoản (8 kí tự). */
export async function timTheoId(maId) {
  const s = await getDocs(query(collection(fs, 'congKhai'), where('maId', '==', maId), limit(1)));
  return s.empty ? null : { ...s.docs[0].data(), uid: s.docs[0].id };
}
export async function layCongKhai(uid = uidToi()) {
  const s = await getDoc(doc(fs, 'congKhai', uid));
  return s.exists() ? { ...s.data(), uid } : null;
}
export async function dsCongKhai() {
  // Chỉ lấy những bạn đã làm bài kiểm tra (có kiemTraLuc)
  const s = await getDocs(query(collection(fs, 'congKhai'), where('kiemTraLuc', '>', 0), limit(500)));
  return s.docs.map((d) => ({ ...d.data(), uid: d.id }));
}
export async function luuCongKhai(phan) {
  const sach = {};
  TRUONG_CONG_KHAI.forEach((k) => { if (k in phan) sach[k] = phan[k]; });
  // Mốc hồi uy tín lấy giờ máy chủ để luật bảo mật kiểm tra "cách lần trước ít nhất ~3 giờ"
  if ('uyTinLuc' in sach) sach.uyTinLuc = serverTimestamp();
  await setDoc(doc(fs, 'congKhai', uidToi()), { ...sach, uid: uidToi(), capNhat: serverTimestamp() }, { merge: true });
  return layCongKhai();
}

/* ---------- Dữ liệu riêng (Firestore: rieng/{uid}) ---------- */
function riengMacDinh() {
  return {
    chuoi: 0, chuoiDaiNhat: 0, ngayCuoi: '',
    diemChamChi: 0, msHoc: 0, lanThuongCuoi: 0,
    soHuu: { ban: ['go-soi'], phuKien: ['khong'], mauToc: [] },
    kiemTra: null
  };
}
export async function layRieng() {
  const s = await getDoc(doc(fs, 'rieng', uidToi()));
  return { ...riengMacDinh(), ...(s.exists() ? s.data() : {}) };
}
export async function luuRieng(phan) {
  const r = doc(fs, 'rieng', uidToi());
  const s = await getDoc(r);
  const moi = { ...phan };
  // Mốc thưởng lấy giờ máy chủ để luật bảo mật kiểm tra được "cách lần trước ít nhất 55 phút"
  if ('lanThuongCuoi' in moi) moi.lanThuongCuoi = serverTimestamp();
  if (!s.exists()) await setDoc(r, { ...riengMacDinh(), ...moi, diemChamChi: 0 });
  else await updateDoc(r, moi);
  return layRieng();
}
export function theoDoiRieng(f) {
  return onSnapshot(doc(fs, 'rieng', uidToi()), (s) => f({ ...riengMacDinh(), ...(s.data() || {}) }), () => {});
}

/* ---------- Sổ tay cảm xúc (Firestore: nhatKy/{uid}/ngay/{YYYY-MM-DD}) — chỉ chủ tài khoản đọc / ghi ---------- */
const TRUONG_NHAT_KY = ['cauHoi', 'traLoi', 'daLam', 'chuaLam', 'ngayMai', 'camXuc', 'sticker'];
export async function docNhatKy(tu) {
  const s = await getDocs(query(collection(fs, 'nhatKy', uidToi(), 'ngay'), where('ngay', '>=', tu)));
  return Object.fromEntries(s.docs.map((d) => [d.id, d.data()]));
}
export async function ghiNhatKy(ngay, trang) {
  const sach = { ngay, capNhat: serverTimestamp() };
  TRUONG_NHAT_KY.forEach((k) => { if (trang[k] !== undefined) sach[k] = trang[k]; });
  await setDoc(doc(fs, 'nhatKy', uidToi(), 'ngay', ngay), sach);
}

/* ---------- Bạn bè & tin nhắn riêng ----------
 * Firestore: ketBan/{mã cặp} = { tu, den, thanhVien: [a, b], trangThai: 'cho' | 'ban', luc }
 *            tinRieng/{mã cặp}/tin/{id} = { tu, noiDung, luc }  — chỉ bạn bè đọc / ghi được (xem firestore.rules)
 */
export const maCap = (a, b) => [a, b].sort().join('~');
const doiLuc = (x) => (x?.toMillis ? x.toMillis() : gioMayChu());
export async function guiKetBan(den) {
  const id = maCap(uidToi(), den);
  const s = await getDoc(doc(fs, 'ketBan', id)).catch(() => null);
  if (s?.exists()) return { id, ...s.data() };
  await setDoc(doc(fs, 'ketBan', id), { tu: uidToi(), den, thanhVien: [uidToi(), den], trangThai: 'cho', luc: serverTimestamp() });
  return { id, tu: uidToi(), den, trangThai: 'cho' };
}
export async function traLoiKetBan(id, dongY) {
  try {
    if (dongY) await updateDoc(doc(fs, 'ketBan', id), { trangThai: 'ban', luc: serverTimestamp() });
    else await deleteDoc(doc(fs, 'ketBan', id));
  } catch (e) { throw new Error('Lời mời kết bạn không còn nữa.'); }
}
export async function huyKetBan(id) { await deleteDoc(doc(fs, 'ketBan', id)); }
export function theoDoiKetBan(f) {
  return onSnapshot(query(collection(fs, 'ketBan'), where('thanhVien', 'array-contains', uidToi())),
    (s) => f(s.docs.map((d) => ({ ...d.data(), id: d.id, luc: doiLuc(d.data().luc) }))), () => f([]));
}
export async function guiTinRieng(ban, noiDung) {
  try {
    await addDoc(collection(fs, 'tinRieng', maCap(uidToi(), ban), 'tin'), { tu: uidToi(), noiDung, luc: serverTimestamp() });
  } catch (e) { throw new Error('Chưa gửi được. Hai bạn cần là bạn bè để nhắn tin riêng.'); }
}
export function theoDoiTinRieng(ban, f) {
  const q = query(collection(fs, 'tinRieng', maCap(uidToi(), ban), 'tin'), orderBy('luc'), fsLimitToLast(200));
  return onSnapshot(q, (s) => f(s.docs.map((d) => ({ ...d.data(), id: d.id, luc: doiLuc(d.data().luc) }))), () => f([]));
}
export function theoDoiTinCuoi(ban, f) {
  const q = query(collection(fs, 'tinRieng', maCap(uidToi(), ban), 'tin'), orderBy('luc'), fsLimitToLast(1));
  return onSnapshot(q, (s) => { const d = s.docs[0]; f(d ? { ...d.data(), id: d.id, luc: doiLuc(d.data().luc) } : null); }, () => f(null));
}

/* ---------- Lời mời (Firestore: loiMoi/{id}) ---------- */
const HAN_LOI_MOI = 2 * 60 * 60 * 1000;
export async function guiLoiMoi({ den, maPhong, loai }) {
  const toi = await layCongKhai();
  const r = await addDoc(collection(fs, 'loiMoi'), {
    tu: uidToi(), tenTu: toi?.ten || '', den, maPhong, loai, trangThai: 'cho', luc: serverTimestamp()
  });
  return r.id;
}
export function theoDoiLoiMoi(f) {
  const uid = uidToi();
  const ds = { den: [], tu: [] };
  const goi = () => f([...ds.den, ...ds.tu].filter((x) => gioMayChu() - x.luc < HAN_LOI_MOI));
  const doiSang = (s) => s.docs.map((d) => {
    const x = d.data();
    return { ...x, id: d.id, luc: x.luc?.toMillis ? x.luc.toMillis() : gioMayChu() };
  });
  const huy1 = onSnapshot(query(collection(fs, 'loiMoi'), where('den', '==', uid)), (s) => { ds.den = doiSang(s); goi(); }, () => {});
  const huy2 = onSnapshot(query(collection(fs, 'loiMoi'), where('tu', '==', uid)), (s) => { ds.tu = doiSang(s); goi(); }, () => {});
  return () => { huy1(); huy2(); };
}
export async function traLoiLoiMoi(id, dongY) {
  try { await updateDoc(doc(fs, 'loiMoi', id), { trangThai: dongY ? 'nhan' : 'tuchoi' }); }
  catch (e) { throw new Error('Lời mời không còn nữa.'); }
}
export async function baoCao({ maPhong, tin, lyDo }) {
  await addDoc(collection(fs, 'baoCao'), { maPhong, tin, lyDo: lyDo || '', nguoiBao: uidToi(), luc: serverTimestamp() });
}

/* ---------- Phòng học (Realtime Database: phong/{ma}) ---------- */
const AN_HAN_MS = 60 * 1000;
const PHONG_CHUA_VAO_MS = 2 * 60 * 60 * 1000;
const TRONG = 'trong'; // ghế trống
const rp = (ma, duong = '') => ref(db, `phong/${ma}${duong ? '/' + duong : ''}`);

export async function taoPhong({ loai, soCho }) {
  let ma;
  do { ma = maNgauNhien(6); } while ((await get(rp(ma, 'meta'))).exists());
  const thoiLuong = 25 * 60 * 1000;
  await set(rp(ma), {
    meta: { loai, soCho, chuPhong: uidToi(), taoLuc: rTs(), trongTu: 0 },
    cho: Object.fromEntries(Array.from({ length: soCho }, (_, i) => [i, TRONG])),
    dongHo: { thoiLuongMs: thoiLuong, conLaiMs: thoiLuong, batDauLuc: 0, dangChay: false }
  });
  return ma;
}

/** Phòng không còn ai đủ lâu thì coi như đã đóng. */
function daDong(meta, cho) {
  if (Object.values(cho || {}).some((u) => u !== TRONG)) return false;
  if (meta.trongTu) return gioMayChu() - meta.trongTu > AN_HAN_MS;
  return gioMayChu() - meta.taoLuc > PHONG_CHUA_VAO_MS;
}

const choCuaToi = {}; // ma -> chỉ số ghế
export async function vaoPhong(ma, { ten, nhanVat, ban, monManh }) {
  const uid = uidToi();
  const meta = (await get(rp(ma, 'meta'))).val();
  if (!meta) throw new Error(`Không tìm thấy phòng ${ma}. Kiểm tra lại mã hoặc nhờ bạn gửi mã mới.`);
  const cho = (await get(rp(ma, 'cho'))).val() || {};
  let i = Object.keys(cho).find((k) => cho[k] === uid);
  if (i === undefined) {
    if (daDong(meta, cho)) {
      await remove(rp(ma)).catch(() => {});
      throw new Error(`Phòng ${ma} đã đóng vì không còn ai. Hãy tạo phòng mới ở trang chủ.`);
    }
    // Giành ghế trống đầu tiên (giao dịch để hai người không ngồi cùng một ghế)
    for (const k of Object.keys(cho).filter((k) => cho[k] === TRONG)) {
      const kq = await runTransaction(rp(ma, 'cho/' + k), (v) => (v === TRONG || v === null ? uid : undefined)).catch(() => null);
      if (kq?.committed && kq.snapshot.val() === uid) { i = k; break; }
    }
    if (i === undefined) throw new Error(`Phòng ${ma} đã đủ ${meta.soCho} người. Bạn hỏi lại bạn mình hoặc tạo phòng mới nhé.`);
  }
  choCuaToi[ma] = i;
  const cu = (await get(rp(ma, 'thanhVien/' + uid)).catch(() => null))?.val();
  await set(rp(ma, 'thanhVien/' + uid), {
    ten, nhanVat, ban, monManh: monManh || '', trangThai: cu?.trangThai || 'vui-ve', cho: String(i), vaoLuc: cu?.vaoLuc || rTs()
  });
  // Mất kết nối / đóng tab: tự trả ghế
  await onDisconnect(rp(ma)).update({ [`thanhVien/${uid}`]: null, [`cho/${i}`]: TRONG, 'meta/trongTu': rTs() });
  return layPhong(ma);
}

export async function roiPhong(ma) {
  const uid = uidToi();
  const i = choCuaToi[ma];
  if (i === undefined) return;
  await roiGoi(ma).catch(() => {}); // rời phòng thì rời luôn cuộc gọi video
  await onDisconnect(rp(ma)).cancel();
  const tv = (await get(rp(ma, 'thanhVien')).catch(() => null))?.val() || {};
  const meta = (await get(rp(ma, 'meta'))).val();
  const con = Object.keys(tv).filter((u) => u !== uid);
  const capNhat = { [`thanhVien/${uid}`]: null, [`cho/${i}`]: TRONG, 'meta/trongTu': rTs() };
  if (meta?.chuPhong === uid && con.length) {
    capNhat['meta/chuPhong'] = con.sort((a, b) => (tv[a].vaoLuc || 0) - (tv[b].vaoLuc || 0))[0];
  }
  await update(rp(ma), capNhat);
  delete choCuaToi[ma];
  if (!con.length) await remove(rp(ma)).catch(() => {}); // người cuối cùng rời → đóng phòng
}

/** Ghép các nhánh thành một object phòng giống bản local. */
function ghepPhong(ma, n) {
  if (!n.meta) return null;
  const soCho = n.meta.soCho;
  const cho = Array.from({ length: soCho }, (_, i) => {
    const v = n.cho?.[i];
    return v && v !== TRONG ? v : null;
  });
  const tin = Object.entries(n.tin || {}).map(([id, t]) => ({ ...t, id })).sort((a, b) => (a.luc || 0) - (b.luc || 0));
  const net = Object.fromEntries(Object.entries(n.net || {}).map(([id, x]) => [id, { ...x, id }]));
  return { ma, ...n.meta, cho, thanhVien: n.thanhVien || {}, tin, net, dongHo: n.dongHo || {}, goi: n.goi || null };
}
export async function layPhong(ma) {
  const [meta, cho, thanhVien, dongHo] = await Promise.all(['meta', 'cho', 'thanhVien', 'dongHo'].map((k) => get(rp(ma, k)).then((s) => s.val()).catch(() => null)));
  return ghepPhong(ma, { meta, cho, thanhVien, dongHo });
}
export function theoDoiPhong(ma, f) {
  const n = {};
  const daCo = new Set();
  let dangHen = false;
  const goi = () => {
    if (dangHen) return;
    dangHen = true;
    queueMicrotask(() => {
      dangHen = false;
      if (daCo.size < 7) return; // chờ đủ 7 nhánh lần đầu để không báo nhầm "đã rời phòng"
      const p = ghepPhong(ma, n);
      // Trưởng phòng mất kết nối quá 60 giây (không phải chỉ tải lại trang): người vào sớm nhất còn lại nhận quyền
      if (p && !p.thanhVien[p.chuPhong] && gioMayChu() - (p.trongTu || 0) > AN_HAN_MS) {
        const dau = Object.keys(p.thanhVien).sort((a, b) => (p.thanhVien[a].vaoLuc || 0) - (p.thanhVien[b].vaoLuc || 0))[0];
        if (dau === uidToi()) update(rp(ma, 'meta'), { chuPhong: dau }).catch(() => {});
      }
      f(p);
    });
  };
  const nghe = (k, r) => onValue(r, (s) => { n[k] = s.val(); daCo.add(k); goi(); }, () => { n[k] = null; daCo.add(k); goi(); });
  const huy = [
    nghe('meta', rp(ma, 'meta')),
    nghe('cho', rp(ma, 'cho')),
    nghe('thanhVien', rp(ma, 'thanhVien')),
    nghe('tin', rQuery(rp(ma, 'tin'), limitToLast(200))),
    nghe('net', rp(ma, 'net')),
    nghe('dongHo', rp(ma, 'dongHo')),
    nghe('goi', rp(ma, 'goi'))
  ];
  const kiemTraChu = setInterval(goi, 15 * 1000); // xét lại quyền trưởng phòng khi hết thời gian chờ
  return () => { clearInterval(kiemTraChu); huy.forEach((h) => h()); };
}
export async function capNhatToi(ma, phan) {
  await update(rp(ma, 'thanhVien/' + uidToi()), phan);
}
export async function guiTin(ma, noiDung) {
  const tv = (await get(rp(ma, 'thanhVien/' + uidToi()))).val();
  await push(rp(ma, 'tin'), { uid: uidToi(), ten: tv?.ten || '', noiDung, luc: rTs() });
}
export async function themNet(ma, net) {
  const { id, ...x } = net;
  await set(rp(ma, 'net/' + id), { ...x, uid: uidToi(), luc: rTs() });
}
export async function xoaNet(ma, id) { await remove(rp(ma, 'net/' + id)); }
export async function xoaBang(ma) { await remove(rp(ma, 'net')); }

/* ---------- Trang trí phòng chung (chỉ trưởng phòng): phong/{ma}/meta/tuong, meta/ke ---------- */
export async function trangTriPhong(ma, { tuong, ke }) {
  const phan = {};
  if (tuong) phan.tuong = String(tuong).slice(0, 30);
  if (ke) phan.ke = String(ke).slice(0, 30);
  try { await update(rp(ma, 'meta'), phan); }
  catch (e) { throw new Error('Chỉ trưởng phòng mới trang trí được phòng.'); }
}

/* ---------- Gọi video: phong/{ma}/goi = { id, nguoiMo, tenNguoiMo, luc, thamGia: { uid: mã phiên }, tuChoi: { uid: true } }
 *            tín hiệu kết nối: phong/{ma}/tinHieu/{người nhận}/{id} = { tu, goiId, phien, denPhien, loai, du } ---------- */
export async function batDauGoi(ma, phien) {
  const uid = uidToi();
  const tv = (await get(rp(ma, 'thanhVien/' + uid))).val();
  if (!tv) throw new Error('Bạn cần ở trong phòng để gọi video.');
  const s = await get(rp(ma, 'goi'));
  if (!s.exists()) {
    await set(rp(ma, 'goi'), { id: maNgauNhien(8), nguoiMo: uid, tenNguoiMo: tv.ten, luc: rTs(), thamGia: { [uid]: phien } });
  } else {
    await set(rp(ma, 'goi/thamGia/' + uid), phien);
  }
  await onDisconnect(rp(ma, 'goi/thamGia/' + uid)).remove();
  return (await get(rp(ma, 'goi'))).val();
}
export async function thamGiaGoi(ma, phien) {
  const uid = uidToi();
  if (!(await get(rp(ma, 'goi'))).exists()) throw new Error('Cuộc gọi đã kết thúc.');
  await update(rp(ma, 'goi'), { [`thamGia/${uid}`]: phien, [`tuChoi/${uid}`]: null });
  await onDisconnect(rp(ma, 'goi/thamGia/' + uid)).remove();
}
export async function tuChoiGoi(ma) { await set(rp(ma, 'goi/tuChoi/' + uidToi()), true).catch(() => {}); }
export async function roiGoi(ma) {
  const uid = uidToi();
  await onDisconnect(rp(ma, 'goi/thamGia/' + uid)).cancel().catch(() => {});
  await remove(rp(ma, 'goi/thamGia/' + uid)).catch(() => {});
  const s = await get(rp(ma, 'goi/thamGia')).catch(() => null);
  if (s && !s.exists()) await remove(rp(ma, 'goi')).catch(() => {}); // không còn ai thì kết thúc cuộc gọi
}
export async function guiTinHieu(ma, den, goiTin) {
  await push(rp(ma, 'tinHieu/' + den), { ...goiTin, tu: uidToi() });
}
export function ngheTinHieu(ma, f) {
  const r = rp(ma, 'tinHieu/' + uidToi());
  return onChildAdded(r, (s) => {
    f(s.val());
    remove(s.ref).catch(() => {}); // đọc xong thì xoá
  }, () => {});
}

/* ---------- Đề bài chung: phong/{ma}/de (đề đang dùng), phong/{ma}/deCho/{uid} (chờ trưởng phòng duyệt) ---------- */
export const kichThuocAnhDe = 250 * 1000;
const doiMang = (t) => (Array.isArray(t) ? t : Object.keys(t || {}).sort((a, b) => a - b).map((k) => t[k]));
export async function guiDe(ma, { tenFile, trang }) {
  const uid = uidToi();
  const [meta, tv] = await Promise.all([get(rp(ma, 'meta')), get(rp(ma, 'thanhVien/' + uid))]).then((s) => s.map((x) => x.val()));
  if (!tv) throw new Error('Bạn cần ở trong phòng để gửi đề.');
  const de = { nguoiGui: uid, ten: tv.ten, tenFile: String(tenFile).slice(0, 120), soTrang: trang.length, luc: rTs(), trang };
  try {
    // Đề mới thay đề cũ: ghi chú của trưởng phòng trên đề cũ cũng bỏ đi
    if (meta.chuPhong === uid) { await update(rp(ma), { de, ghiChuDe: null }); return 'da-dua-len'; }
    await set(rp(ma, 'deCho/' + uid), { ...de, trangThai: 'cho' });
    return 'cho-duyet';
  } catch (e) {
    throw new Error('Chưa gửi được đề (mỗi đề tối đa 10 trang). Hãy thử lại.');
  }
}
export async function duyetDe(ma, uid, dongY) {
  const s = await get(rp(ma, 'deCho/' + uid));
  if (!s.exists()) throw new Error('Đề này không còn chờ duyệt nữa.');
  if (dongY) {
    const { trangThai, ...de } = s.val();
    await update(rp(ma), { de: { ...de, trang: doiMang(de.trang) }, [`deCho/${uid}`]: null, ghiChuDe: null });
  } else {
    await set(rp(ma, `deCho/${uid}/trangThai`), 'tuchoi');
  }
}
export async function huyDeCho(ma) { await remove(rp(ma, 'deCho/' + uidToi())); }
export async function goDe(ma) {
  try { await update(rp(ma), { de: null, ghiChuDe: null }); }
  catch (e) { throw new Error('Chỉ trưởng phòng mới gỡ được đề.'); }
}

/* ---------- Ghi chú trên đề: phong/{ma}/ghiChuDe/{số trang}/{id} = nét (chỉ trưởng phòng vẽ, cả phòng xem) ---------- */
export async function themGhiChu(ma, trang, net) {
  const { id, ...x } = net;
  try { await set(rp(ma, `ghiChuDe/${trang}/${id}`), { ...x, uid: uidToi(), luc: rTs() }); }
  catch (e) { throw new Error('Chỉ trưởng phòng mới ghi chú được trên đề.'); }
}
export async function xoaGhiChu(ma, trang, id) {
  await remove(rp(ma, id ? `ghiChuDe/${trang}/${id}` : `ghiChuDe/${trang}`));
}
/** f({ số trang: { id: nét } }) */
export function theoDoiGhiChu(ma, f) {
  return onValue(rp(ma, 'ghiChuDe'), (s) => {
    // Realtime Database trả về mảng khi khoá là số liên tiếp: đổi lại thành object, bỏ chỗ trống
    const v = s.val() || {};
    f(Object.fromEntries(Object.entries(v).filter(([, x]) => x).map(([k, x]) => [k, x])));
  }, () => f({}));
}

/* ---------- Chuyển quyền trưởng phòng (chỉ trưởng phòng hiện tại) ---------- */
export async function chuyenTruongPhong(ma, uid) {
  const tv = (await get(rp(ma, 'thanhVien/' + uid))).val();
  if (!tv) throw new Error('Bạn này không còn ở trong phòng.');
  try { await update(rp(ma, 'meta'), { chuPhong: uid }); }
  catch (e) { throw new Error('Chỉ trưởng phòng mới chuyển quyền được. (Nếu bạn đang là trưởng phòng, người quản lí cần dán lại database.rules.json mới nhất.)'); }
}
/** f({ de, deCho }) — trưởng phòng nghe cả nhánh deCho, người khác chỉ nghe đề chờ của mình. */
export function theoDoiDe(ma, f) {
  const uid = uidToi();
  let de = null;
  let deCho = {};
  let huyCho = null;
  let chu = null;
  const goi = () => f({ de: de && { ...de, trang: doiMang(de.trang) }, deCho });
  const hDe = onValue(rp(ma, 'de'), (s) => { de = s.val(); goi(); }, () => {});
  const hChu = onValue(rp(ma, 'meta/chuPhong'), (s) => {
    if (s.val() === chu) return;
    chu = s.val();
    huyCho && huyCho();
    deCho = {};
    huyCho = chu === uid
      ? onValue(rp(ma, 'deCho'), (x) => {
        deCho = Object.fromEntries(Object.entries(x.val() || {}).map(([k, v]) => [k, { ...v, trang: doiMang(v.trang) }]));
        goi();
      }, () => {})
      : onValue(rp(ma, 'deCho/' + uid), (x) => {
        deCho = x.exists() ? { [uid]: { ...x.val(), trang: doiMang(x.val().trang) } } : {};
        goi();
      }, () => {});
  });
  return () => { hDe(); hChu(); huyCho && huyCho(); };
}

export async function dieuKhienDongHo(ma, hanhDong, phut) {
  const d = (await get(rp(ma, 'dongHo'))).val();
  const conLai = d.dangChay ? Math.max(0, d.conLaiMs - (gioMayChu() - d.batDauLuc)) : d.conLaiMs;
  let moi;
  if (hanhDong === 'batDau' && !d.dangChay && conLai > 0) moi = { ...d, conLaiMs: conLai, batDauLuc: rTs(), dangChay: true };
  else if (hanhDong === 'tamDung') moi = { ...d, conLaiMs: conLai, batDauLuc: 0, dangChay: false };
  else if (hanhDong === 'datLai') moi = { ...d, conLaiMs: d.thoiLuongMs, batDauLuc: 0, dangChay: false };
  else if (hanhDong === 'datThoiLuong') { const ms = Math.round(phut * 60000); moi = { thoiLuongMs: ms, conLaiMs: ms, batDauLuc: 0, dangChay: false }; }
  else return;
  try { await set(rp(ma, 'dongHo'), moi); }
  catch (e) { throw new Error('Chỉ trưởng phòng mới điều khiển được đồng hồ.'); }
}

/* ---------- Uy tín (Firestore) ----------
 *   viPham/{id} = { den, muc, loai: 'toCao' | 'vangTuc', ngay, luc } — không lưu ai tố cáo
 *   daToCao/{tố cáo_bị tố cáo_ngày} = { tu, den, ngay, viPham } — chỉ người tố cáo đọc được; mỗi ngày một lần
 */
const ngaySo = () => Math.floor((gioMayChu() + 7 * 3600e3) / 864e5); // số thứ tự ngày theo giờ Việt Nam
const doiViPham = (d) => ({ ...d.data(), id: d.id, luc: doiLuc(d.data().luc) });
export async function toCao({ den, muc }) {
  if (!den || den === uidToi()) throw new Error('Không tự tố cáo chính mình được.');
  const ngay = ngaySo();
  const daRef = doc(fs, 'daToCao', `${uidToi()}_${den}_${ngay}`);
  const da = await getDoc(daRef).catch(() => null);
  if (da?.exists()) return { daTruTruoc: true };
  const vpRef = doc(collection(fs, 'viPham'));
  const b = writeBatch(fs);
  b.set(daRef, { tu: uidToi(), den, ngay, viPham: vpRef.id });
  b.set(vpRef, { den, muc: Math.max(5, Math.min(10, Math.round(muc))), loai: 'toCao', ngay, luc: serverTimestamp() });
  try { await b.commit(); }
  catch (e) {
    if ((await getDoc(daRef).catch(() => null))?.exists()) return { daTruTruoc: true };
    throw new Error('Chưa trừ được uy tín (người quản lí cần dán lại file firestore.rules mới nhất).');
  }
  return { daTruTruoc: false };
}
export async function ghiVangTuc(muc) {
  await addDoc(collection(fs, 'viPham'), { den: uidToi(), muc: Math.max(5, Math.min(10, Math.round(muc))), loai: 'vangTuc', ngay: ngaySo(), luc: serverTimestamp() });
}
export async function dsViPham(uid = uidToi()) {
  const s = await getDocs(query(collection(fs, 'viPham'), where('den', '==', uid)));
  return s.docs.map(doiViPham);
}
export function theoDoiViPham(uid, f) {
  return onSnapshot(query(collection(fs, 'viPham'), where('den', '==', uid)), (s) => f(s.docs.map(doiViPham)), () => f([]));
}

/* ---------- Đội thi đấu (Firestore: doi/{mã}) = { ten, truong, thanhVien: [uid], mon: { uid: môn }, taoLuc } ---------- */
const doiDoi = (s) => ({ ...s.data(), ma: s.id, mon: s.data().mon || {} });
export async function taoDoi(ten) {
  let ma;
  do { ma = maNgauNhien(6); } while ((await getDoc(doc(fs, 'doi', ma))).exists());
  await setDoc(doc(fs, 'doi', ma), { ten: String(ten).slice(0, 30), truong: uidToi(), thanhVien: [uidToi()], mon: {}, taoLuc: serverTimestamp() });
  return ma;
}
export async function layDoi(ma) {
  const s = await getDoc(doc(fs, 'doi', ma));
  return s.exists() ? doiDoi(s) : null;
}
export async function doiCuaToi() {
  const s = await getDocs(query(collection(fs, 'doi'), where('thanhVien', 'array-contains', uidToi())));
  return s.docs.map(doiDoi);
}
export function theoDoiDoiCuaToi(f) {
  return onSnapshot(query(collection(fs, 'doi'), where('thanhVien', 'array-contains', uidToi())), (s) => f(s.docs.map(doiDoi)), () => f([]));
}
export async function vaoDoi(ma, toiDa) {
  const d = await layDoi(ma);
  if (!d) throw new Error('Không tìm thấy đội ' + ma + '. Kiểm tra lại mã đội.');
  if (d.thanhVien.includes(uidToi())) return;
  if (d.thanhVien.length >= toiDa) throw new Error(`Đội đã đủ ${toiDa} người.`);
  try { await updateDoc(doc(fs, 'doi', ma), { thanhVien: arrayUnion(uidToi()) }); }
  catch (e) { throw new Error('Chưa vào được đội. Hãy thử lại.'); }
}
export async function roiDoi(ma) {
  const d = await layDoi(ma);
  if (d?.truong === uidToi()) throw new Error('Đội trưởng không rời đội được. Bạn có thể giải tán đội.');
  await updateDoc(doc(fs, 'doi', ma), { thanhVien: arrayRemove(uidToi()), ['mon.' + uidToi()]: deleteField() });
}
export async function boKhoiDoi(ma, uid) {
  try { await updateDoc(doc(fs, 'doi', ma), { thanhVien: arrayRemove(uid), ['mon.' + uid]: deleteField() }); }
  catch (e) { throw new Error('Chỉ đội trưởng mới làm được việc này.'); }
}
export async function doiTenDoi(ma, ten) {
  try { await updateDoc(doc(fs, 'doi', ma), { ten: String(ten).slice(0, 30) }); }
  catch (e) { throw new Error('Chỉ đội trưởng mới đổi được tên đội.'); }
}
export async function chonMonDoi(ma, mon) {
  const d = await layDoi(ma);
  if (!d?.thanhVien.includes(uidToi())) throw new Error('Bạn không còn ở trong đội này.');
  if (mon && Object.entries(d.mon).some(([u, m]) => u !== uidToi() && m === mon)) throw new Error('Môn này đã có bạn khác trong đội chọn.');
  await updateDoc(doc(fs, 'doi', ma), { ['mon.' + uidToi()]: mon || deleteField() });
}
export async function giaiTanDoi(ma) {
  try { await deleteDoc(doc(fs, 'doi', ma)); }
  catch (e) { throw new Error('Chỉ đội trưởng mới giải tán được đội.'); }
}

/* ---------- Phòng thi (Realtime Database: thiDau/{kỳ}/{mã đội}) — xem mô tả ở local.js ---------- */
const rt = (ky, doi, duong = '') => ref(db, `thiDau/${ky}/${doi}${duong ? '/' + duong : ''}`);
const mangSangObj = (x) => Object.fromEntries(Object.entries(x || {}).filter(([, v]) => v !== null && v !== undefined));
function chuanTran(t) {
  if (!t) return null;
  return { ...t, mat: mangSangObj(t.mat), traLoi: mangSangObj(t.traLoi), phan: Object.values(t.phan || {}), cau: Object.values(t.cau || {}) };
}
export async function moTran(ky, doi, tran) {
  const s = await get(rt(ky, doi));
  if (s.exists()) return chuanTran(s.val());
  await set(rt(ky, doi), { ...tran, ky, maDoi: doi, truong: uidToi(), batDauLuc: 0, xong: false });
  return chuanTran((await get(rt(ky, doi))).val());
}
export async function layTran(ky, doi) { return chuanTran((await get(rt(ky, doi))).val()); }
export function theoDoiTran(ky, doi, f) {
  return onValue(rt(ky, doi), (s) => f(chuanTran(s.val())), () => f(null));
}
export function coMatTran(ky, doi) {
  const r = rt(ky, doi, 'mat/' + uidToi());
  set(r, rTs()).then(() => onDisconnect(r).remove()).catch(() => {});
  return () => { onDisconnect(r).cancel().catch(() => {}); remove(r).catch(() => {}); };
}
export async function batDauTran(ky, doi) { await set(rt(ky, doi, 'batDauLuc'), rTs()); }
export async function huyTran(ky, doi) { await remove(rt(ky, doi)).catch(() => {}); }
export async function traLoiTran(ky, doi, i, chon) {
  await set(rt(ky, doi, 'traLoi/' + i), { chon, luc: rTs() }).catch(() => {}); // đã có người trả lời / hết lượt thì bỏ qua
}
export async function xongTran(ky, doi) { await set(rt(ky, doi, 'xong'), true).catch(() => {}); }

/* ---------- Kết quả thi đấu (Firestore: ketQuaThi/{kỳ_mã đội}) — chỉ ghi một lần ---------- */
export async function ghiKetQua(kq) {
  const r = doc(fs, 'ketQuaThi', kq.ky + '_' + kq.maDoi);
  try { await setDoc(r, { ...kq, luc: serverTimestamp() }); }
  catch (e) { /* đồng đội đã ghi trước */ }
  const s = await getDoc(r).catch(() => null);
  return s?.exists() ? { ...s.data(), luc: doiLuc(s.data().luc) } : null;
}
export async function dsKetQua(kys) {
  const ds = [];
  for (let i = 0; i < kys.length; i += 30) {
    const s = await getDocs(query(collection(fs, 'ketQuaThi'), where('ky', 'in', kys.slice(i, i + 30))));
    s.docs.forEach((d) => ds.push({ ...d.data(), luc: doiLuc(d.data().luc) }));
  }
  return ds;
}
