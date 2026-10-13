/*
 * tran-dau.js — Phòng thi riêng của một đội trong một kì Thi Đấu (tran-dau.html?ky=…&doi=…).
 *   Phòng chờ: thấy ai đã vào; đủ mặt cả đội thì đội trưởng bấm Bắt đầu.
 *   Đang thi: lần lượt từng môn; tới môn của ai thì chỉ người đó bấm được đáp án, cả đội cùng xem.
 *   Mọi máy tính cùng một trạng thái từ giờ máy chủ (xem tinhTran trong thi-dau-chung.js).
 *   Hết bài: ghi kết quả (mỗi đội mỗi kì một lần) để xếp hạng lên bảng vàng.
 */
import { duLieu } from './data/index.js';
import { esc, thongBao, chuanId } from './tienich.js';
import { khoiTaoTrang, anhDau } from './khung.js';
import { taiNganHang } from './ngan-hang.js';
import { kyTheoId, kyDangMo } from './lich-thi.js';
import { tinhTran, ketQuaTran, layHoSo, layUyTinCache } from './thi-dau-chung.js';
import { UY_TIN_THI_DAU } from './uy-tin.js';

const $ = (s) => document.querySelector(s);
const CHU = ['A', 'B', 'C', 'D', 'E', 'F'];
const ctx = await khoiTaoTrang();
const nh = await taiNganHang();
const ts = new URLSearchParams(location.search);
const kyId = ts.get('ky') || '';
const maDoi = chuanId(ts.get('doi')).slice(0, 6);
const ky = kyTheoId(kyId);
const vung = $('#tr-noi-dung');
$('#dang-tai').hidden = true;

if (!ky || maDoi.length !== 6) {
  vung.innerHTML = `<div class="empty"><b>Đường dẫn phòng thi chưa đúng.</b>Quay lại trang Thi Đấu rồi bấm “Vào phòng thi”.</div>`;
  await new Promise(() => {});
}
const doi = await duLieu.layDoi(maDoi).catch(() => null);
$('#tr-phu').textContent = `${ky.ten}${doi ? ' · Đội ' + doi.ten : ''}`;
document.title = `Phòng thi ${doi?.ten || ''} – Học Cùng Bạn`;

let tran;          // undefined: chưa tải; null: chưa mở
let roiMat = null; // hàm thôi báo có mặt
let daGhi = false;
const daChon = {}; // câu i → phương án vừa bấm (hiện ngay trước khi máy chủ xác nhận)

const tenTv = (u) => tran?.thanhVien?.[u]?.ten || 'Bạn';
const giay = (ms) => Math.max(0, Math.ceil(ms / 1000));
let khoaCu = ''; // trạng thái đã vẽ (chỉ vẽ lại cả khung khi trạng thái đổi)

duLieu.theoDoiTran(kyId, maDoi, (t) => {
  tran = t;
  if (tran?.thanhVien?.[ctx.uid] && !roiMat && !tran.xong) roiMat = duLieu.coMatTran(kyId, maDoi);
  ve(true);
});
setInterval(() => ve(false), 250);

/* ---------- Vẽ theo trạng thái ---------- */
function ve(ep) {
  if (tran === undefined) return;
  const bay = duLieu.gioMayChu();
  let khoa;
  let trang = null;
  if (!tran) khoa = 'chua-mo';
  else if (!tran.thanhVien[ctx.uid]) khoa = 'khong-co-ten';
  else if (!tran.batDauLuc) khoa = 'cho|' + Object.keys(tran.mat || {}).sort().join();
  else {
    trang = tinhTran(tran, bay, nh);
    if (trang.xong) khoa = 'xong';
    else if (trang.hienTai && bay >= trang.hienTai.batDau) khoa = `cau|${trang.hienTai.i}|${tran.traLoi?.[trang.hienTai.i] ? 1 : 0}|${daChon[trang.hienTai.i] ?? ''}`;
    else khoa = `xem|${trang.ds.length}`;
  }
  if (ep || khoa !== khoaCu) {
    khoaCu = khoa;
    if (khoa === 'chua-mo') veChuaMo();
    else if (khoa === 'khong-co-ten') vung.innerHTML = `<div class="empty"><b>Bạn không có tên trong lượt thi này của đội.</b>Có thể bạn vào đội sau khi đội trưởng mở phòng thi.</div>`;
    else if (khoa.startsWith('cho')) vePhongCho();
    else if (khoa === 'xong') veKetQua(trang);
    else if (khoa.startsWith('cau')) veCau(trang, bay);
    else veXem(trang, bay);
  }
  // Đồng hồ đếm ngược cập nhật liên tục, không vẽ lại cả khung
  const dem = $('#tr-dem');
  if (dem && trang) {
    const ht = trang.hienTai;
    const conLai = ht ? (bay < ht.batDau ? ht.batDau - bay : ht.han - bay) : Math.max(0, (trang.ketThuc || bay) - bay);
    dem.textContent = giay(conLai);
    const thanh = $('#tr-dem-thanh');
    if (thanh && ht && bay >= ht.batDau) thanh.style.width = Math.max(0, Math.min(100, ((ht.han - bay) / tran.hanMs) * 100)) + '%';
  }
}

