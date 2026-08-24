import { routes } from '../../src/router/routes'

const appRoute = routes.find((route) => route.path === '/app')

describe('HomeMind product surface', () => {
  it('keeps only the five product modules in the application shell', () => {
    expect(appRoute.children.map((route) => route.path)).toEqual([
      'dashboard',
      'devices',
      'scenes',
      'memories',
      'settings'
    ])
  })

  it('does not expose retired domains through top-level routes', () => {
    const paths = routes.map((route) => route.path)

    expect(paths).not.toContain('/console')
    expect(paths).not.toContain('/oauth/callback')
  })
})
