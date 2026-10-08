/*
 * goi-video.js — Gọi video trong phòng học.
 *  - Một bạn bấm "Gọi video" → mọi người khác trong phòng được hỏi ý.
 *  - Ai bấm Đồng ý thì mới bật camera / micro và vào cuộc gọi; ai từ chối vẫn học bình thường, vào sau cũng được.
 *  - Hình và tiếng đi thẳng giữa các máy (WebRTC, kết nối từng cặp); tầng dữ liệu chỉ chuyển "tín hiệu" để
 *    hai máy tìm thấy nhau (offer / answer / ice).
 *  - Không bật được camera / micro thì có thể vào chỉ để xem và nghe.
 */
import { duLieu } from '../data/index.js';
import { esc, moCuaSo, thongBao, maNgauNhien } from '../tienich.js';
import { MAY_CHU_ICE, GOI_TOI_DA } from '../config.js';

const $ = (s) => document.querySelector(s);

/** Lí do không bật được camera / micro, nói dễ hiểu. */
function lyDo(e) {
  if (!window.isSecureContext) return 'Gọi video cần trang mở bằng https (GitHub Pages, Netlify đều là https) hoặc localhost.';
  switch (e?.name) {
    case 'NotAllowedError': return 'Bạn đã chặn quyền dùng camera / micro. Bấm biểu tượng ổ khoá cạnh địa chỉ trang để cho phép rồi thử lại.';
    case 'NotFoundError': return 'Máy này không có camera hoặc micro.';
    case 'NotReadableError': return 'Camera hoặc micro đang được ứng dụng khác dùng (Zoom, Meet…). Hãy tắt ứng dụng đó rồi thử lại.';
    default: return 'Trình duyệt không mở được camera / micro.';
  }
}

/** Camera giả (chỉ chế độ thử, gõ plCameraGia = true trong Console): khung màu chuyển động. */
function luongGia(ten) {
  const c = document.createElement('canvas');
  c.width = 320; c.height = 240;
  const g = c.getContext('2d');
  let t = 0;
  setInterval(() => {
    t++;
    g.fillStyle = `hsl(${(t * 3) % 360} 70% 60%)`;
    g.fillRect(0, 0, 320, 240);
    g.fillStyle = '#fff';
    g.font = 'bold 28px sans-serif';
    g.fillText('📹 ' + ten, 20, 130);
    g.fillRect(20 + ((t * 4) % 260), 180, 40, 20);
  }, 66);
  return c.captureStream(15);
}

