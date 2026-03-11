const UserService = require("../services/User.service");
const formatResponse = require("../utils/formatResponse");

class UserController {
  // * Получение всех пользователей (только для админа)
  static async getAllUsers(req, res) {
    try {
      const users = await UserService.getAllUsers();

      res.status(200).json(formatResponse.success("Все пользователи", users));
    } catch (error) {
      console.log("Ошибка получения всех пользователей:", error);
      res
        .status(500)
        .json(
          formatResponse.serverError(
            "Не удалось получить пользователей",
            error.message,
          ),
        );
    }
  }

  // * Получение одного пользователя по ID
  static async getUserById(req, res) {
    try {
      const { id } = req.params;
      const user = await UserService.getOneUser(id);

      if (!user) {
        return res
          .status(404)
          .json(formatResponse.notFound("Пользователь не найден"));
      }

      res
        .status(200)
        .json(formatResponse.success("Пользователь получен", user));
    } catch (error) {
      console.log("Ошибка получения пользователя:", error);
      res
        .status(500)
        .json(
          formatResponse.serverError(
            "Не удалось получить пользователя",
            error.message,
          ),
        );
    }
  }

  // * Получение своего профиля (для авторизованного пользователя)
  static async getProfile(req, res) {
    try {
      const userId = res.locals.user.id;
      const user = await UserService.getOneUser(userId);

      if (!user) {
        return res
          .status(404)
          .json(formatResponse.notFound("Пользователь не найден"));
      }

      res.status(200).json(formatResponse.success("Профиль получен", user));
    } catch (error) {
      console.log("Ошибка получения профиля:", error);
      res
        .status(500)
        .json(
          formatResponse.serverError(
            "Не удалось получить профиль",
            error.message,
          ),
        );
    }
  }

  // * Обновление своего профиля
  static async updateProfile(req, res) {
    try {
      const userId = res.locals.user.id;
      const { full_name, phone, email } = req.body;

      const updatedUser = await UserService.updateUser(userId, {
        full_name,
        phone,
        email,
      });

      if (!updatedUser) {
        return res
          .status(404)
          .json(formatResponse.notFound("Пользователь не найден"));
      }

      res
        .status(200)
        .json(formatResponse.success("Профиль успешно обновлён", updatedUser));
    } catch (error) {
      console.log("Ошибка обновления профиля:", error);
      res
        .status(500)
        .json(
          formatResponse.serverError(
            "Не удалось обновить профиль",
            error.message,
          ),
        );
    }
  }

  // * Обновление пользователя администратором
  static async updateUserByAdmin(req, res) {
    try {
      const { id } = req.params;
      const { full_name, phone, email, role, is_active } = req.body;

      const updatedUser = await UserService.updateUser(id, {
        full_name,
        phone,
        email,
        role,
        is_active,
      });

      if (!updatedUser) {
        return res
          .status(404)
          .json(formatResponse.notFound("Пользователь не найден"));
      }

      res
        .status(200)
        .json(
          formatResponse.success("Пользователь успешно обновлён", updatedUser),
        );
    } catch (error) {
      console.log("Ошибка обновления пользователя:", error);
      res
        .status(500)
        .json(
          formatResponse.serverError(
            "Не удалось обновить пользователя",
            error.message,
          ),
        );
    }
  }

  // * Удаление пользователя (только для админа)
  static async deleteUser(req, res) {
    try {
      const { id } = req.params;
      console.log("Удаление пользователя с ID:", id);

      const result = await UserService.deleteUser(id);

      if (!result) {
        return res
          .status(404)
          .json(formatResponse.notFound("Пользователь не найден"));
      }

      console.log("Пользователь удалён:", result);

      res
        .status(200)
        .json(
          formatResponse.success("Пользователь успешно удалён", { id: result }),
        );
    } catch (error) {
      console.log("Ошибка удаления пользователя:", error);
      res
        .status(500)
        .json(
          formatResponse.serverError(
            "Не удалось удалить пользователя",
            error.message,
          ),
        );
    }
  }

  // * Изменение пароля
  static async changePassword(req, res) {
    try {
      const userId = res.locals.user.id;
      const { currentPassword, newPassword } = req.body;
      // confirmNewPassword уже проверен в middleware

      // Получаем пользователя из БД (нужен password_hash)
      const user = await UserService.getByEmail(res.locals.user.email);

      if (!user) {
        return res
          .status(404)
          .json(formatResponse.notFound("Пользователь не найден"));
      }

      // Проверяем текущий пароль
      const isValidPassword = await UserService.comparePassword(
        currentPassword,
        user.password_hash,
      );

      if (!isValidPassword) {
        return res
          .status(400)
          .json(formatResponse.error("Неверный текущий пароль", null, 400));
      }

      // Проверяем, что новый пароль отличается от текущего
      const isSamePassword = await UserService.comparePassword(
        newPassword,
        user.password_hash,
      );

      if (isSamePassword) {
        return res
          .status(400)
          .json(
            formatResponse.error(
              "Новый пароль должен отличаться от текущего",
              null,
              400,
            ),
          );
      }

      // Валидируем новый пароль
      if (!UserService.validatePassword(newPassword)) {
        return res
          .status(400)
          .json(
            formatResponse.error(
              "Пароль должен содержать минимум 8 символов, одну заглавную, одну строчную букву, одну цифру и один специальный символ",
              null,
              400,
            ),
          );
      }

      // Обновляем пароль
      const updatedUser = await UserService.updateUser(userId, {
        password: newPassword,
      });

      // !!! ВАЖНО: Очищаем refreshToken, чтобы разлогинить пользователя !!!
      res.clearCookie("refreshToken");

      // Можно также отправить сообщение, что нужно войти заново
      res.status(200).json(
        formatResponse.success(
          "Пароль успешно изменён. Пожалуйста, войдите заново.",
          {
            requiresRelogin: true,
          },
        ),
      );
    } catch (error) {
      console.log("Ошибка изменения пароля:", error);
      res
        .status(500)
        .json(
          formatResponse.serverError(
            "Не удалось изменить пароль",
            error.message,
          ),
        );
    }
  }
}

module.exports = UserController;
