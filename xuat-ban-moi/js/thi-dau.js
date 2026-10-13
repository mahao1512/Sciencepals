/*
 * thi-dau.js — Trang Thi Đấu: lịch thi, đội của tôi (lập / vào / chọn môn / mời bạn), vào phòng thi,
 * bảng vàng và luật chơi. Phòng thi của đội ở tran-dau.html.
 */
import { duLieu } from './data/index.js';
import { esc, thongBao, moCuaSo, chuanId } from './tienich.js';
import { khoiTaoTrang, anhDau } from './khung.js';
import { taiNganHang } from './ngan-hang.js';
import { kyDangMo, kyTiepTheo, kyTheoId, hienNgay, top3TheoKy } from './lich-thi.js';
import {
  dieuKienDoi, duocVaoKy, taoTranMoi, layHoSo, layUyTinCache, layBangVang, htmlBangVang, nhanGiaiConLai
} from './thi-dau-chung.js';
import { mucUyTin, UY_TIN_THI_DAU } from './uy-tin.js';
import { DOI_MIN, DOI_MAX, GIAI_THUONG, THI_SO_CAU_MOI_MON, THI_GIAY_MOI_CAU, GIO_HOI_UY_TIN } from './config.js';

const $ = (s) => document.querySelector(s);
const ctx = await khoiTaoTrang();
let nh;
try { nh = await taiNganHang(); } catch (e) {
  $('#dang-tai').textContent = 'Không tải được ngân hàng câu hỏi. Kiểm tra lại file data/ngan-hang-cau-hoi-thpt.json rồi tải lại trang.';
  throw e;
}
const tenMon = (id) => nh.tenMon(id);
const maVao = chuanId(new URLSearchParams(location.search).get('doi') || '').slice(0, 6);
$('#dang-tai').hidden = true;
['#td-lich', '#td-doi', '#td-bang-vang', '#td-luat'].forEach((s) => { $(s).hidden = false; });

// Nhận giải của các kì vừa kết thúc (nếu đội mình lọt top 3)
nhanGiaiConLai(ctx);

/* ---------- Lịch thi ---------- */
function veLich() {
  const bay = duLieu.gioMayChu();
  const mo = kyDangMo(bay);
  const tiep = kyTiepTheo(bay);
  const ut = ctx.uyTin?.diem ?? 100;
  $('#td-lich').innerHTML =
    `<h2 id="td-lich-td">Lịch thi</h2>` +
    (mo.length
      ? `<p class="td-trang-thai mo">🟢 Đang mở: <b>${mo.map((k) => esc(k.ten)).join(' · ')}</b> — tới hết 23:59 Chủ nhật.</p>`
      : `<p class="td-trang-thai dong">🔒 Thi Đấu đang đóng. Mở lại lúc 0:00 <b>${hienNgay(tiep.tuan.thuBay)}</b>. Lập đội và chọn môn trước nhé!</p>`) +
    `<ul class="td-lich-ds">` +
    `<li><b>Thi tuần</b> · mỗi Thứ 7 – Chủ nhật · đội nào đủ điều kiện cũng thi được</li>` +
    (tiep.thang ? `<li><b>${esc(tiep.thang.ten)}</b> · ${hienNgay(tiep.thang.thuBay)} – Chủ nhật · dành cho đội lọt top 3 một kì thi tuần trong tháng</li>` : '') +
    (tiep.quy ? `<li><b>${esc(tiep.quy.ten)}</b> · ${hienNgay(tiep.quy.thuBay)} – Chủ nhật · dành cho đội lọt top 3 một kì thi tháng trong quý</li>` : '') +
    `</ul>` +
    `<p class="td-uy-tin ${mucUyTin(ut).lop}">🛡️ Uy tín của bạn: <b>${ut}/100</b>` +
    (ut < UY_TIN_THI_DAU ? ` — cần từ ${UY_TIN_THI_DAU} mới vào thi được. Học ${GIO_HOI_UY_TIN} giờ liên tiếp không bị trừ uy tín để hồi 1 điểm.` : '') + `</p>`;
}
veLich();
document.addEventListener('pl:uytin', () => { veLich(); veDoi(); });

