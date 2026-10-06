# Prompt cho Claude Code: xây trang web Peer Learning

Tôi đang có một trang web học tập cho học sinh lớp 12 nằm ngay trong thư mục này (HTML/CSS/JS thuần, đưa lên GitHub Pages). Tôi muốn bạn xây một trang web **mới** theo cùng phong cách, chủ đề **Peer Learning**: học sinh tìm bạn có điểm mạnh bù cho điểm yếu của mình rồi cùng học trong phòng học ảo. Người dùng là học sinh 17–18 tuổi, phần lớn dùng điện thoại.

Hãy đọc hết prompt này, sau đó trình bày kế hoạch ngắn và chờ tôi đồng ý trước khi viết code.

## 1. Việc đầu tiên: đọc trang web hiện có

- Mở `index.html` và các file liên quan trong thư mục gốc để nắm phong cách: bảng màu, phông chữ, bo góc, kiểu nút, kiểu thẻ, cách bố trí đầu trang, giao diện đăng nhập và ngọn lửa giữ chuỗi.
- Ghi lại các giá trị đó thành biến CSS trong `peer-learning/css/tokens.css` và dùng lại xuyên suốt, để hai trang nhìn là biết cùng một nhà.
- Ghi lại các đường link trò chơi theo môn đang có trên trang cũ (Hoá, Sử, Lí...) để đưa vào tủ sách.
- Không sửa, không xoá file nào của trang cũ. Trang mới nằm trọn trong thư mục `peer-learning/`.

## 2. Những thứ đã có sẵn trong `peer-learning-kit/`

Đừng vẽ lại hay soạn lại các thứ này, hãy chép sang `peer-learning/` và dùng trực tiếp.

| File | Nội dung |
|---|---|
| `assets/peer-assets.js` | Toàn bộ hình SVG, dùng qua biến toàn cục `PeerAssets` |
| `data/de-mau.json` | Bài kiểm tra đầu vào: 7 môn × 10 câu trắc nghiệm, có đáp án và giải thích |
| `xem-truoc-assets.html` | Trang xem trước, mở ra để biết mọi thứ trông thế nào và bố cục trang chủ tôi muốn |

Các hàm trong `PeerAssets` (đều trả về chuỗi SVG):

- `renderCharacter({ gender, hair, expression, hairColor, skin, accessory })` vẽ nhân vật. `gender` là `male` hoặc `female`; biểu cảm gồm `vui-ve`, `hao-huc`, `buon-ngu`, `buon-ba`. Danh sách lựa chọn hợp lệ nằm trong `PeerAssets.CHARACTER_OPTIONS` (kiểu tóc tách theo giới tính), giá mở khoá nằm ở trường `price` hoặc `unlockPrice`.
- `renderDesk(deskId)` vẽ một trong 10 bàn. Tên và giá nằm trong `PeerAssets.DESKS`; bàn `go-soi` miễn phí.
- `renderSeat({ character, deskId })` vẽ nhân vật ngồi sau bàn; `renderSeat({ empty: true, deskId })` vẽ chỗ trống.
- `renderBookshelf(subjects)` vẽ tủ sách, mỗi cuốn là một thẻ `<a>`; `subjects` là mảng `{ id, name, color, href }`.

Dữ liệu nhân vật lưu cho mỗi tài khoản chính là object truyền vào `renderCharacter`. Nếu cần thêm kiểu tóc, phụ kiện hay bàn mới, thêm một mục theo đúng khuôn các mục có sẵn trong file đó, giữ nét viền và cách đặt tên id.

## 3. Công nghệ

- HTML, CSS, JavaScript thuần, không framework, không bước build. Trang phải chạy được bằng Live Server và trên GitHub Pages.
- Phòng học, trò chuyện, bảng trắng và tìm bạn cần dữ liệu dùng chung giữa nhiều máy, điều mà `localStorage` không làm được. Hãy dùng **Firebase** (gói miễn phí, nạp SDK qua CDN): Authentication để đăng nhập, Firestore cho hồ sơ và kết quả, Realtime Database cho phòng học.
- Tôi chưa tạo dự án Firebase. Vì vậy hãy viết tầng dữ liệu tách riêng trong `js/data/` với hai bộ cài đặt cùng một giao diện hàm:
  - `local`: dùng `localStorage` và `BroadcastChannel`, cho phép mở hai tab trên cùng trình duyệt để giả làm hai học sinh. Có sẵn khoảng 8 bạn học mẫu với điểm số khác nhau để màn hình tìm bạn không bị trống.
  - `firebase`: dùng khi `js/firebase-config.js` đã được điền. Trang tự chọn bộ phù hợp và hiện một dòng nhỏ "Đang chạy chế độ thử" khi dùng `local`.
