const router = require("express").Router();
const AuthController = require("../controllers/Auth.controller");
const verifyRefreshToken = require("../middleware/verifyRefreshToken");
const { authenticateToken } = require("../middleware/verifyAccessToken");

// Публичные маршруты
router.post("/signup", AuthController.signUp);
router.post("/verify-email", AuthController.verifyEmail);
router.post("/resend-code", AuthController.resendCode);
router.post("/signin", AuthController.signIn);
router.post("/signout", AuthController.signOut);

// Обновление токенов (использует refresh token из cookie)
router.get("/refresh", verifyRefreshToken, AuthController.refreshTokens);

// Проверка токена (требует валидный accessToken)
router.get("/check", authenticateToken, AuthController.check);

module.exports = router;