/* ---------- Đội của tôi ---------- */
let dsDoi = [];
let top3 = {};
let ketQuaMo = [];
let lanVe = 0;

async function taiKetQua() {
  const mo = kyDangMo(duLieu.gioMayChu());
  const ids = [...new Set(mo.flatMap((k) => [k.id, ...(k.vongTruoc || [])]))];
  ketQuaMo = ids.length ? await duLieu.dsKetQua(ids).catch(() => []) : [];
  top3 = top3TheoKy(ketQuaMo);
}

function htmlLapDoi() {
  return `<div class="card td-lap">` +
    `<h2 id="td-doi-td">${dsDoi.length ? 'Lập thêm đội / vào đội khác' : 'Lập đội hoặc vào đội'}</h2>` +
    `<p class="small muted">Đội cần ${DOI_MIN}–${DOI_MAX} bạn, <b>mỗi bạn thi một môn khác nhau</b> (số người = số môn thi). Đội trưởng gửi mã đội cho bạn bè để vào đội.</p>` +
    `<div class="td-lap-luoi">` +
    `<form id="td-tao" class="td-form" novalidate><label class="field"><span>Tên đội mới</span><input class="input" name="ten" maxlength="30" placeholder="Ví dụ: Biệt đội Khoa học" required></label>` +
    `<button class="btn btn-primary" type="submit"><i class="fas fa-flag" aria-hidden="true"></i> Lập đội</button></form>` +
    `<form id="td-vao" class="td-form" novalidate><label class="field"><span>Mã đội (6 kí tự)</span><input class="input ma-input" name="ma" maxlength="7" autocomplete="off" value="${esc(maVao)}" placeholder="ABC123" required></label>` +
    `<button class="btn btn-secondary" type="submit"><i class="fas fa-right-to-bracket" aria-hidden="true"></i> Vào đội</button></form>` +
    `</div></div>`;
}

