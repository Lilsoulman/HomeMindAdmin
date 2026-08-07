import { batchConfirmConfirmations, confirmConfirmation, denyConfirmation, listConfirmations } from '../../src/api/confirmation'

jest.mock('../../src/utils/request', () => ({
  request: { get: jest.fn(), post: jest.fn() }
}))

import { request } from '../../src/utils/request'

describe('confirmation api mapping', () => {
  afterEach(() => jest.clearAllMocks())

  it('maps list response fields from PascalCase to view model', async () => {
    request.get.mockResolvedValue([
      {
        Id: 1,
        ActivityId: 42,
        RiskLevel: 'L2',
        Title: '调低热水器温度',
        Description: null,
        ImpactSummary: '影响客厅热水器设置',
        SuggestedAction: '确认后执行',
        Status: 'pending',
        ExpiresAt: '2026-08-08T10:00:00Z',
        ConfirmedAt: null,
        DeniedAt: null,
        ExpiredAt: null,
        UpdatedAt: '2026-08-05T10:00:00Z'
      }
    ])

    const items = await listConfirmations({ homeId: 12, riskLevel: 'L2', status: 'pending' })

    expect(request.get).toHaveBeenCalledWith('/api/v1/homes/12/confirmations', { params: { riskLevel: 'L2', status: 'pending' } })
    expect(items[0]).toEqual({
      id: 1,
      activityId: 42,
      riskLevel: 'L2',
      title: '调低热水器温度',
      description: null,
      impactSummary: '影响客厅热水器设置',
      suggestedAction: '确认后执行',
      status: 'pending',
      expiresAt: '2026-08-08T10:00:00Z',
      confirmedAt: null,
      deniedAt: null,
      expiredAt: null,
      updatedAt: '2026-08-05T10:00:00Z'
    })
  })

  it('omits empty filter params from the query string', async () => {
    request.get.mockResolvedValue([])

    await listConfirmations({ homeId: 12, riskLevel: '', status: null })

    expect(request.get).toHaveBeenCalledWith('/api/v1/homes/12/confirmations', { params: {} })
  })

  it('sends a new idempotency key for single confirm', async () => {
    request.post.mockResolvedValue({ Id: 1, RiskLevel: 'L1', Title: '开阳台灯', Status: 'confirmed' })

    await confirmConfirmation({ homeId: 12, id: 1, idempotencyKey: 'key-1' })

    expect(request.post).toHaveBeenCalledWith('/api/v1/homes/12/confirmations/1/confirm', { idempotencyKey: 'key-1' })
  })

  it('sends the deny reason', async () => {
    request.post.mockResolvedValue({ Id: 1, RiskLevel: 'L1', Title: '开阳台灯', Status: 'denied' })

    await denyConfirmation({ homeId: 12, id: 1, reason: '暂不需要' })

    expect(request.post).toHaveBeenCalledWith('/api/v1/homes/12/confirmations/1/deny', { reason: '暂不需要' })
  })

  it('maps batch confirm response and sends id list with idempotency key', async () => {
    request.post.mockResolvedValue({
      ConfirmedCount: 2,
      Items: [
        { Id: 101, RiskLevel: 'L1', Title: '开阳台灯', Status: 'confirmed' },
        { Id: 102, RiskLevel: 'L1', Title: '关客厅灯', Status: 'confirmed' }
      ]
    })

    const result = await batchConfirmConfirmations({ homeId: 12, ids: [101, 102], idempotencyKey: 'batch-key' })

    expect(request.post).toHaveBeenCalledWith('/api/v1/homes/12/confirmations/batch-confirm', {
      confirmationIds: [101, 102],
      idempotencyKey: 'batch-key'
    })
    expect(result.confirmedCount).toBe(2)
    expect(result.items).toHaveLength(2)
    expect(result.items[0].status).toBe('confirmed')
  })
})
