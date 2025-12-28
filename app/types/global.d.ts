interface IUser {
  id: number
  openid: string | null
  mobile: string | null
  nickname: string | null
  password: string | null
  isAdmin: boolean | null
  createdAt: Date | null
  updatedAt: Date | null
}