async function htmlDoi(d, mo) {
  const laTruong = d.truong === ctx.uid;
  const tv = await Promise.all(d.thanhVien.map(async (u) => ({ uid: u, hs: await layHoSo(u), ut: await layUyTinCache(u) })));
  const dk = await dieuKienDoi(d);
  const duDieuKien = dk.every((x) => x.ok);
  const monKhac = Object.fromEntries(Object.entries(d.mon).filter(([u]) => u !== ctx.uid).map(([u, m]) => [m, u]));
  const tenCua = (u) => tv.find((x) => x.uid === u)?.hs?.ten || 'bạn khác';
  // Từng kì đang mở
  const hangKy = await Promise.all(mo.map(async (k) => {
    const kq = ketQuaMo.find((x) => x.ky === k.id && x.maDoi === d.ma);
    if (kq) return `<li class="td-ky-o xong">✅ <b>${esc(k.ten)}</b>: đội đã thi — <b>${kq.diem}</b> điểm (${kq.dung}/${kq.soCau} câu đúng). Kết quả và giải thưởng có sau 23:59 Chủ nhật.</li>`;
    const vao = duocVaoKy(k, d, top3);
    if (!vao.ok) return `<li class="td-ky-o khoa">🔒 <b>${esc(k.ten)}</b>: chỉ dành cho đội lọt top 3 ${k.loai === 'thang' ? 'một kì thi tuần trong tháng' : 'một kì thi tháng trong quý'} (đúng các thành viên đó).</li>`;
    const tran = await duLieu.layTran(k.id, d.ma).catch(() => null);
    const chu = tran?.batDauLuc ? 'Đang thi — vào phòng thi' : tran ? 'Phòng thi đã mở — vào ngay' : laTruong ? 'Mở phòng thi' : 'Vào phòng thi';
    return `<li class="td-ky-o"><span><b>${esc(k.ten)}</b>${vao.dat ? ` <small class="muted">(đội đạt hạng ${vao.dat.hang + 1} vòng trước)</small>` : ''}</span>` +
      `<button type="button" class="btn btn-primary btn-nho" data-vao-thi="${k.id}"${duDieuKien || tran?.batDauLuc ? '' : ' disabled'}>` +
      `<i class="fas fa-door-open" aria-hidden="true"></i> ${chu}</button></li>`;
  }));
  return `<article class="card td-the" data-ma="${d.ma}" aria-labelledby="td-ten-${d.ma}">` +
    `<div class="td-the-dau"><h3 id="td-ten-${d.ma}">${esc(d.ten)}</h3>` +
    `<span class="td-ma">Mã đội <b class="ma-id">${d.ma}</b></span>` +
    `<button type="button" class="btn btn-secondary btn-nho" data-chep="${d.ma}"><i class="fas fa-copy" aria-hidden="true"></i> Sao chép</button>` +
    (laTruong ? `<button type="button" class="btn btn-ghost btn-nho" data-doi-ten><i class="fas fa-pen" aria-hidden="true"></i> Đổi tên</button>` : '') + `</div>` +
    `<ul class="td-tv">` + tv.map(({ uid, hs, ut }) =>
      `<li><span class="tid-hinh" aria-hidden="true">${hs?.nhanVat ? anhDau(hs.nhanVat) : ''}</span>` +
      `<span class="td-tv-chu"><b>${esc(hs?.ten || 'Bạn')}${uid === d.truong ? ' <span title="Đội trưởng">👑</span>' : ''}${uid === ctx.uid ? ' (bạn)' : ''}</b>` +
      `<small>${d.mon[uid] ? 'Thi ' + esc(tenMon(d.mon[uid])) : 'Chưa chọn môn'} · <span class="${mucUyTin(ut).lop}">uy tín ${ut}</span></small></span>` +
      (laTruong && uid !== ctx.uid ? `<button type="button" class="btn btn-ghost btn-nho" data-bo="${esc(uid)}" aria-label="Mời ${esc(hs?.ten || 'bạn này')} ra khỏi đội">Mời ra</button>` : '') +
      `</li>`).join('') + `</ul>` +
    `<label class="field td-chon-mon"><span>Môn bạn sẽ thi</span><select class="input" data-chon-mon>` +
    `<option value="">— Chọn môn —</option>` +
    nh.de.subjects.map((m) => `<option value="${m.id}"${d.mon[ctx.uid] === m.id ? ' selected' : ''}${monKhac[m.id] ? ' disabled' : ''}>${esc(m.name)}${monKhac[m.id] ? ` (${esc(tenCua(monKhac[m.id]))} đã chọn)` : ''}</option>`).join('') +
    `</select></label>` +
    `<ul class="td-dk" aria-label="Điều kiện để thi">${dk.map((x) => `<li class="${x.ok ? 'ok' : 'chua'}"><span aria-hidden="true">${x.ok ? '✓' : '✗'}</span> ${x.chu}</li>`).join('')}</ul>` +
    (mo.length
      ? `<ul class="td-ky">${hangKy.join('')}</ul>`
      : `<p class="small muted td-ky-dong">Phòng thi chỉ mở vào cuối tuần. Chuẩn bị đội trước nhé!</p>`) +
    `<div class="row td-the-nut">` +
    `<button type="button" class="btn btn-secondary btn-nho" data-moi-ban><i class="fas fa-paper-plane" aria-hidden="true"></i> Mời bạn bè vào đội</button>` +
    (laTruong
      ? `<button type="button" class="btn btn-ghost btn-nho" data-giai-tan><i class="fas fa-trash-can" aria-hidden="true"></i> Giải tán đội</button>`
      : `<button type="button" class="btn btn-ghost btn-nho" data-roi><i class="fas fa-right-from-bracket" aria-hidden="true"></i> Rời đội</button>`) +
    `</div></article>`;
}

