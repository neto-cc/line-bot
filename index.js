const express = require('express');
const line = require('@line/bot-sdk');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// LINE Messaging API�̐ݒ�
const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};

const client = new line.Client(config);

// Webhook�G���h�|�C���g
app.post('/webhook', line.middleware(config), (req, res) => {
  Promise.all(req.body.events.map(handleEvent))
    .then((result) => res.json(result))
    .catch((err) => {
      console.error(err);
      res.status(500).end();
    });
});

// ���b�Z�[�W����������֐�
const handleEvent = (event) => {
  if (event.type !== 'message' || event.message.type !== 'text') {
    return Promise.resolve(null);
  }

  // �������b�Z�[�W���쐬
  const replyMessage = {
    type: 'text',
    text: `���Ȃ��̃��b�Z�[�W: ${event.message.text}`,
  };

  // ���b�Z�[�W��ԐM
  return client.replyMessage(event.replyToken, replyMessage);
};

// �T�[�o�[�̋N��
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
