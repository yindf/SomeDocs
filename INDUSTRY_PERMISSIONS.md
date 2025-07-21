# 行业权限管理系统

## 🎯 系统概述

投资数据管理系统现已支持基于行业的权限管理。用户在注册时使用特定行业的激活码，将只能查看该行业的投资数据。管理员拥有全部权限，可以查看所有行业数据。

## 📋 功能特性

### 用户权限
- **管理员用户**: 拥有 `all` 行业权限，可以查看所有行业的投资数据
- **普通用户**: 根据注册时使用的激活码，只能查看特定行业的投资数据

### 激活码管理
- **行业分类**: 激活码按行业分配，包括：
  - 人工智能、生物医药、新能源、电子商务、SaaS软件
  - 金融科技、教育科技、汽车交通、企业服务、消费品
  - 医疗健康、文娱传媒、房产服务、物流供应链、硬件制造
  - `all` (全行业权限，用于管理员账户)

### 数据过滤
- 投资数据查询和搜索会根据用户行业权限自动过滤
- 管理员可以查看所有数据
- 普通用户只能查看其权限范围内的数据

## 🚀 快速开始

### 1. 初始化系统
```bash
npm run init
```
这将创建：
- 管理员账户 (admin/admin123)
- 为每个行业生成3个激活码
- 5个全权限激活码

### 2. 查看激活码统计
```bash
npm run codes-stats
```

### 3. 列出可用激活码
```bash
npm run codes-list
```

### 4. 创建新的激活码
```bash
# 为人工智能行业创建5个激活码
npm run create-codes create 人工智能 5

# 为全行业权限创建3个激活码
npm run create-codes create all 3
```

## 🛠️ 管理命令

### 激活码管理工具
```bash
# 查看帮助
node create-codes.js

# 创建指定行业的激活码
node create-codes.js create <行业> [数量]

# 显示统计信息
node create-codes.js stats

# 列出激活码
node create-codes.js list [行业] [--all]
```

### 示例使用
```bash
# 为生物医药行业创建10个激活码
node create-codes.js create 生物医药 10

# 查看人工智能行业的激活码
node create-codes.js list 人工智能

# 查看所有激活码（包括已使用）
node create-codes.js list --all

# 查看系统统计
node create-codes.js stats
```

## 🎮 用户使用流程

### 注册新用户
1. 用户点击"注册"按钮
2. 填写用户名、密码、邮箱和**激活码**
3. 系统根据激活码自动分配行业权限
4. 注册成功后，用户将只能查看对应行业的数据

### 查看数据权限
- 登录后，用户信息会显示其行业权限
- 数据查询页面会自动过滤显示符合权限的数据
- 搜索功能也会在权限范围内进行

## 🔧 管理员功能

### Web管理后台
访问 `/admin.html` 进入管理后台，可以：

1. **系统统计**: 查看用户、激活码、投资数据的统计信息
2. **激活码管理**: 
   - 按行业查看激活码
   - 创建新的激活码
   - 删除未使用的激活码
3. **用户管理**:
   - 查看所有用户
   - 修改用户的行业权限
4. **行业管理**:
   - 查看可用行业列表
   - 基于实际数据的行业统计

### API接口
管理员专用接口：
- `GET /api/admin/stats` - 系统统计
- `GET /api/admin/invite-codes` - 激活码列表
- `POST /api/admin/invite-codes` - 创建激活码
- `DELETE /api/admin/invite-codes/:id` - 删除激活码
- `GET /api/admin/users` - 用户列表
- `PUT /api/admin/users/:id/industry` - 更新用户行业权限
- `GET /api/admin/industries` - 可用行业列表

## 📊 数据库结构

### 用户表 (users)
```sql
ALTER TABLE users ADD COLUMN industry TEXT DEFAULT 'all';
```

### 激活码表 (invite_codes)  
```sql
ALTER TABLE invite_codes ADD COLUMN industry TEXT DEFAULT 'all';
```

## 🔒 权限控制逻辑

### 数据查询权限
```javascript
// 普通用户：只能查看特定行业数据
WHERE industry = userIndustry

// 管理员：可以查看所有数据
// (不添加WHERE条件)
```

### 搜索权限
```javascript
// 在搜索条件基础上添加行业过滤
WHERE (搜索条件) AND industry = userIndustry
```

## 🎨 前端显示

用户登录后，页面会显示：
- 用户名
- 角色标签（管理员/普通用户）
- **行业权限标签**（新增）

样式示例：
```css
.industry-badge {
  background: linear-gradient(135deg, #7b1fa2, #9c27b0);
  color: white;
  padding: 4px 12px;
  border-radius: 15px;
  font-size: 0.8rem;
  font-weight: bold;
  margin-left: 8px;
}
```

## 🚨 注意事项

1. **现有数据兼容**: 系统会自动为现有激活码分配行业权限
2. **管理员权限**: 管理员始终拥有全部权限，不受行业限制
3. **激活码分配**: 建议为每个行业保持足够的可用激活码
4. **数据隔离**: 普通用户完全无法访问其他行业的数据

## 📈 使用建议

1. **定期检查**: 使用 `npm run codes-stats` 监控激活码使用情况
2. **批量创建**: 根据需求为各行业批量创建激活码
3. **用户管理**: 通过管理后台调整用户的行业权限
4. **数据分析**: 利用行业统计功能了解平台使用情况

---

**联系方式**: 如需更多技术支持，请联系系统管理员。 