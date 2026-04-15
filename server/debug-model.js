const { sequelize, User } = require("./src/db/models");

async function debugModel() {
  try {
    await sequelize.authenticate();
    console.log("✅ Подключение к БД");

    // 1. Проверим структуру таблицы
    const [columns] = await sequelize.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'users'
      ORDER BY ordinal_position;
    `);

    console.log("\n📋 Структура таблицы users:");
    columns.forEach((col) => {
      console.log(
        `   - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`,
      );
    });

    // 2. Попробуем создать пользователя самым простым способом
    console.log("\n🔧 Пробуем создать пользователя...");

    const testEmail = `test_${Date.now()}@example.com`;
    const hashedPassword = await require("bcrypt").hash("Test123!", 10);

    // Используем raw query для проверки
    const [result] = await sequelize.query(`
      INSERT INTO users (id, email, phone, password_hash, full_name, role, created_at, updated_at)
      VALUES (
        gen_random_uuid(),
        '${testEmail}',
        '+79261234598',
        '${hashedPassword}',
        'Test User',
        'user',
        NOW(),
        NOW()
      )
      RETURNING id, email, password_hash;
    `);

    console.log("✅ Raw SQL insert result:", result[0]);
    console.log(
      "   Password hash in DB:",
      result[0].password_hash ? "✅ ЕСТЬ" : "❌ НЕТ",
    );
  } catch (error) {
    console.error("❌ Ошибка:", error);
  } finally {
    await sequelize.close();
  }
}

debugModel();
