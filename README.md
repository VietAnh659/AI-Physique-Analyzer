# AI Physique Analyzer — FIX 2

## Lỗi "Failed to fetch"
Lỗi này xảy ra ở tầng kết nối browser → backend, trước cả khi Gemini trả lời.
Vì vậy KHÔNG phải do ảnh.

### Cách chạy trên Windows
1. Giải nén toàn bộ thư mục.
2. Cài Node.js 20+.
3. Mở PowerShell tại thư mục app.
4. Đặt API key:
   `$env:GEMINI_API_KEY="YOUR_GEMINI_API_KEY"`
5. Chạy `start.bat`.
6. Trình duyệt phải mở địa chỉ:
   `http://localhost:3000`
   KHÔNG mở `index.html` bằng double-click.

### Kiểm tra backend
Mở:
`http://localhost:3000/api/health`

Nếu đúng sẽ thấy JSON có:
`"ok": true`

Nếu `geminiKeyConfigured` là `false`, backend đang chạy nhưng chưa nhận API key.

### Nếu vẫn lỗi
Trong DevTools (F12) → Console/Network, lỗi sẽ cho biết request `/api/analyze` có tới localhost hay không.
