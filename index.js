const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();
const port = process.env.PORT || 3000;

// LINEのアクセストークン
const lineAccessToken = 'BTN1AxWHvRj0TZ0RIR/Ul4o0YJMn6I07VTT0BcYeliQJfXlZmRR62G599T1qcojvP/nQFKH2aqa14UiYO7OCNsT7UKFJhU6OB8itSzRB282M9Js6vdW7cVwBdRjaKZmyVq7+AjvCVOoBufRrtZlJ7AdB04t89/1O/w1cDnyilFU='; // 作成したアクセストークンに置き換える

// JSONリクエストボディをパースする
app.use(bodyParser.json());

// LINE Webhookのエンドポイント
app.post('/webhook', (req, res) => {
  const events = req.body.events;

  events.forEach(event => {
    if (event.type === 'message' && event.message.text === 'こんにちは') {
      const replyMessage = {
        replyToken: event.replyToken,
        messages: [
          {
            type: 'text',
            text: 'こんにちは！何か質問ありますか？',
          },
        ],
      };

      // LINE API に返信メッセージを送信
      axios
        .post('https://api.line.me/v2/bot/message/reply', replyMessage, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${lineAccessToken}`,
          },
        })
        .then(() => {
          res.status(200).send('OK');
        })
        .catch(error => {
          console.error(error);
          res.status(500).send('Internal Server Error');
        });
    }
  });
});

// サーバーを起動
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
