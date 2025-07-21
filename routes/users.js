// 用户路由
const express = require('express');
const router = express.Router();
const { db } = require('../database');
const bcrypt = require('bcrypt');
const { generateToken } = require('../middleware/auth');

// 用户注册
router.post('/register', (req, res) => {
  const { username, password, email, inviteCode } = req.body;

  // 输入验证
  if (!username || !password || !email || !inviteCode) {
    return res.status(400).json({ error: '所有字段都是必填的' });
  }

  // 检查邀请码
  db.get('SELECT * FROM invite_codes WHERE code = ? AND is_used = 0', [inviteCode], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (!row) {
      return res.status(400).json({ error: '无效的邀请码' });
    }

    // 检查用户名和邮箱是否已存在
    db.get('SELECT * FROM users WHERE username = ? OR email = ?', [username, email], (err, existingUser) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      if (existingUser) {
        return res.status(400).json({ error: '用户名或邮箱已存在' });
      }

      // 加密密码
      bcrypt.hash(password, 10, (err, hash) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }

        // 计算用户过期时间
        const expireDate = new Date();
        const validityMonths = row.validity_months || 12; // 默认12个月
        expireDate.setMonth(expireDate.getMonth() + validityMonths);
        
        // 插入用户，继承激活码的行业权限和过期时间
        // 普通用户不能拥有 'all' 权限，如果激活码industry为空，注册失败
        if (!row.industry || row.industry === 'all') {
          return res.status(400).json({ error: '无效的邀请码：缺少行业权限信息' });
        }
        
        db.run(
          'INSERT INTO users (username, password, email, industry, expire_date) VALUES (?, ?, ?, ?, ?)',
          [username, hash, email, row.industry, expireDate.toISOString()],
          function(err) {
            if (err) {
              return res.status(500).json({ error: err.message });
            }

            // 标记邀请码为已使用
            db.run('UPDATE invite_codes SET is_used = 1 WHERE code = ?', [inviteCode], (err) => {
              if (err) {
                console.error('更新邮请码错误:', err.message);
              }
            });

            res.status(201).json({ 
              message: '注册成功',
              industry: row.industry,
              expireDate: expireDate.toISOString(),
              validityMonths
            });
          }
        );
      });
    });
  });
});

// 用户登录
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: '用户名和密码都是必填的' });
  }

  db.get('SELECT * FROM users WHERE username = ?', [username], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (!row) {
      return res.status(400).json({ error: '用户名或密码错误' });
    }

    // 验证密码
    bcrypt.compare(password, row.password, (err, result) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      if (!result) {
        return res.status(400).json({ error: '用户名或密码错误' });
      }

      // 生成JWT token
      const token = generateToken(row);

      // 计算剩余天数
      let daysRemaining = null;
      let expireWarning = null;
      
      if (row.expire_date) {
        const expireDate = new Date(row.expire_date);
        const now = new Date();
        daysRemaining = Math.ceil((expireDate - now) / (1000 * 60 * 60 * 24));
        
        if (daysRemaining <= 7 && daysRemaining > 0) {
          expireWarning = {
            daysRemaining,
            expireDate: row.expire_date,
            message: `您的账户将在 ${daysRemaining} 天后过期，请联系管理员续期`
          };
        } else if (daysRemaining <= 0) {
          return res.status(403).json({ 
            error: '账户已过期，请联系管理员续期',
            code: 'ACCOUNT_EXPIRED'
          });
        }
      }

      res.json({ 
        message: '登录成功', 
        role: row.role,
        token: token,
        user: {
          id: row.id,
          username: row.username,
          role: row.role,
          industry: row.industry || 'all',
          expireDate: row.expire_date,
          daysRemaining,
          expireWarning
        }
      });
    });
  });
});

// 获取用户信息 (需要token)
router.get('/profile', (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: '未提供访问令牌' });
  }

  // 这里可以添加token验证逻辑
  res.json({ message: '获取用户信息功能待完善' });
});

module.exports = router;