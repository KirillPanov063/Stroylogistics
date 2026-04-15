const { CompanyDetail, Counterparty } = require("../db/models");
const { Op } = require("sequelize");

class CompanyDetailService {
  // ============= ВАЛИДАЦИЯ =============

  static validateINN(inn, personType) {
    if (!inn) return false;
    // Очищаем от нецифровых символов
    const cleanInn = inn.replace(/\D/g, "");

    if (personType === "llc") {
      // Для ООО - 10 цифр
      return /^\d{10}$/.test(cleanInn);
    } else if (personType === "entrepreneur") {
      // Для ИП - от 10 до 15 цифр
      return /^\d{10,15}$/.test(cleanInn);
    }
    return false;
  }

  static validateKPP(kpp) {
    if (!kpp) return false;
    // Очищаем от нецифровых символов
    const cleanKpp = kpp.replace(/\D/g, "");
    // КПП - 9 цифр
    return /^\d{9}$/.test(cleanKpp);
  }

  static validateOGRN(ogrn, personType) {
    if (!ogrn) return false;
    const cleanOgrn = ogrn.replace(/\D/g, "");

    if (personType === "llc") {
      // ОГРН - 13 цифр
      return /^\d{13}$/.test(cleanOgrn);
    } else if (personType === "entrepreneur") {
      // ОГРНИП - 15 цифр
      return /^\d{15}$/.test(cleanOgrn);
    }
    return false;
  }

  static validateBankAccount(account) {
    if (!account) return false;
    // Расчетный счет / Корр. счет - 20 цифр
    return /^\d{20}$/.test(account.replace(/\D/g, ""));
  }

  static validateBIC(bic) {
    if (!bic) return false;
    // БИК - 9 цифр
    return /^\d{9}$/.test(bic.replace(/\D/g, ""));
  }

  static validateCompanyDetailData(data, personType) {
    const {
      short_name_org,
      legal_address,
      manager_position,
      manager_full_name,
      bank_name,
      checking_account,
      correspondent_account,
      bic,
      inn,
      kpp,
      ogrn,
    } = data;

    if (
      !short_name_org ||
      typeof short_name_org !== "string" ||
      short_name_org.trim().length === 0
    ) {
      return {
        isValid: false,
        error: "Краткое наименование организации обязательно",
      };
    }

    if (
      !legal_address ||
      typeof legal_address !== "string" ||
      legal_address.trim().length === 0
    ) {
      return {
        isValid: false,
        error: "Юридический адрес обязателен",
      };
    }

    if (
      !manager_position ||
      typeof manager_position !== "string" ||
      manager_position.trim().length === 0
    ) {
      return {
        isValid: false,
        error: "Должность руководителя обязательна",
      };
    }

    if (
      !manager_full_name ||
      typeof manager_full_name !== "string" ||
      manager_full_name.trim().length === 0
    ) {
      return {
        isValid: false,
        error: "ФИО руководителя обязательно",
      };
    }

    if (
      !bank_name ||
      typeof bank_name !== "string" ||
      bank_name.trim().length === 0
    ) {
      return {
        isValid: false,
        error: "Наименование банка обязательно",
      };
    }

    if (!checking_account || !this.validateBankAccount(checking_account)) {
      return {
        isValid: false,
        error: "Некорректный расчетный счет (должен быть 20 цифр)",
      };
    }

    if (
      !correspondent_account ||
      !this.validateBankAccount(correspondent_account)
    ) {
      return {
        isValid: false,
        error: "Некорректный корреспондентский счет (должен быть 20 цифр)",
      };
    }

    if (!bic || !this.validateBIC(bic)) {
      return {
        isValid: false,
        error: "Некорректный БИК (должен быть 9 цифр)",
      };
    }

    if (!inn || !this.validateINN(inn, personType)) {
      return {
        isValid: false,
        error:
          personType === "llc"
            ? "Некорректный ИНН (должен быть 10 цифр)"
            : "Некорректный ИНН (должен быть от 10 до 15 цифр)",
      };
    }

    // КПП обязательно для ООО, опционально для ИП
    if (personType === "llc") {
      if (!kpp || !this.validateKPP(kpp)) {
        return {
          isValid: false,
          error: "Некорректный КПП (должен быть 9 цифр)",
        };
      }
    }

    // ОГРН/ОГРНИП
    if (ogrn && !this.validateOGRN(ogrn, personType)) {
      return {
        isValid: false,
        error:
          personType === "llc"
            ? "Некорректный ОГРН (должен быть 13 цифр)"
            : "Некорректный ОГРНИП (должен быть 15 цифр)",
      };
    }

    return {
      isValid: true,
      error: null,
    };
  }

