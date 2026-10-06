/*
 * ghep-ban.js — Tính độ hợp giữa hai học sinh.
 *   nhận = Σ max(0, điểm bạn ấy − điểm tôi)  trên các môn YẾU của tôi
 *   cho  = Σ max(0, điểm tôi − điểm bạn ấy)  trên các môn YẾU của bạn ấy
 *   độ hợp = nhận + cho; "bù trừ" khi cả nhận > 0 và cho > 0.
 */

/** Các môn (kèm mức chênh) mà `a` hơn `b`, chỉ xét trong danh sách môn `trong`. */
function monHon(a, b, trong) {
  return trong
    .map((m) => ({ mon: m, chenh: Math.max(0, (a.diem?.[m] ?? 0) - (b.diem?.[m] ?? 0)) }))
    .filter((x) => x.chenh > 0)
    .sort((x, y) => y.chenh - x.chenh);
}

/** Trả về { nhan, cho, doHop, buTru, monNhan: [...], monCho: [...] }. */
export function tinhDoHop(toi, ban) {
  const monNhan = monHon(ban, toi, toi.yeu || []);
  const monCho = monHon(toi, ban, ban.yeu || []);
  const nhan = monNhan.reduce((s, x) => s + x.chenh, 0);
  const cho = monCho.reduce((s, x) => s + x.chenh, 0);
  return { nhan, cho, doHop: nhan + cho, buTru: nhan > 0 && cho > 0, monNhan, monCho };
}

/** Nối tên môn: "Hoá", "Hoá và Toán", "Hoá, Toán và Sử". */
export function noiTen(ds) {
  if (ds.length <= 1) return ds.join('');
  return ds.slice(0, -1).join(', ') + ' và ' + ds[ds.length - 1];
}

/** Câu giải thích dễ hiểu cho thẻ bạn học. `ten(id)` đổi mã môn thành tên. */
export function giaiThich(kq, ten) {
  const lay = (ds) => noiTen(ds.slice(0, 2).map((x) => ten(x.mon)));
  const cau = [];
  if (kq.monNhan.length) cau.push(`Bạn ấy giỏi ${lay(kq.monNhan)}, môn bạn đang cần.`);
  if (kq.monCho.length) cau.push(`Bạn giỏi ${lay(kq.monCho)}, môn bạn ấy đang cần.`);
  return cau.join(' ');
}
