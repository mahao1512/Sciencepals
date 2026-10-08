/*
 * ban-be-chung.js — Trạng thái bạn bè dùng chung cho mọi trang:
 *  - quan hệ với từng bạn: 'ban' (bạn bè) | 'gui' (mình đã gửi lời mời) | 'nhan' (bạn ấy mời mình)
 *  - tin nhắn cuối của từng cuộc trò chuyện để đếm tin chưa đọc
 *  - thông báo khi có lời mời kết bạn / tin nhắn mới
 * Mốc "đã đọc" lưu trên máy này (theo từng tài khoản).
 */
import { duLieu } from './data/index.js';
import { esc, thongBao } from './tienich.js';

let kho = null;

/** Khởi động (một lần mỗi trang). Trả về kho dữ liệu bạn bè. */
export function batDauBanBe(ctx) {
  if (kho) return kho;
  const khoaDoc = 'pl_dadoc_' + ctx.uid;
  const daDoc = (() => { try { return JSON.parse(localStorage.getItem(khoaDoc)) || {}; } catch (e) { return {}; } })();
  const nguoiNghe = new Set();
  const quanHe = new Map();  // uid bạn → { id, trangThai, luc }
  const tinCuoi = new Map(); // uid bạn → tin cuối
  const ngheTin = new Map(); // uid bạn → hàm huỷ theo dõi tin cuối
  const hoSo = new Map();    // uid → hồ sơ công khai (tên, nhân vật)
  const batDau = Date.now();
  const daBaoLoiMoi = new Set();
  let dangMoChat = null;     // uid đang mở cuộc trò chuyện (trang Bạn bè)

  const phat = () => nguoiNghe.forEach((f) => f(kho));
  const layHoSo = async (uid) => {
    if (!hoSo.has(uid)) hoSo.set(uid, await duLieu.layCongKhai(uid).catch(() => null));
    return hoSo.get(uid);
  };

  kho = {
    quanHe, tinCuoi,
    trangThai: (uid) => quanHe.get(uid)?.trangThai || null,
    layHoSo,
    chuaDoc(uid) {
      const t = tinCuoi.get(uid);
      return Boolean(t && t.tu !== ctx.uid && t.luc > (daDoc[uid] || 0));
    },
    soChuaDoc() {
      let n = 0;
      quanHe.forEach((q, uid) => { if (q.trangThai === 'nhan' || (q.trangThai === 'ban' && kho.chuaDoc(uid))) n++; });
      return n;
    },
    danhDauDaDoc(uid) {
      daDoc[uid] = Math.max(Date.now(), tinCuoi.get(uid)?.luc || 0);
      try { localStorage.setItem(khoaDoc, JSON.stringify(daDoc)); } catch (e) { /* bỏ qua */ }
      phat();
    },
    datDangMo(uid) { dangMoChat = uid; if (uid) kho.danhDauDaDoc(uid); },
    nghe(f) { nguoiNghe.add(f); f(kho); return () => nguoiNghe.delete(f); },
    /** Hành động theo trạng thái: chưa là gì → gửi lời mời; 'nhan' → chấp nhận. */
    async ketBan(uid) {
      const q = quanHe.get(uid);
      if (q?.trangThai === 'nhan') { await duLieu.traLoiKetBan(q.id, true); return 'ban'; }
      if (!q) { await duLieu.guiKetBan(uid); return 'gui'; }
      return q.trangThai;
    }
  };

  duLieu.theoDoiKetBan(async (ds) => {
    const con = new Set();
    for (const k of ds) {
      const ban = k.thanhVien.find((u) => u !== ctx.uid);
      con.add(ban);
      const tt = k.trangThai === 'ban' ? 'ban' : k.tu === ctx.uid ? 'gui' : 'nhan';
      const cu = quanHe.get(ban)?.trangThai;
      quanHe.set(ban, { id: k.id, trangThai: tt, luc: k.luc });
      // Theo dõi tin cuối của bạn bè để đếm chưa đọc
      if (tt === 'ban' && !ngheTin.has(ban)) {
        ngheTin.set(ban, duLieu.theoDoiTinCuoi(ban, async (t) => {
          const truoc = tinCuoi.get(ban);
          if (t) tinCuoi.set(ban, t); else tinCuoi.delete(ban);
          if (t && t.tu !== ctx.uid && t.luc > batDau && t.id !== truoc?.id && dangMoChat !== ban) {
            const hs = await layHoSo(ban);
            thongBao(`💬 <b>${esc(hs?.ten || 'Bạn bè')}</b>: ${esc(t.noiDung.slice(0, 80))}`, {
              nut: [{ chu: 'Trả lời', kieu: 'btn-primary', bam: () => { location.href = 'ban-be.html?ban=' + encodeURIComponent(ban); } }, { chu: 'Để sau' }]
            });
          }
          if (dangMoChat === ban) kho.danhDauDaDoc(ban);
          phat();
        }));
      }
      // Báo lời mời kết bạn mới / được chấp nhận
      if (tt === 'nhan' && !daBaoLoiMoi.has(k.id)) {
        daBaoLoiMoi.add(k.id);
        const hs = await layHoSo(ban);
        thongBao(`🤝 <b>${esc(hs?.ten || 'Một bạn')}</b> muốn kết bạn với bạn.`, {
          nut: [
            { chu: 'Chấp nhận', kieu: 'btn-primary', bam: () => duLieu.traLoiKetBan(k.id, true).catch((e) => thongBao(esc(e.message), { loai: 'err' })) },
            { chu: 'Để sau' }
          ]
        });
      }
      if (cu === 'gui' && tt === 'ban') {
        const hs = await layHoSo(ban);
        thongBao(`🎉 ${esc(hs?.ten || 'Bạn ấy')} đã chấp nhận lời mời kết bạn. Giờ hai bạn có thể nhắn tin riêng.`, { loai: 'ok' });
      }
    }
    // Quan hệ bị xoá (từ chối / huỷ kết bạn)
    [...quanHe.keys()].forEach((uid) => {
      if (con.has(uid)) return;
      quanHe.delete(uid);
      tinCuoi.delete(uid);
      ngheTin.get(uid)?.();
      ngheTin.delete(uid);
    });
    phat();
  });
  return kho;
}

/** Nút kết bạn theo trạng thái (dùng ở Tìm bạn và trong phòng). */
export function htmlNutKetBan(trangThai, uid, { nho = false } = {}) {
  const lop = `btn ${nho ? 'btn-nho ' : ''}`;
  if (trangThai === 'ban') return `<a class="${lop}btn-secondary" href="ban-be.html?ban=${encodeURIComponent(uid)}"><i class="fas fa-comment" aria-hidden="true"></i> Nhắn tin</a>`;
  if (trangThai === 'gui') return `<button type="button" class="${lop}btn-secondary" disabled><i class="fas fa-clock" aria-hidden="true"></i> Đã gửi lời mời</button>`;
  if (trangThai === 'nhan') return `<button type="button" class="${lop}btn-primary" data-ket-ban="${esc(uid)}"><i class="fas fa-user-check" aria-hidden="true"></i> Chấp nhận kết bạn</button>`;
  return `<button type="button" class="${lop}btn-secondary" data-ket-ban="${esc(uid)}"><i class="fas fa-user-plus" aria-hidden="true"></i> Kết bạn</button>`;
}
