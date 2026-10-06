/* tao-phong.js — Cửa sổ "Học cùng bạn" (phòng 2 người) và "Học nhóm" (2–8 người), kèm ô nhập mã phòng. */
import { duLieu } from '../data/index.js';
import { moCuaSo, thongBao } from '../tienich.js';
import { PHONG_NHOM_MIN, PHONG_NHOM_MAX } from '../config.js';

const htmlNhapMa =
  `<form class="nhap-ma" novalidate>` +
  `<label class="field"><span>Đã có mã phòng? Nhập 6 kí tự bạn bè gửi</span>` +
  `<input class="input ma-input" name="ma" maxlength="6" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="ABC123" required></label>` +
  `<button class="btn btn-secondary" type="submit">Nhập mã phòng</button></form>` +
  `<p class="error" data-loi role="alert" hidden></p>`;

/** Gắn xử lí cho ô nhập mã phòng. */
function ganNhapMa(cs) {
  const f = cs.querySelector('.nhap-ma');
  const loi = cs.querySelector('[data-loi]');
  f.addEventListener('submit', (e) => {
    e.preventDefault();
    const ma = f.ma.value.trim().toUpperCase();
    if (!/^[A-Z0-9]{6}$/.test(ma)) {
      loi.textContent = 'Mã phòng gồm đúng 6 chữ cái hoặc chữ số, ví dụ ABC123.';
      loi.hidden = false;
      f.ma.focus();
      return;
    }
    location.href = 'phong.html?ma=' + ma;
  });
}

async function taoVaVao(loai, soCho, nut) {
  if (typeof duLieu.taoPhong !== 'function') {
    thongBao('Phòng học đang được xây (giai đoạn 5). Bạn quay lại sau nhé!');
    return;
  }
  nut.disabled = true;
  try {
    const ma = await duLieu.taoPhong({ loai, soCho });
    location.href = 'phong.html?ma=' + ma;
  } catch (e) {
    thongBao('Chưa tạo được phòng: ' + e.message + ' Hãy thử lại.', { loai: 'err' });
    nut.disabled = false;
  }
}

export function moHocDoi() {
  const cs = moCuaSo(
    `<p class="muted" style="margin-bottom:14px">Phòng 2 người: hai bàn cạnh nhau, có trò chuyện, bảng trắng và đồng hồ học chung.</p>` +
    `<div class="lua-chon-phong">` +
    `<a class="btn btn-primary btn-block" href="tim-ban.html"><i class="fas fa-user-group" aria-hidden="true"></i> Chọn bạn bù trừ để mời</a>` +
    `<button type="button" class="btn btn-secondary btn-block" id="tao-doi"><i class="fas fa-door-open" aria-hidden="true"></i> Tạo phòng đôi, tự gửi mã cho bạn</button>` +
    `</div><div class="divider">hoặc</div>` + htmlNhapMa,
    { tieuDe: 'Học cùng bạn' }
  );
  cs.querySelector('#tao-doi').addEventListener('click', (e) => taoVaVao('doi', 2, e.currentTarget));
  ganNhapMa(cs);
}

export function moHocNhom() {
  const cs = moCuaSo(
    `<form id="f-nhom" novalidate>` +
    `<label class="field"><span>Số thành viên (${PHONG_NHOM_MIN}–${PHONG_NHOM_MAX}, tính cả bạn)</span>` +
    `<input class="input" name="so" type="number" inputmode="numeric" min="${PHONG_NHOM_MIN}" max="${PHONG_NHOM_MAX}" value="4" required></label>` +
    `<p class="error" id="nhom-loi" role="alert" hidden></p>` +
    `<button class="btn btn-primary btn-block" type="submit" style="margin-top:10px"><i class="fas fa-door-open" aria-hidden="true"></i> Tạo phòng nhóm</button>` +
    `<p class="small muted" style="margin-top:6px">Phòng có mã 6 kí tự. Gửi mã cho bạn bè để họ vào.</p></form>` +
    `<div class="divider">hoặc</div>` + htmlNhapMa,
    { tieuDe: 'Học nhóm' }
  );
  cs.querySelector('#f-nhom').addEventListener('submit', (e) => {
    e.preventDefault();
    const so = Number(e.currentTarget.so.value);
    const loi = cs.querySelector('#nhom-loi');
    if (!Number.isInteger(so) || so < PHONG_NHOM_MIN || so > PHONG_NHOM_MAX) {
      loi.textContent = `Hãy nhập một số từ ${PHONG_NHOM_MIN} đến ${PHONG_NHOM_MAX}.`;
      loi.hidden = false;
      return;
    }
    taoVaVao('nhom', so, e.currentTarget.querySelector('[type="submit"]'));
  });
  ganNhapMa(cs);
}
