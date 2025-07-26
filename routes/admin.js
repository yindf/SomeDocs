// 管理后台路由
const express = require('express');
const router = express.Router();
const { db } = require('../database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const multer = require('multer');
const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');

// 配置multer用于文件上传
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/')
  },
  filename: function (req, file, cb) {
    // 生成唯一文件名：时间戳 + 原文件名
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'excel-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: function (req, file, cb) {
    // 只接受Excel文件
    const allowedTypes = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    if (allowedTypes.includes(file.mimetype) || file.originalname.match(/\.(xlsx|xls)$/)) {
      cb(null, true);
    } else {
      cb(new Error('只支持Excel文件格式(.xlsx, .xls)'), false);
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 限制文件大小为10MB
  }
});

// 生成随机邀请码
function generateInviteCode(length = 8) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// 获取系统统计信息
router.get('/stats', authenticateToken, requireAdmin, (req, res) => {
  Promise.all([
    // 用户统计
    new Promise((resolve, reject) => {
      db.all('SELECT role, industry, COUNT(*) as count FROM users GROUP BY role, industry', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    }),
    // 激活码统计
    new Promise((resolve, reject) => {
      db.all('SELECT industry, is_used, COUNT(*) as count FROM invite_codes GROUP BY industry, is_used', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    }),
    // 投资数据统计
    new Promise((resolve, reject) => {
      db.all('SELECT industry, COUNT(*) as count FROM investments GROUP BY industry ORDER BY count DESC', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    }),
    // 总数统计
    new Promise((resolve, reject) => {
      db.get('SELECT COUNT(*) as total FROM investments', (err, row) => {
        if (err) reject(err);
        else resolve(row.total);
      });
    })
  ]).then(([userStats, inviteStats, industryStats, totalInvestments]) => {
    res.json({
      userStats,
      inviteStats,
      industryStats,
      totalInvestments
    });
  }).catch(err => {
    res.status(500).json({ error: err.message });
  });
});

// 获取所有激活码
router.get('/invite-codes', authenticateToken, requireAdmin, (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = 20;
  const offset = (page - 1) * limit;
  const industry = req.query.industry;

  let whereClause = '';
  let params = [];
  
  if (industry && industry !== 'all') {
    whereClause = 'WHERE industry = ?';
    params = [industry];
  }

  // 获取总数
  console.log('🔍 激活码查询调试信息:');
  console.log('  - whereClause:', whereClause);
  console.log('  - params:', params);
  console.log('  - page:', page, 'limit:', limit, 'offset:', offset);
  
  db.get(`SELECT COUNT(*) as total FROM invite_codes ${whereClause}`, params, (err, countRow) => {
    if (err) {
      console.error('❌ 获取激活码总数失败:', err);
      return res.status(500).json({ error: err.message });
    }

    const total = countRow.total;
    const totalPages = Math.ceil(total / limit);

    // 获取激活码列表，包含使用者信息
    const query = `
      SELECT ic.*, u.username as used_by_username 
      FROM invite_codes ic 
      LEFT JOIN users u ON ic.used_by = u.id 
      ${whereClause} 
      ORDER BY ic.created_at DESC 
      LIMIT ? OFFSET ?
    `;
    console.log('🔍 激活码详细查询:');
    console.log('  - query:', query);
    console.log('  - params:', [...params, limit, offset]);
    
    db.all(query, [...params, limit, offset], (err, rows) => {
      if (err) {
        console.error('❌ 获取激活码列表失败:', err);
        return res.status(500).json({ error: err.message });
      }
      
      console.log('✅ 成功获取激活码列表:', rows?.length, '条记录');

      res.json({
        data: rows,
        page,
        totalPages,
        total
      });
    });
  });
});

// 创建激活码
router.post('/invite-codes', authenticateToken, requireAdmin, (req, res) => {
  const { industry, count = 1, validity_months = 12 } = req.body;

  if (!industry) {
    return res.status(400).json({ error: '请选择行业' });
  }

  if (![6, 12].includes(parseInt(validity_months))) {
    return res.status(400).json({ error: '有效期只能是6个月或12个月' });
  }

  const codes = [];
  const promises = [];

  // 生成指定数量的激活码
  for (let i = 0; i < count; i++) {
    const code = generateInviteCode();
    codes.push(code);

    const promise = new Promise((resolve, reject) => {
      db.run('INSERT INTO invite_codes (code, industry, validity_months) VALUES (?, ?, ?)', [code, industry, validity_months], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id: this.lastID, code, industry });
        }
      });
    });
    promises.push(promise);
  }

  Promise.all(promises)
    .then(results => {
      res.json({
        message: `成功创建 ${count} 个${industry}行业的激活码`,
        codes: results
      });
    })
    .catch(err => {
      res.status(500).json({ error: `创建激活码失败: ${err.message}` });
    });
});

