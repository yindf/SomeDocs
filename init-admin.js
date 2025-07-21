// 初始化管理员账户和邮请码
const bcrypt = require('bcrypt');
const { db } = require('./database');

async function initializeAdmin() {
  console.log('开始初始化管理员账户和激活码...');

  try {
    // 检查是否已存在管理员账户
    const existingAdmin = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM users WHERE role = "admin"', (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (existingAdmin) {
      console.log('管理员账户已存在:', existingAdmin.username);
    } else {
      // 创建默认管理员账户
      const adminUsername = 'admin';
      const adminPassword = 'admin123';
      const adminEmail = 'admin@example.com';

      const hashedPassword = await bcrypt.hash(adminPassword, 10);

      await new Promise((resolve, reject) => {
        db.run(
          'INSERT INTO users (username, password, email, role, industry) VALUES (?, ?, ?, ?, ?)',
          [adminUsername, hashedPassword, adminEmail, 'admin', 'all'],
          function(err) {
            if (err) reject(err);
            else resolve(this.lastID);
          }
        );
      });

      console.log('管理员账户创建成功:');
      console.log('用户名:', adminUsername);
      console.log('密码:', adminPassword);
      console.log('邮箱:', adminEmail);
    }

    // 初始化行业激活码
    await initializeIndustryCodes();

  } catch (error) {
    console.error('初始化管理员账户错误:', error);
  }
}

// 初始化行业激活码
async function initializeIndustryCodes() {
  console.log('开始初始化行业激活码...');

  const industries = [
    '人工智能', '生物医药', '新能源', '电子商务', 'SaaS软件',
    '金融科技', '教育科技', '汽车交通', '企业服务', '消费品',
    '医疗健康', '文娱传媒', '房产服务', '物流供应链', '硬件制造'
  ];

  try {
    // 检查是否已有激活码
    const existingCodes = await new Promise((resolve, reject) => {
      db.get('SELECT COUNT(*) as count FROM invite_codes', (err, row) => {
        if (err) reject(err);
        else resolve(row.count);
      });
    });

    if (existingCodes > 0) {
      console.log(`已存在 ${existingCodes} 个激活码，跳过初始化`);
      return;
    }

    // 为每个行业生成3个激活码
    const promises = [];
    
    for (const industry of industries) {
      for (let i = 0; i < 3; i++) {
        const code = generateInviteCode();
        const promise = new Promise((resolve, reject) => {
          db.run(
            'INSERT INTO invite_codes (code, industry) VALUES (?, ?)',
            [code, industry],
            function(err) {
              if (err) reject(err);
              else resolve({ code, industry });
            }
          );
        });
        promises.push(promise);
      }
    }

    // 添加一些"all"权限的激活码（管理员用）
    for (let i = 0; i < 5; i++) {
      const code = generateInviteCode();
      const promise = new Promise((resolve, reject) => {
        db.run(
          'INSERT INTO invite_codes (code, industry) VALUES (?, ?)',
          [code, 'all'],
          function(err) {
            if (err) reject(err);
            else resolve({ code, industry: 'all' });
          }
        );
      });
      promises.push(promise);
    }

    const results = await Promise.all(promises);
    console.log(`成功创建 ${results.length} 个激活码`);

    // 按行业统计并显示
    const industryStats = {};
    results.forEach(({ industry }) => {
      industryStats[industry] = (industryStats[industry] || 0) + 1;
    });

    console.log('激活码统计:');
    Object.entries(industryStats).forEach(([industry, count]) => {
      console.log(`  ${industry}: ${count} 个激活码`);
    });

    // 显示一些示例激活码供测试
    console.log('\n测试用激活码示例:');
    const sampleCodes = results.slice(0, 10);
    sampleCodes.forEach(({ code, industry }) => {
      console.log(`  ${code} (${industry})`);
    });

  } catch (error) {
    console.error('初始化行业激活码错误:', error);
  }
}

// 生成随机激活码
function generateInviteCode(length = 8) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// 检查现有邀请码并生成新的
async function generateInviteCodes(count = 10) {
  console.log(`开始生成 ${count} 个邀请码...`);
  
  const promises = [];
  
  for (let i = 0; i < count; i++) {
    const code = Math.random().toString(36).substring(2, 10).toUpperCase();
    
    const promise = new Promise((resolve, reject) => {
      db.run('INSERT INTO invite_codes (code) VALUES (?)', [code], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(code);
        }
      });
    });
    
    promises.push(promise);
  }
  
  try {
    const codes = await Promise.all(promises);
    console.log('邀请码生成成功:');
    codes.forEach(code => console.log(`  ${code}`));
    return codes;
  } catch (error) {
    console.error('生成邀请码错误:', error);
    throw error;
  }
}

module.exports = {
  initializeAdmin,
  generateInviteCodes,
  initializeIndustryCodes
}; 