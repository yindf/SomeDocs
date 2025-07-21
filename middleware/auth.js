// 身份验证中间件
const jwt = require('jsonwebtoken');
const { db } = require('../database');

// JWT密钥 (在生产环境中应该使用环境变量)
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Token认证中间件（增强版：从数据库实时获取最新用户信息）
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  console.log('🔐 JWT Token验证:');
  console.log('  - Authorization头:', authHeader);
  console.log('  - Token存在:', !!token);

  if (!token) {
    return res.sendStatus(401);
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      console.log('❌ Token验证失败:', err.message);
      return res.sendStatus(403);
    }

    console.log('✅ Token验证成功，解码用户信息:', decoded);

    // 🔍 关键修复：从数据库实时获取最新用户信息
    db.get('SELECT id, username, role, industry, expire_date FROM users WHERE id = ?', [decoded.id], (dbErr, user) => {
      if (dbErr) {
        console.log('❌ 数据库查询用户信息失败:', dbErr.message);
        return res.sendStatus(500);
      }

      if (!user) {
        console.log('❌ 用户不存在:', decoded.id);
        return res.sendStatus(403);
      }

      console.log('🔍 从数据库获取的最新用户信息:');
      console.log('  - ID:', user.id);
      console.log('  - 用户名:', user.username);
      console.log('  - 角色:', user.role);
      console.log('  - 行业权限:', user.industry);
      console.log('  - 过期时间:', user.expire_date);

      // 使用数据库中的最新信息，而不是token中的旧信息
      req.user = {
        id: user.id,
        username: user.username,
        role: user.role,
        industry: user.industry,
        expire_date: user.expire_date,
        // 保留token的时间戳信息
        iat: decoded.iat,
        exp: decoded.exp
      };

      next();
    });
  });
};

// 管理员权限检查中间件
const requireAdmin = (req, res, next) => {
  console.log('🔍 管理员权限检查:');
  console.log('  - 用户信息存在:', !!req.user);
  console.log('  - 用户信息:', req.user);
  console.log('  - 用户角色:', req.user?.role);
  console.log('  - 角色类型:', typeof req.user?.role);
  console.log('  - 角色比较结果:', req.user?.role === 'admin');

  if (!req.user || req.user.role !== 'admin') {
    console.log('❌ 管理员权限验证失败');
    return res.status(403).json({ error: '需要管理员权限' });
  }

  console.log('✅ 管理员权限验证通过');
  next();
};

// 生成JWT Token
function generateToken(user) {
  return jwt.sign(
    { 
      id: user.id, 
      username: user.username, 
      role: user.role 
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
}

// 验证用户凭据并返回用户信息
function verifyUser(username, callback) {
  db.get('SELECT id, username, role FROM users WHERE username = ?', [username], callback);
}

module.exports = {
  authenticateToken,
  requireAdmin,
  generateToken,
  verifyUser,
  JWT_SECRET
}; 