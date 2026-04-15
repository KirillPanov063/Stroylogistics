// routes/documentRoutes.js

const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const documentController = require("../controllers/documentController");
const {
  validateUploadDocument,
  validateDocumentId,
  validateUpdateDocument,
} = require("../middleware/validation/documentValidation");

// Настройка multer для загрузки файлов
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/temp/");
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/jpg",
  ];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error("Неподдерживаемый тип файла. Разрешены: PDF, JPEG, PNG"),
      false,
    );
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB
  },
  fileFilter: fileFilter,
});

// GET /api/documents - получить документы с фильтрацией
router.get("/", documentController.getDocuments);

// GET /api/documents/order/:order_id - получить документы по заказу
router.get("/order/:order_id", documentController.getOrderDocuments);

// GET /api/documents/:document_id - получить документ по ID
router.get(
  "/:document_id",
  validateDocumentId,
  documentController.getDocumentById,
);

// POST /api/documents/upload - загрузить документ
router.post(
  "/upload",
  upload.single("file"),
  validateUploadDocument,
  documentController.uploadDocument,
);

// PUT /api/documents/:document_id - обновить информацию о документе
router.put(
  "/:document_id",
  validateDocumentId,
  validateUpdateDocument,
  documentController.updateDocumentInfo,
);

// DELETE /api/documents/:document_id - удалить документ (мягкое удаление)
router.delete(
  "/:document_id",
  validateDocumentId,
  documentController.deleteDocument,
);

// DELETE /api/documents/:document_id/file - физически удалить файл
router.delete(
  "/:document_id/file",
  validateDocumentId,
  documentController.deleteDocumentFile,
);

// POST /api/documents/cleanup - очистить неиспользуемые файлы (для админов)
router.post("/cleanup", documentController.cleanupOrphanedFiles);

module.exports = router;
