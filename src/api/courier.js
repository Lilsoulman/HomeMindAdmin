import { request } from '../utils/request'

const basePath = (homeId) => `/api/v1/homes/${homeId}/courier`

export function createShipment({ homeId, trackingNumber, carrier, label, isFreshFood = false, expectedDeliveryAt = null }) {
  return request.post(`${basePath(homeId)}/shipments`, { trackingNumber, carrier: carrier || null, label: label || null, isFreshFood, expectedDeliveryAt }).then(toShipment)
}

export function listShipments({ homeId } = {}) {
  return request.get(`${basePath(homeId)}/shipments`).then((items) => (Array.isArray(items) ? items : []).map(toShipment))
}

export function refreshShipment({ homeId, shipmentId }) {
  return request.post(`${basePath(homeId)}/shipments/${shipmentId}/refresh`).then(toRefresh)
}

export function listCourierAnomalies({ homeId } = {}) {
  return request.get(`${basePath(homeId)}/anomalies`).then((items) => (Array.isArray(items) ? items : []).map(toAnomaly))
}

function toShipment(dto = {}) {
  return {
    id: dto.Id,
    trackingNumberMasked: dto.TrackingNumberMasked,
    carrier: dto.Carrier,
    label: dto.Label,
    isFreshFood: dto.IsFreshFood,
    expectedDeliveryAt: dto.ExpectedDeliveryAt,
    latestStatus: dto.LatestStatus,
    latestDescription: dto.LatestDescription,
    latestLocation: dto.LatestLocation,
    latestEventAt: dto.LatestEventAt,
    lastCheckedAt: dto.LastCheckedAt
  }
}

function toEvent(dto = {}) {
  return { status: dto.Status, description: dto.Description, location: dto.Location, occurredAt: dto.OccurredAt }
}

function toAnomaly(dto = {}) {
  return { shipmentId: dto.ShipmentId, type: dto.Type, title: dto.Title, description: dto.Description, suggestedAction: dto.SuggestedAction, confirmationId: dto.ConfirmationId }
}

function toRefresh(dto = {}) {
  return {
    shipment: toShipment(dto.Shipment),
    newEvents: Array.isArray(dto.NewEvents) ? dto.NewEvents.map(toEvent) : [],
    anomalies: Array.isArray(dto.Anomalies) ? dto.Anomalies.map(toAnomaly) : []
  }
}