function veChuaMo() {
  const laThanhVien = doi?.thanhVien.includes(ctx.uid);
  vung.innerHTML = laThanhVien
    ? `<div class="empty"><b>Đội trưởng chưa mở phòng thi.</b>Trang sẽ tự vào phòng chờ khi đội trưởng mở. ` +
      (doi.truong === ctx.uid ? 'Bạn là đội trưởng: quay lại trang Thi Đấu và bấm “Mở phòng thi”.' : 'Nhắn đội trưởng mở phòng nhé!') + `</div>`
    : `<div class="empty"><b>Bạn không ở trong đội này.</b>Vào đội bằng mã đội ở trang Thi Đấu.</div>`;
}

/* ---------- Phòng chờ ---------- */
async function vePhongCho() {
  const dsTv = Object.keys(tran.thanhVien);
  const hs = await Promise.all(dsTv.map((u) => layHoSo(u)));
  const mat = tran.mat || {};
  const du = dsTv.every((u) => mat[u]);
  const laTruong = tran.truong === ctx.uid;
  const dangMo = kyDangMo(duLieu.gioMayChu()).some((k) => k.id === kyId);
  const thuTu = dsTv.map((u) => `${esc(nh.tenMon(tran.thanhVien[u].mon))} (${esc(tenTv(u))})`).join(' → ');
  if (!khoaCu.startsWith('cho')) return; // trạng thái đã đổi trong lúc tải hồ sơ
  vung.innerHTML =
    `<div class="card tr-cho"><h2>Phòng chờ</h2>` +
    `<p class="muted">Đủ mặt cả đội thì đội trưởng bấm <b>Bắt đầu thi</b>. Giữ trang này mở trong lúc thi.</p>` +
    `<ul class="tr-tv">` + dsTv.map((u, i) =>
      `<li class="${mat[u] ? 'co-mat' : ''}"><span class="tid-hinh" aria-hidden="true">${hs[i]?.nhanVat ? anhDau(hs[i].nhanVat) : ''}</span>` +
      `<span class="td-tv-chu"><b>${esc(tenTv(u))}${u === tran.truong ? ' 👑' : ''}${u === ctx.uid ? ' (bạn)' : ''}</b><small>Thi ${esc(nh.tenMon(tran.thanhVien[u].mon))}</small></span>` +
      `<span class="tr-mat">${mat[u] ? '🟢 Đã vào' : '⚪ Chưa vào'}</span></li>`).join('') + `</ul>` +
    `<p class="small"><b>Thứ tự thi:</b> ${thuTu}. Mỗi môn ${tran.cau.length / dsTv.length} câu, ${Math.round(tran.hanMs / 1000)} giây mỗi câu.</p>` +
    (laTruong
      ? `<div class="row" style="margin-top:14px"><button class="btn btn-primary" id="tr-bat-dau"${du && dangMo ? '' : ' disabled'}><i class="fas fa-play" aria-hidden="true"></i> Bắt đầu thi</button>` +
        `<button class="btn btn-ghost" id="tr-huy">Huỷ phòng thi</button></div>` +
        (!dangMo ? `<p class="error" style="margin-top:8px">Kì thi này đã đóng.</p>` : !du ? `<p class="small muted" style="margin-top:8px">Chờ cả đội vào phòng…</p>` : '')
      : `<p class="tr-cho-chu">⏳ Chờ đội trưởng bắt đầu…</p>`) +
    `</div>`;
  $('#tr-bat-dau')?.addEventListener('click', async (e) => {
    e.currentTarget.disabled = true;
    // Uy tín có thể vừa bị trừ: kiểm tra lại lần cuối
    for (const u of dsTv) {
      if ((await layUyTinCache(u, true)) < UY_TIN_THI_DAU) {
        e.currentTarget.disabled = false;
        return thongBao(`${esc(tenTv(u))} chưa đủ uy tín (cần ${UY_TIN_THI_DAU}) nên đội chưa thi được.`, { loai: 'err' });
      }
    }
    duLieu.batDauTran(kyId, maDoi).catch((err) => thongBao(esc(err.message), { loai: 'err' }));
  });
  $('#tr-huy')?.addEventListener('click', async () => {
    await duLieu.huyTran(kyId, maDoi);
    location.href = 'thi-dau.html';
  });
}

