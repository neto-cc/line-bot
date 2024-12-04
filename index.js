// 必要なパッケージのインポート
const express = require('express');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const line = require('@line/bot-sdk');  // LINE SDKのインポート

// Expressアプリケーションの作成
const app = express();

// 必要なミドルウェアの設定
app.use(bodyParser.json());  // JSON形式のリクエストボディを解析するミドルウェア

// LINEのチャンネル設定
const config = {
  channelAccessToken: 'YOUR_CHANNEL_ACCESS_TOKEN', // チャンネルアクセストークン
  channelSecret: 'YOUR_CHANNEL_SECRET',             // チャンネルシークレット
};

// LINEクライアントの作成
const client = new line.Client(config);

// 署名検証関数
function verifySignature(req, secret) {
  const signature = req.headers['x-line-signature']; // LINEの署名ヘッダーを取得
  const body = JSON.stringify(req.body); // リクエストボディをJSONとして文字列化

  const hash = crypto.createHmac('SHA256', secret)  // チャンネルシークレットを使用
    .update(body)
    .digest('base64'); // ハッシュをbase64エンコード

  console.log('Calculated Hash:', hash);  // デバッグ用に計算されたハッシュをログに出力
  console.log('Received Signature:', signature);  // 受信した署名をログに出力

  return signature === hash;  // 計算した署名と受信した署名が一致するかを確認
}

// Webhookエンドポイント
app.post('/webhook', (req, res) => {
  try {
    // 署名の検証
    if (!verifySignature(req, config.channelSecret)) {
      return res.status(400).send('Invalid signature');  // 署名が無効な場合は400エラーを返す
    }

    // Webhookイベントを処理
    const events = req.body.events;
    events.forEach(event => {
      // イベントのタイプがメッセージであれば処理
      if (event.type === 'message' && event.message.type === 'text') {
        const replyToken = event.replyToken;
        const message = {
          type: 'text',
          text: `受け取ったメッセージ: ${event.message.text}`, // 受け取ったメッセージをそのまま返す
        };

        // メッセージの返信
        client.replyMessage(replyToken, message)
          .then(() => {
            console.log('Successfully replied to message');
          })
          .catch((err) => {
            console.error('Error replying message:', err);
          });
      }
    });

    // LINEプラットフォームに200 OKを返す
    res.status(200).send('OK');
  } catch (err) {
    console.error('Error processing webhook:', err);
    res.status(500).send('Internal Server Error');  // サーバー内部エラーの際は500を返す
  }
});

// サーバーの起動
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