// 删除激活码
router.delete('/invite-codes/:id', authenticateToken, requireAdmin, (req, res) => {
  const { id } = req.params;

  // 检查激活码是否已被使用
  db.get('SELECT * FROM invite_codes WHERE id = ?', [id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (!row) {
      return res.status(404).json({ error: '激活码不存在' });
    }

    if (row.is_used) {
      return res.status(400).json({ error: '已使用的激活码无法删除' });
    }

    // 删除激活码
    db.run('DELETE FROM invite_codes WHERE id = ?', [id], function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      res.json({ message: '激活码删除成功' });
    });
  });
});

// 获取所有用户
router.get('/users', authenticateToken, requireAdmin, (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = 20;
  const offset = (page - 1) * limit;

  db.get('SELECT COUNT(*) as total FROM users', (err, countRow) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    const total = countRow.total;
    const totalPages = Math.ceil(total / limit);

    db.all(`
      SELECT 
        id, username, email, role, industry, created_at, expire_date,
        CASE 
          WHEN expire_date IS NULL THEN NULL
          WHEN date(expire_date) > date('now') THEN 
            CAST((julianday(expire_date) - julianday('now')) AS INTEGER)
          ELSE -1
        END as days_remaining
      FROM users 
      ORDER BY created_at DESC 
      LIMIT ? OFFSET ?
    `, [limit, offset], (err, rows) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      // 处理结果，添加状态信息
      const processedRows = rows.map(user => ({
        ...user,
        status: user.expire_date ? (
          user.days_remaining > 0 ? '正常' : 
          user.days_remaining === 0 ? '今日到期' : '已过期'
        ) : '永久',
        expire_date_formatted: user.expire_date ? 
          new Date(user.expire_date).toLocaleDateString('zh-CN') : '永久'
      }));

      res.json({
        data: processedRows,
        page,
        totalPages,
        total
      });
    });
  });
});

// 更新用户行业权限（支持多个行业）
router.put('/users/:id/industry', authenticateToken, requireAdmin, (req, res) => {
  const { id } = req.params;
  const { industry, industries } = req.body;

  // 支持新的多行业格式 或 兼容旧的单行业格式
  let finalIndustries;
  if (industries && Array.isArray(industries)) {
    // 新格式：数组形式的多个行业
    finalIndustries = industries.filter(Boolean).join(',');
  } else if (industry) {
    // 兼容旧格式：单个行业字符串
    finalIndustries = industry;
  } else {
    return res.status(400).json({ error: '请选择行业' });
  }

  console.log(`🔧 管理员更新用户 ${id} 的行业权限:`, finalIndustries);

  db.run('UPDATE users SET industry = ? WHERE id = ?', [finalIndustries, id], function(err) {
    if (err) {
      console.error('更新用户行业失败:', err);
      return res.status(500).json({ error: err.message });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: '用户不存在' });
    }

    console.log(`✅ 用户 ${id} 行业权限更新成功:`, finalIndustries);
    res.json({ 
      message: '用户行业权限更新成功',
      industries: finalIndustries.split(',').map(s => s.trim()).filter(Boolean)
    });
  });
});

// 更新用户过期时间
router.put('/users/:id/expire', authenticateToken, requireAdmin, (req, res) => {
  const { id } = req.params;
  const { months } = req.body;

  if (![6, 12].includes(parseInt(months))) {
    return res.status(400).json({ error: '有效期只能是6个月或12个月' });
  }

  // 从当前时间开始计算新的过期时间
  const expireDate = new Date();
  expireDate.setMonth(expireDate.getMonth() + parseInt(months));

  db.run('UPDATE users SET expire_date = ? WHERE id = ?', [expireDate.toISOString(), id], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: '用户不存在' });
    }

    res.json({ 
      message: '用户使用时限更新成功',
      expire_date: expireDate.toISOString(),
      expire_date_formatted: expireDate.toLocaleDateString('zh-CN')
    });
  });
});

