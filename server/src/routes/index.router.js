const indexRouter = require("express").Router();
const formatResponse = require("../utils/formatResponse");

// Функция для форматирования даты (как в formatResponse)
function formatDate(date) {
  const isoString = date.toISOString();
  const [datePart, timePart] = isoString.split("T");
  const [hours, minutes] = timePart.split(":");
  return `${datePart} ${hours}:${minutes}`;
}

// Импорт роутов
const authRouter = require("./auth.router");
const userRouter = require("./user.router");

// Подключаем роуты
indexRouter.use("/auth", authRouter);
indexRouter.use("/users", userRouter);

// Health check
indexRouter.get("/health", (req, res) => {
  res.json(
    formatResponse.success("Server is running", {
      timestamp: formatDate(new Date()), // теперь будет "2026-03-10 20:29"
      uptime: process.uptime(),
    }),
  );
});

// Обработка 404
indexRouter.use((req, res) => {
  res
    .status(404)
    .json(formatResponse.notFound(`Маршрут ${req.originalUrl} не найден`));
});

module.exports = indexRouter;
