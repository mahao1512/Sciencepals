/*
 * kiem-tra-tuan.js — Bài test định kỳ theo tuần: đo xem học cùng bạn có hiệu quả không.
 *  - Mỗi tuần (Thứ 2 – Chủ nhật) làm một lần.
 *  - Môn thi: các môn yếu của bạn + môn mạnh của những bạn đã học cùng bạn trong 7 ngày qua
 *    (học cùng ít nhất TEST_TUAN_PHUT_HOC_CUNG phút theo đồng hồ phòng), tối đa TEST_TUAN_MON_MAX môn.
 *  - Mỗi môn TEST_TUAN_SO_CAU câu, CHỈ lấy câu bạn đã làm sai hoặc chưa từng làm ở bài kiểm tra đầu vào.
 *  - Kết quả so với tuần trước và cho biết từng bạn học cùng giúp được bạn tới đâu.
 * Kết quả lưu trong dữ liệu riêng: rieng.testTuan = { 'YYYY-MM-DD' (Thứ 2): { luc, diem, chiTiet, suaSai, banHoc, boQua } }.
 */
import { duLieu } from './data/index.js';
import { esc, thongBao, ngayVN, ngayCong } from './tienich.js';
import { khoiTaoTrang } from './khung.js';
import { taiNganHang, bocCau, cauDaDung, cauDaLam } from './ngan-hang.js';
import { TEST_TUAN_SO_CAU, TEST_TUAN_MON_MAX, TEST_TUAN_PHUT_HOC_CUNG } from './config.js';

const $ = (s) => document.querySelector(s);
const CHU = ['A', 'B', 'C', 'D', 'E', 'F'];
const GIU_TUAN = 12; // giữ kết quả 12 tuần gần nhất

const ctx = await khoiTaoTrang();
let nh;
try {
  nh = await taiNganHang();
} catch (e) {
  $('#dang-tai').textContent = 'Không tải được ngân hàng câu hỏi. Kiểm tra lại file data/ngan-hang-cau-hoi-thpt.json rồi tải lại trang.';
  throw e;
}
const ten = (id) => esc(nh.tenMon(id));

/* ---------- Tuần hiện tại (theo giờ Việt Nam) ---------- */
const homNay = ngayVN(new Date(duLieu.gioMayChu()));
const thuCua = (ymd) => { const [y, m, d] = ymd.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)).getUTCDay(); };
const TUAN = ngayCong(homNay, -((thuCua(homNay) + 6) % 7)); // Thứ 2 của tuần này
const dd = (ymd) => ymd.slice(8, 10) + '/' + ymd.slice(5, 7);
const TEN_TUAN = `${dd(TUAN)} – ${dd(ngayCong(TUAN, 6))}`;
const ketQuaTuan = () => ctx.rieng.testTuan || {};
const tuanTruoc = (tuan) => Object.keys(ketQuaTuan()).filter((t) => t < tuan).sort().pop();

/* ---------- Tiến độ đang làm (lưu trên máy) ---------- */
const KHOA = 'pl_ktt_' + ctx.uid;
const docTienDo = () => { try { const t = JSON.parse(localStorage.getItem(KHOA)); return t?.tuan === TUAN ? t : null; } catch (e) { return null; } };
const ghiTienDo = (t) => { try { localStorage.setItem(KHOA, JSON.stringify(t)); } catch (e) { /* bỏ qua */ } };
const xoaTienDo = () => { try { localStorage.removeItem(KHOA); } catch (e) { /* bỏ qua */ } };
const khoaCau = (mon, id) => mon + ':' + id;

const hien = (id) => ['#dang-tai', '#ktt-gioi-thieu', '#kt-lam-bai', '#ktt-ket-qua'].forEach((s) => { $(s).hidden = s !== id; });
const gioPhut = (ms) => {
  const p = Math.round(ms / 60000);
  return p >= 60 ? `${Math.floor(p / 60)} giờ ${p % 60 ? (p % 60) + ' phút' : ''}`.trim() : `${p} phút`;
};

