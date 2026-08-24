import { request } from '../utils/request'

export function getMockBootstrap() {
  return request.get('/api/v1/smart-home/mock/bootstrap').then(toMockBootstrap)
}

export function toMockBootstrap(dto = {}) {
  return {
    isMock: Boolean(dto.IsMock),
    disclaimer: dto.Disclaimer || '',
    generatedAt: dto.GeneratedAt || null,
    spaces: Array.isArray(dto.Spaces) ? dto.Spaces.map(toSpace) : [],
    devices: Array.isArray(dto.Devices) ? dto.Devices.map(toDevice) : [],
    scenes: Array.isArray(dto.Scenes) ? dto.Scenes.map(toScene) : [],
    deviceHealth: toHealth(dto.DeviceHealth)
  }
}

function toSpace(dto = {}) {
  return {
    id: dto.Id,
    name: dto.Name,
    spaceType: dto.SpaceType,
    summary: dto.Summary || '',
    deviceCount: dto.DeviceCount || 0,
    updatedAt: dto.UpdatedAt || null
  }
}

function toDevice(dto = {}) {
  return {
    id: dto.Id,
    spaceId: dto.SpaceId === undefined ? null : dto.SpaceId,
    name: dto.Name,
    deviceType: dto.DeviceType,
    onlineStatus: dto.OnlineStatus,
    stateSummary: dto.StateSummary || '',
    stateUpdatedAt: dto.StateUpdatedAt || null,
    capabilities: Array.isArray(dto.Capabilities) ? dto.Capabilities.map(toCapability) : [],
    batteryLevel: dto.BatteryLevel === undefined ? null : dto.BatteryLevel,
    signalLqi: dto.SignalLqi === undefined ? null : dto.SignalLqi,
    healthStatus: dto.HealthStatus || 'unknown'
  }
}

function toCapability(dto = {}) {
  return {
    capability: dto.Capability,
    valueSchema: dto.ValueSchema,
    permission: dto.Permission,
    isWritable: Boolean(dto.IsWritable)
  }
}

function toScene(dto = {}) {
  return {
    id: dto.Id,
    key: dto.Key,
    name: dto.Name,
    summary: dto.Summary || '',
    status: dto.Status,
    updatedAt: dto.UpdatedAt || null
  }
}

function toHealth(dto = {}) {
  return {
    total: dto.Total || 0,
    healthy: dto.Healthy || 0,
    degraded: dto.Degraded || 0,
    offline: dto.Offline || 0,
    lowBattery: dto.LowBattery || 0,
    dominantStatus: dto.DominantStatus || null
  }
}
