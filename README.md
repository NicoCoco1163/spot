# Spot

活动报名与抢位系统，基于 Nuxt、Drizzle ORM、Bun 和 SQLite。

## 本地开发

```bash
bun install
bun run dev
```

本地默认数据库文件为项目根目录下的 `sqlite.db`。

## 打包部署源码

如果线上不使用 Git 拉取代码，可以先在本地生成一个干净的源码 zip：

```bash
bun run package:clean
```

默认输出到 `dist/spot-source-时间戳.zip`。压缩包会包含 Git 已跟踪文件，以及未被 `.gitignore` 忽略的未跟踪文件；会排除 `.git`、`node_modules`、`.output`、`.nuxt`、`.env`、`sqlite.db` 等 `.gitignore` 命中的内容。

指定输出路径：

```bash
bun run package:clean -- --output /tmp/spot-source.zip
```

预览将被打包的文件：

```bash
DRY_RUN=1 bun run package:clean
```

## 数据库说明

项目使用 SQLite，数据库连接位置由 `DATABASE_URL` 控制：

```bash
DATABASE_URL=/var/lib/spot/sqlite.db
```

如果不设置 `DATABASE_URL`，应用和 Drizzle 迁移都会使用项目根目录的 `./sqlite.db`。

数据库结构由以下文件控制：

- `server/database/schema.ts`：Drizzle schema
- `server/database/migrations/`：已生成的 SQL 迁移
- `server/database/migrations/meta/_journal.json`：迁移记录

不要在线上直接手改表结构。需要改结构时，在代码里更新 schema，生成/补充迁移文件，提交后在线上执行迁移。

## 一键部署

项目提供了一键部署脚本，适合首次部署和后续更新复用。脚本会按顺序完成依赖安装、迁移检查、数据库目录准备、已有数据库备份、迁移/初始化、生产构建、PM2 启动或 reload。

```bash
cd /opt/spot
DATABASE_URL=/var/lib/spot/sqlite.db PORT=8066 bun run deploy
```

首次部署时，如果 `DATABASE_URL` 指向的数据库文件不存在，脚本会先创建数据库目录，再通过 `bun run db:migrate` 初始化表结构。后续更新时，如果数据库已存在，脚本会先备份到 `BACKUP_DIR`，再执行迁移。

常用参数：

- `APP_NAME=spot`：PM2 应用名称，默认 `spot`。
- `PORT=8066`：应用监听端口，默认 `8066`。
- `DATABASE_URL=/home/suijiwudao/sqlite.db`：线上 SQLite 文件路径。
- `BACKUP_DIR=/var/backups/spot`：数据库备份目录，默认是数据库同级目录下的 `backups`。
- `DRY_RUN=1`：只打印将要执行的步骤，不实际安装、迁移、构建或重启。
- `SKIP_INSTALL=1`：跳过 `bun install`。
- `SKIP_DB_CHECK=1`：跳过 `bun run db:check`。

预演示例：

```bash
DRY_RUN=1 DATABASE_URL=/var/lib/spot/sqlite.db PORT=8066 bun run deploy
```

脚本依赖线上已经安装 `bun` 和 `pm2`。PM2 配置见 `ecosystem.config.cjs`，它会使用 `bun` 作为 interpreter，避免用 Node 运行时加载 `bun:sqlite` 时报错。

## 手工部署

以下示例假设代码部署在 `/opt/spot`，数据库放在 `/var/lib/spot/sqlite.db`。线上需要安装 Bun，并使用 Bun 作为开发、构建和运行时。

```bash
cd /opt/spot
bun install

mkdir -p /var/lib/spot
export DATABASE_URL=/var/lib/spot/sqlite.db

bun run db:migrate
bun run build
bun .output/server/index.mjs
```

建议线上用 PM2 或 systemd 托管进程。无论使用哪种方式，都要确保运行应用时带上同一个 `DATABASE_URL`。

PM2 示例见 `ecosystem.config.cjs`，它会使用 `bun` 作为 interpreter：

```bash
pm2 start ecosystem.config.cjs
```

systemd 环境变量示例：

```ini
Environment=DATABASE_URL=/var/lib/spot/sqlite.db
Environment=NODE_ENV=production
```

## 手工更新代码与数据库

每次发布包含数据库迁移的版本时，按这个顺序执行：

```bash
cd /opt/spot

# 1. 拉取或上传新代码
git pull

# 2. 安装依赖，确保 drizzle-kit 可用
bun install

# 3. 备份线上数据库
mkdir -p /var/backups/spot
cp /var/lib/spot/sqlite.db "/var/backups/spot/sqlite-$(date +%Y%m%d-%H%M%S).db"

# 4. 对线上数据库执行迁移
export DATABASE_URL=/var/lib/spot/sqlite.db
bun run db:migrate

# 5. 构建并重启应用
bun run build
```

迁移完成后再重启线上服务，例如：

```bash
pm2 restart spot
```

如果本次更新不包含数据库迁移，仍然可以执行 `bun run db:migrate`；Drizzle 会跳过已执行过的迁移。

## 迁移检查

发布前建议在本地执行：

```bash
bun run db:check
bun run build
```

线上迁移后可以检查表结构，例如：

```bash
sqlite3 /var/lib/spot/sqlite.db ".tables"
sqlite3 /var/lib/spot/sqlite.db "PRAGMA foreign_key_check;"
```

`PRAGMA foreign_key_check;` 没有输出表示没有外键违规。

## 重要注意事项

- `sqlite.db` 是数据文件，不提交到 Git。
- 线上数据库路径必须稳定，推荐放在 `/var/lib/spot/sqlite.db` 这类持久化目录。
- 构建产物 `.output` 不等于数据库备份；发布前必须单独备份 SQLite 文件。
- 运行迁移和运行应用必须指向同一个 `DATABASE_URL`。
- 项目运行时使用 Bun 内置 `bun:sqlite` 和 `Bun.password`，不要重新引入 `better-sqlite3` 或 `argon2`。
- 数据库迁移使用 `bun run db:migrate`，不要使用 `drizzle-kit migrate`；当前 Drizzle Kit 的 SQLite 迁移 CLI 仍会要求安装 `better-sqlite3` 或 `@libsql/client`。
- 如果只安装生产依赖，`drizzle-kit` 可能不可用；发布前的 `bun run db:check` 需要完整安装依赖，或单独提供检查环境。
