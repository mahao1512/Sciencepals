/*
 * so-tay.js — Sổ tay cảm xúc: mỗi ngày một trang nhật ký, lật như sách thật.
 * Mỗi trang gồm: câu hỏi định hướng của ngày (cảm xúc, sở thích, hướng nghiệp), điều đã làm được,
 * điều chưa làm được, ngày mai mình sẽ…, cảm xúc trong ngày và sticker thú cưng.
 * Xem lại và viết tiếp được 100 ngày gần nhất. Nhật ký là riêng tư: chỉ chủ tài khoản đọc được.
 */
import { duLieu } from '../data/index.js';
import { esc, ngayVN, ngayCong, soNgay, napCss, thongBao } from '../tienich.js';
import { THU_CUNG, CAM_XUC_STICKER, daMoThu, htmlSticker } from '../thu-cung.js';

const CAU_HOI = [
  'Hôm nay cảm xúc của bạn giống kiểu thời tiết nào? Vì sao?',
  'Môn học nào khiến bạn thấy hứng thú nhất gần đây?',
  'Nếu được làm bất kỳ nghề nào mà không sợ thất bại, bạn sẽ chọn nghề gì?',
  'Điều gì giúp bạn thư giãn sau một buổi ôn thi căng thẳng?',
  'Bạn tự hào về bản thân điều gì trong tuần này?',
  'Ngành học mơ ước của bạn là gì? Điều gì ở ngành đó thu hút bạn?',
  'Hôm nay có ai khiến bạn mỉm cười không?',
  'Một sở thích bạn muốn thử ngay sau kỳ thi là gì?',
  'Bạn đang lo lắng điều gì nhất? Viết ra đây cho nhẹ lòng nhé.',
  '5 năm nữa, bạn mong mình đang làm gì, ở đâu?',
  'Khi gặp bài khó, bạn thường làm gì để vượt qua?',
  'Bài hát nào đang tiếp thêm năng lượng cho bạn?',
  'Bạn học hiệu quả nhất vào khung giờ nào trong ngày?',
  'Kỹ năng nào của bạn sẽ hữu ích cho công việc tương lai?',
  'Hôm nay bạn đã chăm sóc bản thân thế nào (ăn, ngủ, vận động)?',
  'Ai là người bạn ngưỡng mộ trong lĩnh vực nghề nghiệp bạn quan tâm?',
  'Một điều nhỏ bé khiến bạn biết ơn hôm nay là gì?',
  'Bạn thích làm việc một mình hay làm việc nhóm? Vì sao?',
  'Nếu được nói một câu với chính mình vào ngày thi, bạn sẽ nói gì?',
  'Trường đại học nào bạn đang để ý? Bạn đã biết gì về nơi đó?',
  'Cảm xúc nào xuất hiện nhiều nhất trong ngày hôm nay?',
  'Bạn thích khám phá thế giới qua con số, con chữ, con người hay máy móc?',
  'Điều gì làm bạn mất tập trung nhất? Bạn có thể làm gì với nó?',
  'Một kỷ niệm đẹp thời cấp 3 mà bạn muốn giữ mãi là gì?',
  'Bạn mong gia đình hiểu điều gì về bạn lúc này?',
  'Công việc mơ ước của bạn sẽ giúp ích được cho ai?',
  'Hôm nay bạn đã tiến bộ hơn hôm qua ở điểm nào?',
  'Nếu được nghỉ trọn một ngày, bạn sẽ làm gì?',
  'Bạn chọn tổ hợp môn thi vì đam mê hay vì lý do khác?',
  'Điều gì giúp bạn đứng dậy sau một lần điểm thấp?',
  'Môi trường làm việc lý tưởng của bạn trông như thế nào?',
  'Một cuốn sách hay bộ phim truyền cảm hứng cho bạn gần đây là gì?',
  'Tuần này bạn khám phá ra điều gì mới về bản thân?',
  'Nếu kết quả thi không như mong muốn, kế hoạch B của bạn là gì?',
  'Hãy viết một lời khen dành cho chính bạn hôm nay nhé!',
  'Hoạt động nào khiến bạn quên cả thời gian?'
];
const CAM_XUC = [
  { k: 'vui', e: '😄', t: 'Vui' }, { k: 'yen', e: '😌', t: 'Bình yên' }, { k: 'buon', e: '😢', t: 'Buồn' },
  { k: 'met', e: '😵‍💫', t: 'Mệt' }, { k: 'lo', e: '😰', t: 'Lo lắng' }
];
const CAN_AN_UI = ['buon', 'met', 'lo'];
const THU = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
const SO_NGAY = 100;
const TOI_DA_STICKER = 15;
const TRUONG = ['traLoi', 'daLam', 'chuaLam', 'ngayMai'];

