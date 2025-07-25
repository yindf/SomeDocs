// 服务器入口文件
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const db = require('./database');
const { importData } = require('./importData');

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(bodyParser.json());

// 提供静态文件服务
app.use(express.static('public'));

// 路由
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

// 导入路由
const userRoutes = require('./routes/users');
const investmentRoutes = require('./routes/investments');
const adminRoutes = require('./routes/admin');

// 使用路由
app.use('/api/users', userRoutes);
app.use('/api/investments', investmentRoutes);
app.use('/api/admin', adminRoutes);

// 导入数据的路由（仅运行一次）
app.get('/api/import-data', (req, res) => {
  importData();
  res.send('数据导入中，请查看控制台');
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
});