/* ---------- Thanh trên: câu, môn, lượt, điểm đội ---------- */
function htmlThanh(trang, i) {
  const c = tran.cau[i];
  const u = tran.phan[i];
  const diem = trang.ds.reduce((s, x) => s + x.diem, 0);
  const dsTv = Object.keys(tran.thanhVien);
  return `<div class="tr-thanh">` +
    `<span class="tr-so">Câu ${i + 1}/${tran.cau.length}</span>` +
    `<span class="tr-luot">${esc(nh.tenMon(c.mon))} · lượt của <b>${esc(tenTv(u))}${u === ctx.uid ? ' (bạn)' : ''}</b></span>` +
    `<span class="tr-diem-doi">Điểm đội: <b>${diem}</b></span></div>` +
    `<ol class="kt-cac-mon" aria-hidden="true">` + dsTv.map((x) => {
      const cuaX = tran.phan.map((p, k) => (p === x ? k : -1)).filter((k) => k >= 0);
      const lop = cuaX.includes(i) ? 'dang' : cuaX.every((k) => k < i) ? 'xong' : '';
      return `<li class="${lop}">${esc(nh.tenMon(tran.thanhVien[x].mon))}</li>`;
    }).join('') + `</ol>`;
}

/* ---------- Đang trả lời ---------- */
function veCau(trang, bay) {
  const { i } = trang.hienTai;
  const c = tran.cau[i];
  const q = nh.timCau(c.mon, c.id);
  const luotToi = tran.phan[i] === ctx.uid;
  const daTraLoi = tran.traLoi?.[i] || daChon[i] !== undefined;
  const chon = tran.traLoi?.[i]?.chon ?? daChon[i];
  vung.innerHTML =
    `<div class="card tr-cau${luotToi ? ' luot-toi' : ''}">` + htmlThanh(trang, i) +
    `<div class="tr-dem-khung"><div class="tr-dem-nen" aria-hidden="true"><span id="tr-dem-thanh"></span></div>` +
    `<span class="tr-dem" id="tr-dem" role="timer" aria-label="Số giây còn lại">${giay(trang.hienTai.han - bay)}</span></div>` +
    `<p class="kt-meta">${esc(q?.topic || '')}</p>` +
    `<p class="kt-de" id="tr-de" tabindex="-1">${esc(q?.question || 'Câu hỏi không còn trong ngân hàng.')}</p>` +
    `<div class="tr-pa" role="group" aria-label="Các phương án">` +
    c.hoanVi.map((goc, k) =>
      `<button type="button" class="kt-lua-chon tr-lua-chon${chon === goc ? ' da-chon' : ''}" data-chon="${goc}"${luotToi && !daTraLoi ? '' : ' disabled'}>` +
      `<span class="kt-chu">${CHU[k]}</span><span>${esc(q?.options[goc] ?? '')}</span></button>`).join('') +
    `</div>` +
    `<p class="tr-goi-y">${luotToi
      ? (daTraLoi ? '✅ Đã chốt đáp án. Chờ xem kết quả…' : '👉 <b>Lượt của bạn!</b> Chọn một đáp án — bấm là chốt luôn.')
      : `👀 ${esc(tenTv(tran.phan[i]))} đang trả lời. Chỉ người thi môn này mới được bấm.`}</p></div>`;
  vung.querySelectorAll('[data-chon]').forEach((b) => b.addEventListener('click', () => {
    if (daChon[i] !== undefined) return;
    daChon[i] = Number(b.dataset.chon);
    ve(true);
    duLieu.traLoiTran(kyId, maDoi, i, daChon[i]).catch(() => {});
  }));
  if (luotToi && !daTraLoi) $('#tr-de').focus({ preventScroll: true });
}

