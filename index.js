const express = require('express');
const { Client, middleware } = require('@line/bot-sdk');
require('dotenv').config();

const app = express();

const config = {
  channelSecret: process.env.CHANNEL_SECRET,
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
};

const client = new Client(config);

app.use(middleware(config));

// Webhookエンドポイント
app.post('/webhook', (req, res) => {
  console.log("Received webhook event:", req.body.events);  // 受け取ったイベント内容をログに出力
  Promise.all(req.body.events.map(handleEvent))
    .then((result) => res.json(result))
    .catch((err) => {
      console.error('Error processing event:', err);
      res.status(500).end();
    });
});

// メッセージの処理
function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text') {
    return Promise.resolve(null);
  }

  let replyText = '';

  // メッセージが「こんにちは」なら「こんねと」、それ以外は「おつカレッジ」
  if (event.message.text === 'こんにちは') {
    replyText = 'こんねと';
  } else {
    replyText = 'おつカレッジ';
  }

  console.log(`Replying with: ${replyText}`); // ログで確認

  const echo = { type: 'text', text: replyText };
  return client.replyMessage(event.replyToken, echo);
}