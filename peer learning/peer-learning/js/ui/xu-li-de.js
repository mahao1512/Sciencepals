/*
 * xu-li-de.js — Biến ảnh chụp / PDF thành các trang ảnh JPEG nhỏ gọn (dạng data URL) ngay trên máy.
 * PDF được vẽ ra ảnh bằng pdf.js (nạp từ cdnjs chỉ khi cần).
 */
import { DE_TOI_DA_TRANG, DE_CANH_DAI } from '../config.js';

const PDFJS = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/';
let napPdf = null;
function layPdfJs() {
  if (!napPdf) {
    napPdf = new Promise((ok, loi) => {
      const s = document.createElement('script');
      s.src = PDFJS + 'pdf.min.js';
      s.onload = () => { window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS + 'pdf.worker.min.js'; ok(window.pdfjsLib); };
      s.onerror = () => { napPdf = null; loi(new Error('Không tải được bộ đọc PDF. Kiểm tra mạng rồi thử lại.')); };
      document.head.appendChild(s);
    });
  }
  return napPdf;
}

/** Thu nhỏ một canvas / ảnh nguồn rồi nén JPEG sao cho không quá `toiDaByte`. */
async function nenAnh(nguon, rong, cao, toiDaByte, xoay = 0) {
  const tile = Math.min(1, DE_CANH_DAI / Math.max(rong, cao));
  let w = Math.round(rong * tile);
  let h = Math.round(cao * tile);
  for (let lan = 0; lan < 6; lan++) {
    const c = document.createElement('canvas');
    const dung = xoay % 180 !== 0;
    c.width = dung ? h : w;
    c.height = dung ? w : h;
    const g = c.getContext('2d');
    g.fillStyle = '#fff';
    g.fillRect(0, 0, c.width, c.height);
    g.translate(c.width / 2, c.height / 2);
    g.rotate((xoay * Math.PI) / 180);
    g.drawImage(nguon, -w / 2, -h / 2, w, h);
    for (const q of [0.72, 0.6, 0.5, 0.42]) {
      const url = c.toDataURL('image/jpeg', q);
      if (url.length * 0.75 <= toiDaByte) return url;
    }
    w = Math.round(w * 0.8); // vẫn nặng: thu nhỏ thêm rồi thử lại
    h = Math.round(h * 0.8);
  }
  throw new Error('Ảnh quá lớn, chưa nén được. Hãy chụp lại gần hơn hoặc chọn ảnh khác.');
}

/** Một file ảnh → 1 trang. */
async function tuAnh(file, toiDaByte) {
  const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' }).catch(() => null);
  if (!bmp) throw new Error(`Không đọc được ảnh “${file.name}”. Hãy chọn ảnh JPG hoặc PNG.`);
  return nenAnh(bmp, bmp.width, bmp.height, toiDaByte);
}

/** Một file PDF → nhiều trang (tối đa `conCho`). Trả về { trang, boBot }. */
async function tuPdf(file, toiDaByte, conCho, baoTienDo) {
  const pdfjs = await layPdfJs();
  const tai = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise.catch(() => null);
  if (!tai) throw new Error(`Không mở được “${file.name}”. File PDF có thể bị hỏng hoặc có mật khẩu.`);
  const so = Math.min(tai.numPages, conCho);
  const trang = [];
  for (let i = 1; i <= so; i++) {
    baoTienDo && baoTienDo(`Đang xử lí trang ${i}/${so} của ${file.name}…`);
    const p = await tai.getPage(i);
    const vp0 = p.getViewport({ scale: 1 });
    const vp = p.getViewport({ scale: Math.min(3, DE_CANH_DAI / Math.max(vp0.width, vp0.height)) });
    const c = document.createElement('canvas');
    c.width = Math.round(vp.width);
    c.height = Math.round(vp.height);
    const g = c.getContext('2d');
    g.fillStyle = '#fff';
    g.fillRect(0, 0, c.width, c.height);
    // intent 'print': vẽ liền một mạch, không chờ requestAnimationFrame (bị dừng khi người dùng chuyển tab/app)
    await p.render({ canvasContext: g, viewport: vp, intent: 'print' }).promise;
    trang.push(await nenAnh(c, c.width, c.height, toiDaByte));
  }
  return { trang, boBot: tai.numPages - so };
}

/**
 * Biến danh sách file (ảnh và/hoặc PDF) thành các trang đề.
 * `daCo`: số trang đã có sẵn (để không vượt DE_TOI_DA_TRANG).
 * Trả về { trang: [dataURL], boBot: số trang bị bỏ vì quá giới hạn }.
 */
export async function xuLiFile(files, { toiDaByte, daCo = 0, baoTienDo } = {}) {
  const trang = [];
  let boBot = 0;
  for (const f of files) {
    const conCho = DE_TOI_DA_TRANG - daCo - trang.length;
    const laPdf = f.type === 'application/pdf' || /\.pdf$/i.test(f.name);
    if (conCho <= 0) { boBot += 1; continue; } // đã đủ số trang tối đa
    if (laPdf) {
      const kq = await tuPdf(f, toiDaByte, conCho, baoTienDo);
      trang.push(...kq.trang);
      boBot += kq.boBot;
    } else if (f.type.startsWith('image/')) {
      baoTienDo && baoTienDo(`Đang nén ảnh ${f.name}…`);
      trang.push(await tuAnh(f, toiDaByte));
    } else {
      throw new Error(`“${f.name}” không phải ảnh hay PDF. Hãy chọn ảnh chụp đề hoặc file PDF.`);
    }
  }
  return { trang, boBot };
}

/** Xoay một trang đã nén 90° theo chiều kim đồng hồ. */
export async function xoayTrang(dataUrl, toiDaByte) {
  const img = new Image();
  img.src = dataUrl;
  await img.decode();
  return nenAnh(img, img.naturalWidth, img.naturalHeight, toiDaByte, 90);
}
