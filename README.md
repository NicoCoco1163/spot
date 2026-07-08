# Spot

活动报名与抢位系统，基于 Nuxt、Drizzle ORM 和 SQLite。

## 本地开发

```bash
pnpm install
pnpm dev
```

本地默认数据库文件为项目根目录下的 `sqlite.db`。

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

## 首次线上部署

以下示例假设代码部署在 `/opt/spot`，数据库放在 `/var/lib/spot/sqlite.db`。

```bash
cd /opt/spot
pnpm install

mkdir -p /var/lib/spot
export DATABASE_URL=/var/lib/spot/sqlite.db

pnpm exec drizzle-kit migrate
pnpm build
node .output/server/index.mjs
```

建议线上用 systemd、PM2 或容器托管进程。无论使用哪种方式，都要确保运行应用时带上同一个 `DATABASE_URL`。

systemd 环境变量示例：

```ini
Environment=DATABASE_URL=/var/lib/spot/sqlite.db
Environment=NODE_ENV=production
```

## 线上更新代码与数据库

每次发布包含数据库迁移的版本时，按这个顺序执行：

```bash
cd /opt/spot

# 1. 拉取或上传新代码
git pull

# 2. 安装依赖，确保 drizzle-kit 可用
pnpm install

# 3. 备份线上数据库
mkdir -p /var/backups/spot
cp /var/lib/spot/sqlite.db "/var/backups/spot/sqlite-$(date +%Y%m%d-%H%M%S).db"

# 4. 对线上数据库执行迁移
export DATABASE_URL=/var/lib/spot/sqlite.db
pnpm exec drizzle-kit migrate

# 5. 构建并重启应用
pnpm build
```

迁移完成后再重启线上服务，例如：

```bash
systemctl restart spot
```

如果本次更新不包含数据库迁移，仍然可以执行 `pnpm exec drizzle-kit migrate`；Drizzle 会跳过已执行过的迁移。

## 迁移检查

发布前建议在本地执行：

```bash
pnpm exec drizzle-kit check
pnpm build
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
- 如果只安装生产依赖，`drizzle-kit` 可能不可用；迁移阶段需要完整安装依赖，或单独提供迁移环境。
