import { request } from '../utils/request'

const basePath = (homeId) => `/api/v1/homes/${homeId}/pets`

export function createPet({ homeId, name, species, breed = null, birthDate = null, notes = null }) {
  return request.post(basePath(homeId), { name, species, breed: breed || null, birthDate: birthDate || null, notes: notes || null }).then(toPet)
}

export function listPets({ homeId } = {}) {
  return request.get(basePath(homeId)).then((items) => (Array.isArray(items) ? items : []).map(toPet))
}

export function addPetCareEvent({ homeId, petId, careType, title, dueDate, notes = null }) {
  return request.post(`${basePath(homeId)}/${petId}/care-events`, { careType, title, dueDate, notes: notes || null }).then(toCareEvent)
}

export function listPetCareEvents({ homeId, petId }) {
  return request.get(`${basePath(homeId)}/${petId}/care-events`).then((items) => (Array.isArray(items) ? items : []).map(toCareEvent))
}

export function upsertPetSupply({ homeId, petId, itemName, quantity, dailyUsage, unit = '份', measuredAt = null, sourceType = 'manual' }) {
  return request.put(`${basePath(homeId)}/${petId}/supplies`, { itemName, quantity, dailyUsage, unit, measuredAt: measuredAt || null, sourceType }).then(toSupply)
}

export function listPetSupplies({ homeId, petId }) {
  return request.get(`${basePath(homeId)}/${petId}/supplies`).then((items) => (Array.isArray(items) ? items : []).map(toSupply))
}

export function listPetAlerts({ homeId, asOf } = {}) {
  return request.get(`${basePath(homeId)}/alerts`, { params: compact({ asOf }) }).then((items) => (Array.isArray(items) ? items : []).map(toAlert))
}

function compact(values) {
  return Object.keys(values).reduce((result, key) => {
    if (values[key] !== undefined && values[key] !== null && values[key] !== '') result[key] = values[key]
    return result
  }, {})
}

function toPet(dto = {}) {
  return { id: dto.Id, name: dto.Name, species: dto.Species, breed: dto.Breed, birthDate: dto.BirthDate, notes: dto.Notes, isActive: dto.IsActive, createdAt: dto.CreatedAt, updatedAt: dto.UpdatedAt }
}

function toCareEvent(dto = {}) {
  return { id: dto.Id, petId: dto.PetId, careType: dto.CareType, title: dto.Title, dueDate: dto.DueDate, completedAt: dto.CompletedAt, notes: dto.Notes }
}

function toSupply(dto = {}) {
  return { id: dto.Id, petId: dto.PetId, itemName: dto.ItemName, quantity: dto.Quantity, dailyUsage: dto.DailyUsage, unit: dto.Unit, sourceType: dto.SourceType, measuredAt: dto.MeasuredAt, daysRemaining: dto.DaysRemaining, confirmationId: dto.ConfirmationId }
}

function toAlert(dto = {}) {
  return { type: dto.Type, petId: dto.PetId, title: dto.Title, dueDate: dto.DueDate, daysRemaining: dto.DaysRemaining, confirmationId: dto.ConfirmationId }
}
