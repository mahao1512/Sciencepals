/*
 * de-bai.js — Thẻ "Đề bài" trong phòng học.
 *  - Chụp đề bằng máy ảnh điện thoại hoặc tải ảnh / PDF (tối đa DE_TOI_DA_TRANG trang).
 *  - Chủ phòng gửi là đề lên ngay; thành viên khác gửi thì chờ chủ phòng duyệt.
 *  - Ai cũng thấy cùng một đề, mỗi người tự lật trang và phóng to / thu nhỏ.
 */
import { duLieu } from '../data/index.js';
import { esc, thongBao, moCuaSo } from '../tienich.js';
import { DE_TOI_DA_TRANG } from '../config.js';
import { xuLiFile, xoayTrang } from './xu-li-de.js';

const $ = (s) => document.querySelector(s);
const tenGon = (s) => String(s || '').replace(/\.[^.]+$/, '').slice(0, 80) || 'Đề bài';

/**
 * opts: { ma, ctx, laChu() → bool, dangXem() → bool (thẻ Đề bài đang mở / màn rộng) }
 * Trả về { khiMoThe() } để xoá chấm "mới" khi người dùng mở thẻ.
 */
export function ganDeBai({ ma, ctx, laChu, dangXem }) {
  const toiDaByte = duLieu.kichThuocAnhDe || 200 * 1000;
  let de = null;
  let deCho = {};
  let trangXem = 0;
  let phongTo = 1;
  let lanDau = true;
  const daBaoCho = new Set();
  const thongBaoCho = new Map(); // khoá đề chờ → phần tử thông báo
  let cuaSoDuyet = null;         // { cs, khoa }

  /* ---------- Chọn file → soạn đề ---------- */
  let soan = null; // { cs, ten, trang }
  const xuLi = $('#de-xu-li');

  async function nhanFile(files, tenMacDinh) {
    if (!files.length) return;
    const daCo = soan ? soan.trang.length : 0;
    if (daCo >= DE_TOI_DA_TRANG) return thongBao(`Mỗi đề tối đa ${DE_TOI_DA_TRANG} trang.`, { loai: 'err' });
    try {
      const kq = await xuLiFile(files, { toiDaByte, daCo, baoTienDo: (t) => { xuLi.textContent = t; } });
      xuLi.textContent = '';
      if (kq.boBot) thongBao(`Đề tối đa ${DE_TOI_DA_TRANG} trang nên một số trang cuối đã được bỏ bớt.`);
      if (!kq.trang.length) return;
      if (soan) {
        soan.trang.push(...kq.trang);
        veSoan();
      } else moSoan(tenMacDinh || tenGon(files[0].name), kq.trang);
    } catch (e) {
      xuLi.textContent = '';
      thongBao(esc(e.message), { loai: 'err' });
    }
  }
  const oChup = $('#de-chup');
  const oTai = $('#de-tai');
  $('#de-nut-chup').addEventListener('click', () => oChup.click());
  $('#de-nut-tai').addEventListener('click', () => oTai.click());
  oChup.addEventListener('change', () => { const f = [...oChup.files]; oChup.value = ''; nhanFile(f, 'Ảnh chụp đề'); });
  oTai.addEventListener('change', () => { const f = [...oTai.files]; oTai.value = ''; nhanFile(f); });

  function moSoan(ten, trang) {
    const cs = moCuaSo('<div id="soan-de"></div>', { tieuDe: 'Chuẩn bị đề', khiDong: () => { soan = null; } });
    soan = { cs, ten, trang };
    veSoan();
  }
  function veSoan() {
    const { cs, trang } = soan;
    const chu = laChu();
    cs.querySelector('#soan-de').innerHTML =
      `<label class="field"><span>Tên đề</span><input class="input" id="soan-ten" maxlength="80" value="${esc(soan.ten)}"></label>` +
      `<p class="small muted" style="margin:8px 0">${trang.length}/${DE_TOI_DA_TRANG} trang. Xoay trang bị ngược, xoá trang chụp hỏng trước khi gửi.</p>` +
      `<ol class="soan-ds">` + trang.map((t, i) =>
        `<li><img src="${t}" alt="Trang ${i + 1}"><div class="soan-nut">` +
        `<span>Trang ${i + 1}</span>` +
        `<button type="button" class="opt" data-xoay="${i}" aria-label="Xoay trang ${i + 1}"><i class="fas fa-rotate-right" aria-hidden="true"></i></button>` +
        `<button type="button" class="opt" data-xoa="${i}" aria-label="Xoá trang ${i + 1}"><i class="fas fa-trash-can" aria-hidden="true"></i></button>` +
        `</div></li>`).join('') + `</ol>` +
      (trang.length < DE_TOI_DA_TRANG
        ? `<div class="row" style="margin-top:10px"><button type="button" class="btn btn-secondary" id="soan-chup"><i class="fas fa-camera" aria-hidden="true"></i> Chụp thêm trang</button>` +
          `<button type="button" class="btn btn-secondary" id="soan-tai"><i class="fas fa-plus" aria-hidden="true"></i> Thêm ảnh / PDF</button></div>`
        : '') +
      `<p class="small muted" style="margin-top:12px">${chu ? 'Bạn là chủ phòng: đề sẽ hiện ngay cho cả phòng.' : 'Đề sẽ được gửi tới chủ phòng duyệt trước khi hiện cho cả phòng.'}</p>` +
      `<div class="row" style="margin-top:10px"><button type="button" class="btn btn-primary" id="soan-gui"${trang.length ? '' : ' disabled'}>` +
      `<i class="fas fa-paper-plane" aria-hidden="true"></i> ${chu ? 'Đưa lên phòng' : 'Gửi chủ phòng duyệt'}</button>` +
      `<button type="button" class="btn btn-secondary" id="soan-huy">Huỷ</button></div>`;
    const q = (s) => cs.querySelector(s);
    q('#soan-ten').addEventListener('input', (e) => { soan.ten = e.target.value; });
    q('#soan-chup')?.addEventListener('click', () => oChup.click());
    q('#soan-tai')?.addEventListener('click', () => oTai.click());
    q('#soan-huy').addEventListener('click', () => cs.close());
    cs.querySelectorAll('[data-xoa]').forEach((b) => b.addEventListener('click', () => { soan.trang.splice(Number(b.dataset.xoa), 1); veSoan(); }));
    cs.querySelectorAll('[data-xoay]').forEach((b) => b.addEventListener('click', async () => {
      const i = Number(b.dataset.xoay);
      b.disabled = true;
      soan.trang[i] = await xoayTrang(soan.trang[i], toiDaByte).catch(() => soan.trang[i]);
      veSoan();
    }));
    q('#soan-gui').addEventListener('click', async (e) => {
      e.currentTarget.disabled = true;
      try {
        const kq = await duLieu.guiDe(ma, { tenFile: tenGon(soan.ten), trang: soan.trang });
        cs.close();
        thongBao(kq === 'da-dua-len' ? '📄 Đề đã lên phòng. Mọi người mở thẻ “Đề bài” để cùng làm.' : 'Đã gửi đề. Chờ chủ phòng duyệt nhé!', { loai: 'ok' });
      } catch (err) {
        e.currentTarget.disabled = false;
        thongBao(esc(err.message), { loai: 'err' });
      }
    });
  }

  /* ---------- Đề chờ duyệt ---------- */
  function veDuyet() {
    const el = $('#de-duyet');
    const ds = Object.entries(deCho);
    if (laChu()) {
      const cho = ds.filter(([, x]) => x.trangThai === 'cho');
      el.innerHTML = cho.map(([uid, x]) =>
        `<div class="de-cho"><span>📨 <b>${esc(x.ten)}</b> muốn đưa đề “${esc(x.tenFile)}” (${x.soTrang} trang) lên phòng.</span>` +
        `<button type="button" class="btn btn-primary btn-nho" data-xem-duyet="${uid}">Xem và duyệt</button></div>`).join('');
      el.querySelectorAll('[data-xem-duyet]').forEach((b) => b.addEventListener('click', () => moDuyet(b.dataset.xemDuyet)));
      // Báo một lần cho mỗi đề mới gửi tới; đề đã xử lí xong thì gỡ thông báo và cửa sổ duyệt
      const conCho = new Set(cho.map(([uid, x]) => uid + ':' + x.luc));
      cho.forEach(([uid, x]) => {
        const khoa = uid + ':' + x.luc;
        if (daBaoCho.has(khoa)) return;
        daBaoCho.add(khoa);
        thongBaoCho.set(khoa, thongBao(`📨 ${esc(x.ten)} gửi đề “${esc(x.tenFile)}” và chờ bạn duyệt.`, {
          nut: [{ chu: 'Xem và duyệt', kieu: 'btn-primary', bam: () => moDuyet(uid) }, { chu: 'Để sau' }]
        }));
      });
      thongBaoCho.forEach((t, khoa) => { if (!conCho.has(khoa)) { t.remove(); thongBaoCho.delete(khoa); } });
      if (cuaSoDuyet && !conCho.has(cuaSoDuyet.khoa)) { cuaSoDuyet.cs.close(); cuaSoDuyet = null; }
      return;
    }
    const cuaToi = deCho[ctx.uid];
    if (!cuaToi) { el.innerHTML = ''; return; }
    if (cuaToi.trangThai === 'tuchoi') {
      if (daBaoCho.has('tuchoi:' + cuaToi.luc)) return;
      daBaoCho.add('tuchoi:' + cuaToi.luc);
      thongBao(`Chủ phòng chưa duyệt đề “${esc(cuaToi.tenFile)}”. Bạn có thể nhắn trong phần trò chuyện để hỏi thêm.`);
      duLieu.huyDeCho(ma).catch(() => {});
      el.innerHTML = '';
      return;
    }
    el.innerHTML = `<div class="de-cho"><span>⏳ Đề “${esc(cuaToi.tenFile)}” (${cuaToi.soTrang} trang) đang chờ chủ phòng duyệt.</span>` +
      `<button type="button" class="btn btn-secondary btn-nho" id="de-huy-cho">Huỷ gửi</button></div>`;
    $('#de-huy-cho').addEventListener('click', () => duLieu.huyDeCho(ma));
  }

  function moDuyet(uid) {
    const x = deCho[uid];
    if (!x || x.trangThai !== 'cho') return thongBao('Đề này không còn chờ duyệt nữa.');
    cuaSoDuyet?.cs.close();
    const cs = moCuaSo(
      `<p>Đề “<b>${esc(x.tenFile)}</b>” của <b>${esc(x.ten)}</b>, ${x.soTrang} trang. Duyệt thì đề này thay đề hiện tại của phòng.</p>` +
      `<div class="duyet-ds">${x.trang.map((t, i) => `<img src="${t}" alt="Trang ${i + 1} của đề chờ duyệt">`).join('')}</div>` +
      `<div class="row" style="margin-top:14px"><button class="btn btn-primary" id="dd-ok">Duyệt, đưa lên phòng</button>` +
      `<button class="btn btn-secondary" id="dd-khong">Không duyệt</button></div>`,
      { tieuDe: 'Duyệt đề', khiDong: () => { if (cuaSoDuyet?.cs === cs) cuaSoDuyet = null; } });
    cuaSoDuyet = { cs, khoa: uid + ':' + x.luc };
    const lam = async (dongY) => {
      try {
        await duLieu.duyetDe(ma, uid, dongY);
        cs.close();
        thongBao(dongY ? 'Đã đưa đề lên phòng.' : `Đã báo ${esc(x.ten)} là đề chưa được duyệt.`, { loai: dongY ? 'ok' : '' });
      } catch (e) { thongBao(esc(e.message), { loai: 'err' }); }
    };
    cs.querySelector('#dd-ok').addEventListener('click', () => lam(true));
    cs.querySelector('#dd-khong').addEventListener('click', () => lam(false));
  }

  /* ---------- Xem đề ---------- */
  function veXem() {
    const el = $('#de-xem');
    if (!de) {
      el.innerHTML = `<div class="empty"><b>Chưa có đề nào trong phòng.</b>` +
        `Bấm “Chụp đề” để chụp đề giấy bằng điện thoại, hoặc “Tải ảnh / PDF”. ` +
        (laChu() ? 'Bạn là chủ phòng nên đề sẽ hiện ngay cho cả phòng.' : 'Đề của bạn sẽ được gửi tới chủ phòng duyệt.') + `</div>`;
      return;
    }
    trangXem = Math.min(trangXem, de.trang.length - 1);
    const n = de.trang.length;
    el.innerHTML =
      `<p class="de-tt"><b>${esc(de.tenFile)}</b> <span class="muted small">· ${n} trang · gửi bởi ${esc(de.ten)}</span>` +
      (laChu() ? ` <button type="button" class="btn btn-ghost btn-nho" id="de-go"><i class="fas fa-xmark" aria-hidden="true"></i> Gỡ đề</button>` : '') + `</p>` +
      `<div class="de-thanh" role="toolbar" aria-label="Điều khiển xem đề">` +
      `<div class="row"><button type="button" class="opt" id="de-truoc" aria-label="Trang trước"${trangXem === 0 ? ' disabled' : ''}><i class="fas fa-chevron-left" aria-hidden="true"></i></button>` +
      `<span class="de-so" aria-live="polite">Trang ${trangXem + 1}/${n}</span>` +
      `<button type="button" class="opt" id="de-sau" aria-label="Trang sau"${trangXem === n - 1 ? ' disabled' : ''}><i class="fas fa-chevron-right" aria-hidden="true"></i></button></div>` +
      `<div class="row"><button type="button" class="opt" id="de-nho" aria-label="Thu nhỏ"${phongTo <= 1 ? ' disabled' : ''}><i class="fas fa-magnifying-glass-minus" aria-hidden="true"></i></button>` +
      `<span class="de-so">${Math.round(phongTo * 100)}%</span>` +
      `<button type="button" class="opt" id="de-to" aria-label="Phóng to"${phongTo >= 3 ? ' disabled' : ''}><i class="fas fa-magnifying-glass-plus" aria-hidden="true"></i></button>` +
      `<button type="button" class="opt" id="de-vua">Vừa khung</button></div></div>` +
      `<div class="de-khung" tabindex="0" aria-label="Khung xem đề, dùng phím mũi tên để cuộn">` +
      `<img src="${de.trang[trangXem]}" style="width:${phongTo * 100}%" alt="${esc(de.tenFile)}, trang ${trangXem + 1} trên ${n}"></div>`;
    const lat = (d) => { trangXem = Math.max(0, Math.min(n - 1, trangXem + d)); veXem(); el.querySelector('.de-khung').scrollTop = 0; };
    $('#de-truoc').addEventListener('click', () => lat(-1));
    $('#de-sau').addEventListener('click', () => lat(1));
    $('#de-nho').addEventListener('click', () => { phongTo = Math.max(1, phongTo - 0.5); veXem(); });
    $('#de-to').addEventListener('click', () => { phongTo = Math.min(3, phongTo + 0.5); veXem(); });
    $('#de-vua').addEventListener('click', () => { phongTo = 1; veXem(); });
    $('#de-go')?.addEventListener('click', () => {
      const cs = moCuaSo(`<p>Gỡ đề “${esc(de.tenFile)}” khỏi phòng? Mọi người sẽ không xem được đề này nữa.</p>` +
        `<div class="row" style="margin-top:14px"><button class="btn btn-danger" id="go-ok">Gỡ đề</button><button class="btn btn-secondary" id="go-huy">Huỷ</button></div>`, { tieuDe: 'Gỡ đề' });
      cs.querySelector('#go-huy').addEventListener('click', () => cs.close());
      cs.querySelector('#go-ok').addEventListener('click', async () => {
        try { await duLieu.goDe(ma); cs.close(); } catch (e) { thongBao(esc(e.message), { loai: 'err' }); }
      });
    });
  }

  /* ---------- Theo dõi ---------- */
  let lucDeCu; // undefined để lần đầu luôn vẽ (kể cả khi chưa có đề)
  let chuCu = laChu();
  duLieu.theoDoiDe(ma, (kq) => {
    const lucMoi = kq.de?.luc ?? null;
    if (lucMoi !== lucDeCu) {
      if (!lanDau && kq.de) {
        trangXem = 0;
        phongTo = 1;
        thongBao(`📄 Đề mới “${esc(kq.de.tenFile)}” (${kq.de.soTrang} trang) đã lên phòng. Mở thẻ “Đề bài” để cùng làm.`, { loai: 'ok' });
        if (!dangXem()) $('#p-de-moi').hidden = false;
      }
      lucDeCu = lucMoi;
      de = kq.de;
      veXem();
    }
    deCho = kq.deCho || {};
    veDuyet();
    lanDau = false;
  });

  return {
    khiMoThe() { $('#p-de-moi').hidden = true; },
    /** Gọi khi dữ liệu phòng đổi: chủ phòng đổi người thì vẽ lại chữ và nút. */
    capNhatChu() {
      if (laChu() === chuCu) return;
      chuCu = laChu();
      veXem();
      veDuyet();
    }
  };
}
