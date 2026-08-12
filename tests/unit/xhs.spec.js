import { confirmXhsPublishAction, createXhsPublishAction, getXhsAuthStatus, getXhsNoteDetail, searchXhsNotes } from '../../src/api/xhs'
import { request } from '../../src/utils/request'

jest.mock('../../src/utils/request', () => ({
  request: { get: jest.fn(), post: jest.fn() }
}))

describe('xhs api', () => {
  afterEach(() => jest.clearAllMocks())

  it('maps auth, search, and detail responses without exposing connector credentials', async () => {
    request.get
      .mockResolvedValueOnce({ LoggedIn: true, Message: '已登录' })
      .mockResolvedValueOnce([{ NoteId: 'note-1', Title: '露营', CoverUrl: 'https://example.com/cover.jpg', AuthorName: '小明', Link: 'https://xhs.example/note-1' }])
      .mockResolvedValueOnce({ NoteId: 'note-1', Title: '露营', Content: '正文', Images: ['https://example.com/1.jpg'], Link: 'https://xhs.example/note-1' })

    await expect(getXhsAuthStatus()).resolves.toEqual({ loggedIn: true, message: '已登录' })
    await expect(searchXhsNotes({ query: '露营', limit: 5 })).resolves.toEqual([{ noteId: 'note-1', title: '露营', coverUrl: 'https://example.com/cover.jpg', authorName: '小明', link: 'https://xhs.example/note-1' }])
    await expect(getXhsNoteDetail({ url: 'https://xhs.example/note-1' })).resolves.toEqual({ noteId: 'note-1', title: '露营', content: '正文', images: ['https://example.com/1.jpg'], link: 'https://xhs.example/note-1' })
    expect(request.get).toHaveBeenNthCalledWith(2, '/api/v1/connector-providers/xhs/notes/search', { params: { query: '露营', limit: 5 } })
  })

  it('uses Url fields returned by the note search API', async () => {
    request.get.mockResolvedValueOnce([{ NoteId: 'note-2', Title: '咖啡', Url: 'https://xhs.example/note-2' }])

    await expect(searchXhsNotes({ query: '咖啡' })).resolves.toEqual([
      { noteId: 'note-2', title: '咖啡', coverUrl: undefined, authorName: undefined, link: 'https://xhs.example/note-2' }
    ])
  })

  it('builds a detail URL from an encoded note id when the search response has no link', async () => {
    request.get.mockResolvedValueOnce([{ NoteId: 'note#2', Title: '咖啡' }])

    await expect(searchXhsNotes({ query: '咖啡' })).resolves.toEqual([
      { noteId: 'note#2', title: '咖啡', coverUrl: undefined, authorName: undefined, link: 'https://www.xiaohongshu.com/explore/note%232' }
    ])
  })

  it('creates a pending action and confirms it through separate idempotent requests', async () => {
    request.post
      .mockResolvedValueOnce({ ActionId: 11, ActionType: 'xhs_publish', Status: 'pending', Title: '露营', Description: '图文', RiskLevel: 'L2' })
      .mockResolvedValueOnce({ ActionId: 11, Status: 'executed', Message: '发布成功', NoteId: 'note-2' })

    await expect(createXhsPublishAction({ idempotencyKey: 'create-key', type: 'image', title: '露营', content: '正文', mediaPaths: ['D:\\cover.jpg'], tags: ['露营'] })).resolves.toMatchObject({ actionId: 11, status: 'pending', riskLevel: 'L2' })
    await expect(confirmXhsPublishAction({ actionId: 11, idempotencyKey: 'confirm-key' })).resolves.toEqual({ actionId: 11, status: 'executed', message: '发布成功', noteId: 'note-2' })
    expect(request.post).toHaveBeenNthCalledWith(1, '/api/v1/connector-providers/xhs/notes/publish', { idempotencyKey: 'create-key', type: 'image', title: '露营', content: '正文', mediaPaths: ['D:\\cover.jpg'], tags: ['露营'] })
    expect(request.post).toHaveBeenNthCalledWith(2, '/api/v1/connector-providers/xhs/publish-actions/11/confirm', { idempotencyKey: 'confirm-key' })
  })
})
