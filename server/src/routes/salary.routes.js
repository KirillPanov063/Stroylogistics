"use strict";

const router = require("express").Router();
const SalaryController = require("../controllers/SalaryController");
const { authenticateToken, authorizeRoles } = require("../middleware/verifyAccessToken");

// GET /api/salary/report?period=2026-05
router.get(
  "/report",
  authenticateToken,
  authorizeRoles("admin", "manager"),
  SalaryController.getReport,
);

// POST /api/salary/base-work
router.post(
  "/base-work",
  authenticateToken,
  authorizeRoles("admin", "manager"),
  SalaryController.addBaseWork,
);

// POST /api/salary/pay
router.post(
  "/pay",
  authenticateToken,
  authorizeRoles("admin", "manager"),
  SalaryController.markAsPaid,
);

module.exports = router;
