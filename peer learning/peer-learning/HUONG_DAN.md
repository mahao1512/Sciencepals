# Hướng dẫn đưa trang "Học Cùng Bạn" lên mạng

Tài liệu này dành cho người không chuyên. Làm lần lượt từng bước, mỗi bước chỉ cần trình duyệt (nên dùng Chrome trên máy tính). Tổng thời gian khoảng 30–45 phút.

---

## Trước khi bắt đầu: hai chế độ chạy

| Chế độ | Khi nào | Dữ liệu nằm ở đâu |
|---|---|---|
| **Chế độ thử** | `js/firebase-config.js` còn để trống | Chỉ trên trình duyệt đang dùng. Trang hiện dòng vàng *"Đang chạy chế độ thử"*. Đăng nhập bằng tên + mã PIN 4 số, có sẵn 8 bạn học mẫu. |
| **Chế độ thật** | Đã dán cấu hình Firebase (bước 5) | Trên máy chủ Firebase, mọi máy dùng chung. Đăng nhập bằng Google hoặc email. |

Muốn thử ngay trên máy mình mà chưa cần Firebase: mở thư mục `peer-learning` bằng **Live Server** (VS Code) rồi mở `index.html`. Mở thêm một tab, bấm Đăng xuất **trong tab đó**, đăng nhập một tên khác là có hai học sinh để thử phòng học.

> Dữ liệu ở chế độ thử **không** tự chuyển sang chế độ thật.

---

## Bước 1. Tạo dự án Firebase (miễn phí)

1. Vào <https://console.firebase.google.com> và đăng nhập bằng tài khoản Google của bạn (nên dùng tài khoản của thầy cô / nhà trường, không dùng tài khoản học sinh).
2. Bấm **Create a project** (Tạo dự án).
3. Đặt tên, ví dụ `hoc-cung-ban`. Bấm **Continue**.
4. Ở màn hình Google Analytics: **tắt** đi (không cần). Bấm **Create project**, đợi khoảng 1 phút rồi bấm **Continue**.

Dự án mới mặc định dùng gói **Spark** (miễn phí). Không cần nhập thẻ thanh toán.

## Bước 2. Bật đăng nhập Google và email

1. Ở menu bên trái chọn **Build → Authentication**, bấm **Get started**.
2. Ở thẻ **Sign-in method**:
   - Bấm **Google** → gạt **Enable** → chọn email hỗ trợ (email của bạn) → **Save**.
   - Bấm **Add new provider** → **Email/Password** → gạt **Enable** dòng đầu tiên (không cần bật "Email link") → **Save**.

## Bước 3. Tạo Firestore và dán luật bảo mật

Firestore lưu hồ sơ, kết quả bài kiểm tra, lời mời và báo cáo.

1. Menu trái: **Build → Firestore Database** → **Create database**.
2. Chọn vị trí **asia-southeast1 (Singapore)** cho gần Việt Nam → **Next**.
3. Chọn **Start in production mode** → **Create**.
4. Khi tạo xong, mở thẻ **Rules** (Luật).
5. Mở file `peer-learning/firestore.rules` bằng Notepad, **chép toàn bộ**, dán đè lên nội dung đang có trong ô luật.
6. Bấm **Publish**.

## Bước 4. Tạo Realtime Database và dán luật bảo mật

Realtime Database lo phần phòng học: chỗ ngồi, trò chuyện, bảng trắng, đồng hồ.

1. Menu trái: **Build → Realtime Database** → **Create Database**.
2. Chọn vị trí **Singapore (asia-southeast1)** → **Next**.
3. Chọn **Start in locked mode** → **Enable**.
4. Mở thẻ **Rules**.
5. Mở file `peer-learning/database.rules.json` bằng Notepad, **chép toàn bộ**, dán đè lên nội dung trong ô luật.
6. Bấm **Publish**.

## Bước 5. Lấy cấu hình và dán vào trang web

