/*
 * bang-trang.js — Bảng trắng chung: vẽ tay, tẩy và vẽ hình cơ bản bằng chuột / ngón tay / bút.
 * Toạ độ lưu theo tỉ lệ 0–1 của khung (4:3) nên mọi màn hình thấy giống nhau.
 * Mỗi nét / hình vẽ xong (nhấc tay) được gửi lên một lần; người vào sau vẫn thấy cả bảng.
 *
 * Một "nét" có dạng:
 *   vẽ tay:  { id, mau, co, tay: false, diem: [[x,y], ...] }
 *   tẩy:     { id, mau, co, tay: true,  diem: [[x,y], ...] }
 *   hình:    { id, mau, co, hinh: 'thang'|'vuong'|'tron'|'oval'|'tamgiac'|'lucgiac', diem: [[x1,y1],[x2,y2]] }
 *   thêm `dut: true` nếu là nét đứt (bút hoặc hình).
 */
import { maNgauNhien } from '../tienich.js';

export const MAU_BUT = [
  { id: '#1e293b', ten: 'Đen' }, { id: '#2563eb', ten: 'Xanh dương' }, { id: '#dc2626', ten: 'Đỏ' },
  { id: '#16a34a', ten: 'Xanh lá' }, { id: '#ea580c', ten: 'Cam' }, { id: '#7c3aed', ten: 'Tím' }
];
export const CO_BUT = [{ id: 3, ten: 'Mảnh' }, { id: 6, ten: 'Vừa' }, { id: 12, ten: 'Đậm' }];

