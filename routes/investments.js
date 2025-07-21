// 投资数据路由
const express = require('express');
const router = express.Router();
const { db } = require('../database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const checkExpired = require('../middleware/checkExpired');

// 获取投资数据（分页）- 需要登录，根据用户行业权限过滤
router.get('/', authenticateToken, checkExpired, (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = 20;
  const offset = (page - 1) * limit;
  const userIndustry = req.user.industry;

  // 调试信息：检查用户权限
  console.log('🔍 投资数据权限检查:');
  console.log('  - 用户ID:', req.user.id);
  console.log('  - 用户名:', req.user.username);
  console.log('  - 用户角色:', req.user.role);
  console.log('  - 用户行业:', req.user.industry);
  console.log('  - 是否为管理员:', req.user.role === 'admin');

  // 构建WHERE条件 - 支持多个行业
  let whereClause = '';
  let params = [];
  
  if (userIndustry && userIndustry !== 'all' && req.user.role !== 'admin') {
    // 处理多个行业：支持逗号分隔的行业列表
    const userIndustries = userIndustry.split(',').map(industry => industry.trim()).filter(Boolean);
    console.log('  🔍 用户拥有的行业权限:', userIndustries);
    
    if (userIndustries.length > 0) {
      // 构建IN查询条件
      const placeholders = userIndustries.map(() => '?').join(',');
      whereClause = `WHERE industry IN (${placeholders})`;
      params = userIndustries;
      console.log('  ✅ 应用多行业过滤:', userIndustries.join(', '));
    }
  } else {
    console.log('  ⚠️  无行业过滤 - 用户:', req.user.username, '行业:', userIndustry, '角色:', req.user.role);
  }

  // 获取总数
  const countQuery = `SELECT COUNT(*) AS total FROM investments ${whereClause}`;
  
  db.get(countQuery, params, (err, countRow) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    const total = countRow.total;
    const totalPages = Math.ceil(total / limit);

    // 获取数据
    const dataQuery = `SELECT * FROM investments ${whereClause} LIMIT ? OFFSET ?`;
    const dataParams = [...params, limit, offset];

    db.all(dataQuery, dataParams, (err, rows) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      res.json({
        data: rows,
        page,
        totalPages,
        total,
        userIndustry: userIndustry
      });
    });
  });
});

// 搜索投资数据（分页）- 需要登录，根据用户行业权限过滤
router.get('/search', authenticateToken, checkExpired, (req, res) => {
  const { query, page = 1 } = req.query;
  const limit = 20;
  const offset = (page - 1) * limit;
  const searchTerm = `%${query}%`;
  const userIndustry = req.user.industry;

  // 构建WHERE条件
  let whereConditions = ['company_name LIKE ? OR company_description LIKE ? OR industry LIKE ? OR investment_institution LIKE ?'];
  let params = [searchTerm, searchTerm, searchTerm, searchTerm];

  // 如果不是管理员且有特定行业权限，则添加行业过滤 - 支持多个行业
  if (userIndustry && userIndustry !== 'all' && req.user.role !== 'admin') {
    const userIndustries = userIndustry.split(',').map(industry => industry.trim()).filter(Boolean);
    if (userIndustries.length > 0) {
      const placeholders = userIndustries.map(() => '?').join(',');
      whereConditions.push(`industry IN (${placeholders})`);
      params.push(...userIndustries);
    }
  }

  const whereClause = `WHERE (${whereConditions[0]})${whereConditions.length > 1 ? ` AND ${whereConditions[1]}` : ''}`;

  const countQuery = `SELECT COUNT(*) AS total FROM investments ${whereClause}`;
  
  db.get(countQuery, params, (err, countRow) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    const total = countRow.total;
    const totalPages = Math.ceil(total / limit);

    const searchQuery = `SELECT * FROM investments ${whereClause} LIMIT ? OFFSET ?`;
    const searchParams = [...params, limit, offset];

    db.all(
      searchQuery,
      searchParams,
      (err, rows) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }

        res.json({
          data: rows,
          page: parseInt(page),
          totalPages,
          total,
          query
        });
      }
    );
  });
});

// 以下路由需要管理员权限
// 管理员添加投资数据
router.post('/', authenticateToken, requireAdmin, (req, res) => {
  const { company_name, company_description, funding_round, date, industry, investment_institution } = req.body;

  // 输入验证
  if (!company_name) {
    return res.status(400).json({ error: '公司名称是必填的' });
  }

  db.run(
    'INSERT INTO investments (company_name, company_description, funding_round, date, industry, investment_institution) VALUES (?, ?, ?, ?, ?, ?)',
    [company_name, company_description, funding_round, date, industry, investment_institution],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      res.status(201).json({ 
        message: '添加成功',
        id: this.lastID
      });
    }
  );
});

// 管理员更新投资数据
router.put('/:id', authenticateToken, requireAdmin, (req, res) => {
  const { id } = req.params;
  const { company_name, company_description, funding_round, date, industry, investment_institution } = req.body;

  // 输入验证
  if (!company_name) {
    return res.status(400).json({ error: '公司名称是必填的' });
  }

  db.run(
    'UPDATE investments SET company_name = ?, company_description = ?, funding_round = ?, date = ?, industry = ?, investment_institution = ? WHERE id = ?',
    [company_name, company_description, funding_round, date, industry, investment_institution, id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: '记录不存在' });
      }

      res.json({ message: '更新成功' });
    }
  );
});

// 管理员删除投资数据
router.delete('/:id', authenticateToken, requireAdmin, (req, res) => {
  const { id } = req.params;

  db.run('DELETE FROM investments WHERE id = ?', [id], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: '记录不存在' });
    }

    res.json({ message: '删除成功' });
  });
});

// 获取单个投资记录详情
router.get('/:id', (req, res) => {
  const { id } = req.params;

  db.get('SELECT * FROM investments WHERE id = ?', [id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (!row) {
      return res.status(404).json({ error: '记录不存在' });
    }

    res.json(row);
  });
});

module.exports = router;