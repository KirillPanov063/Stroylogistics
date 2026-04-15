const { sequelize, User, Counterparty, Driver } = require("./src/db/models");

async function checkData() {
  try {
    await sequelize.authenticate();
    console.log("✅ Подключение к БД установлено\n");

    const users = await User.count();
    const counterparties = await Counterparty.count();
    const drivers = await Driver.count();

    console.log("📊 Статистика по таблицам:");
    console.log(`   Пользователей (users): ${users}`);
    console.log(`   Контрагентов (counterparties): ${counterparties}`);
    console.log(`   Водителей (drivers): ${drivers}`);

    if (users > 0) {
      const userList = await User.findAll({
        attributes: ["email", "role"],
        limit: 3,
      });
      console.log("\n👤 Примеры пользователей:");
      userList.forEach((u) => console.log(`   - ${u.email} (${u.role})`));
    }

    if (counterparties > 0) {
      const cpList = await Counterparty.findAll({
        attributes: ["representative_name", "person_type"],
        limit: 3,
      });
      console.log("\n🏢 Примеры контрагентов:");
      cpList.forEach((c) =>
        console.log(`   - ${c.representative_name} (${c.person_type})`),
      );
    }
  } catch (error) {
    console.error("❌ Ошибка:", error.message);
  } finally {
    await sequelize.close();
  }
}

checkData();
