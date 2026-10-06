/*
 * loi-moi.js — Hiện lời mời học cùng trên mọi trang.
 * Người được mời: thông báo có nút "Nhận" / "Từ chối".
 * Người mời: báo lại khi bạn ấy nhận hoặc từ chối.
 */
import { duLieu } from '../data/index.js';
import { esc, thongBao } from '../tienich.js';

export function ganLoiMoi(ctx) {
  const daHien = new Set();
  const khoaDaBao = 'pl_lm_dabao_' + ctx.uid;
  const docDaBao = () => { try { return JSON.parse(localStorage.getItem(khoaDaBao)) || []; } catch (e) { return []; } };
  const ghiDaBao = (ds) => { try { localStorage.setItem(khoaDaBao, JSON.stringify(ds.slice(-50))); } catch (e) { /* bỏ qua */ } };

  duLieu.theoDoiLoiMoi((ds) => {
    // Lời mời gửi tới tôi, đang chờ trả lời
    ds.filter((lm) => lm.den === ctx.uid && lm.trangThai === 'cho' && !daHien.has(lm.id)).forEach((lm) => {
      daHien.add(lm.id);
      const loai = lm.loai === 'nhom' ? 'phòng học nhóm' : 'phòng học đôi';
      thongBao(`📨 <b>${esc(lm.tenTu || 'Một bạn')}</b> mời bạn vào ${loai} (mã ${esc(lm.maPhong)}).`, {
        nut: [
          { chu: 'Nhận', kieu: 'btn-primary', bam: async () => {
            try { await duLieu.traLoiLoiMoi(lm.id, true); location.href = 'phong.html?ma=' + encodeURIComponent(lm.maPhong); }
            catch (e) { thongBao(esc(e.message) + ' Bạn có thể nhờ bạn ấy gửi lời mời mới.', { loai: 'err' }); }
          } },
          { chu: 'Từ chối', bam: () => duLieu.traLoiLoiMoi(lm.id, false).catch(() => {}) }
        ]
      });
    });
    // Lời mời tôi đã gửi vừa được trả lời
    const daBao = docDaBao();
    ds.filter((lm) => lm.tu === ctx.uid && lm.trangThai !== 'cho' && !daBao.includes(lm.id)).forEach(async (lm) => {
      daBao.push(lm.id);
      ghiDaBao(daBao);
      const ban = await duLieu.layCongKhai(lm.den).catch(() => null);
      const ten = esc(ban?.ten || 'Bạn ấy');
      if (lm.trangThai === 'nhan') {
        thongBao(`🎉 ${ten} đã nhận lời mời và đang vào phòng ${esc(lm.maPhong)}.`, {
          loai: 'ok',
          nut: [{ chu: 'Vào phòng', kieu: 'btn-primary', bam: () => { location.href = 'phong.html?ma=' + encodeURIComponent(lm.maPhong); } }, { chu: 'Đóng' }]
        });
      } else {
        thongBao(`${ten} chưa học cùng được lúc này. Bạn thử mời bạn khác nhé.`);
      }
    });
  });
}
