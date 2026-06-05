const express = require('express');
const app = express();
const port = 3000;

// 1. Обработка корневого маршрута (оставляем как было)
app.get('/', (req, res) => {
  res.send('<h1>Привет, Октагон!</h1>');
});

// 2. Обработка маршрута /static
app.get('/static', (req, res) => {
  res.json({
    header: "Hello",
    body: "Octagon NodeJS Test"
  });
});

// 3. Обработка маршрута /dynamic
app.get('/dynamic', (req, res) => {
  // Получаем параметры a, b, c из строки запроса
  const a = req.query.a;
  const b = req.query.b;
  const c = req.query.c;

  // Проверяем, что все параметры существуют и являются числами
  if (a === undefined || b === undefined || c === undefined) {
    return res.json({ header: "Error" });
  }

  // Преобразуем строки в числа
  const numA = Number(a);
  const numB = Number(b);
  const numC = Number(c);

  // Проверяем, что преобразование удалось (не NaN)
  if (isNaN(numA) || isNaN(numB) || isNaN(numC)) {
    return res.json({ header: "Error" });
  }

  // Вычисляем результат по формуле (a * b * c) / 3
  const result = (numA * numB * numC) / 3;

  // Отправляем JSON-ответ
  res.json({
    header: "Calculated",
    body: result.toString()
  });
});

// Запускаем сервер
app.listen(port, () => {
  console.log(`Сервер запущен на http://localhost:${port}`);
});