// 更新邀请码信息
router.put('/invite-codes/:id', authenticateToken, requireAdmin, (req, res) => {
  const { id } = req.params;
  const { industry, validity_months } = req.body;

  if (!industry) {
    return res.status(400).json({ error: '请选择行业' });
  }

  if (validity_months && ![6, 12].includes(parseInt(validity_months))) {
    return res.status(400).json({ error: '有效期只能是6个月或12个月' });
  }

  // 检查激活码是否已被使用
  db.get('SELECT is_used FROM invite_codes WHERE id = ?', [id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (!row) {
      return res.status(404).json({ error: '激活码不存在' });
    }

    if (row.is_used) {
      return res.status(400).json({ error: '已使用的激活码不能修改' });
    }

    // 更新激活码信息
    const updates = ['industry = ?'];
    const params = [industry];

    if (validity_months) {
      updates.push('validity_months = ?');
      params.push(parseInt(validity_months));
    }

    params.push(id);

    db.run(`UPDATE invite_codes SET ${updates.join(', ')} WHERE id = ?`, params, function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      res.json({ message: '激活码信息更新成功' });
    });
  });
});

// 获取可用行业列表
router.get('/industries', authenticateToken, requireAdmin, (req, res) => {
  db.all('SELECT DISTINCT industry FROM investments WHERE industry IS NOT NULL AND industry != "" ORDER BY industry', (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    const industries = rows.map(row => row.industry);
    
    // 添加一些预设的行业选项
    const predefinedIndustries = [
      '人工智能', '生物医药', '新能源', '电子商务', 'SaaS软件',
      '金融科技', '教育科技', '汽车交通', '企业服务', '消费品',
      '医疗健康', '文娱传媒', '房产服务', '物流供应链', '硬件制造'
    ];

    // 合并并去重
    const allIndustries = Array.from(new Set([...predefinedIndustries, ...industries]));
    
    res.json(allIndustries);
  });
});

// 数据库备份功能保持不变
router.post('/backup', authenticateToken, requireAdmin, (req, res) => {
  const backupName = `backup_${new Date().toISOString().replace(/[:.]/g, '-')}.db`;
  const backupPath = path.join(__dirname, '..', 'backups', backupName);
  
  // 确保备份目录存在
  const backupDir = path.dirname(backupPath);
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  // 复制数据库文件
  const sourcePath = path.join(__dirname, '..', 'database.db');
  
  try {
    fs.copyFileSync(sourcePath, backupPath);
    res.json({ 
      message: '备份创建成功', 
      backupName,
      backupPath: backupPath 
    });
  } catch (error) {
    res.status(500).json({ 
      error: `备份创建失败: ${error.message}` 
    });
  }
});

// 获取备份列表
router.get('/backups', authenticateToken, requireAdmin, (req, res) => {
  const backupDir = path.join(__dirname, '..', 'backups');
  
  if (!fs.existsSync(backupDir)) {
    return res.json({ backups: [] });
  }

  try {
    const files = fs.readdirSync(backupDir)
      .filter(file => file.endsWith('.db'))
      .map(file => {
        const filePath = path.join(backupDir, file);
        const stats = fs.statSync(filePath);
        return {
          name: file,
          size: stats.size,
          created: stats.birthtime,
          modified: stats.mtime
        };
      })
      .sort((a, b) => b.created - a.created);

    res.json({ backups: files });
  } catch (error) {
    res.status(500).json({ 
      error: `获取备份列表失败: ${error.message}` 
    });
  }
});