/* ---------- Xem đáp án câu vừa xong / chuẩn bị câu tiếp ---------- */
function veXem(trang, bay) {
  const truoc = trang.ds.at(-1);
  const sau = trang.hienTai;
  let html = `<div class="card tr-cau tr-xem">`;
  if (truoc) {
    const c = tran.cau[truoc.i];
    const q = nh.timCau(c.mon, c.id);
    html += htmlThanh(trang, truoc.i) +
      `<p class="tr-ket ${truoc.ok ? 'dung' : 'sai'}">${truoc.ok ? `✅ Chính xác! +${truoc.diem} điểm` : truoc.hetGio ? '⏰ Hết giờ — câu này 0 điểm' : '❌ Chưa đúng — câu này 0 điểm'}</p>` +
      `<p class="kt-de">${esc(q?.question || '')}</p>` +
      `<ul class="xl-pa">` + c.hoanVi.map((goc, k) => {
        const lop = goc === q?.answer ? 'la-dap-an' : goc === truoc.chon ? 'ban-chon' : '';
        return `<li class="${lop}"><b>${CHU[k]}.</b> ${esc(q?.options[goc] ?? '')}${goc === q?.answer ? ' <em>(đáp án đúng)</em>' : goc === truoc.chon ? ` <em>(${esc(tenTv(tran.phan[truoc.i]))} chọn)</em>` : ''}</li>`;
      }).join('') + `</ul>` +
      (q?.explanation ? `<p class="xl-giai"><b>Giải thích:</b> ${esc(q.explanation)}</p>` : '');
  } else {
    html += `<h2 class="tr-chuan-bi">🚀 Chuẩn bị!</h2>`;
  }
  html += sau
    ? `<p class="tr-tiep">Câu tiếp: <b>${esc(nh.tenMon(tran.cau[sau.i].mon))}</b> — lượt của <b>${esc(tenTv(tran.phan[sau.i]))}${tran.phan[sau.i] === ctx.uid ? ' (bạn)' : ''}</b> · sau <span id="tr-dem">${giay(sau.batDau - bay)}</span> giây</p>`
    : `<p class="tr-tiep">Đó là câu cuối! Xem kết quả sau <span id="tr-dem">${giay((trang.ketThuc || bay) - bay)}</span> giây…</p>`;
  vung.innerHTML = html + `</div>`;
}

/* ---------- Kết quả ---------- */
function veKetQua(trang) {
  const kq = ketQuaTran(tran, trang);
  if (!daGhi) {
    daGhi = true;
    duLieu.ghiKetQua(kq).catch(() => {});
    if (!tran.xong) duLieu.xongTran(kyId, maDoi);
    roiMat?.();
    roiMat = null;
  }
  const dsTv = Object.keys(tran.thanhVien);
  const phut = Math.floor(kq.thoiGianMs / 60000);
  vung.innerHTML =
    `<div class="card tr-kq"><h2>🎉 Đội ${esc(tran.ten)} đã thi xong!</h2>` +
    `<p class="tr-tong"><b>${kq.diem}</b><small> / 1000 điểm</small></p>` +
    `<p class="muted">${kq.dung}/${kq.soCau} câu đúng · ${phut ? phut + ' phút ' : ''}${Math.round((kq.thoiGianMs % 60000) / 1000)} giây</p>` +
    `<div class="ktt-bang-khung"><table class="tr-bang"><caption class="sr-only">Kết quả từng thành viên</caption>` +
    `<thead><tr><th scope="col">Thành viên</th><th scope="col">Môn</th><th scope="col">Đúng</th><th scope="col">Điểm</th></tr></thead><tbody>` +
    dsTv.map((u) => {
      const cua = trang.ds.filter((x) => tran.phan[x.i] === u);
      return `<tr><th scope="row">${esc(tenTv(u))}${u === ctx.uid ? ' (bạn)' : ''}</th><td>${esc(nh.tenMon(tran.thanhVien[u].mon))}</td>` +
        `<td>${cua.filter((x) => x.ok).length}/${cua.length}</td><td>${cua.reduce((s, x) => s + x.diem, 0)}</td></tr>`;
    }).join('') + `</tbody></table></div>` +
    `<p class="small muted" style="margin-top:10px">Xếp hạng và ngôi sao thưởng có sau 23:59 Chủ nhật. Ba đội cao nhất lên Bảng vàng và được vào vòng tiếp theo.</p>` +
    `<div class="row" style="margin-top:14px"><a class="btn btn-primary" href="thi-dau.html">Về trang Thi Đấu</a></div></div>`;
}
