const express = require('express');
const { Client, middleware } = require('@line/bot-sdk');
const admin = require('firebase-admin');
require('dotenv').config();
const fs = require('fs');

const app = express();

// LINE Messaging APIの設定
const config = {
  channelSecret: process.env.CHANNEL_SECRET,
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
};

// Firebase Admin SDKの初期化
const serviceAccount = JSON.parse(fs.readFileSync(process.env.FIREBASE_SERVICE_ACCOUNT_PATH, 'utf8')); // サービスアカウントのJSONファイルパスを環境変数で指定
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.FIREBASE_DATABASE_URL,
});

const database = admin.database();

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

  Promise.all(req.body.events.map(handleEvent))
    .then((result) => res.json(result))
    .catch((err) => {
      console.error('Error processing event:', err);
      res.status(500).end();
    });
});

// イベント処理関数
async function handleEvent(event) {
  // postbackイベントの処理
  if (event.type === 'postback') {
    const postbackData = event.postback.data;

    if (postbackData === 'feedback=useful' || postbackData === 'feedback=not_useful') {
      return handleFeedback(event, postbackData);
    }

    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: '不明な選択です。もう一度お試しください。',
    });
  }

  // メッセージイベントの処理
  if (event.type === 'message' && event.message.type === 'text') {
    const userMessage = event.message.text;
    const userId = event.source.userId;

    // Firebaseにメッセージを保存
    await saveMessageToFirebase(userId, userMessage);

    // メッセージに応じたレスポンス
    return handleUserMessage(event, userMessage);
  }

  return Promise.resolve(null);  // 他のイベントは無視
}

// フィードバック処理関数
function handleFeedback(event, postbackData) {
  const feedbackResponse = postbackData === 'feedback=useful'
    ? 'ご意見ありがとうございます！これからも頑張ります。'
    : 'ご意見ありがとうございます！改善に努めます。';

  return client.replyMessage(event.replyToken, { type: 'text', text: feedbackResponse });
}

// ユーザーからのメッセージに応じたレスポンス
async function handleUserMessage(event, userMessage) {
  const responseMap = {
    '年間行事': {
      message: 'こちらが年間行事の予定です:\nhttps://www.iwaki-cc.ac.jp/app/wp-content/uploads/2024/04/2024%E5%B9%B4%E9%96%93%E8%A1%8C%E4%BA%8B%E4%BA%88%E5%AE%9A-_%E5%AD%A6%E7%94%9F%E7%94%A8.pdf',
    },
    'オープンキャンパス': {
      message: 'こちらがオープンキャンパスの予定です:\nhttps://www.iwaki-cc.ac.jp/app/wp-content/uploads/2024/04/%E3%83%9D%E3%82%B9%E3%82%BF%E3%83%BC%E6%9C%80%E7%B5%82PNG%E5%8C%96.png',
    },
  };

  const replyMessage = responseMap[userMessage]?.message;

  if (replyMessage) {
    const feedbackTemplate = {
      type: 'template',
      altText: 'フィードバックのお願い',
      template: {
        type: 'buttons',
        text: 'この情報は役に立ちましたか？',
        actions: [
          { type: 'postback', label: '役に立った', data: 'feedback=useful' },
          { type: 'postback', label: '役に立たなかった', data: 'feedback=not_useful' },
        ],
      },
    };

    return client.replyMessage(event.replyToken, [
      { type: 'text', text: replyMessage },
      feedbackTemplate,
    ]);
  }

  // それ以外のメッセージへの応答
  const defaultReply = userMessage === 'こんにちは' ? 'こんねと' : 'おつカレッジ';
  return client.replyMessage(event.replyToken, { type: 'text', text: defaultReply });
}

// Firebaseにメッセージを保存する関数
async function saveMessageToFirebase(userId, message) {
  try {
    const messageRef = database.ref(`messages/${userId}`).push();
    await messageRef.set({
      message,
      timestamp: admin.database.ServerValue.TIMESTAMP,
    });
    console.log('Message saved to Firebase:', { userId, message });
  } catch (error) {
    console.error('Error saving message to Firebase:', error);
  }
}

// サーバー起動
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
