import {
  createConnector, discoverConnector, getAuthorizationSession, getMyAuthorization, getMyConnections, getSyncJob,
  listConnectors, listProviders, revokePersonalAuthorization, startPersonalAuthorization,
  syncConnector, testConnector, updateMemberAuthorization
} from '../../src/api/connector'
import { listTenantMembers } from '../../src/api/tenant'

jest.mock('../../src/utils/request', () => ({
  request: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() }
}))

import { request } from '../../src/utils/request'

describe('connector api mapping', () => {
  afterEach(() => jest.clearAllMocks())

  it('maps provider catalog', async () => {
    request.get.mockResolvedValue([
      { Id: 1, Code: 'home_assistant', Name: 'Home Assistant', ConnectorType: 'smart_home', Description: '家庭自动化' }
    ])

    const providers = await listProviders()

    expect(request.get).toHaveBeenCalledWith('/api/v1/connector-providers')
    expect(providers[0]).toEqual({ id: 1, code: 'home_assistant', name: 'Home Assistant', connectorType: 'smart_home', description: '家庭自动化' })
  })

  it('maps connector list with binding scope', async () => {
    request.get.mockResolvedValue([
      {
        Id: 8, ProviderId: 1, ProviderCode: 'home_assistant', ProviderName: 'Home Assistant', Name: '我家HA',
        Status: 'connected', LastSyncAt: '2026-08-04T10:00:00Z', LastHealthAt: '2026-08-04T10:00:00Z',
        CreatedAt: '2026-08-03T00:00:00Z', UpdatedAt: '2026-08-04T10:00:00Z', BindingScope: 'household', IsCurrentUserOwner: false
      }
    ])

    const items = await listConnectors()

    expect(request.get).toHaveBeenCalledWith('/api/v1/connectors')
    expect(items[0]).toEqual({
      id: 8, providerId: 1, providerCode: 'home_assistant', providerName: 'Home Assistant', name: '我家HA',
      status: 'connected', lastSyncAt: '2026-08-04T10:00:00Z', lastHealthAt: '2026-08-04T10:00:00Z',
      createdAt: '2026-08-03T00:00:00Z', updatedAt: '2026-08-04T10:00:00Z', bindingScope: 'household', isCurrentUserOwner: false
    })
  })

  it('posts create with only allowed fields', async () => {
    request.post.mockResolvedValue({ Id: 9, Name: 'My home', Status: 'disconnected' })

    const connector = await createConnector({ providerId: 1, name: 'My home', credentialRef: 'vault://tenants/12/secrets/home-assistant', bindingScope: 'household' })

    expect(request.post).toHaveBeenCalledWith('/api/v1/connectors', {
      providerId: 1, name: 'My home', credentialRef: 'vault://tenants/12/secrets/home-assistant', bindingScope: 'household'
    })
    expect(connector.id).toBe(9)
  })

  it('maps test and discovery operation views', async () => {
    const operation = { ConnectorId: 8, Status: 'connected', DeviceCount: 12, LastHealthAt: '2026-08-04T10:00:00Z', LastSyncAt: null }
    request.post.mockResolvedValue(operation)

    const tested = await testConnector({ id: 8 })
    const discovered = await discoverConnector({ id: 8 })

    expect(request.post).toHaveBeenCalledWith('/api/v1/connectors/8/test')
    expect(request.post).toHaveBeenCalledWith('/api/v1/connectors/8/discovery')
    expect(tested).toEqual({ connectorId: 8, status: 'connected', deviceCount: 12, lastHealthAt: '2026-08-04T10:00:00Z', lastSyncAt: null })
    expect(discovered.deviceCount).toBe(12)
  })

  it('maps sync job and polls by id', async () => {
    request.post.mockResolvedValue({ Id: 21, ConnectorId: 8, Status: 'queued', Reason: null, AttemptNo: 1, AvailableAt: '2026-08-04T10:00:00Z', CompletedAt: null, UpdatedAt: '2026-08-04T10:00:00Z' })

    const job = await syncConnector({ id: 8 })
    expect(request.post).toHaveBeenCalledWith('/api/v1/connectors/8/sync')
    expect(job.id).toBe(21)
    expect(job.status).toBe('queued')

    request.get.mockResolvedValue({ Id: 21, ConnectorId: 8, Status: 'completed', Reason: null, AttemptNo: 1, CompletedAt: '2026-08-04T10:00:10Z' })
    const finished = await getSyncJob({ jobId: 21 })
    expect(request.get).toHaveBeenCalledWith('/api/v1/connectors/sync-jobs/21')
    expect(finished.status).toBe('completed')
  })

  it('maps my authorization and puts member authorization', async () => {
    request.get.mockResolvedValue({ ConnectorId: 8, UserId: 12, Scopes: ['smart_home.read'], UpdatedAt: '2026-08-04T10:00:00Z' })

    const mine = await getMyAuthorization({ id: 8 })
    expect(request.get).toHaveBeenCalledWith('/api/v1/connectors/8/authorization')
    expect(mine.scopes).toEqual(['smart_home.read'])

    request.put.mockResolvedValue({ ConnectorId: 8, UserId: 12, Scopes: ['smart_home.read', 'smart_home.light.write'] })
    const updated = await updateMemberAuthorization({ id: 8, memberUserId: 12, scopes: ['smart_home.read', 'smart_home.light.write'] })
    expect(request.put).toHaveBeenCalledWith('/api/v1/connectors/8/authorizations/12', { scopes: ['smart_home.read', 'smart_home.light.write'] })
    expect(updated.scopes).toHaveLength(2)
  })

  it('maps my connections summary without credentials', async () => {
    request.get.mockResolvedValue([
      {
        ConnectorId: 8, ProviderId: 1, ProviderCode: 'home_assistant', ProviderName: 'Home Assistant', Name: '我的日历',
        Status: 'connected', AuthStatus: 'connected', LastSyncAt: null, LastHealthAt: '2026-08-07T09:00:00Z',
        LastSessionId: 101, LastSessionStatus: 'completed', LastSessionExpiresAt: '2026-08-07T10:00:00Z'
      }
    ])

    const items = await getMyConnections()

    expect(request.get).toHaveBeenCalledWith('/api/v1/connector-authorizations/my')
    expect(items[0].authStatus).toBe('connected')
    expect(items[0].lastSessionStatus).toBe('completed')
    expect(items[0].name).toBe('我的日历')
  })

  it('starts a personal authorization session', async () => {
    request.post.mockResolvedValue({
      SessionId: 101, ProviderCode: 'mock_oauth', ProviderName: 'Mock OAuth（开发验证）',
      Status: 'pending', ExpiresAt: '2026-08-07T10:10:00Z',
      AuthorizationUrl: 'http://localhost:5280/api/v1/connector-providers/mock_oauth/authorize?state=abc'
    })

    const session = await startPersonalAuthorization({ providerCode: 'mock_oauth', redirectUri: 'http://localhost:8080/oauth/callback' })

    expect(request.post).toHaveBeenCalledWith('/api/v1/connector-providers/mock_oauth/authorizations', { redirectUri: 'http://localhost:8080/oauth/callback' })
    expect(session).toEqual({
      sessionId: 101, providerCode: 'mock_oauth', providerName: 'Mock OAuth（开发验证）',
      status: 'pending', expiresAt: '2026-08-07T10:10:00Z', authorizationUrl: 'http://localhost:5280/api/v1/connector-providers/mock_oauth/authorize?state=abc'
    })
  })

  it('gets an authorization session by id', async () => {
    request.get.mockResolvedValue({
      SessionId: 101, ProviderCode: 'mock_oauth', ProviderName: 'Mock OAuth（开发验证）',
      Status: 'completed', ExpiresAt: '2026-08-07T10:10:00Z', RedirectUri: 'http://localhost:8080/oauth/callback'
    })

    const session = await getAuthorizationSession({ id: 101 })

    expect(request.get).toHaveBeenCalledWith('/api/v1/connector-authorizations/101')
    expect(session.status).toBe('completed')
  })

  it('revokes a personal authorization by id', async () => {
    request.delete.mockResolvedValue({
      SessionId: 101, ProviderCode: 'mock_oauth', ProviderName: 'Mock OAuth（开发验证）',
      Status: 'revoked', ExpiresAt: '2026-08-07T10:10:00Z', RedirectUri: null
    })

    const session = await revokePersonalAuthorization({ id: 101 })

    expect(request.delete).toHaveBeenCalledWith('/api/v1/connector-authorizations/101')
    expect(session.status).toBe('revoked')
  })

  it('maps tenant members for authorization config', async () => {
    request.get.mockResolvedValue([
      { UserId: 12, DisplayName: 'Alex', Role: 'owner', Status: 'active', JoinedAt: '2026-08-01T03:11:22Z', RowVersion: 1, IsCurrentUserOwner: true }
    ])

    const members = await listTenantMembers({ homeId: 14 })

    expect(request.get).toHaveBeenCalledWith('/api/v1/homes/14/members')
    expect(members[0]).toEqual({
      userId: 12, displayName: 'Alex', avatarUrl: undefined, role: 'owner', status: 'active',
      joinedAt: '2026-08-01T03:11:22Z', timezone: undefined, locale: undefined,
      isCurrentUserOwner: true, hasPendingInvitation: false, rowVersion: 1
    })
  })
})