1. Bấm biểu tượng bánh răng ⚙ cạnh **Project Overview** → **Project settings**.
2. Kéo xuống mục **Your apps**, bấm biểu tượng **`</>`** (Web).
3. Đặt tên ứng dụng (ví dụ `hoc-cung-ban-web`). **Không** tích "Firebase Hosting". Bấm **Register app**.
4. Firebase hiện một đoạn mã có `const firebaseConfig = { ... }`. Bạn chỉ cần các dòng bên trong dấu `{ }`.
5. Mở file `peer-learning/js/firebase-config.js` bằng Notepad. Thay các dòng `''` bằng giá trị tương ứng. Kết quả trông như sau (các giá trị của bạn sẽ khác):

   ```js
   export const firebaseConfig = {
     apiKey: 'AIzaSy...',
     authDomain: 'hoc-cung-ban.firebaseapp.com',
     databaseURL: 'https://hoc-cung-ban-default-rtdb.asia-southeast1.firebasedatabase.app',
     projectId: 'hoc-cung-ban',
     storageBucket: 'hoc-cung-ban.appspot.com',
     messagingSenderId: '1234567890',
     appId: '1:1234567890:web:abcdef'
   };
   ```

6. **Kiểm tra dòng `databaseURL`.** Nếu đoạn mã Firebase đưa không có dòng này, hãy lấy địa chỉ ở đầu trang **Realtime Database → Data** (bắt đầu bằng `https://` và kết thúc bằng `firebasedatabase.app` hoặc `firebaseio.com`).
7. Lưu file.

> `apiKey` **không phải** mật khẩu bí mật. Ai mở trang web cũng thấy được, đó là bình thường. Dữ liệu được bảo vệ bằng luật bảo mật ở bước 3 và 4.

## Bước 6. Cho phép tên miền GitHub Pages đăng nhập

1. Vào **Authentication → Settings → Authorized domains** (Tên miền được phép).
2. Bấm **Add domain** và thêm tên miền GitHub Pages của bạn, dạng `tentaikhoan.github.io` (chỉ phần tên miền, không có `https://`, không có đường dẫn phía sau).
3. Nếu bạn thử bằng Live Server trên máy, thêm cả `127.0.0.1` (dòng `localhost` thường có sẵn).

Bỏ qua bước này thì nút đăng nhập sẽ báo *"Tên miền này chưa được phép đăng nhập"*.

## Bước 7. Đưa trang lên GitHub bằng cách kéo thả

Trang cũ của bạn đã có trên GitHub Pages, nên chỉ cần thêm thư mục `peer-learning` vào **cùng kho (repository)** đó.

1. Mở trang kho của bạn trên <https://github.com> (kho đang chứa `index.html` của trang cũ).
2. Bấm **Add file → Upload files**.
3. Mở File Explorer, **kéo cả thư mục `peer-learning`** thả vào khung tải lên (Chrome và Edge giữ nguyên cấu trúc thư mục con).
4. Đợi tải xong, kéo xuống, ghi chú ví dụ `Thêm trang Học Cùng Bạn`, bấm **Commit changes**.
5. Đợi 1–2 phút. Trang mới nằm ở:
   `https://tentaikhoan.github.io/tenkho/peer-learning/`
   (nếu kho tên là `tentaikhoan.github.io` thì địa chỉ là `https://tentaikhoan.github.io/peer-learning/`).

**Sửa một file sau này** (ví dụ cấu hình): vào thư mục `peer-learning` trên GitHub → bấm vào file → biểu tượng bút chì ✏️ → sửa → **Commit changes**. Hoặc tải lại file đã sửa bằng **Upload files** (file cùng tên sẽ bị thay).

**Kho mới, chưa bật GitHub Pages:** vào **Settings → Pages**, ở mục *Branch* chọn `main` và `/ (root)`, bấm **Save**.

> Không đưa thư mục `.claude` lên. Thư mục `peer-learning-kit` cũng không cần thiết.

