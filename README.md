# 投资数据管理系统

一个基于 Node.js + SQLite 的前后端投资数据管理系统，支持用户注册登录、数据查询分页、管理员权限管理和自动备份等功能。

## 🚀 功能特性

### 核心功能
- ✅ **用户管理**: 用户注册、登录、权限控制
- ✅ **邀请码系统**: 注册需要邀请码，管理员可生成和管理邀请码
- ✅ **投资数据管理**: 数据导入、查询、分页显示（每页20条）
- ✅ **搜索功能**: 支持公司名称、行业、投资机构等多字段搜索
- ✅ **管理员权限**: 完整的管理后台，支持数据增删改查
- ✅ **数据备份**: 自动定期备份和手动备份功能
- ✅ **响应式设计**: 支持桌面和移动端访问

### 技术栈
- **后端**: Node.js + Express.js
- **数据库**: SQLite3
- **认证**: JWT + bcrypt 密码加密
- **前端**: 原生 HTML/CSS/JavaScript
- **任务调度**: node-cron
- **会话管理**: express-session

## 📋 系统要求

- Node.js >= 14.0.0
- npm >= 6.0.0
- 操作系统: Windows/Linux/macOS

## 🛠️ 安装部署

### 1. 克隆项目
```bash
git clone <repository-url>
cd MyWeb
```

### 2. 安装依赖
```bash
npm install
```

### 3. 初始化系统
```bash
# 初始化管理员账户和邀请码
npm run init

# 或者直接启动（会自动初始化）
npm start
```

### 4. 导入数据（可选）
如果有 `data.json` 文件需要导入：
```bash
npm run import
```

### 5. 访问系统
- 主页: http://localhost:3000
- 管理后台: http://localhost:3000/admin

## 🔧 脚本命令

```bash
npm start          # 启动生产服务器
npm run dev        # 启动开发服务器（需安装 nodemon）
npm run init       # 初始化管理员账户和邀请码
npm run import     # 手动导入 data.json 数据
npm run backup     # 手动执行数据库备份
```

## 👤 默认账户

系统首次启动会自动创建管理员账户：

```
用户名: admin
密码: admin123
角色: 管理员
```

**⚠️ 重要**: 请在首次登录后立即修改密码！

## 📊 数据库结构

