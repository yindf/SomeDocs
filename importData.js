// 数据导入脚本
const fs = require('fs');
const path = require('path');
const { db } = require('./database');

// 读取data.json文件并导入数据
function importData() {
  try {
    console.log('开始导入数据...');
    
    // 检查文件是否存在
    const dataFilePath = path.join(__dirname, 'data.json');
    if (!fs.existsSync(dataFilePath)) {
      console.error('data.json 文件不存在');
      return;
    }

    // 读取文件，指定编码为utf8
    const data = fs.readFileSync(dataFilePath, 'utf8');
    
    let investments;
    try {
      investments = JSON.parse(data);
    } catch (parseError) {
      console.error('JSON 解析失败:', parseError.message);
      return;
    }

    if (!Array.isArray(investments)) {
      console.error('数据格式错误：应该是数组格式');
      return;
    }

    console.log(`准备导入 ${investments.length} 条数据...`);

    // 检查表是否存在数据
    db.get('SELECT COUNT(*) as count FROM investments', (err, row) => {
      if (err) {
        console.error('检查表数据错误:', err.message);
        return;
      }

      if (row.count > 0) {
        console.log(`表中已存在 ${row.count} 条数据`);
        console.log('如需重新导入，请先清空表或删除重复数据');
        return;
      }

      // 开始批量导入
      importDataBatch(investments);
    });

  } catch (error) {
    console.error('读取文件错误:', error.message);
  }
}

// 批量导入数据
function importDataBatch(investments) {
  const batchSize = 100; // 每批处理100条数据
  let currentIndex = 0;
  let successCount = 0;
  let errorCount = 0;

  function processBatch() {
    const batch = investments.slice(currentIndex, currentIndex + batchSize);
    
    if (batch.length === 0) {
      console.log(`数据导入完成！成功: ${successCount}, 失败: ${errorCount}`);
      return;
    }

    console.log(`正在处理第 ${currentIndex + 1} - ${currentIndex + batch.length} 条数据...`);

    db.serialize(() => {
      db.run('BEGIN TRANSACTION');

      const stmt = db.prepare(`
        INSERT INTO investments (
          company_name,
          company_description,
          funding_round,
          date,
          industry,
          investment_institution
        ) VALUES (?, ?, ?, ?, ?, ?)
      `);

      let batchErrors = 0;

      batch.forEach((item, index) => {
        // 处理数据，兼容不同的字段名格式
        const companyName = item['公司名称'] || item['company_name'] || item.companyName || '';
        const companyDescription = item['公司简介'] || item['company_description'] || item.companyDescription || '';
        const fundingRound = item['融资轮次'] || item['funding_round'] || item.fundingRound || '';
        const date = item['日期'] || item['date'] || item.date || '';
        const industry = item['行业赛道'] || item['industry'] || item.industry || '';
        const investmentInstitution = item['投资机构'] || item['investment_institution'] || item.investmentInstitution || '';

        stmt.run(
          companyName,
          companyDescription,
          fundingRound,
          date,
          industry,
          investmentInstitution,
          (err) => {
            if (err) {
              console.error(`插入第${currentIndex + index + 1}条数据错误:`, err.message);
              batchErrors++;
            }
          }
        );
      });

      stmt.finalize((err) => {
        if (err) {
          console.error('语句 finalize 错误:', err.message);
          db.run('ROLLBACK');
          errorCount += batch.length;
        } else {
          db.run('COMMIT', (err) => {
            if (err) {
              console.error('提交事务错误:', err.message);
              errorCount += batch.length;
            } else {
              successCount += (batch.length - batchErrors);
              errorCount += batchErrors;
              console.log(`批次完成，成功: ${batch.length - batchErrors}, 失败: ${batchErrors}`);
            }
            
            // 处理下一批
            currentIndex += batchSize;
            setTimeout(processBatch, 100); // 短暂延迟避免阻塞
          });
        }
      });
    });
  }

  // 开始处理
  processBatch();
}

// 清空投资数据表（用于重新导入）
function clearInvestmentData() {
  return new Promise((resolve, reject) => {
    db.run('DELETE FROM investments', (err) => {
      if (err) {
        console.error('清空数据错误:', err.message);
        reject(err);
      } else {
        console.log('投资数据表已清空');
        resolve();
      }
    });
  });
}

// 获取导入状态
function getImportStatus() {
  return new Promise((resolve, reject) => {
    db.get('SELECT COUNT(*) as count FROM investments', (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve({
          totalRecords: row.count,
          imported: row.count > 0
        });
      }
    });
  });
}

// 验证数据完整性
function validateData() {
  return new Promise((resolve, reject) => {
    const queries = [
      'SELECT COUNT(*) as total FROM investments',
      'SELECT COUNT(*) as withCompanyName FROM investments WHERE company_name IS NOT NULL AND company_name != ""',
      'SELECT COUNT(*) as withIndustry FROM investments WHERE industry IS NOT NULL AND industry != ""'
    ];

    Promise.all(queries.map(query => {
      return new Promise((resolve, reject) => {
        db.get(query, (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });
    })).then(results => {
      resolve({
        total: results[0].total,
        withCompanyName: results[1].withCompanyName,
        withIndustry: results[2].withIndustry,
        completeness: {
          companyName: (results[1].withCompanyName / results[0].total * 100).toFixed(2) + '%',
          industry: (results[2].withIndustry / results[0].total * 100).toFixed(2) + '%'
        }
      });
    }).catch(reject);
  });
}

// 导出函数
module.exports = { 
  importData,
  clearInvestmentData,
  getImportStatus,
  validateData
};