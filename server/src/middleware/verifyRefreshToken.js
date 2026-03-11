const jwt = require("jsonwebtoken");
const formatResponse = require("../utils/formatResponse");

const verifyRefreshToken = (req, res, next) => {
  try {
    console.log("req.cookies:", req.cookies);

    // Достаём refreshToken из куки
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      // Используем formatResponse.unauthorized()
      return res
        .status(401)
        .json(formatResponse.unauthorized("Refresh token не найден"));
    }

    console.log("Refresh token:", refreshToken);

    // Верифицируем токен
    const decoded = jwt.verify(refreshToken, process.env.SECRET_REFRESH_TOKEN);
    console.log("Decoded user:", decoded);

    // Сохраняем пользователя в res.locals
    res.locals.user = decoded;

    next();
  } catch (error) {
    console.log("Invalid refresh token:", error);

    // Очищаем недействительную куку
    res.clearCookie("refreshToken");

    // Разные сообщения для разных ошибок
    if (error.name === "TokenExpiredError") {
      return res
        .status(401)
        .json(
          formatResponse.unauthorized(
            "Срок действия refresh token истек",
            error.message,
          ),
        );
    }

    if (error.name === "JsonWebTokenError") {
      return res
        .status(401)
        .json(
          formatResponse.unauthorized(
            "Недействительный refresh token",
            error.message,
          ),
        );
    }

    res
      .status(401)
      .json(
        formatResponse.unauthorized(
          "Ошибка верификации refresh token",
          error.message,
        ),
      );
  }
};

module.exports = verifyRefreshToken;