### 用户表 (users)
```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 邀请码表 (invite_codes)
```sql
CREATE TABLE invite_codes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  is_used INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 投资数据表 (investments)
```sql
CREATE TABLE investments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_name TEXT,
  company_description TEXT,
  funding_round TEXT,
  date INTEGER,
  industry TEXT,
  investment_institution TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 🔐 API 接口

### 用户相关
- `POST /api/users/register` - 用户注册
- `POST /api/users/login` - 用户登录
- `GET /api/users/profile` - 获取用户信息

### 投资数据
- `GET /api/investments` - 获取投资数据（分页）
- `GET /api/investments/search` - 搜索投资数据
- `GET /api/investments/:id` - 获取单条投资数据
- `POST /api/investments` - 添加投资数据（管理员）
- `PUT /api/investments/:id` - 更新投资数据（管理员）
- `DELETE /api/investments/:id` - 删除投资数据（管理员）

### 管理员功能
- `GET /api/admin/statistics` - 系统统计信息
- `GET /api/admin/invite-codes` - 邀请码列表
- `POST /api/admin/invite-codes` - 生成邀请码
- `DELETE /api/admin/invite-codes/:id` - 删除邀请码
- `GET /api/admin/users` - 用户列表
- `POST /api/admin/backup` - 手动备份
- `GET /api/admin/backups` - 备份历史

### 系统状态
- `GET /api/status` - 系统状态
- `GET /health` - 健康检查
- `GET /api/import-data` - 导入数据

## 📁 项目结构

```
MyWeb/
├── public/                 # 静态文件目录
│   ├── index.html         # 主页
│   ├── admin.html         # 管理后台页面
│   ├── app.js             # 主页JavaScript
│   ├── admin.js           # 管理后台JavaScript
│   └── styles.css         # 样式文件
├── routes/                # 路由目录
│   ├── users.js           # 用户路由
│   ├── investments.js     # 投资数据路由
│   └── admin.js           # 管理员路由
├── middleware/            # 中间件目录
│   └── auth.js            # 认证中间件
├── backups/              # 备份目录（自动创建）
├── server.js             # 服务器入口文件
├── database.js           # 数据库配置
├── database.db           # SQLite数据库文件
├── importData.js         # 数据导入脚本
├── init-admin.js         # 管理员初始化脚本
├── scheduler.js          # 备份调度器
├── data.json             # 导入数据文件
└── package.json          # 项目配置
```

## 🔄 自动备份

系统支持自动定期备份：
- **每日备份**: 每天凌晨2:00自动备份
- **每周备份**: 每周日凌晨3:00执行深度备份
- **自动清理**: 保留最近30个备份文件
- **手动备份**: 支持管理员手动触发备份

备份文件存储在 `backups/` 目录中，格式为：`database-YYYY-MM-DDTHH-MM-SS-sssZ.db`

## 🔍 数据导入

### 支持的数据格式
系统支持从 `data.json` 文件导入投资数据，支持以下字段映射：

```json
[
  {
    "公司名称": "示例公司",
    "公司简介": "公司描述",
    "融资轮次": "A轮",
    "日期": "2023-01-01",
    "行业赛道": "科技",
    "投资机构": "某投资基金"
  }
]
```

也支持英文字段名：`company_name`, `company_description`, `funding_round`, `date`, `industry`, `investment_institution`

### 导入特性
- **批量处理**: 每批处理100条数据，避免内存溢出
- **错误处理**: 详细的错误日志和统计
- **编码支持**: 自动处理中文编码问题
- **重复检查**: 导入前检查是否已有数据

## 🛡️ 安全特性

- **密码加密**: 使用 bcrypt 加密存储密码
- **JWT认证**: 使用JWT管理用户会话
- **权限控制**: 基于角色的访问控制
- **输入验证**: 严格的输入参数验证
- **错误处理**: 完善的错误处理机制
- **会话管理**: 安全的会话配置

## 🐛 故障排除

### 常见问题

1. **端口占用**
   ```bash
   # Windows
   netstat -ano | findstr :3000
   # Linux/Mac
   lsof -i :3000
   ```

2. **数据库锁定**
   ```bash
   # 重启服务器
   npm start
   ```

3. **权限错误**
   ```bash
   # 检查文件权限
   ls -la database.db
   ```

4. **依赖安装失败**
   ```bash
   # 清除缓存重新安装
   npm cache clean --force
   npm install
   ```

### 日志查看
服务器运行时会在控制台输出详细日志，包括：
- 系统启动信息
- API请求日志
- 数据库操作日志
- 备份执行日志
- 错误信息

## 📈 性能优化

- **数据库索引**: 在常用查询字段上建立索引
- **分页查询**: 所有列表接口都支持分页
- **缓存机制**: 静态文件缓存
- **批量操作**: 大量数据采用批量处理
- **异步处理**: 耗时操作异步执行

## 🔮 未来规划

- [ ] 添加数据导出功能
- [ ] 支持更多文件格式导入（CSV, Excel）
- [ ] 添加数据可视化图表
- [ ] 实现用户角色管理
- [ ] 添加操作日志审计
- [ ] 支持多数据库部署
- [ ] 添加API接口限流
- [ ] 实现数据同步功能

## 📝 变更日志

### v1.0.0 (2024-01-01)
- 🎉 首次发布
- ✅ 完整的用户管理系统
- ✅ 投资数据管理功能
- ✅ 管理员后台界面
- ✅ 自动备份功能
- ✅ 数据导入导出

## 📞 技术支持

如果您在使用过程中遇到问题，请：

1. 查看控制台错误日志
2. 检查 `README.md` 故障排除部分
3. 确认系统要求和依赖安装
4. 提交 Issue 或联系开发团队

## 📄 开源协议

本项目采用 ISC 开源协议。详情请参见 [LICENSE](LICENSE) 文件。

---

**⭐ 如果这个项目对您有帮助，请给个星标支持！** 