/* config.js — Các hằng số có thể chỉnh. Đổi số ở đây, không cần sửa chỗ khác. */

// Học đủ bao nhiêu phút cộng dồn thì được thưởng
export const PHUT_MOI_LAN_THUONG = 60;
// Mỗi lần thưởng được bao nhiêu điểm chăm chỉ
export const DIEM_MOI_LAN_THUONG = 50;

// Chuỗi từ bao nhiêu ngày thì hiện ngọn lửa (giống trang cũ)
export const CHUOI_HIEN_LUA = 3;

// Múi giờ dùng để tính "một ngày" cho chuỗi
export const MUI_GIO = 'Asia/Ho_Chi_Minh';

// Phòng học nhóm: số chỗ nhỏ nhất / lớn nhất
export const PHONG_NHOM_MIN = 2;
export const PHONG_NHOM_MAX = 8;

// Các mốc đồng hồ phòng có sẵn (phút)
export const MOC_DONG_HO = [25, 45, 60];

// Gọi video: máy chủ giúp hai máy tìm đường kết nối với nhau (STUN miễn phí của Google).
// Một số mạng (4G, wifi trường học) chặn kết nối thẳng; khi đó cần thêm máy chủ TURN, ví dụ:
//   { urls: 'turn:dia-chi-turn:3478', username: 'ten', credential: 'mat-khau' }
export const MAY_CHU_ICE = [
  { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }
];
// Số người tối đa trong một cuộc gọi video (mỗi máy kết nối thẳng tới từng người nên càng đông càng nặng)
export const GOI_TOI_DA = 6;

// Bài kiểm tra đầu vào: ngân hàng câu hỏi, số câu bốc ngẫu nhiên mỗi môn, số môn được chọn mỗi lần thi
export const DE_FILE = 'data/ngan-hang-cau-hoi-thpt.json';
export const DE_SO_CAU = 10;
export const DE_MON_MIN = 3;
export const DE_MON_MAX = 7;

// Đề bài chung trong phòng: số trang tối đa mỗi đề, cạnh dài nhất của ảnh sau khi nén (điểm ảnh)
export const DE_TOI_DA_TRANG = 10;
export const DE_CANH_DAI = 1600;

// Uy tín: điểm ban đầu, mức tối thiểu để vào Thi Đấu, số giờ học "sạch" liên tiếp để hồi 1 điểm
export const UY_TIN_GOC = 100;
export const UY_TIN_THI_DAU = 70;
export const GIO_HOI_UY_TIN = 3;
// Mức trừ: bị tố cáo vì lí do nặng (nói tục, bắt nạt, xin thông tin cá nhân) / lí do khác; văng tục 1 từ / từ 2 từ trở lên
export const TRU_TO_CAO_NANG = 10;
export const TRU_TO_CAO_NHE = 5;
export const TRU_VANG_TUC = 5;
export const TRU_VANG_TUC_NANG = 10;

// Bài test tuần: số câu mỗi môn, số môn tối đa, học cùng bạn ít nhất bao nhiêu phút trong 7 ngày thì tính môn của bạn ấy
export const TEST_TUAN_SO_CAU = 10;
export const TEST_TUAN_MON_MAX = 7;
export const TEST_TUAN_PHUT_HOC_CUNG = 10;

// Thi Đấu: số thành viên mỗi đội (= số môn thi), số câu mỗi môn, thời gian mỗi câu, thời gian xem đáp án giữa hai câu
export const DOI_MIN = 3;
export const DOI_MAX = 7;
export const THI_SO_CAU_MOI_MON = 5;
export const THI_GIAY_MOI_CAU = 45;
export const THI_GIAY_NGHI = 4;
// Ngôi sao thưởng mỗi thành viên cho hạng Nhất / Nhì / Ba
export const GIAI_THUONG = {
  tuan: [80, 50, 20],
  thang: [140, 100, 60],
  quy: [200, 150, 100]
};
