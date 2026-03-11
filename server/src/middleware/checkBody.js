const formatResponse = require("../utils/formatResponse");

function checkBody(req, res, next) {
  const url = req.url;
  const method = req.method;

  console.log(`🔍 Проверка body для ${method} ${url}`);

  // Для регистрации (signup)
  if (url.includes("/signup") && method === "POST") {
    const { email, phone, password, confirmPassword, full_name } = req.body;

    if (!email || !phone || !password || !confirmPassword || !full_name) {
      return res
        .status(400)
        .json(
          formatResponse.error(
            "Все поля (email, phone, password, confirmPassword, full_name) должны быть заполнены",
          ),
        );
    }

    // Проверка совпадения паролей при регистрации
    if (password !== confirmPassword) {
      return res
        .status(400)
        .json(
          formatResponse.error("Пароль и подтверждение пароля не совпадают"),
        );
    }
  }

  // Для входа (signin)
  if (url.includes("/signin") && method === "POST") {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json(formatResponse.error("Email и пароль должны быть заполнены"));
    }
  }

  // Для обновления профиля
  if (url.includes("/profile") && method === "PUT") {
    const { full_name, phone, email } = req.body;

    if (!full_name && !phone && !email) {
      return res
        .status(400)
        .json(
          formatResponse.error("Должно быть хотя бы одно поле для обновления"),
        );
    }
  }

  // Для смены пароля
  if (url.includes("/change-password") && method === "PUT") {
    const { currentPassword, newPassword, confirmNewPassword } = req.body;

    // Проверяем наличие всех полей
    if (!currentPassword || !newPassword || !confirmNewPassword) {
      return res
        .status(400)
        .json(
          formatResponse.error(
            "Текущий пароль, новый пароль и подтверждение нового пароля должны быть заполнены",
          ),
        );
    }

    // Проверяем совпадение нового пароля и подтверждения
    if (newPassword !== confirmNewPassword) {
      return res
        .status(400)
        .json(
          formatResponse.error("Новый пароль и подтверждение не совпадают"),
        );
    }

    // Проверяем, что новый пароль отличается от текущего
    // (эту проверку делаем в контроллере, так как нужен доступ к БД)
  }

  next();
}

module.exports = checkBody;
