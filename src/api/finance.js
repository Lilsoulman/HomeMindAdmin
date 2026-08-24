import { request } from '../utils/request'

export function importTransactions({ homeId, csv, sourceType = 'csv', sourceRef = null }) {
  return request.post(`/api/v1/homes/${homeId}/finance/transactions/import`, { csv, sourceType, sourceRef }).then((dto) => ({
    imported: dto && dto.Imported ? dto.Imported : 0,
    skipped: dto && dto.Skipped ? dto.Skipped : 0
  }))
}

export function listTransactions({ homeId, from, to, category } = {}) {
  return request.get(`/api/v1/homes/${homeId}/finance/transactions`, { params: compact({ from, to, category }) }).then((items) => (Array.isArray(items) ? items : []).map(toTransaction))
}

export function getFinanceSummary({ homeId, from, to } = {}) {
  return request.get(`/api/v1/homes/${homeId}/finance/summary`, { params: compact({ from, to }) }).then(toSummary)
}

export function listBillingAccounts({ homeId } = {}) {
  return request.get(`/api/v1/homes/${homeId}/billing/accounts`).then((items) => (Array.isArray(items) ? items : []).map(toAccount))
}

export function createBillingAccount({ homeId, ...payload }) {
  return request.post(`/api/v1/homes/${homeId}/billing/accounts`, payload).then(toAccount)
}

export function recordBillingPayment({ homeId, accountId, ...payload }) {
  return request.post(`/api/v1/homes/${homeId}/billing/accounts/${accountId}/payments`, payload).then(toPayment)
}

export function listBillingReminders({ homeId, asOf } = {}) {
  return request.get(`/api/v1/homes/${homeId}/billing/reminders`, { params: compact({ asOf }) }).then((items) => (Array.isArray(items) ? items : []).map(toReminder))
}

export function getBillingTrend({ homeId, year } = {}) {
  return request.get(`/api/v1/homes/${homeId}/billing/trend`, { params: compact({ year }) }).then(toTrend)
}

function compact(values) {
  return Object.keys(values).reduce((result, key) => {
    if (values[key] !== undefined && values[key] !== null && values[key] !== '') result[key] = values[key]
    return result
  }, {})
}

function toTransaction(dto = {}) {
  return { id: dto.Id, transactionDate: dto.TransactionDate, merchant: dto.Merchant, amount: dto.Amount, currency: dto.Currency, category: dto.Category, sourceType: dto.SourceType, notes: dto.Notes, createdAt: dto.CreatedAt }
}

function toSummary(dto = {}) {
  return {
    from: dto.From,
    to: dto.To,
    totalAmount: dto.TotalAmount || 0,
    transactionCount: dto.TransactionCount || 0,
    categories: Array.isArray(dto.Categories) ? dto.Categories.map((item) => ({ category: item.Category, amount: item.Amount, count: item.Count })) : [],
    suggestions: Array.isArray(dto.Suggestions) ? dto.Suggestions : [],
    confirmationIds: Array.isArray(dto.ConfirmationIds) ? dto.ConfirmationIds : []
  }
}

function toAccount(dto = {}) {
  return { id: dto.Id, billingType: dto.BillingType, provider: dto.Provider, label: dto.Label, billingCycleMonths: dto.BillingCycleMonths, expectedAmount: dto.ExpectedAmount, currency: dto.Currency, nextDueDate: dto.NextDueDate, sourceType: dto.SourceType, isActive: dto.IsActive, createdAt: dto.CreatedAt, updatedAt: dto.UpdatedAt }
}

function toPayment(dto = {}) {
  return { id: dto.Id, billingAccountId: dto.BillingAccountId, dueDate: dto.DueDate, paidAt: dto.PaidAt, amount: dto.Amount, currency: dto.Currency, sourceType: dto.SourceType, financeTransactionId: dto.FinanceTransactionId, createdAt: dto.CreatedAt }
}

function toReminder(dto = {}) {
  return { billingAccountId: dto.BillingAccountId, billingType: dto.BillingType, label: dto.Label, dueDate: dto.DueDate, daysUntilDue: dto.DaysUntilDue, level: dto.Level, confirmationId: dto.ConfirmationId }
}

function toTrend(dto = {}) {
  return { year: dto.Year, totalAmount: dto.TotalAmount || 0, months: Array.isArray(dto.Months) ? dto.Months.map((item) => ({ month: item.Month, amount: item.Amount, paymentCount: item.PaymentCount })) : [] }
}
