import { createBillingAccount, getBillingTrend, getFinanceSummary, importTransactions, listBillingAccounts, listBillingReminders, listTransactions, recordBillingPayment } from '../../src/api/finance'

jest.mock('../../src/utils/request', () => ({
  request: { get: jest.fn(), post: jest.fn() }
}))

import { request } from '../../src/utils/request'

describe('finance api mapping', () => {
  afterEach(() => jest.clearAllMocks())

  it('imports CSV and maps counts', async () => {
    request.post.mockResolvedValue({ Imported: 2, Skipped: 1 })
    await expect(importTransactions({ homeId: 8, csv: 'date,merchant,amount,currency,category\n2026-08-01,超市,10,CNY,日用' })).resolves.toEqual({ imported: 2, skipped: 1 })
    expect(request.post).toHaveBeenCalledWith('/api/v1/homes/8/finance/transactions/import', { csv: 'date,merchant,amount,currency,category\n2026-08-01,超市,10,CNY,日用', sourceType: 'csv', sourceRef: null })
  })

  it('maps finance views and only sends non-empty filters', async () => {
    request.get.mockResolvedValueOnce([{ Id: 3, TransactionDate: '2026-08-01', Merchant: '超市', Amount: 10, Currency: 'CNY', Category: '日用', SourceType: 'csv', Notes: null, CreatedAt: '2026-08-01' }])
      .mockResolvedValueOnce({ From: '2026-08-01', To: '2026-08-30', TotalAmount: 10, TransactionCount: 1, Categories: [{ Category: '日用', Amount: 10, Count: 1 }], Suggestions: ['检查订阅'], ConfirmationIds: [9] })
    await expect(listTransactions({ homeId: 8, from: '2026-08-01', category: '' })).resolves.toEqual([{ id: 3, transactionDate: '2026-08-01', merchant: '超市', amount: 10, currency: 'CNY', category: '日用', sourceType: 'csv', notes: null, createdAt: '2026-08-01' }])
    await expect(getFinanceSummary({ homeId: 8, from: '2026-08-01' })).resolves.toMatchObject({ totalAmount: 10, confirmationIds: [9] })
    expect(request.get).toHaveBeenNthCalledWith(1, '/api/v1/homes/8/finance/transactions', { params: { from: '2026-08-01' } })
  })

  it('maps billing account, payment, reminders and trend contracts', async () => {
    request.get.mockResolvedValueOnce([{ Id: 4, BillingType: 'electricity', Provider: '供电局', Label: '家里电费', BillingCycleMonths: 1, ExpectedAmount: 80, Currency: 'CNY', NextDueDate: '2026-09-01', SourceType: 'manual', IsActive: true }])
      .mockResolvedValueOnce([{ BillingAccountId: 4, BillingType: 'electricity', Label: '家里电费', DueDate: '2026-09-01', DaysUntilDue: 3, Level: 'three_days', ConfirmationId: 11 }])
      .mockResolvedValueOnce({ Year: 2026, TotalAmount: 80, Months: [{ Month: 8, Amount: 80, PaymentCount: 1 }] })
    request.post.mockResolvedValueOnce({ Id: 4, BillingType: 'electricity', Provider: '供电局', Label: '家里电费', BillingCycleMonths: 1, ExpectedAmount: 80, Currency: 'CNY', NextDueDate: '2026-09-01', SourceType: 'manual', IsActive: true })
      .mockResolvedValueOnce({ Id: 22, BillingAccountId: 4, DueDate: '2026-09-01', PaidAt: '2026-08-29', Amount: 80, Currency: 'CNY', SourceType: 'manual', FinanceTransactionId: 31 })
    await expect(listBillingAccounts({ homeId: 8 })).resolves.toHaveLength(1)
    await expect(createBillingAccount({ homeId: 8, billingType: 'electricity', provider: '供电局', label: '家里电费', nextDueDate: '2026-09-01' })).resolves.toMatchObject({ id: 4, label: '家里电费' })
    await expect(recordBillingPayment({ homeId: 8, accountId: 4, amount: 80 })).resolves.toMatchObject({ id: 22, financeTransactionId: 31 })
    await expect(listBillingReminders({ homeId: 8, asOf: '2026-08-29' })).resolves.toEqual([{ billingAccountId: 4, billingType: 'electricity', label: '家里电费', dueDate: '2026-09-01', daysUntilDue: 3, level: 'three_days', confirmationId: 11 }])
    await expect(getBillingTrend({ homeId: 8, year: 2026 })).resolves.toEqual({ year: 2026, totalAmount: 80, months: [{ month: 8, amount: 80, paymentCount: 1 }] })
  })
})
