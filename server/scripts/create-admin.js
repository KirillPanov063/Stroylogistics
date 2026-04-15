#!/usr/bin/env node

const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "..", ".env") });
const { sequelize, User } = require("../src/db/models");
const bcrypt = require("bcrypt");
const readline = require("readline");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
};

function logSuccess(msg) {
  console.log(`${colors.green}✅ ${msg}${colors.reset}`);
}

function logError(msg) {
  console.log(`${colors.red}❌ ${msg}${colors.reset}`);
}

function logInfo(msg) {
  console.log(`${colors.blue}ℹ️ ${msg}${colors.reset}`);
}

function logStep(msg) {
  console.log(`\n${colors.yellow}📌 ${msg}${colors.reset}`);
}

function prompt(question) {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
}

async function checkEmail(email) {
  const emailPattern = /^[A-z0-9._%+-]+@[A-z0-9.-]+\.[A-z]{2,}$/;
  return emailPattern.test(email);
}

async function checkPassword(password) {
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

async function checkPhone(phone) {
  // Простая проверка российского номера
  const phonePattern =
    /^(\+7|8)[\s-]?\(?\d{3}\)?[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2}$/;
  return phonePattern.test(phone);
}

async function main() {
  console.log(
    `${colors.cyan}========================================${colors.reset}`,
  );
  console.log(`${colors.cyan}   СОЗДАНИЕ АДМИНИСТРАТОРА   ${colors.reset}`);
  console.log(
    `${colors.cyan}========================================${colors.reset}\n`,
  );

  try {
    // Подключение к БД
    logStep("Подключение к базе данных");
    await sequelize.authenticate();
    logSuccess("Подключение к БД установлено");

    // Проверяем, есть ли уже админы
    const existingAdmin = await User.findOne({ where: { role: "admin" } });
    if (existingAdmin) {
      logInfo("В системе уже есть администратор:");
      console.log(`   Email: ${existingAdmin.email}`);
      console.log(`   Имя: ${existingAdmin.full_name}`);

      const answer = await prompt(
        "\nХотите создать еще одного администратора? (y/n): ",
      );
      if (answer.toLowerCase() !== "y") {
        logInfo("Создание администратора отменено");
        process.exit(0);
      }
    }

    logStep("Введите данные администратора");

    // Ввод email
    let email = "";
    while (!email) {
      email = await prompt("Email: ");
      if (!(await checkEmail(email))) {
        logError("Некорректный формат email");
        email = "";
      }
    }

    // Ввод телефона
    let phone = "";
    while (!phone) {
      phone = await prompt("Телефон (например: +79261234567): ");
      if (!(await checkPhone(phone))) {
        logError("Некорректный формат телефона");
        phone = "";
      }
    }

    // Ввод имени
    let full_name = "";
    while (!full_name) {
      full_name = await prompt("ФИО: ");
      if (full_name.trim().length === 0) {
        logError("Имя не может быть пустым");
        full_name = "";
      }
    }

    // Ввод пароля
    let password = "";
    let passwordConfirm = "";
    while (!password) {
      password = await prompt(
        "Пароль (мин. 8 символов, заглавная, строчная, цифра, спецсимвол): ",
      );
      if (!(await checkPassword(password))) {
        logError("Пароль не соответствует требованиям безопасности");
        password = "";
        continue;
      }

      passwordConfirm = await prompt("Подтвердите пароль: ");
      if (password !== passwordConfirm) {
        logError("Пароли не совпадают");
        password = "";
      }
    }

    logStep("Проверка уникальности");

    // Проверка email
    const userByEmail = await User.findOne({
      where: { email: email.toLowerCase() },
    });
    if (userByEmail) {
      throw new Error(`Пользователь с email ${email} уже существует`);
    }

    // Проверка телефона
    const userByPhone = await User.findOne({ where: { phone } });
    if (userByPhone) {
      throw new Error(`Пользователь с телефоном ${phone} уже существует`);
    }

    logStep("Создание администратора");

    // Хеширование пароля
    const hashedPassword = await bcrypt.hash(password, 10);

    // Создание пользователя
    const admin = await User.create({
      email: email.toLowerCase(),
      phone,
      password_hash: hashedPassword,
      full_name: full_name.trim(),
      role: "admin",
      is_active: true,
    });

    logSuccess("✅ Администратор успешно создан!");
    console.log(`\n${colors.cyan}Данные администратора:${colors.reset}`);
    console.log(`   ID: ${admin.id}`);
    console.log(`   Email: ${admin.email}`);
    console.log(`   Имя: ${admin.full_name}`);
    console.log(`   Роль: ${admin.role}`);
  } catch (error) {
    logError(`Ошибка: ${error.message}`);
    console.error(error);
  } finally {
    await sequelize.close();
    rl.close();
  }
}

// Запуск скрипта
main();
