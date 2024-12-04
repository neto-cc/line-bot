require('dotenv').config();
const express = require('express');
const { Client, middleware } = require('@line/bot-sdk');
const admin = require('firebase-admin');

// Firebase初期化
const serviceAccount = JSON.parse(process.env.FIREBASE_KEY);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.FIREBASE_DATABASE_URL,
});

const db = admin.database();

// LINE設定
const lineConfig = {
  channelSecret: process.env.CHANNEL_SECRET,
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
};
const client = new Client(lineConfig);

const app = express();
app.use(express.json());
app.use(middleware(lineConfig));

// Webhookエンドポイント
app.post('/webhook', async (req, res) => {
  try {
    const results = await Promise.all(req.body.events.map(handleLineEvent));
    res.json(results);
  } catch (err) {
    console.error('Error processing LINE event:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Firebase書き込みエンドポイント
app.post('/write', async (req, res) => {
  const { path, data } = req.body;
  if (!path || !data) {
    return res.status(400).send('Path and data are required');
  }
  try {
    await db.ref(path).set(data);
    res.status(200).send('Data written successfully!');
  } catch (err) {
    console.error('Error writing to Firebase:', err);
    res.status(500).send('Error writing to Firebase');
  }
});

// LINEイベント処理
async function handleLineEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text') {
    return Promise.resolve(null);
  }

  const userMessage = event.message.text;
  let replyText = 'おつカレッジ';

  if (userMessage === 'こんにちは') {
    replyText = 'こんねと';
  } else if (userMessage === '年間行事') {
    replyText = 'こちらが年間行事のリンクです:\nhttps://www.iwaki-cc.ac.jp/app/wp-content/uploads/2024/04/2024%E5%B9%B4%E9%96%93%E8%A1%8C%E4%BA%8B%E4%BA%88%E5%AE%9A-_%E5%AD%A6%E7%94%A8.pdf';
  }

  try {
    await db.ref('logs').push({
      userId: event.source.userId,
      message: userMessage,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('Error logging to Firebase:', error);
  }

  try {
    await client.replyMessage(event.replyToken, { type: 'text', text: replyText });
  } catch (error) {
    console.error('Error replying to LINE event:', error);
  }
}

// サーバー起動
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server running on port ${port}`));
