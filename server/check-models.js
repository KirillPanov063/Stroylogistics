const path = require("path");
const fs = require("fs");

console.log("🔍 Проверка файлов моделей:");
console.log("------------------------");

const modelsPath = path.join(__dirname, "src", "db", "models");
const files = fs.readdirSync(modelsPath);

console.log("📁 Файлы в models:");
files.forEach((file) => {
  console.log(`   - ${file}`);
});

console.log("\n🔍 Пробуем загрузить модели...");
try {
  const db = require("./src/db/models");
  console.log("✅ Модели загружены успешно!");
  console.log(
    "📦 Загруженные модели:",
    Object.keys(db).filter((key) => !["sequelize", "Sequelize"].includes(key)),
  );
} catch (error) {
  console.log("❌ Ошибка загрузки моделей:");
  console.log(error);
}
