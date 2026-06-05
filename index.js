const express = require('express');
const mysql = require('mysql2');
const TelegramBot = require('node-telegram-bot-api');
const ytdl = require('@distube/ytdl-core');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegStatic = require('ffmpeg-static');
const fs = require('fs');
const path = require('path');

// Указываем путь к ffmpeg
ffmpeg.setFfmpegPath(ffmpegStatic);

const app = express();
const port = 3000;

// Подключение к MySQL
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

// Временное хранилище для выбора формата
const userSelections = {};

// Функция для обновления даты последнего сообщения
function updateUserLastMessage(userId) {
  const today = new Date().toISOString().split('T')[0];
  const sql = `INSERT INTO Users (id, lastMessage) VALUES (?, ?)
               ON DUPLICATE KEY UPDATE lastMessage = ?`;
  connection.query(sql, [userId, today, today], (err) => {
    if (err) console.error('Ошибка обновления Users:', err);
  });
}

// Функция для скачивания и отправки видео
async function downloadAndSendVideo(chatId, url, type) {
  const info = await ytdl.getInfo(url);
  const title = info.videoDetails.title.replace(/[^\w\s]/gi, ''); // Убираем спецсимволы
  const filePath = path.join(__dirname, `${chatId}_${Date.now()}.${type === 'video' ? 'mp4' : 'mp3'}`);
  
  bot.sendMessage(chatId, `⏳ Скачиваю: *${info.videoDetails.title}*`, { parse_mode: 'Markdown' });
  
  if (type === 'video') {
    // Скачиваем видео
    const stream = ytdl(url, { quality: 'highestvideo' });
    const writeStream = fs.createWriteStream(filePath);
    stream.pipe(writeStream);
    
    writeStream.on('finish', async () => {
      bot.sendMessage(chatId, '📤 Отправляю видео...');
      await bot.sendVideo(chatId, filePath, { caption: `🎬 *${info.videoDetails.title}*` });
      fs.unlinkSync(filePath); // Удаляем временный файл
    });
  } else {
    // Скачиваем и конвертируем в MP3
    const stream = ytdl(url, { quality: 'highestaudio' });
    ffmpeg(stream)
      .audioBitrate(128)
      .save(filePath)
      .on('end', async () => {
        bot.sendMessage(chatId, '📤 Отправляю аудио...');
        await bot.sendAudio(chatId, filePath, { caption: `🎵 *${info.videoDetails.title}*` });
        fs.unlinkSync(filePath);
      });
  }
}

// КОМАНДЫ БОТА

bot.onText(/\/help/, (msg) => {
  const chatId = msg.chat.id;
  updateUserLastMessage(msg.from.id);
  const helpText = `📋 *Список команд:*

/help - показать это сообщение
/start - начать работу с ботом

🎬 *YouTube Downloader:*
Просто отправьте ссылку на YouTube видео, и бот спросит:
- Видео (MP4) — 720p качество
- Аудио (MP3) — 128kbps качество

📌 *Пример ссылки:*
https://youtube.com/watch?v=VIDEO_ID

✨ *Другие команды:*
/site - сайт Октагона
/creator - информация о создателе
/randomItem - случайный предмет из БД`;

  bot.sendMessage(chatId, helpText, { parse_mode: 'Markdown' });
});

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  updateUserLastMessage(msg.from.id);
  bot.sendMessage(chatId, '🎬 *YouTube Downloader Bot*\n\nОтправьте мне ссылку на YouTube видео, и я скачаю его для вас!\n\nПоддерживаемые форматы: MP4 (видео), MP3 (аудио)', { parse_mode: 'Markdown' });
});

bot.onText(/\/site/, (msg) => {
  const chatId = msg.chat.id;
  updateUserLastMessage(msg.from.id);
  bot.sendMessage(chatId, '🌐 *Сайт Октагона:* https://octagon.ru/', { parse_mode: 'Markdown' });
});

bot.onText(/\/creator/, (msg) => {
  const chatId = msg.chat.id;
  updateUserLastMessage(msg.from.id);
  bot.sendMessage(chatId, '👨‍💻 *Создатель бота:* Олег Смирнов', { parse_mode: 'Markdown' });
});

bot.onText(/\/randomItem/, (msg) => {
  const chatId = msg.chat.id;
  updateUserLastMessage(msg.from.id);
  connection.query('SELECT * FROM Items ORDER BY RAND() LIMIT 1', (err, results) => {
    if (err || results.length === 0) {
      bot.sendMessage(chatId, '📭 В базе данных нет предметов');
      return;
    }
    const item = results[0];
    bot.sendMessage(chatId, `🎲 *Случайный предмет:*\n(${item.id}) - ${item.name}: ${item.desc}`, { parse_mode: 'Markdown' });
  });
});

// Обработка YouTube ссылок
bot.onText(/^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/, async (msg, match) => {
  const chatId = msg.chat.id;
  const url = match[0];
  updateUserLastMessage(msg.from.id);
  
  // Проверяем, валидная ли ссылка
  if (!ytdl.validateURL(url)) {
    bot.sendMessage(chatId, '❌ Некорректная ссылка на YouTube');
    return;
  }
  
  // Сохраняем ссылку и предлагаем выбор формата
  userSelections[chatId] = { url };
  
  const keyboard = {
    reply_markup: {
      inline_keyboard: [
        [
          { text: '🎬 Видео (MP4)', callback_data: 'format_video' },
          { text: '🎵 Аудио (MP3)', callback_data: 'format_audio' }
        ]
      ]
    }
  };
  
  bot.sendMessage(chatId, 'Выберите формат:', keyboard);
});

// Обработка нажатий на кнопки
bot.on('callback_query', async (callbackQuery) => {
  const chatId = callbackQuery.message.chat.id;
  const data = callbackQuery.data;
  const selection = userSelections[chatId];
  
  if (!selection || !selection.url) {
    bot.sendMessage(chatId, '❌ Ошибка: сначала отправьте ссылку на YouTube');
    return;
  }
  
  if (data === 'format_video') {
    bot.sendMessage(chatId, '🎬 Начинаю скачивание видео...');
    await downloadAndSendVideo(chatId, selection.url, 'video');
  } else if (data === 'format_audio') {
    bot.sendMessage(chatId, '🎵 Начинаю скачивание аудио...');
    await downloadAndSendVideo(chatId, selection.url, 'audio');
  }
  
  delete userSelections[chatId];
  bot.answerCallbackQuery(callbackQuery.id);
});

// Обработка обычных сообщений (не команд и не ссылок)
bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;
  
  if (!text) return;
  if (text.startsWith('/')) return;
  
  // Проверяем, что это не YouTube ссылка (они обрабатываются отдельно)
  if (text.match(/^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/)) return;
  
  updateUserLastMessage(msg.from.id);
  bot.sendMessage(chatId, 'Привет! Отправьте мне ссылку на YouTube видео, и я скачаю его для вас. Напишите /help для справки.');
});

console.log('🎬 YouTube Downloader Bot запущен!');

// Express маршруты (оставляем для совместимости)
app.get('/', (req, res) => {
  res.send('<h1>YouTube Downloader Bot</h1><p>Бот работает через Telegram</p>');
});

app.listen(port, () => {
  console.log(`Сервер запущен на http://localhost:${port}`);
});