'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // ENUM для статуса счета от исполнителя
    await queryInterface.sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE enum_invoice_from_executor_status AS ENUM (
          'not_received', 'received', 'verified', 'paid'
        );
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // ENUM для типа документа
    await queryInterface.sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE enum_document_type AS ENUM (
          'invoice_from_executor', 'acceptance_act', 'contract'
        );
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // ENUM для статуса оплаты
    await queryInterface.sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE enum_payment_status AS ENUM (
          'pending', 'paid', 'overdue', 'cancelled'
        );
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.query(`DROP TYPE IF EXISTS enum_invoice_from_executor_status;`);
    await queryInterface.sequelize.query(`DROP TYPE IF EXISTS enum_document_type;`);
    await queryInterface.sequelize.query(`DROP TYPE IF EXISTS enum_payment_status;`);
  }
};