// 管理员界面JavaScript
document.addEventListener('DOMContentLoaded', () => {
  // 检查管理员权限
  checkAdminAuth();
  
  // 加载仪表板数据
  loadDashboard();
  
  // 设置导航
  setupNavigation();
  
  // 设置表单
  setupForms();
});

// 全局变量
let authToken = localStorage.getItem('authToken');
let currentUser = JSON.parse(localStorage.getItem('userInfo') || '{}');

// 检查管理员权限
function checkAdminAuth() {
  if (!currentUser.role || currentUser.role !== 'admin') {
    alert('您没有管理员权限');
    window.location.href = 'index.html';
    return;
  }
}

// 设置导航
function setupNavigation() {
  const navLinks = document.querySelectorAll('.nav-link');
  const sections = document.querySelectorAll('.admin-section');
  
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = link.getAttribute('href').substring(1);
      
      // 移除所有活动状态
      navLinks.forEach(l => l.classList.remove('active'));
      sections.forEach(s => s.classList.remove('active'));
      
      // 设置新的活动状态
      link.classList.add('active');
      document.getElementById(targetId).classList.add('active');
      
      // 加载对应数据
      loadSectionData(targetId);
    });
  });
}

// 加载对应部分的数据
function loadSectionData(sectionId) {
  switch(sectionId) {
    case 'dashboard':
      loadDashboard();
      break;
    case 'invite-codes':
      loadInviteCodes();
      break;
    case 'investments':
      loadInvestments();
      break;
    case 'users':
      loadUsers();
      break;
    case 'backup':
      loadBackups();
      break;
    case 'settings':
      // 设置页面不需要额外加载
      break;
  }
}

// 加载仪表板数据
async function loadDashboard() {
  try {
    const response = await fetch('/api/admin/statistics', {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    if (response.ok) {
      const stats = await response.json();
      
      document.getElementById('totalUsers').textContent = stats.users || 0;
      document.getElementById('totalInvestments').textContent = stats.investments || 0;
      document.getElementById('totalInviteCodes').textContent = stats.inviteCodes.total || 0;
      document.getElementById('unusedInviteCodes').textContent = stats.inviteCodes.unused || 0;
    }
  } catch (error) {
    console.error('加载仪表板数据失败:', error);
  }
}

// 加载邀请码数据
async function loadInviteCodes(page = 1) {
  try {
    const response = await fetch(`/api/admin/invite-codes?page=${page}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      displayInviteCodes(data.data);
      createPagination('inviteCodesPagination', data.page, data.totalPages, (p) => loadInviteCodes(p));
    }
  } catch (error) {
    console.error('加载邀请码失败:', error);
  }
}

// 显示邀请码
function displayInviteCodes(codes) {
  const tbody = document.getElementById('inviteCodesTable');
  tbody.innerHTML = '';
  
  codes.forEach(code => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${code.id}</td>
      <td><code>${code.code}</code></td>
      <td><span class="${code.is_used ? 'status-used' : 'status-unused'}">
        ${code.is_used ? '已使用' : '未使用'}
      </span></td>
      <td>${new Date(code.created_at).toLocaleString()}</td>
      <td>
        ${!code.is_used ? `<button class="btn btn-danger" onclick="deleteInviteCode(${code.id})">删除</button>` : ''}
      </td>
    `;
    tbody.appendChild(row);
  });
}

// 生成邀请码
async function generateInviteCodes(count) {
  try {
    const response = await fetch('/api/admin/invite-codes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({ count })
    });
    
    const data = await response.json();
    if (response.ok) {
      showAlert('success', `成功生成 ${count} 个邀请码`);
      loadDashboard();
      if (document.getElementById('invite-codes').classList.contains('active')) {
        loadInviteCodes();
      }
    } else {
      showAlert('error', data.error || '生成失败');
    }
  } catch (error) {
    console.error('生成邀请码失败:', error);
    showAlert('error', '生成失败');
  }
}

// 自定义生成邀请码
function generateInviteCodesCustom() {
  const count = parseInt(document.getElementById('codeCount').value);
  if (count < 1 || count > 100) {
    alert('数量应在1-100之间');
    return;
  }
  generateInviteCodes(count);
}

// 删除邀请码
async function deleteInviteCode(id) {
  if (!confirm('确定要删除这个邀请码吗？')) return;
  
  try {
    const response = await fetch(`/api/admin/invite-codes/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    const data = await response.json();
    if (response.ok) {
      showAlert('success', '删除成功');
      loadInviteCodes();
      loadDashboard();
    } else {
      showAlert('error', data.error || '删除失败');
    }
  } catch (error) {
    console.error('删除失败:', error);
    showAlert('error', '删除失败');
  }
}

// 加载投资数据
async function loadInvestments(page = 1) {
  try {
    const response = await fetch(`/api/investments?page=${page}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      displayInvestments(data.data);
      createPagination('investments-pagination', data.page, data.totalPages, (p) => loadInvestments(p));
    }
  } catch (error) {
    console.error('加载投资数据失败:', error);
  }
}

// 显示投资数据
function displayInvestments(investments) {
  const tbody = document.getElementById('investments-tbody');
  if (!tbody) return;
  
  tbody.innerHTML = '';
  
  investments.forEach(investment => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${investment.id}</td>
      <td>${investment.company_name || ''}</td>
      <td>${investment.company_description || ''}</td>
      <td>${investment.funding_round || ''}</td>
      <td>${investment.date || ''}</td>
      <td>${investment.industry || ''}</td>
      <td>${investment.investment_institution || ''}</td>
      <td>
        <button class="btn" onclick="editInvestment(${investment.id})">编辑</button>
        <button class="btn btn-danger" onclick="deleteInvestment(${investment.id})">删除</button>
      </td>
    `;
    tbody.appendChild(row);
  });
}

// 加载用户数据
async function loadUsers(page = 1) {
  try {
    const response = await fetch(`/api/admin/users?page=${page}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      displayUsers(data.data);
      createPagination('users-pagination', data.page, data.totalPages, (p) => loadUsers(p));
    }
  } catch (error) {
    console.error('加载用户数据失败:', error);
  }
}

