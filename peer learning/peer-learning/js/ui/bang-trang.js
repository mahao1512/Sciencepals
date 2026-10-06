/*
 * bang-trang.js — Bảng trắng chung: vẽ bằng chuột / ngón tay / bút.
 * Toạ độ lưu theo tỉ lệ 0–1 của khung (4:3) nên mọi màn hình thấy giống nhau.
 * Mỗi nét vẽ xong (nhấc tay) được gửi lên một lần; người vào sau vẫn thấy cả bảng.
 */
import { maNgauNhien } from '../tienich.js';

export const MAU_BUT = [
  { id: '#1e293b', ten: 'Đen' }, { id: '#2563eb', ten: 'Xanh dương' }, { id: '#dc2626', ten: 'Đỏ' },
  { id: '#16a34a', ten: 'Xanh lá' }, { id: '#ea580c', ten: 'Cam' }, { id: '#7c3aed', ten: 'Tím' }
];
export const CO_BUT = [{ id: 3, ten: 'Mảnh' }, { id: 6, ten: 'Vừa' }, { id: 12, ten: 'Đậm' }];

/**
 * Gắn bảng trắng vào `canvas`.
 * opts: { layCongCu() → { mau, co, tay }, khiXong(net) }
 * Trả về { ve(dsNet) } để vẽ lại khi dữ liệu phòng đổi.
 */
export function taoBangTrang(canvas, opts) {
  const g = canvas.getContext('2d');
  let dsNet = [];
  let dangVe = null;

  // Độ dày nét tính theo phần nghìn chiều rộng khung
  const doDay = (net, w) => (net.tay ? net.co * 3 : net.co) * (w / 1000) * 1.6;

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
    if (d.length === 1) {
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

  const viTri = (e) => {
    const r = canvas.getBoundingClientRect();
    return [
      Math.round(Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)) * 10000) / 10000,
      Math.round(Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)) * 10000) / 10000
    ];
  };

  canvas.addEventListener('pointerdown', (e) => {
    if (e.button !== undefined && e.button > 0) return;
    e.preventDefault();
    canvas.setPointerCapture(e.pointerId);
    const cc = opts.layCongCu();
    dangVe = { id: maNgauNhien(12), mau: cc.mau, co: cc.co, tay: cc.tay, diem: [viTri(e)] };
    veLai();
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!dangVe) return;
    const p = viTri(e);
    const z = dangVe.diem[dangVe.diem.length - 1];
    if (Math.abs(p[0] - z[0]) + Math.abs(p[1] - z[1]) < 0.002) return; // bỏ điểm quá sát để nét gọn
    dangVe.diem.push(p);
    veLai();
  });
  const ket = () => {
    if (!dangVe) return;
    const net = dangVe;
    dangVe = null;
    if (net.diem.length > 600) net.diem = net.diem.filter((_, i) => i % 2 === 0 || i === net.diem.length - 1);
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
