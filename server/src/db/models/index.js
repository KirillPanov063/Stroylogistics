"use strict";

// 👇 ВАЖНО: загружаем dotenv в самом начале
require("dotenv").config();

const fs = require("fs");
const path = require("path");
const Sequelize = require("sequelize");
const process = require("process");
const basename = path.basename(__filename);
const env = process.env.NODE_ENV || "development";
const config = require(__dirname + "/../config/database.json")[env];
const db = {};

let sequelize;
if (config.use_env_variable) {
  // Правильно передаем URL из process.env
  const databaseUrl = process.env[config.use_env_variable];
  if (!databaseUrl) {
    throw new Error(
      `Переменная окружения ${config.use_env_variable} не найдена`,
    );
  }
  sequelize = new Sequelize(databaseUrl, {
    dialect: "postgres",
    logging: false,
    dialectOptions: {
      ssl: false,
    },
  });
} else {
  sequelize = new Sequelize(config.database, config.username, config.password, {
    ...config,
    logging: false,
  });
}

// Импорт всех моделей
fs.readdirSync(__dirname)
  .filter((file) => {
    return (
      file.indexOf(".") !== 0 &&
      file !== basename &&
      file.slice(-3) === ".js" &&
      file.indexOf(".test.js") === -1
    );
  })
  .forEach((file) => {
    const model = require(path.join(__dirname, file))(
      sequelize,
      Sequelize.DataTypes,
    );
    db[model.name] = model;
    console.log(`✅ Модель загружена: ${model.name}`);
  });

