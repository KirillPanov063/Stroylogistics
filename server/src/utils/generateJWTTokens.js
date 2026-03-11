const path = require("path");
const jwt = require("jsonwebtoken");
require("dotenv").config({ path: path.resolve(__dirname, "..", "..", ".env") });
const jwtConfig = require("../config/jwtConfig");

const generateJWTTokens = (payload) => ({
  accessToken: jwt.sign(
    payload,
    process.env.SECRET_ACCESS_TOKEN,
    jwtConfig.access,
  ),
  refreshToken: jwt.sign(
    payload,
    process.env.SECRET_REFRESH_TOKEN,
    jwtConfig.refresh,
  ),
});

// Функции для проверки токенов (пригодятся в middleware)
const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, process.env.SECRET_ACCESS_TOKEN);
  } catch (error) {
    return null;
  }
};

const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, process.env.SECRET_REFRESH_TOKEN);
  } catch (error) {
    return null;
  }
};

module.exports = generateJWTTokens;
module.exports.verifyAccessToken = verifyAccessToken;
module.exports.verifyRefreshToken = verifyRefreshToken;
