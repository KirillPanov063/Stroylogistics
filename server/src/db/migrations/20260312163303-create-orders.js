"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Создаем ENUM типы
    await queryInterface.sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE enum_orders_status AS ENUM (
          'draft', 'processing', 'assigned', 'in_transit', 'paid', 'completed', 'cancelled'
        );
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryInterface.sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE enum_orders_container_action AS ENUM ('install', 'pickup', 'loading');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryInterface.sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE enum_orders_container_volume AS ENUM ('8m3', '20m3', '27m3');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Обновленный ENUM для payment_type с учетом НДС
    await queryInterface.sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE enum_orders_payment_type AS ENUM (
          'invoice_with_vat', 
          'invoice_without_vat', 
          'card_transfer', 
          'cash'
        );
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryInterface.sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE enum_orders_payment_format AS ENUM ('single', 'prepaid');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Создаем последовательность для order_number
    await queryInterface.sequelize.query(`
      CREATE SEQUENCE IF NOT EXISTS orders_order_number_seq;
    `);

    // Создаем таблицу orders
    await queryInterface.createTable("orders", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        comment: "Уникальный идентификатор заказа",
      },

      order_number: {
        type: Sequelize.INTEGER,
        defaultValue: Sequelize.literal("nextval('orders_order_number_seq')"),
        unique: true,
        allowNull: false,
        comment: "Номер заказа (автоинкрементный)",
      },

      status: {
        type: "enum_orders_status",
        defaultValue: "draft",
        allowNull: false,
        comment: "Статус заказа",
      },

      // ============= СВЯЗИ =============

      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "users",
          key: "id",
        },
        onDelete: "RESTRICT",
        onUpdate: "CASCADE",
        comment: "ID пользователя, создавшего заказ",
      },

      customer_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "counterparties",
          key: "id",
        },
        onDelete: "RESTRICT",
        onUpdate: "CASCADE",
        comment: "ID клиента",
      },

      // Исполнитель-подрядчик (внешний)
      executor_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: "counterparties",
          key: "id",
        },
        onDelete: "SET NULL",
        onUpdate: "CASCADE",
        comment: "ID исполнителя (внешний подрядчик, получает оплату)",
      },

      // Водитель компании (сотрудник)
      driver_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: "drivers",
          key: "id",
        },
        onDelete: "SET NULL",
        onUpdate: "CASCADE",
        comment: "ID водителя компании (сотрудник, зарплата отдельно)",
      },

      related_order_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: "orders",
          key: "id",
        },
        onDelete: "SET NULL",
        onUpdate: "CASCADE",
        comment: "ID связанного заказа",
      },

      // ============= ДАННЫЕ О КОНТЕЙНЕРЕ =============

      container_number: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: "Номер контейнера",
      },

      container_action: {
        type: "enum_orders_container_action",
        allowNull: true,
        comment: "Действие с контейнером",
      },

      container_volume: {
        type: "enum_orders_container_volume",
        allowNull: true,
        comment: "Объем контейнера",
      },

      installed_container_number: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: "Номер установленного контейнера",
      },

      picked_up_container_number: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: "Номер забранного контейнера",
      },

      // ============= ДАТЫ И СРОКИ =============

      install_date: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: "Дата установки",
      },

      install_duration: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: "Длительность установки",
      },

      pickup_reminder_date: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: "Дата напоминания о заборе",
      },

      loading_time: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: "Время загрузки",
      },

      // ============= АДРЕСА И КОНТАКТЫ =============

      pickup_address: {
        type: Sequelize.TEXT,
        allowNull: false,
        comment: "Адрес забора/доставки",
      },

      customer_phone: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: "Телефон клиента",
      },

      contact_phone: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: "Контактный телефон",
      },

      // ============= ОПЛАТА =============

      payment_type: {
        type: "enum_orders_payment_type",
        allowNull: false,
        comment:
          "Тип оплаты: счет с НДС, счет без НДС, перевод на карту, наличные",
      },

      // Сумма от клиента (полная стоимость)
      client_amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
        comment: "Сумма от клиента (полная стоимость заказа)",
      },

      // Сумма исполнителю (после вычета комиссии)
      executor_amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
        comment: "Сумма исполнителю (после вычета комиссии)",
      },

      // Комиссия
      commission_amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
        comment: "Комиссия (разница между client_amount и executor_amount)",
      },

      // Поле для обратной совместимости
      payment_amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
        comment: "Сумма оплаты (синхронизируется с client_amount)",
      },

      payment_format: {
        type: "enum_orders_payment_format",
        allowNull: true,
        comment: "Формат оплаты",
      },

      prepaid_deliveries_total: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: "Всего предоплаченных доставок",
      },

      prepaid_deliveries_used: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: true,
        comment: "Использовано доставок",
      },

      payment_confirmation_file: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: "Путь к файлу подтверждения оплаты",
      },

      // ============= ФОТО ВЫПОЛНЕНИЯ =============

      completion_photo: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: "Путь к фото выполнения",
      },

      // ============= УВЕДОМЛЕНИЯ =============

      last_delivery_notified: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        comment: "Флаг уведомления о последней доставке",
      },

      // ============= КОММЕНТАРИИ =============

      comments: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: "Комментарии к заказу",
      },

      // ============= ВРЕМЕННЫЕ МЕТКИ =============

      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
        comment: "Дата создания заказа",
      },

      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
        comment: "Дата последнего обновления",
      },
    });

    // Добавляем индексы
    await queryInterface.addIndex("orders", ["order_number"], { unique: true });
    await queryInterface.addIndex("orders", ["status"]);
    await queryInterface.addIndex("orders", ["user_id"]);
    await queryInterface.addIndex("orders", ["customer_id"]);
    await queryInterface.addIndex("orders", ["executor_id"]);
    await queryInterface.addIndex("orders", ["driver_id"]);
    await queryInterface.addIndex("orders", ["related_order_id"]);
    await queryInterface.addIndex("orders", ["install_date"]);
    await queryInterface.addIndex("orders", ["pickup_reminder_date"]);
    await queryInterface.addIndex("orders", ["payment_format"]);
    await queryInterface.addIndex("orders", ["client_amount"]);
    await queryInterface.addIndex("orders", ["executor_amount"]);
    await queryInterface.addIndex("orders", ["commission_amount"]);
    await queryInterface.addIndex("orders", ["payment_amount"]);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable("orders");

    // Удаляем последовательность
    await queryInterface.sequelize.query(`
      DROP SEQUENCE IF EXISTS orders_order_number_seq;
    `);

    // Удаляем ENUM типы
    await queryInterface.sequelize.query(`
      DROP TYPE IF EXISTS enum_orders_status;
      DROP TYPE IF EXISTS enum_orders_container_action;
      DROP TYPE IF EXISTS enum_orders_container_volume;
      DROP TYPE IF EXISTS enum_orders_payment_type;
      DROP TYPE IF EXISTS enum_orders_payment_format;
    `);
  },
};
