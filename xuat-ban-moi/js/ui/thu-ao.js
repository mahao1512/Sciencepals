/*
 * thu-ao.js — Thú ảo đi dạo trên mọi trang.
 *  - Rê chuột / ngón tay lại gần: thú chạy theo, đứng cạnh thì thả tim.
 *  - Bấm vào thú: nhảy lên và kể một điều thú vị. Kéo thả để bế thú đi chỗ khác.
 *  - Nút 🐾 góc dưới bên trái: chọn thú, cho ăn, vuốt ve, ẩn / hiện.
 *  - Thú mới mở khoá ở các mốc chuỗi 10, 20, …, 100 ngày.
 * Trạng thái thú (đang chọn con nào, no bụng, vui vẻ) lưu trên máy này, theo từng tài khoản.
 */
import { esc, moCuaSo, napCss } from '../tienich.js';
import { THU_CUNG, daMoThu, chuoiTotNhat } from '../thu-cung.js';

const LOI_THU = [
  'Ánh sáng đi từ Mặt Trời đến Trái Đất mất khoảng 8 phút!',
  'Nước sôi ở 100°C, nhưng trên đỉnh Everest chỉ khoảng 70°C.',
  'Bạch tuộc có 3 trái tim đó!',
  'Cơ thể người có khoảng 60% là nước.',
  'Sét nóng hơn bề mặt Mặt Trời gấp nhiều lần!',
  'Kim cương và than chì đều được tạo từ nguyên tử carbon.',
  'Ong mật có thể nhận ra khuôn mặt người.',
  'Học cùng bạn giúp nhớ bài lâu hơn đó!',
  'Mỗi ngày học một chút, chuỗi lửa sẽ cháy mãi! 🔥',
  'Mệt thì nghỉ 5 phút, uống nước rồi học tiếp nhé 💧'
];
const giamChuyenDong = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

