const express = require('express');
const { Client, middleware } = require('@line/bot-sdk');

// LINE Bot 設定
const config = {
  channelAccessToken: 'BTN1AxWHvRj0TZ0RIR/Ul4o0YJMn6I07VTT0BcYeliQJfXlZmRR62G599T1qcojvP/nQFKH2aqa14UiYO7OCNsT7UKFJhU6OB8itSzRB282M9Js6vdW7cVwBdRjaKZmyVq7+AjvCVOoBufRrtZlJ7AdB04t89/1O/w1cDnyilFU=', // チャネルアクセストークン
  channelSecret: 'e1ac90592056c3c16efdd3797fc28fb9',           // チャネルシークレット
};

const app = express();

// LINE Middleware 設定
app.use('/webhook', middleware(config));

// LINE クライアント
const client = new Client(config);

// Webhook 処理
app.post('/webhook', (req, res) => {
  Promise.all(req.body.events.map(handleEvent))
    .then((result) => res.json(result))
    .catch((err) => {
      console.error(err);
      res.status(500).end();
    });
});

// イベント処理関数
function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text') {
    return Promise.resolve(null);
  }

  // 応答メッセージ
  return client.replyMessage(event.replyToken, {
    type: 'text',
    text: `「${event.message.text}」って言いましたね！`,
  });
}

// サーバー起動
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
