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

  // 年間行事に該当するかチェック
  if (userMessage.includes('年間行事')) {
    const replyMessage = 'こちらが年間行事の予定です:\nhttps://www.iwaki-cc.ac.jp/app/wp-content/uploads/2024/04/2024%E5%B9%B4%E9%96%93%E8%A1%8C%E4%BA%8B%E4%BA%88%E5%AE%9A-_%E5%AD%A6%E7%94%9F%E7%94%A8.pdf';

    // フィードバックテンプレート
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

    // LINEに複数メッセージを送信
    console.log(`Replying with message and feedback: ${replyMessage}`);
    return client.replyMessage(event.replyToken, [
      { type: 'text', text: replyMessage },
      feedbackTemplate,
    ]);
  }

  // オーキャンに該当するかチェック
  if (userMessage.includes('オープンキャンパス')) {
    const replyMessage = 'こちらがオープンキャンパスの予定です:\nhttps://www.iwaki-cc.ac.jp/app/wp-content/uploads/2024/04/%E3%83%9D%E3%82%B9%E3%82%BF%E3%83%BC%E6%9C%80%E7%B5%82PNG%E5%8C%96.png';
    
	// フィードバックテンプレート
    const feedbackTemplate = {
      type: 'template',
      altText: 'フィードバックのお願い',
      template: {
        type: 'buttons',
        text: 'この情報は役に立ちましたか？',
        actions: [
          {
            type: 'button',
            label: '役に立った',
            data: 'feedback=useful',
          },
          {
            type: 'button',
            label: '役に立たなかった',
            data: 'feedback=not_useful',
          },
        ],
      },
    };

    // LINEに複数メッセージを送信
    console.log(`Replying with message and feedback: ${replyMessage}`);
    return client.replyMessage(event.replyToken, [
      { type: 'text', text: replyMessage },
      feedbackTemplate,
    ]);
  }



  // それ以外のメッセージへの応答
  const defaultReply = userMessage === 'こんにちは' ? 'こんねと' : 'おつカレッジ';
  console.log(`Replying with default message: ${defaultReply}`);
  return client.replyMessage(event.replyToken, { type: 'text', text: defaultReply });
}

// サーバー起動
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
