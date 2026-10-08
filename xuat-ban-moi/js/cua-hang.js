/*
 * cua-hang.js — Ba quầy: bàn học, phụ kiện nhân vật, màu tóc đặc biệt.
 * Món chưa mua hiện giá; đủ điểm thì mua được; mua rồi thì chọn dùng.
 */
import { duLieu } from './data/index.js';
import { esc, thongBao, moCuaSo } from './tienich.js';
import { khoiTaoTrang, capNhatDauTrang } from './khung.js';
import { danhMuc, daCo, muaDo } from './diem.js';
import { PHUT_MOI_LAN_THUONG, DIEM_MOI_LAN_THUONG } from './config.js';

const $ = (s) => document.querySelector(s);
const ctx = await khoiTaoTrang();
const DM = danhMuc();
$('#ch-mo-ta').textContent += ` Cứ học đủ ${PHUT_MOI_LAN_THUONG} phút trong phòng học (đồng hồ phòng đang chạy) là được ${DIEM_MOI_LAN_THUONG} ⭐.`;

/** Quầy nào đổi trường nào: của nhân vật (TRUONG_NV) hoặc của hồ sơ (TRUONG_HS: bàn, tường, kệ). */
const TRUONG_NV = { ao: 'ao', phuKien: 'accessory', mauToc: 'hairColor' };
const TRUONG_HS = { ban: 'go-soi', tuong: 'xanh-nhat', ke: 'go-nau' }; // giá trị mặc định
const QUAY = ['ban', 'tuong', 'ke', 'ao', 'phuKien', 'mauToc'];
// Sách mẫu để xem trước kiểu kệ
const SACH_MAU = [
  { id: 'a', name: 'Toán', color: '#e2504c', href: '#' }, { id: 'b', name: 'Lí', color: '#4f8fd8', href: '#' },
  { id: 'c', name: 'Hoá', color: '#33b39a', href: '#' }, { id: 'd', name: 'Sinh', color: '#6bbf59', href: '#' },
  { id: 'e', name: 'Sử', color: '#b0683a', href: '#' }, { id: 'f', name: 'Địa', color: '#f2a93b', href: '#' },
  { id: 'g', name: 'Anh', color: '#8a6fe0', href: '#' }
];

/** Món đang dùng của từng quầy. */
const dangDung = (quay) =>
  quay in TRUONG_HS ? ctx.congKhai[quay] || TRUONG_HS[quay] : PeerAssets.normalizeCharacter(ctx.congKhai.nhanVat)[TRUONG_NV[quay]];

/** Hình xem trước của một món. */
function hinh(quay, mon) {
  if (quay === 'ban') return PeerAssets.renderDesk(mon.id);
  if (quay === 'tuong') return `<div class="ch-tuong" style="background:${PeerAssets.wallBackground(mon.id)}" role="img" aria-label="Tường ${esc(mon.ten)}"></div>`;
  if (quay === 'ke') return PeerAssets.renderBookshelf(SACH_MAU, mon.id).replace(/<a [^>]*>/g, '<g>').replace(/<\/a>/g, '</g>');
  const nv = { ...ctx.congKhai.nhanVat, [TRUONG_NV[quay]]: mon.id };
  // Áo: cắt lấy phần thân; phụ kiện / màu tóc: cắt lấy nửa trên
  const khung = quay === 'ao' ? 'viewBox="28 92 144 156"' : 'viewBox="10 4 180 190"';
  return PeerAssets.renderCharacter(nv).replace('viewBox="0 0 200 320"', khung);
}

/** Lớp khung xem trước theo quầy. */
const lopHinh = (quay) => ({ ban: '', tuong: 'tuong', ke: 'ke' }[quay] ?? 'nv');
const LOI_MUA = {
  ban: 'Bàn mới đã xuất hiện ở trang chủ và trong mọi phòng học.',
  tuong: 'Phòng học ở trang chủ đã đổi tường. Khi làm chủ phòng chung, bạn cũng dùng được tường này.',
  ke: 'Tủ sách ở trang chủ đã đổi kiểu. Khi làm chủ phòng chung, bạn cũng dùng được kệ này.'
};

