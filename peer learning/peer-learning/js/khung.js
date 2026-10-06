/*
 * khung.js — Phần chung của mọi trang: giao diện sáng/tối, dòng "chế độ thử",
 * đầu trang (chuỗi lửa, điểm chăm chỉ, trình đơn nhân vật), bắt buộc đăng nhập, cập nhật chuỗi.
 */
import { duLieu } from './data/index.js';
import { esc, apDungGiaoDien, doiGiaoDien, moCuaSo, thongBao, ngayVN, ngayHomTruoc } from './tienich.js';
import { tinhChuoi } from './chuoi.js';
import { CHUOI_HIEN_LUA } from './config.js';

apDungGiaoDien();

/** Ảnh đầu nhân vật (cắt phần đầu của hình toàn thân) để làm nút tròn. */
export function anhDau(nhanVat) {
  return PeerAssets.renderCharacter(nhanVat).replace('viewBox="0 0 200 320"', 'viewBox="22 14 156 156"');
}

/** Dòng nhỏ báo chế độ thử, chèn đầu trang. */
function veDongCheDoThu() {
  if (duLieu.cheDo !== 'local' || document.querySelector('.demo-bar')) return;
  const d = document.createElement('div');
  d.className = 'demo-bar';
  d.textContent = 'Đang chạy chế độ thử — dữ liệu chỉ lưu trên trình duyệt này.';
  document.body.prepend(d);
}

/** Nội dung viên chuỗi lửa: chỉ hiện ngọn lửa khi chuỗi đạt CHUOI_HIEN_LUA ngày. */
export function htmlChuoi(chuoi) {
  if (chuoi >= CHUOI_HIEN_LUA) return `<span class="flame" aria-hidden="true">🔥</span><b>${chuoi}</b><span class="sr-only"> ngày liên tục</span>`;
  return `<span aria-hidden="true">📅</span><b>${chuoi}</b><span class="sr-only"> ngày liên tục</span>`;
}

/** Vẽ đầu trang. `ctx` có thể null (chưa đăng nhập). */
export function veDauTrang(ctx) {
  veDongCheDoThu();
  let h = document.getElementById('site-header');
  if (!h) {
    h = document.createElement('header');
    h.id = 'site-header';
    document.querySelector('.demo-bar') ? document.querySelector('.demo-bar').after(h) : document.body.prepend(h);
  }
  h.className = 'site-header';
  const chuoi = ctx?.rieng?.chuoi || 0;
  h.innerHTML =
    `<div class="in">` +
    `<a class="brand" href="index.html" aria-label="Học Cùng Bạn – về trang chủ">` +
    `<img src="assets/logo.png" alt="" width="44" height="44">` +
    `<span class="txt"><b>Học Cùng Bạn</b><small>Yêu Khoa học · Peer Learning</small></span></a>` +
    `<div class="header-actions">` +
    (ctx
      ? `<span class="pill-flame" id="hd-chuoi" title="Chuỗi ${chuoi} ngày liên tục">${htmlChuoi(chuoi)}</span>` +
        `<span class="pill-points" id="hd-diem" title="Điểm chăm chỉ"><span aria-hidden="true">⭐</span><b>${ctx.rieng.diemChamChi}</b><span class="sr-only"> điểm chăm chỉ</span></span>` +
        `<div class="menu"><button class="avatar-btn" id="hd-avatar" aria-haspopup="true" aria-expanded="false" aria-controls="hd-menu" aria-label="Trình đơn của ${esc(ctx.congKhai.ten)}">${anhDau(ctx.congKhai.nhanVat)}</button>` +
        `<ul class="menu-list" id="hd-menu" hidden>` +
        `<li class="small muted" style="padding:6px 12px">Xin chào, <b>${esc(ctx.congKhai.ten)}</b></li>` +
        `<li><a href="index.html"><i class="fas fa-house" aria-hidden="true"></i>Trang chủ</a></li>` +
        `<li><button type="button" data-act="nhan-vat"><i class="fas fa-user-pen" aria-hidden="true"></i>Nhân vật của tôi</button></li>` +
        `<li><a href="cua-hang.html"><i class="fas fa-store" aria-hidden="true"></i>Cửa hàng</a></li>` +
        `<li><a href="kiem-tra.html"><i class="fas fa-clipboard-check" aria-hidden="true"></i>Bài kiểm tra đầu vào</a></li>` +
        `<li><button type="button" data-act="dang-xuat"><i class="fas fa-right-from-bracket" aria-hidden="true"></i>Đăng xuất</button></li>` +
        `</ul></div>`
      : '') +
    `<button class="icon-btn" id="hd-theme" aria-label="Đổi giao diện sáng / tối"><i class="fas ${document.documentElement.classList.contains('dark') ? 'fa-sun' : 'fa-moon'}" aria-hidden="true"></i></button>` +
    `</div></div>`;

  h.querySelector('#hd-theme').addEventListener('click', (e) => {
    const toi = doiGiaoDien();
    e.currentTarget.innerHTML = `<i class="fas ${toi ? 'fa-sun' : 'fa-moon'}" aria-hidden="true"></i>`;
  });
  if (!ctx) return;

  const nut = h.querySelector('#hd-avatar');
  const menu = h.querySelector('#hd-menu');
  const dongMenu = () => { menu.hidden = true; nut.setAttribute('aria-expanded', 'false'); };
  nut.addEventListener('click', (e) => {
    e.stopPropagation();
    menu.hidden = !menu.hidden;
    nut.setAttribute('aria-expanded', String(!menu.hidden));
    if (!menu.hidden) menu.querySelector('a,button')?.focus();
  });
  document.addEventListener('click', (e) => { if (!menu.contains(e.target)) dongMenu(); });
  menu.addEventListener('keydown', (e) => { if (e.key === 'Escape') { dongMenu(); nut.focus(); } });
  menu.querySelector('[data-act="nhan-vat"]').addEventListener('click', () => { dongMenu(); moNhanVatCuaToi(ctx); });
  menu.querySelector('[data-act="dang-xuat"]').addEventListener('click', async () => {
    await duLieu.dangXuat();
    location.href = 'index.html';
  });
}