// Excel导入投资数据
router.post('/import/investments', authenticateToken, requireAdmin, upload.single('excelFile'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: '请选择Excel文件' });
  }

  const filePath = req.file.path;
  console.log('📁 开始处理Excel文件:', req.file.originalname);

  try {
    // 读取Excel文件
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    const worksheet = workbook.worksheets[0]; // 读取第一个工作表
    
    // 将工作表转换为JSON数据
    const rawData = [];
    const headerRow = worksheet.getRow(1);
    const headers = [];
    
    // 获取表头
    headerRow.eachCell((cell, colNumber) => {
      headers[colNumber] = cell.value;
    });
    
    // 读取数据行
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // 跳过表头
      
      const rowData = {};
      row.eachCell((cell, colNumber) => {
        if (headers[colNumber]) {
          rowData[headers[colNumber]] = cell.value;
        }
      });
      
      // 只添加非空行
      if (Object.keys(rowData).length > 0) {
        rawData.push(rowData);
      }
    });
    
    console.log(`📊 Excel文件包含 ${rawData.length} 行数据`);

    if (rawData.length === 0) {
      // 删除临时文件
      fs.unlinkSync(filePath);
      return res.status(400).json({ error: 'Excel文件为空' });
    }

    // 验证和处理数据
    const validData = [];
    const errors = [];
    
    rawData.forEach((row, index) => {
      const rowIndex = index + 2; // Excel行号(从2开始，因为第1行是标题)
      
      // 必需字段验证
      if (!row['公司名称'] && !row['company_name'] && !row['Company Name'] && !row['企业名称']) {
        errors.push(`第${rowIndex}行: 缺少公司名称`);
        return;
      }

      // 调试：输出第一行的所有字段名
      if (index === 0) {
        console.log('📋 Excel字段列表:', Object.keys(row));
      }

      // 标准化字段名 - 匹配数据库实际字段
      const investmentData = {
        company_name: row['公司名称'] || row['company_name'] || row['Company Name'] || row['企业名称'] || '',
        company_description: row['公司简介'] || row['description'] || row['Description'] || row['公司介绍'] || '',
        industry: row['行业赛道'] || row['行业'] || row['industry'] || row['Industry'] || row['行业领域'] || '其他',
        funding_round: row['融资轮次'] || row['轮次'] || row['round'] || row['Round'] || '',
        investment_institution: row['投资机构'] || row['投资方'] || row['investors'] || row['Investors'] || '',
        date: row['日期'] || row['投资日期'] || row['date'] || row['Date'] || '',
        // 这些字段在当前数据库表中不存在，暂时注释掉
        // amount: row['金额'] || row['amount'] || row['Amount'] || row['融资金额'] || '',
        // currency: row['货币'] || row['currency'] || row['Currency'] || 'CNY',
        // valuation: row['估值'] || row['valuation'] || row['Valuation'] || '',
        // location: row['地区'] || row['location'] || row['Location'] || row['所在地'] || ''
      };

      // 调试：输出前3行的字段映射情况
      if (index < 3) {
        console.log(`📝 第${rowIndex}行数据映射:`, {
          原始行业字段: {
            '行业赛道': row['行业赛道'],
            '行业': row['行业'],
            'industry': row['industry'],
            'Industry': row['Industry'],
            '行业领域': row['行业领域']
          },
          最终行业值: investmentData.industry,
          原始融资轮次字段: {
            '融资轮次': row['融资轮次'],
            '轮次': row['轮次'],
            'round': row['round'],
            'Round': row['Round']
          },
          最终轮次值: investmentData.funding_round,
          原始日期字段: {
            '日期': row['日期'],
            '投资日期': row['投资日期'],
            'date': row['date'],
            'Date': row['Date']
          },
          原始日期值: investmentData.date,
          日期类型: typeof investmentData.date
        });
      }

      // 数据清理和格式化
      investmentData.company_name = String(investmentData.company_name).trim();
      investmentData.industry = String(investmentData.industry || '其他').trim();
      
      // 确保行业字段不为空
      if (!investmentData.industry || investmentData.industry === 'undefined' || investmentData.industry === 'null') {
        investmentData.industry = '其他';
      }
      
      // 处理金额格式
      if (investmentData.amount) {
        investmentData.amount = String(investmentData.amount).replace(/[^\d.万千百亿KMBT]/g, '');
      }

      // 处理日期格式
      if (investmentData.date) {
        try {
          let parsedDate;
          
          // 检查是否是Excel序列号格式（数字）
          if (typeof investmentData.date === 'number') {
            // Excel日期序列号转换（从1900-01-01开始计算）
            const excelEpoch = new Date(1900, 0, 1);
            parsedDate = new Date(excelEpoch.getTime() + (investmentData.date - 2) * 24 * 60 * 60 * 1000);
          } else {
            // 尝试解析字符串格式的日期
            const dateStr = String(investmentData.date).trim();
            
            // 处理常见的日期格式
            if (dateStr.includes('/')) {
              // 格式如 2025/7/21 或 2025/07/21
              const parts = dateStr.split('/');
              if (parts.length === 3) {
                const year = parseInt(parts[0]);
                const month = parseInt(parts[1]) - 1; // 月份从0开始
                const day = parseInt(parts[2]);
                parsedDate = new Date(year, month, day);
              }
            } else if (dateStr.includes('-')) {
              // 格式如 2025-07-21
              parsedDate = new Date(dateStr);
            } else {
              // 其他格式尝试直接解析
              parsedDate = new Date(dateStr);
            }
          }
          
          // 验证日期有效性并格式化
          if (parsedDate && !isNaN(parsedDate.getTime())) {
            // 确保日期在合理范围内（1990-2050）
            const year = parsedDate.getFullYear();
            if (year >= 1990 && year <= 2050) {
              investmentData.date = parsedDate.toISOString().split('T')[0];
            } else {
              console.warn(`第${rowIndex}行日期年份超出范围 (${year}):`, investmentData.date);
              investmentData.date = '';
            }
          } else {
            console.warn(`第${rowIndex}行日期格式无法识别:`, investmentData.date);
            investmentData.date = '';
          }
        } catch (e) {
          console.warn(`第${rowIndex}行日期解析错误:`, investmentData.date, e.message);
          investmentData.date = '';
        }
      }

      validData.push(investmentData);
    });

    console.log(`✅ 有效数据: ${validData.length} 条`);
    console.log(`❌ 错误数据: ${errors.length} 条`);

    if (validData.length === 0) {
      // 删除临时文件
      fs.unlinkSync(filePath);
      return res.status(400).json({ 
        error: '没有有效数据可导入',
        details: errors
      });
    }

    // 批量插入数据库 - 使用正确的异步事务处理
    let successCount = 0;
    let duplicateCount = 0;
    const insertErrors = [];

    console.log('🚀 开始批量插入数据...');

    // 使用异步处理来避免事务冲突
    async function processData() {
      return new Promise((resolve, reject) => {
        db.run('BEGIN TRANSACTION', (beginErr) => {
          if (beginErr) {
            console.error('❌ 开始事务失败:', beginErr);
            return reject(beginErr);
          }

          let processedCount = 0;
          const totalCount = validData.length;

          if (totalCount === 0) {
            db.run('COMMIT');
            return resolve();
          }

          validData.forEach((data, index) => {
            // 检查重复数据
            db.get(
              'SELECT id FROM investments WHERE company_name = ? AND funding_round = ?',
              [data.company_name, data.funding_round],
              (selectErr, row) => {
                if (selectErr) {
                  console.error(`检查重复数据失败 (${index + 1}):`, selectErr);
                  insertErrors.push(`第${index + 1}条数据检查失败: ${selectErr.message}`);
                                 } else if (row && req.body.skipDuplicates === 'true') {
                  // 跳过重复数据
                  duplicateCount++;
                  console.log(`⏭️ 跳过重复数据: ${data.company_name} - ${data.funding_round}`);
                } else {
                  // 插入新数据
                  db.run(`
                    INSERT INTO investments (
                      company_name, company_description, funding_round, 
                      date, industry, investment_institution
                    ) VALUES (?, ?, ?, ?, ?, ?)
                  `, [
                    data.company_name, data.company_description, data.funding_round,
                    data.date, data.industry, data.investment_institution
                  ], function(insertErr) {
                    if (insertErr) {
                      console.error(`插入数据失败 (${index + 1}):`, insertErr);
                      insertErrors.push(`第${index + 1}条数据插入失败: ${insertErr.message}`);
                    } else {
                      successCount++;
                      if (successCount % 100 === 0) {
                        console.log(`✅ 已处理 ${successCount} 条数据...`);
                      }
                    }
                  });
                }

                processedCount++;
                
                // 所有数据处理完成
                if (processedCount === totalCount) {
                  // 短暂延迟确保所有数据库操作完成
                  setTimeout(() => {
                    if (insertErrors.length > 0) {
                      console.error('❌ 发现错误，回滚事务');
                      db.run('ROLLBACK', (rollbackErr) => {
                        if (rollbackErr) {
                          console.error('回滚失败:', rollbackErr);
                        }
                        reject(new Error(`数据导入失败: ${insertErrors.slice(0, 5).join(', ')}${insertErrors.length > 5 ? '...' : ''}`));
                      });
                    } else {
                      console.log('✅ 提交事务');
                      db.run('COMMIT', (commitErr) => {
                        if (commitErr) {
                          console.error('提交事务失败:', commitErr);
                          reject(commitErr);
                        } else {
                          resolve();
                        }
                      });
                    }
                  }, 200);
                }
              }
            );
          });
        });
      });
    }

    // 执行数据处理
    try {
      await processData();
      
      console.log('✅ 数据导入成功完成');
      
      // 删除临时文件
      fs.unlinkSync(filePath);
      
      res.json({
        message: '数据导入成功',
        total: rawData.length,
        imported: successCount,
        skipped: duplicateCount,
        failed: errors.length,
        statistics: {
          totalRows: rawData.length,
          validData: validData.length,
          successCount: successCount,
          duplicateCount: duplicateCount,
          errorCount: errors.length
        },
        errors: errors.length > 0 ? errors.slice(0, 10) : undefined // 只返回前10个错误
      });
      
    } catch (processError) {
      console.error('❌ 数据处理失败:', processError);
      
      // 删除临时文件
      try {
        fs.unlinkSync(filePath);
      } catch (e) {
        console.error('删除临时文件失败:', e);
      }
      
      res.status(500).json({
        error: '数据导入失败',
        message: processError.message,
        details: insertErrors.slice(0, 10) // 只返回前10个详细错误
      });
    }

  } catch (error) {
    console.error('❌ Excel文件处理失败:', error);
    
    // 删除临时文件
    try {
      fs.unlinkSync(filePath);
    } catch (e) {
      console.error('临时文件删除失败:', e);
    }

    res.status(500).json({ 
      error: `Excel文件处理失败: ${error.message}` 
    });
  }
});

