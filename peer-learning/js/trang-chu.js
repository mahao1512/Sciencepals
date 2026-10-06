/* trang-chu.js — Trang chủ: đăng nhập → (lần đầu) tạo nhân vật → phòng học của tôi. */
import { duLieu } from './data/index.js';
import { esc, thongBao } from './tienich.js';
import { veDauTrang, taiNguCanh } from './khung.js';
import { veTaoNhanVat } from './ui/tao-nhan-vat.js';

const $ = (s) => document.querySelector(s);
const hien = (id) => {
  ['#dang-tai', '#dang-nhap', '#tao-ho-so', '#trang-chu'].forEach((s) => { $(s).hidden = s !== id; });
};

/* ---------- 1. Đăng nhập ---------- */
function veDangNhap() {
  veDauTrang(null);
  hien('#dang-nhap');
  const h = duLieu.hoTro;
  const el = $('#dang-nhap');
  el.innerHTML =
    `<div class="card login-card">` +
    `<img class="logo" src="assets/logo.png" alt="Logo Khoa Khoa học Liên ngành">` +
    `<h1 id="dn-tieu-de">Học Cùng Bạn</h1>` +
    `<p class="muted">Tìm bạn giỏi môn bạn đang cần, giúp bạn ấy môn bạn đang giỏi — rồi cùng vào phòng học ảo. Đăng nhập để bắt đầu.</p>` +
    (h.google ? `<button class="btn btn-secondary btn-block" id="dn-google" style="margin-top:18px"><i class="fab fa-google" aria-hidden="true"></i> Đăng nhập bằng Google</button>` : '') +
    (h.email
      ? `<div class="divider">hoặc dùng email</div>` +
        `<div class="tabs" role="tablist" aria-label="Chọn đăng nhập hay tạo tài khoản">` +
        `<button role="tab" id="tab-dn" aria-selected="true" aria-controls="dn-form">Đăng nhập</button>` +
        `<button role="tab" id="tab-dk" aria-selected="false" aria-controls="dn-form">Tạo tài khoản</button></div>` +
        `<form id="dn-form" role="tabpanel" novalidate>` +
        `<label class="field"><span>Email</span><input class="input" name="email" type="email" autocomplete="email" required></label>` +
        `<label class="field"><span>Mật khẩu (ít nhất 6 kí tự)</span><input class="input" name="mk" type="password" autocomplete="current-password" minlength="6" required></label>` +
        `<p class="error" id="dn-loi" role="alert" hidden></p>` +
        `<button class="btn btn-primary btn-block" type="submit" id="dn-nut">Đăng nhập</button></form>`
      : '') +
    (h.tenPin
      ? `<form id="dn-form" novalidate>` +
        `<label class="field"><span>Tên của bạn</span><input class="input" name="ten" maxlength="24" autocomplete="nickname" required placeholder="Ví dụ: Minh Anh"></label>` +
        `<label class="field"><span>Mã PIN 4 số (tên mới thì tự đặt PIN)</span><input class="input" name="pin" type="password" inputmode="numeric" pattern="[0-9]{4}" maxlength="4" autocomplete="off" required></label>` +
        `<p class="error" id="dn-loi" role="alert" hidden></p>` +
        `<button class="btn btn-primary btn-block" type="submit">Đăng nhập / Tạo tài khoản</button>` +
        `<p class="small muted">Chế độ thử: dữ liệu lưu trên trình duyệt này. Mở thêm một tab, đăng nhập tên khác để thử học cùng bạn.</p></form>`
      : '') +
    `</div>`;

  const loi = (m) => { const e = $('#dn-loi'); e.textContent = m; e.hidden = !m; };
  let dangKy = false;
  const xong = async (kq) => { if (kq) await sauDangNhap(kq.tenGoiY); };

  $('#dn-google')?.addEventListener('click', async () => {
    try { await xong(await duLieu.dangNhapGoogle()); } catch (e) { thongBao(e.message, { loai: 'err' }); }
  });
  el.querySelectorAll('[role="tab"]').forEach((t) => t.addEventListener('click', () => {
    dangKy = t.id === 'tab-dk';
    $('#tab-dn').setAttribute('aria-selected', String(!dangKy));
    $('#tab-dk').setAttribute('aria-selected', String(dangKy));
    $('#dn-nut').textContent = dangKy ? 'Tạo tài khoản' : 'Đăng nhập';
    $('#dn-form').mk.autocomplete = dangKy ? 'new-password' : 'current-password';
    loi('');
  }));
  $('#dn-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.currentTarget;
    const nut = f.querySelector('[type="submit"]');
    nut.disabled = true;
    loi('');
    try {
      if (h.tenPin) await xong(await duLieu.dangNhapTen(f.ten.value, f.pin.value.trim()));
      else await xong(await (dangKy ? duLieu.dangKyEmail : duLieu.dangNhapEmail)(f.email.value.trim(), f.mk.value));
    } catch (err) {
      loi(err.message);
    } finally {
      nut.disabled = false;
    }
  });
  el.querySelector('input')?.focus();
}

/* ---------- 2. Lần đầu: tạo nhân vật ---------- */
function veTaoHoSo(uid, tenGoiY) {
  veDauTrang(null);
  hien('#tao-ho-so');
  veTaoNhanVat($('#th-may-tao'), {
    ten: tenGoiY || '',
    nhanVat: PeerAssets.DEFAULT_CHARACTER.female,
    soHuu: null,
    chuNut: 'Vào phòng học của tôi',
    khiLuu: async ({ ten, nhanVat }) => {
      const ck = await duLieu.luuCongKhai({ ten, nhanVat, ban: 'go-soi', diem: null, manh: [], yeu: [] });
      await duLieu.luuRieng({});
      await vaoTrangChu(uid, ck);
      thongBao(`Chào mừng ${esc(ten)}! Đây là phòng học của bạn.`, { loai: 'ok' });
    }
  });
  $('#th-tieu-de').focus?.();
}

/* ---------- 3. Trang chủ ---------- */
async function vaoTrangChu(uid, congKhai) {
  const ctx = await taiNguCanh(uid, congKhai);
  hien('#trang-chu');
  const { veTrangChu } = await import('./ui/phong-cua-toi.js');
  veTrangChu($('#trang-chu'), ctx);
}

async function sauDangNhap(tenGoiY) {
  const nd = duLieu.nguoiDung();
  const ck = await duLieu.layCongKhai(nd.uid);
  if (!ck || !ck.nhanVat) return veTaoHoSo(nd.uid, tenGoiY);
  return vaoTrangChu(nd.uid, ck);
}

/* ---------- Khởi động ---------- */
try {
  const nd = await duLieu.khoiDong();
  if (nd) await sauDangNhap();
  else veDangNhap();
} catch (e) {
  $('#dang-tai').innerHTML = `Không tải được trang: ${esc(e.message)}. Hãy tải lại trang; nếu vẫn lỗi, kiểm tra kết nối mạng.`;
  console.error(e);
}