/** Cập nhật số trên đầu trang (sau khi mua đồ, nhận thưởng, ...). */
export function capNhatDauTrang(ctx, { hieuUngChuoi = false } = {}) {
  const c = document.getElementById('hd-chuoi');
  const d = document.getElementById('hd-diem');
  if (c) {
    c.innerHTML = htmlChuoi(ctx.rieng.chuoi);
    c.title = `Chuỗi ${ctx.rieng.chuoi} ngày liên tục`;
    if (hieuUngChuoi) { c.classList.remove('flame-pop'); void c.offsetWidth; c.classList.add('flame-pop'); }
  }
  if (d) d.querySelector('b').textContent = ctx.rieng.diemChamChi;
  const a = document.getElementById('hd-avatar');
  if (a) a.innerHTML = anhDau(ctx.congKhai.nhanVat);
}

/** Mở cửa sổ "Nhân vật của tôi". */
export async function moNhanVatCuaToi(ctx) {
  const { veTaoNhanVat } = await import('./ui/tao-nhan-vat.js');
  const cs = moCuaSo('<div id="nv-sua"></div>', { tieuDe: 'Nhân vật của tôi' });
  veTaoNhanVat(cs.querySelector('#nv-sua'), {
    ten: ctx.congKhai.ten,
    nhanVat: ctx.congKhai.nhanVat,
    soHuu: ctx.rieng.soHuu,
    chuNut: 'Lưu thay đổi',
    khiLuu: async ({ ten, nhanVat }) => {
      ctx.congKhai = await duLieu.luuCongKhai({ ten, nhanVat });
      capNhatDauTrang(ctx);
      document.dispatchEvent(new CustomEvent('pl:hoso', { detail: ctx }));
      cs.close();
      thongBao('Đã lưu nhân vật của bạn.', { loai: 'ok' });
    }
  });
}

/**
 * Khởi động một trang cần đăng nhập.
 * Chưa đăng nhập hoặc chưa tạo nhân vật → chuyển về trang chủ (index.html lo phần đó).
 * Trả về ctx = { uid, congKhai, rieng, chuoiVuaTang }.
 */
export async function khoiTaoTrang() {
  const nd = await duLieu.khoiDong();
  const congKhai = nd && (await duLieu.layCongKhai(nd.uid));
  if (!nd || !congKhai || !congKhai.nhanVat) {
    location.replace('index.html');
    return new Promise(() => {}); // dừng trang hiện tại trong lúc chuyển
  }
  return taiNguCanh(nd.uid, congKhai);
}

/** Đọc dữ liệu riêng, cập nhật chuỗi ngày, vẽ đầu trang. */
export async function taiNguCanh(uid, congKhai) {
  let rieng = await duLieu.layRieng();
  const c = tinhChuoi(rieng);
  if (c.thayDoi) rieng = await duLieu.luuRieng({ chuoi: c.chuoi, chuoiDaiNhat: c.chuoiDaiNhat, ngayCuoi: c.ngayCuoi });
  const ctx = { uid, congKhai, rieng, chuoiVuaTang: c.vuaTang };
  veDauTrang(ctx);
  if (c.vuaTang && c.chuoi >= CHUOI_HIEN_LUA) {
    capNhatDauTrang(ctx, { hieuUngChuoi: true });
    thongBao(`🔥 Chuỗi ${c.chuoi} ngày liên tục! Giữ lửa nhé.`, { loai: 'ok' });
  }
  // Chế độ thử: gõ plThuChuoi(5) trong Console để giả lập "hôm qua chuỗi 4 ngày" rồi tải lại trang
  if (duLieu.cheDo === 'local') {
    window.plThuChuoi = async (n) => {
      await duLieu.luuRieng({ chuoi: n - 1, chuoiDaiNhat: Math.max(ctx.rieng.chuoiDaiNhat, n - 1), ngayCuoi: ngayHomTruoc(ngayVN()) });
      location.reload();
    };
  }
  // Theo dõi điểm chăm chỉ thay đổi ở tab khác / máy khác
  duLieu.theoDoiRieng((r) => { ctx.rieng = r; capNhatDauTrang(ctx); document.dispatchEvent(new CustomEvent('pl:rieng')); });
  // Thú ảo đi dạo trên mọi trang
  import('./ui/thu-ao.js').then((m) => m.khoiTaoThuAo(ctx)).catch((e) => console.warn('Thú ảo chưa chạy được:', e));
  // Lời mời học cùng hiện trên mọi trang
  if (duLieu.theoDoiLoiMoi) (await import('./ui/loi-moi.js')).ganLoiMoi(ctx);
  return ctx;
}
