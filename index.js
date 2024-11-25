const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();
const port = process.env.PORT || 3000;

// LINE�̃A�N�Z�X�g�[�N��
const lineAccessToken = 'BTN1AxWHvRj0TZ0RIR/Ul4o0YJMn6I07VTT0BcYeliQJfXlZmRR62G599T1qcojvP/nQFKH2aqa14UiYO7OCNsT7UKFJhU6OB8itSzRB282M9Js6vdW7cVwBdRjaKZmyVq7+AjvCVOoBufRrtZlJ7AdB04t89/1O/w1cDnyilFU='; // �쐬�����A�N�Z�X�g�[�N���ɒu��������

// JSON���N�G�X�g�{�f�B���p�[�X����
app.use(bodyParser.json());

// LINE Webhook�̃G���h�|�C���g
app.post('/webhook', (req, res) => {
  const events = req.body.events;

  events.forEach(event => {
    if (event.type === 'message' && event.message.text === '����ɂ���') {
      const replyMessage = {
        replyToken: event.replyToken,
        messages: [
          {
            type: 'text',
            text: '����ɂ��́I�������₠��܂����H',
          },
        ],
      };

      // LINE API �ɕԐM���b�Z�[�W�𑗐M
      axios
        .post('https://api.line.me/v2/bot/message/reply', replyMessage, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${lineAccessToken}`,
          },
        })
        .then(() => {
          res.status(200).send('OK');
        })
        .catch(error => {
          console.error(error);
          res.status(500).send('Internal Server Error');
        });
    }
  });
});

// �T�[�o�[���N��
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
