import { hasAnyPermission, hasPermission } from '../../src/utils/permission'

const viewerReadOnly = [
  'identity.read', 'smart_home.read', 'family.read', 'steward.activity.read',
  'confirmation.read', 'life.favorite.read', 'connector.read', 'automation.read', 'ai.read'
]

const memberWrites = ['family.write', 'confirmation.write', 'life.favorite.write', 'ai.run', 'media.read', 'expert.mine.write']

const adminOnlyWrites = [
  'connector.write', 'automation.write', 'tenant.member.manage',
  'ai.skills.write', 'expert_file.read', 'expert_file.write', 'team_run.read', 'team_run.write'
]

describe('permission hints', () => {
  it.each(viewerReadOnly)('viewer can read %s', (permission) => {
    expect(hasPermission('viewer', permission)).toBe(true)
  })

  it.each(memberWrites)('member can write %s', (permission) => {
    expect(hasPermission('member', permission)).toBe(true)
  })

  it.each(viewerReadOnly)('member can read %s', (permission) => {
    expect(hasPermission('member', permission)).toBe(true)
  })

  it.each(adminOnlyWrites)('member cannot %s', (permission) => {
    expect(hasPermission('member', permission)).toBe(false)
  })

  it.each([...viewerReadOnly, ...memberWrites, ...adminOnlyWrites])('owner can %s', (permission) => {
    expect(hasPermission('owner', permission)).toBe(true)
  })

  it.each([...viewerReadOnly, ...memberWrites, ...adminOnlyWrites])('admin can %s', (permission) => {
    expect(hasPermission('admin', permission)).toBe(true)
  })

  it.each(viewerReadOnly.concat(memberWrites, adminOnlyWrites))('viewer cannot write %s', (permission) => {
    if (permission.endsWith('.read')) return
    expect(hasPermission('viewer', permission)).toBe(false)
  })

  it('keeps write navigation unavailable to viewers', () => {
    expect(hasPermission('viewer', 'confirmation.write')).toBe(false)
  })

  it('allows owners to see administrative navigation', () => {
    expect(hasPermission('owner', 'connector.write')).toBe(true)
  })

  it('returns true when no permission is required', () => {
    expect(hasPermission('viewer', null)).toBe(true)
    expect(hasPermission('unknown-role', null)).toBe(true)
  })

  it('hasAnyPermission accepts any matching permission', () => {
    expect(hasAnyPermission('viewer', ['family.write', 'confirmation.read'])).toBe(true)
    expect(hasAnyPermission('viewer', ['family.write', 'connector.write'])).toBe(false)
    expect(hasAnyPermission('member', null)).toBe(true)
  })
})