// Excel导入用户数据
router.post('/import/users', authenticateToken, requireAdmin, upload.single('excelFile'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: '请选择Excel文件' });
  }

  const filePath = req.file.path;
  console.log('📁 开始处理用户Excel文件:', req.file.originalname);

  try {
    // 读取Excel文件
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    const worksheet = workbook.worksheets[0];
    
    // 将工作表转换为JSON数据
    const rawData = [];
    const headerRow = worksheet.getRow(1);
    const headers = [];
    
    // 获取表头
    headerRow.eachCell((cell, colNumber) => {
      headers[colNumber] = cell.value;
    });
    
    // 读取数据行
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // 跳过表头
      
      const rowData = {};
      row.eachCell((cell, colNumber) => {
        if (headers[colNumber]) {
          rowData[headers[colNumber]] = cell.value;
        }
      });
      
      // 只添加非空行
      if (Object.keys(rowData).length > 0) {
        rawData.push(rowData);
      }
    });

    console.log(`📊 Excel文件包含 ${rawData.length} 行用户数据`);

    if (rawData.length === 0) {
      fs.unlinkSync(filePath);
      return res.status(400).json({ error: 'Excel文件为空' });
    }

    const validData = [];
    const errors = [];

    rawData.forEach((row, index) => {
      const rowIndex = index + 2;
      
      // 必需字段验证
      if (!row['用户名'] && !row['username'] && !row['Username']) {
        errors.push(`第${rowIndex}行: 缺少用户名`);
        return;
      }

      if (!row['邮箱'] && !row['email'] && !row['Email']) {
        errors.push(`第${rowIndex}行: 缺少邮箱`);
        return;
      }

      const userData = {
        username: row['用户名'] || row['username'] || row['Username'] || '',
        email: row['邮箱'] || row['email'] || row['Email'] || '',
        password: row['密码'] || row['password'] || row['Password'] || 'admin123', // 默认密码
        industry: row['行业权限'] || row['industry'] || row['Industry'] || '企业服务',
        role: (row['角色'] || row['role'] || row['Role'] || 'user').toLowerCase(),
        expire_date: row['过期时间'] || row['expire_date'] || row['Expire Date'] || null
      };

      // 数据验证和清理
      userData.username = String(userData.username).trim();
      userData.email = String(userData.email).trim().toLowerCase();
      
      // 验证邮箱格式
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(userData.email)) {
        errors.push(`第${rowIndex}行: 邮箱格式不正确`);
        return;
      }

      // 验证角色
      if (!['user', 'admin'].includes(userData.role)) {
        userData.role = 'user';
      }

      validData.push(userData);
    });

    if (validData.length === 0) {
      fs.unlinkSync(filePath);
      return res.status(400).json({ 
        error: '没有有效用户数据可导入',
        details: errors
      });
    }

    res.json({
      message: '用户数据导入功能开发中',
      preview: {
        totalRows: rawData.length,
        validData: validData.length,
        sampleData: validData.slice(0, 3), // 预览前3条数据
        errors: errors
      }
    });

    // 删除临时文件
    fs.unlinkSync(filePath);

  } catch (error) {
    console.error('❌ 用户Excel文件处理失败:', error);
    
    try {
      fs.unlinkSync(filePath);
    } catch (e) {
      console.error('临时文件删除失败:', e);
    }

    res.status(500).json({ 
      error: `Excel文件处理失败: ${error.message}` 
    });
  }
});

