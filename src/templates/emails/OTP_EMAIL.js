module.exports = (otp) => `
<!DOCTYPE html>
<html lang="zh-TW">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>您的OTP驗證碼</title>
</head>
<body>
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #333;">您的OTP驗證碼</h1>
        <p>您好，</p>
        <p>您的一次性登錄驗證碼是：</p>
        <h2 style="color: #4CAF50; font-size: 24px;">${otp}</h2>
        <p>此驗證碼將在 10 分鐘後失效。請勿將此驗證碼分享給他人。</p>
        <p>如果您沒有請求此驗證碼，請忽略此郵件。</p>
        <p>謝謝！</p>
    </div>
</body>
</html>
`;