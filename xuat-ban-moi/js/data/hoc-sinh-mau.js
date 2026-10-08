/* hoc-sinh-mau.js — 8 bạn học mẫu cho chế độ thử (không dùng khi chạy Firebase). */
const nv = (gender, hair, hairColor, skin, expression = 'vui-ve', accessory = 'khong') =>
  ({ gender, hair, hairColor, skin, expression, accessory });

export const BAN_HOC_MAU = [
  { uid: 'mau_1', ten: 'Minh Anh', nhanVat: nv('female', 'nu-duoi-ngua', 'nau', 'sang', 'hao-huc'), ban: 'anh-dao',
    diem: { toan: 9, ly: 8, hoa: 4, sinh: 6, su: 5, dia: 7, anh: 9 } },
  { uid: 'mau_2', ten: 'Quốc Bảo', nhanVat: nv('male', 'nam-re-ngoi', 'den', 'tunhien', 'vui-ve', 'kinh-tron'), ban: 'thi-nghiem',
    diem: { toan: 8, ly: 9, hoa: 10, sinh: 7, su: 3, dia: 4, anh: 5 } },
  { uid: 'mau_3', ten: 'Thu Hà', nhanVat: nv('female', 'nu-bob', 'nauden', 'tunhien'), ban: 'bac-ha',
    diem: { toan: 4, ly: 5, hoa: 6, sinh: 9, su: 9, dia: 8, anh: 7 } },
  { uid: 'mau_4', ten: 'Đức Huy', nhanVat: nv('male', 'nam-xoan', 'nauden', 'ngam', 'hao-huc', 'tai-nghe'), ban: 'neon',
    diem: { toan: 10, ly: 7, hoa: 8, sinh: 5, su: 4, dia: 6, anh: 3 } },
  { uid: 'mau_5', ten: 'Ngọc Lan', nhanVat: nv('female', 'nu-dai-thang', 'den', 'sang', 'vui-ve', 'no-buoc-toc'), ban: 'nang-vang',
    diem: { toan: 5, ly: 4, hoa: 5, sinh: 8, su: 7, dia: 9, anh: 10 } },
  { uid: 'mau_6', ten: 'Gia Khang', nhanVat: nv('male', 'nam-ngan', 'hatde', 'sang', 'buon-ngu'), ban: 'dai-duong',
    diem: { toan: 6, ly: 6, hoa: 7, sinh: 6, su: 8, dia: 9, anh: 4 } },
  { uid: 'mau_7', ten: 'Bảo Ngọc', nhanVat: nv('female', 'nu-duoi-ngua', 'den', 'ngam', 'vui-ve', 'kinh-tron'), ban: 'rung-nhiet-doi',
    diem: { toan: 7, ly: 3, hoa: 9, sinh: 10, su: 6, dia: 5, anh: 8 } },
  { uid: 'mau_8', ten: 'Tuấn Kiệt', nhanVat: nv('male', 'nam-re-ngoi', 'nau', 'tunhien', 'vui-ve', 'mu-luoi-trai'), ban: 'thien-ha',
    diem: { toan: 9, ly: 10, hoa: 5, sinh: 4, su: 7, dia: 6, anh: 6 } }
];
