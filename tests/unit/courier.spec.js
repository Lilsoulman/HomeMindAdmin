import { createShipment, listCourierAnomalies, listShipments, refreshShipment } from '../../src/api/courier'

jest.mock('../../src/utils/request', () => ({ request: { get: jest.fn(), post: jest.fn() } }))

import { request } from '../../src/utils/request'

describe('courier api mapping', () => {
  afterEach(() => jest.clearAllMocks())

  it('maps shipment registration and list fields', async () => {
    request.post.mockResolvedValue({ Id: 7, TrackingNumberMasked: '******1234', Carrier: '快递', IsFreshFood: true, LatestStatus: 'in_transit' })
    await expect(createShipment({ homeId: 8, trackingNumber: '1234567890', carrier: '快递', isFreshFood: true })).resolves.toMatchObject({ id: 7, trackingNumberMasked: '******1234', isFreshFood: true })
    expect(request.post).toHaveBeenCalledWith('/api/v1/homes/8/courier/shipments', { trackingNumber: '1234567890', carrier: '快递', label: null, isFreshFood: true, expectedDeliveryAt: null })

    request.get.mockResolvedValue([{ Id: 7, TrackingNumberMasked: '******1234', LatestStatus: 'delivered' }])
    await expect(listShipments({ homeId: 8 })).resolves.toEqual([{ id: 7, trackingNumberMasked: '******1234', latestStatus: 'delivered' }])
  })

  it('maps refresh events and anomaly confirmation ids', async () => {
    request.post.mockResolvedValue({ Shipment: { Id: 7, TrackingNumberMasked: '******1234', LatestStatus: 'exception' }, NewEvents: [{ Status: 'exception', Description: '延误', Location: '上海', OccurredAt: '2026-08-20T00:00:00Z' }], Anomalies: [{ ShipmentId: 7, Type: 'stagnant', Title: '物流停滞', Description: '超过48小时', SuggestedAction: '查看确认中心', ConfirmationId: 22 }] })
    await expect(refreshShipment({ homeId: 8, shipmentId: 7 })).resolves.toEqual({ shipment: expect.objectContaining({ id: 7, latestStatus: 'exception' }), newEvents: [{ status: 'exception', description: '延误', location: '上海', occurredAt: '2026-08-20T00:00:00Z' }], anomalies: [{ shipmentId: 7, type: 'stagnant', title: '物流停滞', description: '超过48小时', suggestedAction: '查看确认中心', confirmationId: 22 }] })

    request.get.mockResolvedValue([{ ShipmentId: 7, Type: 'fresh_food_risk', Title: '生鲜风险', Description: '已超时', SuggestedAction: '联系承运商', ConfirmationId: 23 }])
    await expect(listCourierAnomalies({ homeId: 8 })).resolves.toEqual([{ shipmentId: 7, type: 'fresh_food_risk', title: '生鲜风险', description: '已超时', suggestedAction: '联系承运商', confirmationId: 23 }])
  })
})