/** Học cùng ai trong 7 ngày qua (gộp nhật ký từng ngày): { uid: { ten, mon, ms } } */
function banHoc7Ngay() {
  const tu = ngayCong(homNay, -6);
  const kq = {};
  Object.entries(ctx.rieng.hocCung || {}).forEach(([ngay, ds]) => {
    if (ngay < tu || ngay > homNay) return;
    Object.entries(ds).forEach(([uid, b]) => {
      const x = kq[uid] || (kq[uid] = { ten: b.ten, mon: b.mon, ms: 0 });
      x.ms += b.ms || 0;
      if (b.mon) x.mon = b.mon;
      x.ten = b.ten || x.ten;
    });
  });
  return kq;
}
const banDuGio = () => Object.entries(banHoc7Ngay())
  .filter(([, b]) => b.ms >= TEST_TUAN_PHUT_HOC_CUNG * 60000)
  .sort((a, b) => b[1].ms - a[1].ms);

/** Môn thi tuần này kèm lí do: [{ mon, lyDo }] */
function monThi() {
  const ds = [];
  const them = (mon, lyDo) => {
    if (!nh.monTheoId[mon]) return;
    const co = ds.find((x) => x.mon === mon);
    if (co) { if (!co.lyDo.includes(lyDo)) co.lyDo.push(lyDo); } else ds.push({ mon, lyDo: [lyDo] });
  };
  (ctx.congKhai.yeu || []).forEach((m) => them(m, 'môn bạn cần cải thiện'));
  banDuGio().forEach(([, b]) => { if (b.mon) them(b.mon, `học cùng ${b.ten}`); });
  return ds.slice(0, TEST_TUAN_MON_MAX);
}

/** Tạo bài: mỗi môn bốc câu trong số câu chưa từng làm đúng ở bài đầu vào. */
function taoBai(dsMon) {
  const dung = cauDaDung(ctx.rieng, nh);
  const ds = [];
  const boQua = [];
  dsMon.forEach(({ mon }) => {
    const kho = nh.monTheoId[mon].questions.filter((q) => !dung[mon]?.has(q.id));
    if (!kho.length) boQua.push(mon);
    else ds.push({ mon, cau: bocCau(kho, TEST_TUAN_SO_CAU) });
  });
  return { tuan: TUAN, ds, traLoi: {}, viTri: { m: 0, c: 0 }, boQua };
}