// 下载Excel模板
router.get('/download/template/:type', authenticateToken, requireAdmin, async (req, res) => {
  const { type } = req.params;
  
  try {
    let templateData;
    let filename;

    if (type === 'investments') {
      // 投资数据模板 - 仅包含数据库中实际存在的字段
      templateData = [
        {
          '公司名称': '示例科技有限公司',
          '公司简介': '专注于企业级SaaS服务',
          '融资轮次': 'A轮',
          '日期': '2025/1/15',
          '行业赛道': '企业服务',
          '投资机构': '某某资本'
        }
      ];
      filename = 'investment_template.xlsx';
    } else if (type === 'users') {
      // 用户数据模板
      templateData = [
        {
          '用户名': 'testuser',
          '邮箱': 'test@example.com',
          '密码': 'admin123',
          '行业权限': '企业服务',
          '角色': 'user',
          '过期时间': '2025-12-31'
        }
      ];
      filename = 'user_template.xlsx';
    } else {
      return res.status(400).json({ error: '不支持的模板类型' });
    }

    // 创建工作簿和工作表
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('数据模板');
    
    // 获取列标题
    const headers = Object.keys(templateData[0]);
    
    // 添加表头
    worksheet.addRow(headers);
    
    // 添加示例数据
    templateData.forEach(data => {
      const row = headers.map(header => data[header]);
      worksheet.addRow(row);
    });
    
    // 设置列宽和样式
    worksheet.columns = headers.map(header => ({
      header: header,
      key: header,
      width: 20
    }));
    
    // 设置表头样式
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    // 生成Excel文件
    const buffer = await workbook.xlsx.writeBuffer();

    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`
    });

    res.send(buffer);

  } catch (error) {
    console.error('❌ 模板生成失败:', error);
    res.status(500).json({ error: `模板生成失败: ${error.message}` });
  }
});

// 清空所有投资数据 - 危险操作，需要多重确认
router.delete('/clear-all-data', authenticateToken, requireAdmin, (req, res) => {
  const { confirmToken } = req.body;
  
  // 简单的确认令牌验证
  if (confirmToken !== 'CLEAR_ALL_INVESTMENT_DATA_CONFIRMED') {
    return res.status(400).json({ error: '确认令牌无效' });
  }

  console.log('⚠️ 管理员请求清空所有投资数据:', req.user.username);

  // 开始事务
  db.run('BEGIN TRANSACTION', (beginErr) => {
    if (beginErr) {
      console.error('❌ 开始事务失败:', beginErr);
      return res.status(500).json({ error: '操作失败' });
    }

    // 删除所有投资数据
    db.run('DELETE FROM investments', (deleteErr) => {
      if (deleteErr) {
        console.error('❌ 删除投资数据失败:', deleteErr);
        db.run('ROLLBACK');
        return res.status(500).json({ error: '清空数据失败' });
      }

      // 重置自增ID
      db.run('DELETE FROM sqlite_sequence WHERE name="investments"', (resetErr) => {
        if (resetErr) {
          console.warn('⚠️  重置自增ID失败，但数据已清空:', resetErr);
        }

        // 提交事务
        db.run('COMMIT', (commitErr) => {
          if (commitErr) {
            console.error('❌ 提交事务失败:', commitErr);
            db.run('ROLLBACK');
            return res.status(500).json({ error: '操作失败' });
          }

          console.log('✅ 所有投资数据已被管理员清空:', req.user.username);
          
          res.json({ 
            message: '所有投资数据已清空',
            timestamp: new Date().toISOString(),
            operator: req.user.username
          });
        });
      });
    });
  });
});

module.exports = router;