- Viết `HUONG_DAN.md` bằng tiếng Việt, từng bước một cho người không chuyên: tạo dự án Firebase, bật đăng nhập Google, dán cấu hình, dán luật bảo mật, thêm tên miền GitHub Pages vào danh sách được phép, rồi đưa trang lên GitHub bằng cách kéo thả file trên web.
- Toàn bộ chữ trên giao diện và chú thích trong code viết bằng tiếng Việt.

## 4. Các màn hình và chức năng

### 4.1 Đăng nhập và tạo hồ sơ
- Bắt buộc đăng nhập mới vào được trang chủ. Hỗ trợ đăng nhập Google và email kèm mật khẩu; ở chế độ thử dùng tên kèm mã PIN 4 số như trang cũ.
- Lần đầu đăng nhập: nhập tên hiển thị, chọn giới tính, kiểu tóc (theo giới tính), màu tóc, màu da và biểu cảm, có hình xem trước đổi ngay khi chọn. Sau này sửa lại được ở mục "Nhân vật của tôi".

### 4.2 Trang chủ là một phòng học
- Bố cục như phần "Bố cục trang chủ" trong `xem-truoc-assets.html`: bàn học đang dùng ở bên trái, nhân vật ở chính giữa, tủ sách ở bên phải. Trên điện thoại vẫn giữ ba thứ này trong một khung nhìn, thu nhỏ theo tỉ lệ.
- Tủ sách: mỗi cuốn là một môn, bấm vào mở trò chơi của môn đó ở tab mới. Danh sách môn và link nằm trong `data/mon-hoc.json` để tôi tự sửa. Môn chưa có link thì cuốn sách mờ đi và hiện "Sắp có".
- Góc trên hiện chuỗi ngày và số điểm chăm chỉ. Bấm vào bàn học mở cửa hàng, bấm vào nhân vật mở mục chỉnh nhân vật.
- Ba nút chính: "Tìm bạn học", "Học cùng bạn", "Học nhóm". Nếu chưa làm bài kiểm tra đầu vào, hiện lời mời làm bài ngay trên trang chủ.

### 4.3 Giữ chuỗi
- Mỗi ngày đăng nhập (tính theo giờ Việt Nam) chuỗi tăng 1; bỏ một ngày thì chuỗi về 1. Lưu thêm chuỗi dài nhất.
- Hiển thị ngọn lửa theo kiểu trang cũ, có hiệu ứng nhỏ khi chuỗi vừa tăng.

### 4.4 Bài kiểm tra đầu vào
- Đọc từ `data/de-mau.json`. Làm lần lượt từng môn, mỗi môn 10 câu, xáo thứ tự phương án, có thanh tiến độ. Thoát giữa chừng thì lần sau làm tiếp từ chỗ dở.
- Chấm theo `meta.scoring`: mỗi môn 0–10 điểm, từ 8 trở lên là điểm mạnh, từ 5 trở xuống là điểm yếu, có quy tắc dự phòng khi không môn nào chạm ngưỡng.
- Trang kết quả: biểu đồ cột 7 môn, danh sách điểm mạnh và điểm yếu, cho xem lại từng câu kèm giải thích. Cho làm lại, hồ sơ dùng kết quả gần nhất.
- Thêm câu hỏi chỉ cần sửa file JSON, không phải sửa code.

### 4.5 Tìm bạn học bù trừ
- Với mỗi bạn khác, tính:
  - `nhận` = tổng của `max(0, điểm của bạn ấy − điểm của tôi)` trên các môn yếu của tôi
  - `cho` = tổng của `max(0, điểm của tôi − điểm của bạn ấy)` trên các môn yếu của bạn ấy
  - độ hợp = `nhận + cho`, chỉ tính là "bù trừ" khi cả hai đều lớn hơn 0
- Danh sách sắp theo độ hợp giảm dần. Mỗi thẻ hiện nhân vật, tên, và một câu giải thích dễ hiểu, ví dụ: "Bạn ấy giỏi Hoá, môn bạn đang cần. Bạn giỏi Tiếng Anh, môn bạn ấy đang cần."
- Có bộ lọc theo môn muốn được giúp. Nếu không ai bù trừ hai chiều, hiện những bạn giúp được một chiều và nói rõ như vậy.
- Nút "Mời học cùng" tạo một phòng đôi và gửi lời mời; người được mời thấy thông báo khi mở trang và có thể nhận hoặc từ chối.

