module.exports = {
  access: {
    expiresIn: 60 * 3, // 3 минуты (короткий срок для безопасности)
  },
  refresh: {
    expiresIn: 60 * 60 * 24 * 30, // 30 дней в секундах
  },
};
