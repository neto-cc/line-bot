const express = require('express');
const { Client, middleware } = require('@line/bot-sdk');
const admin = require('firebase-admin');
require('dotenv').config();

const app = express();

// LINE Messaging APIの設定
const lineConfig = {
  channelSecret: process.env.CHANNEL_SECRET,
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
};

const client = new Client(lineConfig);

// Firebase Admin SDKの初期化
const firebaseConfig = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  databaseURL: process.env.FIREBASE_DATABASE_URL,
};

admin.initializeApp({
  credential: admin.credential.cert(firebaseConfig),
  databaseURL: firebaseConfig.databaseURL,
});

const db = admin.database();

app.use(express.json());
app.use(middleware(lineConfig)); // LINE middleware

// LINE Webhookエンドポイント
app.post('/webhook', (req, res) => {
  Promise.all(req.body.events.map(handleLineEvent))
    .then((result) => res.json(result))
    .catch((err) => {
      console.error('Error processing LINE event:', err);
      res.status(500).send('Internal Server Error');
    });
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
  } catch (error) {
    console.error('Error writing to Firebase:', error);
    res.status(500).send('Error writing to Firebase');
  }
});

// LINEイベント処理
async function handleLineEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text') {
    return Promise.resolve(null);
  }

  let replyText;
  if (event.message.text === 'こんにちは') {
    replyText = 'こんねと';
  } else if (event.message.text === '年間行事') {
    replyText = 'こちらが年間行事のリンクです:\nhttps://www.iwaki-cc.ac.jp/app/wp-content/uploads/2024/04/2024%E5%B9%B4%E9%96%93%E8%A1%8C%E4%BA%8B%E4%BA%88%E5%AE%9A-_%E5%AD%A6%E7%94%A8.pdf';
  } else {
    replyText = 'おつカレッジ';
  }

  try {
    await db.ref('logs').push({
      userId: event.source.userId,
      message: event.message.text,
      timestamp: Date.now(),
    });
    console.log('Logged message to Firebase');
  } catch (error) {
    console.error('Error logging to Firebase:', error);
  }

  try {
    await client.replyMessage(event.replyToken, {
      type: 'text',
      text: replyText,
    });
  } catch (error) {
    console.error('Error replying to LINE event:', error);
  }
}

// サーバーの開始
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});