// check-user.js
const { sequelize, User } = require("./src/db/models");

async function checkUser() {
  try {
    await sequelize.authenticate();
    console.log("✅ Подключение к БД работает");

    const user = await User.findOne({
      where: { email: "test1@example.com" },
    });

    if (user) {
      console.log("✅ Пользователь найден:");
      console.log("   ID:", user.id);
      console.log("   Email:", user.email);
      console.log("   Phone:", user.phone);
      console.log("   Full name:", user.full_name);
      console.log(
        "   Password hash:",
        user.password_hash ? "Есть ✅" : "ОТСУТСТВУЕТ ❌",
      );
      console.log(
        "   Password hash length:",
        user.password_hash ? user.password_hash.length : 0,
      );
      console.log("   Role:", user.role);
    } else {
      console.log("❌ Пользователь не найден");
    }

    // Посмотрим всех пользователей
    const allUsers = await User.findAll({
      attributes: ["id", "email", "phone", "role", "password_hash"],
    });

    console.log("\n📋 Все пользователи в БД:");
    allUsers.forEach((u) => {
      console.log(
        `   - ${u.email}: ${u.password_hash ? "✅ есть пароль" : "❌ нет пароля"}`,
      );
    });
  } catch (error) {
    console.error("❌ Ошибка:", error);
  } finally {
    await sequelize.close();
  }
}

checkUser();
