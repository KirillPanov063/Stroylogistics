module.exports = {
  httpOnly: true,
  maxAge: 1000 * 60 * 60 * 24, // 24 часа в миллисекундах
  secure: process.env.NODE_ENV === "production", // true только на HTTPS
  sameSite: "strict", // защита от CSRF атак
  path: "/", // доступна для всех маршрутов
};
