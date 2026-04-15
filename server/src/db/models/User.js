const { DataTypes } = require("sequelize");
const bcrypt = require("bcrypt");

module.exports = (sequelize) => {
  class User extends sequelize.Sequelize.Model {
    static validateEmail(email) {
      const emailPattern = /^[A-z0-9._%+-]+@[A-z0-9.-]+\.[A-z]{2,}$/;
      return emailPattern.test(email);
    }

    static validatePassword(password) {
      const hasUpperCase = /[A-Z]/;
      const hasLowerCase = /[a-z]/;
      const hasNumbers = /\d/;
      const hasSpecialCharacters = /[!@#$%^&*()-,.?":{}|<>]/;
      const isValidLength = password.length >= 8;

      if (
        !hasUpperCase.test(password) ||
        !hasLowerCase.test(password) ||
        !hasNumbers.test(password) ||
        !hasSpecialCharacters.test(password) ||
        !isValidLength
      ) {
        return false;
      }

      return true;
    }

    static formatPhone(phone) {
      // Удаляем все нецифровые символы
      let cleaned = phone.replace(/\D/g, "");

      // Если начинается с 8, заменяем на +7
      if (cleaned.startsWith("8")) {
        cleaned = "7" + cleaned.slice(1);
      }

      // Если начинается с 7, добавляем +
      if (cleaned.startsWith("7")) {
        cleaned = "+" + cleaned;
      }

      // Проверяем, что получился валидный номер (12 символов с +7)
      if (cleaned.length === 12 && cleaned.startsWith("+7")) {
        return cleaned;
      }

      return null;
    }

    static validatePhone(phone) {
      const formatted = this.formatPhone(phone);
      return formatted !== null;
    }

    static validateSignInData({ email, password }) {
      if (!email || typeof email !== "string" || email.trim().length === 0) {
        return {
          isValid: false,
          error: "Email не должен быть пустым",
        };
      }

      if (
        !password ||
        typeof password !== "string" ||
        password.trim().length === 0
      ) {
        return {
          isValid: false,
          error: "Пароль не должен быть пустым",
        };
      }

      return {
        isValid: true,
        error: null,
      };
    }

    static validateSignUpData({ full_name, email, phone, password }) {
      if (
        !full_name ||
        typeof full_name !== "string" ||
        full_name.trim().length === 0
      ) {
        return {
          isValid: false,
          error: "Поле full_name не должно быть пустым",
        };
      }

      if (
        !email ||
        typeof email !== "string" ||
        email.trim().length === 0 ||
        !this.validateEmail(email)
      ) {
        return {
          isValid: false,
          error: "Email должен быть валидным",
        };
      }

      if (
        !phone ||
        typeof phone !== "string" ||
        phone.trim().length === 0 ||
        !this.validatePhone(phone)
      ) {
        return {
          isValid: false,
          error:
            "Телефон должен быть валидным российским номером (например: +79271237799 или 89271237799)",
        };
      }

      if (
        !password ||
        typeof password !== "string" ||
        password.trim().length === 0 ||
        !this.validatePassword(password)
      ) {
        return {
          isValid: false,
          error:
            "Пароль не должен быть пустым, должен содержать одну большую букву, одну маленькую, один специальный символ, и не должен быть короче 8 символов",
        };
      }

      return {
        isValid: true,
        error: null,
      };
    }
  }

  User.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
          isEmail: true,
        },
      },
      phone: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
          notEmpty: true,
        },
      },
      password_hash: {
        type: DataTypes.STRING,
        allowNull: false,
        field: "password_hash",
      },
      full_name: {
        type: DataTypes.STRING,
        allowNull: false,
        field: "full_name",
      },
      role: {
        type: DataTypes.ENUM("user", "admin", "manager", "driver"),
        allowNull: false,
        defaultValue: "user",
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        field: "is_active",
      },
    },
    {
      sequelize,
      modelName: "User",
      tableName: "users",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      hooks: {
        beforeCreate: async (newUser) => {
          // Форматируем телефон
          if (newUser.phone) {
            const formattedPhone = User.formatPhone(newUser.phone);
            if (formattedPhone) {
              newUser.phone = formattedPhone;
            }
          }

          // Приводим к нижнему регистру и обрезаем пробелы
          newUser.email = newUser.email.trim().toLowerCase();
          newUser.full_name = newUser.full_name.trim();
        },

        beforeUpdate: async (user) => {
          if (user.changed("email")) {
            user.email = user.email.trim().toLowerCase();
          }
          if (user.changed("phone")) {
            const formattedPhone = User.formatPhone(user.phone);
            if (formattedPhone) {
              user.phone = formattedPhone;
            }
          }
          if (user.changed("full_name")) {
            user.full_name = user.full_name.trim();
          }
        },

        afterCreate: (newUser) => {
          // Удаляем пароль ТОЛЬКО из возвращаемого объекта, НЕ из БД
          const rawUser = newUser.get({ plain: true });
          delete rawUser.password_hash;
          return rawUser;
        },

        afterUpdate: (user) => {
          const rawUser = user.get({ plain: true });
          delete rawUser.password_hash;
          return rawUser;
        },

        // afterFind: (result) => {
        //   if (!result) return;

        //   // Функция для очистки пароля
        //   const cleanUser = (user) => {
        //     if (user && user.dataValues) {
        //       // Создаем копию без password_hash
        //       const clean = { ...user.dataValues };
        //       delete clean.password_hash;

        //       // Если нужно сохранить оригинал для служебных целей
        //       if (!user._skipPasswordCleanup) {
        //         user.dataValues = clean;
        //       }
        //     }
        //   };

        //   if (Array.isArray(result)) {
        //     result.forEach((user) => cleanUser(user));
        //   } else {
        //     cleanUser(result);
        //   }
        // },
      },
    },
  );

  return User;
};
