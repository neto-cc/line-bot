const express = require('express');
const express = require('express');
const { middleware } = require('@line/bot-sdk');
require('dotenv').config();

const config = {
  channelSecret: process.env.CHANNEL_SECRET,
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
};

// 必ずmiddlewareを先に配置
app.use(middleware(config));
app.use(express.json()); // JSONパーサーを後に設定


const client = new Client(config);

app.use((req, res, next) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  next();
});

app.use(middleware(config));

app.post('/webhook', (req, res) => {
  console.log("Received webhook event:", JSON.stringify(req.body, null, 2));
  Promise.all(req.body.events.map(handleEvent))
    .then((result) => res.json(result))
    .catch((err) => {
      console.error('Error processing event:', err);
      res.status(500).end();
    });
});

function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text') {
    return Promise.resolve(null);
  }

  // テキスト返信の例
  const replyText = event.message.text === 'こんにちは' ? 'こんねと' : 'おつカレッジ';
  const message = { type: 'text', text: replyText };

  console.log(`Replying with: ${replyText}`); // ログ確認

  // 正しい形式で返信
  return client.replyMessage(event.replyToken, message);
}


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
