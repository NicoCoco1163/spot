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

declare module '*.vue' {
  import type { DefineComponent } from 'vue'

  const component: DefineComponent<object, object, any>
  export default component
}
