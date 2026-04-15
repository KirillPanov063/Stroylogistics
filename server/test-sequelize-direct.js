const { sequelize, User } = require("./src/db/models");
const bcrypt = require("bcrypt");

async function testSequelizeDirect() {
  try {
    await sequelize.authenticate();
    console.log("✅ Подключение к БД");

    const testEmail = `test_${Date.now()}@example.com`;
    const testPhone = `+7926${Math.floor(Math.random() * 1000000)}`;
    const hashedPassword = await bcrypt.hash("Test123!", 10);

    console.log("\n🔧 Создаём пользователя через Sequelize:");
    console.log("   Email:", testEmail);
    console.log("   Phone:", testPhone);
    console.log("   Password hash готов, длина:", hashedPassword.length);

    // Используем build + save вместо create
    const user = User.build({
      email: testEmail,
      phone: testPhone,
      password_hash: hashedPassword,
      full_name: "Test User",
      role: "user",
    });

    console.log("📦 Объект перед сохранением:", {
      email: user.email,
      phone: user.phone,
      hasPasswordHash: !!user.password_hash,
      passwordHashLength: user.password_hash ? user.password_hash.length : 0,
    });

    await user.save();

    console.log("✅ После save(), ID:", user.id);
    console.log(
      "   password_hash в объекте:",
      user.password_hash ? "✅ ЕСТЬ" : "❌ НЕТ",
    );

    // Проверяем в БД отдельным запросом
    const [result] = await sequelize.query(
      "SELECT id, email, password_hash FROM users WHERE id = $1",
      { bind: [user.id] },
    );

    console.log("\n🔍 Проверка в БД через raw SQL:");
    console.log("   ID:", result[0].id);
    console.log("   Email:", result[0].email);
    console.log(
      "   Password hash:",
      result[0].password_hash ? "✅ ЕСТЬ" : "❌ НЕТ",
    );
    console.log(
      "   Длина:",
      result[0].password_hash ? result[0].password_hash.length : 0,
    );
  } catch (error) {
    console.error("❌ Ошибка:", error);
  } finally {
    await sequelize.close();
  }
}

testSequelizeDirect();
