/*
 * kiem-tra.js — Bài kiểm tra đầu vào.
 * Đọc data/de-mau.json: làm lần lượt từng môn, xáo thứ tự phương án, lưu tiến độ sau mỗi câu
 * (thoát giữa chừng thì lần sau làm tiếp), chấm theo meta.scoring rồi hiện trang kết quả.
 * Thêm câu hỏi chỉ cần sửa file JSON: nếu một môn có nhiều hơn meta.questionsPerSubject câu,
 * mỗi lần làm sẽ bốc ngẫu nhiên đúng số câu đó.
 */
import { duLieu } from './data/index.js';
import { esc, taiJSON, thongBao, moCuaSo } from './tienich.js';
import { khoiTaoTrang } from './khung.js';
import { phanLoai, NGUONG_MAC_DINH } from './cham-diem.js';

const $ = (s) => document.querySelector(s);
const CHU = ['A', 'B', 'C', 'D', 'E', 'F'];

const ctx = await khoiTaoTrang();
let de;
try {
  de = await taiJSON('data/de-mau.json');
} catch (e) {
  $('#dang-tai').textContent = 'Không tải được đề (data/de-mau.json). Kiểm tra lại file đề rồi tải lại trang.';
  throw e;
}
const NGUONG = { ...NGUONG_MAC_DINH, ...(de.meta?.scoring || {}) };
const SO_CAU = de.meta?.questionsPerSubject || 10;
const CAP_DO = de.meta?.levels || {};
const monTheoId = Object.fromEntries(de.subjects.map((m) => [m.id, m]));
const khoaCau = (monId, cauId) => monId + ':' + cauId;
const timCau = (monId, cauId) => monTheoId[monId]?.questions.find((q) => q.id === cauId);

/* ---------- Tiến độ đang làm (lưu trên máy, theo từng tài khoản) ---------- */
const KHOA_TIEN_DO = 'pl_kt_' + ctx.uid;
const docTienDo = () => { try { return JSON.parse(localStorage.getItem(KHOA_TIEN_DO)); } catch (e) { return null; } };
const ghiTienDo = (t) => { try { localStorage.setItem(KHOA_TIEN_DO, JSON.stringify(t)); } catch (e) { /* bỏ qua */ } };
const xoaTienDo = () => { try { localStorage.removeItem(KHOA_TIEN_DO); } catch (e) { /* bỏ qua */ } };

