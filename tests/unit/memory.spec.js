import { listLearningMemories } from '../../src/api/memory'

jest.mock('../../src/utils/request', () => ({
  request: { get: jest.fn() }
}))

import { request } from '../../src/utils/request'

describe('memory api mapping', () => {
  afterEach(() => jest.clearAllMocks())

  it('lists M3 learning memories with default limit and drops empty params', async () => {
    request.get.mockResolvedValue({ Items: [], NextCursor: null })

    const page = await listLearningMemories({ scope: 'all', kind: '', status: '', query: '', cursor: null })

    expect(request.get).toHaveBeenCalledWith('/api/v1/memories', { params: { scope: 'all', limit: 20 } })
    expect(page).toEqual({ items: [], cursor: null })
  })

  it('passes filters, cursor and pagination params verbatim', async () => {
    request.get.mockResolvedValue({ Items: [], NextCursor: 'cursor-2' })

    await listLearningMemories({ scope: 'personal', kind: 'fact', status: 'active', query: '剪映', limit: 50, cursor: 'cursor-1' })

    expect(request.get).toHaveBeenCalledWith('/api/v1/memories', {
      params: { scope: 'personal', kind: 'fact', status: 'active', query: '剪映', limit: 50, cursor: 'cursor-1' }
    })
  })

  it('maps PascalCase to a safe LearningMemory view model with source references', async () => {
    request.get.mockResolvedValue({
      Items: [{
        Id: 7, Summary: '妈妈偏好清晨煮粥', Kind: 'preference', Visibility: 'family', Stability: 0.92,
        Status: 'active', LearnedAt: '2026-08-14T02:00:00Z', ExpiresAt: null,
        SourceReferences: [{ Type: 'run', Id: 101 }, { Type: 'conversation', Id: 22 }],
        RestrictedReferenceCount: 1, ResolutionSummary: '已按候选决议写入家庭知识'
      }],
      NextCursor: null
    })

    const page = await listLearningMemories({ scope: 'family' })

    expect(page.items).toEqual([{
      id: 7, summary: '妈妈偏好清晨煮粥', kind: 'preference', visibility: 'family', stability: 0.92,
      status: 'active', learnedAt: '2026-08-14T02:00:00Z', expiresAt: null,
      sourceReferences: [{ type: 'run', id: 101 }, { type: 'conversation', id: 22 }],
      restrictedReferenceCount: 1, resolutionSummary: '已按候选决议写入家庭知识'
    }])
  })

  it('never exposes raw evidence fields and defaults missing arrays', async () => {
    request.get.mockResolvedValue({ Items: [{ Id: 8, Summary: '摘要', Kind: 'fact', Visibility: 'personal', Stability: 0.8, Status: 'active', LearnedAt: null, ExpiresAt: null, RestrictedReferenceCount: 0 }], NextCursor: null })

    const page = await listLearningMemories({ scope: 'personal' })

    expect(page.items[0]).toEqual({
      id: 8, summary: '摘要', kind: 'fact', visibility: 'personal', stability: 0.8, status: 'active',
      learnedAt: null, expiresAt: null, sourceReferences: [], restrictedReferenceCount: 0, resolutionSummary: undefined
    })
    expect(page.items[0].evidence).toBeUndefined()
    expect(page.items[0].prompt).toBeUndefined()
  })
})