async function veDoi() {
  const lan = ++lanVe;
  const mo = kyDangMo(duLieu.gioMayChu());
  const the = await Promise.all(dsDoi.map((d) => htmlDoi(d, mo)));
  if (lan !== lanVe) return; // đã có lần vẽ mới hơn
  const dangGo = document.activeElement?.closest?.('#td-doi form');
  if (dangGo && dangGo.querySelector('input')?.value) return; // đang gõ tên / mã: không vẽ đè
  $('#td-doi').innerHTML =
    (dsDoi.length ? `<h2 class="td-nhom">Đội của tôi</h2>${the.join('')}` : '') + htmlLapDoi();
}

/* ---------- Thao tác trên đội ---------- */
$('#td-doi').addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = e.target;
  const nut = f.querySelector('button');
  nut.disabled = true;
  try {
    if (f.id === 'td-tao') {
      const ten = f.ten.value.trim().replace(/\s+/g, ' ');
      if (ten.length < 2) throw new Error('Tên đội cần ít nhất 2 kí tự.');
      const ma = await duLieu.taoDoi(ten);
      thongBao(`Đã lập đội <b>${esc(ten)}</b>. Mã đội: <b>${ma}</b> — gửi cho bạn bè để vào đội nhé!`, { loai: 'ok' });
    } else if (f.id === 'td-vao') {
      const ma = chuanId(f.ma.value).slice(0, 6);
      if (ma.length !== 6) throw new Error('Mã đội gồm 6 chữ cái hoặc chữ số.');
      await duLieu.vaoDoi(ma, DOI_MAX);
      thongBao('Đã vào đội! Chọn môn bạn sẽ thi nhé.', { loai: 'ok' });
    }
    f.reset();
  } catch (err) {
    thongBao(esc(err.message), { loai: 'err' });
  } finally {
    nut.disabled = false;
    veDoi();
  }
});

$('#td-doi').addEventListener('change', async (e) => {
  const s = e.target.closest('[data-chon-mon]');
  if (!s) return;
  const ma = s.closest('[data-ma]').dataset.ma;
  try { await duLieu.chonMonDoi(ma, s.value); }
  catch (err) { thongBao(esc(err.message), { loai: 'err' }); veDoi(); }
});

$('#td-doi').addEventListener('click', async (e) => {
  const b = e.target.closest('button');
  const the = b?.closest('[data-ma]');
  if (!b || !the) return;
  const d = dsDoi.find((x) => x.ma === the.dataset.ma);
  if (!d) return;
  const xacNhan = (html, chu, lam) => {
    const cs = moCuaSo(`<p>${html}</p><div class="row" style="margin-top:14px"><button class="btn btn-danger" id="xn-ok">${chu}</button><button class="btn btn-secondary" id="xn-huy">Huỷ</button></div>`, { tieuDe: chu });
    cs.querySelector('#xn-huy').addEventListener('click', () => cs.close());
    cs.querySelector('#xn-ok').addEventListener('click', async () => {
      try { await lam(); cs.close(); } catch (err) { thongBao(esc(err.message), { loai: 'err' }); }
    });
  };
  if (b.dataset.chep) {
    try { await navigator.clipboard.writeText(d.ma); thongBao(`Đã chép mã đội ${d.ma}.`, { loai: 'ok' }); }
    catch (err) { thongBao(`Mã đội là <b>${d.ma}</b>. Bạn chép tay giúp mình nhé.`); }
  } else if (b.hasAttribute('data-doi-ten')) {
    const cs = moCuaSo(`<form id="dt-form" novalidate><label class="field"><span>Tên đội</span><input class="input" name="ten" maxlength="30" value="${esc(d.ten)}"></label>` +
      `<div class="row" style="margin-top:12px"><button class="btn btn-primary" type="submit">Lưu</button></div></form>`, { tieuDe: 'Đổi tên đội' });
    cs.querySelector('form').addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const ten = ev.target.ten.value.trim().replace(/\s+/g, ' ');
      if (ten.length < 2) return thongBao('Tên đội cần ít nhất 2 kí tự.', { loai: 'err' });
      try { await duLieu.doiTenDoi(d.ma, ten); cs.close(); } catch (err) { thongBao(esc(err.message), { loai: 'err' }); }
    });
  } else if (b.dataset.bo) {
    const hs = await layHoSo(b.dataset.bo);
    xacNhan(`Mời <b>${esc(hs?.ten || 'bạn này')}</b> ra khỏi đội <b>${esc(d.ten)}</b>?`, 'Mời ra khỏi đội', () => duLieu.boKhoiDoi(d.ma, b.dataset.bo));
  } else if (b.hasAttribute('data-roi')) {
    xacNhan(`Rời đội <b>${esc(d.ten)}</b>? Muốn quay lại thì nhập lại mã đội.`, 'Rời đội', () => duLieu.roiDoi(d.ma));
  } else if (b.hasAttribute('data-giai-tan')) {
    xacNhan(`Giải tán đội <b>${esc(d.ten)}</b>? Các thành viên sẽ không còn ở trong đội. Kết quả thi đã có vẫn giữ trên bảng vàng.`, 'Giải tán đội', () => duLieu.giaiTanDoi(d.ma));
  } else if (b.hasAttribute('data-moi-ban')) {
    moiBanBe(d);
  } else if (b.dataset.vaoThi) {
    vaoThi(d, b.dataset.vaoThi, b);
  }
});

