// 定期备份调度器
const fs = require('fs');
const path = require('path');
const cron = require('node-cron');

class BackupScheduler {
  constructor() {
    this.isRunning = false;
    this.backupDir = path.join(__dirname, 'backups');
    this.dbPath = path.join(__dirname, 'database.db');
    this.maxBackups = 30; // 保留最近30个备份
    
    // 确保备份目录存在
    this.ensureBackupDirectory();
  }

  // 确保备份目录存在
  ensureBackupDirectory() {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
      console.log('备份目录已创建:', this.backupDir);
    }
  }

  // 执行备份
  async performBackup() {
    try {
      console.log('开始执行定期备份...');
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFileName = `database-${timestamp}.db`;
      const backupPath = path.join(this.backupDir, backupFileName);

      // 检查源数据库文件是否存在
      if (!fs.existsSync(this.dbPath)) {
        console.error('源数据库文件不存在:', this.dbPath);
        return false;
      }

      // 复制数据库文件
      fs.copyFileSync(this.dbPath, backupPath);

      // 创建备份记录
      const backupInfo = {
        timestamp: new Date().toISOString(),
        filename: backupFileName,
        size: fs.statSync(backupPath).size,
        type: 'scheduled' // 区分定期备份和手动备份
      };

      // 更新备份日志
      await this.updateBackupLog(backupInfo);

      // 清理旧备份
      await this.cleanOldBackups();

      console.log('定期备份完成:', backupFileName);
      return true;

    } catch (error) {
      console.error('定期备份失败:', error);
      return false;
    }
  }

  // 更新备份日志
  async updateBackupLog(backupInfo) {
    try {
      const backupLogPath = path.join(this.backupDir, 'backup-log.json');
      let backupLog = [];

      if (fs.existsSync(backupLogPath)) {
        const logData = fs.readFileSync(backupLogPath, 'utf8');
        backupLog = JSON.parse(logData);
      }

      // 添加新备份记录到开头
      backupLog.unshift(backupInfo);

      // 只保留最近的备份记录
      if (backupLog.length > this.maxBackups) {
        backupLog = backupLog.slice(0, this.maxBackups);
      }

      fs.writeFileSync(backupLogPath, JSON.stringify(backupLog, null, 2));
      console.log('备份日志已更新');

    } catch (error) {
      console.error('更新备份日志失败:', error);
    }
  }

  // 清理旧备份文件
  async cleanOldBackups() {
    try {
      const files = fs.readdirSync(this.backupDir)
        .filter(file => file.startsWith('database-') && file.endsWith('.db'))
        .map(file => ({
          name: file,
          path: path.join(this.backupDir, file),
          mtime: fs.statSync(path.join(this.backupDir, file)).mtime
        }))
        .sort((a, b) => b.mtime - a.mtime); // 按修改时间降序排列

      // 保留最新的备份文件，删除多余的
      if (files.length > this.maxBackups) {
        const filesToDelete = files.slice(this.maxBackups);
        
        for (const file of filesToDelete) {
          fs.unlinkSync(file.path);
          console.log('删除旧备份文件:', file.name);
        }
      }

    } catch (error) {
      console.error('清理旧备份失败:', error);
    }
  }

  // 启动定期备份
  start() {
    if (this.isRunning) {
      console.log('备份调度器已在运行');
      return;
    }

    try {
      // 每天凌晨2点执行备份
      this.dailyBackupTask = cron.schedule('0 2 * * *', async () => {
        await this.performBackup();
      }, {
        scheduled: false,
        timezone: 'Asia/Shanghai'
      });

      // 每周日凌晨3点执行深度备份（可选）
      this.weeklyBackupTask = cron.schedule('0 3 * * 0', async () => {
        console.log('执行每周深度备份...');
        await this.performBackup();
      }, {
        scheduled: false,
        timezone: 'Asia/Shanghai'
      });

      // 启动任务
      this.dailyBackupTask.start();
      this.weeklyBackupTask.start();

      this.isRunning = true;
      console.log('定期备份调度器已启动');
      console.log('- 每日备份: 每天凌晨2:00');
      console.log('- 每周备份: 每周日凌晨3:00');

    } catch (error) {
      console.error('启动备份调度器失败:', error);
    }
  }

  // 停止定期备份
  stop() {
    if (!this.isRunning) {
      console.log('备份调度器未在运行');
      return;
    }

    try {
      if (this.dailyBackupTask) {
        this.dailyBackupTask.stop();
      }
      if (this.weeklyBackupTask) {
        this.weeklyBackupTask.stop();
      }

      this.isRunning = false;
      console.log('定期备份调度器已停止');

    } catch (error) {
      console.error('停止备份调度器失败:', error);
    }
  }

  // 手动执行备份
  async manualBackup() {
    console.log('执行手动备份...');
    return await this.performBackup();
  }

  // 获取调度器状态
  getStatus() {
    return {
      isRunning: this.isRunning,
      backupDir: this.backupDir,
      maxBackups: this.maxBackups,
      nextDailyRun: this.dailyBackupTask ? this.dailyBackupTask.getStatus() : null,
      nextWeeklyRun: this.weeklyBackupTask ? this.weeklyBackupTask.getStatus() : null
    };
  }

  // 获取备份统计信息
  getBackupStats() {
    try {
      const files = fs.readdirSync(this.backupDir)
        .filter(file => file.startsWith('database-') && file.endsWith('.db'));
      
      let totalSize = 0;
      const backups = files.map(file => {
        const filePath = path.join(this.backupDir, file);
        const stats = fs.statSync(filePath);
        totalSize += stats.size;
        
        return {
          filename: file,
          size: stats.size,
          created: stats.birthtime,
          modified: stats.mtime
        };
      }).sort((a, b) => b.modified - a.modified);

      return {
        totalBackups: files.length,
        totalSize: totalSize,
        oldestBackup: backups.length > 0 ? backups[backups.length - 1].created : null,
        latestBackup: backups.length > 0 ? backups[0].created : null,
        backups: backups
      };

    } catch (error) {
      console.error('获取备份统计信息失败:', error);
      return {
        totalBackups: 0,
        totalSize: 0,
        oldestBackup: null,
        latestBackup: null,
        backups: []
      };
    }
  }
}

// 创建单例实例
const backupScheduler = new BackupScheduler();

// 导出调度器实例和类
module.exports = {
  BackupScheduler,
  backupScheduler,
  
  // 便捷方法
  startScheduler: () => backupScheduler.start(),
  stopScheduler: () => backupScheduler.stop(),
  manualBackup: () => backupScheduler.manualBackup(),
  getStatus: () => backupScheduler.getStatus(),
  getStats: () => backupScheduler.getBackupStats()
}; 