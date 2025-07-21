// 创建激活码脚本
const { db } = require('./database');

// 生成随机激活码
function generateInviteCode(length = 8) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// 可用行业列表
const INDUSTRIES = [
  '人工智能', '生物医药', '新能源', '电子商务', 'SaaS软件',
  '金融科技', '教育科技', '汽车交通', '企业服务', '消费品',
  '医疗健康', '文娱传媒', '房产服务', '物流供应链', '硬件制造',
  'all' // 全行业权限
];

async function createCodes(industry, count = 5, validity_months = 12) {
  console.log(`正在为行业 "${industry}" 创建 ${count} 个激活码 (有效期: ${validity_months}个月)...`);

  if (!INDUSTRIES.includes(industry)) {
    console.error(`无效的行业选择。可用行业: ${INDUSTRIES.join(', ')}`);
    return;
  }

  if (![6, 12].includes(parseInt(validity_months))) {
    console.error('有效期只能是6个月或12个月');
    return;
  }

  const promises = [];
  const codes = [];

  for (let i = 0; i < count; i++) {
    const code = generateInviteCode();
    codes.push(code);

    const promise = new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO invite_codes (code, industry, validity_months) VALUES (?, ?, ?)',
        [code, industry, validity_months],
        function(err) {
          if (err) {
            reject(err);
          } else {
            resolve({ id: this.lastID, code, industry, validity_months });
          }
        }
      );
    });
    
    promises.push(promise);
  }

  try {
    const results = await Promise.all(promises);
    
    console.log(`\n✅ 成功创建 ${results.length} 个 "${industry}" 行业的激活码:`);
    results.forEach(({ code, validity_months }) => {
      console.log(`   ${code} (${validity_months}个月有效期)`);
    });
    console.log('\n这些激活码可以分发给相应行业的用户进行注册。\n');

  } catch (error) {
    console.error('❌ 创建激活码失败:', error.message);
  }
}

