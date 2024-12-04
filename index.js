const express = require('express');
const { Client, middleware } = require('@line/bot-sdk');
const admin = require('firebase-admin');
const crypto = require('crypto'); // 署名検証に使用
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

app.use(express.json()); // JSONボディをパース
app.use(middleware(lineConfig)); // LINEのmiddlewareをexpressの前に使用

// LINE Webhookエンドポイント
app.post('/webhook', (req, res) => {
  const signature = req.headers['x-line-signature']; // LINEから送られた署名
  const body = JSON.stringify(req.body); // リクエストボディ
  
  if (!verifySignature(body, signature)) {
    console.error('Invalid signature');
    return res.status(400).send('Invalid signature');
  }
  
  Promise.all(req.body.events.map(handleLineEvent))
    .then((result) => res.json(result))
    .catch((err) => {
      console.error('Error processing LINE event:', err);
      res.status(500).send('Internal Server Error');
    });
});

// 署名検証関数
function verifySignature(body, signature) {
  const hash = crypto
    .createHmac('SHA256', lineConfig.channelSecret) // 使用する署名アルゴリズム（SHA256）
    .update(body)
    .digest('base64');
  
  return signature === hash;
}

// LINEイベント処理
async function handleLineEvent(event) {
  console.log('Received event:', event);  // イベントの内容を確認
  
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

  // Firebaseログ書き込み部分
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

  // LINE返信処理部分
  try {
    await client.replyMessage(event.replyToken, {
      type: 'text',
      text: replyText,
    });
    console.log('Replied with:', replyText); // 応答した内容を確認
  } catch (error) {
    console.error('Error replying to LINE event:', error);
  }
}

// サーバーの開始
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
