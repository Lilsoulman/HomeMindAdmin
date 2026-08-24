import { createDocumentDeadline, getTomorrowSchedulePreview, listDocumentDeadlines, listScheduleAvailability, listScheduleConflicts, listScheduleEvents, listScheduleReminders } from '../../src/api/schedule'

jest.mock('../../src/utils/request', () => ({ request: { get: jest.fn(), post: jest.fn() } }))

import { request } from '../../src/utils/request'

describe('schedule api mapping', () => {
  afterEach(() => jest.clearAllMocks())

  it('maps collaborative calendar views with their window parameters', async () => {
    request.get.mockResolvedValueOnce([{ Id: 4, UserId: 9, MemberName: '小王', Title: '家长会', StartAt: '2026-08-21T10:00:00Z', EndAt: null, AllDay: false }])
      .mockResolvedValueOnce([{ First: { Id: 4, Title: '家长会' }, Second: { Id: 5, Title: '体检' }, OverlapStartAt: '2026-08-21T10:00:00Z', OverlapEndAt: '2026-08-21T10:30:00Z' }])
      .mockResolvedValueOnce([{ StartAt: '2026-08-21T12:00:00Z', EndAt: '2026-08-21T13:30:00Z' }])

    await expect(listScheduleEvents({ homeId: 8, from: '2026-08-21T00:00:00Z', to: '2026-08-22T00:00:00Z' })).resolves.toEqual([expect.objectContaining({ id: 4, memberName: '小王', allDay: false })])
    await expect(listScheduleConflicts({ homeId: 8 })).resolves.toEqual([expect.objectContaining({ first: expect.objectContaining({ title: '家长会' }), second: expect.objectContaining({ title: '体检' }) })])
    await expect(listScheduleAvailability({ homeId: 8, durationMinutes: 90 })).resolves.toEqual([{ startAt: '2026-08-21T12:00:00Z', endAt: '2026-08-21T13:30:00Z' }])

    expect(request.get).toHaveBeenNthCalledWith(1, '/api/v1/homes/8/schedule/events', { params: { from: '2026-08-21T00:00:00Z', to: '2026-08-22T00:00:00Z' } })
    expect(request.get).toHaveBeenNthCalledWith(2, '/api/v1/homes/8/schedule/conflicts', { params: {} })
    expect(request.get).toHaveBeenNthCalledWith(3, '/api/v1/homes/8/schedule/availability', { params: { durationMinutes: 90 } })
  })

  it('maps safe deadline, reminder, and tomorrow-preview fields', async () => {
    request.post.mockResolvedValueOnce({ Id: 6, DocumentType: 'passport', DisplayName: '护照续期', HolderName: '小王', ExpiresOn: '2026-12-01T00:00:00Z', IsActive: true })
    await expect(createDocumentDeadline({ homeId: 8, documentType: 'passport', displayName: '护照续期', expiresOn: '2026-12-01' })).resolves.toEqual(expect.objectContaining({ id: 6, displayName: '护照续期', isActive: true }))
    expect(request.post).toHaveBeenCalledWith('/api/v1/homes/8/schedule/document-deadlines', { documentType: 'passport', displayName: '护照续期', holderUserId: null, expiresOn: '2026-12-01' })

    request.get.mockResolvedValueOnce([{ Id: 6, DocumentType: 'passport', DisplayName: '护照续期', ExpiresOn: '2026-12-01T00:00:00Z', IsActive: true }])
      .mockResolvedValueOnce([{ Type: 'document', SourceId: 6, Title: '证件提醒', DueDate: '2026-12-01T00:00:00Z', DaysRemaining: 103, ConfirmationId: 19 }])
      .mockResolvedValueOnce({ Date: '2026-08-21T00:00:00Z', Events: [{ Id: 4, Title: '家长会' }], Conflicts: [], Reminders: [{ Type: 'document', SourceId: 6, Title: '证件提醒', ConfirmationId: 19 }] })
    await expect(listDocumentDeadlines({ homeId: 8 })).resolves.toEqual([expect.objectContaining({ documentType: 'passport' })])
    await expect(listScheduleReminders({ homeId: 8, asOf: '2026-08-20T00:00:00Z' })).resolves.toEqual([expect.objectContaining({ confirmationId: 19 })])
    await expect(getTomorrowSchedulePreview({ homeId: 8 })).resolves.toEqual(expect.objectContaining({ events: [expect.objectContaining({ title: '家长会' })], reminders: [expect.objectContaining({ confirmationId: 19 })] }))
    expect(request.get).toHaveBeenNthCalledWith(2, '/api/v1/homes/8/schedule/reminders', { params: { asOf: '2026-08-20T00:00:00Z' } })
  })
})
