import { createFavorite, listFavorites, removeFavorite, updateFavorite } from '../../src/api/favorite'

jest.mock('../../src/utils/request', () => ({
  request: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() }
}))

import { request } from '../../src/utils/request'

describe('favorite api mapping', () => {
  afterEach(() => jest.clearAllMocks())

  it('maps list response and filters by category and visibility', async () => {
    request.get.mockResolvedValue([
      {
        Id: 501, OwnerMemberId: 3, Category: 'restaurant', Name: '老王面馆',
        DetailJson: '{"cuisine":"面食"}', Visibility: 'private', CreatedAt: '2026-08-06T02:00:00Z', UpdatedAt: '2026-08-06T02:00:00Z'
      }
    ])

    const items = await listFavorites({ category: 'restaurant', visibility: 'private' })

    expect(request.get).toHaveBeenCalledWith('/api/v1/life/favorites', { params: { category: 'restaurant', visibility: 'private' } })
    expect(items[0]).toEqual({
      id: 501, ownerMemberId: 3, category: 'restaurant', name: '老王面馆',
      detailJson: '{"cuisine":"面食"}', visibility: 'private', createdAt: '2026-08-06T02:00:00Z', updatedAt: '2026-08-06T02:00:00Z'
    })
  })

  it('omits empty filters from the query string', async () => {
    request.get.mockResolvedValue([])

    await listFavorites({ category: '', visibility: null })

    expect(request.get).toHaveBeenCalledWith('/api/v1/life/favorites', { params: {} })
  })

  it('posts create with camelCase payload', async () => {
    request.post.mockResolvedValue({ Id: 502, Category: 'travel', Name: '杭州', Visibility: 'family' })

    const item = await createFavorite({ category: 'travel', name: '杭州', visibility: 'family' })

    expect(request.post).toHaveBeenCalledWith('/api/v1/life/favorites', { category: 'travel', name: '杭州', visibility: 'family' })
    expect(item.id).toBe(502)
  })

  it('puts update and deletes by id', async () => {
    request.put.mockResolvedValue({ Id: 502, Name: '杭州西溪', Visibility: 'private' })

    const updated = await updateFavorite({ id: 502, payload: { name: '杭州西溪', visibility: 'private' } })

    expect(request.put).toHaveBeenCalledWith('/api/v1/life/favorites/502', { name: '杭州西溪', visibility: 'private' })
    expect(updated.name).toBe('杭州西溪')

    request.delete.mockResolvedValue(null)
    await removeFavorite({ id: 502 })
    expect(request.delete).toHaveBeenCalledWith('/api/v1/life/favorites/502')
  })
})