  // ============= ОСНОВНЫЕ МЕТОДЫ =============

  // * Получение реквизитов по ID контрагента
  static async getByCounterpartyId(counterpartyId) {
    const companyDetail = await CompanyDetail.findOne({
      where: { counterparty_id: counterpartyId },
      include: [
        {
          model: Counterparty,
          as: "counterparty",
        },
      ],
    });

    return companyDetail ? companyDetail.get({ plain: true }) : null;
  }

  // * Создание реквизитов для контрагента
  static async create(counterpartyId, data) {
    try {
      // Проверяем, что контрагент существует
      const counterparty = await Counterparty.findByPk(counterpartyId);
      if (!counterparty) {
        throw new Error("Контрагент не найден");
      }

      // Проверяем, что у контрагента еще нет реквизитов
      const existing = await CompanyDetail.findOne({
        where: { counterparty_id: counterpartyId },
      });

      if (existing) {
        throw new Error("У контрагента уже есть реквизиты");
      }

      // Проверяем тип лица (должен быть llc или entrepreneur)
      if (!["llc", "entrepreneur"].includes(counterparty.person_type)) {
        throw new Error("Реквизиты можно создать только для юрлиц и ИП");
      }

      // Валидация данных
      const validation = this.validateCompanyDetailData(
        data,
        counterparty.person_type,
      );
      if (!validation.isValid) {
        throw new Error(validation.error);
      }

      // Подготавливаем данные для создания
      const createData = {
        counterparty_id: counterpartyId,
        full_name_org: data.full_name_org?.trim() || null,
        short_name_org: data.short_name_org.trim(),
        legal_address: data.legal_address.trim(),
        postal_address: data.postal_address?.trim() || null,
        location: data.location?.trim() || null,
        manager_position: data.manager_position.trim(),
        manager_full_name: data.manager_full_name.trim(),
        bank_name: data.bank_name.trim(),
        checking_account: data.checking_account.replace(/\D/g, ""),
        correspondent_account: data.correspondent_account.replace(/\D/g, ""),
        bic: data.bic.replace(/\D/g, ""),
        inn: data.inn.replace(/\D/g, ""),
        kpp: data.kpp ? data.kpp.replace(/\D/g, "") : null,
        ogrn: data.ogrn ? data.ogrn.replace(/\D/g, "") : null,
        contract_number: data.contract_number || null,
        contract_date: data.contract_date || null,
      };

      // Обработка service_types - теперь всегда массив!
      if (data.service_types) {
        if (Array.isArray(data.service_types)) {
          // Уже массив - оставляем как есть
          createData.service_types = data.service_types;
        } else if (typeof data.service_types === "string") {
          // Если строка, пытаемся преобразовать в массив
          try {
            // Убираем фигурные или квадратные скобки если есть
            let cleanStr = data.service_types.replace(/^[{\[]|[}\]]$/g, "");
            createData.service_types = cleanStr.split(",").map((s) => s.trim());
          } catch (e) {
            createData.service_types = [];
          }
        } else {
          createData.service_types = [];
        }
      } else {
        createData.service_types = []; // Пустой массив по умолчанию
      }

      console.log(
        "📦 Данные для создания:",
        JSON.stringify(createData, null, 2),
      );

      const companyDetail = await CompanyDetail.create(createData);
      return companyDetail.get({ plain: true });
    } catch (error) {
      console.error("❌ Ошибка в create:", error);
      throw error;
    }
  }

