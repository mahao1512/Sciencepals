/*
 * phong-cua-toi.js — Trang chủ là một phòng học: bàn học bên trái, nhân vật ở giữa, tủ sách bên phải.
 * Bấm bàn → cửa hàng, bấm nhân vật → "Nhân vật của tôi", bấm sách → trò chơi của môn (tab mới).
 */
import { esc, taiJSON, thongBao, moCuaSo } from '../tienich.js';
import { moNhanVatCuaToi, htmlChuoi } from '../khung.js';
import { CHUOI_HIEN_LUA } from '../config.js';

let monHocCache = null;
/** Danh sách môn của tủ sách (data/mon-hoc.json). */
export async function layMonHoc() {
  if (!monHocCache) monHocCache = (await taiJSON('data/mon-hoc.json')).monHoc;
  return monHocCache;
}

function tenBan(id) {
  return (PeerAssets.DESKS.find((d) => d.id === id) || PeerAssets.DESKS[0]).name;
}

export async function veTrangChu(el, ctx) {
  const ck = ctx.congKhai;
  const r = ctx.rieng;
  const chuaKiemTra = !ck.diem;

  el.innerHTML =
    (chuaKiemTra
      ? `<div class="card moi-kiem-tra">` +
        `<div class="mkt-icon" aria-hidden="true">📝</div>` +
        `<div><h2>Làm bài kiểm tra đầu vào</h2>` +
        `<p class="muted small">Chọn 3–7 môn, mỗi môn 10 câu bốc ngẫu nhiên từ ngân hàng câu hỏi. Kết quả cho biết môn mạnh, môn yếu để tìm bạn học bù trừ cho bạn. Có thể dừng giữa chừng và làm tiếp sau.</p></div>` +
        `<a class="btn btn-primary" href="kiem-tra.html">Làm bài ngay</a></div>`
      : '') +
    `<div class="room" id="phong">` +
    `<div class="room-tuong" style="background:${PeerAssets.wallBackground(ck.tuong)}" aria-hidden="true"></div>` +
    `<div class="room-window" aria-hidden="true"></div>` +
    `<div class="hud l"><span class="pill-room${r.chuoi >= CHUOI_HIEN_LUA ? ' co-lua' : ''}" id="hud-chuoi" title="Chuỗi dài nhất: ${r.chuoiDaiNhat} ngày">` +
    `${htmlChuoi(r.chuoi)}<span class="hud-chu" aria-hidden="true"> ngày liên tục</span></span></div>` +
    `<div class="hud r"><a class="pill-room" href="cua-hang.html" title="Điểm chăm chỉ — bấm để mở cửa hàng" aria-label="${r.diemChamChi} điểm chăm chỉ. Mở cửa hàng"><span aria-hidden="true">⭐</span><b>${r.diemChamChi}</b><span class="hud-chu" aria-hidden="true"> điểm chăm chỉ</span></a></div>` +
    `<a class="room-desk" href="cua-hang.html" aria-label="Bàn học ${esc(tenBan(ck.ban))}. Mở cửa hàng để đổi bàn">${PeerAssets.renderDesk(ck.ban)}</a>` +
    `<button type="button" class="room-me" id="nut-nhan-vat" aria-label="Nhân vật của ${esc(ck.ten)}. Bấm để chỉnh nhân vật">${PeerAssets.renderCharacter(ck.nhanVat)}</button>` +
    `<div class="room-shelf" id="tu-sach"><p class="small muted">Đang xếp sách…</p></div>` +
    // Điện thoại: sách quá nhỏ để bấm, nên chạm vào tủ sẽ mở tủ sách cỡ lớn
    `<button type="button" class="room-shelf-mo" id="mo-tu-sach" aria-label="Mở tủ sách trò chơi các môn"></button>` +
    `</div>` +
    `<p class="room-goi-y small muted">Bấm vào sách để mở trò chơi của môn đó · cuốn hồng là Sổ tay cảm xúc · bấm bàn để vào cửa hàng · bấm nhân vật để thay đổi diện mạo.</p>` +
    `<nav class="hanh-dong" aria-label="Học cùng bạn bè">` +
    `<a class="btn btn-primary hd-nut" href="tim-ban.html"><i class="fas fa-user-group" aria-hidden="true"></i><span>Tìm bạn học<small>Bạn giỏi môn bạn cần</small></span></a>` +
    `<button type="button" class="btn btn-primary hd-nut" id="nut-hoc-doi"><i class="fas fa-people-arrows" aria-hidden="true"></i><span>Học cùng bạn<small>Phòng 2 người</small></span></button>` +
    `<button type="button" class="btn btn-primary hd-nut" id="nut-hoc-nhom"><i class="fas fa-people-group" aria-hidden="true"></i><span>Học nhóm<small>Phòng 2–8 người</small></span></button>` +
    `</nav>`;

  if (ctx.chuoiVuaTang && r.chuoi >= CHUOI_HIEN_LUA) el.querySelector('#hud-chuoi').classList.add('flame-pop');

  el.querySelector('#nut-nhan-vat').addEventListener('click', () => moNhanVatCuaToi(ctx));
  // Sau khi sửa nhân vật trong cửa sổ, vẽ lại nhân vật trong phòng
  document.addEventListener('pl:hoso', () => {
    el.querySelector('#nut-nhan-vat').innerHTML = PeerAssets.renderCharacter(ctx.congKhai.nhanVat);
  });

  el.querySelector('#nut-hoc-doi').addEventListener('click', async () => (await import('./tao-phong.js')).moHocDoi(ctx));
  el.querySelector('#nut-hoc-nhom').addEventListener('click', async () => (await import('./tao-phong.js')).moHocNhom(ctx));

  // Tủ sách
  const tu = el.querySelector('#tu-sach');
  try {
    const mon = await layMonHoc();
    // Tủ chứa tối đa 9 cuốn: các môn trong mon-hoc.json + cuốn "Sổ tay cảm xúc" ở cuối
    const sach = mon.slice(0, 8).map((m) => ({ id: m.id, name: m.name, spine: m.spine, color: m.color, href: m.href }));
    sach.push({ id: 'so-tay', name: 'Sổ tay cảm xúc', spine: 'Sổ tay 💗', color: '#f472b6', href: '#so-tay' });
    const svg = PeerAssets.renderBookshelf(sach, ck.ke).replace('aria-label="Mở trò chơi môn Sổ tay cảm xúc"', 'aria-label="Mở Sổ tay cảm xúc"');
    const ganSapCo = (vung) => {
      vung.querySelectorAll('.pa-book--sap-co').forEach((b) => b.addEventListener('click', () => {
        thongBao(`Trò chơi môn ${esc(b.querySelector('title').textContent.replace(' (sắp có)', ''))} sắp có. Bạn thử môn khác trước nhé!`);
      }));
      // Cuốn sổ tay mở ngay trên trang, không mở tab mới
      vung.querySelectorAll('[data-subject="so-tay"]').forEach((b) => b.addEventListener('click', async (e) => {
        e.preventDefault();
        b.closest('dialog')?.close();
        (await import('./so-tay.js')).moSoTay(ctx);
      }));
    };
    tu.innerHTML = svg;
    ganSapCo(tu);
    // Màn hẹp: sách nhỏ trong phòng chỉ để nhìn, bỏ khỏi thứ tự phím Tab (đã có nút mở tủ lớn)
    const hep = matchMedia('(max-width: 640px)');
    const capNhatTab = () => tu.querySelectorAll('a').forEach((a) => (hep.matches ? a.setAttribute('tabindex', '-1') : a.removeAttribute('tabindex')));
    capNhatTab();
    hep.addEventListener('change', capNhatTab);
    el.querySelector('#mo-tu-sach').addEventListener('click', () => {
      const cs = moCuaSo(`<p class="small muted" style="margin-bottom:10px">Chạm vào một cuốn sách để mở trò chơi của môn đó ở tab mới.</p><div class="tu-sach-lon">${svg}</div>`, { tieuDe: 'Tủ sách' });
      ganSapCo(cs);
    });
  } catch (e) {
    tu.innerHTML = `<p class="small error">Chưa tải được tủ sách. Kiểm tra file data/mon-hoc.json rồi tải lại trang.</p>`;
  }
}
