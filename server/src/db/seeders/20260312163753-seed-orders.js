"use strict";
const { v4: uuidv4 } = require("uuid");

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Получаем ID контрагентов
    const [counterparties] = await queryInterface.sequelize.query(
      `SELECT id, person_type, counterparty_type FROM counterparties WHERE person_type IN ('llc', 'entrepreneur', 'individual') LIMIT 10;`,
    );

    // Получаем ID пользователей (менеджеров)
    const [users] = await queryInterface.sequelize.query(
      `SELECT id FROM users WHERE role IN ('admin', 'manager') LIMIT 2;`,
    );

    // Получаем ID водителей
    const [drivers] = await queryInterface.sequelize.query(
      `SELECT id FROM drivers WHERE is_active = true LIMIT 4;`,
    );

    // Получаем ID исполнителей (counterparties с типом executor или both)
    const [executors] = await queryInterface.sequelize.query(
      `SELECT id, person_type FROM counterparties WHERE counterparty_type IN ('executor', 'both') LIMIT 5;`,
    );

    if (counterparties.length < 3 || users.length < 1 || drivers.length < 1) {
      console.log("Недостаточно данных для создания заказов");
      return;
    }

    // Разделяем контрагентов по типам
    const llc = counterparties.find((c) => c.person_type === "llc");
    const entrepreneur = counterparties.find(
      (c) => c.person_type === "entrepreneur",
    );
    const individuals = counterparties.filter(
      (c) => c.person_type === "individual",
    );

    const orders = [];

    // ============= ЗАКАЗЫ ДЛЯ ООО (С ВОДИТЕЛЯМИ) =============
    const llcAddresses = [
      "г. Москва, ул. Ленина, д. 10, склад №3",
      "г. Москва, ул. Профсоюзная, д. 56, стр. 2",
      "г. Москва, ул. Автозаводская, д. 23, офис 45",
      "г. Москва, ул. Дорожная, д. 15, терминал В",
    ];

    for (let i = 0; i < 4; i++) {
      let paymentType;
      if (i === 0) paymentType = "invoice_with_vat";
      else if (i === 1) paymentType = "invoice_without_vat";
      else if (i === 2) paymentType = "card_transfer";
      else paymentType = "cash"; // Исправлено: было "cash_card"

      const clientAmount = (i + 1) * 5000;

      orders.push({
        id: uuidv4(),
        status:
          i === 0
            ? "draft"
            : i === 1
              ? "processing"
              : i === 2
                ? "assigned"
                : "completed",
        user_id: users[0].id,
        customer_id: llc.id,
        driver_id: drivers[i % drivers.length].id,
        executor_id: null,
        related_order_id: i === 3 ? null : null,

        container_number: `CONT-${1000 + i}`,
        container_action: i % 2 === 0 ? "install" : "pickup",
        container_volume: i % 3 === 0 ? "8m3" : i % 3 === 1 ? "20m3" : "27m3",
        installed_container_number: i % 2 === 0 ? `CONT-${1000 + i}` : null,
        picked_up_container_number: i % 2 === 1 ? `CONT-${1000 + i}` : null,

        install_date: i % 2 === 0 ? new Date() : null,
        install_duration: i % 2 === 0 ? "1 день" : null,
        pickup_reminder_date:
          i % 2 === 1 ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : null,
        loading_time: i === 2 ? "10:00-12:00" : null,

        pickup_address: llcAddresses[i],
        customer_phone: "+74951112233",
        contact_phone: "+79261112233",

        payment_type: paymentType,
        client_amount: clientAmount,
        executor_amount: 0,
        commission_amount: 0,
        payment_amount: clientAmount,

        payment_format: i === 3 ? "prepaid" : "single",
        prepaid_deliveries_total: i === 3 ? 10 : null,
        prepaid_deliveries_used: i === 3 ? 1 : null,
        payment_confirmation_file:
          i === 2 ? "/uploads/payments/confirmation.pdf" : null,

        executor_invoice_number: null,
        executor_invoice_date: null,
        executor_invoice_amount: null,
        executor_invoice_file: null,
        executor_invoice_status: "not_received",
        executor_invoice_received_at: null,
        executor_paid_at: null,
        executor_payment_confirm_file: null,

        client_invoice_number: i === 0 ? `1С-2026-${100 + i}` : null,
        client_invoice_date: i === 0 ? new Date() : null,
        client_invoice_amount: i === 0 ? clientAmount : null,
        client_payment_status:
          i === 3 ? "paid" : i === 2 ? "overdue" : "not_paid",
        client_payment_deadline:
          i === 2 ? new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) : null,
        client_paid_at: i === 3 ? new Date() : null,
        payment_reminder_sent_3days: false,
        payment_reminder_sent_1day: false,
        payment_overdue_marked_at: i === 2 ? new Date() : null,

        completion_photo: i === 3 ? "/uploads/completions/photo.jpg" : null,
        last_delivery_notified: false,
        comments:
          i === 0
            ? "Срочный заказ. Требуется звонок за час"
            : i === 1
              ? "Клиент просит позвонить за 30 минут"
              : i === 2
                ? "Оплата переводом на карту"
                : "Предоплаченный пакет на 10 доставок",

        created_at: new Date(),
        updated_at: new Date(),
      });
    }

    // ============= ЗАКАЗЫ ДЛЯ ИП (С ИСПОЛНИТЕЛЯМИ) =============
    const ipAddresses = [
      'г. Москва, ул. Строителей, д. 5, магазин "Стройматериалы"',
      'г. Москва, ул. Строителей, д. 5, магазин "Стройматериалы"',
      'г. Москва, ул. Строителей, д. 5, магазин "Стройматериалы"',
      "г. Москва, ул. Новая, д. 7, павильон 12",
    ];

    for (let i = 0; i < 4; i++) {
      let paymentType;
      if (i === 0)
        paymentType = "cash"; // Исправлено: было "cash_card"
      else if (i === 1) paymentType = "card_transfer";
      else if (i === 2) paymentType = "invoice_without_vat";
      else paymentType = "cash"; // Исправлено: было "cash_card"

      const clientAmount = 3500;
      const executorAmount = 2500;
      const commissionAmount = 1000;
      const executorId = executors[i % executors.length]?.id;

      orders.push({
        id: uuidv4(),
        status:
          i === 0
            ? "in_transit"
            : i === 1
              ? "paid"
              : i === 2
                ? "completed"
                : "cancelled",
        user_id: users[0].id,
        customer_id: entrepreneur.id,
        driver_id: null,
        executor_id: executorId,
        related_order_id: null,

        container_number: `IP-CONT-${500 + i}`,
        container_action: i % 2 === 0 ? "loading" : "install",
        container_volume: "8m3",
        installed_container_number: i % 2 === 1 ? `IP-CONT-${500 + i}` : null,
        picked_up_container_number: null,

        install_date: i % 2 === 1 ? new Date() : null,
        install_duration: i % 2 === 1 ? "1 день" : null,
        pickup_reminder_date: null,
        loading_time: i === 0 ? "14:00-16:00" : null,

        pickup_address: ipAddresses[i],
        customer_phone: "+74953334455",
        contact_phone: "+79273334455",

        payment_type: paymentType,
        client_amount: clientAmount,
        executor_amount: executorAmount,
        commission_amount: commissionAmount,
        payment_amount: clientAmount,

        payment_format: "single",
        prepaid_deliveries_total: null,
        prepaid_deliveries_used: null,
        payment_confirmation_file: null,

        executor_invoice_number: i < 3 ? `СЧ-2026-${500 + i}` : null,
        executor_invoice_date: i < 3 ? new Date() : null,
        executor_invoice_amount: i < 3 ? executorAmount : null,
        executor_invoice_file:
          i < 3 ? `/uploads/documents/invoice_${500 + i}.pdf` : null,
        executor_invoice_status:
          i === 0
            ? "received"
            : i === 1
              ? "verified"
              : i === 2
                ? "paid"
                : "not_received",
        executor_invoice_received_at: i < 3 ? new Date() : null,
        executor_paid_at: i === 2 ? new Date() : null,
        executor_payment_confirm_file:
          i === 2 ? "/uploads/documents/payment_confirm.pdf" : null,

        client_invoice_number: `1С-2026-${200 + i}`,
        client_invoice_date: new Date(),
        client_invoice_amount: clientAmount,
        client_payment_status:
          i === 0
            ? "not_paid"
            : i === 1
              ? "paid"
              : i === 2
                ? "paid"
                : "not_paid",
        client_payment_deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        client_paid_at: i === 1 || i === 2 ? new Date() : null,
        payment_reminder_sent_3days: false,
        payment_reminder_sent_1day: false,
        payment_overdue_marked_at: null,

        completion_photo: i === 2 ? "/uploads/completions/ip_photo.jpg" : null,
        last_delivery_notified: false,
        comments:
          i === 0
            ? "Водитель должен быть с маской"
            : i === 1
              ? "Клиент оплатил переводом"
              : i === 2
                ? "Выполнено, фото прилагается"
                : "Отменено по просьбе клиента",

        created_at: new Date(),
        updated_at: new Date(),
      });
    }

    // ============= ЗАКАЗЫ ДЛЯ ФИЗЛИЦ (СМЕШАННЫЕ) =============
    for (let i = 0; i < 4; i++) {
      const individual = individuals[i % individuals.length];
      const useExecutor = i % 2 === 0;
      const executorId = useExecutor
        ? executors[i % executors.length]?.id
        : null;
      const driverId = !useExecutor ? drivers[i % drivers.length].id : null;

      let clientAmount = 2500;
      let executorAmount = 0;
      let commissionAmount = 0;

      if (useExecutor && executorId) {
        executorAmount = 1800;
        commissionAmount = 700;
      }

      orders.push({
        id: uuidv4(),
        status:
          i === 0
            ? "draft"
            : i === 1
              ? "processing"
              : i === 2
                ? "assigned"
                : "in_transit",
        user_id: users[0].id,
        customer_id: individual.id,
        driver_id: driverId,
        executor_id: executorId,
        related_order_id: null,

        container_number: `IND-CONT-${i}`,
        container_action: i % 2 === 0 ? "install" : "pickup",
        container_volume: "8m3",
        installed_container_number: i % 2 === 0 ? `IND-CONT-${i}` : null,
        picked_up_container_number: i % 2 === 1 ? `IND-CONT-${i}` : null,

        install_date: i % 2 === 0 ? new Date() : null,
        install_duration: i % 2 === 0 ? "2 дня" : null,
        pickup_reminder_date:
          i % 2 === 1 ? new Date(Date.now() + 45 * 24 * 60 * 60 * 1000) : null,
        loading_time: null,

        pickup_address: `г. Москва, ул. Частная, д. ${10 + i}, кв. ${i + 5}`,
        customer_phone: `+7926${1000000 + i * 111111}`,
        contact_phone: `+7926${2000000 + i * 111111}`,

        payment_type: "cash",
        client_amount: clientAmount,
        executor_amount: executorAmount,
        commission_amount: commissionAmount,
        payment_amount: clientAmount,

        payment_format: "single",
        prepaid_deliveries_total: null,
        prepaid_deliveries_used: null,
        payment_confirmation_file: null,

        executor_invoice_number: useExecutor ? `СЧ-ФЛ-${i}` : null,
        executor_invoice_date: useExecutor ? new Date() : null,
        executor_invoice_amount: useExecutor ? executorAmount : null,
        executor_invoice_file: useExecutor
          ? `/uploads/documents/invoice_fl_${i}.pdf`
          : null,
        executor_invoice_status: useExecutor ? "not_received" : "not_received",
        executor_invoice_received_at: null,
        executor_paid_at: null,
        executor_payment_confirm_file: null,

        client_invoice_number: null,
        client_invoice_date: null,
        client_invoice_amount: null,
        client_payment_status: "not_paid",
        client_payment_deadline: null,
        client_paid_at: null,
        payment_reminder_sent_3days: false,
        payment_reminder_sent_1day: false,
        payment_overdue_marked_at: null,

        completion_photo: null,
        last_delivery_notified: false,
        comments:
          i === 0
            ? "Новый клиент, проверить доступ"
            : i === 1
              ? "Клиент сам будет на месте"
              : i === 2
                ? "Позвонить за час"
                : "Срочная доставка",

        created_at: new Date(),
        updated_at: new Date(),
      });
    }

    // ============= СОЗДАЕМ СВЯЗАННЫЕ ЗАКАЗЫ =============
    if (orders.length >= 8) {
      await queryInterface.sequelize.query(`
        UPDATE orders 
        SET related_order_id = '${orders[0].id}'
        WHERE id = '${orders[3].id}'
      `);
      console.log("✅ Создана связь между заказами");
    }

    await queryInterface.bulkInsert("orders", orders);
    console.log(`✅ Добавлено ${orders.length} заказов`);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete("orders", null, {});
    console.log("✅ Все заказы удалены");
  },
};
