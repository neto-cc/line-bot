const express = require('express');
const line = require('@line/bot-sdk');
const admin = require('firebase-admin');
const bodyParser = require('body-parser');
const crypto = require('crypto');
require('dotenv').config();

// 環境変数を利用して設定を取得
const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET,
};

// Firebase Admin SDKの初期化
try {
  const serviceAccount = JSON.parse(process.env.GOOGLE_CREDENTIALS);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: process.env.FIREBASE_DATABASE_URL,
  });
} catch (error) {
  console.error('Firebase initialization error:', error);
  process.exit(1);
}

// Firestoreの参照を取得
const db = admin.firestore();

// Expressアプリの作成
const app = express();

// JSONリクエストのパース
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// LINE署名の検証ミドルウェア
function validateSignature(req, res, next) {
  const signature = req.headers['x-line-signature'];
  const body = JSON.stringify(req.body);
  const hash = crypto.createHmac('sha256', config.channelSecret).update(body).digest('base64');

  if (hash !== signature) {
    console.error('Invalid signature');
    return res.status(403).send('Invalid signature');
  }
  next();
}

// Webhookエンドポイント
app.post('/webhook', validateSignature, async (req, res) => {
  try {
    const events = req.body.events;
    const results = await Promise.all(events.map(handleEvent));
    res.json(results);
  } catch (err) {
    console.error('Error handling webhook:', err);
    res.status(500).end();
  }
});

// LINEクライアントの作成
const client = new line.Client(config);

// イベントを処理する関数
async function handleEvent(event) {
  if (event.type === 'message' && event.message.type === 'text') {
    const userMessage = event.message.text;

    // 年間行事に関するメッセージの処理
    if (userMessage.includes('年間行事')) {
      try {
        const eventDoc = await db.collection('information').doc('annualEvents').get();
        if (!eventDoc.exists) {
          return client.replyMessage(event.replyToken, {
            type: 'text',
            text: '年間行事の情報が見つかりません。',
          });
        }

        const replyMessage = eventDoc.data().url;
        return client.replyMessage(event.replyToken, {
          type: 'text',
          text: `年間行事の情報はこちらです: ${replyMessage}`,
        });
      } catch (error) {
        console.error('Error fetching annual events:', error);
        return client.replyMessage(event.replyToken, {
          type: 'text',
          text: '年間行事の情報を取得中にエラーが発生しました。',
        });
      }
    }

    // デフォルトの応答
    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: `「${userMessage}」についての情報はまだ対応していません。`,
    });
  }

  if (event.type === 'postback') {
    const postbackData = event.postback.data;

    // Firestoreにフィードバックを保存
    try {
      const feedbackData = {
        userId: event.source.userId || 'anonymous',
        feedback: postbackData,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      };

      await db.collection('feedbacks').add(feedbackData);
      console.log('Feedback saved to Firestore');
    } catch (error) {
      console.error('Error saving feedback to Firestore:', error);
    }

    // フィードバックに応答
    if (postbackData === 'feedback=useful') {
      return client.replyMessage(event.replyToken, {
        type: 'text',
        text: 'ご意見ありがとうございます！これからも頑張ります。',
      });
    }

    if (postbackData === 'feedback=not_useful') {
      return client.replyMessage(event.replyToken, {
        type: 'text',
        text: 'ご意見ありがとうございます！改善に努めます。',
      });
    }

    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: '不明な選択です。もう一度お試しください。',
    });
  }

  // 他のイベントタイプには対応しない
  return Promise.resolve(null);
}

// サーバー起動
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});