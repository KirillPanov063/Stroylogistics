const router = require("express").Router();
const UserController = require("../controllers/User.controller");
const verifyAccessToken = require("../middleware/verifyAccessToken");
const { authorizeRoles } = require("../middleware/verifyAccessToken"); // или verifyAccessToken.authorizeRoles
const checkBody = require("../middleware/checkBody");

// Все маршруты требуют аутентификации
router.use(verifyAccessToken); // используем основную функцию

// Маршруты для всех авторизованных пользователей
router.get("/profile", UserController.getProfile);
router.put("/profile", checkBody, UserController.updateProfile);
router.put("/change-password", checkBody, UserController.changePassword);

// Маршруты только для админов
router.get("/", authorizeRoles("admin"), UserController.getAllUsers);
router.get("/:id", authorizeRoles("admin"), UserController.getUserById);
router.put(
  "/:id",
  authorizeRoles("admin"),
  checkBody,
  UserController.updateUserByAdmin,
);
router.delete("/:id", authorizeRoles("admin"), UserController.deleteUser);

module.exports = router;
