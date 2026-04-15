const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Order = sequelize.define(
    "Order",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        comment: "Уникальный идентификатор заказа",
      },

      order_number: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        unique: true,
        allowNull: false,
        comment: "Номер заказа (автоинкрементный)",
      },

      status: {
        type: DataTypes.ENUM(
          "draft", // Черновик - заказ создан, но ещё не оформлен
          "processing", // В обработке - заказ принят, ищут исполнителя
          "assigned", // Назначен - исполнитель назначен
          "in_transit", // В пути - выполняется доставка/забор
          "paid", // Оплачен - оплата получена
          "completed", // Завершен - услуга оказана полностью
          "cancelled", // Отменен - заказ отменён
        ),
        defaultValue: "draft",
        allowNull: false,
        comment: "Статус заказа",
      },

      // ============= СВЯЗИ =============

      user_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: "users",
          key: "id",
        },
        onDelete: "RESTRICT",
        onUpdate: "CASCADE",
        comment: "ID пользователя, создавшего заказ (менеджер/оператор)",
      },

      customer_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: "counterparties",
          key: "id",
        },
        onDelete: "RESTRICT",
        onUpdate: "CASCADE",
        comment: "ID клиента (заказчика услуг)",
      },

      // Исполнитель-подрядчик (внешний)
      executor_id: {
        type: DataTypes.UUID,
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
        type: DataTypes.UUID,
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
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: "orders",
          key: "id",
        },
        onDelete: "SET NULL",
        onUpdate: "CASCADE",
        comment: "ID связанного заказа (например, установка → забор)",
      },

      // ============= ДАННЫЕ О КОНТЕЙНЕРЕ =============

      container_number: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: "Номер контейнера",
      },

      container_action: {
        type: DataTypes.ENUM(
          "install", // Установка контейнера
          "pickup", // Забор контейнера
          "loading", // Загрузка/выгрузка
        ),
        allowNull: true,
        comment: "Действие с контейнером: установка, забор, загрузка",
      },

      container_volume: {
        type: DataTypes.ENUM(
          "8m3", // 8 кубических метров
          "20m3", // 20 кубических метров
          "27m3", // 27 кубических метров
        ),
        allowNull: true,
        comment: "Объем контейнера",
      },

      installed_container_number: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: "Номер установленного контейнера",
      },

      picked_up_container_number: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: "Номер забранного контейнера",
      },

      // ============= ДАТЫ И СРОКИ =============

      install_date: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: "Дата установки",
      },

      install_duration: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Длительность установки (например: "1 день", "2-3 дня")',
      },

      pickup_reminder_date: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: "Дата напоминания о заборе",
      },

      loading_time: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: "Время загрузки",
      },

      // ============= АДРЕСА И КОНТАКТЫ =============

      pickup_address: {
        type: DataTypes.TEXT,
        allowNull: false,
        comment: "Адрес забора/доставки",
      },

      customer_phone: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: "Телефон клиента",
      },

      contact_phone: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: "Контактный телефон",
      },

      // ============= ОПЛАТА =============

      payment_type: {
        type: DataTypes.ENUM(
          "invoice_with_vat", // Счет с НДС (безналичный расчет)
          "invoice_without_vat", // Счет без НДС (безналичный расчет)
          "card_transfer", // Перевод на карту
          "cash", // Наличные
        ),
        allowNull: false,
        comment:
          "Тип оплаты: счет с НДС, счет без НДС, перевод на карту, наличные",
      },

      // Сумма от клиента (полная стоимость)
      client_amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        comment: "Сумма от клиента (полная стоимость заказа)",
      },

      // Сумма исполнителю (после вычета комиссии)
      executor_amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        comment: "Сумма исполнителю (после вычета комиссии)",
      },

      // Комиссия
      commission_amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        comment: "Комиссия (разница между client_amount и executor_amount)",
      },

      // Поле для обратной совместимости (синхронизируется с client_amount)
      payment_amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        comment:
          "Сумма оплаты (для обратной совместимости, синхронизируется с client_amount)",
      },

      payment_format: {
        type: DataTypes.ENUM(
          "single", // Разовый платеж
          "prepaid", // Предоплата (пакет доставок)
        ),
        allowNull: true,
        comment: "Формат оплаты",
      },

      prepaid_deliveries_total: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: "Всего предоплаченных доставок",
      },

      prepaid_deliveries_used: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        allowNull: true,
        comment: "Использовано доставок из предоплаченного пакета",
      },

      payment_confirmation_file: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: "Путь к файлу подтверждения оплаты",
      },

      // ============= НОВЫЕ ПОЛЯ ДЛЯ СЧЕТОВ ОТ ИСПОЛНИТЕЛЕЙ =============

      executor_invoice_number: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: "Номер счета от исполнителя",
      },

      executor_invoice_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
        comment: "Дата счета от исполнителя",
      },

      executor_invoice_amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        comment: "Сумма в счете от исполнителя",
      },

      executor_invoice_file: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: "Путь к файлу счета от исполнителя",
      },

      executor_invoice_status: {
        type: DataTypes.ENUM(
          "not_received", // Не получен
          "received", // Получен
          "verified", // Проверен
          "paid", // Оплачен исполнителю
          "rejected", // Отклонен
        ),
        defaultValue: "not_received",
        allowNull: false,
        comment: "Статус обработки счета от исполнителя",
      },

      executor_invoice_received_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: "Дата получения счета от исполнителя",
      },

      executor_paid_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: "Дата оплаты счета исполнителю",
      },

      executor_payment_confirm_file: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: "Путь к файлу подтверждения оплаты исполнителю",
      },

      // ============= ПОЛЯ ДЛЯ ОПЛАТЫ ОТ КЛИЕНТА =============

      client_invoice_number: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: "Номер счета клиенту (формируется в 1С)",
      },

      client_invoice_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
        comment: "Дата счета клиенту",
      },

      client_invoice_amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        comment: "Сумма в счете клиенту",
      },

      client_payment_status: {
        type: DataTypes.ENUM(
          "not_paid", // Не оплачен
          "partially_paid", // Частично оплачен
          "paid", // Оплачен полностью
          "overdue", // Просрочен
        ),
        defaultValue: "not_paid",
        allowNull: false,
        comment: "Статус оплаты от клиента",
      },

      client_payment_deadline: {
        type: DataTypes.DATEONLY,
        allowNull: true,
        comment:
          "Срок оплаты от клиента (обычно 3-5 дней после выставления счета)",
      },

      client_paid_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: "Дата полной оплаты от клиента",
      },

      payment_reminder_sent_3days: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: "Отправлено напоминание об оплате за 3 дня",
      },

      payment_reminder_sent_1day: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: "Отправлено напоминание об оплате за 1 день",
      },

      payment_overdue_marked_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: "Дата отметки о просрочке платежа",
      },

      // ============= ФОТО ВЫПОЛНЕНИЯ =============

      completion_photo: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: "Путь к фото выполнения",
      },

      // ============= УВЕДОМЛЕНИЯ =============

      last_delivery_notified: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: "Флаг уведомления о последней доставке",
      },

      // ============= КОММЕНТАРИИ =============

      comments: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: "Комментарии к заказу",
      },

      // ============= ВРЕМЕННЫЕ МЕТКИ =============

      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        comment: "Дата создания заказа",
      },

      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        comment: "Дата последнего обновления",
      },
    },
    {
      tableName: "orders",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      hooks: {
        beforeValidate: (order) => {
          // ============= ПРОПУСК ВАЛИДАЦИИ ДЛЯ ОБНОВЛЕНИЯ СТАТУСА =============
          // Если установлен флаг _skipStatusValidation, пропускаем всю валидацию
          if (order._skipStatusValidation) {
            return;
          }

          // ============= СИНХРОНИЗАЦИЯ ПОЛЕЙ =============
          // Если заполнен client_amount, синхронизируем payment_amount
          if (
            order.client_amount !== undefined &&
            order.client_amount !== null
          ) {
            order.payment_amount = order.client_amount;
          }
          // Если заполнен payment_amount, а client_amount нет, синхронизируем обратно
          if (
            (order.client_amount === undefined ||
              order.client_amount === null) &&
            order.payment_amount !== undefined &&
            order.payment_amount !== null
          ) {
            order.client_amount = order.payment_amount;
          }

          // ============= ПРОВЕРКА НАЛИЧИЯ ИСПОЛНИТЕЛЯ =============
          const hasDriver =
            order.driver_id !== null && order.driver_id !== undefined;
          const hasExecutor =
            order.executor_id !== null && order.executor_id !== undefined;

          if (!hasDriver && !hasExecutor) {
            throw new Error(
              "Должен быть указан либо водитель, либо исполнитель",
            );
          }

          if (hasDriver && hasExecutor) {
            throw new Error(
              "Нельзя указать одновременно и водителя, и исполнителя",
            );
          }

          // ============= ВАЛИДАЦИЯ ДЛЯ ВОДИТЕЛЯ (сотрудник компании) =============
          if (hasDriver) {
            // executor_amount и commission_amount не должны быть заполнены
            if (order.executor_amount !== null && order.executor_amount !== 0) {
              throw new Error(
                "Для заказа с водителем компании сумма исполнителю должна быть 0 или null",
              );
            }
            if (
              order.commission_amount !== null &&
              order.commission_amount !== 0
            ) {
              throw new Error(
                "Для заказа с водителем компании комиссия должна быть 0 или null",
              );
            }

            // Если client_amount не указан, устанавливаем 0
            if (
              order.client_amount === undefined ||
              order.client_amount === null
            ) {
              order.client_amount = 0;
            }

            // Синхронизация payment_amount
            order.payment_amount = order.client_amount;
          }

          // ============= ВАЛИДАЦИЯ ДЛЯ ИСПОЛНИТЕЛЯ (внешний подрядчик) =============
          if (hasExecutor) {
            // client_amount обязателен
            if (!order.client_amount || order.client_amount <= 0) {
              throw new Error(
                "Для внешнего исполнителя необходимо указать сумму от клиента",
              );
            }
            // executor_amount обязателен
            if (!order.executor_amount || order.executor_amount <= 0) {
              throw new Error(
                "Для внешнего исполнителя необходимо указать сумму исполнителю",
              );
            }
            // commission_amount обязателен
            if (
              order.commission_amount === null ||
              order.commission_amount === undefined
            ) {
              throw new Error(
                "Для внешнего исполнителя необходимо указать сумму комиссии",
              );
            }
            // Проверка арифметики
            if (
              Number(order.client_amount) !==
              Number(order.executor_amount) + Number(order.commission_amount)
            ) {
              throw new Error(
                "Сумма от клиента должна равняться сумме исполнителю плюс комиссия",
              );
            }
          }

          // ============= ВАЛИДАЦИЯ ДЛЯ ПРЕДОПЛАТЫ =============
          if (order.payment_format === "prepaid") {
            if (
              !order.prepaid_deliveries_total ||
              order.prepaid_deliveries_total <= 0
            ) {
              throw new Error(
                "Для предоплаты необходимо указать количество доставок",
              );
            }
          }
        },
      },
      indexes: [
        {
          fields: ["order_number"],
          unique: true,
        },
        {
          fields: ["status"],
        },
        {
          fields: ["user_id"],
        },
        {
          fields: ["customer_id"],
        },
        {
          fields: ["executor_id"],
        },
        {
          fields: ["driver_id"],
        },
        {
          fields: ["related_order_id"],
        },
        {
          fields: ["install_date"],
        },
        {
          fields: ["pickup_reminder_date"],
        },
        {
          fields: ["payment_format"],
        },
        {
          fields: ["client_amount"],
        },
        {
          fields: ["executor_amount"],
        },
        {
          fields: ["commission_amount"],
        },
        {
          fields: ["payment_amount"],
        },
        // Новые индексы для работы со счетами
        {
          fields: ["executor_invoice_status"],
        },
        {
          fields: ["client_payment_status"],
        },
        {
          fields: ["client_payment_deadline"],
        },
        {
          fields: ["executor_invoice_number"],
        },
        {
          fields: ["client_invoice_number"],
        },
      ],
    },
  );

  return Order;
};
