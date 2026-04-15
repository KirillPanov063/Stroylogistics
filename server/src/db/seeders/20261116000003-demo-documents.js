// seeders/20260114000003-demo-documents.js

"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Получаем ID заказов
    const orders = await queryInterface.sequelize.query(
      `SELECT id, order_number FROM orders WHERE order_number IN (10001, 10002);`,
      { type: Sequelize.QueryTypes.SELECT },
    );

    if (!orders || orders.length === 0) {
      console.log("⚠️ Нет заказов для создания документов");
      return;
    }

    const [users] = await queryInterface.sequelize.query(
      `SELECT id FROM users LIMIT 1;`,
      { type: Sequelize.QueryTypes.SELECT },
    );

    const order1 = orders.find((o) => o.order_number === 10001);
    const order2 = orders.find((o) => o.order_number === 10002);

    const documents = [
      {
        id: Sequelize.literal("gen_random_uuid()"),
        order_id: order1.id,
        document_type: "executor_invoice",
        file_path: "/uploads/documents/invoice_001.pdf",
        file_name: "Счет_СпецТранс_001.pdf",
        file_size: 245760,
        mime_type: "application/pdf",
        document_number: "СЧ-2026-001",
        document_date: "2026-01-10",
        amount: 25000.0,
        status: "active",
        uploaded_by: users.id,
        created_at: new Date("2026-01-10"),
        updated_at: new Date("2026-01-10"),
      },
      {
        id: Sequelize.literal("gen_random_uuid()"),
        order_id: order1.id,
        document_type: "executor_payment_confirmation",
        file_path: "/uploads/documents/payment_confirm_001.pdf",
        file_name: "Платежка_СпецТранс_001.pdf",
        file_size: 156789,
        mime_type: "application/pdf",
        document_number: "ПП-2026-001",
        document_date: "2026-01-15",
        amount: 25000.0,
        status: "active",
        uploaded_by: users.id,
        created_at: new Date("2026-01-15"),
        updated_at: new Date("2026-01-15"),
      },
      {
        id: Sequelize.literal("gen_random_uuid()"),
        order_id: order1.id,
        document_type: "client_payment_confirmation",
        file_path: "/uploads/documents/client_payment_001.pdf",
        file_name: "Платеж_ООО_Ромашка_001.pdf",
        file_size: 123456,
        mime_type: "application/pdf",
        document_number: "ПП-2026-002",
        document_date: "2026-01-08",
        amount: 30000.0,
        status: "active",
        uploaded_by: users.id,
        created_at: new Date("2026-01-08"),
        updated_at: new Date("2026-01-08"),
      },
      {
        id: Sequelize.literal("gen_random_uuid()"),
        order_id: order2.id,
        document_type: "executor_invoice",
        file_path: "/uploads/documents/invoice_002.pdf",
        file_name: "Счет_СпецТранс_002.pdf",
        file_size: 234567,
        mime_type: "application/pdf",
        document_number: "СЧ-2026-002",
        document_date: "2026-01-12",
        amount: 11000.0,
        status: "active",
        uploaded_by: users.id,
        created_at: new Date("2026-01-12"),
        updated_at: new Date("2026-01-12"),
      },
      {
        id: Sequelize.literal("gen_random_uuid()"),
        order_id: order2.id,
        document_type: "contract",
        file_path: "/uploads/documents/contract_002.pdf",
        file_name: "Договор_ИП_Иванов.pdf",
        file_size: 345678,
        mime_type: "application/pdf",
        document_number: "Д-2026-002",
        document_date: "2026-01-05",
        amount: null,
        status: "active",
        uploaded_by: users.id,
        created_at: new Date("2026-01-05"),
        updated_at: new Date("2026-01-05"),
      },
    ];

    await queryInterface.bulkInsert("documents", documents, {});
    console.log(`✅ Добавлено ${documents.length} документов`);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete(
      "documents",
      {
        document_number: { [Sequelize.Op.like]: "СЧ-2026-%" },
      },
      {},
    );
    console.log("✅ Демо-документы удалены");
  },
};
