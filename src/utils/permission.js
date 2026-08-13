const rolePermissions = {
  owner: ['*'],
  admin: ['*'],
  member: [
    'identity.read', 'smart_home.read', 'family.read', 'family.write',
    'steward.activity.read', 'confirmation.read', 'confirmation.write',
    'life.favorite.read', 'life.favorite.write', 'connector.read', 'connector.authorize',
    'automation.read', 'ai.read', 'ai.run', 'ai.skills.read', 'media.read', 'mindmap.read', 'expert.mine.write'
  ],
  viewer: [
    'identity.read', 'smart_home.read', 'family.read', 'steward.activity.read',
    'confirmation.read', 'life.favorite.read', 'connector.read', 'automation.read', 'ai.read', 'ai.skills.read'
  ]
}

export function hasPermission(role, permission) {
  if (!permission) return true
  const permissions = rolePermissions[role] || []
  return permissions.includes('*') || permissions.includes(permission)
}

export function hasAnyPermission(role, permissions) {
  return !permissions || permissions.some((permission) => hasPermission(role, permission))
}
