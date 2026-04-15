const { sequelize, User } = require("./src/db/models");
const bcrypt = require("bcrypt");

async function testSignUp() {
  try {
    await sequelize.authenticate();
    console.log("✅ Подключение к БД");

    // Тестовые данные
    const testEmail = `test_${Date.now()}@example.com`;
    const hashedPassword = await bcrypt.hash("Test123!", 10);

    console.log("📝 Создаём пользователя:", {
      email: testEmail,
      phone: "+79261234598",
      password_hash: hashedPassword.substring(0, 20) + "...",
      full_name: "Test User",
      role: "user",
    });

    // Создаём пользователя напрямую через модель
    const user = await User.create({
      email: testEmail,
      phone: "+79261234598",
      password_hash: hashedPassword,
      full_name: "Test User",
      role: "user",
    });

    console.log("✅ Пользователь создан, ID:", user.id);

    // Проверяем, что сохранилось
    const savedUser = await User.findOne({
      where: { email: testEmail },
      attributes: ["id", "email", "password_hash"],
    });

    console.log("🔍 Данные из БД после сохранения:");
    console.log("   ID:", savedUser.id);
    console.log("   Email:", savedUser.email);
    console.log(
      "   Password hash:",
      savedUser.password_hash ? "✅ ЕСТЬ" : "❌ НЕТ",
    );
    console.log(
      "   Длина:",
      savedUser.password_hash ? savedUser.password_hash.length : 0,
    );
  } catch (error) {
    console.error("❌ Ошибка:", error);
  } finally {
    await sequelize.close();
  }
}

testSignUp();