// 显示用户数据
function displayUsers(users) {
  const tbody = document.getElementById('users-tbody');
  if (!tbody) return;
  
  tbody.innerHTML = '';
  
  users.forEach(user => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${user.username}</td>
      <td>${user.email}</td>
      <td><span class="${user.role === 'admin' ? 'status-used' : 'status-unused'}">
        ${user.role === 'admin' ? '管理员' : '普通用户'}
      </span></td>
      <td>${user.industry || ''}</td>
      <td>${user.expire_date_formatted || '永久'}</td>
      <td>${user.days_remaining !== null ? (user.days_remaining >= 0 ? user.days_remaining + ' 天' : '已过期') : '永久'}</td>
      <td><span class="status-${user.status === '正常' ? 'unused' : user.status === '已过期' ? 'used' : 'pending'}">${user.status || '正常'}</span></td>
      <td>${new Date(user.created_at).toLocaleDateString('zh-CN')}</td>
      <td>
        <button class="btn" onclick="editUser(${user.id}, '${user.username}', '${user.industry || ''}')">编辑</button>
        ${user.role !== 'admin' ? `<button class="btn btn-danger" onclick="deleteUser(${user.id})" style="margin-left: 5px;">删除</button>` : ''}
      </td>
    `;
    tbody.appendChild(row);
  });
}

// 加载备份数据
async function loadBackups() {
  try {
    const response = await fetch('/api/admin/backups', {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    if (response.ok) {
      const backups = await response.json();
      displayBackups(backups);
    }
  } catch (error) {
    console.error('加载备份数据失败:', error);
  }
}

// 显示备份数据
function displayBackups(backups) {
  const tbody = document.getElementById('backupTable');
  tbody.innerHTML = '';
  
  backups.forEach(backup => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${new Date(backup.timestamp).toLocaleString()}</td>
      <td>${backup.filename}</td>
      <td>${formatFileSize(backup.size)}</td>
    `;
    tbody.appendChild(row);
  });
}