function xao(mang) {
  const a = [...mang];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Tạo bài mới: chọn câu cho từng môn, xáo thứ tự phương án của từng câu. */
function taoBaiMoi() {
  const ds = de.subjects.map((m) => {
    const cau = m.questions.length > SO_CAU ? xao(m.questions).slice(0, SO_CAU) : m.questions;
    return { mon: m.id, cau: cau.map((q) => ({ id: q.id, hoanVi: xao(q.options.map((_, i) => i)) })) };
  });
  return { ds, traLoi: {}, viTri: { m: 0, c: 0 }, batDau: Date.now() };
}

/** Bài lưu dở còn dùng được không (đề có thể đã bị sửa). */
function hopLe(t) {
  return t && Array.isArray(t.ds) && t.ds.length && t.ds.every((x) => x.cau.every((c) => timCau(x.mon, c.id)));
}

const hien = (id) => ['#dang-tai', '#kt-gioi-thieu', '#kt-lam-bai', '#kt-ket-qua'].forEach((s) => { $(s).hidden = s !== id; });

/* ---------- Màn mở đầu ---------- */
function veGioiThieu() {
  hien('#kt-gioi-thieu');
  const t = docTienDo();
  const dangDo = hopLe(t);
  const tongCau = de.subjects.reduce((s, m) => s + Math.min(SO_CAU, m.questions.length), 0);
  const daLam = dangDo ? Object.keys(t.traLoi).length : 0;
  $('#kt-gioi-thieu').innerHTML =
    `<div class="card kt-mo-dau">` +
    `<h1>Bài kiểm tra đầu vào</h1>` +
    `<p class="muted">${esc(de.meta?.curriculum || '')}</p>` +
    `<ul class="kt-thong-tin">` +
    `<li><b>${de.subjects.length} môn</b>, mỗi môn ${SO_CAU} câu trắc nghiệm (${tongCau} câu, khoảng 30–40 phút).</li>` +
    `<li>Mỗi môn chấm thang 0–${NGUONG.maxPerSubject}. Từ <b>${NGUONG.strongFrom}</b> trở lên là <b>điểm mạnh</b>, từ <b>${NGUONG.weakUpTo}</b> trở xuống là <b>điểm yếu</b>.</li>` +
    `<li>Tiến độ được lưu sau mỗi câu. Thoát giữa chừng thì lần sau làm tiếp từ chỗ dở.</li>` +
    `<li>Làm thật lòng nhé — kết quả dùng để tìm bạn học bù trừ cho bạn, không phải để xếp hạng.</li></ul>` +
    (dangDo
      ? `<div class="kt-tiep">` +
        `<p><b>Bạn đang làm dở:</b> đã trả lời ${daLam}/${tongCau} câu, đang ở môn ${esc(monTheoId[t.ds[t.viTri.m].mon].name)}.</p>` +
        `<div class="kt-progress" aria-hidden="true"><span style="width:${(daLam / tongCau) * 100}%"></span></div>` +
        `<div class="row" style="margin-top:12px"><button class="btn btn-primary" id="kt-tiep">Làm tiếp</button>` +
        `<button class="btn btn-secondary" id="kt-moi">Làm lại từ đầu</button></div></div>`
      : `<div class="row" style="margin-top:16px"><button class="btn btn-primary" id="kt-moi">Bắt đầu làm bài</button>` +
        (ctx.congKhai.diem ? `<button class="btn btn-secondary" id="kt-xem">Xem kết quả gần nhất</button>` : '') +
        `<a class="btn btn-ghost" href="index.html">Để sau</a></div>`) +
    `</div>`;
  $('#kt-tiep')?.addEventListener('click', () => lamBai(t));
  $('#kt-moi').addEventListener('click', () => {
    if (dangDo && !confirm('Bỏ bài đang làm dở và bắt đầu lại từ đầu?')) return;
    const moi = taoBaiMoi();
    ghiTienDo(moi);
    lamBai(moi);
  });
  $('#kt-xem')?.addEventListener('click', () => veKetQua());
}

/* ---------- Làm bài: mỗi màn một câu ---------- */
function lamBai(t) {
  hien('#kt-lam-bai');
  const tong = t.ds.reduce((s, x) => s + x.cau.length, 0);
  const el = $('#kt-lam-bai');

  const ve = () => {
    const { m, c } = t.viTri;
    const nhom = t.ds[m];
    const mon = monTheoId[nhom.mon];
    const muc = nhom.cau[c];
    const q = timCau(nhom.mon, muc.id);
    const khoa = khoaCau(nhom.mon, muc.id);
    const chon = t.traLoi[khoa];
    const daLam = Object.keys(t.traLoi).length;
    const cuoiMon = c === nhom.cau.length - 1;
    const cuoiBai = cuoiMon && m === t.ds.length - 1;

    el.innerHTML =
      `<div class="kt-dau">` +
      `<div class="kt-mon"><span class="kt-mon-so">Môn ${m + 1}/${t.ds.length}</span> <b>${esc(mon.name)}</b>` +
      `<span class="kt-cau-so">Câu ${c + 1}/${nhom.cau.length}</span></div>` +
      `<div class="kt-progress" role="progressbar" aria-label="Tiến độ cả bài" aria-valuemin="0" aria-valuemax="${tong}" aria-valuenow="${daLam}" aria-valuetext="Đã trả lời ${daLam} trên ${tong} câu">` +
      `<span style="width:${(daLam / tong) * 100}%"></span></div>` +
      `<ol class="kt-cac-mon" aria-hidden="true">${t.ds.map((x, i) => `<li class="${i < m ? 'xong' : i === m ? 'dang' : ''}">${esc(monTheoId[x.mon].name)}</li>`).join('')}</ol>` +
      `</div>` +
      `<form class="card kt-cau" novalidate>` +
      `<p class="kt-meta">${esc(q.topic || '')}${q.level ? ' · ' + esc(CAP_DO[q.level] || '') : ''}</p>` +
      `<fieldset><legend class="kt-de" tabindex="-1" id="kt-de">${esc(q.question)}</legend>` +
      `<div class="kt-pa">` +
      muc.hoanVi.map((goc, i) =>
        `<label class="kt-lua-chon"><input type="radio" name="pa" value="${goc}"${chon === goc ? ' checked' : ''}>` +
        `<span class="kt-chu">${CHU[i]}</span><span>${esc(q.options[goc])}</span></label>`).join('') +
      `</div></fieldset>` +
      `<div class="kt-nut">` +
      `<button type="button" class="btn btn-secondary" id="kt-truoc"${m === 0 && c === 0 ? ' disabled' : ''}><i class="fas fa-arrow-left" aria-hidden="true"></i> Câu trước</button>` +
      `<button type="submit" class="btn btn-primary" id="kt-sau"${chon === undefined ? ' disabled' : ''}>` +
      (cuoiBai ? 'Nộp bài' : cuoiMon ? 'Sang môn tiếp' : 'Câu tiếp') + ` <i class="fas fa-arrow-right" aria-hidden="true"></i></button>` +
      `</div>` +
      `<p class="small muted kt-luu">Bài được lưu tự động. <a href="index.html">Thoát, làm tiếp sau</a></p>` +
      `</form>`;

    const form = el.querySelector('form');
    form.addEventListener('change', (e) => {
      t.traLoi[khoa] = Number(e.target.value);
      ghiTienDo(t);
      form.querySelector('#kt-sau').disabled = false;
      const pb = el.querySelector('[role="progressbar"]');
      const n = Object.keys(t.traLoi).length;
      pb.setAttribute('aria-valuenow', n);
      pb.setAttribute('aria-valuetext', `Đã trả lời ${n} trên ${tong} câu`);
      pb.firstElementChild.style.width = (n / tong) * 100 + '%';
    });
    form.querySelector('#kt-truoc').addEventListener('click', () => {
      if (c > 0) t.viTri.c--;
      else { t.viTri.m--; t.viTri.c = t.ds[t.viTri.m].cau.length - 1; }
      ghiTienDo(t);
      ve();
    });
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (t.traLoi[khoa] === undefined) return;
      if (cuoiBai) return nopBai(t);
      if (cuoiMon) {
        t.viTri = { m: m + 1, c: 0 };
        thongBao(`Xong môn ${esc(mon.name)}! Tiếp theo: ${esc(monTheoId[t.ds[m + 1].mon].name)}.`, { loai: 'ok', thoiGian: 2500 });
      } else t.viTri.c++;
      ghiTienDo(t);
      ve();
    });
    el.querySelector('#kt-de').focus({ preventScroll: true });
    el.scrollIntoView({ block: 'start' });
  };
  ve();
}