/** Công cụ vẽ: bút, tẩy và 6 hình cơ bản. `bieuTuong` là SVG nhỏ cho nút. */
const ic = (d) => `<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
export const CONG_CU = [
  { id: 'but', ten: 'Bút', bieuTuong: '<i class="fas fa-pen" aria-hidden="true"></i>' },
  { id: 'tay', ten: 'Tẩy', bieuTuong: '<i class="fas fa-eraser" aria-hidden="true"></i>' },
  { id: 'thang', ten: 'Đường thẳng', bieuTuong: ic('<path d="M4 20 L20 4"/>') },
  { id: 'vuong', ten: 'Hình vuông', bieuTuong: ic('<rect x="4" y="4" width="16" height="16" rx="1"/>') },
  { id: 'tron', ten: 'Hình tròn', bieuTuong: ic('<circle cx="12" cy="12" r="8.5"/>') },
  { id: 'oval', ten: 'Hình oval', bieuTuong: ic('<ellipse cx="12" cy="12" rx="10" ry="6.5"/>') },
  { id: 'tamgiac', ten: 'Hình tam giác', bieuTuong: ic('<path d="M12 3.5 L21 20 L3 20 Z"/>') },
  { id: 'lucgiac', ten: 'Hình lục giác', bieuTuong: ic('<path d="M7 3.5 L17 3.5 L22 12 L17 20.5 L7 20.5 L2 12 Z"/>') }
];
const LA_HINH = new Set(['thang', 'vuong', 'tron', 'oval', 'tamgiac', 'lucgiac']);

/**
 * Gắn bảng trắng vào `canvas`.
 * opts: { layCongCu() → { cheDo, mau, co, dut }, khiXong(net) }
 *   cheDo: 'but' | 'tay' | một id hình trong CONG_CU
 * Trả về { ve(dsNet) } để vẽ lại khi dữ liệu phòng đổi.
 */
export function taoBangTrang(canvas, opts) {
  const g = canvas.getContext('2d');
  let dsNet = [];
  let dangVe = null;

  // Độ dày nét tính theo phần nghìn chiều rộng khung
  const doDay = (net, w) => (net.tay ? net.co * 3 : net.co) * (w / 1000) * 1.6;

  /** Vẽ một hình từ hai góc (toạ độ điểm ảnh). */
  function duongHinh(hinh, x1, y1, x2, y2) {
    const trai = Math.min(x1, x2), phai = Math.max(x1, x2), tren = Math.min(y1, y2), duoi = Math.max(y1, y2);
    const cx = (trai + phai) / 2, cy = (tren + duoi) / 2, rx = (phai - trai) / 2, ry = (duoi - tren) / 2;
    g.beginPath();
    if (hinh === 'thang') { g.moveTo(x1, y1); g.lineTo(x2, y2); }
    else if (hinh === 'vuong') g.rect(trai, tren, phai - trai, duoi - tren);
    else if (hinh === 'tron' || hinh === 'oval') g.ellipse(cx, cy, Math.max(rx, 0.5), Math.max(ry, 0.5), 0, 0, Math.PI * 2);
    else if (hinh === 'tamgiac') { g.moveTo(cx, tren); g.lineTo(phai, duoi); g.lineTo(trai, duoi); g.closePath(); }
    else if (hinh === 'lucgiac') {
      for (let i = 0; i < 6; i++) {
        const goc = (Math.PI / 3) * i;
        const px = cx + rx * Math.cos(goc), py = cy + ry * Math.sin(goc);
        if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
      }
      g.closePath();
    }
    g.stroke();
  }

  function veNet(net, w, h) {
    const d = net.diem;
    if (!d || !d.length) return;
    g.save();
    g.globalCompositeOperation = net.tay ? 'destination-out' : 'source-over';
    g.strokeStyle = net.mau;
    g.fillStyle = net.mau;
    g.lineWidth = doDay(net, w);
    g.lineCap = 'round';
    g.lineJoin = 'round';
    // Nét đứt (không áp dụng cho tẩy)
    if (net.dut && !net.tay) g.setLineDash([g.lineWidth * 2.4, g.lineWidth * 2.2]);
    if (net.hinh && d.length >= 2) {
      duongHinh(net.hinh, d[0][0] * w, d[0][1] * h, d[1][0] * w, d[1][1] * h);
    } else if (d.length === 1) {
      g.beginPath();
      g.arc(d[0][0] * w, d[0][1] * h, g.lineWidth / 2, 0, Math.PI * 2);
      g.fill();
    } else {
      g.beginPath();
      g.moveTo(d[0][0] * w, d[0][1] * h);
      for (let i = 1; i < d.length - 1; i++) {
        // Đường cong mượt qua trung điểm
        const mx = ((d[i][0] + d[i + 1][0]) / 2) * w;
        const my = ((d[i][1] + d[i + 1][1]) / 2) * h;
        g.quadraticCurveTo(d[i][0] * w, d[i][1] * h, mx, my);
      }
      const z = d[d.length - 1];
      g.lineTo(z[0] * w, z[1] * h);
      g.stroke();
    }
    g.restore();
  }

  function veLai() {
    const w = canvas.width;
    const h = canvas.height;
    g.clearRect(0, 0, w, h);
    dsNet.forEach((n) => veNet(n, w, h));
    if (dangVe) veNet(dangVe, w, h);
  }

  function coKhung() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const r = canvas.getBoundingClientRect();
    if (!r.width) return;
    canvas.width = Math.round(r.width * dpr);
    canvas.height = Math.round(r.height * dpr);
    veLai();
  }
  new ResizeObserver(coKhung).observe(canvas);

  const lamTron = (v) => Math.round(Math.min(1, Math.max(0, v)) * 10000) / 10000;
  const viTri = (e) => {
    const r = canvas.getBoundingClientRect();
    return [lamTron((e.clientX - r.left) / r.width), lamTron((e.clientY - r.top) / r.height)];
  };
  /** Hình vuông, hình tròn: ép hai cạnh bằng nhau tính theo điểm ảnh trên màn hình. */
  function epDeu(hinh, a, b) {
    if (hinh !== 'vuong' && hinh !== 'tron') return b;
    const r = canvas.getBoundingClientRect();
    const dx = (b[0] - a[0]) * r.width, dy = (b[1] - a[1]) * r.height;
    const c = Math.max(Math.abs(dx), Math.abs(dy));
    return [lamTron(a[0] + (Math.sign(dx) || 1) * c / r.width), lamTron(a[1] + (Math.sign(dy) || 1) * c / r.height)];
  }

  canvas.addEventListener('pointerdown', (e) => {
    if (e.button !== undefined && e.button > 0) return;
    e.preventDefault();
    canvas.setPointerCapture(e.pointerId);
    const cc = opts.layCongCu();
    const p = viTri(e);
    dangVe = LA_HINH.has(cc.cheDo)
      ? { id: maNgauNhien(12), mau: cc.mau, co: cc.co, tay: false, hinh: cc.cheDo, diem: [p, p] }
      : { id: maNgauNhien(12), mau: cc.mau, co: cc.co, tay: cc.cheDo === 'tay', diem: [p] };
    if (cc.dut && cc.cheDo !== 'tay') dangVe.dut = true;
    veLai();
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!dangVe) return;
    const p = viTri(e);
    if (dangVe.hinh) {
      dangVe.diem[1] = epDeu(dangVe.hinh, dangVe.diem[0], p);
    } else {
      const z = dangVe.diem[dangVe.diem.length - 1];
      if (Math.abs(p[0] - z[0]) + Math.abs(p[1] - z[1]) < 0.002) return; // bỏ điểm quá sát để nét gọn
      dangVe.diem.push(p);
    }
    veLai();
  });
  const ket = () => {
    if (!dangVe) return;
    const net = dangVe;
    dangVe = null;
    if (net.hinh) {
      // Chạm nhẹ không kéo thì không tạo hình
      const [[x1, y1], [x2, y2]] = net.diem;
      if (Math.abs(x2 - x1) + Math.abs(y2 - y1) < 0.01) { veLai(); return; }
    } else if (net.diem.length > 600) {
      net.diem = net.diem.filter((_, i) => i % 2 === 0 || i === net.diem.length - 1);
    }
    dsNet = [...dsNet, net]; // hiện ngay, không chờ máy chủ
    veLai();
    opts.khiXong(net);
  };
  canvas.addEventListener('pointerup', ket);
  canvas.addEventListener('pointercancel', ket);

  return {
    ve(ds) {
      dsNet = [...ds].sort((a, b) => (a.luc || 0) - (b.luc || 0));
      veLai();
    }
  };
}
