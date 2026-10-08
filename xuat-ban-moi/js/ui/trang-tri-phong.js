/*
 * trang-tri-phong.js — Trang trí phòng học chung.
 *  - Phòng có một kiểu tường và một tủ sách chung (các môn trong mon-hoc.json, KHÔNG có Sổ tay cảm xúc).
 *  - Chủ phòng chọn tường và kiểu kệ trong số đồ chủ phòng đã có.
 *  - Mỗi người tự đổi bàn mình ngồi, trong số bàn mình đã có.
 *  - Lần đầu chủ phòng vào, phòng lấy luôn tường / kệ đang dùng ở trang chủ của chủ phòng.
 */
import { duLieu } from '../data/index.js';
import { esc, thongBao, moCuaSo } from '../tienich.js';
import { monDaCo } from '../diem.js';
import { layMonHoc } from './phong-cua-toi.js';

const $ = (s) => document.querySelector(s);
const MAC_DINH = { tuong: 'xanh-nhat', ke: 'go-nau' };

export function ganTrangTriPhong({ ma, ctx, laChu }) {
  let phong = null;
  let keDaVe = null;
  let svgKe = '';
  let daDatMacDinh = false;
  let monHoc = [];
  layMonHoc().then((m) => { monHoc = m.slice(0, 9); keDaVe = null; if (phong) capNhat(phong); }).catch(() => {});

  const ganSachSapCo = (vung) => vung.querySelectorAll('.pa-book--sap-co').forEach((b) => b.addEventListener('click', () => {
    thongBao(`Trò chơi môn ${esc(b.querySelector('title').textContent.replace(' (sắp có)', ''))} sắp có. Bạn thử môn khác trước nhé!`);
  }));

  function capNhat(p) {
    phong = p;
    const tuong = p.tuong || MAC_DINH.tuong;
    const ke = p.ke || MAC_DINH.ke;
    $('#p-lop').style.background = PeerAssets.wallBackground(tuong);
    $('#p-trang-tri').hidden = !laChu();
    // Vẽ lại tủ sách khi đổi kiểu kệ
    const khoa = ke + ':' + monHoc.length;
    if (monHoc.length && keDaVe !== khoa) {
      keDaVe = khoa;
      svgKe = PeerAssets.renderBookshelf(monHoc.map((m) => ({ id: m.id, name: m.name, spine: m.spine, color: m.color, href: m.href })), ke);
      $('#p-ke').innerHTML = svgKe;
      ganSachSapCo($('#p-ke'));
    }
    // Chủ phòng vào lần đầu: lấy tường / kệ đang dùng ở trang chủ
    if (laChu() && !p.tuong && !p.ke && !daDatMacDinh) {
      daDatMacDinh = true;
      duLieu.trangTriPhong(ma, { tuong: ctx.congKhai.tuong || MAC_DINH.tuong, ke: ctx.congKhai.ke || MAC_DINH.ke }).catch(() => {});
    }
  }

  /** Hộp chọn một món trong danh sách đã có. */
  function luoiChon(ds, dangChon, veHinh, data) {
    return `<div class="chon-do" role="group">` + ds.map((m) =>
      `<button type="button" data-${data}="${m.id}" aria-pressed="${m.id === dangChon}">${veHinh(m)}<span>${esc(m.ten)}</span></button>`).join('') + `</div>`;
  }

  // Đổi bàn của mình (trong số bàn đã có)
  $('#p-doi-ban').addEventListener('click', () => {
    const toi = phong?.thanhVien?.[ctx.uid];
    const ds = monDaCo(ctx.rieng, 'ban');
    const cs = moCuaSo(
      `<p class="small muted">Chọn bàn bạn muốn ngồi trong phòng này. Muốn có thêm bàn? Ghé <a href="cua-hang.html" target="_blank" rel="noopener">Cửa hàng</a>.</p>` +
      luoiChon(ds, toi?.ban || 'go-soi', (m) => PeerAssets.renderDesk(m.id), 'ban'),
      { tieuDe: 'Đổi bàn của tôi' });
    cs.querySelectorAll('[data-ban]').forEach((b) => b.addEventListener('click', async () => {
      try {
        await duLieu.capNhatToi(ma, { ban: b.dataset.ban });
        cs.close();
        thongBao('Đã đổi bàn. Mọi người trong phòng đều thấy bàn mới của bạn.', { loai: 'ok' });
      } catch (e) { thongBao('Chưa đổi được bàn: ' + esc(e.message), { loai: 'err' }); }
    }));
  });

  // Trang trí phòng (chỉ chủ phòng): tường + kiểu kệ, trong số đồ chủ phòng đã có
  $('#p-trang-tri').addEventListener('click', () => {
    if (!laChu()) return thongBao('Chỉ chủ phòng mới trang trí được phòng.');
    const tuongCo = monDaCo(ctx.rieng, 'tuong');
    const keCo = monDaCo(ctx.rieng, 'ke');
    const sachMau = monHoc.length ? monHoc : [];
    const cs = moCuaSo(
      `<p class="small muted">Bạn là chủ phòng: chọn tường và kệ sách cho cả phòng trong số đồ bạn đã có. Muốn thêm kiểu mới? Ghé <a href="cua-hang.html" target="_blank" rel="noopener">Cửa hàng</a>.</p>` +
      `<h3 class="chon-do-td">Tường</h3>` +
      luoiChon(tuongCo, phong?.tuong || MAC_DINH.tuong, (m) => `<span class="mau-tuong" style="background:${PeerAssets.wallBackground(m.id)}" aria-hidden="true"></span>`, 'tuong') +
      `<h3 class="chon-do-td">Kệ sách</h3>` +
      luoiChon(keCo, phong?.ke || MAC_DINH.ke, (m) => PeerAssets.renderBookshelf(sachMau, m.id).replace('class="pa-bookshelf"', 'class="pa-bookshelf mau-ke"').replace(/<a [^>]*>/g, '<g>').replace(/<\/a>/g, '</g>'), 'ke'),
      { tieuDe: 'Trang trí phòng' });
    const chon = async (phan, nut, nhom) => {
      try {
        await duLieu.trangTriPhong(ma, phan);
        cs.querySelectorAll(`[data-${nhom}]`).forEach((x) => x.setAttribute('aria-pressed', String(x === nut)));
      } catch (e) { thongBao(esc(e.message), { loai: 'err' }); }
    };
    cs.querySelectorAll('[data-tuong]').forEach((b) => b.addEventListener('click', () => chon({ tuong: b.dataset.tuong }, b, 'tuong')));
    cs.querySelectorAll('[data-ke]').forEach((b) => b.addEventListener('click', () => chon({ ke: b.dataset.ke }, b, 'ke')));
  });

  // Điện thoại: tủ sách trong phòng ẩn đi, bấm nút để mở tủ lớn
  $('#p-mo-ke').addEventListener('click', () => {
    if (!svgKe) return thongBao('Tủ sách đang được xếp, bạn thử lại sau giây lát.');
    const cs = moCuaSo(`<p class="small muted" style="margin-bottom:10px">Chạm vào một cuốn sách để mở trò chơi của môn đó ở tab mới.</p><div style="max-width:300px;margin:0 auto">${svgKe}</div>`, { tieuDe: 'Tủ sách của phòng' });
    cs.querySelector('svg').style.cssText = 'width:100%;height:auto;display:block';
    ganSachSapCo(cs);
  });

  return { capNhat };
}