/* ---------- Chấm điểm & lưu ---------- */
async function nopBai(t) {
  const chuaLam = t.ds.flatMap((x) => x.cau.filter((c) => t.traLoi[khoaCau(x.mon, c.id)] === undefined));
  if (chuaLam.length) return thongBao(`Còn ${chuaLam.length} câu chưa trả lời. Bấm “Câu trước” để quay lại.`, { loai: 'err' });
  const diem = {};
  const chiTiet = {};
  t.ds.forEach((x) => {
    let dung = 0;
    chiTiet[x.mon] = x.cau.map((c) => {
      const chon = t.traLoi[khoaCau(x.mon, c.id)];
      if (chon === timCau(x.mon, c.id).answer) dung++;
      return { id: c.id, chon, hoanVi: c.hoanVi };
    });
    // Thang 0–max: tỉ lệ câu đúng × điểm tối đa (đúng bằng số câu đúng khi môn có 10 câu, mỗi câu 1 điểm)
    const tho = dung * (NGUONG.pointsPerCorrect || 1);
    const toiDa = x.cau.length * (NGUONG.pointsPerCorrect || 1);
    diem[x.mon] = Math.round((tho / toiDa) * NGUONG.maxPerSubject * 10) / 10;
  });
  const { manh, yeu } = phanLoai(diem, NGUONG);
  const luc = Date.now();
  try {
    ctx.congKhai = await duLieu.luuCongKhai({ diem, manh, yeu, kiemTraLuc: luc });
    ctx.rieng = await duLieu.luuRieng({ kiemTra: { luc, chiTiet } });
  } catch (e) {
    return thongBao('Chưa lưu được kết quả: ' + esc(e.message) + ' Bài làm vẫn còn trên máy, bấm Nộp bài để thử lại.', { loai: 'err' });
  }
  xoaTienDo();
  veKetQua(true);
}

