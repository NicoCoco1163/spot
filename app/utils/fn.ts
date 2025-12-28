export function getUserNickname(user: Partial<IUser> | null) {
  if (!user)
    return '匿名用户'
  return user?.nickname || `用户${user?.mobile?.slice?.(-4)}`
}

export function getUserRole(user: Partial<IUser> | null) {
  if (!user)
    return '普通用户'
  return user?.isAdmin ? '管理员' : '普通用户'
}
