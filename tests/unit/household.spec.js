import { getHouseholdState } from '../../src/api/household'

jest.mock('../../src/utils/request', () => ({ request: { get: jest.fn() } }))

import { request } from '../../src/utils/request'

describe('household state api mapping', () => {
  afterEach(() => jest.clearAllMocks())

  it('maps PascalCase state fields and keeps degraded reasons', async () => {
    request.get.mockResolvedValue({
      HomeId: 14, GeneratedAt: '2026-08-24T00:00:00Z', Context: 'Family', ContextMemberId: null,
      Members: [{ Id: 1, Name: 'Alex', Relation: '户主', Status: 'active', Source: 'family_members', UpdatedAt: '2026-08-24T00:00:00Z', Confidence: 1 }],
      Spaces: [], Environment: [], Devices: [{ Id: 2, SpaceId: null, Name: '主灯', DeviceType: 'light', OnlineStatus: 'online', HealthStatus: 'healthy', StateSummary: '已开启', UpdatedAt: null, Source: 'smart_home_devices', Confidence: 0.7 }],
      Scenes: [], DegradedReasons: ['spaces_unavailable']
    })

    await expect(getHouseholdState({ homeId: 14 })).resolves.toMatchObject({ homeId: 14, context: 'Family', members: [{ id: 1, relation: '户主' }], devices: [{ id: 2, healthStatus: 'healthy' }], degradedReasons: ['spaces_unavailable'] })
    expect(request.get).toHaveBeenCalledWith('/api/v1/homes/14/state')
  })
})