// 备份数据库
async function backupDatabase() {
  try {
    const response = await fetch('/api/admin/backup', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    const data = await response.json();
    if (response.ok) {
      showAlert('success', '数据库备份成功');
      if (document.getElementById('backup').classList.contains('active')) {
        loadBackups();
      }
    } else {
      showAlert('error', data.error || '备份失败');
    }
  } catch (error) {
    console.error('备份失败:', error);
    showAlert('error', '备份失败');
  }
}

// 删除投资记录
async function deleteInvestment(id) {
  if (!confirm('确定要删除这条投资记录吗？')) return;
  
  try {
    const response = await fetch(`/api/investments/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    const data = await response.json();
    if (response.ok) {
      showAlert('success', '删除成功');
      loadInvestments();
      loadDashboard();
    } else {
      showAlert('error', data.error || '删除失败');
    }
  } catch (error) {
    console.error('删除失败:', error);
    showAlert('error', '删除失败');
  }
}

// 编辑投资记录
function editInvestment(id) {
  // 这里实现编辑功能
  alert(`编辑投资记录 ID: ${id} 的功能待完善`);
}

// 删除用户
async function deleteUser(id) {
  if (!confirm('确定要删除这个用户吗？')) return;
  
  alert('删除用户功能待实现');
}

// 显示添加投资数据模态框
function showAddInvestmentModal() {
  document.getElementById('addInvestmentModal').style.display = 'block';
}

// 显示导入数据模态框
function showImportDataModal() {
  document.getElementById('importDataModal').style.display = 'block';
}

// 关闭模态框
function closeModal(modalId) {
  document.getElementById(modalId).style.display = 'none';
}

// 导入数据
async function importData() {
  const progressBar = document.getElementById('importProgress');
  const progressFill = document.getElementById('importProgressFill');
  
  progressBar.style.display = 'block';
  progressFill.style.width = '10%';
  
  try {
    const response = await fetch('/api/import-data');
    
    if (response.ok) {
      progressFill.style.width = '100%';
      showAlert('success', '数据导入启动成功，请查看控制台输出');
      setTimeout(() => {
        closeModal('importDataModal');
        loadDashboard();
      }, 2000);
    } else {
      showAlert('error', '导入失败');
    }
  } catch (error) {
    console.error('导入失败:', error);
    showAlert('error', '导入失败');
  }
}

// 检查导入状态
function checkImportStatus() {
  // 实现检查导入状态的逻辑
  alert('检查导入状态功能待实现');
}

// 清空所有数据
function clearAllData() {
  if (!confirm('警告：这将删除所有投资数据，此操作不可逆！确定继续吗？')) return;
  if (!confirm('最后确认：确定要删除所有投资数据吗？')) return;
  
  alert('清空数据功能待实现');
}

// 设置表单
function setupForms() {
  // 添加投资数据表单
  document.getElementById('addInvestmentForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = {
      company_name: document.getElementById('companyName').value,
      company_description: document.getElementById('companyDescription').value,
      funding_round: document.getElementById('fundingRound').value,
      date: document.getElementById('date').value,
      industry: document.getElementById('industry').value,
      investment_institution: document.getElementById('investmentInstitution').value
    };
    
    try {
      const response = await fetch('/api/investments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(formData)
      });
      
      const data = await response.json();
      if (response.ok) {
        showAlert('success', '添加成功');
        closeModal('addInvestmentModal');
        document.getElementById('addInvestmentForm').reset();
        loadDashboard();
        if (document.getElementById('investments').classList.contains('active')) {
          loadInvestments();
        }
      } else {
        showAlert('error', data.error || '添加失败');
      }
    } catch (error) {
      console.error('添加失败:', error);
      showAlert('error', '添加失败');
    }
  });
}

// 创建分页
function createPagination(containerId, currentPage, totalPages, callback) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';
  
  if (totalPages <= 1) return;
  
  // 上一页按钮
  const prevBtn = document.createElement('button');
  prevBtn.textContent = '上一页';
  prevBtn.className = 'btn';
  prevBtn.disabled = currentPage === 1;
  prevBtn.onclick = () => callback(currentPage - 1);
  container.appendChild(prevBtn);
  
  // 页码信息
  const pageInfo = document.createElement('span');
  pageInfo.textContent = `第 ${currentPage} 页 / 共 ${totalPages} 页`;
  pageInfo.style.margin = '0 10px';
  container.appendChild(pageInfo);
  
  // 下一页按钮
  const nextBtn = document.createElement('button');
  nextBtn.textContent = '下一页';
  nextBtn.className = 'btn';
  nextBtn.disabled = currentPage === totalPages;
  nextBtn.onclick = () => callback(currentPage + 1);
  container.appendChild(nextBtn);
}

// 显示警告
function showAlert(type, message) {
  const container = document.getElementById('alertContainer');
  const alert = document.createElement('div');
  alert.className = `alert alert-${type}`;
  alert.textContent = message;
  
  container.appendChild(alert);
  
  // 3秒后自动移除
  setTimeout(() => {
    if (alert.parentNode) {
      alert.parentNode.removeChild(alert);
    }
  }, 3000);
}

// 格式化文件大小
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 点击模态框外部关闭
window.onclick = function(event) {
  const modals = document.querySelectorAll('.modal');
  modals.forEach(modal => {
    if (event.target === modal) {
      modal.style.display = 'none';
    }
  });
}

// 切换界面显示
function showSection(section) {
  // 隐藏所有界面
  const sections = document.querySelectorAll('.admin-section');
  sections.forEach(s => s.classList.remove('active'));
  
  // 移除所有导航按钮的active类
  const navButtons = document.querySelectorAll('.nav-btn');
  navButtons.forEach(btn => btn.classList.remove('active'));
  
  // 显示指定界面
  const targetSection = document.getElementById(section + '-section');
  if (targetSection) {
    targetSection.classList.add('active');
  }
  
  // 激活对应的导航按钮
  const targetBtn = event?.target || document.querySelector(`[onclick="showSection('${section}')"]`);
  if (targetBtn) {
    targetBtn.classList.add('active');
  }
  
  // 根据不同界面加载对应数据
  switch(section) {
    case 'stats':
      loadDashboard();
      break;
    case 'invites':
      loadInviteCodes();
      loadIndustries();
      break;
    case 'users':
      loadUsers();
      break;
    case 'investments':
      loadInvestmentsForAdmin();
      loadInvestmentIndustries();
      break;
    case 'import':
      // 数据导入界面不需要加载额外数据
      break;
  }
}

// 为管理后台加载投资数据
async function loadInvestmentsForAdmin(page = 1, industry = '', search = '') {
  try {
    let url = `/api/investments?page=${page}`;
    if (industry) url += `&industry=${industry}`;
    if (search) url += `&search=${search}`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      displayInvestmentsForAdmin(data.data);
      createPagination('investments-pagination', data.page, data.totalPages, (p) => {
        const currentIndustry = document.getElementById('filter-investment-industry').value;
        const currentSearch = document.getElementById('search-company').value;
        loadInvestmentsForAdmin(p, currentIndustry, currentSearch);
      });
    }
  } catch (error) {
    console.error('加载投资数据失败:', error);
    showAlert('error', '加载投资数据失败');
  }
}

// 显示投资数据（管理后台版本）
function displayInvestmentsForAdmin(investments) {
  const tbody = document.getElementById('investments-tbody');
  if (!tbody) return;
  
  tbody.innerHTML = '';
  
  if (!investments || investments.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align: center; padding: 20px; color: #666;">
          暂无投资数据
        </td>
      </tr>
    `;
    return;
  }
  
  investments.forEach(investment => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${investment.id}</td>
      <td title="${investment.company_name || ''}">${truncateText(investment.company_name || '', 20)}</td>
      <td title="${investment.company_description || ''}">${truncateText(investment.company_description || '', 30)}</td>
      <td>${investment.funding_round || ''}</td>
      <td>${investment.date || ''}</td>
      <td>${investment.industry || ''}</td>
      <td title="${investment.investment_institution || ''}">${truncateText(investment.investment_institution || '', 20)}</td>
      <td>
        <button class="btn" onclick="editInvestment(${investment.id})" style="margin-right: 5px;">编辑</button>
        <button class="btn btn-danger" onclick="deleteInvestment(${investment.id})">删除</button>
      </td>
    `;
    tbody.appendChild(row);
  });
}

// 文本截断函数
function truncateText(text, maxLength) {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

// 加载投资相关的行业列表
async function loadInvestmentIndustries() {
  try {
    const response = await fetch('/api/admin/industries', {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    if (response.ok) {
      const industries = await response.json();
      const select = document.getElementById('filter-investment-industry');
      if (select) {
        // 保留当前选择
        const currentValue = select.value;
        select.innerHTML = '<option value="">全部行业</option>';
        
        industries.forEach(industry => {
          const option = document.createElement('option');
          option.value = industry;
          option.textContent = industry;
          select.appendChild(option);
        });
        
        // 恢复之前的选择
        select.value = currentValue;
      }
    }
  } catch (error) {
    console.error('加载行业列表失败:', error);
  }
}

// 搜索投资数据
function searchInvestments(event) {
  if (event.key === 'Enter' || event.type === 'input') {
    const search = event.target.value.trim();
    const industry = document.getElementById('filter-investment-industry').value;
    loadInvestmentsForAdmin(1, industry, search);
  }
}

// 清除投资数据筛选
function clearInvestmentFilters() {
  document.getElementById('filter-investment-industry').value = '';
  document.getElementById('search-company').value = '';
  loadInvestmentsForAdmin(1);
}

// 编辑投资数据（占位符函数）
function editInvestment(id) {
  showAlert('info', `编辑投资数据功能开发中，记录ID: ${id}`);
  // TODO: 实现编辑功能
}

// 编辑用户（占位符函数）
function editUser(id, username, industry) {
  showAlert('info', `编辑用户功能开发中，用户ID: ${id}, 用户名: ${username}`);
  // TODO: 实现编辑功能
}

// 删除用户（占位符函数）
function deleteUser(id) {
  if (!confirm('确定要删除这个用户吗？此操作不可撤销！')) return;
  
  showAlert('info', `删除用户功能开发中，用户ID: ${id}`);
  // TODO: 实现删除功能
}

// 清空所有投资数据 - 危险操作
async function clearAllInvestmentData() {
  // 多重确认机制
  const firstConfirm = confirm('⚠️ 警告：您即将删除所有投资数据！\n\n这个操作将：\n• 永久删除所有投资记录\n• 无法恢复\n• 影响所有用户\n\n确定要继续吗？');
  if (!firstConfirm) return;
  
  const secondConfirm = confirm('⚠️ 最后确认：\n\n您真的要删除所有投资数据吗？\n\n请输入"删除"来确认此操作');
  if (!secondConfirm) return;
  
  // 要求用户输入确认文本
  const confirmText = prompt('请输入"清空所有数据"来确认此危险操作：');
  if (confirmText !== '清空所有数据') {
    showAlert('error', '确认文本不正确，操作已取消');
    return;
  }
  
  try {
    showAlert('info', '正在清空数据，请稍候...');
    
    const response = await fetch('/api/admin/clear-all-data', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        confirmToken: 'CLEAR_ALL_INVESTMENT_DATA_CONFIRMED'
      })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      showAlert('success', `✅ ${data.message}\n操作时间: ${new Date(data.timestamp).toLocaleString()}\n操作员: ${data.operator}`);
      
      // 刷新数据显示
      if (document.getElementById('investments-section').classList.contains('active')) {
        loadInvestmentsForAdmin();
      }
      
      // 刷新统计数据
      loadDashboard();
      
    } else {
      showAlert('error', `❌ 清空失败: ${data.error || '未知错误'}`);
    }
    
  } catch (error) {
    console.error('清空数据失败:', error);
    showAlert('error', '❌ 网络错误，清空操作失败');
  }
} 