const express = require('express');
const mysql = require('mysql2');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
const port = 3000;

const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'ChatBotTests'
});

connection.connect((err) => {
  if (err) {
    console.error('Ошибка подключения к БД:', err.message);
    return;
  }
  console.log('Подключение к MySQL успешно установлено');
});

const TELEGRAM_TOKEN = '8959730384:AAEzPKgK0gK6xrr5onUNWAhAOFDvRohqKXw';
const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });

bot.onText(/\/help/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, '📋 Список команд:\n/help - помощь\n/site - сайт Октагона\n/creator - создатель бота');
});

bot.onText(/\/site/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, '🌐 Сайт Октагона: https://octagon.ru/');
});

bot.onText(/\/creator/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, '👨‍💻 Создатель: Шарафутдинов Олег Денисович'); // ЗАМЕНИТЕ
});

bot.on('message', (msg) => {
  if (msg.text && msg.text.startsWith('/')) return;
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, 'Привет, октагон! Напиши /help');
});

console.log('Telegram бот запущен');

app.get('/', (req, res) => {
  res.send('<h1>Привет, Октагон!</h1>');
});

app.get('/getAllItems', (req, res) => {
  connection.query('SELECT * FROM Items', (err, results) => {
    if (err) return res.json([]);
    res.json(results);
  });
});

app.post('/addItem', (req, res) => {
  const { name, desc } = req.query;
  if (!name || !desc) return res.json(null);
  connection.query('INSERT INTO Items (name, desc) VALUES (?, ?)', [name, desc], (err, result) => {
    if (err) return res.json(null);
    res.json({ id: result.insertId, name, desc });
  });
});

app.post('/deleteItem', (req, res) => {
  const id = req.query.id;
  if (!id || isNaN(Number(id))) return res.json(null);
  connection.query('SELECT * FROM Items WHERE id = ?', [id], (err, results) => {
    if (err) return res.json(null);
    if (results.length === 0) return res.json({});
    const item = results[0];
    connection.query('DELETE FROM Items WHERE id = ?', [id], (err) => {
      if (err) return res.json(null);
      res.json(item);
    });
  });
});

app.post('/updateItem', (req, res) => {
  const { id, name, desc } = req.query;
  if (!id || !name || !desc || isNaN(Number(id))) return res.json(null);
  connection.query('SELECT * FROM Items WHERE id = ?', [id], (err, results) => {
    if (err) return res.json(null);
    if (results.length === 0) return res.json({});
    connection.query('UPDATE Items SET name = ?, desc = ? WHERE id = ?', [name, desc, id], (err) => {
      if (err) return res.json(null);
      res.json({ id: Number(id), name, desc });
    });
  });
});

app.listen(port, () => {
  console.log(`Сервер запущен на http://localhost:${port}`);
});