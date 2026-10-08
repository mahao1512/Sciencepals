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
