// 检查管理员用户信息
const { db } = require('./database');

async function checkAdmin() {
  console.log('🔍 检查数据库中的管理员用户信息...\n');

  try {
    // 查询管理员用户
    const adminUsers = await new Promise((resolve, reject) => {
      db.all('SELECT id, username, email, role, industry, created_at FROM users WHERE username = "admin"', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    if (adminUsers.length === 0) {
      console.log('❌ 没有找到用户名为"admin"的用户');
      
      // 查询所有用户
      const allUsers = await new Promise((resolve, reject) => {
        db.all('SELECT id, username, email, role, industry FROM users', (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });
      
      console.log('\n📋 数据库中的所有用户:');
      allUsers.forEach(user => {
        console.log(`  - ID: ${user.id}, 用户名: ${user.username}, 角色: ${user.role}, 行业: ${user.industry}`);
      });
      
      return;
    }

    console.log('✅ 找到管理员用户:');
    adminUsers.forEach(user => {
      console.log(`  - ID: ${user.id}`);
      console.log(`  - 用户名: ${user.username}`);
      console.log(`  - 邮箱: ${user.email}`);
      console.log(`  - 角色: "${user.role}" (类型: ${typeof user.role})`);
      console.log(`  - 行业: ${user.industry}`);
      console.log(`  - 创建时间: ${user.created_at}`);
      console.log(`  - 角色验证: ${user.role === 'admin' ? '✅ 正确' : '❌ 错误'}`);
    });

    // 查询所有角色为admin的用户
    const allAdmins = await new Promise((resolve, reject) => {
      db.all('SELECT id, username, role FROM users WHERE role = "admin"', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    console.log(`\n👥 数据库中角色为"admin"的用户数量: ${allAdmins.length}`);
    allAdmins.forEach(user => {
      console.log(`  - ${user.username} (ID: ${user.id})`);
    });

  } catch (error) {
    console.error('❌ 查询失败:', error.message);
  } finally {
    db.close();
  }
}

// 运行检查
if (require.main === module) {
  checkAdmin().catch(console.error);
}

module.exports = { checkAdmin }; 