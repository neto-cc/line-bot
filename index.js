const express = require('express');
const { Client, middleware } = require('@line/bot-sdk');
const admin = require('firebase-admin');
require('dotenv').config();

const app = express();

// LINE Messaging APIの設定
const config = {
  channelSecret: process.env.CHANNEL_SECRET,
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
};

// Firebase Admin SDKの初期化
admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  }),
  databaseURL: process.env.FIREBASE_DATABASE_URL,
});

// LINEクライアントの作成
const client = new Client(config);

// Content-Typeヘッダーを設定（文字化け対策）
app.use((req, res, next) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  next();
});

// middlewareの適用 (必ず最初に)
app.use(middleware(config));

// Webhookエンドポイントの設定
app.post('/webhook', (req, res) => {
  console.log("Received webhook event:", JSON.stringify(req.body, null, 2));

  // 署名検証エラーが発生した場合に処理を中止
  if (req.body.signatureValidationFailed) {
    return res.status(400).send('Signature validation failed');
  }

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
  let replyText;

  // テキストメッセージに応じて返信内容を設定
  if (userMessage === 'こんにちは') {
    replyText = 'こんねと';
  } else if (userMessage.includes('年間行事')) {
    replyText = 'こちらが年間行事の予定です:\nhttps://www.iwaki-cc.ac.jp/app/wp-content/uploads/2024/04/2024%E5%B9%B4%E9%96%93%E8%A1%8C%E4%BA%8B%E4%BA%88%E5%AE%9A-_%E5%AD%A6%E7%94%9F%E7%94%A8.pdf';
  } else {
    replyText = 'おつカレッジ';
  }

  console.log(`Replying with: ${replyText}`); // デバッグ用ログ

  // Firebase Realtime Databaseにデータを書き込み
  const db = admin.database();
  const ref = db.ref('line-messages');
  const messageData = {
    userId: event.source.userId,
    message: userMessage,
    timestamp: event.timestamp,
  };

  try {
    await ref.push(messageData);
    console.log('Message saved to Firebase:', messageData);
  } catch (error) {
    console.error('Error saving message to Firebase:', error);
  }

  // 返信メッセージをLINEに送信
  return client.replyMessage(event.replyToken, { type: 'text', text: replyText });
}

// サーバー起動
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
