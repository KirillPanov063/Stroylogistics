const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '..', '.env') });
const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const cookieParser = require('cookie-parser');

// Наши middleware
const securityHeaders = require('../middleware/securityHeaders');

const corsOptions = {
  origin: [process.env.CLIENT_URL],
  credentials: true,
  optionsSuccessStatus: 200
};

const serverConfig = (app) => {
  // Логирование запросов
  app.use(morgan('dev'));
  
  // CORS настройки
  app.use(cors(corsOptions));
  
  // Парсинг данных
  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());
  
  // Заголовки безопасности (уже включает удаление X-Powered-By)
  app.use(securityHeaders);
  
  // Статические файлы
  app.use(express.static(path.resolve(__dirname, '..', 'public')));
  
  // Парсинг cookies
  app.use(cookieParser());
};

module.exports = serverConfig;