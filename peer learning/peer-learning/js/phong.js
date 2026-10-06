/*
 * phong.js — Phòng học đôi / nhóm: chỗ ngồi, trạng thái, trò chuyện, bảng trắng, đồng hồ phòng.
 * Mọi thay đổi đi qua tầng dữ liệu; giao diện vẽ lại khi theoDoiPhong báo có thay đổi.
 */
import { duLieu } from './data/index.js';
import { esc, gioVN, taiJSON, thongBao, moCuaSo } from './tienich.js';
import { khoiTaoTrang } from './khung.js';
import { locTu } from './loc-tu.js';
import { taoBangTrang, MAU_BUT, CO_BUT } from './ui/bang-trang.js';
import { congThoiGianHoc } from './diem.js';
import { ganDeBai } from './ui/de-bai.js';
import { PHUT_MOI_LAN_THUONG, DIEM_MOI_LAN_THUONG } from './config.js';

const $ = (s) => document.querySelector(s);
const ctx = await khoiTaoTrang();
const ma = (new URLSearchParams(location.search).get('ma') || '').trim().toUpperCase();

function baoLoi(html) {
  $('#p-tai').hidden = true;
  $('#p-phong').hidden = true;
  const el = $('#p-loi');
  el.hidden = false;
  el.innerHTML = `<div class="empty">${html}<p style="margin-top:14px"><a class="btn btn-primary" href="index.html">Về trang chủ</a></p></div>`;
}

if (!/^[A-Z0-9]{6}$/.test(ma)) {
  baoLoi('<b>Mã phòng chưa đúng.</b>Mã phòng gồm 6 chữ cái hoặc chữ số. Về trang chủ, bấm “Học nhóm” hoặc “Học cùng bạn” rồi nhập lại mã.');
  await new Promise(() => {}); // dừng trang tại đây
}

const de = await taiJSON('data/de-mau.json').catch(() => ({ subjects: [] }));
const tenMon = Object.fromEntries(de.subjects.map((m) => [m.id, m.name]));
const TRANG_THAI = Object.fromEntries(PeerAssets.CHARACTER_OPTIONS.expressions.map((x) => [x.id, x.name]));
const BIEU_TUONG = { 'vui-ve': '😊', 'hao-huc': '🤩', 'buon-ngu': '😴', 'buon-ba': '😟' };

/* ---------- Vào phòng ---------- */
let phong;
try {
  phong = await duLieu.vaoPhong(ma, {
    ten: ctx.congKhai.ten,
    nhanVat: ctx.congKhai.nhanVat,
    ban: ctx.congKhai.ban || 'go-soi',
    monManh: ctx.congKhai.manh?.[0] || ''
  });
} catch (e) {
  baoLoi(`<b>Chưa vào được phòng.</b>${esc(e.message)}`);
  await new Promise(() => {}); // dừng trang tại đây
}
$('#p-tai').hidden = true;
$('#p-phong').hidden = false;
$('#p-ma').textContent = ma;
document.title = `Phòng ${ma} – Học Cùng Bạn`;

const laChu = () => phong.chuPhong === ctx.uid;

/* ---------- Đầu phòng ---------- */
$('#p-chep').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(ma);
    thongBao(`Đã chép mã ${ma}. Dán gửi cho bạn của bạn nhé!`, { loai: 'ok' });
  } catch (e) {
    thongBao(`Mã phòng là <b>${ma}</b>. Bạn chép tay giúp mình nhé.`);
  }
});
$('#p-roi').addEventListener('click', async () => {
  demGio();
  await ghiGio();
  await duLieu.roiPhong(ma);
  location.href = 'index.html';
});

