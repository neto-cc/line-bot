const express = require('express');
const { Client, middleware } = require('@line/bot-sdk');
require('dotenv').config();

const app = express();

const config = {
  channelSecret: process.env.CHANNEL_SECRET,
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
};

const client = new Client(config);

app.use((req, res, next) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  next();
});

app.use(middleware(config));

app.post('/webhook', (req, res) => {
  console.log("Received webhook event:", JSON.stringify(req.body, null, 2));
  Promise.all(req.body.events.map(handleEvent))
    .then((result) => res.json(result))
    .catch((err) => {
      console.error('Error processing event:', err);
      res.status(500).end();
    });
});

function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text') {
    return Promise.resolve(null);
  }

  let replyText = '';

  if (event.message.text === '‚±‚ñ‚É‚¿‚Í') {
    replyText = "‚±‚ñ‚Ë‚Æ";
  } else {
    replyText = "‚¨‚ÂƒJƒŒƒbƒW";
  }

  console.log(`Replying with: ${replyText}`);

  const echo = { type: 'text', text: replyText };
  return client.replyMessage(event.replyToken, echo);
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
