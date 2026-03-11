const securityHeaders = (req, res, next) => {
  // Удаляем информационный заголовок
  res.removeHeader("x-powered-by");

  // Добавляем заголовки безопасности
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");

  next();
};

module.exports = securityHeaders;
