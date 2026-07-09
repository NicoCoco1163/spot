import process from 'node:process'
import { createInterface } from 'node:readline/promises'
import { stdin as input, stdout as output } from 'node:process'
import { Database } from 'bun:sqlite'
import { config } from 'dotenv'
import { isMainlandMobile, normalizeMobile } from '../app/utils/mobile'

config()

const DEFAULT_PASSWORD = 'admin123'
const databaseUrl = process.env.DATABASE_URL || 'sqlite.db'

type Args = {
  name?: string
  mobile?: string
  password?: string
  yes?: boolean
}

type UserRow = {
  id: number
  mobile: string | null
  nickname: string | null
  is_admin: number | boolean | null
}

function parseArgs(argv: string[]) {
  const args: Args = {}

  for (let i = 0; i < argv.length; i++) {
    const item = argv[i]
    if (item === '--yes' || item === '-y') {
      args.yes = true
      continue
    }

    const equalIndex = item.indexOf('=')
    const key = equalIndex > -1 ? item.slice(0, equalIndex) : item
    const inlineValue = equalIndex > -1 ? item.slice(equalIndex + 1) : undefined

    if (key === '--name' || key === '-n') {
      args.name = inlineValue ?? argv[++i]
    }
    else if (key === '--mobile' || key === '-m') {
      args.mobile = inlineValue ?? argv[++i]
    }
    else if (key === '--password' || key === '-p') {
      args.password = inlineValue ?? argv[++i]
    }
    else if (key === '--help' || key === '-h') {
      printHelp()
      process.exit(0)
    }
    else {
      fail(`未知参数：${item}`)
    }
  }

  return args
}

function printHelp() {
  console.log(`添加或更新管理员账号

用法：
  bun run add:admin
  bun run add:admin -- --name 张三 --mobile 13800138000
  bun run add:admin -- --name 张三 --mobile 13800138000 --password admin123 --yes

参数：
  -n, --name       管理员姓名
  -m, --mobile     中国大陆手机号
  -p, --password   登录密码，留空默认 ${DEFAULT_PASSWORD}
  -y, --yes        手机号已存在时直接更新，不再询问

环境变量：
  DATABASE_URL     SQLite 数据库路径，默认 sqlite.db
`)
}

function fail(message: string): never {
  console.error(`[add-admin] ${message}`)
  process.exit(1)
}

async function questionRequired(rl: ReturnType<typeof createInterface>, label: string, value?: string) {
  const initial = value?.trim()
  if (initial)
    return initial

  while (true) {
    const answer = (await rl.question(`${label}：`)).trim()
    if (answer)
      return answer
    console.log(`${label}不能为空`)
  }
}

async function questionWithDefault(
  rl: ReturnType<typeof createInterface>,
  label: string,
  defaultValue: string,
  value?: string,
  useDefaultWithoutPrompt = false,
) {
  if (value !== undefined)
    return value.trim() || defaultValue
  if (useDefaultWithoutPrompt)
    return defaultValue

  const answer = (await rl.question(`${label}（默认 ${defaultValue}）：`)).trim()
  return answer || defaultValue
}

async function confirmUpdate(rl: ReturnType<typeof createInterface>, args: Args, existing: UserRow) {
  if (args.yes)
    return true

  const role = existing.is_admin ? '管理员' : '普通用户'
  const answer = (await rl.question(`手机号已存在（${existing.nickname || '未命名'}，${role}），是否更新为管理员并重置密码？输入 yes 确认：`)).trim()
  return answer === 'yes'
}

function ensureUsersTable(sqlite: Database) {
  const table = sqlite
    .query<{ name: string }, []>("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'users'")
    .get()

  if (!table) {
    fail(`数据库未初始化或缺少 users 表：${databaseUrl}。请先执行 bun run db:migrate`)
  }
}

const args = parseArgs(process.argv.slice(2))
const rl = createInterface({ input, output })

try {
  const name = await questionRequired(rl, '管理员姓名', args.name)
  const mobile = normalizeMobile(await questionRequired(rl, '手机号', args.mobile))

  if (!isMainlandMobile(mobile)) {
    fail('手机号格式无效，请输入中国大陆 11 位手机号')
  }

  const password = await questionWithDefault(rl, '密码', DEFAULT_PASSWORD, args.password, args.yes)

  const sqlite = new Database(databaseUrl, {
    create: true,
    readwrite: true,
  })

  sqlite.exec('PRAGMA foreign_keys = ON')
  ensureUsersTable(sqlite)

  const existing = sqlite
    .query<UserRow, [string]>('SELECT id, mobile, nickname, is_admin FROM users WHERE mobile = ?')
    .get(mobile)

  if (existing) {
    const shouldUpdate = await confirmUpdate(rl, args, existing)
    if (!shouldUpdate) {
      console.log('[add-admin] 已取消，未修改数据库')
      process.exit(0)
    }
  }

  const passwordHash = await Bun.password.hash(password, {
    algorithm: 'argon2id',
  })
  const now = Date.now()

  if (existing) {
    sqlite
      .query('UPDATE users SET nickname = ?, password = ?, is_admin = 1, updated_at = ? WHERE id = ?')
      .run(name, passwordHash, now, existing.id)
    console.log(`[add-admin] 管理员已更新：${name} / ${mobile}`)
  }
  else {
    const result = sqlite
      .query('INSERT INTO users (mobile, nickname, password, is_admin, created_at, updated_at) VALUES (?, ?, ?, 1, ?, ?)')
      .run(mobile, name, passwordHash, now, now)
    console.log(`[add-admin] 管理员已创建：${name} / ${mobile}，id=${result.lastInsertRowid}`)
  }

  console.log(`[add-admin] 数据库：${databaseUrl}`)
}
finally {
  rl.close()
}
