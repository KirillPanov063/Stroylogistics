"use strict";

const WasteReceiverService = require("../services/WasteReceiverService");
const formatResponse = require("../utils/formatResponse");

class WasteReceiverController {
  static async getAll(req, res) {
    try {
      const includeInactive = req.query.includeInactive === "true";
      const list = await WasteReceiverService.getAll({ includeInactive });
      res.json(formatResponse.success("Компании-приёмщики получены", list));
    } catch (error) {
      console.error("Ошибка получения приёмщиков:", error);
      res.status(500).json(formatResponse.serverError("Не удалось получить список", error.message));
    }
  }

  static async getById(req, res) {
    try {
      const receiver = await WasteReceiverService.getById(req.params.id);
      if (!receiver) return res.status(404).json(formatResponse.notFound("Компания-приёмщик не найдена"));
      res.json(formatResponse.success("Компания-приёмщик получена", receiver));
    } catch (error) {
      console.error("Ошибка получения приёмщика:", error);
      res.status(500).json(formatResponse.serverError("Не удалось получить данные", error.message));
    }
  }

  static async create(req, res) {
    try {
      const receiver = await WasteReceiverService.create(req.body, res.locals.user.id);
      res.status(201).json(formatResponse.created("Компания-приёмщик добавлена", receiver));
    } catch (error) {
      console.error("Ошибка создания приёмщика:", error);
      const status = error.message.includes("обязательно") ? 400 : 500;
      res.status(status).json(formatResponse.error(error.message, null, status));
    }
  }

  static async update(req, res) {
    try {
      const receiver = await WasteReceiverService.update(req.params.id, req.body);
      res.json(formatResponse.success("Данные обновлены", receiver));
    } catch (error) {
      console.error("Ошибка обновления приёмщика:", error);
      const status = error.message.includes("не найдена") ? 404 : 500;
      res.status(status).json(formatResponse.error(error.message, null, status));
    }
  }

  static async updatePrice(req, res) {
    try {
      const { price_per_m3, note } = req.body;
      if (price_per_m3 == null) {
        return res.status(400).json(formatResponse.error("Укажите новую цену за м³"));
      }
      const receiver = await WasteReceiverService.updatePrice(
        req.params.id,
        price_per_m3,
        res.locals.user.id,
        note,
      );
      res.json(formatResponse.success("Цена обновлена", receiver));
    } catch (error) {
      console.error("Ошибка обновления цены:", error);
      const status = error.message.includes("не найдена") ? 404
        : error.message.includes("Некорректная") ? 400 : 500;
      res.status(status).json(formatResponse.error(error.message, null, status));
    }
  }

  static async delete(req, res) {
    try {
      await WasteReceiverService.delete(req.params.id);
      res.json(formatResponse.success("Компания-приёмщик деактивирована", { id: req.params.id }));
    } catch (error) {
      console.error("Ошибка удаления приёмщика:", error);
      const status = error.message.includes("не найдена") ? 404 : 500;
      res.status(status).json(formatResponse.error(error.message, null, status));
    }
  }

  // ============= АДРЕСА =============

  static async addAddress(req, res) {
    try {
      const addr = await WasteReceiverService.addAddress(req.params.id, req.body);
      res.status(201).json(formatResponse.created("Адрес добавлен", addr));
    } catch (error) {
      console.error("Ошибка добавления адреса:", error);
      const status = error.message.includes("обязателен") ? 400
        : error.message.includes("не найдена") ? 404 : 500;
      res.status(status).json(formatResponse.error(error.message, null, status));
    }
  }

  static async updateAddress(req, res) {
    try {
      const addr = await WasteReceiverService.updateAddress(
        req.params.id,
        req.params.addressId,
        req.body,
      );
      res.json(formatResponse.success("Адрес обновлён", addr));
    } catch (error) {
      console.error("Ошибка обновления адреса:", error);
      const status = error.message.includes("не найден") ? 404 : 500;
      res.status(status).json(formatResponse.error(error.message, null, status));
    }
  }

  static async deleteAddress(req, res) {
    try {
      await WasteReceiverService.deleteAddress(req.params.id, req.params.addressId);
      res.json(formatResponse.success("Адрес деактивирован", { id: req.params.addressId }));
    } catch (error) {
      console.error("Ошибка удаления адреса:", error);
      const status = error.message.includes("не найден") ? 404 : 500;
      res.status(status).json(formatResponse.error(error.message, null, status));
    }
  }
}

module.exports = WasteReceiverController;