### 4.6 Phòng học
- **Học cùng bạn**: phòng 2 người, hai bàn cạnh nhau, mỗi bạn ngồi một bàn.
- **Học nhóm**: người tạo nhập số thành viên (2–8), phòng hiện đúng chừng đó bàn. Phòng có mã 6 kí tự; bạn khác bấm "Nhập mã phòng" để vào. Bàn chưa có người hiện dạng chỗ trống.
- Mỗi chỗ ngồi vẽ bằng `renderSeat` với nhân vật và bàn mà bạn đó đang dùng, bên dưới ghi tên và môn mạnh nhất. Nhân vật đổi biểu cảm theo trạng thái bạn đó tự chọn trong phòng.
- Trong phòng có ba công cụ:
  - **Trò chuyện**: tin nhắn hiện ngay cho mọi người, có tên và giờ gửi.
  - **Bảng trắng**: vẽ bằng chuột và bằng ngón tay, có chọn màu, độ dày nét, tẩy, hoàn tác nét của mình và xoá cả bảng. Đồng bộ theo từng nét vẽ, người vào sau vẫn thấy bảng hiện tại.
  - **Đồng hồ phòng**: chủ phòng đặt thời gian (25, 45, 60 phút hoặc tự nhập), bắt đầu, tạm dừng, đặt lại. Mọi người thấy cùng một đồng hồ đếm ngược, tính từ mốc thời gian bắt đầu lưu trên máy chủ chứ không đếm riêng từng máy.
- Rời phòng thì chỗ ngồi trống lại. Phòng không còn ai thì tự đóng.

### 4.7 Điểm chăm chỉ và cửa hàng
- Thời gian học được cộng dồn khi bạn ở trong phòng, đồng hồ phòng đang chạy và tab đang mở. Cứ đủ 60 phút cộng dồn thì nhận 50 điểm chăm chỉ, có thông báo chúc mừng. Hai con số này đặt thành hằng số trong `js/config.js`.
- Cửa hàng có ba quầy: bàn học, phụ kiện nhân vật, màu tóc đặc biệt. Món chưa mua hiện giá, đủ điểm thì mua được, mua rồi thì chọn dùng. Bàn đang dùng xuất hiện ở trang chủ và trong mọi phòng học.

### 4.8 An toàn cho học sinh
- Hồ sơ chỉ có tên hiển thị, nhân vật và điểm các môn; không hiện email hay thông tin cá nhân cho người khác.
- Chỉ vào được phòng bằng lời mời hoặc mã phòng. Trò chuyện có lọc từ ngữ thô tục cơ bản và nút "Báo cáo" lưu lại tin nhắn bị báo cáo để tôi xem.
- Luật bảo mật Firebase: mỗi người chỉ sửa được hồ sơ của chính mình; chỉ thành viên phòng mới đọc và ghi được dữ liệu phòng; mỗi lần ghi chỉ được tăng tối đa 50 điểm chăm chỉ và phải cách lần cộng trước ít nhất 55 phút. Nói rõ trong `HUONG_DAN.md` những gì luật này chưa chặn được khi không có máy chủ riêng.

## 5. Yêu cầu chung về giao diện

- Dùng tốt trên điện thoại màn hình hẹp 360px lẫn máy tính; nút bấm đủ lớn cho ngón tay.
- Điều hướng được bằng bàn phím, có viền focus rõ, hình vẽ có mô tả cho trình đọc màn hình, tôn trọng thiết lập giảm chuyển động.
- Mọi trạng thái trống và lỗi đều có lời hướng dẫn việc cần làm tiếp, ví dụ "Chưa có ai trong phòng. Gửi mã ABC123 cho bạn của bạn."

## 6. Cách làm việc

Làm theo từng giai đoạn. Sau mỗi giai đoạn, tự chạy thử, báo ngắn gọn cho tôi cái gì đã chạy được và cách tôi tự kiểm tra, rồi mới làm tiếp.

1. Đọc trang cũ, dựng khung `peer-learning/`, token giao diện, tầng dữ liệu `local`, đăng nhập và tạo nhân vật.
2. Trang chủ phòng học, tủ sách, giữ chuỗi.
3. Bài kiểm tra đầu vào và trang kết quả.
4. Tìm bạn học và lời mời.
5. Phòng học đôi và nhóm: chỗ ngồi, trò chuyện, bảng trắng, đồng hồ. Kiểm tra bằng hai tab.
6. Điểm chăm chỉ và cửa hàng.
7. Bộ cài đặt `firebase`, luật bảo mật, `HUONG_DAN.md`.

Khi gặp chỗ tôi chưa nói rõ mà ảnh hưởng lớn tới cách dùng, hãy hỏi tôi. Những chi tiết nhỏ thì tự chọn theo hướng đơn giản nhất và ghi lại lựa chọn đó trong báo cáo cuối giai đoạn. Đừng thêm tính năng ngoài danh sách trên.