  // * Обновление реквизитов
  static async update(counterpartyId, data) {
    try {
      const companyDetail = await CompanyDetail.findOne({
        where: { counterparty_id: counterpartyId },
      });

      if (!companyDetail) {
        throw new Error("Реквизиты не найдены");
      }

      // Получаем контрагента для проверки типа
      const counterparty = await Counterparty.findByPk(counterpartyId);

      // Создаем объект для обновления только с переданными полями
      const updateData = {};

      // Текстовые поля
      if (data.full_name_org !== undefined) {
        updateData.full_name_org = data.full_name_org?.trim() || null;
      }

      if (data.short_name_org !== undefined) {
        updateData.short_name_org = data.short_name_org.trim();
      }

      if (data.legal_address !== undefined) {
        updateData.legal_address = data.legal_address.trim();
      }

      if (data.postal_address !== undefined) {
        updateData.postal_address = data.postal_address?.trim() || null;
      }

      if (data.location !== undefined) {
        updateData.location = data.location?.trim() || null;
      }

      if (data.manager_position !== undefined) {
        updateData.manager_position = data.manager_position.trim();
      }

      if (data.manager_full_name !== undefined) {
        updateData.manager_full_name = data.manager_full_name.trim();
      }

      if (data.bank_name !== undefined) {
        updateData.bank_name = data.bank_name.trim();
      }

      // Числовые поля с валидацией
      if (data.inn !== undefined) {
        if (data.inn) {
          if (!this.validateINN(data.inn, counterparty.person_type)) {
            throw new Error("Некорректный ИНН");
          }
          updateData.inn = data.inn.replace(/\D/g, "");
        } else {
          updateData.inn = null;
        }
      }

      if (data.kpp !== undefined) {
        if (counterparty.person_type === "llc") {
          if (data.kpp) {
            if (!this.validateKPP(data.kpp)) {
              throw new Error("Некорректный КПП");
            }
            updateData.kpp = data.kpp.replace(/\D/g, "");
          } else {
            updateData.kpp = null;
          }
        } else {
          updateData.kpp = null;
        }
      }

      if (data.ogrn !== undefined) {
        if (data.ogrn) {
          if (!this.validateOGRN(data.ogrn, counterparty.person_type)) {
            throw new Error("Некорректный ОГРН/ОГРНИП");
          }
          updateData.ogrn = data.ogrn.replace(/\D/g, "");
        } else {
          updateData.ogrn = null;
        }
      }

      if (data.checking_account !== undefined) {
        if (data.checking_account) {
          if (!this.validateBankAccount(data.checking_account)) {
            throw new Error("Некорректный расчетный счет");
          }
          updateData.checking_account = data.checking_account.replace(
            /\D/g,
            "",
          );
        } else {
          updateData.checking_account = null;
        }
      }

      if (data.correspondent_account !== undefined) {
        if (data.correspondent_account) {
          if (!this.validateBankAccount(data.correspondent_account)) {
            throw new Error("Некорректный корреспондентский счет");
          }
          updateData.correspondent_account = data.correspondent_account.replace(
            /\D/g,
            "",
          );
        } else {
          updateData.correspondent_account = null;
        }
      }

      if (data.bic !== undefined) {
        if (data.bic) {
          if (!this.validateBIC(data.bic)) {
            throw new Error("Некорректный БИК");
          }
          updateData.bic = data.bic.replace(/\D/g, "");
        } else {
          updateData.bic = null;
        }
      }

      if (data.contract_number !== undefined) {
        updateData.contract_number = data.contract_number || null;
      }

      if (data.contract_date !== undefined) {
        updateData.contract_date = data.contract_date || null;
      }

      // Обработка service_types - теперь всегда массив
      if (data.service_types !== undefined) {
        if (Array.isArray(data.service_types)) {
          updateData.service_types = data.service_types;
        } else if (typeof data.service_types === "string") {
          try {
            let cleanStr = data.service_types.replace(/^[{\[]|[}\]]$/g, "");
            updateData.service_types = cleanStr.split(",").map((s) => s.trim());
          } catch (e) {
            updateData.service_types = [];
          }
        } else {
          updateData.service_types = [];
        }
      }

      await companyDetail.update(updateData);
      return companyDetail.get({ plain: true });
    } catch (error) {
      throw error;
    }
  }

  // * Удаление реквизитов
  static async delete(counterpartyId) {
    const companyDetail = await CompanyDetail.findOne({
      where: { counterparty_id: counterpartyId },
    });

    if (!companyDetail) {
      throw new Error("Реквизиты не найдены");
    }

    await companyDetail.destroy();
    return { counterparty_id: counterpartyId };
  }

  // * Поиск по ИНН
  static async findByINN(inn) {
    if (!inn) return null;
    const cleanInn = inn.replace(/\D/g, "");

    const companyDetail = await CompanyDetail.findOne({
      where: { inn: cleanInn },
      include: [
        {
          model: Counterparty,
          as: "counterparty",
        },
      ],
    });

    return companyDetail ? companyDetail.get({ plain: true }) : null;
  }

  // * Поиск по расчетному счету
  static async findByCheckingAccount(account) {
    if (!account) return null;
    const cleanAccount = account.replace(/\D/g, "");

    const companyDetail = await CompanyDetail.findOne({
      where: { checking_account: cleanAccount },
    });

    return companyDetail ? companyDetail.get({ plain: true }) : null;
  }
}

module.exports = CompanyDetailService;
