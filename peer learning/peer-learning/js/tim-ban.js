/* tim-ban.js — Danh sách bạn học bù trừ, lọc theo môn muốn được giúp, mời học cùng. */
import { duLieu } from './data/index.js';
import { esc, taiJSON, thongBao } from './tienich.js';
import { khoiTaoTrang } from './khung.js';
import { tinhDoHop, giaiThich } from './ghep-ban.js';

const $ = (s) => document.querySelector(s);
const ctx = await khoiTaoTrang();
const vung = $('#tb-noi-dung');

const de = await taiJSON('data/de-mau.json').catch(() => ({ subjects: [] }));
const tenMon = Object.fromEntries(de.subjects.map((m) => [m.id, m.name]));
const ten = (id) => tenMon[id] || id;
const toi = ctx.congKhai;

if (!toi.diem) {
  vung.innerHTML =
    `<div class="empty"><b>Bạn chưa làm bài kiểm tra đầu vào.</b>` +
    `Cần biết môn mạnh, môn yếu của bạn thì mới tìm được bạn bù trừ. Bài gồm 7 môn, có thể làm dở rồi làm tiếp.` +
    `<p style="margin-top:14px"><a class="btn btn-primary" href="kiem-tra.html">Làm bài kiểm tra</a></p></div>`;
} else {
  await veDanhSach();
}

async function veDanhSach() {
  let tatCa;
  try {
    tatCa = (await duLieu.dsCongKhai()).filter((b) => b.uid !== ctx.uid && b.diem && b.nhanVat);
  } catch (e) {
    vung.innerHTML = `<div class="empty"><b>Chưa tải được danh sách bạn học.</b>Kiểm tra kết nối mạng rồi tải lại trang.</div>`;
    return;
  }
  const ketQua = tatCa.map((b) => ({ ban: b, ...tinhDoHop(toi, b) })).sort((a, b) => b.doHop - a.doHop);

  // Bộ lọc: môn yếu của tôi đứng trước
  const thuTuMon = [...(toi.yeu || []), ...de.subjects.map((m) => m.id).filter((id) => !(toi.yeu || []).includes(id))];
  let loc = '';
  const daMoi = new Set();

  vung.innerHTML =
    `<fieldset class="tb-loc"><legend>Môn bạn muốn được giúp</legend><div class="opts">` +
    `<label class="opt"><input type="radio" name="loc" value="" checked>Tất cả môn</label>` +
    thuTuMon.map((id) => `<label class="opt"><input type="radio" name="loc" value="${id}">${esc(ten(id))}` +
      `${(toi.yeu || []).includes(id) ? ' <span class="tb-can" aria-hidden="true">• cần</span><span class="sr-only"> (môn bạn đang cần)</span>' : ''}</label>`).join('') +
    `</div></fieldset>` +
    `<div id="tb-ds" aria-live="polite"></div>`;

  const the = (k) => {
    const b = k.ban;
    const manh = (b.manh || []).map((id) => `<li>${esc(ten(id))} <b>${b.diem[id]}</b></li>`).join('');
    const moiRoi = daMoi.has(b.uid);
    return `<article class="card tb-the" aria-labelledby="tb-ten-${b.uid}">` +
      `<div class="tb-hinh">${PeerAssets.renderCharacter(b.nhanVat)}</div>` +
      `<div class="tb-than">` +
      `<div class="tb-hang"><h3 id="tb-ten-${b.uid}">${esc(b.ten)}</h3>` +
      (b.mau ? `<span class="tb-mau" title="Bạn học mẫu của chế độ thử">Bạn mẫu</span>` : '') +
      `<span class="tb-hop" title="Độ hợp = điểm bạn nhận được + điểm bạn giúp được">Độ hợp <b>${k.doHop}</b></span></div>` +
      (manh ? `<ul class="tb-manh" aria-label="Môn mạnh của ${esc(b.ten)}">${manh}</ul>` : '') +
      `<p class="tb-giai">${esc(giaiThich(k, ten))}</p>` +
      `<button class="btn ${moiRoi ? 'btn-secondary' : 'btn-primary'} tb-moi" data-uid="${b.uid}"${moiRoi ? ' disabled' : ''}>` +
      (moiRoi ? '<i class="fas fa-check" aria-hidden="true"></i> Đã mời' : '<i class="fas fa-paper-plane" aria-hidden="true"></i> Mời học cùng') +
      `</button></div></article>`;
  };

  const ve = () => {
    const hop = ketQua.filter((k) => !loc || (k.ban.diem[loc] ?? 0) > (toi.diem[loc] ?? 0));
    const haiChieu = hop.filter((k) => k.buTru);
    const motChieu = hop.filter((k) => !k.buTru && k.doHop > 0);
    const tenLoc = loc ? ` môn ${esc(ten(loc))}` : '';
    let html = '';
    if (haiChieu.length) {
      html += `<h2 class="tb-nhom">Bù trừ hai chiều <span class="muted">(${haiChieu.length})</span></h2>` +
        `<div class="tb-luoi">${haiChieu.map(the).join('')}</div>`;
    } else if (motChieu.length) {
      html += `<div class="tb-bao"><b>Chưa có bạn nào bù trừ hai chiều${tenLoc ? ' cho' + tenLoc : ''}.</b> ` +
        `Những bạn dưới đây giúp được <b>một chiều</b>: hoặc bạn ấy giúp bạn, hoặc bạn giúp bạn ấy. Học cùng vẫn có ích!</div>` +
        `<h2 class="tb-nhom">Giúp được một chiều <span class="muted">(${motChieu.length})</span></h2>` +
        `<div class="tb-luoi">${motChieu.map(the).join('')}</div>`;
    } else {
      html += `<div class="empty"><b>Chưa tìm thấy bạn phù hợp${tenLoc ? ' cho' + tenLoc : ''}.</b>` +
        (loc ? 'Thử chọn “Tất cả môn” hoặc một môn khác. ' : '') +
        `Khi có thêm bạn làm bài kiểm tra, danh sách sẽ dài hơn. Bạn cũng có thể tạo phòng học nhóm ở trang chủ rồi gửi mã cho bạn bè.</div>`;
    }
    $('#tb-ds').innerHTML = html;
  };
  ve();

  vung.querySelector('.tb-loc').addEventListener('change', (e) => { loc = e.target.value; ve(); });

  $('#tb-ds').addEventListener('click', async (e) => {
    const nut = e.target.closest('.tb-moi');
    if (!nut || nut.disabled) return;
    const uid = nut.dataset.uid;
    const ban = tatCa.find((b) => b.uid === uid);
    nut.disabled = true;
    try {
      const ma = await duLieu.taoPhong({ loai: 'doi', soCho: 2 });
      await duLieu.guiLoiMoi({ den: uid, maPhong: ma, loai: 'doi' });
      daMoi.add(uid);
      ve();
      thongBao(
        `Đã gửi lời mời tới <b>${esc(ban.ten)}</b>. Phòng đôi <b>${ma}</b> đã sẵn sàng.` +
        (ban.mau ? ' <br><small>Đây là bạn mẫu của chế độ thử nên sẽ không trả lời. Mở thêm một tab, đăng nhập tên khác để thử lời mời thật.</small>' : ''),
        { loai: 'ok', nut: [{ chu: 'Vào phòng', kieu: 'btn-primary', bam: () => { location.href = 'phong.html?ma=' + ma; } }, { chu: 'Ở lại' }] }
      );
    } catch (err) {
      nut.disabled = false;
      thongBao('Chưa gửi được lời mời: ' + esc(err.message) + ' Hãy thử lại.', { loai: 'err' });
    }
  });
}