export function khoiTaoThuAo(ctx) {
  if (document.getElementById('thu-ao')) return;
  napCss('css/thu-ao.css');
  const khoa = 'pl_thu_' + ctx.uid;
  const s = (() => {
    let d = {};
    try { d = JSON.parse(localStorage.getItem(khoa)) || {}; } catch (e) { /* bỏ qua */ }
    d = { dangChon: 0, no: 80, vui: 80, luc: Date.now(), daBao: [], an: false, ...d };
    const gio = (Date.now() - d.luc) / 36e5; // đói / buồn dần khi vắng
    d.no = Math.max(0, d.no - gio * 4);
    d.vui = Math.max(0, d.vui - gio * 3);
    return d;
  })();
  const luu = () => { s.luc = Date.now(); try { localStorage.setItem(khoa, JSON.stringify(s)); } catch (e) { /* bỏ qua */ } };
  const thuDangChon = () => (daMoThu(ctx.rieng, s.dangChon) ? THU_CUNG[s.dangChon] : THU_CUNG[0]);

  /* ---------- Phần tử ---------- */
  const el = document.createElement('div');
  el.id = 'thu-ao';
  el.setAttribute('aria-hidden', 'true'); // trang trí; người dùng bàn phím dùng nút 🐾
  el.innerHTML = '<div class="ta-loi"></div><div class="ta-than"></div><div class="ta-bong"></div>';
  document.body.appendChild(el);
  const than = el.querySelector('.ta-than');
  const nut = document.createElement('button');
  nut.id = 'ta-nut';
  nut.type = 'button';
  nut.setAttribute('aria-label', 'Thú ảo của bạn: chọn thú, cho ăn, vuốt ve');
  nut.innerHTML = '<span aria-hidden="true">🐾</span>';
  nut.addEventListener('click', () => moBang());
  document.body.appendChild(nut);

  let x = innerWidth - 120, y = innerHeight - 110, tx = x, ty = y, huong = 1;
  let mx = -999, my = -999, lucRe = 0, keo = null, cho = 0, duoi = false;

  const noi = (chu, ms = 3500) => {
    const b = el.querySelector('.ta-loi');
    b.textContent = chu;
    b.classList.add('hien');
    clearTimeout(noi.t);
    noi.t = setTimeout(() => b.classList.remove('hien'), ms);
  };
  const bay = (ch) => {
    const f = document.createElement('span');
    f.className = 'ta-bay';
    f.textContent = ch;
    f.style.left = (x - 8 + Math.random() * 16) + 'px';
    f.style.top = (y - 30) + 'px';
    document.body.appendChild(f);
    setTimeout(() => f.remove(), 1200);
  };
  const lapLanh = () => {
    const p = document.createElement('span');
    p.className = 'ta-lap-lanh';
    p.style.left = x + 'px';
    p.style.top = (y + 18) + 'px';
    p.style.background = thuDangChon().sang;
    document.body.appendChild(p);
    setTimeout(() => p.remove(), 800);
  };

  function veThu() {
    const t = thuDangChon();
    than.textContent = t.e;
    than.style.filter = t.sang ? `drop-shadow(0 0 10px ${t.sang})` : '';
    el.style.display = s.an ? 'none' : '';
    nut.classList.toggle('ta-tat', s.an);
    // Báo thú mới mở khoá
    const moi = THU_CUNG.filter((q, i) => q.m && daMoThu(ctx.rieng, i) && !s.daBao.includes(q.m));
    if (moi.length) {
      s.daBao.push(...moi.map((q) => q.m));
      luu();
      setTimeout(() => {
        const tb = document.createElement('div');
        tb.className = 'ta-mo-khoa';
        tb.setAttribute('role', 'status');
        tb.textContent = '🎉 Mở khoá thú ảo mới: ' + moi.map((q) => q.e + ' ' + q.ten).join(', ') + ' — bấm 🐾 để chọn!';
        document.body.appendChild(tb);
        setTimeout(() => tb.remove(), 5000);
      }, 800);
    }
  }

  function vuotVe() {
    than.classList.remove('nhay');
    void than.offsetWidth;
    than.classList.add('nhay');
    for (let i = 0; i < 3; i++) setTimeout(() => bay('❤️'), i * 120);
    s.vui = Math.min(100, s.vui + 8);
    luu();
    noi(LOI_THU[Math.floor(Math.random() * LOI_THU.length)], 4500);
  }
  function choAn() {
    s.no = Math.min(100, s.no + 25);
    s.vui = Math.min(100, s.vui + 5);
    luu();
    ['🍎', '🥕', '🍪'].forEach((c, i) => setTimeout(() => bay(c), i * 150));
    noi('Ngon quá! Cảm ơn bạn 😋');
  }

  /* ---------- Chuột, ngón tay ---------- */
  document.addEventListener('pointermove', (e) => {
    mx = e.clientX; my = e.clientY; lucRe = performance.now();
    if (keo) { x = e.clientX - keo.dx; y = e.clientY - keo.dy; keo.daKeo = keo.daKeo || Math.hypot(e.clientX - keo.x0, e.clientY - keo.y0) > 6; }
  });
  el.addEventListener('pointerdown', (e) => {
    keo = { dx: e.clientX - x, dy: e.clientY - y, x0: e.clientX, y0: e.clientY, daKeo: false };
    el.setPointerCapture(e.pointerId);
    el.classList.add('dang-be');
  });
  el.addEventListener('pointerup', () => {
    const k = keo;
    keo = null;
    el.classList.remove('dang-be');
    if (k && !k.daKeo) vuotVe();
    else { tx = x; ty = y; noi('Wiii~ 🎢', 1500); }
  });

  /* ---------- Vòng lặp đi lại ---------- */
  let truoc = performance.now();
  function buoc(t) {
    const k = Math.min(50, t - truoc) / 16.7;
    truoc = t;
    if (!s.an) {
      if (!keo && !giamChuyenDong()) {
        const dx = mx - x, dy = my - y, xa = Math.hypot(dx, dy);
        const gan = t - lucRe < 4000 && xa < 240;
        let toc = (s.no < 20 ? 0.9 : 1.8) * k;
        if (gan && xa > 70) { tx = mx; ty = my + 40; toc *= 1.5; if (!duoi) { duoi = true; noi('!', 700); } }
        else if (gan) { tx = x; ty = y; duoi = false; if (Math.random() < 0.02 * k) bay('❤️'); }
        else {
          duoi = false;
          if (Math.hypot(tx - x, ty - y) < 4 && (cho -= k) <= 0) {
            tx = 40 + Math.random() * (innerWidth - 80);
            ty = 120 + Math.random() * (innerHeight - 180);
            cho = 60 + Math.random() * 200;
          }
        }
        const vx = tx - x, vy = ty - y, d = Math.hypot(vx, vy);
        if (d > 3) {
          const b = Math.min(toc, d);
          x += (vx / d) * b; y += (vy / d) * b;
          if (Math.abs(vx) > 2) huong = vx > 0 ? -1 : 1;
          than.classList.add('di');
          if (thuDangChon().vet && Math.random() < 0.25 * k) lapLanh();
        } else than.classList.remove('di');
      }
      x = Math.max(30, Math.min(innerWidth - 30, x));
      y = Math.max(110, Math.min(innerHeight - 30, y));
      el.style.transform = `translate(${x - 30}px, ${y - 30}px)`;
      than.style.setProperty('--huong', huong);
    }
    requestAnimationFrame(buoc);
  }
  veThu();
  requestAnimationFrame(buoc);
  setInterval(() => {
    s.no = Math.max(0, s.no - 1);
    s.vui = Math.max(0, s.vui - 0.7);
    luu();
    if (s.no < 25 && !s.an && Math.random() < 0.5) noi('Mình đói quá... 🍎 Bấm 🐾 để cho mình ăn nhé');
  }, 60000);
  if (!s.an) setTimeout(() => noi(`Xin chào ${ctx.congKhai.ten}! Chạm vào mình nhé 👋`), 1500);
  // Chuỗi thay đổi (ví dụ qua ngày mới) → kiểm tra mở khoá
  document.addEventListener('pl:rieng', veThu);

  /* ---------- Bảng thú ảo ---------- */
  function moBang() {
    const cs = moCuaSo('<div id="ta-bang"></div>', { tieuDe: 'Thú ảo của bạn' });
    const ve = () => {
      const t = thuDangChon();
      const thanh = (v, nhan, lop) =>
        `<div class="ta-thanh"><div class="ta-thanh-chu"><span>${nhan}</span><span>${Math.round(v)}%</span></div>` +
        `<div class="ta-thanh-nen" role="progressbar" aria-label="${nhan}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(v)}"><span class="${lop}" style="width:${v}%"></span></div></div>`;
      const ds = THU_CUNG.map((q, i) => {
        const mo = daMoThu(ctx.rieng, i);
        const dang = q === t;
        return mo
          ? `<button type="button" class="ta-o${dang ? ' dang' : ''}" data-chon="${i}" aria-pressed="${dang}"><span class="ta-o-e" style="${q.sang ? `filter:drop-shadow(0 0 6px ${q.sang})` : ''}" aria-hidden="true">${q.e}</span><span>${esc(q.ten)}</span></button>`
          : `<div class="ta-o khoa"><span class="ta-o-e" aria-hidden="true">${q.e}</span><span>🔒 Chuỗi ${q.m} ngày</span><span class="sr-only">${esc(q.ten)} chưa mở khoá</span></div>`;
      }).join('');
      cs.querySelector('#ta-bang').innerHTML =
        `<div class="ta-dau"><div class="ta-lon" style="${t.sang ? `filter:drop-shadow(0 0 10px ${t.sang})` : ''}" aria-hidden="true">${t.e}</div>` +
        `<div><h3>${esc(t.ten)}</h3><p class="small muted">Chuỗi tốt nhất của bạn: 🔥 ${chuoiTotNhat(ctx.rieng)} ngày. Giữ chuỗi để mở thêm thú mới ở các mốc 10, 20, …, 100 ngày.</p></div></div>` +
        thanh(s.no, '🍎 No bụng', 'cam') + thanh(s.vui, '💖 Vui vẻ', 'hong') +
        `<div class="row" style="margin:14px 0">` +
        `<button type="button" class="btn btn-primary" data-lam="an">🍎 Cho ăn</button>` +
        `<button type="button" class="btn btn-secondary" data-lam="vuot">💖 Vuốt ve</button>` +
        `<button type="button" class="btn btn-secondary" data-lam="an-hien">${s.an ? '👀 Hiện thú ảo' : '🙈 Ẩn thú ảo'}</button></div>` +
        `<h3 class="ta-bst">Bộ sưu tập thú ảo</h3><div class="ta-luoi">${ds}</div>` +
        `<p class="small muted" style="margin-top:10px">Mẹo: rê chuột lại gần để thú chạy theo, bấm vào thú để nghe một điều thú vị, kéo thả để bế thú đi chỗ khác. Mỗi thú còn có 5 sticker cảm xúc trong Sổ tay cảm xúc.</p>`;
      cs.querySelectorAll('[data-chon]').forEach((b) => b.addEventListener('click', () => {
        s.dangChon = Number(b.dataset.chon);
        luu();
        veThu();
        noi('Chào bạn, mình là ' + THU_CUNG[s.dangChon].ten + '!');
        ve();
        cs.querySelector(`[data-chon="${s.dangChon}"]`)?.focus();
      }));
      cs.querySelector('[data-lam="an"]').addEventListener('click', () => { choAn(); ve(); });
      cs.querySelector('[data-lam="vuot"]').addEventListener('click', () => { vuotVe(); ve(); });
      cs.querySelector('[data-lam="an-hien"]').addEventListener('click', () => { s.an = !s.an; luu(); veThu(); ve(); });
    };
    ve();
  }
}
