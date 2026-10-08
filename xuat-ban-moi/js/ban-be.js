/*
 * ban-be.js — Trang Bạn bè: lời mời kết bạn, danh sách bạn bè và nhắn tin riêng.
 * Chỉ bạn bè (đã chấp nhận) mới nhắn tin cho nhau được. Có lọc từ thô tục và nút Báo cáo.
 */
import { duLieu } from './data/index.js';
import { esc, gioVN, thongBao, moCuaSo } from './tienich.js';
import { khoiTaoTrang, anhDau } from './khung.js';
import { locTu } from './loc-tu.js';
import { ganTimTheoId } from './ui/tim-id.js';

const $ = (s) => document.querySelector(s);
const ctx = await khoiTaoTrang();
const kho = ctx.banBe;
let dangMo = null;   // uid bạn đang trò chuyện
let huyTin = null;   // huỷ theo dõi tin nhắn
let dsTin = [];

const ngayGio = (ms) => {
  const d = new Date(ms);
  const homNay = new Date().toDateString() === d.toDateString();
  return homNay ? gioVN(ms) : d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }) + ' ' + gioVN(ms);
};

/* ---------- Danh sách ---------- */
async function veDanhSach() {
  const theo = { nhan: [], gui: [], ban: [] };
  kho.quanHe.forEach((q, uid) => theo[q.trangThai]?.push(uid));
  // Bạn có tin mới nhất lên đầu
  theo.ban.sort((a, b) => (kho.tinCuoi.get(b)?.luc || 0) - (kho.tinCuoi.get(a)?.luc || 0));
  const hs = Object.fromEntries(await Promise.all([...kho.quanHe.keys()].map(async (u) => [u, await kho.layHoSo(u)])));
  const ten = (u) => esc(hs[u]?.ten || 'Bạn học');
  const hinh = (u) => (hs[u]?.nhanVat ? anhDau(hs[u].nhanVat) : '');
  let h = '';
  if (theo.nhan.length) {
    h += `<h2 class="bb-nhom">Lời mời kết bạn <span class="bb-so">${theo.nhan.length}</span></h2><ul class="bb-ds-ul">` +
      theo.nhan.map((u) => `<li class="bb-muc"><span class="bb-hinh" aria-hidden="true">${hinh(u)}</span><span class="bb-chu"><b>${ten(u)}</b><small>muốn kết bạn với bạn</small></span>` +
        `<span class="bb-nut"><button type="button" class="btn btn-primary btn-nho" data-dong-y="${esc(u)}">Chấp nhận</button>` +
        `<button type="button" class="btn btn-ghost btn-nho" data-tu-choi="${esc(u)}" aria-label="Từ chối lời mời của ${ten(u)}">Từ chối</button></span></li>`).join('') + `</ul>`;
  }
  h += `<h2 class="bb-nhom">Danh sách bạn bè <span class="bb-so">${theo.ban.length}</span></h2>`;
  if (theo.ban.length) {
    h += `<ul class="bb-ds-ul">` + theo.ban.map((u) => {
      const t = kho.tinCuoi.get(u);
      const moi = kho.chuaDoc(u);
      return `<li><button type="button" class="bb-muc bb-ban${u === dangMo ? ' dang-mo' : ''}${moi ? ' moi' : ''}" data-mo="${esc(u)}" aria-current="${u === dangMo}">` +
        `<span class="bb-hinh" aria-hidden="true">${hinh(u)}</span><span class="bb-chu"><b>${ten(u)}</b>` +
        `<small>${t ? (t.tu === ctx.uid ? 'Bạn: ' : '') + esc(locTu(t.noiDung).slice(0, 40)) : 'Chưa có tin nhắn — gửi lời chào nhé!'}</small></span>` +
        (moi ? `<span class="bb-cham" aria-label="Có tin mới"></span>` : '') + `</button></li>`;
    }).join('') + `</ul>`;
  } else {
    h += `<div class="empty"><b>Chưa có bạn bè nào.</b>Vào <a href="tim-ban.html">Tìm bạn học</a> hoặc vào phòng học, bấm “Kết bạn” trên thẻ của bạn ấy.</div>`;
  }
  if (theo.gui.length) {
    h += `<h2 class="bb-nhom">Đã gửi lời mời</h2><ul class="bb-ds-ul">` +
      theo.gui.map((u) => `<li class="bb-muc"><span class="bb-hinh" aria-hidden="true">${hinh(u)}</span><span class="bb-chu"><b>${ten(u)}</b><small>đang chờ bạn ấy đồng ý</small></span>` +
        `<span class="bb-nut"><button type="button" class="btn btn-ghost btn-nho" data-huy="${esc(u)}" aria-label="Huỷ lời mời gửi ${ten(u)}">Huỷ</button></span></li>`).join('') + `</ul>`;
  }
  $('#bb-danh-sach').innerHTML = h;
  // Bạn đang mở không còn là bạn bè (bị huỷ kết bạn)
  if (dangMo && kho.trangThai(dangMo) !== 'ban') dongCuoc();
}

