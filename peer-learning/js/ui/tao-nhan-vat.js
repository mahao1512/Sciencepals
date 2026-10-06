/*
 * tao-nhan-vat.js — Màn hình tạo / sửa nhân vật, hình xem trước đổi ngay khi chọn.
 * Dùng cho lần đăng nhập đầu và mục "Nhân vật của tôi".
 */
import { esc } from '../tienich.js';

const O = () => PeerAssets.CHARACTER_OPTIONS;

/** Một nhóm ô radio dạng nút tròn. `muc`: [{ id, name, khoa, gia, mau }] */
function nhomChon(ten, nhan, muc, dangChon, { swatch = false } = {}) {
  return (
    `<fieldset><legend>${nhan}</legend><div class="opts">` +
    muc.map((m) => {
      const khoa = m.khoa ? ' disabled' : '';
      const nhanKhoa = m.khoa ? `<span class="sr-only"> (khoá — mở trong cửa hàng với ${m.gia} điểm)</span>` : '';
      if (swatch) {
        return `<label class="opt swatch${m.khoa ? ' locked' : ''}" style="--sw:${m.mau}" title="${esc(m.name)}${m.khoa ? ' — ' + m.gia + ' điểm' : ''}">` +
          `<input type="radio" name="${ten}" value="${m.id}"${m.id === dangChon ? ' checked' : ''}${khoa}><span class="sr-only">${esc(m.name)}</span>${nhanKhoa}</label>`;
      }
      return `<label class="opt"><input type="radio" name="${ten}" value="${m.id}"${m.id === dangChon ? ' checked' : ''}${khoa}>` +
        `${esc(m.name)}${m.khoa ? ` <span class="gia" aria-hidden="true">🔒 ${m.gia}</span>` : ''}${nhanKhoa}</label>`;
    }).join('') +
    `</div></fieldset>`
  );
}

/**
 * Vẽ bộ tạo nhân vật vào phần tử `el`.
 * opts: { ten, nhanVat, soHuu, chuNut, khiLuu({ ten, nhanVat }) }
 */
export function veTaoNhanVat(el, opts) {
  const soHuu = opts.soHuu || { mauToc: [], phuKien: ['khong'] };
  let nv = PeerAssets.normalizeCharacter(opts.nhanVat || PeerAssets.DEFAULT_CHARACTER.female);

  const ve = () => {
    const o = O();
    const mauToc = o.hairColors.map((c) => ({
      ...c, mau: c.hex, gia: c.unlockPrice || 0,
      khoa: Boolean(c.unlockPrice) && !(soHuu.mauToc || []).includes(c.id)
    }));
    const phuKien = o.accessories.map((a) => ({
      ...a, gia: a.price || 0, khoa: Boolean(a.price) && !(soHuu.phuKien || []).includes(a.id)
    }));
    el.innerHTML =
      `<form class="maker" novalidate>` +
      `<div class="stage" aria-live="polite">${PeerAssets.renderCharacter(nv)}</div>` +
      `<div class="controls">` +
      `<label class="field" style="margin-bottom:14px"><span>Tên hiển thị (bạn bè sẽ thấy tên này)</span>` +
      `<input class="input" name="ten" maxlength="24" autocomplete="nickname" required value="${esc(opts.ten || '')}" placeholder="Ví dụ: Minh Anh"></label>` +
      nhomChon('gender', 'Giới tính', o.genders, nv.gender) +
      `<h3 class="nv-nhom">💇 Tóc và da</h3>` +
      nhomChon('hair', 'Kiểu tóc', o.hair[nv.gender], nv.hair) +
      nhomChon('hairColor', 'Màu tóc', mauToc, nv.hairColor, { swatch: true }) +
      nhomChon('skin', 'Màu da', o.skinTones.map((s) => ({ ...s, mau: s.base })), nv.skin, { swatch: true }) +
      `<h3 class="nv-nhom">🙂 Gương mặt</h3>` +
      nhomChon('eyes', 'Kiểu mắt', o.eyes, nv.eyes) +
      nhomChon('brows', 'Lông mày', o.brows, nv.brows) +
      nhomChon('mark', 'Chi tiết trên mặt', o.marks, nv.mark) +
      nhomChon('expression', 'Biểu cảm (đổi được trong phòng học)', o.expressions, nv.expression) +
      `<h3 class="nv-nhom">🎀 Phụ kiện</h3>` +
      nhomChon('accessory', 'Phụ kiện', phuKien, nv.accessory) +
      `<p class="small muted" style="margin:-6px 0 12px">Món có 🔒 mở khoá trong Cửa hàng bằng điểm chăm chỉ.</p>` +
      `<p class="error" id="nv-loi" role="alert" hidden></p>` +
      `<button class="btn btn-primary btn-block" type="submit">${esc(opts.chuNut || 'Lưu nhân vật')}</button>` +
      `</div></form>`;

    const form = el.querySelector('form');
    form.addEventListener('change', (e) => {
      const t = e.target;
      if (t.type !== 'radio') return;
      nv = PeerAssets.normalizeCharacter({ ...nv, [t.name]: t.value });
      if (t.name === 'gender') {
        // Đổi giới tính thì vẽ lại cả form để danh sách kiểu tóc đúng giới tính
        const ten = form.ten.value;
        opts.ten = ten;
        ve();
        el.querySelector(`input[name="gender"][value="${nv.gender}"]`).focus();
        return;
      }
      el.querySelector('.stage').innerHTML = PeerAssets.renderCharacter(nv);
    });
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const loi = el.querySelector('#nv-loi');
      const ten = form.ten.value.trim().replace(/\s+/g, ' ');
      if (ten.length < 2) {
        loi.textContent = 'Tên hiển thị cần ít nhất 2 kí tự.';
        loi.hidden = false;
        form.ten.focus();
        return;
      }
      loi.hidden = true;
      const nut = form.querySelector('[type="submit"]');
      nut.disabled = true;
      try {
        await opts.khiLuu({ ten, nhanVat: nv });
      } catch (err) {
        loi.textContent = 'Chưa lưu được: ' + err.message + ' Hãy thử lại.';
        loi.hidden = false;
      } finally {
        nut.disabled = false;
      }
    });
  };
  ve();
}
