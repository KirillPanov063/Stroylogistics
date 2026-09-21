const { User, Driver } = require("../db/models");
const bcrypt = require("bcrypt");
const { Op } = require("sequelize");
const EmailService = require("./EmailService");

const CODE_TTL_MINUTES = 10;

function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

class UserService {
  // ============= ВАЛИДАЦИЯ =============

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

  // Используем метод модели для валидации телефона
  static validatePhone(phone) {
    return User.validatePhone(phone);
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

  static validateSignUpData({
    full_name,
    email,
    phone,
    password,
    role = "user",
  }) {
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
          "Телефон должен быть валидным российским номером (например: +79277817888 или 89277817888)",
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

    // Нельзя зарегистрироваться как admin
    if (role === "admin") {
      return {
        isValid: false,
        error: "Регистрация с ролью admin невозможна",
      };
    }

    return {
      isValid: true,
      error: null,
    };
  }

  // ============= ХЕШИРОВАНИЕ (для проверки пароля) =============

  static async comparePassword(password, hash) {
    console.log("🔐 comparePassword called:", {
      passwordProvided: !!password,
      hashProvided: !!hash,
      passwordType: typeof password,
      hashType: typeof hash,
    });

    if (!password || !hash) {
      console.error("❌ Missing arguments in comparePassword");
      throw new Error("data and hash arguments required");
    }

    try {
      const result = await bcrypt.compare(password, hash);
      console.log("🔐 bcrypt.compare result:", result);
      return result;
    } catch (error) {
      console.error("❌ bcrypt.compare error:", error);
      throw error;
    }
  }

  // ============= ОСНОВНЫЕ МЕТОДЫ =============

  // * Регистрация нового пользователя (signUp)

  static async signUp(userData) {
    // Валидация
    const validation = this.validateSignUpData(userData);
    if (!validation.isValid) {
      throw new Error(validation.error);
    }

    const { email, phone, password, full_name, role = "user" } = userData;

    // Проверяем, существует ли пользователь
    const existingUser = await User.findOne({
      where: {
        [Op.or]: [
          { email: email.trim().toLowerCase() },
          { phone: phone.replace(/\D/g, "") },
        ],
      },
    });

    if (existingUser) {
      throw new Error(
        "Пользователь с таким email или телефоном уже существует",
      );
    }

    // 👇 ХЕШИРУЕМ ПАРОЛЬ ЗДЕСЬ
    console.log("🔐 Хеширование пароля для:", email);
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log("✅ Пароль захеширован, длина:", hashedPassword.length);

    const code = generateCode();
    const expiresAt = new Date(Date.now() + CODE_TTL_MINUTES * 60 * 1000);

    // Создаем пользователя неактивным — активируется после подтверждения email
    const user = await User.create({
      email,
      phone,
      password_hash: hashedPassword,
      full_name,
      role,
      is_active: false,
      email_verified: false,
      verification_code: code,
      verification_code_expires_at: expiresAt,
    });

    console.log("✅ Пользователь создан, ID:", user.id);

    let emailSent = true;
    try {
      await EmailService.sendVerificationCode(user.email, user.full_name, code);
    } catch (emailErr) {
      console.error("❌ Ошибка отправки письма:", emailErr.message);
      emailSent = false;
    }

    const result = user.get({ plain: true });
    delete result.password_hash;
    delete result.verification_code;
    delete result.verification_code_expires_at;
    result.email_sent = emailSent;
    return result;
  }

  static async verifyEmail(email, code) {
    const user = await User.findOne({
      where: { email: email.trim().toLowerCase() },
    });

    if (!user) {
      throw new Error("Пользователь не найден");
    }

    if (user.email_verified) {
      throw new Error("Email уже подтверждён");
    }

    if (!user.verification_code || !user.verification_code_expires_at) {
      throw new Error("Код подтверждения не найден. Запросите новый");
    }

    if (new Date() > new Date(user.verification_code_expires_at)) {
      throw new Error("Код подтверждения истёк. Запросите новый");
    }

    if (user.verification_code !== String(code)) {
      throw new Error("Неверный код подтверждения");
    }

    await user.update({
      email_verified: true,
      is_active: true,
      verification_code: null,
      verification_code_expires_at: null,
    });

    // Если роль driver, создаем запись в drivers
    if (user.role === "driver") {
      const existing = await Driver.findOne({ where: { user_id: user.id } });
      if (!existing) {
        await Driver.create({
          full_name: user.full_name,
          phone: user.phone,
          driver_type: "company",
          user_id: user.id,
          is_active: true,
        });
      }
    }

    const result = user.get({ plain: true });
    delete result.password_hash;
    delete result.verification_code;
    delete result.verification_code_expires_at;
    return result;
  }

  static async resendCode(email) {
    const user = await User.findOne({
      where: { email: email.trim().toLowerCase() },
    });

    if (!user) {
      throw new Error("Пользователь не найден");
    }

    if (user.email_verified) {
      throw new Error("Email уже подтверждён");
    }

    const code = generateCode();
    const expiresAt = new Date(Date.now() + CODE_TTL_MINUTES * 60 * 1000);

    await user.update({
      verification_code: code,
      verification_code_expires_at: expiresAt,
    });

    try {
      await EmailService.sendVerificationCode(user.email, user.full_name, code);
    } catch (emailErr) {
      console.error("❌ Ошибка повторной отправки письма:", emailErr.message);
      throw new Error("Код обновлён, но письмо не удалось отправить. Проверьте настройки SMTP");
    }
  }

  // * Вход пользователя (signIn)
  static async signIn(email, password) {
    // Валидация
    const validation = this.validateSignInData({ email, password });
    if (!validation.isValid) {
      throw new Error(validation.error);
    }

    console.log("🔍 Поиск пользователя по email:", email);

    // Находим пользователя (пароль ЕСТЬ в объекте, т.к. нет afterFind)
    const user = await User.findOne({
      where: { email: email.trim().toLowerCase() },
    });

    console.log(
      "🔍 Результат findOne:",
      user
        ? {
            id: user.id,
            email: user.email,
            hasPasswordHash: !!user.password_hash,
            passwordHashLength: user.password_hash
              ? user.password_hash.length
              : 0,
          }
        : "Пользователь не найден",
    );

    if (!user) {
      throw new Error("Пользователь не найден");
    }

    if (!user.password_hash) {
      console.error("❌ password_hash отсутствует у пользователя:", user.email);
      throw new Error(
        "Ошибка в данных пользователя. Обратитесь к администратору",
      );
    }

    // Проверяем пароль (user.password_hash ДОСТУПЕН!)
    const isValidPassword = await this.comparePassword(
      password,
      user.password_hash,
    );

    if (!isValidPassword) {
      throw new Error("Неверный пароль");
    }

    if (!user.email_verified) {
      const err = new Error("Email не подтверждён. Проверьте почту и введите код подтверждения");
      err.code = "EMAIL_NOT_VERIFIED";
      throw err;
    }

    if (!user.is_active) {
      throw new Error("Пользователь деактивирован. Обратитесь к администратору");
    }

    // Возвращаем пользователя с паролем! (удалим в контроллере)
    return user;
  }
  // * Выход пользователя (signOut)
  static signOut() {
    return { message: "Выход выполнен успешно" };
  }

  // ============= ОСТАЛЬНЫЕ МЕТОДЫ =============

  static async getAllUsers() {
    const users = await User.findAll({
      attributes: { exclude: ["password_hash"] },
      order: [["created_at", "DESC"]],
    });
    return users.map((el) => el.get({ plain: true }));
  }

  static async getOneUser(id) {
    const user = await User.findByPk(id, {
      attributes: { exclude: ["password_hash"] },
      include: [
        {
          model: Driver,
          as: "driver_info",
          required: false,
          attributes: ["driver_type", "phone", "is_active"],
        },
      ],
    });

    if (!user) return null;
    return user.get({ plain: true });
  }

  static async getByEmail(email) {
    const user = await User.findOne({
      where: { email: email.trim().toLowerCase() },
    });

    if (!user) return null;

    // Возвращаем пользователя с паролем (удалим в контроллере если нужно)
    return user;
  }

  static async updateUser(id, data) {
    const user = await User.findByPk(id);
    if (!user) return null;

    // Если обновляется пароль - передаем как есть, захешируется в хуке
    if (data.password) {
      data.password_hash = data.password;
      delete data.password;
    }

    // Если обновляется роль на driver, но записи в drivers нет
    if (data.role === "driver" && user.role !== "driver") {
      await Driver.create({
        full_name: data.full_name || user.full_name,
        phone: data.phone || user.phone,
        driver_type: "company",
        user_id: user.id,
        is_active: true,
      });
    }

    await user.update(data);

    const updatedUser = user.get({ plain: true });
    delete updatedUser.password_hash;
    return updatedUser;
  }

  static async deleteUser(id) {
    const user = await User.findByPk(id);
    if (!user) return null;

    await user.destroy();
    return id;
  }
}

module.exports = UserService;