/* ---------- Trang kết quả ---------- */
function bieuDo(diem, manh, yeu) {
  const max = NGUONG.maxPerSubject;
  const mon = de.subjects.filter((m) => diem[m.id] !== undefined);
  const loai = (id) => (manh.includes(id) ? 'manh' : yeu.includes(id) ? 'yeu' : 'tb');
  const tenLoai = { manh: 'Điểm mạnh', yeu: 'Điểm yếu', tb: 'Bình thường' };
  const pct = (v) => (v / max) * 100;
  return (
    `<figure class="bd">` +
    `<figcaption class="bd-chu-giai">Điểm từng môn (thang ${max}) ` +
    ['manh', 'yeu', 'tb'].map((l) => `<span class="bd-k"><span class="bd-key ${l}"></span>${tenLoai[l]}</span>`).join('') +
    `</figcaption>` +
    `<div class="bd-khung" aria-hidden="true">` +
    `<div class="bd-luoi">` +
    [max, NGUONG.strongFrom, NGUONG.weakUpTo, 0].map((v) =>
      `<div class="bd-moc${v === NGUONG.strongFrom || v === NGUONG.weakUpTo ? ' nguong' : ''}" style="bottom:${pct(v)}%"><span>${v}</span></div>`).join('') +
    `</div>` +
    `<div class="bd-cot-nhom">` +
    mon.map((m) => {
      const l = loai(m.id);
      return `<div class="bd-o" title="${esc(m.name)}: ${diem[m.id]}/${max} — ${tenLoai[l]}">` +
        `<div class="bd-cot ${l}" style="height:${Math.max(pct(diem[m.id]), 1.5)}%"><b>${diem[m.id]}</b></div>` +
        `<span class="bd-ten">${esc(m.name)}</span></div>`;
    }).join('') +
    `</div></div>` +
    // Bảng cho trình đọc màn hình
    `<table class="sr-only"><caption>Điểm từng môn (thang ${max})</caption><thead><tr><th>Môn</th><th>Điểm</th><th>Xếp loại</th></tr></thead><tbody>` +
    mon.map((m) => `<tr><td>${esc(m.name)}</td><td>${diem[m.id]}</td><td>${tenLoai[loai(m.id)]}</td></tr>`).join('') +
    `</tbody></table></figure>`
  );
}

