const express = require('express');
const line = require('@line/bot-sdk');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// LINE Messaging APIの設定
const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};

const client = new line.Client(config);

// Webhookエンドポイント
app.post('/webhook', line.middleware(config), (req, res) => {
  Promise.all(req.body.events.map(handleEvent))
    .then((result) => res.json(result))
    .catch((err) => {
      console.error(err);
      res.status(500).end();
    });
});

// メッセージを処理する関数
const handleEvent = (event) => {
  if (event.type !== 'message' || event.message.type !== 'text') {
    return Promise.resolve(null);
  }

  // 応答メッセージを作成
  const replyMessage = {
    type: 'text',
    text: `あなたのメッセージ: ${event.message.text}`,
  };

  // メッセージを返信
  return client.replyMessage(event.replyToken, replyMessage);
};

// サーバーの起動
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