const ngayUTC = (k) => { const [y, m, d] = k.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)); };
const cauHoiNgay = (k) => CAU_HOI[Math.floor(ngayUTC(k).getTime() / 864e5) % CAU_HOI.length];
const dd = (k) => k.split('-').reverse().join('/');
const giamChuyenDong = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const coViet = (e) => e && (TRUONG.some((f) => (e[f] || '').trim()) || e.camXuc || (e.sticker || []).length);

/** Mở sổ tay. `ctx` cần { uid, congKhai, rieng }. */
export async function moSoTay(ctx) {
  napCss('https://fonts.googleapis.com/css2?family=Pangolin&display=swap');
  napCss('css/so-tay.css');
  const homNay = ngayVN();
  const dauKy = ngayCong(homNay, -(SO_NGAY - 1));
  let du = {};      // { ngay: trang }
  let hienTai = homNay;
  let dangLat = false;
  const canLuu = new Set();
  let henLuu = null;

  /* ---------- Khung ---------- */
  const hop = document.createElement('dialog');
  hop.className = 'st-hop';
  hop.setAttribute('aria-labelledby', 'st-td');
  hop.innerHTML =
    `<div class="st-khung">` +
    `<div class="st-tren"><h2 id="st-td">📔 Sổ tay cảm xúc <small>của ${esc(ctx.congKhai.ten)}</small></h2>` +
    `<span class="st-luu" id="st-luu" role="status" aria-live="polite"></span>` +
    `<button type="button" class="st-nut" id="st-dong" aria-label="Đóng sổ tay">✕</button></div>` +
    `<div class="st-sach" id="st-sach"><div class="st-trang" id="st-chinh"><p class="st-cho">Đang mở sổ tay…</p></div></div>` +
    `<nav class="st-nav" aria-label="Lật trang sổ tay">` +
    `<button type="button" class="st-nut" id="st-truoc">◀ Hôm trước</button>` +
    `<button type="button" class="st-nut" id="st-muc-luc">📅 100 ngày</button>` +
    `<button type="button" class="st-nut" id="st-hom-nay">Hôm nay</button>` +
    `<button type="button" class="st-nut" id="st-sau">Hôm sau ▶</button>` +
    `<button type="button" class="st-nut hong" id="st-mo-khay" aria-expanded="false" aria-controls="st-khay">🎨 Sticker</button></nav>` +
    `<div class="st-khay" id="st-khay" hidden></div></div>`;
  document.body.appendChild(hop);
  const $ = (s) => hop.querySelector(s);
  const chinh = $('#st-chinh');
  const baoLuu = (t) => { $('#st-luu').textContent = t; };

  let daDong = false;
  const dong = async () => {
    if (daDong) return;
    daDong = true;
    await luuNgay();
    if (hop.open) hop.close();
    hop.remove();
    document.body.style.overflow = '';
  };
  $('#st-dong').addEventListener('click', dong);
  hop.addEventListener('cancel', (e) => { e.preventDefault(); dong(); });
  hop.showModal();
  document.body.style.overflow = 'hidden';

  try {
    du = await duLieu.docNhatKy(dauKy);
  } catch (e) {
    chinh.innerHTML = `<p class="st-cho">Chưa mở được sổ tay: ${esc(e.message)}<br>Kiểm tra mạng rồi bấm ✕ và mở lại nhé.</p>`;
    return;
  }

  /* ---------- Lưu ---------- */
  function trangCua(k) {
    if (!du[k]) du[k] = { cauHoi: cauHoiNgay(k), sticker: [] };
    return du[k];
  }
  function danhDau(k) {
    canLuu.add(k);
    baoLuu('Đang lưu…');
    clearTimeout(henLuu);
    henLuu = setTimeout(luuNgay, 700);
  }
  async function luuNgay() {
    clearTimeout(henLuu);
    const ds = [...canLuu];
    canLuu.clear();
    if (!ds.length) return;
    try {
      await Promise.all(ds.map((k) => duLieu.ghiNhatKy(k, du[k])));
      baoLuu('Đã lưu ✓');
    } catch (e) {
      ds.forEach((k) => canLuu.add(k));
      baoLuu('Chưa lưu được — sẽ thử lại');
      henLuu = setTimeout(luuNgay, 4000);
    }
  }

  /* ---------- Vẽ một trang ---------- */
  function htmlTrang(k, chiDoc) {
    if (k === 'muc-luc') return htmlMucLuc();
    const e = du[k] || {};
    const R = chiDoc ? ' readonly tabindex="-1"' : '';
    const id = (f) => (chiDoc ? '' : ` id="st-${f}"`);
    const o = (f, goiY, dong) => `<textarea data-f="${f}"${id(f)} rows="${dong}" maxlength="3000" placeholder="${goiY}"${R}>${esc(e[f] || '')}</textarea>`;
    return `<div class="st-in"><div class="st-bang-dinh" aria-hidden="true"></div>` +
      `<div class="st-dau"><div><div class="st-thu">${THU[ngayUTC(k).getUTCDay()]}</div><div class="st-ngay">${dd(k)}${k === homNay ? ' · hôm nay' : ''}</div></div>` +
      `<div class="st-cam-xuc" role="group" aria-label="Cảm xúc hôm nay">` +
      CAM_XUC.map((m) => `<button type="button" data-cx="${m.k}" aria-pressed="${e.camXuc === m.k}" aria-label="${m.t}" title="${m.t}"${chiDoc ? ' tabindex="-1"' : ''}>${m.e}</button>`).join('') +
      `</div></div>` +
      `<div class="st-cau-hoi"><label${chiDoc ? '' : ' for="st-traLoi"'}><b>💭 Câu hỏi hôm nay</b><span>${esc(e.cauHoi || cauHoiNgay(k))}</span></label>${o('traLoi', 'Viết suy nghĩ của bạn…', 2)}</div>` +
      `<div class="st-muc m1"><label${chiDoc ? '' : ' for="st-daLam"'}>🌟 Hôm nay mình đã làm được</label>${o('daLam', 'Dù nhỏ thôi cũng đáng ghi lại nhé!', 3)}</div>` +
      `<div class="st-muc m2"><label${chiDoc ? '' : ' for="st-chuaLam"'}>🌧️ Điều mình chưa làm được</label><small>Không sao đâu, ai cũng có ngày như vậy 🌷</small>${o('chuaLam', 'Mình chưa kịp…', 2)}</div>` +
      `<div class="st-muc m3"><label${chiDoc ? '' : ' for="st-ngayMai"'}>🚀 Ngày mai mình sẽ…</label>${o('ngayMai', 'Một mục tiêu nhỏ cho ngày mai', 2)}</div>` +
      `<div class="st-an-ui"${CAN_AN_UI.includes(e.camXuc) ? '' : ' hidden'}>💛 Bạn đã cố gắng nhiều rồi. Hãy nghỉ một chút, uống nước, hít thở sâu. Nếu thấy quá sức, đừng giữ một mình nhé — hãy chia sẻ với bố mẹ, thầy cô hoặc thầy cô tư vấn tâm lí của trường.</div>` +
      (e.sticker || []).map((s, i) => htmlSticker(s.p, s.e, {
        lop: 'dan',
        thuocTinh: chiDoc ? '' : `data-i="${i}" tabindex="0"`,
        kieu: `left:${s.x}%;top:${s.y}px;--xoay:${s.r}deg;`
      }) + (chiDoc ? '' : '')).join('') +
      `</div>`;
  }

  function htmlMucLuc() {
    let o = '';
    let soTrang = 0;
    let soSticker = 0;
    const dem = {};
    for (let i = SO_NGAY - 1; i >= 0; i--) {
      const k = ngayCong(homNay, -i);
      const e = du[k];
      const co = coViet(e);
      if (co) { soTrang++; soSticker += (e.sticker || []).length; if (e.camXuc) dem[e.camXuc] = (dem[e.camXuc] || 0) + 1; }
      const cx = co && e.camXuc ? CAM_XUC.find((m) => m.k === e.camXuc) : null;
      o += `<button type="button" class="st-o${co ? ' co' : ''}${i === 0 ? ' hom-nay' : ''}" data-mo="${k}" ` +
        `aria-label="${dd(k)}${co ? ', đã viết' + (cx ? ', cảm xúc ' + cx.t.toLowerCase() : '') : ', chưa viết'}">` +
        (cx ? cx.e : co ? '✏️' : `<span>${Number(k.slice(8))}</span>`) + `</button>`;
    }
    const nhieu = Object.keys(dem).sort((a, b) => dem[b] - dem[a])[0];
    const cxNhieu = nhieu ? CAM_XUC.find((m) => m.k === nhieu) : null;
    return `<div class="st-in"><div class="st-bang-dinh" aria-hidden="true"></div>` +
      `<div class="st-thu">📅 Hành trình 100 ngày</div><div class="st-ngay">Chạm vào một ngày để mở lại trang nhật ký</div>` +
      `<div class="st-thong-ke"><div><b>${soTrang}</b>trang đã viết</div>` +
      `<div><b>${cxNhieu ? cxNhieu.e : '—'}</b>${cxNhieu ? 'cảm xúc nhiều nhất' : 'chưa chọn cảm xúc'}</div>` +
      `<div><b>${soSticker}</b>sticker đã dán</div></div>` +
      `<div class="st-luoi">${o}</div>` +
      `<p class="st-ngay" style="margin-top:12px">Mỗi trang là một bước tiến. Cứ đi từng bước thôi, bạn nhé 🌱</p></div>`;
  }

  /* ---------- Gắn xử lí cho trang đang mở ---------- */
  function gan() {
    chinh.innerHTML = htmlTrang(hienTai);
    chinh.scrollTop = 0;
    const laMucLuc = hienTai === 'muc-luc';
    $('#st-truoc').disabled = laMucLuc || soNgay(hienTai, homNay) >= SO_NGAY - 1;
    $('#st-sau').disabled = laMucLuc || hienTai === homNay;
    $('#st-hom-nay').disabled = hienTai === homNay;
    if (laMucLuc) {
      chinh.querySelectorAll('[data-mo]').forEach((b) => b.addEventListener('click', () => lat(b.dataset.mo)));
      return;
    }
    const k = hienTai;
    chinh.querySelectorAll('textarea[data-f]').forEach((t) => t.addEventListener('input', () => {
      trangCua(k)[t.dataset.f] = t.value;
      danhDau(k);
    }));
    chinh.querySelectorAll('[data-cx]').forEach((b) => b.addEventListener('click', () => {
      const e = trangCua(k);
      e.camXuc = e.camXuc === b.dataset.cx ? '' : b.dataset.cx;
      danhDau(k);
      chinh.querySelectorAll('[data-cx]').forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.cx === e.camXuc)));
      chinh.querySelector('.st-an-ui').hidden = !CAN_AN_UI.includes(e.camXuc);
    }));
    const vung = chinh.querySelector('.st-in');
    vung.addEventListener('pointerdown', (ev) => { if (!ev.target.closest('.dan')) vung.querySelectorAll('.dan.chon').forEach((s) => s.classList.remove('chon')); });
    vung.querySelectorAll('.dan').forEach((s) => ganSticker(s, vung, k));
  }

  /** Kéo sticker; phím mũi tên để dịch, Delete để gỡ; chọn rồi bấm × để gỡ. */
  function ganSticker(el, vung, k) {
    const i = Number(el.dataset.i);
    const st = () => trangCua(k).sticker[i];
    const xoa = document.createElement('button');
    xoa.type = 'button';
    xoa.className = 'stk-xoa';
    xoa.textContent = '×';
    xoa.setAttribute('aria-label', 'Gỡ sticker này');
    el.appendChild(xoa);
    const go = () => { trangCua(k).sticker.splice(i, 1); danhDau(k); const t = chinh.scrollTop; gan(); chinh.scrollTop = t; };
    xoa.addEventListener('click', (ev) => { ev.stopPropagation(); go(); });
    const dat = () => { el.style.left = st().x + '%'; el.style.top = st().y + 'px'; };
    el.addEventListener('keydown', (ev) => {
      const s = st();
      const buoc = { ArrowLeft: [-2, 0], ArrowRight: [2, 0], ArrowUp: [0, -10], ArrowDown: [0, 10] }[ev.key];
      if (buoc) {
        ev.preventDefault();
        s.x = Math.max(0, Math.min(85, s.x + buoc[0]));
        s.y = Math.max(0, Math.min(vung.scrollHeight - 60, s.y + buoc[1]));
        dat();
        danhDau(k);
      } else if (ev.key === 'Delete' || ev.key === 'Backspace') { ev.preventDefault(); go(); }
    });
    el.addEventListener('focus', () => { vung.querySelectorAll('.dan.chon').forEach((x) => x.classList.remove('chon')); el.classList.add('chon'); });
    el.addEventListener('pointerdown', (ev) => {
      if (ev.target === xoa) return;
      ev.preventDefault();
      vung.querySelectorAll('.dan.chon').forEach((x) => x.classList.remove('chon'));
      el.classList.add('chon');
      el.setPointerCapture(ev.pointerId);
      const r = el.getBoundingClientRect();
      const ox = ev.clientX - r.left;
      const oy = ev.clientY - r.top;
      const keo = (e) => {
        const R = vung.getBoundingClientRect();
        const s = st();
        s.x = Math.round(Math.max(0, Math.min(85, ((e.clientX - R.left - ox) / R.width) * 100)) * 10) / 10;
        s.y = Math.round(Math.max(0, Math.min(vung.scrollHeight - 60, e.clientY - R.top - oy)));
        dat();
      };
      const tha = () => { el.removeEventListener('pointermove', keo); el.removeEventListener('pointerup', tha); danhDau(k); };
      el.addEventListener('pointermove', keo);
      el.addEventListener('pointerup', tha);
    });
  }

  /* ---------- Lật trang ---------- */
  function lat(k) {
    if (dangLat || k === hienTai) return;
    luuNgay();
    if (giamChuyenDong()) { hienTai = k; gan(); return; }
    const toi = hienTai === 'muc-luc' ? false : k === 'muc-luc' ? true : k > hienTai;
    const sach = $('#st-sach');
    const phu = document.createElement('div');
    phu.className = 'st-trang st-lat';
    phu.setAttribute('aria-hidden', 'true');
    dangLat = true;
    if (toi) {
      // Trang cũ lật sang trái, để lộ trang mới bên dưới
      phu.innerHTML = htmlTrang(hienTai, true);
      phu.scrollTop = chinh.scrollTop;
      sach.appendChild(phu);
      hienTai = k;
      gan();
      phu.getBoundingClientRect();
      phu.classList.add('da-lat');
      setTimeout(() => { phu.remove(); dangLat = false; }, 760);
    } else {
      // Trang mới lật từ trái về, phủ lên trang cũ
      phu.innerHTML = htmlTrang(k, true);
      phu.classList.add('da-lat');
      sach.appendChild(phu);
      phu.getBoundingClientRect();
      phu.classList.remove('da-lat');
      setTimeout(() => { hienTai = k; gan(); phu.remove(); dangLat = false; }, 760);
    }
  }
  $('#st-truoc').addEventListener('click', () => { if (hienTai !== 'muc-luc') lat(ngayCong(hienTai, -1)); });
  $('#st-sau').addEventListener('click', () => { if (hienTai !== 'muc-luc') lat(ngayCong(hienTai, 1)); });
  $('#st-hom-nay').addEventListener('click', () => lat(homNay));
  $('#st-muc-luc').addEventListener('click', () => lat('muc-luc'));

  /* ---------- Khay sticker ---------- */
  $('#st-mo-khay').addEventListener('click', (ev) => {
    const khay = $('#st-khay');
    const mo = khay.hidden;
    ev.currentTarget.setAttribute('aria-expanded', String(mo));
    if (!mo) { khay.hidden = true; return; }
    khay.innerHTML = `<p class="st-khay-goi-y">Chạm để dán vào trang · kéo để di chuyển · chọn sticker rồi bấm × để gỡ. Mỗi thú cưng có 5 sticker, mở khoá cùng thú.</p>` +
      THU_CUNG.map((T, p) => {
        const daMo = daMoThu(ctx.rieng, p);
        return `<div class="st-nhom"><div class="st-nhom-ten">${T.e} ${esc(T.ten)}${daMo ? '' : ` — 🔒 mở khi chuỗi đạt ${T.m} ngày`}</div>` +
          `<div class="st-nhom-ds${daMo ? '' : ' khoa'}">` +
          CAM_XUC_STICKER.map((_, e) => daMo
            ? `<button type="button" class="st-chon" data-p="${p}" data-e="${e}">${htmlSticker(p, e)}</button>`
            : `<span class="st-chon" aria-hidden="true">${htmlSticker(p, e)}</span>`).join('') +
          `</div></div>`;
      }).join('');
    khay.querySelectorAll('[data-p]').forEach((b) => b.addEventListener('click', () => danSticker(Number(b.dataset.p), Number(b.dataset.e))));
    khay.hidden = false;
  });
  function danSticker(p, e) {
    if (hienTai === 'muc-luc') return thongBao('Hãy mở một trang nhật ký trước khi dán sticker nhé!');
    const k = hienTai;
    const ds = trangCua(k).sticker = trangCua(k).sticker || [];
    if (ds.length >= TOI_DA_STICKER) return thongBao(`Mỗi trang dán tối đa ${TOI_DA_STICKER} sticker thôi nhé!`);
    ds.push({
      p, e,
      x: Math.round(10 + Math.random() * 60),
      y: Math.round(chinh.scrollTop + 60 + Math.random() * Math.max(60, chinh.clientHeight - 200)),
      r: Math.round(Math.random() * 24 - 12)
    });
    danhDau(k);
    const t = chinh.scrollTop;
    gan();
    chinh.scrollTop = t;
  }

  gan();
}