$('#bb-danh-sach').addEventListener('click', async (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  try {
    if (b.dataset.mo) moCuoc(b.dataset.mo);
    else if (b.dataset.dongY) await duLieu.traLoiKetBan(kho.quanHe.get(b.dataset.dongY).id, true);
    else if (b.dataset.tuChoi) await duLieu.traLoiKetBan(kho.quanHe.get(b.dataset.tuChoi).id, false);
    else if (b.dataset.huy) await duLieu.huyKetBan(kho.quanHe.get(b.dataset.huy).id);
  } catch (err) { thongBao(esc(err.message), { loai: 'err' }); }
});

/* ---------- Trò chuyện ---------- */
async function moCuoc(uid) {
  if (kho.trangThai(uid) !== 'ban') return thongBao('Hai bạn cần kết bạn trước khi nhắn tin.');
  dangMo = uid;
  kho.datDangMo(uid);
  history.replaceState(null, '', '?ban=' + encodeURIComponent(uid));
  const hs = await kho.layHoSo(uid);
  $('#bb-ten').textContent = hs?.ten || 'Bạn học';
  $('#bb-dau-hinh').innerHTML = hs?.nhanVat ? anhDau(hs.nhanVat) : '';
  $('#bb-chua-chon').hidden = true;
  $('#bb-cuoc').hidden = false;
  $('#bb').classList.add('dang-chat');
  huyTin && huyTin();
  dsTin = [];
  $('#bb-tin').innerHTML = '';
  huyTin = duLieu.theoDoiTinRieng(uid, (ds) => { dsTin = ds; veTin(); kho.danhDauDaDoc(uid); });
  veDanhSach();
  $('#bb-o').focus();
}
function dongCuoc() {
  huyTin && huyTin();
  huyTin = null;
  dangMo = null;
  kho.datDangMo(null);
  history.replaceState(null, '', location.pathname);
  $('#bb-cuoc').hidden = true;
  $('#bb-chua-chon').hidden = false;
  $('#bb').classList.remove('dang-chat');
}
function veTin() {
  const el = $('#bb-tin');
  const sat = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
  el.innerHTML = dsTin.length
    ? dsTin.map((t) => {
      const toi = t.tu === ctx.uid;
      return `<li class="tin${toi ? ' cua-toi' : ''}"><div class="tin-dau"><time>${ngayGio(t.luc)}</time>` +
        (toi ? '' : `<button class="tin-bao" type="button" data-bao="${esc(t.id)}" aria-label="Báo cáo tin nhắn này" title="Báo cáo"><i class="fas fa-flag" aria-hidden="true"></i></button>`) +
        `</div><p>${esc(locTu(t.noiDung))}</p></li>`;
    }).join('')
    : `<li class="tin-trong">Chưa có tin nhắn. Gửi lời chào đầu tiên nhé! 👋</li>`;
  if (sat || dsTin.at(-1)?.tu === ctx.uid) el.scrollTop = el.scrollHeight;
}
$('#bb-gui').addEventListener('submit', async (e) => {
  e.preventDefault();
  const o = $('#bb-o');
  const nd = o.value.trim();
  if (!nd || !dangMo) return;
  o.value = '';
  try { await duLieu.guiTinRieng(dangMo, locTu(nd).slice(0, 500)); }
  catch (err) { o.value = nd; thongBao(esc(err.message), { loai: 'err' }); }
});
$('#bb-ve').addEventListener('click', dongCuoc);
$('#bb-huy-ban').addEventListener('click', () => {
  const uid = dangMo;
  const cs = moCuaSo(`<p>Huỷ kết bạn với <b>${esc($('#bb-ten').textContent)}</b>? Hai bạn sẽ không nhắn tin riêng được nữa (có thể kết bạn lại sau).</p>` +
    `<div class="row" style="margin-top:14px"><button class="btn btn-danger" id="hb-ok">Huỷ kết bạn</button><button class="btn btn-secondary" id="hb-khong">Giữ lại</button></div>`, { tieuDe: 'Huỷ kết bạn' });
  cs.querySelector('#hb-khong').addEventListener('click', () => cs.close());
  cs.querySelector('#hb-ok').addEventListener('click', async () => {
    try { await duLieu.huyKetBan(kho.quanHe.get(uid).id); cs.close(); dongCuoc(); }
    catch (err) { thongBao(esc(err.message), { loai: 'err' }); }
  });
});
$('#bb-tin').addEventListener('click', (e) => {
  const b = e.target.closest('[data-bao]');
  if (!b) return;
  const t = dsTin.find((x) => x.id === b.dataset.bao);
  if (!t) return;
  const ten = $('#bb-ten').textContent;
  const cs = moCuaSo(
    `<p>Tin nhắn của <b>${esc(ten)}</b>:</p><blockquote class="bb-trich">${esc(locTu(t.noiDung))}</blockquote>` +
    `<label class="field"><span>Lí do (không bắt buộc)</span><select class="input" id="bc-ly-do"><option value="">Chọn lí do…</option>` +
    `<option>Nói tục, xúc phạm</option><option>Bắt nạt, đe doạ</option><option>Làm phiền, spam</option><option>Xin thông tin cá nhân</option><option>Khác</option></select></label>` +
    `<p class="small muted" style="margin-top:8px">Tin nhắn được lưu lại để thầy cô xem. Bạn cũng có thể huỷ kết bạn để không nhận tin nữa.</p>` +
    `<div class="row" style="margin-top:14px"><button class="btn btn-danger" id="bc-gui">Gửi báo cáo</button><button class="btn btn-secondary" id="bc-huy">Huỷ</button></div>`,
    { tieuDe: 'Báo cáo tin nhắn' });
  cs.querySelector('#bc-huy').addEventListener('click', () => cs.close());
  cs.querySelector('#bc-gui').addEventListener('click', async () => {
    try {
      await duLieu.baoCao({ maPhong: 'tin-rieng', tin: { id: t.id, uid: t.tu, ten, noiDung: t.noiDung, luc: t.luc }, lyDo: cs.querySelector('#bc-ly-do').value });
      cs.close();
      thongBao('Đã gửi báo cáo. Cảm ơn bạn.', { loai: 'ok' });
    } catch (err) { thongBao('Chưa gửi được báo cáo: ' + esc(err.message), { loai: 'err' }); }
  });
});

kho.nghe(() => veDanhSach());
// ID của mình + tìm bạn bằng ID
ganTimTheoId($('#bb-tim-id'), ctx);
// Mở sẵn cuộc trò chuyện từ đường link ?ban=...
const banTuLink = new URLSearchParams(location.search).get('ban');
if (banTuLink) {
  const cho = setInterval(() => {
    if (kho.trangThai(banTuLink) === 'ban') { clearInterval(cho); moCuoc(banTuLink); }
  }, 200);
  setTimeout(() => clearInterval(cho), 5000);
}