function veQuay(quay) {
  const diem = ctx.rieng.diemChamChi || 0;
  const el = $('#q-' + quay);
  el.innerHTML = `<ul class="ch-luoi ${quay}">` + DM[quay].map((mon) => {
    const co = daCo(ctx.rieng, quay, mon);
    const dung = dangDung(quay) === mon.id;
    let nut;
    if (dung) {
      nut = quay === 'phuKien'
        ? `<button class="btn btn-secondary" data-act="thao" data-id="${mon.id}">Tháo ra</button>`
        : `<span class="ch-dang-dung"><i class="fas fa-check" aria-hidden="true"></i> Đang dùng</span>`;
    } else if (co) {
      nut = `<button class="btn btn-primary" data-act="dung" data-id="${mon.id}">Dùng</button>`;
    } else if (diem >= mon.gia) {
      nut = `<button class="btn btn-primary" data-act="mua" data-id="${mon.id}">Mua · ${mon.gia} ⭐</button>`;
    } else {
      nut = `<button class="btn btn-secondary" disabled aria-disabled="true">🔒 ${mon.gia} ⭐</button>` +
        `<small class="ch-thieu">Cần thêm ${mon.gia - diem} điểm</small>`;
    }
    return `<li class="card ch-mon${dung ? ' dang-dung' : ''}">` +
      `<div class="ch-hinh ${lopHinh(quay)}">${hinh(quay, mon)}</div>` +
      `<h3>${esc(mon.ten)}</h3>` +
      (mon.ghiChu ? `<p class="small muted">${esc(mon.ghiChu)}</p>` : '') +
      `<p class="ch-gia">${mon.gia === 0 ? 'Miễn phí' : co ? 'Đã có' : mon.gia + ' ⭐'}</p>` +
      `<div class="ch-nut">${nut}</div></li>`;
  }).join('') + `</ul>` +
  (quay === 'mauToc' ? `<p class="small muted ch-ghi">Muốn quay lại màu tóc thường? Mở “Nhân vật của tôi” từ nút nhân vật trên đầu trang.</p>` : '');
}
const veTatCa = () => { QUAY.forEach(veQuay); $('#ch-diem').textContent = ctx.rieng.diemChamChi || 0; };

/** Dùng một món đã có. */
async function dung(quay, id) {
  if (quay in TRUONG_HS) ctx.congKhai = await duLieu.luuCongKhai({ [quay]: id });
  else {
    const nv = { ...ctx.congKhai.nhanVat, [TRUONG_NV[quay]]: id };
    ctx.congKhai = await duLieu.luuCongKhai({ nhanVat: nv });
  }
  capNhatDauTrang(ctx);
}

document.querySelector('main').addEventListener('click', async (e) => {
  const b = e.target.closest('[data-act]');
  if (!b) return;
  const quay = b.closest('.ch-quay').id.slice(2);
  const mon = DM[quay].find((m) => m.id === b.dataset.id);
  try {
    if (b.dataset.act === 'dung') {
      await dung(quay, mon.id);
      thongBao(`Đã dùng ${esc(mon.ten)}.`, { loai: 'ok' });
    } else if (b.dataset.act === 'thao') {
      await dung(quay, 'khong');
      thongBao(`Đã tháo ${esc(mon.ten)}.`);
    } else if (b.dataset.act === 'mua') {
      const cs = moCuaSo(
        `<div class="ch-xac-nhan"><div class="ch-hinh ${lopHinh(quay)}">${hinh(quay, mon)}</div>` +
        `<p>Mua <b>${esc(mon.ten)}</b> với <b>${mon.gia} ⭐</b>? Bạn còn lại ${ctx.rieng.diemChamChi - mon.gia} điểm.</p></div>` +
        `<div class="row" style="margin-top:14px"><button class="btn btn-primary" id="m-ok">Mua và dùng luôn</button><button class="btn btn-secondary" id="m-huy">Để sau</button></div>`,
        { tieuDe: 'Xác nhận mua' });
      cs.querySelector('#m-huy').addEventListener('click', () => cs.close());
      cs.querySelector('#m-ok').addEventListener('click', async () => {
        try {
          ctx.rieng = await muaDo(quay, mon);
          await dung(quay, mon.id);
          cs.close();
          thongBao(`🎉 Đã mua ${esc(mon.ten)}! ${LOI_MUA[quay] || 'Nhân vật của bạn đã đổi diện mạo.'}`, { loai: 'ok' });
          veTatCa();
        } catch (err) {
          cs.close();
          thongBao(esc(err.message), { loai: 'err' });
        }
      });
      return;
    }
    veTatCa();
  } catch (err) {
    thongBao('Chưa làm được: ' + esc(err.message) + ' Hãy thử lại.', { loai: 'err' });
  }
});

/* Thẻ quầy */
const tabs = [...document.querySelectorAll('.ch-tabs [role="tab"]')];
function chon(t) {
  tabs.forEach((x) => {
    const c = x === t;
    x.setAttribute('aria-selected', String(c));
    x.tabIndex = c ? 0 : -1;
    document.getElementById(x.getAttribute('aria-controls')).hidden = !c;
  });
}
tabs.forEach((t) => {
  t.addEventListener('click', () => chon(t));
  t.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    const k = tabs[(tabs.indexOf(t) + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
    chon(k);
    k.focus();
  });
});

// Điểm thay đổi ở tab khác (ví dụ vừa nhận thưởng trong phòng)
duLieu.theoDoiRieng((r) => { ctx.rieng = r; veTatCa(); });
// Chế độ thử: plThemDiem(200) để có điểm thử mua đồ
if (duLieu.cheDo === 'local') {
  window.plThemDiem = async (n) => { ctx.rieng = await duLieu.luuRieng({ diemChamChi: (ctx.rieng.diemChamChi || 0) + n }); veTatCa(); capNhatDauTrang(ctx); };
}
veTatCa();
