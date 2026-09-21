"use strict";

const { WasteReceiver, WasteReceiverAddress, Document } = require("../db/models");

class WasteReceiverService {
  static async getAll({ includeInactive = false } = {}) {
    const where = includeInactive ? {} : { is_active: true };
    return WasteReceiver.findAll({
      where,
      include: [{ model: WasteReceiverAddress, as: "addresses", where: { is_active: true }, required: false }],
      order: [["name", "ASC"]],
    });
  }

  static async getById(id) {
    const receiver = await WasteReceiver.findByPk(id, {
      include: [
        { model: WasteReceiverAddress, as: "addresses", order: [["created_at", "ASC"]] },
        { model: Document, as: "documents", where: { deleted_at: null }, required: false },
      ],
    });
    if (!receiver) return null;
    return receiver.get({ plain: true });
  }

  static async create(data, userId) {
    const {
      name,
      phone,
      email,
      representative_name,
      contract_number,
      contract_date,
      price_per_m3,
      notes,
    } = data;

    if (!name || !name.trim()) {
      throw new Error("Название компании обязательно");
    }

    const receiver = await WasteReceiver.create({
      name: name.trim(),
      person_type: "llc",
      phone: phone || null,
      email: email || null,
      representative_name: representative_name || null,
      contract_number: contract_number || null,
      contract_date: contract_date || null,
      price_per_m3: price_per_m3 != null ? parseFloat(price_per_m3) : null,
      price_history: [],
      notes: notes || null,
      is_active: true,
    });

    return this.getById(receiver.id);
  }

  static async update(id, data) {
    const receiver = await WasteReceiver.findByPk(id);
    if (!receiver) throw new Error("Компания-приёмщик не найдена");

    const allowed = [
      "name", "phone", "email", "representative_name",
      "contract_number", "contract_date", "notes", "is_active",
    ];
    const updates = {};
    for (const key of allowed) {
      if (data[key] !== undefined) updates[key] = data[key];
    }

    await receiver.update(updates);
    return this.getById(id);
  }

  static async updatePrice(id, newPricePerM3, changedByUserId, note = null) {
    const receiver = await WasteReceiver.findByPk(id);
    if (!receiver) throw new Error("Компания-приёмщик не найдена");

    const price = parseFloat(newPricePerM3);
    if (isNaN(price) || price < 0) {
      throw new Error("Некорректная цена");
    }

    const history = Array.isArray(receiver.price_history) ? [...receiver.price_history] : [];
    if (receiver.price_per_m3 != null) {
      history.push({
        price_per_m3: Number(receiver.price_per_m3),
        changed_at: new Date().toISOString(),
        changed_by: changedByUserId,
        note: note || null,
      });
    }

    await receiver.update({ price_per_m3: price, price_history: history });
    return this.getById(id);
  }

  static async delete(id) {
    const receiver = await WasteReceiver.findByPk(id);
    if (!receiver) throw new Error("Компания-приёмщик не найдена");
    await receiver.update({ is_active: false });
  }

  // ============= АДРЕСА =============

  static async addAddress(receiverId, data) {
    const receiver = await WasteReceiver.findByPk(receiverId);
    if (!receiver) throw new Error("Компания-приёмщик не найдена");

    if (!data.address || !data.address.trim()) {
      throw new Error("Адрес обязателен");
    }

    const addr = await WasteReceiverAddress.create({
      waste_receiver_id: receiverId,
      address: data.address.trim(),
      name: data.name || null,
      contact_person: data.contact_person || null,
      contact_phone: data.contact_phone || null,
      working_hours: data.working_hours || null,
      is_active: true,
    });

    return addr.get({ plain: true });
  }

  static async updateAddress(receiverId, addressId, data) {
    const addr = await WasteReceiverAddress.findOne({
      where: { id: addressId, waste_receiver_id: receiverId },
    });
    if (!addr) throw new Error("Адрес не найден");

    const allowed = ["address", "name", "contact_person", "contact_phone", "working_hours", "is_active"];
    const updates = {};
    for (const key of allowed) {
      if (data[key] !== undefined) updates[key] = data[key];
    }

    await addr.update(updates);
    return addr.get({ plain: true });
  }

  static async deleteAddress(receiverId, addressId) {
    const addr = await WasteReceiverAddress.findOne({
      where: { id: addressId, waste_receiver_id: receiverId },
    });
    if (!addr) throw new Error("Адрес не найден");
    await addr.update({ is_active: false });
  }
}

module.exports = WasteReceiverService;
