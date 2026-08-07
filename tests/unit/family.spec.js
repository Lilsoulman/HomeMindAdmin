import { correctMember, createMember, deleteKnowledge, listDecisions, listKnowledge, listMembers, recordDecision, updateMember, writeKnowledge } from '../../src/api/family'

jest.mock('../../src/utils/request', () => ({
  request: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() }
}))

import { request } from '../../src/utils/request'

describe('family api mapping', () => {
  afterEach(() => jest.clearAllMocks())

  it('maps member list fields from PascalCase', async () => {
    request.get.mockResolvedValue([
      {
        Id: 1, Name: 'Alex', Relation: '户主', Birthday: '1985-06-01T00:00:00Z', IsElderly: false, IsChild: false,
        IsPrimary: true, MemberStatus: 'active', Preferences: null, CreatedAt: '2026-08-01T03:11:22Z', UpdatedAt: '2026-08-01T03:11:22Z'
      }
    ])

    const members = await listMembers({ homeId: 14 })

    expect(request.get).toHaveBeenCalledWith('/api/v1/homes/14/members')
    expect(members[0]).toEqual({
      id: 1, name: 'Alex', relation: '户主', birthday: '1985-06-01T00:00:00Z', isElderly: false, isChild: false,
      isPrimary: true, memberStatus: 'active', preferences: null, createdAt: '2026-08-01T03:11:22Z', updatedAt: '2026-08-01T03:11:22Z'
    })
  })

  it('posts create member with camelCase payload', async () => {
    request.post.mockResolvedValue({ Id: 2, Name: 'Mia', Relation: '子女', MemberStatus: 'active' })

    const member = await createMember({ homeId: 14, payload: { name: 'Mia', relation: '子女' } })

    expect(request.post).toHaveBeenCalledWith('/api/v1/homes/14/members', { name: 'Mia', relation: '子女' })
    expect(member.id).toBe(2)
  })

  it('posts correction with status and reason', async () => {
    request.post.mockResolvedValue({ Id: 2, Name: 'Mia', MemberStatus: 'permanently_left' })

    const member = await correctMember({ homeId: 14, id: 2, memberStatus: 'permanently_left', reason: '已搬离' })

    expect(request.post).toHaveBeenCalledWith('/api/v1/homes/14/members/2/correction', { memberStatus: 'permanently_left', reason: '已搬离' })
    expect(member.memberStatus).toBe('permanently_left')
  })

  it('maps knowledge list and omits empty category filter', async () => {
    request.get.mockResolvedValue([
      {
        Id: 5, Category: 'wifi', Key: 'guest_password', Value: 'home1234', Notes: null, SourceType: 'member',
        SourceMemberId: 1, ConfidenceScore: 0.9, ConflictResolutionStrategy: 'latest', ResolutionSummary: null,
        CreatedAt: '2026-08-02T00:00:00Z', UpdatedAt: '2026-08-02T00:00:00Z'
      }
    ])

    const items = await listKnowledge({ homeId: 14, category: '' })

    expect(request.get).toHaveBeenCalledWith('/api/v1/homes/14/knowledge', { params: {} })
    expect(items[0].confidenceScore).toBe(0.9)
    expect(items[0].key).toBe('guest_password')
  })

  it('maps knowledge write response with conflict resolution', async () => {
    request.post.mockResolvedValue({
      Knowledge: { Id: 9, Category: 'other', Key: 'pet', Value: '猫' },
      Resolution: { KnowledgeId: 9, ConflictKey: 'pet', Strategy: 'latest', ResolutionSummary: '新值覆盖', ConflictingIds: [7] }
    })

    const result = await writeKnowledge({ homeId: 14, payload: { category: 'other', key: 'pet', value: '猫' } })

    expect(request.post).toHaveBeenCalledWith('/api/v1/homes/14/knowledge', { category: 'other', key: 'pet', value: '猫' })
    expect(result.knowledge.id).toBe(9)
    expect(result.resolution.conflictingIds).toEqual([7])
    expect(result.resolution.strategy).toBe('latest')
  })

  it('deletes knowledge by id', async () => {
    request.delete.mockResolvedValue(null)

    await deleteKnowledge({ homeId: 14, id: 9 })

    expect(request.delete).toHaveBeenCalledWith('/api/v1/homes/14/knowledge/9')
  })

  it('maps paged decisions with cursor', async () => {
    request.get.mockResolvedValue({
      Items: [{ Id: 1, Scenario: '宽带续费', DecisionMade: '续一年', Rationale: '便宜', Alternatives: null, MadeByMemberId: 1, DecidedAt: '2026-08-03T00:00:00Z', UpdatedAt: '2026-08-03T00:00:00Z' }],
      Cursor: 'c1'
    })

    const page = await listDecisions({ homeId: 14, cursor: 'c1' })

    expect(request.get).toHaveBeenCalledWith('/api/v1/homes/14/decisions', { params: { limit: 20, cursor: 'c1' } })
    expect(page.cursor).toBe('c1')
    expect(page.items[0].scenario).toBe('宽带续费')
  })

  it('posts decision record', async () => {
    request.post.mockResolvedValue({ Id: 2, Scenario: '空调品牌', DecisionMade: '选 A 品牌' })

    const decision = await recordDecision({ homeId: 14, payload: { scenario: '空调品牌', decisionMade: '选 A 品牌' } })

    expect(request.post).toHaveBeenCalledWith('/api/v1/homes/14/decisions', { scenario: '空调品牌', decisionMade: '选 A 品牌' })
    expect(decision.id).toBe(2)
  })

  it('updates member via put', async () => {
    request.put.mockResolvedValue({ Id: 3, Name: 'Bob', MemberStatus: 'away' })

    const member = await updateMember({ homeId: 14, id: 3, payload: { memberStatus: 'away' } })

    expect(request.put).toHaveBeenCalledWith('/api/v1/homes/14/members/3', { memberStatus: 'away' })
    expect(member.memberStatus).toBe('away')
  })
})
