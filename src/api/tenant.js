import { request } from '../utils/request'

export function listTenantMembers({ homeId }) {
  return request
    .get(`/api/v1/homes/${homeId}/members`)
    .then((items) => (Array.isArray(items) ? items.map(toMember) : []))
}

function toMember(dto = {}) {
  return {
    userId: dto.UserId,
    displayName: dto.DisplayName,
    avatarUrl: dto.AvatarUrl,
    role: dto.Role,
    status: dto.Status,
    joinedAt: dto.JoinedAt,
    timezone: dto.Timezone,
    locale: dto.Locale,
    isCurrentUserOwner: Boolean(dto.IsCurrentUserOwner),
    hasPendingInvitation: Boolean(dto.HasPendingInvitation),
    rowVersion: dto.RowVersion
  }
}
