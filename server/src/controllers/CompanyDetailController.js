const CompanyDetailService = require("../services/CompanyDetailService");
const CounterpartyService = require("../services/CounterpartyService");
const formatResponse = require("../utils/formatResponse");

class CompanyDetailController {
  // * Получение реквизитов по ID контрагента
  static async getByCounterpartyId(req, res) {
    try {
      const { counterpartyId } = req.params;

      // Проверяем, что контрагент существует
      const counterparty = await CounterpartyService.getById(counterpartyId);
      if (!counterparty) {
        return res
          .status(404)
          .json(formatResponse.notFound("Контрагент не найден"));
      }

      const companyDetail =
        await CompanyDetailService.getByCounterpartyId(counterpartyId);

      if (!companyDetail) {
        return res
          .status(404)
          .json(
            formatResponse.notFound(
              "Реквизиты для данного контрагента не найдены",
            ),
          );
      }

      res.json(formatResponse.success("Реквизиты получены", companyDetail));
    } catch (error) {
      console.error("Ошибка получения реквизитов:", error);
      res
        .status(500)
        .json(
          formatResponse.serverError(
            "Не удалось получить реквизиты",
            error.message,
          ),
        );
    }
  }

  // * Создание реквизитов для контрагента
  static async create(req, res) {
    try {
      const { counterpartyId } = req.params;
      const data = req.body;

      // Проверяем, что контрагент существует
      const counterparty = await CounterpartyService.getById(counterpartyId);
      if (!counterparty) {
        return res
          .status(404)
          .json(formatResponse.notFound("Контрагент не найден"));
      }

      // Проверка обязательных полей
      if (
        !data.short_name_org ||
        !data.legal_address ||
        !data.manager_position ||
        !data.manager_full_name ||
        !data.bank_name ||
        !data.checking_account ||
        !data.correspondent_account ||
        !data.bic ||
        !data.inn
      ) {
        return res
          .status(400)
          .json(formatResponse.error("Не все обязательные поля заполнены"));
      }

      const companyDetail = await CompanyDetailService.create(
        counterpartyId,
        data,
      );

      res
        .status(201)
        .json(formatResponse.created("Реквизиты созданы", companyDetail));
    } catch (error) {
      console.error("Ошибка создания реквизитов:", error);

      let statusCode = 500;
      if (
        error.message.includes("уже есть реквизиты") ||
        error.message.includes("только для юрлиц") ||
        error.message.includes("Некорректный")
      ) {
        statusCode = 400;
      }

      res
        .status(statusCode)
        .json(formatResponse.error(error.message, null, statusCode));
    }
  }

  // * Обновление реквизитов
  static async update(req, res) {
    try {
      const { counterpartyId } = req.params;
      const data = req.body;

      // Проверяем, что контрагент существует
      const counterparty = await CounterpartyService.getById(counterpartyId);
      if (!counterparty) {
        return res
          .status(404)
          .json(formatResponse.notFound("Контрагент не найден"));
      }

      const updated = await CompanyDetailService.update(counterpartyId, data);

      res.json(formatResponse.success("Реквизиты обновлены", updated));
    } catch (error) {
      console.error("Ошибка обновления реквизитов:", error);

      let statusCode = 500;
      if (error.message.includes("не найдены")) {
        statusCode = 404;
      } else if (error.message.includes("Некорректный")) {
        statusCode = 400;
      }

      res
        .status(statusCode)
        .json(formatResponse.error(error.message, null, statusCode));
    }
  }

  // * Удаление реквизитов
  static async delete(req, res) {
    try {
      const { counterpartyId } = req.params;

      const result = await CompanyDetailService.delete(counterpartyId);

      res.json(formatResponse.success("Реквизиты удалены", result));
    } catch (error) {
      console.error("Ошибка удаления реквизитов:", error);

      if (error.message.includes("не найдены")) {
        return res.status(404).json(formatResponse.notFound(error.message));
      }

      res
        .status(500)
        .json(
          formatResponse.serverError(
            "Не удалось удалить реквизиты",
            error.message,
          ),
        );
    }
  }

  // * Поиск по ИНН
  static async findByINN(req, res) {
    try {
      const { inn } = req.params;

      const companyDetail = await CompanyDetailService.findByINN(inn);

      if (!companyDetail) {
        return res
          .status(404)
          .json(formatResponse.notFound("Реквизиты с таким ИНН не найдены"));
      }

      res.json(formatResponse.success("Реквизиты найдены", companyDetail));
    } catch (error) {
      console.error("Ошибка поиска по ИНН:", error);
      res
        .status(500)
        .json(
          formatResponse.serverError(
            "Не удалось выполнить поиск",
            error.message,
          ),
        );
    }
  }

  // * Поиск по расчетному счету
  static async findByCheckingAccount(req, res) {
    try {
      const { account } = req.params;

      const companyDetail =
        await CompanyDetailService.findByCheckingAccount(account);

      if (!companyDetail) {
        return res
          .status(404)
          .json(
            formatResponse.notFound(
              "Реквизиты с таким расчетным счетом не найдены",
            ),
          );
      }

      res.json(formatResponse.success("Реквизиты найдены", companyDetail));
    } catch (error) {
      console.error("Ошибка поиска по расчетному счету:", error);
      res
        .status(500)
        .json(
          formatResponse.serverError(
            "Не удалось выполнить поиск",
            error.message,
          ),
        );
    }
  }

  // * Проверка, есть ли у контрагента реквизиты
  static async hasDetails(req, res) {
    try {
      const { counterpartyId } = req.params;

      const companyDetail =
        await CompanyDetailService.getByCounterpartyId(counterpartyId);

      res.json(
        formatResponse.success("Проверка выполнена", {
          hasDetails: !!companyDetail,
        }),
      );
    } catch (error) {
      console.error("Ошибка проверки наличия реквизитов:", error);
      res
        .status(500)
        .json(
          formatResponse.serverError(
            "Не удалось выполнить проверку",
            error.message,
          ),
        );
    }
  }
}

module.exports = CompanyDetailController;