/* ---------- Chỗ ngồi ---------- */
function veCho() {
  const p = phong;
  $('#p-tieu-de').textContent = p.loai === 'nhom' ? `Phòng học nhóm · ${p.soCho} chỗ` : 'Phòng học đôi';
  const soNguoi = Object.keys(p.thanhVien).length;
  const trong = $('#p-trong');
  trong.hidden = soNguoi > 1;
  trong.innerHTML = `Chưa có ai khác trong phòng. Gửi mã <b>${ma}</b> cho bạn của bạn (bấm “Sao chép” ở trên).`;
  const el = $('#p-cho');
  el.dataset.so = p.soCho;
  el.innerHTML = p.cho.map((uid, i) => {
    const tv = uid && p.thanhVien[uid];
    if (!tv) {
      return `<figure class="cho trong-cho">${PeerAssets.renderSeat({ empty: true, deskId: 'go-soi' })}` +
        `<figcaption><b>Chỗ trống</b><span>Đang chờ bạn vào</span></figcaption></figure>`;
    }
    const nv = { ...tv.nhanVat, expression: tv.trangThai || 'vui-ve' };
    const toi = uid === ctx.uid;
    const manh = tv.monManh ? `Mạnh nhất: ${esc(tenMon[tv.monManh] || tv.monManh)}` : 'Chưa làm bài kiểm tra';
    const tt = TRANG_THAI[tv.trangThai] || '';
    return `<figure class="cho${toi ? ' la-toi' : ''}" aria-label="Ghế ${i + 1}: ${esc(tv.ten)}${toi ? ' (bạn)' : ''}, ${manh}, trạng thái ${tt.toLowerCase()}">` +
      PeerAssets.renderSeat({ character: nv, deskId: tv.ban }) +
      `<figcaption><b>${uid === p.chuPhong ? '<span title="Chủ phòng" aria-hidden="true">👑 </span>' : ''}${esc(tv.ten)}${toi ? ' (bạn)' : ''}</b>` +
      `<span>${manh}</span><span class="cho-tt">${BIEU_TUONG[tv.trangThai] || ''} ${esc(tt)}</span></figcaption></figure>`;
  }).join('');
}

// Chọn trạng thái → nhân vật đổi biểu cảm
$('#p-tt').innerHTML = Object.entries(TRANG_THAI).map(([id, ten]) =>
  `<label class="opt"><input type="radio" name="tt" value="${id}">${BIEU_TUONG[id] || ''} ${esc(ten)}</label>`).join('');
$('#p-tt').addEventListener('change', (e) => duLieu.capNhatToi(ma, { trangThai: e.target.value }));