## Bước 8. Kiểm tra

1. Mở địa chỉ trang trên điện thoại, đăng nhập bằng Google, tạo nhân vật, làm bài kiểm tra.
2. Nhờ một bạn khác (hoặc dùng máy khác, tài khoản khác) làm tương tự. Vào **Tìm bạn học**, bấm **Mời học cùng**, rồi thử trò chuyện, vẽ bảng trắng và chạy đồng hồ.
3. Dòng vàng "Đang chạy chế độ thử" **không** còn xuất hiện nghĩa là trang đã dùng Firebase.

Gặp lỗi: mở trang trên máy tính, nhấn **F12 → Console** và đọc dòng màu đỏ. Thường gặp:
- `permission-denied` / `PERMISSION_DENIED`: chưa dán luật ở bước 3 hoặc 4, hoặc chưa bấm **Publish**.
- `Can't determine Firebase Database URL`: thiếu `databaseURL` (bước 5, ý 6).
- `auth/unauthorized-domain`: chưa làm bước 6.

---

## Xem tin nhắn bị báo cáo

Vào **Firestore Database → Data → baoCao**. Mỗi báo cáo gồm: mã phòng, nội dung tin nhắn, tên và mã người gửi tin, lí do, người báo cáo, thời điểm. Trang web không cho học sinh xem mục này.

Nội dung trò chuyện nằm ở **Realtime Database → Data → phong → (mã phòng) → tin** cho tới khi phòng đóng.

## Đề bài chung trong phòng

- Trong phòng có thẻ **Đề bài**. Bấm **Chụp đề** để chụp đề giấy bằng máy ảnh điện thoại, hoặc **Tải ảnh / PDF**. Mỗi đề tối đa 10 trang. Trước khi gửi có thể xoay trang bị ngược, xoá trang chụp hỏng, chụp thêm trang.
- Đề của **chủ phòng** hiện ngay cho cả phòng. Đề của **thành viên khác** được gửi tới chủ phòng; chủ phòng xem trước rồi bấm *Duyệt* hoặc *Không duyệt*.
- Mỗi người tự lật trang, phóng to, thu nhỏ. Chủ phòng có nút **Gỡ đề**.
- Ảnh và PDF được nén thành ảnh JPEG nhỏ (khoảng 100–250 KB mỗi trang) **ngay trên máy học sinh**, rồi lưu cùng phòng trong Realtime Database. Không cần Firebase Storage nên vẫn dùng được gói miễn phí. **Đề tự xoá khi phòng đóng.**
- PDF được đọc bằng thư viện pdf.js, tải từ cdnjs khi có người chọn file PDF.
- Mỗi lần có người vào phòng là một lần tải đề về máy. Với gói miễn phí (10 GB tải về mỗi tháng), một đề 10 trang khoảng 2,5 MB nên đủ cho vài nghìn lượt vào phòng mỗi tháng. Xem mức dùng ở **Realtime Database → Usage**.

## Thú ảo và Sổ tay cảm xúc

- **Thú ảo** đi dạo trên mọi trang: rê chuột hoặc ngón tay lại gần thì thú chạy theo; bấm vào thú thì nó nhảy lên và kể một điều thú vị; kéo thả để bế thú đi chỗ khác. Nút 🐾 ở góc dưới bên trái để chọn thú, cho ăn, vuốt ve, ẩn hoặc hiện thú.
- Có 11 thú. Gà Con có sẵn; các thú khác mở khoá khi chuỗi ngày (chuỗi hiện tại hoặc chuỗi dài nhất) đạt 10, 20, 30, …, 100 ngày.
- Thú đang chọn và độ no, độ vui **lưu trên từng máy** (đổi máy thì thú về mặc định, nhưng thú đã mở khoá vẫn giữ nguyên vì tính theo chuỗi).
- **Sổ tay cảm xúc** là cuốn sách hồng ở ngăn cuối tủ sách (trên điện thoại: chạm vào tủ sách để mở tủ lớn rồi chọn cuốn sổ). Mỗi ngày một trang gồm: câu hỏi định hướng của ngày (cảm xúc, sở thích, hướng nghiệp), điều đã làm được, điều chưa làm được, ngày mai mình sẽ…, cảm xúc trong ngày và sticker.
- Mỗi thú có 5 sticker cảm xúc (Vui quá, Buồn xíu, Mệt rồi, Thương mình, Cố lên), dùng được khi đã mở khoá thú đó. Mỗi trang dán tối đa 15 sticker.
- Nút **📅 100 ngày** mở trang tổng hợp 100 ngày gần nhất; chạm một ngày để mở lại trang đó.
- Nhật ký **chỉ chủ tài khoản đọc được**, kể cả các bạn trong phòng học. Thầy cô cũng không xem được từ trang web. Trong Firebase Console, người quản lí dự án vẫn thấy được dữ liệu, nên hãy nói trước với học sinh điều này.