export function ganGoiVideo({ ma, ctx }) {
  let phong = null;
  let phien = null;          // mã phiên của mình khi đang trong cuộc gọi
  let luong = null;          // camera + micro của mình (null nếu chỉ xem / nghe)
  let goiId = null;
  const ketNoi = new Map();  // uid → { pc, phien, choIce: [], coMoTa, hangDoi, luongXa }
  const daHoi = new Set();
  let hopHoi = null;
  let dangVao = false;

  const panel = $('#p-video');
  const luoi = $('#gv-luoi');
  const nut = $('#gv-nut');

  /* ---------- Camera / micro ---------- */
  function hoiChiXem(thongDiep) {
    return new Promise((ok) => {
      let xong = false;
      const cs = moCuaSo(
        `<p>${esc(thongDiep)}</p><p class="small muted" style="margin-top:6px">Bạn vẫn có thể vào cuộc gọi để xem và nghe mọi người (không bật camera, micro).</p>` +
        `<div class="row" style="margin-top:14px"><button class="btn btn-primary" id="cx-ok">Vào để xem và nghe</button><button class="btn btn-secondary" id="cx-huy">Huỷ</button></div>`,
        { tieuDe: 'Chưa bật được camera / micro', khiDong: () => { if (!xong) ok(undefined); } });
      cs.querySelector('#cx-ok').addEventListener('click', () => { xong = true; cs.close(); ok(null); });
      cs.querySelector('#cx-huy').addEventListener('click', () => { xong = true; cs.close(); ok(undefined); });
    });
  }
  /** Trả về MediaStream, null (chỉ xem / nghe) hoặc undefined (huỷ). */
  async function layLuong() {
    if (duLieu.cheDo === 'local' && window.plCameraGia) return luongGia(ctx.congKhai.ten);
    if (!navigator.mediaDevices?.getUserMedia) return hoiChiXem(lyDo());
    try {
      return await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' }
      });
    } catch (e) {
      // Camera hỏng / bận thì thử chỉ micro
      if (e.name !== 'NotAllowedError') {
        try { return await navigator.mediaDevices.getUserMedia({ audio: true }); } catch (e2) { /* tiếp tục hỏi */ }
      }
      return hoiChiXem(lyDo(e));
    }
  }
  const dungLuong = () => { luong?.getTracks().forEach((t) => t.stop()); luong = null; };

  /* ---------- Kết nối từng cặp ---------- */
  function gui(u, loai, du) {
    const k = ketNoi.get(u);
    if (!k) return;
    duLieu.guiTinHieu(ma, u, { goiId, phien, denPhien: k.phien, loai, du: JSON.stringify(du) })
      .catch(() => {});
  }
  function moKetNoi(u, phienBan) {
    const pc = new RTCPeerConnection({ iceServers: MAY_CHU_ICE });
    const k = { pc, phien: phienBan, choIce: [], coMoTa: false, hangDoi: Promise.resolve(), luongXa: new MediaStream() };
    ketNoi.set(u, k);
    if (luong) luong.getTracks().forEach((t) => pc.addTrack(t, luong));
    const laNguoiGoi = ctx.uid < u; // quy ước: uid nhỏ hơn tạo lời gọi để hai bên không gọi chồng nhau
    if (!luong && laNguoiGoi) {
      pc.addTransceiver('audio', { direction: 'recvonly' });
      pc.addTransceiver('video', { direction: 'recvonly' });
    }
    pc.onicecandidate = (e) => { if (e.candidate) gui(u, 'ice', e.candidate.toJSON()); };
    pc.ontrack = (e) => {
      const s = e.streams[0];
      if (s) k.luongXa = s; else k.luongXa.addTrack(e.track);
      veLuoi();
    };
    pc.onconnectionstatechange = () => veLuoi();
    if (laNguoiGoi) {
      k.hangDoi = k.hangDoi.then(async () => {
        await pc.setLocalDescription(await pc.createOffer());
        gui(u, 'offer', pc.localDescription.toJSON());
      }).catch((err) => console.warn('Lỗi tạo lời gọi', err));
    }
    veLuoi();
    return k;
  }
  function dongKetNoi(u) {
    const k = ketNoi.get(u);
    if (!k) return;
    k.pc.close();
    ketNoi.delete(u);
    luoi.querySelector(`[data-uid="${CSS.escape(u)}"]`)?.remove();
  }
  async function xuLiTinHieu(m) {
    if (!phien || m.goiId !== goiId || m.denPhien !== phien) return;
    let k = ketNoi.get(m.tu);
    if (!k || k.phien !== m.phien) {
      if (phong?.goi?.thamGia?.[m.tu] !== m.phien) return; // phiên lạ
      dongKetNoi(m.tu);
      k = moKetNoi(m.tu, m.phien);
    }
    const du = JSON.parse(m.du);
    const pc = k.pc;
    k.hangDoi = k.hangDoi.then(async () => {
      if (m.loai === 'offer') {
        await pc.setRemoteDescription(du);
        k.coMoTa = true;
        for (const c of k.choIce.splice(0)) await pc.addIceCandidate(c).catch(() => {});
        await pc.setLocalDescription(await pc.createAnswer());
        gui(m.tu, 'answer', pc.localDescription.toJSON());
      } else if (m.loai === 'answer') {
        await pc.setRemoteDescription(du);
        k.coMoTa = true;
        for (const c of k.choIce.splice(0)) await pc.addIceCandidate(c).catch(() => {});
      } else if (m.loai === 'ice') {
        if (k.coMoTa) await pc.addIceCandidate(du).catch(() => {});
        else k.choIce.push(du);
      }
    }).catch((err) => console.warn('Lỗi tín hiệu gọi video', err));
  }
  duLieu.ngheTinHieu(ma, xuLiTinHieu);

  /* ---------- Giao diện ---------- */
  function o(uid) {
    let el = luoi.querySelector(`[data-uid="${CSS.escape(uid)}"]`);
    if (!el) {
      el = document.createElement('figure');
      el.className = 'gv-o';
      el.dataset.uid = uid;
      el.innerHTML = '<video autoplay playsinline></video><div class="gv-thay" aria-hidden="true"></div><figcaption></figcaption>';
      luoi.appendChild(el);
    }
    return el;
  }
  function veLuoi() {
    if (!phien) return;
    const tv = phong?.thanhVien || {};
    // Ô của mình
    const toi = o(ctx.uid);
    const coHinh = luong?.getVideoTracks().some((t) => t.enabled && t.readyState === 'live');
    const v = toi.querySelector('video');
    v.muted = true;
    v.classList.add('guong');
    if (v.srcObject !== luong) v.srcObject = luong;
    toi.classList.toggle('khong-hinh', !coHinh);
    toi.querySelector('.gv-thay').textContent = luong ? '📷 Camera đang tắt' : '👀 Bạn đang xem và nghe';
    toi.querySelector('figcaption').textContent = 'Bạn' + (luong && !luong.getAudioTracks().some((t) => t.enabled) ? ' · 🔇' : '');
    // Ô của từng người
    ketNoi.forEach((k, u) => {
      const el = o(u);
      const vv = el.querySelector('video');
      if (vv.srcObject !== k.luongXa) vv.srcObject = k.luongXa;
      const tt = k.pc.connectionState;
      const coVideo = k.luongXa.getVideoTracks().length > 0;
      el.classList.toggle('khong-hinh', !coVideo || tt !== 'connected');
      el.querySelector('.gv-thay').textContent =
        tt === 'failed' ? '⚠️ Không kết nối được (mạng có thể đang chặn gọi video)'
          : tt !== 'connected' ? '⏳ Đang kết nối…' : '📷 Bạn ấy không bật camera';
      el.querySelector('figcaption').textContent = tv[u]?.ten || 'Bạn học';
    });
    const n = ketNoi.size + 1;
    $('#gv-tt').textContent = n === 1 ? 'Đang chờ mọi người đồng ý tham gia…' : `${n} người trong cuộc gọi`;
    luoi.dataset.so = Math.min(n, 4);
    // Nút micro / camera
    const mic = luong?.getAudioTracks()[0];
    const cam = luong?.getVideoTracks()[0];
    $('#gv-mic').disabled = !mic;
    $('#gv-cam').disabled = !cam;
    $('#gv-mic').setAttribute('aria-pressed', String(Boolean(mic && !mic.enabled)));
    $('#gv-cam').setAttribute('aria-pressed', String(Boolean(cam && !cam.enabled)));
    $('#gv-mic').innerHTML = mic && !mic.enabled ? '<i class="fas fa-microphone-slash" aria-hidden="true"></i> Bật micro' : '<i class="fas fa-microphone" aria-hidden="true"></i> Tắt micro';
    $('#gv-cam').innerHTML = cam && !cam.enabled ? '<i class="fas fa-video-slash" aria-hidden="true"></i> Bật camera' : '<i class="fas fa-video" aria-hidden="true"></i> Tắt camera';
  }
  function veNut() {
    const g = phong?.goi;
    const n = Object.keys(g?.thamGia || {}).length;
    nut.hidden = Boolean(phien);
    nut.disabled = dangVao;
    nut.innerHTML = g
      ? `<i class="fas fa-video" aria-hidden="true"></i> Tham gia gọi video (${n})`
      : '<i class="fas fa-video" aria-hidden="true"></i> Gọi video';
    nut.classList.toggle('btn-primary', Boolean(g));
    nut.classList.toggle('btn-secondary', !g);
  }

  /* ---------- Vào / rời ---------- */
  async function vao(laNguoiMo) {
    if (dangVao || phien) return;
    const g = phong?.goi;
    if (!laNguoiMo && g && Object.keys(g.thamGia || {}).length >= GOI_TOI_DA) {
      return thongBao(`Cuộc gọi đã đủ ${GOI_TOI_DA} người. Bạn vẫn học cùng được qua trò chuyện và bảng trắng nhé.`, { loai: 'err' });
    }
    dangVao = true;
    veNut();
    try {
      const l = await layLuong();
      if (l === undefined) return;
      luong = l;
      phien = maNgauNhien(8);
      if (laNguoiMo && !phong?.goi) goiId = (await duLieu.batDauGoi(ma, phien))?.id;
      else { await duLieu.thamGiaGoi(ma, phien); goiId = phong?.goi?.id; }
      panel.hidden = false;
    } catch (e) {
      dungLuong();
      phien = null;
      thongBao(esc(e.message), { loai: 'err' });
    } finally {
      dangVao = false;
      veNut();
      if (phien) capNhat(phong); // mở kết nối với những người đã có trong cuộc gọi
    }
  }
  function ketThucCucBo(loiNhan) {
    [...ketNoi.keys()].forEach(dongKetNoi);
    dungLuong();
    phien = null;
    goiId = null;
    luoi.innerHTML = '';
    panel.hidden = true;
    veNut();
    if (loiNhan) thongBao(loiNhan);
  }
  async function roi() {
    const ph = phien;
    ketThucCucBo();
    if (ph) await duLieu.roiGoi(ma).catch(() => {});
  }
  function hoi(g) {
    hopHoi?.close();
    const cs = moCuaSo(
      `<p>📹 <b>${esc(g.tenNguoiMo || 'Một bạn')}</b> muốn gọi video với phòng.</p>` +
      `<p class="small muted" style="margin-top:6px">Nếu đồng ý, camera và micro của bạn sẽ bật để những người trong cuộc gọi thấy và nghe bạn. Bạn tắt camera, micro hoặc rời cuộc gọi lúc nào cũng được. ` +
      `Nếu không tham gia, bạn vẫn học bình thường và có thể vào sau bằng nút “Tham gia gọi video”.</p>` +
      `<div class="row" style="margin-top:14px"><button class="btn btn-primary" id="hg-ok"><i class="fas fa-video" aria-hidden="true"></i> Đồng ý tham gia</button>` +
      `<button class="btn btn-secondary" id="hg-khong">Không, cảm ơn</button></div>`,
      { tieuDe: 'Lời mời gọi video', khiDong: () => { if (hopHoi === cs) hopHoi = null; } });
    hopHoi = cs;
    cs.querySelector('#hg-ok').addEventListener('click', () => { cs.close(); vao(false); });
    cs.querySelector('#hg-khong').addEventListener('click', () => { cs.close(); duLieu.tuChoiGoi(ma); });
  }

  nut.addEventListener('click', () => {
    if (phong?.goi) return vao(false);
    const cs = moCuaSo(
      `<p>Bắt đầu gọi video? Mọi người trong phòng sẽ được hỏi ý — ai đồng ý mới vào cuộc gọi.</p>` +
      `<div class="row" style="margin-top:14px"><button class="btn btn-primary" id="bd-ok"><i class="fas fa-video" aria-hidden="true"></i> Bắt đầu</button><button class="btn btn-secondary" id="bd-huy">Huỷ</button></div>`,
      { tieuDe: 'Gọi video' });
    cs.querySelector('#bd-huy').addEventListener('click', () => cs.close());
    cs.querySelector('#bd-ok').addEventListener('click', () => { cs.close(); vao(true); });
  });
  $('#gv-mic').addEventListener('click', () => { const t = luong?.getAudioTracks()[0]; if (t) { t.enabled = !t.enabled; veLuoi(); } });
  $('#gv-cam').addEventListener('click', () => { const t = luong?.getVideoTracks()[0]; if (t) { t.enabled = !t.enabled; veLuoi(); } });
  $('#gv-roi').addEventListener('click', roi);
  addEventListener('pagehide', () => { if (phien) { dungLuong(); duLieu.roiGoi(ma).catch(() => {}); } });

  /** Gọi mỗi khi dữ liệu phòng đổi. */
  function capNhat(p) {
    phong = p;
    const g = p?.goi;
    // Hỏi ý khi có cuộc gọi mới mình chưa trả lời
    if (g && !phien && !g.thamGia?.[ctx.uid] && !g.tuChoi?.[ctx.uid] && g.nguoiMo !== ctx.uid && !daHoi.has(g.id)) {
      daHoi.add(g.id);
      hoi(g);
    }
    if (!g && hopHoi) hopHoi.close();
    if (phien && !dangVao) { // đang vào thì chờ dữ liệu phòng cập nhật xong

      if (!g || g.thamGia?.[ctx.uid] !== phien) { ketThucCucBo(g ? '' : 'Cuộc gọi video đã kết thúc.'); return; }
      goiId = g.id;
      // Đóng kết nối với người đã rời / đổi phiên, mở kết nối với người mới vào
      ketNoi.forEach((k, u) => { if (g.thamGia[u] !== k.phien || !p.thanhVien[u]) dongKetNoi(u); });
      Object.entries(g.thamGia).forEach(([u, ph]) => {
        if (u !== ctx.uid && p.thanhVien[u] && !ketNoi.has(u)) moKetNoi(u, ph);
      });
      veLuoi();
    }
    veNut();
  }
  return { capNhat };
}
