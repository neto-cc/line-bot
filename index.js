const express = require('express');
const { Client, middleware } = require('@line/bot-sdk');
require('dotenv').config();

const app = express();

// LINE Messaging APIの設定
const config = {
  channelSecret: process.env.CHANNEL_SECRET,
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
};

// LINEクライアントの作成
const client = new Client(config);

// Content-Typeヘッダーを設定（文字化け対策）
app.use((req, res, next) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  next();
});

// middlewareの適用
app.use(middleware(config));

// Webhookエンドポイントの設定
app.post('/webhook', (req, res) => {
  console.log("Received webhook event:", JSON.stringify(req.body, null, 2));

  // 受信イベントの処理
  Promise.all(req.body.events.map(handleEvent))
    .then((result) => res.json(result))
    .catch((err) => {
      console.error('Error processing event:', err);
      res.status(500).end();
    });
});

// イベント処理関数
async function handleEvent(event) {
  // メッセージイベント以外は無視
  if (event.type !== 'message' || event.message.type !== 'text') {
    return Promise.resolve(null);
  }

  const userMessage = event.message.text;
  let replyMessage;

  // テキストメッセージに応じて返信内容を設定
  if (userMessage === 'こんにちは') {
    replyMessage = 'こんねと';
  } else if (userMessage.includes('年間行事')) {
    replyMessage = 'こちらが年間行事の予定です:\nhttps://www.iwaki-cc.ac.jp/app/wp-content/uploads/2024/04/2024%E5%B9%B4%E9%96%93%E8%A1%8C%E4%BA%8B%E4%BA%88%E5%AE%9A-_%E5%AD%A6%E7%94%9F%E7%94%A8.pdf';
  } else {
    replyMessage = 'おつカレッジ';
  }

  console.log(`Replying with: ${replyMessage}`); // デバッグ用ログ

  // ボタンテンプレートメッセージの作成
  const feedbackTemplate = {
    type: 'template',
    altText: 'フィードバックのお願い',
    template: {
      type: 'buttons',
      text: 'この情報は役に立ちましたか？',
      actions: [
        {
          type: 'postback',
          label: '役に立った',
          data: 'feedback=useful',
        },
        {
          type: 'postback',
          label: '役に立たなかった',
          data: 'feedback=not_useful',
        },
      ],
    },
  };

  // 返信メッセージをLINEに送信
  await client.replyMessage(event.replyToken, [
    { type: 'text', text: replyMessage },
    feedbackTemplate,
  ]);
}

// サーバー起動
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