> **Đã dán luật Firestore từ trước?** Hãy dán lại toàn bộ `firestore.rules` và bấm **Publish**, vì luật mới có thêm phần sổ tay (`nhatKy`). Thiếu bước này, sổ tay sẽ báo *"Chưa mở được sổ tay"*.

## Những chỗ bạn có thể tự sửa

| Muốn | Sửa file |
|---|---|
| Thêm / đổi link trò chơi trên tủ sách | `data/mon-hoc.json` (`href` để trống `""` thì sách hiện "Sắp có") |
| Thêm câu hỏi kiểm tra | `data/de-mau.json` (thêm vào mảng `questions` của môn; mỗi lần làm sẽ bốc ngẫu nhiên 10 câu) |
| Đổi 60 phút / 50 điểm, ngưỡng hiện ngọn lửa | `js/config.js` (nhớ sửa cả số `50` và `55` trong `firestore.rules` cho khớp) |
| Thêm từ cấm trong trò chuyện | `js/loc-tu.js` |
| Đổi thú ảo, mốc mở khoá, 5 cảm xúc sticker | `js/thu-cung.js` |
| Thêm câu hỏi định hướng cho sổ tay | `js/ui/so-tay.js` (danh sách `CAU_HOI`) |
| Thêm bàn, phụ kiện, màu tóc | `assets/peer-assets.js`, thêm theo khuôn các mục có sẵn |

---

## Luật bảo mật bảo vệ được gì, và chưa chặn được gì

### Đã chặn được

- Mỗi người **chỉ sửa được hồ sơ của chính mình**. Hồ sơ công khai chỉ có tên hiển thị, nhân vật, bàn học và điểm các môn. Email nằm ở Firebase Authentication, không ai đọc được từ trang web.
- Dữ liệu riêng (chuỗi ngày, điểm chăm chỉ, đồ đã mua, chi tiết bài làm) chỉ chủ tài khoản đọc được.
- **Chỉ thành viên phòng** mới đọc và ghi được trò chuyện, bảng trắng, đồng hồ và danh sách thành viên. Muốn thành thành viên phải giành được một ghế trống, mà muốn vậy thì phải biết mã phòng (từ lời mời hoặc được bạn gửi). Phòng đầy thì không ai chen thêm được.
- Không ai gửi tin nhắn giả danh người khác: tên và mã người gửi phải khớp với chính người đang đăng nhập. Tin nhắn dài tối đa 300 kí tự.
- Chỉ người vẽ mới xoá được nét của mình; chỉ chủ phòng điều khiển được đồng hồ; mốc bắt đầu đồng hồ lấy theo giờ máy chủ.
- Đề bài: chỉ thành viên phòng xem được; chỉ chủ phòng đưa đề lên, duyệt hoặc gỡ đề. Thành viên chỉ gửi được đề *chờ duyệt* của chính mình, và chỉ chủ phòng cùng người gửi xem được đề chờ duyệt đó. Mỗi đề tối đa 10 trang, mỗi trang phải là ảnh JPEG không quá khoảng 450 KB.
- **Điểm chăm chỉ**: mỗi lần ghi chỉ tăng tối đa 50 điểm, và phải cách lần cộng trước ít nhất 55 phút (tính theo giờ máy chủ Firebase, học sinh không chỉnh được). Không sửa ngược được mốc thời gian để "lách".
- Lời mời: chỉ người được mời mới trả lời được, và chỉ được chọn "nhận" hoặc "từ chối".
- Báo cáo: học sinh chỉ gửi được, không ai đọc hay xoá được từ trang web.

