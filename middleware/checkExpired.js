// 检查用户是否过期的中间件
const { db } = require('../database');

function checkExpired(req, res, next) {
  // 管理员不需要检查过期时间
  if (req.user && req.user.role === 'admin') {
    return next();
  }

  // 检查用户是否过期
  if (req.user && req.user.id) {
    db.get('SELECT expire_date FROM users WHERE id = ?', [req.user.id], (err, row) => {
      if (err) {
        console.error('检查用户过期状态错误:', err);
        return res.status(500).json({ error: '服务器内部错误' });
      }

      if (!row) {
        return res.status(404).json({ error: '用户不存在' });
      }

      // 如果没有过期时间，则为永久用户
      if (!row.expire_date) {
        return next();
      }

      // 检查是否过期
      const expireDate = new Date(row.expire_date);
      const now = new Date();

      if (expireDate <= now) {
        return res.status(403).json({ 
          error: '账户已过期，请联系管理员续期',
          code: 'ACCOUNT_EXPIRED',
          expireDate: row.expire_date
        });
      }

      // 如果7天内过期，添加警告信息
      const daysRemaining = Math.ceil((expireDate - now) / (1000 * 60 * 60 * 24));
      if (daysRemaining <= 7) {
        res.locals.expireWarning = {
          daysRemaining,
          expireDate: row.expire_date
        };
      }

      next();
    });
  } else {
    next();
  }
}

module.exports = checkExpired; 