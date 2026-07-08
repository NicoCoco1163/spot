export default defineEventHandler(async (event) => {
  await readBody(event)
  throw createError({
    statusCode: 403,
    message: '用户表仅用于管理员账号，已关闭公开注册',
  })
})
