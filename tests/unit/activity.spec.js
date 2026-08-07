import { getActivity, listActivities, undoActivity } from '../../src/api/activity'

jest.mock('../../src/utils/request', () => ({
  request: { get: jest.fn(), post: jest.fn() }
}))

import { request } from '../../src/utils/request'

describe('activity api mapping', () => {
  afterEach(() => jest.clearAllMocks())

  it('maps paged list response with cursor', async () => {
    request.get.mockResolvedValue({
      Items: [
        {
          Id: 1,
          RunId: 42,
          Category: 'reporting',
          Title: '已确认：调低热水器温度',
          Description: null,
          RiskLevel: 'L2',
          Status: 'confirmed',
          ResultSummary: null,
          Undoable: false,
          UndoneAt: null,
          CreatedAt: '2026-08-05T10:00:00Z',
          UpdatedAt: '2026-08-05T10:00:00Z'
        }
      ],
      Cursor: 'MTc1NDM1NjAwMDAwMDox'
    })

    const page = await listActivities({ homeId: 12, cursor: 'MTc1NDM1NjAwMDAwMDox' })

    expect(request.get).toHaveBeenCalledWith('/api/v1/homes/12/activities', {
      params: { limit: 20, cursor: 'MTc1NDM1NjAwMDAwMDox' }
    })
    expect(page.cursor).toBe('MTc1NDM1NjAwMDAwMDox')
    expect(page.items[0]).toEqual({
      id: 1,
      runId: 42,
      category: 'reporting',
      title: '已确认：调低热水器温度',
      description: null,
      riskLevel: 'L2',
      status: 'confirmed',
      resultSummary: null,
      undoable: false,
      undoneAt: null,
      createdAt: '2026-08-05T10:00:00Z',
      updatedAt: '2026-08-05T10:00:00Z'
    })
  })

  it('maps undoable flag to boolean and omits empty cursor', async () => {
    request.get.mockResolvedValue({
      Items: [{ Id: 2, Title: '开阳台灯', Undoable: true, UndoneAt: null }],
      Cursor: null
    })

    const page = await listActivities({ homeId: 12 })

    expect(request.get).toHaveBeenCalledWith('/api/v1/homes/12/activities', { params: { limit: 20 } })
    expect(page.cursor).toBeNull()
    expect(page.items[0].undoable).toBe(true)
  })

  it('fetches a single activity detail', async () => {
    request.get.mockResolvedValue({ Id: 7, Title: '关闭厨房灯', Status: 'completed', Undoable: true })

    const item = await getActivity({ homeId: 12, id: 7 })

    expect(request.get).toHaveBeenCalledWith('/api/v1/homes/12/activities/7')
    expect(item.id).toBe(7)
    expect(item.undoable).toBe(true)
  })

  it('posts undo without a request body', async () => {
    request.post.mockResolvedValue({ Id: 7, Status: 'completed', Undoable: false, UndoneAt: '2026-08-05T11:00:00Z' })

    const updated = await undoActivity({ homeId: 12, id: 7 })

    expect(request.post).toHaveBeenCalledWith('/api/v1/homes/12/activities/7/undo')
    expect(updated.undoable).toBe(false)
    expect(updated.undoneAt).toBe('2026-08-05T11:00:00Z')
  })
})
