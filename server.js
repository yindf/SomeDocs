// 服务器入口文件
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const session = require('express-session');
const { db } = require('./database');
const { importData } = require('./importData');
const { initializeAdmin } = require('./init-admin');
const { startScheduler } = require('./scheduler');

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Session配置
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-session-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // 在生产环境中应该设置为true（需要HTTPS）
    maxAge: 24 * 60 * 60 * 1000 // 24小时
  }
}));

// 提供静态文件服务
const path = require('path');
app.use(express.static(path.join(__dirname, 'public')));

// 路由 - 主页
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 管理员页面路由
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// API路由
const userRoutes = require('./routes/users');
const investmentRoutes = require('./routes/investments');
const adminRoutes = require('./routes/admin');

// 使用API路由
app.use('/api/users', userRoutes);
app.use('/api/investments', investmentRoutes);
app.use('/api/admin', adminRoutes);

// 数据导入路由（管理员功能）
app.get('/api/import-data', (req, res) => {
  try {
    // 异步执行导入，不阻塞响应
    setTimeout(() => {
  importData();
    }, 100);
    
    res.json({ 
      message: '数据导入已启动，请查看控制台输出',
      status: 'started'
    });
  } catch (error) {
    console.error('启动数据导入失败:', error);
    res.status(500).json({ error: '启动数据导入失败' });
  }
});

// 系统状态路由
app.get('/api/status', (req, res) => {
  res.json({
    server: 'running',
    database: 'connected',
    timestamp: new Date().toISOString(),
    version: require('./package.json').version
  });
});

// 健康检查路由
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// 404处理
app.use('*', (req, res) => {
  res.status(404).json({ error: '接口不存在' });
});

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error('服务器错误:', err);
  res.status(500).json({ 
    error: '服务器内部错误',
    message: process.env.NODE_ENV === 'development' ? err.message : '请稍后重试'
  });
});

// 优雅关闭处理
function gracefulShutdown(signal) {
  console.log(`收到 ${signal} 信号，开始优雅关闭...`);
  
  server.close((err) => {
    if (err) {
      console.error('关闭服务器时出错:', err);
      process.exit(1);
    }
    
    // 关闭数据库连接
    db.close((err) => {
      if (err) {
        console.error('关闭数据库连接时出错:', err);
        process.exit(1);
      }
      
      console.log('服务器已优雅关闭');
      process.exit(0);
    });
  });
  
  // 强制退出超时
  setTimeout(() => {
    console.error('强制退出，等待时间过长');
    process.exit(1);
  }, 10000);
}

// 启动服务器
const server = app.listen(PORT, async () => {
  console.log(`\n=================================`);
  console.log(`🚀 服务器启动成功！`);
  console.log(`📍 服务地址: http://localhost:${PORT}`);
  console.log(`📊 管理后台: http://localhost:${PORT}/admin`);
  console.log(`📅 启动时间: ${new Date().toLocaleString()}`);
  console.log(`=================================\n`);

  try {
    // 初始化管理员账户和邀请码
    console.log('正在初始化系统...');
    await initializeAdmin();
    
    // 启动定期备份调度器
    console.log('正在启动备份调度器...');
    startScheduler();
    
    console.log('✅ 系统初始化完成！');
    console.log('\n📝 默认管理员账户信息:');
    console.log('   用户名: admin');
    console.log('   密码: admin123');
    console.log('   ⚠️  请登录后立即修改密码！\n');
    
  } catch (error) {
    console.error('❌ 系统初始化失败:', error);
  }
});

// 注册信号处理器
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// 未捕获异常处理
process.on('uncaughtException', (err) => {
  console.error('未捕获的异常:', err);
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('未处理的Promise拒绝:', reason);
  console.error('Promise:', promise);
  gracefulShutdown('unhandledRejection');
});

module.exports = app;