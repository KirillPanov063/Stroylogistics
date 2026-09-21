const UserService = require("../services/User.service");
const generateJWTTokens = require("../utils/generateJWTTokens");
const formatResponse = require("../utils/formatResponse");
const cookieConfig = require("../config/cookieConfig");

class AuthController {
  // * Регистрация нового пользователя (signUp)
  static async signUp(req, res) {
    try {
      const { email, phone, password, full_name, role = "user" } = req.body;

      const user = await UserService.signUp({ email, phone, password, full_name, role });

      const message = user.email_sent
        ? "Регистрация прошла успешно. Код подтверждения отправлен на вашу почту"
        : "Регистрация прошла успешно, но письмо не удалось отправить. Используйте повторную отправку кода";

      return res.status(201).json(
        formatResponse.created(message, { email: user.email, email_sent: user.email_sent }),
      );
    } catch (error) {
      console.log("Ошибка регистрации:", error);

      let statusCode = 500;
      if (
        error.message.includes("уже существует") ||
        error.message.includes("валидным")
      ) {
        statusCode = 400;
      }

      return res.status(statusCode).json(formatResponse.error(error.message, null, statusCode));
    }
  }

  // * Подтверждение email по коду
  static async verifyEmail(req, res) {
    try {
      const { email, code } = req.body;

      if (!email || !code) {
        return res.status(400).json(formatResponse.error("email и code обязательны"));
      }

      const user = await UserService.verifyEmail(email, code);

      const payload = {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
      };

      const { accessToken, refreshToken } = generateJWTTokens(payload);

      return res.status(200).cookie("refreshToken", refreshToken, cookieConfig).json(
        formatResponse.success("Email подтверждён. Добро пожаловать!", { accessToken, user }),
      );
    } catch (error) {
      console.log("Ошибка подтверждения email:", error);

      const statusCode =
        error.message.includes("не найден") ? 404 :
        error.message.includes("истёк") || error.message.includes("Неверный") ? 400 :
        500;

      return res.status(statusCode).json(formatResponse.error(error.message, null, statusCode));
    }
  }

  // * Повторная отправка кода
  static async resendCode(req, res) {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json(formatResponse.error("email обязателен"));
      }

      await UserService.resendCode(email);

      return res.json(formatResponse.success("Новый код отправлен на почту"));
    } catch (error) {
      console.log("Ошибка повторной отправки кода:", error);

      const statusCode = error.message.includes("не найден") ? 404 : 400;
      return res.status(statusCode).json(formatResponse.error(error.message, null, statusCode));
    }
  }

  // * Вход пользователя (signIn) - ИСПРАВЛЕНО!

  static async signIn(req, res) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res
          .status(400)
          .json(formatResponse.error("Email и пароль обязательны", null, 400));
      }

      // Получаем пользователя из сервиса (с паролем!)
      const user = await UserService.signIn(email, password);

      // Генерируем токены (пароль еще есть в user, но мы его не включаем в payload)
      const payload = {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
      };

      const { accessToken, refreshToken } = generateJWTTokens(payload);

      // !!! ВАЖНО: Удаляем пароль перед отправкой клиенту !!!
      delete user.password_hash;
      // или если нужно удалить из dataValues:
      // delete user.dataValues.password_hash;

      res.status(200).cookie("refreshToken", refreshToken, cookieConfig).json(
        formatResponse.success("Вход выполнен успешно", {
          accessToken,
          user, // клиент получает данные БЕЗ пароля
        }),
      );
    } catch (error) {
      console.log("Ошибка входа:", error);

      if (error.code === "EMAIL_NOT_VERIFIED") {
        return res.status(403).json({
          success: false,
          message: error.message,
          code: "EMAIL_NOT_VERIFIED",
        });
      }

      let statusCode = 401;
      if (error.message.includes("не найден")) {
        statusCode = 404;
      }

      res
        .status(statusCode)
        .json(formatResponse.error(error.message, null, statusCode));
    }
  }

  // * Выход пользователя (signOut)
  static async signOut(req, res) {
    try {
      // Используем signOut из сервиса (просто для единообразия)
      UserService.signOut();

      res
        .status(200)
        .clearCookie("refreshToken")
        .json(formatResponse.success("Выход выполнен успешно"));
    } catch (error) {
      console.log("Ошибка выхода:", error);
      res
        .status(500)
        .json(
          formatResponse.serverError(
            "Не удалось выполнить выход",
            error.message,
          ),
        );
    }
  }

  // * Обновление токенов
  static async refreshTokens(req, res) {
    try {
      const user = res.locals.user;

      if (!user) {
        return res
          .status(401)
          .json(formatResponse.unauthorized("Пользователь не найден"));
      }

      console.log("Refresh tokens for user:", user.email);

      const freshUser = await UserService.getOneUser(user.id);

      if (!freshUser) {
        return res
          .status(404)
          .json(formatResponse.notFound("Пользователь не найден"));
      }

      const payload = {
        id: freshUser.id,
        email: freshUser.email,
        full_name: freshUser.full_name,
        role: freshUser.role,
      };

      const { accessToken, refreshToken } = generateJWTTokens(payload);

      res
        .status(200)
        .cookie("refreshToken", refreshToken, cookieConfig)
        .json(
          formatResponse.success("Токены обновлены", {
            accessToken,
            user: freshUser,
          }),
        );
    } catch (error) {
      console.log("Ошибка обновления токенов:", error);
      res
        .status(500)
        .json(
          formatResponse.serverError(
            "Не удалось обновить токены",
            error.message,
          ),
        );
    }
  }

  // * Проверка текущего токена
  static async check(req, res) {
    try {
      const user = res.locals.user;

      if (!user) {
        return res
          .status(401)
          .json(formatResponse.unauthorized("Не авторизован"));
      }

      const freshUser = await UserService.getOneUser(user.id);

      res.json(
        formatResponse.success("Токен действителен", {
          user: freshUser,
        }),
      );
    } catch (error) {
      console.log("Ошибка проверки токена:", error);
      res
        .status(500)
        .json(
          formatResponse.serverError("Ошибка проверки токена", error.message),
        );
    }
  }
}

module.exports = AuthController;
