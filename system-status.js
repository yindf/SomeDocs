// 系统状态检查脚本
const { db } = require('./database');
const fs = require('fs');
const path = require('path');

async function checkSystemStatus() {
  console.log('🏥 系统健康检查\n');
  console.log('='.repeat(50));

  try {
    // 检查数据库连接
    await checkDatabaseConnection();
    
    // 检查数据库结构
    await checkDatabaseStructure();
    
    // 检查系统统计
    await checkSystemStats();
    
    // 检查用户过期状态
    await checkUserExpiry();
    
    // 检查激活码状态
    await checkInviteCodeStatus();
    
    // 检查文件系统
    checkFileSystem();
    
    console.log('\n' + '='.repeat(50));
    console.log('✅ 系统状态检查完成\n');
    
  } catch (error) {
    console.error('❌ 系统检查失败:', error.message);
  } finally {
    db.close();
  }
}

// 检查数据库连接
async function checkDatabaseConnection() {
  console.log('📊 数据库连接状态');
  
  try {
    await new Promise((resolve, reject) => {
      db.get('SELECT 1 as test', (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
    console.log('   ✅ 数据库连接正常');
  } catch (error) {
    console.log('   ❌ 数据库连接失败:', error.message);
    throw error;
  }
}

// 检查数据库结构
async function checkDatabaseStructure() {
  console.log('\n🏗️  数据库结构检查');
  
  const requiredTables = [
    { name: 'users', requiredColumns: ['id', 'username', 'password', 'email', 'role', 'industry', 'expire_date'] },
    { name: 'invite_codes', requiredColumns: ['id', 'code', 'is_used', 'industry', 'validity_months'] },
    { name: 'investments', requiredColumns: ['id', 'company_name', 'industry'] }
  ];

  for (const table of requiredTables) {
    try {
      const columns = await new Promise((resolve, reject) => {
        db.all(`PRAGMA table_info(${table.name})`, (err, rows) => {
          if (err) reject(err);
          else resolve(rows.map(row => row.name));
        });
      });

      const missingColumns = table.requiredColumns.filter(col => !columns.includes(col));
      
      if (missingColumns.length === 0) {
        console.log(`   ✅ 表 ${table.name} 结构完整`);
      } else {
        console.log(`   ⚠️  表 ${table.name} 缺少字段: ${missingColumns.join(', ')}`);
      }
    } catch (error) {
      console.log(`   ❌ 表 ${table.name} 检查失败:`, error.message);
    }
  }
}

// 检查系统统计
async function checkSystemStats() {
  console.log('\n📈 系统数据统计');
  
  try {
    // 用户统计
    const userStats = await new Promise((resolve, reject) => {
      db.all(`
        SELECT role, COUNT(*) as count 
        FROM users 
        GROUP BY role
      `, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    console.log('   👥 用户统计:');
    userStats.forEach(stat => {
      const roleName = stat.role === 'admin' ? '管理员' : '普通用户';
      console.log(`      ${roleName}: ${stat.count} 人`);
    });

    // 激活码统计
    const inviteStats = await new Promise((resolve, reject) => {
      db.all(`
        SELECT is_used, COUNT(*) as count 
        FROM invite_codes 
        GROUP BY is_used
      `, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    console.log('   🎫 激活码统计:');
    inviteStats.forEach(stat => {
      const status = stat.is_used ? '已使用' : '未使用';
      console.log(`      ${status}: ${stat.count} 个`);
    });

    // 投资数据统计
    const investmentCount = await new Promise((resolve, reject) => {
      db.get('SELECT COUNT(*) as count FROM investments', (err, row) => {
        if (err) reject(err);
        else resolve(row.count);
      });
    });

    console.log(`   💰 投资数据: ${investmentCount} 条`);

    // 行业分布统计
    const industryStats = await new Promise((resolve, reject) => {
      db.all(`
        SELECT industry, COUNT(*) as count 
        FROM investments 
        WHERE industry IS NOT NULL 
        GROUP BY industry 
        ORDER BY count DESC 
        LIMIT 5
      `, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    if (industryStats.length > 0) {
      console.log('   🏢 热门行业 (Top 5):');
      industryStats.forEach(stat => {
        console.log(`      ${stat.industry}: ${stat.count} 条`);
      });
    }

  } catch (error) {
    console.log('   ❌ 统计数据获取失败:', error.message);
  }
}

// 检查用户过期状态
async function checkUserExpiry() {
  console.log('\n⏰ 用户过期状态检查');
  
  try {
    const users = await new Promise((resolve, reject) => {
      db.all(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN expire_date IS NULL THEN 1 ELSE 0 END) as permanent,
          SUM(CASE WHEN expire_date IS NOT NULL AND date(expire_date) > date('now') THEN 1 ELSE 0 END) as active,
          SUM(CASE WHEN expire_date IS NOT NULL AND date(expire_date) <= date('now') THEN 1 ELSE 0 END) as expired,
          SUM(CASE WHEN expire_date IS NOT NULL AND date(expire_date) > date('now') AND CAST((julianday(expire_date) - julianday('now')) AS INTEGER) <= 7 THEN 1 ELSE 0 END) as expiring_soon
        FROM users 
        WHERE role != 'admin'
      `, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    console.log(`   👥 总用户数: ${users.total}`);
    console.log(`   🔓 永久用户: ${users.permanent}`);
    console.log(`   ✅ 正常用户: ${users.active}`);
    console.log(`   ⚠️  即将过期 (7天内): ${users.expiring_soon}`);
    console.log(`   ❌ 已过期用户: ${users.expired}`);

    if (users.expired > 0) {
      console.log('   🚨 建议清理已过期用户或为其续期');
    }

    if (users.expiring_soon > 0) {
      console.log('   📧 建议通知即将过期的用户');
    }

  } catch (error) {
    console.log('   ❌ 用户过期状态检查失败:', error.message);
  }
}

// 检查激活码状态
async function checkInviteCodeStatus() {
  console.log('\n🎫 激活码状态分析');
  
  try {
    const codeStats = await new Promise((resolve, reject) => {
      db.all(`
        SELECT 
          industry,
          validity_months,
          COUNT(*) as total,
          SUM(CASE WHEN is_used = 0 THEN 1 ELSE 0 END) as available
        FROM invite_codes 
        GROUP BY industry, validity_months 
        ORDER BY industry, validity_months
      `, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    if (codeStats.length > 0) {
      console.log('   📋 激活码详细分布:');
      codeStats.forEach(stat => {
        const industryName = stat.industry === 'all' ? '全部行业' : stat.industry;
        const availableRate = ((stat.available / stat.total) * 100).toFixed(1);
        console.log(`      ${industryName} (${stat.validity_months}个月): ${stat.available}/${stat.total} 可用 (${availableRate}%)`);
        
        if (stat.available === 0) {
          console.log(`        ⚠️  ${industryName} 激活码已用完，建议生成新的`);
        } else if (stat.available < 3) {
          console.log(`        📢 ${industryName} 激活码不足，建议及时补充`);
        }
      });
    }

  } catch (error) {
    console.log('   ❌ 激活码状态检查失败:', error.message);
  }
}

// 检查文件系统
function checkFileSystem() {
  console.log('\n📁 文件系统检查');
  
  const requiredFiles = [
    'database.db',
    'server.js',
    'database.js',
    'package.json',
    'public/index.html',
    'public/admin.html',
    'public/app.js',
    'public/styles.css',
    'routes/users.js',
    'routes/investments.js',
    'routes/admin.js',
    'middleware/auth.js',
    'middleware/checkExpired.js'
  ];

  const requiredDirectories = [
    'public',
    'routes',
    'middleware'
  ];

  console.log('   📄 核心文件:');
  requiredFiles.forEach(file => {
    if (fs.existsSync(file)) {
      const stats = fs.statSync(file);
      console.log(`      ✅ ${file} (${(stats.size / 1024).toFixed(1)} KB)`);
    } else {
      console.log(`      ❌ ${file} 文件缺失`);
    }
  });

  console.log('   📁 核心目录:');
  requiredDirectories.forEach(dir => {
    if (fs.existsSync(dir) && fs.statSync(dir).isDirectory()) {
      console.log(`      ✅ ${dir}/`);
    } else {
      console.log(`      ❌ ${dir}/ 目录缺失`);
    }
  });

  // 检查备份目录
  const backupDir = 'backups';
  if (fs.existsSync(backupDir)) {
    const backups = fs.readdirSync(backupDir).filter(file => file.endsWith('.db'));
    console.log(`   💾 备份文件: ${backups.length} 个`);
    if (backups.length > 0) {
      const latestBackup = backups[backups.length - 1];
      console.log(`      最新备份: ${latestBackup}`);
    }
  } else {
    console.log('   📂 备份目录不存在，系统将自动创建');
  }
}

// 运行检查
if (require.main === module) {
  checkSystemStatus().catch(console.error);
}

module.exports = { checkSystemStatus }; 