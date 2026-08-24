import { request } from '../utils/request'

export function getHouseholdState({ homeId }) {
  return request.get(`/api/v1/homes/${homeId}/state`).then(toHouseholdState)
}

export function toHouseholdState(dto = {}) {
  return {
    homeId: dto.HomeId,
    generatedAt: dto.GeneratedAt || null,
    context: dto.Context || 'Anonymous',
    contextMemberId: dto.ContextMemberId === undefined ? null : dto.ContextMemberId,
    members: Array.isArray(dto.Members) ? dto.Members.map(toMember) : [],
    spaces: Array.isArray(dto.Spaces) ? dto.Spaces.map(toSpace) : [],
    environment: Array.isArray(dto.Environment) ? dto.Environment.map(toEnvironment) : [],
    devices: Array.isArray(dto.Devices) ? dto.Devices.map(toDevice) : [],
    scenes: Array.isArray(dto.Scenes) ? dto.Scenes.map(toScene) : [],
    degradedReasons: Array.isArray(dto.DegradedReasons) ? dto.DegradedReasons.slice() : []
  }
}

function toMember(dto = {}) {
  return {
    id: dto.Id,
    name: dto.Name,
    relation: dto.Relation,
    status: dto.Status,
    source: dto.Source,
    updatedAt: dto.UpdatedAt || null,
    confidence: dto.Confidence
  }
}

function toSpace(dto = {}) {
  return {
    id: dto.Id,
    name: dto.Name,
    spaceType: dto.SpaceType,
    summary: dto.Summary || '',
    source: dto.Source,
    updatedAt: dto.UpdatedAt || null,
    confidence: dto.Confidence
  }
}

function toEnvironment(dto = {}) {
  return {
    deviceId: dto.DeviceId,
    spaceId: dto.SpaceId === undefined ? null : dto.SpaceId,
    deviceType: dto.DeviceType,
    summary: dto.Summary || '',
    updatedAt: dto.UpdatedAt || null,
    source: dto.Source,
    confidence: dto.Confidence
  }
}

function toDevice(dto = {}) {
  return {
    id: dto.Id,
    spaceId: dto.SpaceId === undefined ? null : dto.SpaceId,
    name: dto.Name,
    deviceType: dto.DeviceType,
    onlineStatus: dto.OnlineStatus,
    healthStatus: dto.HealthStatus,
    stateSummary: dto.StateSummary || '',
    updatedAt: dto.UpdatedAt || null,
    source: dto.Source,
    confidence: dto.Confidence
  }
}

function toScene(dto = {}) {
  return {
    key: dto.Key,
    name: dto.Name,
    status: dto.Status,
    healthStatus: dto.HealthStatus,
    source: dto.Source,
    updatedAt: dto.UpdatedAt || null,
    confidence: dto.Confidence
  }
}
