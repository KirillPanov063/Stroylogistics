const path = require("path");
const jwt = require("jsonwebtoken");
require("dotenv").config({ path: path.resolve(__dirname, "..", "..", ".env") });
const formatResponse = require("../utils/formatResponse");

// Функция для проверки access токена
function verifyAccessToken(req, res, next) {
  try {
    // Проверяем наличие заголовка
    if (!req.headers.authorization) {
      return res
        .status(401)
        .json(formatResponse.unauthorized("Отсутствует заголовок авторизации"));
    }

    const accessToken = req.headers.authorization.split(" ")[1];

    if (!accessToken) {
      return res
        .status(401)
        .json(formatResponse.unauthorized("Токен не предоставлен"));
    }

    // Верифицируем токен
    const decoded = jwt.verify(accessToken, process.env.SECRET_ACCESS_TOKEN);
    res.locals.user = decoded; // decoded = { id, email, full_name, role }

    next();
  } catch (error) {
    console.log("=============verifyAccessToken=============", error.message);

    if (error.name === "TokenExpiredError") {
      return res
        .status(403)
        .json(
          formatResponse.forbidden("Срок действия токена истек", error.message),
        );
    }

    res
      .status(403)
      .json(formatResponse.forbidden("Недействительный токен", error.message));
  }
}

// Middleware для проверки ролей
function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    const user = res.locals.user;

    if (!user) {
      return res
        .status(401)
        .json(formatResponse.unauthorized("Пользователь не авторизован"));
    }

    if (!allowedRoles.includes(user.role)) {
      return res
        .status(403)
        .json(formatResponse.forbidden("Недостаточно прав для доступа"));
    }

    next();
  };
}

// Для удобства экспортируем и как authenticateToken (алиас)
const authenticateToken = verifyAccessToken;

module.exports = verifyAccessToken;
module.exports.authenticateToken = authenticateToken;
module.exports.authorizeRoles = authorizeRoles;
