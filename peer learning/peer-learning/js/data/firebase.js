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
  getFirestore, doc, getDoc, setDoc, getDocs, updateDoc, addDoc, collection, query, where, limit,
  onSnapshot, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import {
  getDatabase, ref, get, set, update, push, remove, onValue, onDisconnect, runTransaction,
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
const TRUONG_CONG_KHAI = ['ten', 'nhanVat', 'ban', 'diem', 'manh', 'yeu', 'kiemTraLuc'];
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
  return { ma, ...n.meta, cho, thanhVien: n.thanhVien || {}, tin, net, dongHo: n.dongHo || {} };
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
      if (daCo.size < 6) return; // chờ đủ 6 nhánh lần đầu để không báo nhầm "đã rời phòng"
      const p = ghepPhong(ma, n);
      // Chủ phòng mất kết nối quá 60 giây (không phải chỉ tải lại trang): người vào sớm nhất còn lại nhận quyền
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
    nghe('dongHo', rp(ma, 'dongHo'))
  ];
  const kiemTraChu = setInterval(goi, 15 * 1000); // xét lại quyền chủ phòng khi hết thời gian chờ
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

/* ---------- Đề bài chung: phong/{ma}/de (đề đang dùng), phong/{ma}/deCho/{uid} (chờ chủ phòng duyệt) ---------- */
export const kichThuocAnhDe = 250 * 1000;
const doiMang = (t) => (Array.isArray(t) ? t : Object.keys(t || {}).sort((a, b) => a - b).map((k) => t[k]));
export async function guiDe(ma, { tenFile, trang }) {
  const uid = uidToi();
  const [meta, tv] = await Promise.all([get(rp(ma, 'meta')), get(rp(ma, 'thanhVien/' + uid))]).then((s) => s.map((x) => x.val()));
  if (!tv) throw new Error('Bạn cần ở trong phòng để gửi đề.');
  const de = { nguoiGui: uid, ten: tv.ten, tenFile: String(tenFile).slice(0, 120), soTrang: trang.length, luc: rTs(), trang };
  try {
    if (meta.chuPhong === uid) { await set(rp(ma, 'de'), de); return 'da-dua-len'; }
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
    await update(rp(ma), { de: { ...de, trang: doiMang(de.trang) }, [`deCho/${uid}`]: null });
  } else {
    await set(rp(ma, `deCho/${uid}/trangThai`), 'tuchoi');
  }
}
export async function huyDeCho(ma) { await remove(rp(ma, 'deCho/' + uidToi())); }
export async function goDe(ma) {
  try { await remove(rp(ma, 'de')); }
  catch (e) { throw new Error('Chỉ chủ phòng mới gỡ được đề.'); }
}
/** f({ de, deCho }) — chủ phòng nghe cả nhánh deCho, người khác chỉ nghe đề chờ của mình. */
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
  catch (e) { throw new Error('Chỉ chủ phòng mới điều khiển được đồng hồ.'); }
}