function veKetQua(vuaNop = false) {
  hien('#kt-ket-qua');
  const { diem, manh = [], yeu = [], kiemTraLuc } = ctx.congKhai;
  const chiTiet = ctx.rieng.kiemTra?.chiTiet || {};
  const ten = (id) => esc(monTheoId[id]?.name || id);
  const nutTag = (ds, lop) => ds.length ? ds.map((id) => `<li class="tag ${lop}">${ten(id)} <b>${diem[id]}</b></li>`).join('') : '<li class="muted small">Chưa có</li>';
  const thoiGian = kiemTraLuc ? new Date(kiemTraLuc).toLocaleString('vi-VN', { dateStyle: 'medium', timeStyle: 'short' }) : '';
  const tong = Object.values(chiTiet).reduce((s, x) => s + x.length, 0);
  const tongDung = Object.entries(chiTiet).reduce((s, [mon, x]) => s + x.filter((c) => c.chon === timCau(mon, c.id)?.answer).length, 0);

  $('#kt-ket-qua').innerHTML =
    `<div class="card">` +
    `<h1 id="kq-tieu-de" tabindex="-1">${vuaNop ? '🎉 Nộp bài xong! Đây là kết quả của bạn' : 'Kết quả bài kiểm tra'}</h1>` +
    `<p class="muted small">${thoiGian ? 'Làm lúc ' + esc(thoiGian) + '. ' : ''}${tong ? `Đúng ${tongDung}/${tong} câu. ` : ''}Hồ sơ của bạn dùng kết quả gần nhất.</p>` +
    bieuDo(diem, manh, yeu) +
    `<div class="kq-hai-cot">` +
    `<div><h2>💪 Điểm mạnh</h2><p class="small muted">Bạn có thể giúp bạn khác những môn này.</p><ul class="tags">${nutTag(manh, 'manh')}</ul></div>` +
    `<div><h2>🌱 Cần cải thiện</h2><p class="small muted">Tìm bạn giỏi những môn này để học cùng.</p><ul class="tags">${nutTag(yeu, 'yeu')}</ul></div>` +
    `</div>` +
    `<div class="row kq-nut">` +
    `<a class="btn btn-primary" href="tim-ban.html"><i class="fas fa-user-group" aria-hidden="true"></i> Tìm bạn học bù trừ</a>` +
    `<button class="btn btn-secondary" id="kq-lam-lai"><i class="fas fa-rotate-right" aria-hidden="true"></i> Làm lại bài</button>` +
    `<a class="btn btn-ghost" href="index.html">Về trang chủ</a></div></div>` +
    `<section class="card kq-xem-lai" aria-labelledby="xl-tieu-de">` +
    `<h2 id="xl-tieu-de">Xem lại từng câu</h2>` +
    (tong
      ? `<p class="small muted" style="margin-bottom:10px">Bấm vào tên môn để mở. Phương án hiện theo đúng thứ tự lúc bạn làm.</p>` +
        Object.entries(chiTiet).map(([mon, ds]) => {
          const dung = ds.filter((c) => c.chon === timCau(mon, c.id)?.answer).length;
          return `<details><summary>${ten(mon)} <span class="muted small">— đúng ${dung}/${ds.length}</span></summary><ol class="xl-ds">` +
            ds.map((c) => {
              const q = timCau(mon, c.id);
              if (!q) return '<li class="muted small">Câu này đã bị xoá khỏi đề.</li>';
              const thuTu = c.hoanVi || q.options.map((_, i) => i);
              const ok = c.chon === q.answer;
              return `<li class="${ok ? 'dung' : 'sai'}"><p class="xl-de"><span class="xl-dau">${ok ? '✓ Đúng' : '✗ Sai'}</span> ${esc(q.question)}</p><ul class="xl-pa">` +
                thuTu.map((goc, i) => {
                  const lop = goc === q.answer ? 'la-dap-an' : goc === c.chon ? 'ban-chon' : '';
                  const ghiChu = goc === q.answer ? ' <em>(đáp án đúng)</em>' : goc === c.chon ? ' <em>(bạn chọn)</em>' : '';
                  return `<li class="${lop}"><b>${CHU[i]}.</b> ${esc(q.options[goc])}${ghiChu}</li>`;
                }).join('') +
                `</ul><p class="xl-giai"><b>Giải thích:</b> ${esc(q.explanation || '')}</p></li>`;
            }).join('') + `</ol></details>`;
        }).join('')
      : `<div class="empty"><b>Chưa có chi tiết bài làm.</b>Bấm “Làm lại bài” để làm và xem lại từng câu.</div>`) +
    `</section>`;

  $('#kq-lam-lai').addEventListener('click', () => {
    const cs = moCuaSo(
      `<p>Bạn sẽ làm lại cả ${de.subjects.length} môn. Khi nộp, kết quả mới sẽ thay kết quả hiện tại trong hồ sơ. Nếu thoát giữa chừng, hồ sơ vẫn giữ kết quả cũ.</p>` +
      `<div class="row" style="margin-top:16px"><button class="btn btn-primary" id="ll-ok">Làm lại</button><button class="btn btn-secondary" id="ll-huy">Huỷ</button></div>`,
      { tieuDe: 'Làm lại bài kiểm tra?' });
    cs.querySelector('#ll-huy').addEventListener('click', () => cs.close());
    cs.querySelector('#ll-ok').addEventListener('click', () => {
      cs.close();
      const moi = taoBaiMoi();
      ghiTienDo(moi);
      lamBai(moi);
    });
  });
  $('#kq-tieu-de').focus({ preventScroll: true });
  window.scrollTo({ top: 0 });
}

/* ---------- Bắt đầu ---------- */
if (ctx.congKhai.diem && !hopLe(docTienDo())) veKetQua();
else veGioiThieu();