// Настройка ассоциаций
Object.keys(db).forEach((modelName) => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

// ============= АССОЦИАЦИИ =============

// Ассоциации для User и Driver (существующие)
if (db.User && db.Driver) {
  db.User.hasOne(db.Driver, {
    foreignKey: "user_id",
    as: "driver_info",
    onDelete: "SET NULL",
  });

  db.Driver.belongsTo(db.User, {
    foreignKey: "user_id",
    as: "user_info",
    onDelete: "SET NULL",
  });
  console.log("✅ Ассоциации User-Driver настроены");
}

// ============= АССОЦИАЦИИ ДЛЯ КОНТРАГЕНТОВ =============

// Ассоциации для Counterparty
if (db.Counterparty) {
  // Связь с CompanyDetail (один к одному)
  db.Counterparty.hasOne(db.CompanyDetail, {
    foreignKey: "counterparty_id",
    as: "company_details",
    onDelete: "CASCADE",
  });

  // Связь с Object (один ко многим)
  db.Counterparty.hasMany(db.Object, {
    foreignKey: "counterparty_id",
    as: "objects",
    onDelete: "CASCADE",
  });

  // Связи как клиент (один ко многим)
  db.Counterparty.hasMany(db.Relationship, {
    foreignKey: "client_id",
    as: "client_relationships",
    onDelete: "CASCADE",
  });

  // Связи как исполнитель (один ко многим)
  db.Counterparty.hasMany(db.Relationship, {
    foreignKey: "executor_id",
    as: "executor_relationships",
    onDelete: "CASCADE",
  });
  console.log("✅ Ассоциации Counterparty настроены");
}

// Ассоциации для CompanyDetail
if (db.CompanyDetail && db.Counterparty) {
  db.CompanyDetail.belongsTo(db.Counterparty, {
    foreignKey: "counterparty_id",
    as: "counterparty",
    onDelete: "CASCADE",
  });
  console.log("✅ Ассоциации CompanyDetail настроены");
}

// Ассоциации для Object
if (db.Object && db.Counterparty) {
  db.Object.belongsTo(db.Counterparty, {
    foreignKey: "counterparty_id",
    as: "counterparty",
    onDelete: "CASCADE",
  });
  console.log("✅ Ассоциации Object настроены");
}

// Ассоциации для Relationship
if (db.Relationship && db.Counterparty) {
  db.Relationship.belongsTo(db.Counterparty, {
    foreignKey: "client_id",
    as: "client",
    onDelete: "CASCADE",
  });

  db.Relationship.belongsTo(db.Counterparty, {
    foreignKey: "executor_id",
    as: "executor",
    onDelete: "CASCADE",
  });
  console.log("✅ Ассоциации Relationship настроены");
}

// ============= АССОЦИАЦИИ ДЛЯ ORDER =============

if (db.Order) {
  // Order → User (кто создал)
  if (db.User) {
    db.Order.belongsTo(db.User, {
      foreignKey: "user_id",
      as: "creator",
      onDelete: "RESTRICT",
    });

    db.User.hasMany(db.Order, {
      foreignKey: "user_id",
      as: "created_orders",
    });
  }

  // Order → Counterparty (клиент)
  if (db.Counterparty) {
    db.Order.belongsTo(db.Counterparty, {
      foreignKey: "customer_id",
      as: "customer",
      onDelete: "RESTRICT",
    });

    db.Counterparty.hasMany(db.Order, {
      foreignKey: "customer_id",
      as: "orders",
    });
  }

  // Order → Counterparty (исполнитель) - ИСПРАВЛЕНО (без scope)
  if (db.Counterparty) {
    db.Order.belongsTo(db.Counterparty, {
      foreignKey: "executor_id",
      as: "executor",
      onDelete: "SET NULL",
    });

    db.Counterparty.hasMany(db.Order, {
      foreignKey: "executor_id",
      as: "executor_orders",
    });
  }

  // Order → Driver (водитель)
  if (db.Driver) {
    db.Order.belongsTo(db.Driver, {
      foreignKey: "driver_id",
      as: "driver",
      onDelete: "SET NULL",
    });

    db.Driver.hasMany(db.Order, {
      foreignKey: "driver_id",
      as: "assigned_orders",
    });
  }

  // Order → Order (связанный заказ)
  db.Order.belongsTo(db.Order, {
    foreignKey: "related_order_id",
    as: "related_order",
    onDelete: "SET NULL",
  });

  db.Order.hasMany(db.Order, {
    foreignKey: "related_order_id",
    as: "child_orders",
  });

  console.log("✅ Ассоциации Order настроены");
}

// ============= АССОЦИАЦИИ ДЛЯ DOCUMENT =============

if (db.Document) {
  // Document → User (кто загрузил документ)
  if (db.User) {
    db.Document.belongsTo(db.User, {
      foreignKey: "uploaded_by",
      as: "uploader",
      onDelete: "SET NULL",
    });

    db.User.hasMany(db.Document, {
      foreignKey: "uploaded_by",
      as: "uploaded_documents",
    });
  }

  // Document → Counterparty (документы контрагента: счета, акты, договоры)
  if (db.Counterparty) {
    db.Document.belongsTo(db.Counterparty, {
      foreignKey: "counterparty_id",
      as: "counterparty",
      onDelete: "CASCADE",
    });

    db.Counterparty.hasMany(db.Document, {
      foreignKey: "counterparty_id",
      as: "documents",
    });
  }

  // Document → Order (документы заказа: счета от исполнителей, подтверждения оплаты)
  if (db.Order) {
    db.Document.belongsTo(db.Order, {
      foreignKey: "order_id",
      as: "order",
      onDelete: "CASCADE",
    });

    db.Order.hasMany(db.Document, {
      foreignKey: "order_id",
      as: "documents",
    });
  }

  // Document → Object (документы объекта: разрешения, акты)
  if (db.Object) {
    db.Document.belongsTo(db.Object, {
      foreignKey: "object_id",
      as: "object",
      onDelete: "SET NULL",
    });

    db.Object.hasMany(db.Document, {
      foreignKey: "object_id",
      as: "documents",
    });
  }

  // Связь для родительского документа (если документ является версией другого документа)
  db.Document.belongsTo(db.Document, {
    foreignKey: "parent_document_id",
    as: "parent_document",
    onDelete: "SET NULL",
  });

  db.Document.hasMany(db.Document, {
    foreignKey: "parent_document_id",
    as: "child_versions",
  });

  console.log("✅ Ассоциации Document настроены");
}

// ============= ДОПОЛНИТЕЛЬНЫЕ АССОЦИАЦИИ ДЛЯ РАБОТЫ С ДОКУМЕНТАМИ =============

console.log("🎉 Все модели успешно загружены и ассоциированы");

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;