### Chưa chặn được (vì trang không có máy chủ riêng)

Trang chạy hoàn toàn trên máy học sinh, Firebase chỉ kiểm tra từng lần ghi theo luật. Một học sinh **rành kĩ thuật** (biết dùng công cụ lập trình để gửi lệnh thẳng tới Firebase, bỏ qua trang web) vẫn có thể:

1. **Tự cộng điểm chăm chỉ mà không học**: luật chỉ giới hạn *50 điểm mỗi 55 phút*, không biết người đó có thật sự ở trong phòng với đồng hồ đang chạy hay không. Mức tối đa vẫn bị giới hạn khoảng 1.300 điểm/ngày.
2. **Lấy đồ trong cửa hàng mà không trừ điểm**: luật không biết giá từng món.
3. **Khai sai điểm bài kiểm tra hoặc chuỗi ngày**: luật không chấm lại bài, không biết hôm qua người đó có đăng nhập hay không. Điểm các môn bị khai sai sẽ làm kết quả ghép bạn kém chính xác.
4. **Gửi tin nhắn có từ tục**: bộ lọc từ chạy trên máy học sinh nên có thể bị bỏ qua. Nút "Báo cáo" vẫn hoạt động để bạn xử lí.
5. **Gửi báo cáo bịa** (báo cáo một tin nhắn không có thật), hoặc **gửi rất nhiều lời mời** làm phiền bạn khác.
6. Thành viên trong phòng **chuyển quyền chủ phòng** cho một thành viên khác.
7. Người đã đăng nhập mà biết mã phòng thì xem được *mã tài khoản* của những người đang ngồi (không có tên, email hay nội dung trò chuyện).
8. **Ai có tài khoản Google cũng đăng nhập được**, không giới hạn trong học sinh trường bạn.
9. **Nội dung ảnh đề**: luật chỉ kiểm tra đó là ảnh JPEG và không quá lớn, không biết trong ảnh có thật là đề bài hay không. Việc chủ phòng duyệt chặn được ảnh không phù hợp do thành viên gửi, nhưng không chặn được ảnh do chính chủ phòng đưa lên. Học sinh có thể báo cáo trong phần trò chuyện để thầy cô xử lí.

Ngoài ra, phòng bị bỏ trống do mất kết nối (đóng app đột ngột) có thể còn sót lại trong Realtime Database cho tới khi có người thử vào bằng mã đó. Các phòng này rất nhỏ, có thể xoá tay trong **Realtime Database → Data → phong**.

**Muốn chặn hết những điều trên** thì cần một máy chủ riêng, ví dụ *Cloud Functions for Firebase*: nó tự tính thời gian học, tự trừ điểm khi mua, tự chấm bài và lọc tin nhắn. Cloud Functions đòi chuyển sang gói **Blaze** (trả theo mức dùng, phải gắn thẻ thanh toán), nên bản hiện tại chưa dùng.

---

## Giới hạn của gói miễn phí (Spark)

- Realtime Database: tối đa **100 kết nối cùng lúc**, tức khoảng 100 học sinh mở trang cùng một lúc. Quá số này thì người vào sau phải chờ.
- Firestore: 50.000 lượt đọc và 20.000 lượt ghi mỗi ngày, đủ cho vài trăm học sinh dùng hằng ngày.
- Xem mức dùng ở **Project Overview → Usage and billing**.
