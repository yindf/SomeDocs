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
    const response = await fetch(`/api/investments?page=${page}`);
    
    if (response.ok) {
      const data = await response.json();
      displayInvestments(data.data);
      createPagination('investmentsPagination', data.page, data.totalPages, (p) => loadInvestments(p));
    }
  } catch (error) {
    console.error('加载投资数据失败:', error);
  }
}

// 显示投资数据
function displayInvestments(investments) {
  const tbody = document.getElementById('investmentsTable');
  tbody.innerHTML = '';
  
  investments.forEach(investment => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${investment.id}</td>
      <td>${investment.company_name || ''}</td>
      <td>${investment.funding_round || ''}</td>
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
      createPagination('usersPagination', data.page, data.totalPages, (p) => loadUsers(p));
    }
  } catch (error) {
    console.error('加载用户数据失败:', error);
  }
}

// 显示用户数据
function displayUsers(users) {
  const tbody = document.getElementById('usersTable');
  tbody.innerHTML = '';
  
  users.forEach(user => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${user.id}</td>
      <td>${user.username}</td>
      <td>${user.email}</td>
      <td><span class="${user.role === 'admin' ? 'status-used' : 'status-unused'}">
        ${user.role === 'admin' ? '管理员' : '普通用户'}
      </span></td>
      <td>${new Date(user.created_at).toLocaleString()}</td>
      <td>
        ${user.role !== 'admin' ? `<button class="btn btn-danger" onclick="deleteUser(${user.id})">删除</button>` : ''}
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