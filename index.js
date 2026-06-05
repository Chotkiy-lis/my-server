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
  const helpText = `📋 *Список команд бота:*

/help - показать этот список
/site - ссылка на сайт Октагона
/creator - информация о создателе

🛠️ *Работа с БД:*
/randomItem - случайный предмет
/getItemByID [ID] - найти предмет по ID
/deleteItem [ID] - удалить предмет по ID

📌 *Примеры:*
/getItemByID 1
/deleteItem 2`;

  bot.sendMessage(chatId, helpText, { parse_mode: 'Markdown' });
});

bot.onText(/\/site/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, '🌐 *Сайт Октагона:* https://octagon.ru/', { parse_mode: 'Markdown' });
});

bot.onText(/\/creator/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, '👨‍💻 *Создатель бота:* Шарафутдинов Олег Денисович', { parse_mode: 'Markdown' });
});

bot.onText(/\/randomItem/, (msg) => {
  const chatId = msg.chat.id;
  
  connection.query('SELECT * FROM Items ORDER BY RAND() LIMIT 1', (err, results) => {
    if (err) {
      bot.sendMessage(chatId, '❌ Ошибка базы данных');
      return;
    }
    
    if (results.length === 0) {
      bot.sendMessage(chatId, '📭 В базе данных нет ни одного предмета');
      return;
    }
    
    const item = results[0];
    bot.sendMessage(chatId, `🎲 *Случайный предмет:*\n(${item.id}) - ${item.name}: ${item.desc}`, { parse_mode: 'Markdown' });
  });
});

bot.onText(/\/deleteItem (.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const id = parseInt(match[1]);
  
  if (isNaN(id)) {
    bot.sendMessage(chatId, '❌ Ошибка: ID должен быть числом. Пример: /deleteItem 1');
    return;
  }
  
  connection.query('SELECT * FROM Items WHERE id = ?', [id], (err, results) => {
    if (err) {
      bot.sendMessage(chatId, '❌ Ошибка базы данных');
      return;
    }
    
    if (results.length === 0) {
      bot.sendMessage(chatId, `❌ Ошибка: Предмет с ID ${id} не найден`);
      return;
    }
    
    const item = results[0];
    
    connection.query('DELETE FROM Items WHERE id = ?', [id], (err) => {
      if (err) {
        bot.sendMessage(chatId, '❌ Ошибка при удалении');
        return;
      }
      
      bot.sendMessage(chatId, `✅ Удачно!\nУдалён предмет: (${item.id}) - ${item.name}: ${item.desc}`);
    });
  });
});

bot.onText(/\/getItemByID (.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const id = parseInt(match[1]);
  
  if (isNaN(id)) {
    bot.sendMessage(chatId, '❌ Ошибка: ID должен быть числом. Пример: /getItemByID 1');
    return;
  }
  
  connection.query('SELECT * FROM Items WHERE id = ?', [id], (err, results) => {
    if (err) {
      bot.sendMessage(chatId, '❌ Ошибка базы данных');
      return;
    }
    
    if (results.length === 0) {
      bot.sendMessage(chatId, `❌ Ошибка: Предмет с ID ${id} не найден`);
      return;
    }
    
    const item = results[0];
    bot.sendMessage(chatId, `🔍 *Найден предмет:*\n(${item.id}) - ${item.name}: ${item.desc}`, { parse_mode: 'Markdown' });
  });
});

bot.on('message', (msg) => {
  if (msg.text && msg.text.startsWith('/')) return;
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, 'Привет, октагон! Напиши /help чтобы увидеть список команд.');
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