/* ---------- Màn mở đầu ---------- */
function veGioiThieu() {
  hien('#ktt-gioi-thieu');
  const el = $('#ktt-gioi-thieu');
  if (!ctx.congKhai.diem) {
    el.innerHTML = `<div class="empty"><b>Bạn chưa làm bài kiểm tra đầu vào.</b>Bài test tuần dùng những câu bạn đã làm sai hoặc chưa làm ở bài đầu vào, ` +
      `nên hãy làm bài đầu vào trước nhé.<p style="margin-top:14px"><a class="btn btn-primary" href="kiem-tra.html">Làm bài kiểm tra đầu vào</a></p></div>`;
    return;
  }
  const t = docTienDo();
  const dsMon = monThi();
  const ban = banDuGio();
  const daLam = t ? Object.keys(t.traLoi).length : 0;
  const tong = t ? t.ds.reduce((s, x) => s + x.cau.length, 0) : 0;
  el.innerHTML =
    `<div class="card kt-mo-dau">` +
    `<h1>Bài test tuần ${TEN_TUAN}</h1>` +
    `<p class="muted">Đo xem tuần này học cùng bạn có hiệu quả không. Mỗi tuần làm một lần.</p>` +
    `<ul class="kt-thong-tin">` +
    `<li>Mỗi môn ${TEST_TUAN_SO_CAU} câu, <b>chỉ lấy câu bạn đã làm sai hoặc chưa từng làm</b> ở bài kiểm tra đầu vào.</li>` +
    `<li>Môn thi gồm môn bạn cần cải thiện và môn mạnh của các bạn đã học cùng bạn trong 7 ngày qua (từ ${TEST_TUAN_PHUT_HOC_CUNG} phút trở lên).</li>` +
    `<li>Kết quả so với tuần trước và cho biết từng bạn học cùng đã giúp bạn tới đâu.</li></ul>` +
    `<h2 class="ktt-td">Môn thi tuần này</h2>` +
    (dsMon.length
      ? `<ul class="ktt-mon">${dsMon.map((x) => `<li><b>${ten(x.mon)}</b><small>${esc(x.lyDo.join(' · '))}</small></li>`).join('')}</ul>`
      : `<p class="muted">Chưa có môn nào để thi. Hãy làm bài kiểm tra đầu vào để biết môn cần cải thiện.</p>`) +
    `<h2 class="ktt-td">Bạn đã học cùng (7 ngày qua)</h2>` +
    (ban.length
      ? `<ul class="ktt-ban">${ban.map(([, b]) => `<li><b>${esc(b.ten)}</b> · ${gioPhut(b.ms)}${b.mon ? ` · mạnh ${ten(b.mon)}` : ''}</li>`).join('')}</ul>`
      : `<p class="small muted">Chưa học cùng ai đủ ${TEST_TUAN_PHUT_HOC_CUNG} phút. Giờ học chỉ tính khi đồng hồ phòng đang chạy. ` +
        `Bạn vẫn làm bài được, nhưng kết quả sẽ chưa nói được nhiều về hiệu quả học cùng bạn.</p>`) +
    (t
      ? `<div class="kt-tiep"><p><b>Bạn đang làm dở</b>: đã trả lời ${daLam}/${tong} câu.</p>` +
        `<div class="kt-progress" aria-hidden="true"><span style="width:${(daLam / tong) * 100}%"></span></div>` +
        `<div class="row" style="margin-top:12px"><button class="btn btn-primary" id="ktt-tiep">Làm tiếp</button></div></div>`
      : '') +
    `<div class="row" style="margin-top:16px">` +
    (t ? '' : `<button class="btn btn-primary" id="ktt-bat-dau"${dsMon.length ? '' : ' disabled'}>Bắt đầu bài test tuần</button>`) +
    (tuanTruoc(TUAN + '~') ? `<button class="btn btn-secondary" id="ktt-xem-cu">Xem kết quả các tuần trước</button>` : '') +
    `<a class="btn btn-ghost" href="index.html">Để sau</a></div></div>`;
  $('#ktt-tiep')?.addEventListener('click', () => lamBai(t));
  $('#ktt-bat-dau')?.addEventListener('click', () => {
    const bai = taoBai(dsMon);
    if (!bai.ds.length) return thongBao('Bạn đã làm đúng hết câu của các môn này trong ngân hàng câu hỏi. Tuyệt vời!', { loai: 'ok' });
    if (bai.boQua.length) thongBao(`Bỏ qua ${bai.boQua.map(ten).join(', ')}: bạn đã làm đúng hết câu môn này rồi.`);
    ghiTienDo(bai);
    lamBai(bai);
  });
  $('#ktt-xem-cu')?.addEventListener('click', () => veKetQua(tuanTruoc(TUAN + '~')));
}

/* ---------- Làm bài: mỗi màn một câu ---------- */
function lamBai(t) {
  hien('#kt-lam-bai');
  const tong = t.ds.reduce((s, x) => s + x.cau.length, 0);
  const el = $('#kt-lam-bai');
  const ve = () => {
    const { m, c } = t.viTri;
    const nhom = t.ds[m];
    const muc = nhom.cau[c];
    const q = nh.timCau(nhom.mon, muc.id);
    const khoa = khoaCau(nhom.mon, muc.id);
    const chon = t.traLoi[khoa];
    const daLam = Object.keys(t.traLoi).length;
    const cuoiMon = c === nhom.cau.length - 1;
    const cuoiBai = cuoiMon && m === t.ds.length - 1;
    el.innerHTML =
      `<div class="kt-dau">` +
      `<div class="kt-mon"><span class="kt-mon-so">Môn ${m + 1}/${t.ds.length}</span> <b>${ten(nhom.mon)}</b><span class="kt-cau-so">Câu ${c + 1}/${nhom.cau.length}</span></div>` +
      `<div class="kt-progress" role="progressbar" aria-label="Tiến độ cả bài" aria-valuemin="0" aria-valuemax="${tong}" aria-valuenow="${daLam}" aria-valuetext="Đã trả lời ${daLam} trên ${tong} câu">` +
      `<span style="width:${(daLam / tong) * 100}%"></span></div></div>` +
      `<form class="card kt-cau" novalidate>` +
      `<p class="kt-meta">${esc(q.topic || '')}</p>` +
      `<fieldset><legend class="kt-de" tabindex="-1" id="kt-de">${esc(q.question)}</legend><div class="kt-pa">` +
      muc.hoanVi.map((goc, i) =>
        `<label class="kt-lua-chon"><input type="radio" name="pa" value="${goc}"${chon === goc ? ' checked' : ''}>` +
        `<span class="kt-chu">${CHU[i]}</span><span>${esc(q.options[goc])}</span></label>`).join('') +
      `</div></fieldset>` +
      `<div class="kt-nut">` +
      `<button type="button" class="btn btn-secondary" id="kt-truoc"${m === 0 && c === 0 ? ' disabled' : ''}><i class="fas fa-arrow-left" aria-hidden="true"></i> Câu trước</button>` +
      `<button type="submit" class="btn btn-primary" id="kt-sau"${chon === undefined ? ' disabled' : ''}>${cuoiBai ? 'Nộp bài' : cuoiMon ? 'Sang môn tiếp' : 'Câu tiếp'} <i class="fas fa-arrow-right" aria-hidden="true"></i></button>` +
      `</div><p class="small muted kt-luu">Bài được lưu tự động. <a href="index.html">Thoát, làm tiếp sau</a></p></form>`;
    const form = el.querySelector('form');
    form.addEventListener('change', (e) => {
      t.traLoi[khoa] = Number(e.target.value);
      ghiTienDo(t);
      form.querySelector('#kt-sau').disabled = false;
    });
    form.querySelector('#kt-truoc').addEventListener('click', () => {
      if (c > 0) t.viTri.c--; else { t.viTri.m--; t.viTri.c = t.ds[t.viTri.m].cau.length - 1; }
      ghiTienDo(t);
      ve();
    });
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (t.traLoi[khoa] === undefined) return;
      if (cuoiBai) return nopBai(t);
      if (cuoiMon) t.viTri = { m: m + 1, c: 0 }; else t.viTri.c++;
      ghiTienDo(t);
      ve();
    });
    el.querySelector('#kt-de').focus({ preventScroll: true });
    el.scrollIntoView({ block: 'start' });
  };
  ve();
}

