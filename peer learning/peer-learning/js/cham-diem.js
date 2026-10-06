/* cham-diem.js — Xếp môn mạnh / yếu theo meta.scoring trong data/de-mau.json. */

export const NGUONG_MAC_DINH = { strongFrom: 8, weakUpTo: 5, maxPerSubject: 10 };

/**
 * diem: { toan: 7, ly: 9, ... } (0–10).
 * Trả về { manh: [...], yeu: [...] } — mỗi danh sách là mã môn, xếp theo điểm.
 * Quy tắc dự phòng: không môn nào đạt ngưỡng mạnh → lấy 2 môn cao nhất làm mạnh;
 * không môn nào chạm ngưỡng yếu → lấy 2 môn thấp nhất (chưa phải môn mạnh) làm yếu.
 * Một môn không bao giờ vừa mạnh vừa yếu.
 */
export function phanLoai(diem, nguong = NGUONG_MAC_DINH) {
  const mon = Object.keys(diem || {});
  if (!mon.length) return { manh: [], yeu: [] };
  const giam = [...mon].sort((a, b) => diem[b] - diem[a]);
  const tang = [...giam].reverse();
  let manh = giam.filter((m) => diem[m] >= nguong.strongFrom);
  let yeu = tang.filter((m) => diem[m] <= nguong.weakUpTo);
  if (!manh.length) {
    manh = giam.slice(0, 2);
    yeu = yeu.filter((m) => !manh.includes(m));
  }
  if (!yeu.length) yeu = tang.filter((m) => !manh.includes(m)).slice(0, 2);
  return { manh, yeu };
}