/** Gửi mã đội cho bạn bè qua tin nhắn riêng. */
async function moiBanBe(d) {
  const ban = [...(ctx.banBe?.quanHe || new Map()).entries()].filter(([u, q]) => q.trangThai === 'ban' && !d.thanhVien.includes(u));
  if (!ban.length) {
    return thongBao(`Bạn chưa có bạn bè nào khác để mời. Gửi mã đội <b>${d.ma}</b> cho bạn ấy, hoặc kết bạn ở trang Tìm bạn học.`);
  }
  const hs = await Promise.all(ban.map(([u]) => ctx.banBe.layHoSo(u)));
  const cs = moCuaSo(
    `<p class="small muted">Gửi tin nhắn riêng kèm mã đội <b>${d.ma}</b> cho những bạn được chọn.</p>` +
    `<div class="td-moi-ds">` + ban.map(([u], i) =>
      `<label class="kt-mon-o"><input type="checkbox" value="${esc(u)}"><span><b>${esc(hs[i]?.ten || 'Bạn')}</b></span></label>`).join('') + `</div>` +
    `<div class="row" style="margin-top:14px"><button class="btn btn-primary" id="mb-gui">Gửi lời mời</button><button class="btn btn-secondary" id="mb-huy">Huỷ</button></div>`,
    { tieuDe: 'Mời bạn bè vào đội' });
  cs.querySelector('#mb-huy').addEventListener('click', () => cs.close());
  cs.querySelector('#mb-gui').addEventListener('click', async () => {
    const chon = [...cs.querySelectorAll('input:checked')].map((x) => x.value);
    if (!chon.length) return thongBao('Hãy chọn ít nhất một bạn.', { loai: 'err' });
    let ok = 0;
    for (const u of chon) {
      try {
        await duLieu.guiTinRieng(u, `🏆 Mời bạn vào đội "${d.ten}" để Thi Đấu cuối tuần! Mã đội: ${d.ma}. Mở trang Thi Đấu → "Vào đội" rồi nhập mã.`);
        ok++;
      } catch (err) { /* bỏ qua bạn không gửi được */ }
    }
    cs.close();
    thongBao(`Đã gửi lời mời cho ${ok} bạn.`, { loai: ok ? 'ok' : 'err' });
  });
}

/** Vào phòng thi: đội trưởng mở phòng (bốc câu hỏi) nếu chưa có; mọi người chuyển sang trang phòng thi. */
async function vaoThi(d, kyId, nut) {
  const ky = kyTheoId(kyId);
  const di = () => { location.href = `tran-dau.html?ky=${encodeURIComponent(kyId)}&doi=${d.ma}`; };
  nut.disabled = true;
  try {
    const tran = await duLieu.layTran(kyId, d.ma).catch(() => null);
    if (tran || d.truong !== ctx.uid) return di();
    if (!kyDangMo(duLieu.gioMayChu()).some((k) => k.id === kyId)) throw new Error('Kì thi này đã đóng.');
    // Xem lại uy tín mới nhất của cả đội trước khi mở phòng
    await Promise.all(d.thanhVien.map((u) => layUyTinCache(u, true)));
    const dk = await dieuKienDoi(d);
    const chua = dk.find((x) => !x.ok);
    if (chua) throw new Error(chua.chu);
    if (!duocVaoKy(ky, d, top3).ok) throw new Error('Đội chưa đủ điều kiện vào kì thi này.');
    await duLieu.moTran(kyId, d.ma, await taoTranMoi(d, nh));
    di();
  } catch (err) {
    nut.disabled = false;
    thongBao(esc(err.message), { loai: 'err' });
  }
}

