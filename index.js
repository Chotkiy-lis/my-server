const express = require('express');
const mysql = require('mysql2');
const app = express();
const port = 3000;

// ===== ПОДКЛЮЧЕНИЕ К БАЗЕ ДАННЫХ =====
const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',           // пользователь XAMPP по умолчанию
  password: '',           // пароль по умолчанию пустой
  database: 'ChatBotTests'
});

// Проверяем подключение
connection.connect((err) => {
  if (err) {
    console.error('Ошибка подключения к БД:', err.message);
    return;
  }
  console.log('Подключение к MySQL успешно установлено');
});

// ===== МАРШРУТЫ =====

// 1. Корневой маршрут (для проверки)
app.get('/', (req, res) => {
  res.send('<h1>Привет, Октагон!</h1><p>Сервер работает с MySQL</p>');
});

// 2. GET /getAllItems - получить все записи
app.get('/getAllItems', (req, res) => {
  const sql = 'SELECT * FROM Items';
  
  connection.query(sql, (err, results) => {
    if (err) {
      console.error(err);
      return res.json([]);  // при ошибке возвращаем пустой массив
    }
    res.json(results);  // возвращаем JSON-массив с объектами
  });
});

// 3. POST /addItem?name=...&desc=... - добавить запись
app.post('/addItem', (req, res) => {
  const { name, desc } = req.query;
  
  // Проверяем, что оба параметра переданы
  if (!name || !desc) {
    return res.json(null);  // неправильные параметры -> null
  }
  
  const sql = 'INSERT INTO Items (name, desc) VALUES (?, ?)';
  connection.query(sql, [name, desc], (err, result) => {
    if (err) {
      console.error(err);
      return res.json(null);
    }
    // Возвращаем созданный объект (с новым id)
    res.json({
      id: result.insertId,
      name: name,
      desc: desc
    });
  });
});

// 4. POST /deleteItem?id=number - удалить запись
app.post('/deleteItem', (req, res) => {
  const id = req.query.id;
  
  // Проверяем, что id передан и является числом
  if (!id || isNaN(Number(id))) {
    return res.json(null);  // неправильные параметры -> null
  }
  
  // Сначала находим объект, который удалим
  const selectSql = 'SELECT * FROM Items WHERE id = ?';
  connection.query(selectSql, [id], (err, results) => {
    if (err) {
      console.error(err);
      return res.json(null);
    }
    
    if (results.length === 0) {
      return res.json({});  // объект не нашёлся -> пустой объект
    }
    
    const deletedItem = results[0];
    
    // Удаляем запись
    const deleteSql = 'DELETE FROM Items WHERE id = ?';
    connection.query(deleteSql, [id], (err) => {
      if (err) {
        console.error(err);
        return res.json(null);
      }
      res.json(deletedItem);  // возвращаем удалённый объект
    });
  });
});

// 5. POST /updateItem?id=...&name=...&desc=... - обновить запись
app.post('/updateItem', (req, res) => {
  const { id, name, desc } = req.query;
  
  // Проверяем, что все параметры переданы
  if (!id || !name || !desc || isNaN(Number(id))) {
    return res.json(null);  // неправильные параметры -> null
  }
  
  // Проверяем, существует ли запись с таким id
  const checkSql = 'SELECT * FROM Items WHERE id = ?';
  connection.query(checkSql, [id], (err, results) => {
    if (err) {
      console.error(err);
      return res.json(null);
    }
    
    if (results.length === 0) {
      return res.json({});  // объект не нашёлся -> пустой объект
    }
    
    // Обновляем запись
    const updateSql = 'UPDATE Items SET name = ?, desc = ? WHERE id = ?';
    connection.query(updateSql, [name, desc, id], (err) => {
      if (err) {
        console.error(err);
        return res.json(null);
      }
      
      // Возвращаем обновлённый объект
      res.json({
        id: Number(id),
        name: name,
        desc: desc
      });
    });
  });
});

// ===== ЗАПУСК СЕРВЕРА =====
app.listen(port, () => {
  console.log(`Сервер запущен на http://localhost:${port}`);
});

// Закрываем подключение при завершении приложения (опционально)
process.on('SIGINT', () => {
  connection.end();
  process.exit();
});