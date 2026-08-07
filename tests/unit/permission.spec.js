import { hasPermission } from '../../src/utils/permission'

describe('permission hints', () => {
  it('keeps write navigation unavailable to viewers', () => {
    expect(hasPermission('viewer', 'confirmation.write')).toBe(false)
  })

  it('allows owners to see administrative navigation', () => {
    expect(hasPermission('owner', 'connector.write')).toBe(true)
  })
})
