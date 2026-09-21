"use strict";

const SalaryService = require("../services/SalaryService");
const formatResponse = require("../utils/formatResponse");

class SalaryController {
  // GET /api/salary/report?period=2026-05&user_id=...
  static async getReport(req, res) {
    try {
      const { period, user_id } = req.query;
      if (!period || !/^\d{4}-\d{2}$/.test(period)) {
        return res
          .status(400)
          .json(formatResponse.error("Параметр period обязателен в формате YYYY-MM"));
      }
      const report = await SalaryService.getReport(period, user_id || null);
      return res.json(formatResponse.success("Отчёт по зарплате", report));
    } catch (err) {
      return res.status(500).json(formatResponse.error(err.message));
    }
  }

  // POST /api/salary/base-work
  // body: { user_id, period: "2026-05", days_count, daily_rate? }
  static async addBaseWork(req, res) {
    try {
      const { user_id, period, days_count, daily_rate } = req.body;
      const accrual = await SalaryService.accrueBaseWork({
        userId: user_id,
        period,
        daysCount: days_count,
        dailyRate: daily_rate,
        managerId: res.locals.user?.id,
      });
      return res.status(201).json(
        formatResponse.created("Начисление за работу на базе добавлено", accrual),
      );
    } catch (err) {
      return res.status(400).json(formatResponse.error(err.message));
    }
  }

  // POST /api/salary/pay
  // body: { accrual_ids: [...], paid_at: "2026-05-31" }
  static async markAsPaid(req, res) {
    try {
      const { accrual_ids, paid_at } = req.body;
      if (!Array.isArray(accrual_ids) || accrual_ids.length === 0) {
        return res
          .status(400)
          .json(formatResponse.error("accrual_ids должен быть непустым массивом"));
      }
      const updated = await SalaryService.markAsPaid(accrual_ids, paid_at);
      return res.json(formatResponse.success("Начисления отмечены как выплаченные", updated));
    } catch (err) {
      return res.status(500).json(formatResponse.error(err.message));
    }
  }
}

module.exports = SalaryController;
