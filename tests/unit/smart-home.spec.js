import { getMockBootstrap } from '../../src/api/smartHome'

jest.mock('../../src/utils/request', () => ({ request: { get: jest.fn() } }))

import { request } from '../../src/utils/request'

describe('smart home api mapping', () => {
  afterEach(() => jest.clearAllMocks())

  it('maps the development bootstrap and preserves the mock boundary', async () => {
    request.get.mockResolvedValue({
      IsMock: true,
      Disclaimer: '仅用于开发',
      GeneratedAt: '2026-08-24T00:00:00Z',
      Spaces: [{ Id: -1, Name: '客厅', SpaceType: 'living_room', Summary: '舒适', DeviceCount: 1, UpdatedAt: '2026-08-24T00:00:00Z' }],
      Devices: [{ Id: -2, SpaceId: -1, Name: '主灯', DeviceType: 'light', OnlineStatus: 'online', StateSummary: '已开启', StateUpdatedAt: null, Capabilities: [{ Capability: 'power', ValueSchema: '{}', Permission: 'smart_home.light.write', IsWritable: true }], BatteryLevel: null, SignalLqi: 200, HealthStatus: 'healthy' }],
      Scenes: [{ Id: -3, Key: 'sleep', Name: '睡眠', Summary: '调整环境', Status: 'active', UpdatedAt: '2026-08-24T00:00:00Z' }],
      DeviceHealth: { Total: 1, Healthy: 1, Degraded: 0, Offline: 0, LowBattery: 0, DominantStatus: 'healthy' }
    })

    await expect(getMockBootstrap()).resolves.toMatchObject({ isMock: true, spaces: [{ id: -1, spaceType: 'living_room' }], devices: [{ id: -2, capabilities: [{ capability: 'power', isWritable: true }] }], deviceHealth: { total: 1, healthy: 1 } })
    expect(request.get).toHaveBeenCalledWith('/api/v1/smart-home/mock/bootstrap')
  })
})