/* ---------- Chấm & lưu ---------- */
async function nopBai(t) {
  const chuaLam = t.ds.flatMap((x) => x.cau.filter((c) => t.traLoi[khoaCau(x.mon, c.id)] === undefined));
  if (chuaLam.length) return thongBao(`Còn ${chuaLam.length} câu chưa trả lời.`, { loai: 'err' });
  const tungLam = cauDaLam(ctx.rieng);
  const diem = {};
  const chiTiet = {};
  const suaSai = {};
  t.ds.forEach((x) => {
    let dung = 0;
    const ss = { dung: 0, tong: 0 };
    chiTiet[x.mon] = x.cau.map((c) => {
      const chon = t.traLoi[khoaCau(x.mon, c.id)];
      const ok = chon === nh.timCau(x.mon, c.id).answer;
      if (ok) dung++;
      // Câu từng làm ở bài đầu vào mà không nằm trong số câu đúng = câu từng sai
      if (tungLam[x.mon]?.has(c.id)) { ss.tong++; if (ok) ss.dung++; }
      return { id: c.id, chon, hoanVi: c.hoanVi };
    });
    diem[x.mon] = Math.round((dung / x.cau.length) * 100) / 10;
    suaSai[x.mon] = ss;
  });
  const banHoc = Object.fromEntries(banDuGio());
  const giu = Object.fromEntries(Object.entries(ketQuaTuan()).sort(([a], [b]) => (a < b ? 1 : -1)).slice(0, GIU_TUAN - 1));
  try {
    ctx.rieng = await duLieu.luuRieng({
      testTuan: { ...giu, [TUAN]: { luc: Date.now(), diem, chiTiet, suaSai, banHoc, boQua: t.boQua || [] } }
    });
  } catch (e) {
    return thongBao('Chưa lưu được kết quả: ' + esc(e.message) + ' Bài làm vẫn còn trên máy, bấm Nộp bài để thử lại.', { loai: 'err' });
  }
  xoaTienDo();
  veKetQua(TUAN, true);
}