async function showStats() {
  console.log('📊 当前激活码统计:\n');

  try {
    // 按行业和使用状态统计
    const stats = await new Promise((resolve, reject) => {
      db.all(
        `SELECT industry, is_used, validity_months, COUNT(*) as count 
         FROM invite_codes 
         GROUP BY industry, is_used, validity_months 
         ORDER BY industry, is_used`,
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });

    const industryStats = {};
    
    stats.forEach(({ industry, is_used, validity_months, count }) => {
      if (!industryStats[industry]) {
        industryStats[industry] = { used: 0, unused: 0, total: 0, validity: {} };
      }
      
      if (is_used) {
        industryStats[industry].used += count;
      } else {
        industryStats[industry].unused += count;
      }
      
      industryStats[industry].total += count;
      
      // 统计有效期分布
      if (!industryStats[industry].validity[validity_months]) {
        industryStats[industry].validity[validity_months] = 0;
      }
      industryStats[industry].validity[validity_months] += count;
    });

    // 显示统计信息
    Object.entries(industryStats).forEach(([industry, stats]) => {
      const industryName = industry === 'all' ? '全部行业' : industry;
      console.log(`${industryName}:`);
      console.log(`   总计: ${stats.total} 个`);
      console.log(`   可用: ${stats.unused} 个`);
      console.log(`   已用: ${stats.used} 个`);
      
      // 显示有效期分布
      const validityInfo = Object.entries(stats.validity)
        .map(([months, count]) => `${months || 12}个月(${count}个)`)
        .join(', ');
      console.log(`   有效期: ${validityInfo}`);
      console.log('');
    });

    // 总计
    const totals = Object.values(industryStats).reduce(
      (acc, cur) => ({
        total: acc.total + cur.total,
        unused: acc.unused + cur.unused,
        used: acc.used + cur.used
      }),
      { total: 0, unused: 0, used: 0 }
    );

    console.log('🌟 系统总计:');
    console.log(`   总激活码: ${totals.total} 个`);
    console.log(`   可用激活码: ${totals.unused} 个`);
    console.log(`   已用激活码: ${totals.used} 个\n`);

  } catch (error) {
    console.error('❌ 获取统计信息失败:', error.message);
  }
}

async function listCodes(industry = null, onlyUnused = true) {
  let whereClause = '';
  let params = [];

  if (industry) {
    whereClause += 'WHERE industry = ?';
    params.push(industry);
  }

  if (onlyUnused) {
    whereClause += whereClause ? ' AND is_used = 0' : 'WHERE is_used = 0';
  }

  try {
    const codes = await new Promise((resolve, reject) => {
      db.all(
        `SELECT code, industry, validity_months, is_used, created_at 
         FROM invite_codes ${whereClause} 
         ORDER BY industry, created_at DESC`,
        params,
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });

    if (codes.length === 0) {
      console.log('📝 没有找到符合条件的激活码。\n');
      return;
    }

    console.log(`📝 激活码列表 (${onlyUnused ? '仅未使用' : '全部'}):\n`);
    
    let currentIndustry = '';
    codes.forEach(({ code, industry, validity_months, is_used, created_at }) => {
      if (industry !== currentIndustry) {
        currentIndustry = industry;
        const industryName = industry === 'all' ? '全部行业' : industry;
        console.log(`\n${industryName}:`);
      }
      
      const status = is_used ? '✅ 已使用' : '⭕ 可用';
      const date = new Date(created_at).toLocaleDateString();
      const validity = validity_months || 12;
      console.log(`   ${code} (${status}, ${validity}个月, ${date})`);
    });
    
    console.log('');

  } catch (error) {
    console.error('❌ 获取激活码列表失败:', error.message);
  }
}

// 检查用户过期状态
async function checkExpiredUsers() {
  console.log('🔍 检查用户过期状态:\n');

  try {
    const users = await new Promise((resolve, reject) => {
      db.all(
        `SELECT username, email, industry, expire_date,
         CASE 
           WHEN expire_date IS NULL THEN NULL
           WHEN date(expire_date) > date('now') THEN 
             CAST((julianday(expire_date) - julianday('now')) AS INTEGER)
           ELSE -1
         END as days_remaining
         FROM users 
         WHERE role != 'admin'
         ORDER BY days_remaining ASC`,
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });

    if (users.length === 0) {
      console.log('没有找到普通用户。\n');
      return;
    }

    const expiredUsers = users.filter(u => u.days_remaining !== null && u.days_remaining < 0);
    const soonExpireUsers = users.filter(u => u.days_remaining !== null && u.days_remaining >= 0 && u.days_remaining <= 7);
    const normalUsers = users.filter(u => u.days_remaining === null || u.days_remaining > 7);

    if (expiredUsers.length > 0) {
      console.log('❌ 已过期用户:');
      expiredUsers.forEach(user => {
        console.log(`   ${user.username} (${user.email}) - ${user.industry} - 过期时间: ${new Date(user.expire_date).toLocaleDateString()}`);
      });
      console.log('');
    }

    if (soonExpireUsers.length > 0) {
      console.log('⚠️  即将过期用户 (7天内):');
      soonExpireUsers.forEach(user => {
        console.log(`   ${user.username} (${user.email}) - ${user.industry} - 剩余: ${user.days_remaining}天`);
      });
      console.log('');
    }

    if (normalUsers.length > 0) {
      console.log('✅ 正常用户:');
      normalUsers.forEach(user => {
        const status = user.days_remaining === null ? '永久' : `${user.days_remaining}天`;
        console.log(`   ${user.username} (${user.email}) - ${user.industry} - ${status}`);
      });
    }

    console.log(`\n📊 用户状态汇总:`);
    console.log(`   总用户数: ${users.length}`);
    console.log(`   已过期: ${expiredUsers.length}`);
    console.log(`   即将过期: ${soonExpireUsers.length}`);
    console.log(`   正常: ${normalUsers.length}\n`);

  } catch (error) {
    console.error('❌ 检查用户过期状态失败:', error.message);
  }
}

// 主函数
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case 'create':
      const industry = args[1];
      const count = parseInt(args[2]) || 5;
      const validity = parseInt(args[3]) || 12;
      
      if (!industry) {
        console.log('用法: node create-codes.js create <行业> [数量] [有效期月数]');
        console.log(`可用行业: ${INDUSTRIES.join(', ')}`);
        console.log('有效期: 6 或 12 (默认12)');
        return;
      }
      
      await createCodes(industry, count, validity);
      break;

    case 'stats':
      await showStats();
      break;

    case 'list':
      const filterIndustry = args[1];
      const showAll = args[2] === '--all';
      await listCodes(filterIndustry, !showAll);
      break;

    case 'check-users':
      await checkExpiredUsers();
      break;

    default:
      console.log('🎯 激活码管理工具\n');
      console.log('用法:');
      console.log('  node create-codes.js create <行业> [数量] [有效期月数]  - 创建指定行业的激活码');
      console.log('  node create-codes.js stats                           - 显示激活码统计信息');
      console.log('  node create-codes.js list [行业] [--all]              - 列出激活码 (默认仅显示未使用)');
      console.log('  node create-codes.js check-users                     - 检查用户过期状态');
      console.log('');
      console.log('可用行业:');
      INDUSTRIES.forEach(industry => {
        const displayName = industry === 'all' ? '全部行业' : industry;
        console.log(`  ${industry.padEnd(12)} - ${displayName}`);
      });
      console.log('');
      console.log('示例:');
      console.log('  node create-codes.js create 人工智能 10 12    # 创建10个12个月有效期的激活码');
      console.log('  node create-codes.js create all 5 6          # 创建5个6个月有效期的全权限激活码');
      console.log('  node create-codes.js stats');
      console.log('  node create-codes.js list 人工智能');
      console.log('  node create-codes.js check-users             # 检查用户过期状态');
      break;
  }

  // 关闭数据库连接
  db.close();
}

// 如果直接运行此脚本
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  createCodes,
  showStats,
  listCodes,
  checkExpiredUsers,
  INDUSTRIES
}; 