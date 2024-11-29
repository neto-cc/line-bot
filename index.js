const express = require('express');
const { Client, middleware } = require('@line/bot-sdk');
require('dotenv').config();

const app = express();

const config = {
  channelSecret: process.env.CHANNEL_SECRET,
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
};

const client = new Client(config);

app.use(middleware(config));

// Webhook�G���h�|�C���g
app.post('/webhook', (req, res) => {
  console.log("Received webhook event:", req.body.events);  // �󂯎�����C�x���g���e�����O�ɏo��
  Promise.all(req.body.events.map(handleEvent))
    .then((result) => res.json(result))
    .catch((err) => {
      console.error('Error processing event:', err);
      res.status(500).end();
    });
});

// ���b�Z�[�W�̏���
function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text') {
    return Promise.resolve(null);
  }

  let replyText = '';

  // �����Ă������b�Z�[�W���u����ɂ��́v�ł���΁u����˂Ɓv�A����ȊO�́u���J���b�W�v
  if (event.message.text.trim() === '����ɂ���') {
    replyText = '����˂�';
  } else {
    replyText = '���J���b�W';
  }

  console.log("Replying with:", replyText);  // �ԐM����e�L�X�g�����O�ɏo��

  const echo = { type: 'text', text: replyText };
  
  // �ԐM���b�Z�[�W�𑗐M
  return client.replyMessage(event.replyToken, echo)
    .catch((err) => {
      console.error('Error sending reply:', err);
    });
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});