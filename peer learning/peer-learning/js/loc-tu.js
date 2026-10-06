/*
 * loc-tu.js — Lọc từ ngữ thô tục cơ bản trong trò chuyện (thay bằng ***).
 * Muốn thêm từ: thêm vào danh sách TU_CAM (viết thường, có dấu hoặc không dấu đều được).
 * So khớp theo nguyên từ để không che nhầm chữ bình thường.
 */
const TU_CAM = [
  'đụ', 'đù', 'địt', 'đéo', 'đếch', 'đĩ', 'lồn', 'buồi', 'cặc',
  'đm', 'đmm', 'dm', 'dmm', 'đcm', 'dcm', 'đkm', 'vcl', 'vkl', 'vl', 'vãi lồn', 'vãi l',
  'clgt', 'cmm', 'cmn', 'ccc', 'óc chó', 'oc cho', 'mất dạy', 'ngu như bò', 'thằng ngu', 'con ngu',
  'du ma', 'đụ má', 'đù má', 'địt mẹ', 'dit me', 'đéo mẹ',
  'fuck', 'fucking', 'shit', 'bitch', 'dick', 'pussy', 'asshole', 'wtf'
];

const thoat = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// Ranh giới từ: không phải chữ cái (kể cả chữ có dấu) hoặc chữ số
const MAU = new RegExp(
  '(^|[^\\p{L}\\p{N}])(' + TU_CAM.sort((a, b) => b.length - a.length).map(thoat).join('|') + ')(?=$|[^\\p{L}\\p{N}])',
  'giu'
);

/** Trả về chuỗi đã che từ cấm. */
export function locTu(s) {
  return String(s).normalize('NFC').replace(MAU, (_, dau, tu) => dau + '*'.repeat(Math.max(3, tu.length)));
}
