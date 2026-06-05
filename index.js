const express = require('express');
const app = express();
const port = 3000;

app.get('/', (req, res) => {
  res.send('<h1>Привет, Октагон!</h1>');
});

app.listen(port, () => {
  console.log(`Сервер запущен на http://localhost:${port}`);
});