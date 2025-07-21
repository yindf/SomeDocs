// 数据库操作文件
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

// 数据库路径
const dbPath = path.join(__dirname, 'database.db');

// 检查数据库是否存在
const dbExists = fs.existsSync(dbPath);

// 创建数据库连接
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('数据库连接错误:', err.message);
  } else {
    console.log('成功连接到SQLite数据库');
    // 如果数据库不存在，则初始化
    if (!dbExists) {
      initializeDatabase();
    } else {
      // 检查并更新数据库结构
      updateDatabaseSchema();
    }
  }
});

// 检查并更新数据库结构
function updateDatabaseSchema() {
  console.log('检查数据库结构更新...');
  
  // 检查用户表是否有 industry 和 expire_date 字段
  db.all("PRAGMA table_info(users)", (err, columns) => {
    if (err) {
      console.error('获取用户表列信息错误:', err.message);
      return;
    }
    
    const hasIndustryColumn = columns.some(col => col.name === 'industry');
    const hasExpireDateColumn = columns.some(col => col.name === 'expire_date');
    
    if (!hasIndustryColumn) {
      console.log('为用户表添加 industry 字段...');
      db.run("ALTER TABLE users ADD COLUMN industry TEXT DEFAULT 'all'", (err) => {
        if (err) {
          console.error('添加用户表 industry 字段错误:', err.message);
        } else {
          console.log('用户表 industry 字段添加成功');
        }
      });
    }
    
    if (!hasExpireDateColumn) {
      console.log('为用户表添加 expire_date 字段...');
      db.run("ALTER TABLE users ADD COLUMN expire_date TEXT", (err) => {
        if (err) {
          console.error('添加用户表 expire_date 字段错误:', err.message);
        } else {
          console.log('用户表 expire_date 字段添加成功');
        }
      });
    }
  });
  
  // 检查激活码表是否有 industry 和 validity_months 字段
  db.all("PRAGMA table_info(invite_codes)", (err, columns) => {
    if (err) {
      console.error('获取激活码表列信息错误:', err.message);
      return;
    }
    
    const hasIndustryColumn = columns.some(col => col.name === 'industry');
    const hasValidityColumn = columns.some(col => col.name === 'validity_months');
    
    if (!hasIndustryColumn) {
      console.log('为激活码表添加 industry 字段...');
      db.run("ALTER TABLE invite_codes ADD COLUMN industry TEXT DEFAULT 'all'", (err) => {
        if (err) {
          console.error('添加激活码表 industry 字段错误:', err.message);
        } else {
          console.log('激活码表 industry 字段添加成功');
          // 更新现有激活码为默认行业
          updateExistingInviteCodes();
        }
      });
    }
    
    if (!hasValidityColumn) {
      console.log('为激活码表添加 validity_months 字段...');
      db.run("ALTER TABLE invite_codes ADD COLUMN validity_months INTEGER DEFAULT 12", (err) => {
        if (err) {
          console.error('添加激活码表 validity_months 字段错误:', err.message);
        } else {
          console.log('激活码表 validity_months 字段添加成功');
        }
      });
    }
  });
}

// 更新现有激活码为不同行业
function updateExistingInviteCodes() {
  console.log('更新现有激活码的行业分配...');
  
  // 定义行业列表
  const industries = [
    '人工智能', '生物医药', '新能源', '电子商务', 'SaaS软件',
    '金融科技', '教育科技', '汽车交通', '企业服务', '消费品',
    '医疗健康', '文娱传媒', '房产服务', '物流供应链', '硬件制造'
  ];
  
  // 获取所有未分配行业的激活码
  db.all("SELECT id, code FROM invite_codes WHERE industry = 'all' OR industry IS NULL", (err, codes) => {
    if (err) {
      console.error('获取激活码错误:', err.message);
      return;
    }
    
    if (codes.length > 0) {
      console.log(`正在更新 ${codes.length} 个激活码的行业分配...`);
      
      codes.forEach((code, index) => {
        // 随机分配行业，确保每个行业都有激活码
        const industry = industries[index % industries.length];
        
        db.run("UPDATE invite_codes SET industry = ? WHERE id = ?", [industry, code.id], (err) => {
          if (err) {
            console.error(`更新激活码 ${code.code} 的行业错误:`, err.message);
          } else {
            console.log(`激活码 ${code.code} 已分配到行业: ${industry}`);
          }
        });
      });
    }
  });
}

// 初始化数据库
function initializeDatabase() {
  console.log('初始化新数据库...');
  // 创建用户表（包含 industry 字段）
  db.run(`
    CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      role TEXT DEFAULT 'user',
      industry TEXT DEFAULT 'all',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) {
      console.error('创建用户表错误:', err.message);
    } else {
      console.log('用户表创建成功');
      // 创建邀请码表
      createInviteCodesTable();
    }
  });
}

// 创建邀请码表（包含 industry 字段）
function createInviteCodesTable() {
  db.run(`
    CREATE TABLE invite_codes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL UNIQUE,
      industry TEXT DEFAULT 'all',
      is_used INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) {
      console.error('创建邀请码表错误:', err.message);
    } else {
      console.log('邀请码表创建成功');
      // 创建投资数据表
      createInvestmentTable();
    }
  });
}

// 创建投资数据表
function createInvestmentTable() {
  db.run(`
    CREATE TABLE investments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_name TEXT,
      company_description TEXT,
      funding_round TEXT,
      date INTEGER,
      industry TEXT,
      investment_institution TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) {
      console.error('创建投资数据表错误:', err.message);
    } else {
      console.log('投资数据表创建成功');
    }
  });
}

// 获取所有可用的行业列表
function getAvailableIndustries() {
  return new Promise((resolve, reject) => {
    db.all("SELECT DISTINCT industry FROM investments WHERE industry IS NOT NULL AND industry != '' ORDER BY industry", (err, rows) => {
      if (err) {
        reject(err);
      } else {
        const industries = rows.map(row => row.industry);
        resolve(industries);
      }
    });
  });
}

// 导出数据库连接和工具函数
module.exports = {
  db,
  getAvailableIndustries
};