/* ---------- Bảng vàng & luật ---------- */
async function veBangVang() {
  const bv = await layBangVang();
  $('#td-bang-vang').innerHTML = `<h2 id="td-bv-td">🏅 Bảng vàng</h2>` +
    `<p class="small muted">Ba đội điểm cao nhất của kì thi tuần, tháng, quý gần nhất. Bảng cập nhật sau 23:59 Chủ nhật.</p>` +
    htmlBangVang(bv, tenMon);
}
const sao = (l) => GIAI_THUONG[l].map((s, i) => `${['Nhất', 'Nhì', 'Ba'][i]} ${s} ⭐`).join(' · ');
$('#td-luat').innerHTML =
  `<h2 id="td-luat-td">Luật chơi & giải thưởng</h2>` +
  `<ol class="td-luat-ds">` +
  `<li>Lập đội ${DOI_MIN}–${DOI_MAX} bạn. Mỗi bạn chọn <b>một môn khác nhau</b>: đội có bao nhiêu người thì thi bấy nhiêu môn.</li>` +
  `<li>Mọi thành viên cần uy tín từ <b>${UY_TIN_THI_DAU}</b> trở lên.</li>` +
  `<li>Đội trưởng mở phòng thi riêng của đội; khi đủ mặt cả đội thì bấm <b>Bắt đầu</b>. Mỗi đội thi <b>một lần</b> mỗi kì.</li>` +
  `<li>Mỗi môn ${THI_SO_CAU_MOI_MON} câu, lần lượt từng môn. <b>Tới môn của ai thì chỉ người đó được trả lời</b>, cả đội cùng xem. Mỗi câu ${THI_GIAY_MOI_CAU} giây.</li>` +
  `<li>Đúng được 10 điểm, trả lời càng nhanh càng được thêm (tối đa 5). Điểm đội quy về thang 1000 để đội ít người và đội đông người so được với nhau; bằng điểm thì đội làm nhanh hơn xếp trên.</li>` +
  `<li><b>Thi tuần</b> → top 3 được vào <b>thi tháng</b> → top 3 thi tháng được vào <b>thi quý</b>, như Olympia. Ba đội cao nhất mỗi kì lên <b>Bảng vàng</b>.</li>` +
  `</ol>` +
  `<p><b>Ngôi sao cho mỗi thành viên:</b></p><ul class="td-luat-ds">` +
  `<li>Thi tuần: ${sao('tuan')}</li><li>Thi tháng: ${sao('thang')}</li><li>Thi quý: ${sao('quy')}</li></ul>` +
  `<p class="small muted">Ngôi sao tự cộng vào tài khoản khi bạn mở trang chủ hoặc trang Thi Đấu sau khi kì thi kết thúc.</p>`;

/* ---------- Khởi động ---------- */
await taiKetQua();
duLieu.theoDoiDoiCuaToi((ds) => { dsDoi = ds.sort((a, b) => (a.ten > b.ten ? 1 : -1)); veDoi(); });
veBangVang();
// Kì thi mở / đóng theo giờ: xem lại mỗi phút
let moCu = kyDangMo(duLieu.gioMayChu()).map((k) => k.id).join();
setInterval(async () => {
  const moi = kyDangMo(duLieu.gioMayChu()).map((k) => k.id).join();
  if (moi !== moCu) { moCu = moi; veLich(); await taiKetQua(); veDoi(); }
}, 60 * 1000);
