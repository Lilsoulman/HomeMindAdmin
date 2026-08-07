import { request } from '../utils/request'

export function listFavorites({ category, visibility }) {
  return request
    .get('/api/v1/life/favorites', { params: cleanParams({ category, visibility }) })
    .then((items) => (Array.isArray(items) ? items.map(toFavorite) : []))
}

export function createFavorite(payload) {
  return request
    .post('/api/v1/life/favorites', payload)
    .then(toFavorite)
}

export function updateFavorite({ id, payload }) {
  return request
    .put(`/api/v1/life/favorites/${id}`, payload)
    .then(toFavorite)
}

export function removeFavorite({ id }) {
  return request.delete(`/api/v1/life/favorites/${id}`)
}

function cleanParams(params) {
  return Object.entries(params).reduce((result, [key, value]) => {
    if (value != null && value !== '') result[key] = value
    return result
  }, {})
}

function toFavorite(dto = {}) {
  return {
    id: dto.Id,
    ownerMemberId: dto.OwnerMemberId,
    category: dto.Category,
    name: dto.Name,
    detailJson: dto.DetailJson,
    visibility: dto.Visibility,
    createdAt: dto.CreatedAt,
    updatedAt: dto.UpdatedAt
  }
}