/* ---------- Kết quả ---------- */
const TEN_DANH_GIA = { tot: '✅ Hiệu quả', vua: '➖ Tiến bộ chậm', chua: '⚠️ Chưa thấy hiệu quả', moi: '🆕 Mới có lần đầu' };
/** Đánh giá một môn: so với tuần trước nếu có, chưa có thì dựa vào tỉ lệ câu từng sai nay làm đúng. */
function danhGia(kq, cu, mon) {
  const d = kq.diem[mon];
  if (d === undefined) return null;
  const ss = kq.suaSai?.[mon];
  const tiLe = ss?.tong ? ss.dung / ss.tong : null;
  if (cu?.diem?.[mon] !== undefined) {
    const chenh = Math.round((d - cu.diem[mon]) * 10) / 10;
    return { chenh, loai: chenh >= 1 ? 'tot' : chenh > -1 ? 'vua' : 'chua', tiLe };
  }
  if (tiLe === null) return { chenh: null, loai: d >= 6 ? 'tot' : d >= 4 ? 'moi' : 'chua', tiLe };
  return { chenh: null, loai: tiLe >= 0.5 ? 'tot' : tiLe >= 0.3 ? 'vua' : 'chua', tiLe };
}

function veKetQua(tuan, vuaNop = false) {
  hien('#ktt-ket-qua');
  const kq = ketQuaTuan()[tuan];
  const el = $('#ktt-ket-qua');
  if (!kq) { veGioiThieu(); return; }
  const tTruoc = tuanTruoc(tuan);
  const cu = tTruoc ? ketQuaTuan()[tTruoc] : null;
  const dauVao = ctx.congKhai.diem || {};
  const dsMon = Object.keys(kq.diem);
  const dg = Object.fromEntries(dsMon.map((m) => [m, danhGia(kq, cu, m)]));
  const ban = Object.entries(kq.banHoc || {});
  const tot = dsMon.filter((m) => dg[m]?.loai === 'tot').length;
  const tenTuanNay = `${dd(tuan)} – ${dd(ngayCong(tuan, 6))}`;
  const ketLuan = !ban.length
    ? 'Tuần này bạn chưa học cùng ai đủ lâu, nên chưa đánh giá được hiệu quả học cùng bạn. Hãy rủ bạn vào phòng học và chạy đồng hồ nhé!'
    : tot >= Math.ceil(dsMon.length / 2)
      ? '🎉 Học cùng bạn đang có hiệu quả! Giữ nhịp học này nhé.'
      : 'Học cùng bạn chưa rõ hiệu quả. Thử học lâu hơn với bạn mạnh đúng môn bạn cần, hoặc đổi bạn học ở trang Tìm bạn học.';
  const tatCaTuan = Object.keys(ketQuaTuan()).sort().reverse();
  el.innerHTML =
    `<div class="card">` +
    `<h1 id="kq-tieu-de" tabindex="-1">${vuaNop ? '🎉 Nộp bài xong! ' : ''}Kết quả bài test tuần ${tenTuanNay}</h1>` +
    `<p class="ktt-ket-luan">${ketLuan}</p>` +
    `<div class="ktt-bang-khung"><table class="ktt-bang"><caption class="sr-only">Điểm từng môn tuần này so với tuần trước và bài đầu vào (thang 10)</caption>` +
    `<thead><tr><th scope="col">Môn</th><th scope="col">Tuần này</th><th scope="col">Tuần trước</th><th scope="col">Đầu vào</th><th scope="col">Câu từng sai nay đúng</th><th scope="col">Đánh giá</th></tr></thead><tbody>` +
    dsMon.map((m) => {
      const x = dg[m];
      const ss = kq.suaSai?.[m];
      return `<tr><th scope="row">${ten(m)}</th><td><b>${kq.diem[m]}</b>${x?.chenh !== null && x?.chenh !== undefined ? ` <span class="ktt-chenh ${x.chenh >= 0 ? 'tang' : 'giam'}">${x.chenh > 0 ? '+' : ''}${x.chenh}</span>` : ''}</td>` +
        `<td>${cu?.diem?.[m] ?? '—'}</td><td>${dauVao[m] ?? '—'}</td>` +
        `<td>${ss?.tong ? `${ss.dung}/${ss.tong}` : '—'}</td><td class="ktt-dg ${x?.loai || ''}">${x ? TEN_DANH_GIA[x.loai] : ''}</td></tr>`;
    }).join('') +
    `</tbody></table></div>` +
    (kq.boQua?.length ? `<p class="small muted">Không thi ${kq.boQua.map(ten).join(', ')} vì bạn đã làm đúng hết câu môn này.</p>` : '') +
    `<p class="small muted">Bài test tuần chỉ gồm câu bạn từng làm sai hoặc chưa làm, nên khó hơn bài đầu vào. Hãy so với <b>tuần trước</b> và cột <b>câu từng sai nay đúng</b> để thấy tiến bộ.</p>` +
    `</div>` +
    `<section class="card" aria-labelledby="ktt-ban-td"><h2 id="ktt-ban-td">Từng bạn học cùng giúp bạn tới đâu?</h2>` +
    (ban.length
      ? `<ul class="ktt-ban-kq">` + ban.map(([, b]) => {
        const x = b.mon ? dg[b.mon] : null;
        return `<li><b>${esc(b.ten)}</b> <span class="muted small">· học cùng ${gioPhut(b.ms)}${b.mon ? ` · mạnh ${ten(b.mon)}` : ''}</span><br>` +
          (x
            ? `Môn ${ten(b.mon)}: <b>${kq.diem[b.mon]}</b>/10${x.chenh !== null ? ` (${x.chenh > 0 ? '+' : ''}${x.chenh} so với tuần trước)` : ''} — <span class="ktt-dg ${x.loai}">${TEN_DANH_GIA[x.loai]}</span>`
            : b.mon ? `<span class="muted">Môn ${ten(b.mon)} không có trong bài tuần này.</span>` : '<span class="muted">Bạn ấy chưa làm bài đầu vào nên chưa biết môn mạnh.</span>') +
          `</li>`;
      }).join('') + `</ul>`
      : `<p class="muted">Tuần này chưa học cùng ai đủ ${TEST_TUAN_PHUT_HOC_CUNG} phút.</p>`) +
    `<div class="row" style="margin-top:14px"><a class="btn btn-primary" href="tim-ban.html"><i class="fas fa-user-group" aria-hidden="true"></i> Tìm bạn học</a>` +
    `<a class="btn btn-ghost" href="index.html">Về trang chủ</a></div></section>` +
    (tatCaTuan.length > 1
      ? `<section class="card"><h2>Các tuần trước</h2><div class="row">` + tatCaTuan.map((w) => {
        const d = Object.values(ketQuaTuan()[w].diem);
        const tb = d.length ? Math.round((d.reduce((s, v) => s + v, 0) / d.length) * 10) / 10 : 0;
        return `<button type="button" class="opt" data-tuan="${w}" aria-pressed="${w === tuan}">${dd(w)} · TB ${tb}</button>`;
      }).join('') + `</div></section>`
      : '') +
    veXemLai(kq);
  el.querySelectorAll('[data-tuan]').forEach((b) => b.addEventListener('click', () => veKetQua(b.dataset.tuan)));
  $('#kq-tieu-de').focus({ preventScroll: true });
  window.scrollTo({ top: 0 });
}

