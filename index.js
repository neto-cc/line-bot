const express = require('express');
const line = require('@line/bot-sdk');
const admin = require('firebase-admin');

// 環境変数を利用して設定を取得
const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};

// Firebase Admin SDKの初期化
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.FIREBASE_DATABASE_URL,
});
// Firestoreの参照を取得
const db = admin.firestore();

// Expressアプリの作成
const app = express();

// LINE SDKミドルウェアを使用
app.use('/webhook', line.middleware(config));

// LINEクライアントの作成
const client = new line.Client(config);

// Webhookエンドポイント
app.post('/webhook', express.json(), (req, res) => {
  Promise.all(req.body.events.map(handleEvent))
    .then((result) => res.json(result))
    .catch((err) => {
      console.error(err);
      res.status(500).end();
    });
});

// イベントを処理する関数
async function handleEvent(event) {
  if (event.type === 'message' && event.message.type === 'text') {
    const userMessage = event.message.text;

    // 年間行事に関するメッセージの処理
    if (userMessage.includes('年間行事')) {
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
    const feedbackData = {
      userId: event.source.userId || 'anonymous',
      feedback: postbackData,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    };

    await db.collection('feedbacks').add(feedbackData)
      .then(() => {
        console.log('Feedback saved to Firestore');
      })
      .catch((err) => {
        console.error('Error saving feedback to Firestore:', err);
      });

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
