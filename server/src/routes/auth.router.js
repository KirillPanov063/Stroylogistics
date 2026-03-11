const router = require("express").Router();
const AuthController = require("../controllers/Auth.controller");
const verifyRefreshToken = require("../middleware/verifyRefreshToken");

// Публичные маршруты
router.post("/signup", AuthController.signUp);
router.post("/signin", AuthController.signIn);
router.post("/signout", AuthController.signOut);

// Обновление токенов (использует refresh token из cookie)
router.get("/refresh", verifyRefreshToken, AuthController.refreshTokens);

// Проверка токена (для клиента)
router.get("/check", AuthController.check);

module.exports = router;
