const formatResponse = require("../utils/formatResponse");

const forceLogout = (req, res, next) => {
  // Добавляем функцию принудительного выхода
  res.forceLogout = () => {
    res.clearCookie("refreshToken");
    return res
      .status(401)
      .json(
        formatResponse.unauthorized(
          "Пароль был изменён. Пожалуйста, войдите заново.",
        ),
      );
  };
  next();
};

module.exports = forceLogout;