/* ---------- Đồng hồ phòng ---------- */
let daBaoHetGio = false;
const conLaiMs = () => {
  const d = phong.dongHo;
  return Math.max(0, d.dangChay ? d.conLaiMs - (duLieu.gioMayChu() - d.batDauLuc) : d.conLaiMs);
};
const dinhDang = (ms) => {
  const s = Math.ceil(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${String(m).padStart(2, '0')}:${ss}`;
};
function veDongHo() {
  const d = phong.dongHo;
  const ms = conLaiMs();
  $('#dh-so').textContent = dinhDang(ms);
  $('#dh-so').classList.toggle('dang-chay', d.dangChay);
  const tt = d.dangChay ? 'Đang chạy — cố lên!' : ms === 0 ? 'Hết giờ! Nghỉ ngơi một chút nhé 🎉' : ms < d.thoiLuongMs ? 'Đang tạm dừng' : `Sẵn sàng ${Math.round(d.thoiLuongMs / 60000)} phút`;
  if ($('#dh-tt').textContent !== tt) $('#dh-tt').textContent = tt;
  const chu = laChu();
  $('#dh-dk').hidden = !chu;
  $('#dh-chi-chu').hidden = chu;
  const nut = $('#dh-chay');
  nut.innerHTML = d.dangChay ? '<i class="fas fa-pause" aria-hidden="true"></i> Tạm dừng' : '<i class="fas fa-play" aria-hidden="true"></i> Bắt đầu';
  nut.disabled = !d.dangChay && ms === 0;
  document.querySelectorAll('#dh-dk [data-phut]').forEach((b) => b.setAttribute('aria-pressed', String(d.thoiLuongMs === Number(b.dataset.phut) * 60000)));
  // Hết giờ: báo một lần; chủ phòng dừng đồng hồ trên máy chủ
  if (d.dangChay && ms === 0) {
    if (!daBaoHetGio) { daBaoHetGio = true; thongBao('⏰ Hết giờ! Cả phòng nghỉ giải lao một chút nhé.', { loai: 'ok' }); }
    if (chu) duLieu.dieuKhienDongHo(ma, 'tamDung');
  }
  if (ms > 0) daBaoHetGio = false;
}
setInterval(veDongHo, 500);
const dk = (hd, phut) => duLieu.dieuKhienDongHo(ma, hd, phut).catch((e) => thongBao(esc(e.message), { loai: 'err' }));
$('#dh-chay').addEventListener('click', () => dk(phong.dongHo.dangChay ? 'tamDung' : 'batDau'));
$('#dh-lai').addEventListener('click', () => dk('datLai'));
document.querySelectorAll('#dh-dk [data-phut]').forEach((b) => b.addEventListener('click', () => dk('datThoiLuong', Number(b.dataset.phut))));
$('#dh-tu').addEventListener('submit', (e) => {
  e.preventDefault();
  const phut = Number($('#dh-phut').value);
  if (!Number.isFinite(phut) || phut < 1 || phut > 180) return thongBao('Hãy nhập số phút từ 1 đến 180.', { loai: 'err' });
  dk('datThoiLuong', Math.round(phut));
  $('#dh-phut').value = '';
});

/* ---------- Trò chuyện ---------- */
let soTinDaXem = 0;
function veTin() {
  const ds = $('#tin-ds');
  const sat = ds.scrollHeight - ds.scrollTop - ds.clientHeight < 60;
  const tin = phong.tin || [];
  if (!tin.length) {
    ds.innerHTML = `<li class="tin-trong">Chưa có tin nhắn. Chào cả phòng một câu nhé! 👋</li>`;
  } else {
    ds.innerHTML = tin.map((t) => {
      const toi = t.uid === ctx.uid;
      return `<li class="tin${toi ? ' cua-toi' : ''}">` +
        `<div class="tin-dau"><b>${esc(toi ? 'Bạn' : t.ten)}</b><time>${gioVN(t.luc)}</time>` +
        (toi ? '' : `<button class="tin-bao" type="button" data-id="${t.id}" aria-label="Báo cáo tin nhắn của ${esc(t.ten)}" title="Báo cáo"><i class="fas fa-flag" aria-hidden="true"></i></button>`) +
        `</div><p>${esc(locTu(t.noiDung))}</p></li>`;
    }).join('');
  }
  if (sat || tin.at(-1)?.uid === ctx.uid) ds.scrollTop = ds.scrollHeight;
  // Chấm báo tin mới khi đang xem bảng trắng (màn hẹp)
  if (!$('#pn-tin').classList.contains('hien') && tin.length > soTinDaXem) {
    $('#p-moi').hidden = false;
    $('#p-moi').textContent = tin.length - soTinDaXem;
  } else soTinDaXem = tin.length;
}
$('#tin-gui').addEventListener('submit', async (e) => {
  e.preventDefault();
  const o = $('#tin-o');
  const nd = o.value.trim();
  if (!nd) return;
  o.value = '';
  try { await duLieu.guiTin(ma, locTu(nd).slice(0, 300)); }
  catch (err) { o.value = nd; thongBao('Chưa gửi được: ' + esc(err.message), { loai: 'err' }); }
});
$('#tin-ds').addEventListener('click', (e) => {
  const nut = e.target.closest('.tin-bao');
  if (!nut) return;
  const t = phong.tin.find((x) => x.id === nut.dataset.id);
  if (!t) return;
  const cs = moCuaSo(
    `<p>Tin nhắn của <b>${esc(t.ten)}</b> lúc ${gioVN(t.luc)}:</p><blockquote class="bc-tin">${esc(locTu(t.noiDung))}</blockquote>` +
    `<label class="field"><span>Lí do (không bắt buộc)</span><select class="input" id="bc-ly-do">` +
    `<option value="">Chọn lí do…</option><option>Nói tục, xúc phạm</option><option>Bắt nạt, đe doạ</option><option>Làm phiền, spam</option><option>Xin thông tin cá nhân</option><option>Khác</option></select></label>` +
    `<p class="small muted" style="margin-top:8px">Tin nhắn sẽ được lưu lại để thầy cô xem. Bạn ấy không biết ai đã báo cáo.</p>` +
    `<div class="row" style="margin-top:14px"><button class="btn btn-danger" id="bc-gui">Gửi báo cáo</button><button class="btn btn-secondary" id="bc-huy">Huỷ</button></div>`,
    { tieuDe: 'Báo cáo tin nhắn' });
  cs.querySelector('#bc-huy').addEventListener('click', () => cs.close());
  cs.querySelector('#bc-gui').addEventListener('click', async () => {
    try {
      await duLieu.baoCao({ maPhong: ma, tin: { id: t.id, uid: t.uid, ten: t.ten, noiDung: t.noiDung, luc: t.luc }, lyDo: cs.querySelector('#bc-ly-do').value });
      cs.close();
      thongBao('Đã gửi báo cáo. Cảm ơn bạn đã giúp phòng học an toàn hơn.', { loai: 'ok' });
    } catch (err) { thongBao('Chưa gửi được báo cáo: ' + esc(err.message), { loai: 'err' }); }
  });
});

/* ---------- Bảng trắng ---------- */
const cc = { mau: MAU_BUT[0].id, co: CO_BUT[1].id, tay: false };
$('#bt-mau').innerHTML = MAU_BUT.map((m, i) =>
  `<button type="button" class="opt swatch" role="radio" aria-checked="${i === 0}" aria-label="${m.ten}" data-mau="${m.id}" style="background:${m.id}"></button>`).join('');
$('#bt-co').innerHTML = CO_BUT.map((c) =>
  `<button type="button" class="opt" role="radio" aria-checked="${c.id === cc.co}" data-co="${c.id}"><span class="bt-cham" style="--d:${c.id + 2}px" aria-hidden="true"></span>${c.ten}</button>`).join('');
$('#bt-mau').addEventListener('click', (e) => {
  const b = e.target.closest('[data-mau]');
  if (!b) return;
  cc.mau = b.dataset.mau;
  cc.tay = false;
  $('#bt-tay').setAttribute('aria-pressed', 'false');
  $('#bt-mau').querySelectorAll('[data-mau]').forEach((x) => x.setAttribute('aria-checked', String(x === b)));
});
$('#bt-co').addEventListener('click', (e) => {
  const b = e.target.closest('[data-co]');
  if (!b) return;
  cc.co = Number(b.dataset.co);
  $('#bt-co').querySelectorAll('[data-co]').forEach((x) => x.setAttribute('aria-checked', String(x === b)));
});
$('#bt-tay').addEventListener('click', (e) => {
  cc.tay = !cc.tay;
  e.currentTarget.setAttribute('aria-pressed', String(cc.tay));
});
const bang = taoBangTrang($('#bt-canvas'), {
  layCongCu: () => ({ ...cc }),
  khiXong: (net) => duLieu.themNet(ma, net).catch((e) => thongBao('Nét vẽ chưa lưu được: ' + esc(e.message), { loai: 'err' }))
});
$('#bt-hoan').addEventListener('click', () => {
  const cuaToi = Object.values(phong.net || {}).filter((n) => n.uid === ctx.uid).sort((a, b) => b.luc - a.luc);
  if (!cuaToi.length) return thongBao('Bạn chưa vẽ nét nào để hoàn tác.');
  duLieu.xoaNet(ma, cuaToi[0].id);
});
$('#bt-xoa').addEventListener('click', () => {
  const cs = moCuaSo(`<p>Xoá toàn bộ bảng trắng cho cả phòng? Không thể hoàn tác.</p>` +
    `<div class="row" style="margin-top:14px"><button class="btn btn-danger" id="xb-ok">Xoá cả bảng</button><button class="btn btn-secondary" id="xb-huy">Huỷ</button></div>`, { tieuDe: 'Xoá bảng trắng' });
  cs.querySelector('#xb-huy').addEventListener('click', () => cs.close());
  cs.querySelector('#xb-ok').addEventListener('click', () => { duLieu.xoaBang(ma); cs.close(); });
});
let dauVanNet = '';
function veBang() {
  const ds = Object.values(phong.net || {});
  const dau = ds.map((n) => n.id).sort().join(',');
  if (dau === dauVanNet) return;
  dauVanNet = dau;
  bang.ve(ds);
}

/* ---------- Đề bài chung ---------- */
const deBai = ganDeBai({
  ma, ctx, laChu,
  dangXem: () => matchMedia('(min-width: 961px)').matches || $('#pn-de').classList.contains('hien')
});

/* ---------- Thẻ công cụ (màn hẹp) ---------- */
const tabs = [...document.querySelectorAll('.p-tabs [role="tab"]')];
function chonTab(t) {
  tabs.forEach((x) => {
    const chon = x === t;
    x.setAttribute('aria-selected', String(chon));
    x.tabIndex = chon ? 0 : -1;
    document.getElementById(x.getAttribute('aria-controls')).classList.toggle('hien', chon);
  });
  if (t.id === 'tab-tin') { soTinDaXem = (phong.tin || []).length; $('#p-moi').hidden = true; }
  if (t.id === 'tab-de') deBai.khiMoThe();
}
tabs.forEach((t) => {
  t.addEventListener('click', () => chonTab(t));
  t.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    const k = tabs[(tabs.indexOf(t) + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
    chonTab(k);
    k.focus();
  });
});

/* ---------- Thời gian học → điểm chăm chỉ ----------
 * Chỉ tính khi: đang ở trong phòng, đồng hồ phòng đang chạy, tab đang mở (hiển thị).
 * Cộng dồn trong máy, ghi lên tầng dữ liệu mỗi phút và khi rời trang.
 */
let lanDem = Date.now();
let msCho = 0; // đã học nhưng chưa ghi
let dangGhi = false;
function dangTinhGio() {
  return document.visibilityState === 'visible' && phong.thanhVien[ctx.uid] && phong.dongHo.dangChay && conLaiMs() > 0;
}
function demGio() {
  const bay = Date.now();
  const delta = Math.min(bay - lanDem, 30 * 1000); // máy ngủ / tab treo lâu không được tính
  lanDem = bay;
  if (dangTinhGio()) msCho += delta;
  veTienDoHoc();
}
async function ghiGio() {
  if (dangGhi || msCho < 1000) return;
  dangGhi = true;
  const ms = msCho;
  msCho = 0;
  try {
    const { rieng, thuong } = await congThoiGianHoc(ms);
    ctx.rieng = rieng;
    if (thuong) {
      thongBao(`🎉 Chúc mừng! Bạn đã học đủ ${PHUT_MOI_LAN_THUONG} phút và nhận <b>${DIEM_MOI_LAN_THUONG} điểm chăm chỉ</b>. Ghé cửa hàng đổi quà nhé!`, {
        loai: 'ok', nut: [{ chu: 'Mở cửa hàng', kieu: 'btn-secondary', bam: () => window.open('cua-hang.html', '_blank') }, { chu: 'Học tiếp' }]
      });
    }
  } catch (e) {
    msCho += ms; // thử lại lần sau
  } finally {
    dangGhi = false;
    veTienDoHoc();
  }
}
function veTienDoHoc() {
  const phut = Math.floor(((ctx.rieng.msHoc || 0) + msCho) / 60000);
  const el = $('#dh-hoc');
  const chu = `Bạn đã học ${Math.min(phut, PHUT_MOI_LAN_THUONG)}/${PHUT_MOI_LAN_THUONG} phút cho ${DIEM_MOI_LAN_THUONG} ⭐ tiếp theo` +
    (dangTinhGio() ? '' : ' (đang dừng đếm)');
  if (el.textContent !== chu) el.textContent = chu;
  $('#dh-hoc-thanh').style.width = Math.min(100, (phut / PHUT_MOI_LAN_THUONG) * 100) + '%';
}
setInterval(demGio, 5000);
setInterval(ghiGio, 60 * 1000);
document.addEventListener('visibilitychange', () => { demGio(); if (document.visibilityState === 'hidden') ghiGio(); });
addEventListener('pagehide', () => { demGio(); ghiGio(); });
// Chế độ thử: plThuHoc(59) để giả lập đã học thêm 59 phút
if (duLieu.cheDo === 'local') window.plThuHoc = (phut) => { msCho += phut * 60000; ghiGio(); };

/* ---------- Theo dõi phòng ---------- */
function veTatCa() {
  veCho();
  veDongHo();
  veTin();
  veBang();
  veTienDoHoc();
  deBai.capNhatChu();
  const toi = phong.thanhVien[ctx.uid];
  const r = document.querySelector(`#p-tt input[value="${toi?.trangThai || 'vui-ve'}"]`);
  if (r && !r.checked) r.checked = true;
}
veTatCa();
let dangVaoLai = false;
let daRoi = false;
$('#p-roi').addEventListener('click', () => { daRoi = true; }, { capture: true });
duLieu.theoDoiPhong(ma, async (p) => {
  if (!p) return baoLoi(`<b>Phòng ${ma} đã đóng.</b>Không còn ai trong phòng. Bạn có thể tạo phòng mới ở trang chủ.`);
  if (!p.thanhVien[ctx.uid]) {
    if (daRoi) return;
    // Mất kết nối một lúc rồi có lại: thử tự vào lại chỗ cũ
    if (dangVaoLai) return;
    dangVaoLai = true;
    try {
      p = await duLieu.vaoPhong(ma, { ten: ctx.congKhai.ten, nhanVat: ctx.congKhai.nhanVat, ban: ctx.congKhai.ban || 'go-soi', monManh: ctx.congKhai.manh?.[0] || '' });
    } catch (e) {
      return baoLoi(`<b>Bạn đã ra khỏi phòng ${ma}.</b>${esc(e.message)}`);
    } finally {
      dangVaoLai = false;
    }
    if (!p?.thanhVien?.[ctx.uid]) return;
  }
  phong = p;
  veTatCa();
});
