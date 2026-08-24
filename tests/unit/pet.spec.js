import { addPetCareEvent, createPet, listPetAlerts, listPetCareEvents, listPetSupplies, listPets, upsertPetSupply } from '../../src/api/pet'

jest.mock('../../src/utils/request', () => ({ request: { get: jest.fn(), post: jest.fn(), put: jest.fn() } }))

import { request } from '../../src/utils/request'

describe('pet api mapping', () => {
  afterEach(() => jest.clearAllMocks())

  it('maps pet profiles and care-event requests', async () => {
    request.post.mockResolvedValueOnce({ Id: 7, Name: '豆豆', Species: 'cat', Breed: '英短', IsActive: true })
    await expect(createPet({ homeId: 8, name: '豆豆', species: 'cat', breed: '英短' })).resolves.toMatchObject({ id: 7, name: '豆豆', isActive: true })
    expect(request.post).toHaveBeenCalledWith('/api/v1/homes/8/pets', { name: '豆豆', species: 'cat', breed: '英短', birthDate: null, notes: null })

    request.post.mockResolvedValueOnce({ Id: 9, PetId: 7, CareType: 'vaccine', Title: '年度疫苗', DueDate: '2026-09-01T00:00:00Z' })
    await expect(addPetCareEvent({ homeId: 8, petId: 7, careType: 'vaccine', title: '年度疫苗', dueDate: '2026-09-01' })).resolves.toMatchObject({ id: 9, petId: 7, careType: 'vaccine' })
    expect(request.post).toHaveBeenLastCalledWith('/api/v1/homes/8/pets/7/care-events', { careType: 'vaccine', title: '年度疫苗', dueDate: '2026-09-01', notes: null })

    request.get.mockResolvedValueOnce([{ Id: 7, Name: '豆豆', Species: 'cat', IsActive: true }]).mockResolvedValueOnce([{ Id: 9, PetId: 7, CareType: 'vaccine', Title: '年度疫苗' }])
    await expect(listPets({ homeId: 8 })).resolves.toEqual([{ id: 7, name: '豆豆', species: 'cat', breed: undefined, birthDate: undefined, notes: undefined, isActive: true, createdAt: undefined, updatedAt: undefined }])
    await expect(listPetCareEvents({ homeId: 8, petId: 7 })).resolves.toEqual([{ id: 9, petId: 7, careType: 'vaccine', title: '年度疫苗', dueDate: undefined, completedAt: undefined, notes: undefined }])
  })

  it('maps supply updates and safe reminder fields', async () => {
    request.put.mockResolvedValue({ Id: 3, PetId: 7, ItemName: '猫粮', Quantity: 7, DailyUsage: 1, Unit: '袋', DaysRemaining: 7, ConfirmationId: 22 })
    await expect(upsertPetSupply({ homeId: 8, petId: 7, itemName: '猫粮', quantity: 7, dailyUsage: 1, unit: '袋' })).resolves.toMatchObject({ id: 3, itemName: '猫粮', daysRemaining: 7, confirmationId: 22 })
    expect(request.put).toHaveBeenCalledWith('/api/v1/homes/8/pets/7/supplies', { itemName: '猫粮', quantity: 7, dailyUsage: 1, unit: '袋', measuredAt: null, sourceType: 'manual' })

    request.get.mockResolvedValueOnce([{ Id: 3, PetId: 7, ItemName: '猫粮', Quantity: 7, DailyUsage: 1, Unit: '袋', DaysRemaining: 7, ConfirmationId: 22 }]).mockResolvedValueOnce([{ Type: 'supply_low', PetId: 7, Title: '猫粮将在 7 天内耗尽', DaysRemaining: 7, ConfirmationId: 22 }])
    await expect(listPetSupplies({ homeId: 8, petId: 7 })).resolves.toEqual([expect.objectContaining({ itemName: '猫粮', confirmationId: 22 })])
    await expect(listPetAlerts({ homeId: 8, asOf: '2026-08-20' })).resolves.toEqual([{ type: 'supply_low', petId: 7, title: '猫粮将在 7 天内耗尽', dueDate: undefined, daysRemaining: 7, confirmationId: 22 }])
    expect(request.get).toHaveBeenLastCalledWith('/api/v1/homes/8/pets/alerts', { params: { asOf: '2026-08-20' } })
  })
})