function veXemLai(kq) {
  return `<section class="card kq-xem-lai" aria-labelledby="xl-tieu-de"><h2 id="xl-tieu-de">Xem lại từng câu</h2>` +
    Object.entries(kq.chiTiet || {}).map(([mon, ds]) => {
      const dung = ds.filter((c) => c.chon === nh.timCau(mon, c.id)?.answer).length;
      return `<details><summary>${ten(mon)} <span class="muted small">— đúng ${dung}/${ds.length}</span></summary><ol class="xl-ds">` +
        ds.map((c) => {
          const q = nh.timCau(mon, c.id);
          if (!q) return '<li class="muted small">Câu này đã bị xoá khỏi ngân hàng.</li>';
          const ok = c.chon === q.answer;
          return `<li class="${ok ? 'dung' : 'sai'}"><p class="xl-de"><span class="xl-dau">${ok ? '✓ Đúng' : '✗ Sai'}</span> ${esc(q.question)}</p><ul class="xl-pa">` +
            (c.hoanVi || q.options.map((_, i) => i)).map((goc, i) => {
              const lop = goc === q.answer ? 'la-dap-an' : goc === c.chon ? 'ban-chon' : '';
              const ghi = goc === q.answer ? ' <em>(đáp án đúng)</em>' : goc === c.chon ? ' <em>(bạn chọn)</em>' : '';
              return `<li class="${lop}"><b>${CHU[i]}.</b> ${esc(q.options[goc])}${ghi}</li>`;
            }).join('') +
            `</ul><p class="xl-giai"><b>Giải thích:</b> ${esc(q.explanation || '')}</p></li>`;
        }).join('') + `</ol></details>`;
    }).join('') + `</section>`;
}

/* ---------- Bắt đầu ---------- */
if (ketQuaTuan()[TUAN]) veKetQua(TUAN);
else veGioiThieu();
