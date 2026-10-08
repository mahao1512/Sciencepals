/*
 * tim-id.js — Khối "ID của bạn" + "Tìm bạn bằng ID" (dùng ở trang Bạn bè và Tìm bạn học).
 * Mỗi tài khoản có một ID 8 kí tự (hiển thị ABCD-EFGH). Gõ ID của bạn mình để kết bạn ngay.
 */
import { duLieu } from '../data/index.js';
import { esc, thongBao, hienId, chuanId } from '../tienich.js';
import { anhDau } from '../khung.js';
import { htmlNutKetBan } from '../ban-be-chung.js';

const TEN_MON = { toan: 'Toán', ly: 'Vật lí', hoa: 'Hoá học', sinh: 'Sinh học', su: 'Lịch sử', dia: 'Địa lí', anh: 'Tiếng Anh' };

export function ganTimTheoId(el, ctx) {
  const ma = ctx.congKhai.maId;
  el.innerHTML =
    `<div class="tid">` +
    (ma ? `<p class="tid-cua-toi">ID của bạn: <b class="ma-id">${hienId(ma)}</b> ` +
      `<button type="button" class="btn btn-ghost btn-nho" id="tid-chep" aria-label="Sao chép ID của bạn"><i class="fas fa-copy" aria-hidden="true"></i> Sao chép</button></p>` : '') +
    `<form class="tid-form" novalidate><label class="sr-only" for="tid-o">Nhập ID của bạn muốn tìm</label>` +
    `<input class="input" id="tid-o" maxlength="12" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="Tìm bạn bằng ID, ví dụ ABCD-EFGH">` +
    `<button class="btn btn-primary" type="submit"><i class="fas fa-magnifying-glass" aria-hidden="true"></i> Tìm</button></form>` +
    `<div class="tid-kq" aria-live="polite"></div></div>`;

  el.querySelector('#tid-chep')?.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(hienId(ma)); thongBao(`Đã chép ID ${hienId(ma)}. Gửi cho bạn bè để họ tìm bạn nhé!`, { loai: 'ok' }); }
    catch (e) { thongBao(`ID của bạn là <b>${hienId(ma)}</b>.`); }
  });

  const kq = el.querySelector('.tid-kq');
  let banTimDuoc = null;
  const ve = () => {
    const b = banTimDuoc;
    if (!b) return;
    const tt = ctx.banBe?.trangThai(b.uid);
    const manh = (b.manh || []).length ? `Mạnh: ${b.manh.map((m) => esc(TEN_MON[m] || m)).join(', ')}` : 'Chưa làm bài kiểm tra';
    kq.innerHTML = `<div class="tid-the"><span class="tid-hinh" aria-hidden="true">${b.nhanVat ? anhDau(b.nhanVat) : ''}</span>` +
      `<span class="tid-chu"><b>${esc(b.ten || 'Bạn học')}</b><small>ID ${hienId(b.maId)} · ${manh}</small></span>` +
      `<span class="tid-nut">${htmlNutKetBan(tt, b.uid, { nho: true })}</span></div>`;
  };
  ctx.banBe?.nghe(() => ve());

  el.querySelector('.tid-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = chuanId(el.querySelector('#tid-o').value);
    banTimDuoc = null;
    if (id.length !== 8) { kq.innerHTML = `<p class="error">ID gồm 8 chữ cái hoặc chữ số, ví dụ ABCD-EFGH.</p>`; return; }
    if (id === ma) { kq.innerHTML = `<p class="muted small">Đây là ID của chính bạn 😊 Hãy gửi nó cho bạn bè nhé.</p>`; return; }
    kq.innerHTML = `<p class="muted small">Đang tìm…</p>`;
    try {
      const b = await duLieu.timTheoId(id);
      if (!b) { kq.innerHTML = `<p class="muted small">Không tìm thấy ai có ID <b>${hienId(id)}</b>. Kiểm tra lại từng kí tự giúp mình nhé.</p>`; return; }
      banTimDuoc = b;
      ve();
    } catch (err) {
      kq.innerHTML = `<p class="error">Chưa tìm được: ${esc(err.message)}. Thử lại sau nhé.</p>`;
    }
  });

  kq.addEventListener('click', async (e) => {
    const nut = e.target.closest('[data-ket-ban]');
    if (!nut) return;
    nut.disabled = true;
    try {
      const r = await ctx.banBe.ketBan(nut.dataset.ketBan);
      thongBao(r === 'ban' ? 'Hai bạn đã là bạn bè!' : 'Đã gửi lời mời kết bạn.', { loai: 'ok' });
    } catch (err) { nut.disabled = false; thongBao(esc(err.message), { loai: 'err' }); }
  });
}
