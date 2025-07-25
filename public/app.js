// 全局变量
let userInfo = null;
let currentPage = 1;
let totalPages = 1;
let currentSearch = '';
let isLoading = false;

// 页面元素（全局引用）
let dataTableBody, pageInfo, prevPageBtn, nextPageBtn, searchButton, searchInput, clearSearchButton;

console.log('开始加载 app.js');

// DOM加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM内容加载完成，开始初始化应用');
  
  // 初始化页面元素引用
  dataTableBody = document.getElementById('dataTableBody');
  pageInfo = document.getElementById('pageInfo');
  prevPageBtn = document.getElementById('prevPage');
  nextPageBtn = document.getElementById('nextPage');
  searchButton = document.getElementById('searchButton');
  searchInput = document.getElementById('searchInput');
  clearSearchButton = document.getElementById('clearSearchButton');

  // 初始化应用
  init();

  function init() {
    console.log('开始初始化应用功能...');
    setupNavigation();
    setupForms();
    setupEventListeners();
    setupModals();
    checkLoginStatus();
    
    // 显示欢迎页面
    showSection('welcome');
    console.log('应用初始化完成');
  }

  // 设置导航
  function setupNavigation() {
    console.log('设置导航事件...');
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const sectionId = link.getAttribute('data-section');
        console.log('导航点击:', sectionId);
        showSection(sectionId);
      });
    });
  }

  // 设置模态框外部点击关闭
  function setupModals() {
    console.log('设置模态框外部点击事件...');
    
    window.onclick = function(event) {
      const modals = document.querySelectorAll('.modal');
      modals.forEach(modal => {
        if (event.target === modal) {
          modal.style.display = 'none';
          console.log('通过外部点击关闭了模态框');
        }
      });
    };
  }

  // 设置表单事件
  function setupForms() {
    console.log('设置表单提交事件...');
    
    // 登录表单
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
      loginForm.addEventListener('submit', handleLogin);
      console.log('登录表单事件绑定成功');
    }

    // 注册表单
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
      registerForm.addEventListener('submit', handleRegister);
      console.log('注册表单事件绑定成功');
    }
  }

  // 设置其他事件监听器
  function setupEventListeners() {
    console.log('设置其他事件监听器...');
    
    // 搜索相关
    if (searchButton) {
      searchButton.addEventListener('click', performSearch);
    }
    
    if (searchInput) {
      searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          performSearch();
        }
      });
    }

    // 分页相关 - 现在由动态分页控件处理，移除静态事件监听器
  }

  // 检查登录状态
  function checkLoginStatus() {
    console.log('检查用户登录状态...');
    const storedUserInfo = localStorage.getItem('userInfo');
    const storedToken = localStorage.getItem('authToken');
    
    if (storedUserInfo && storedToken) {
      try {
        userInfo = JSON.parse(storedUserInfo);
        console.log('用户已登录:', userInfo);
        updateUIForLoggedInUser();
      } catch(e) {
        console.error('解析用户信息失败:', e);
        localStorage.removeItem('userInfo');
        localStorage.removeItem('authToken');
      }
    } else {
      console.log('用户未登录');
      updateUIForLoggedOutUser();
    }
  }

  // 更新已登录用户的UI
  function updateUIForLoggedInUser() {
    if (!userInfo) return;
    console.log('更新已登录用户界面:', userInfo);

    // 显示/隐藏导航元素
    const elements = {
      dataNav: document.getElementById('dataNav'),
      logoutLink: document.getElementById('logoutLink'),
      loginNav: document.getElementById('loginNav'),
      registerNav: document.getElementById('registerNav'),
      adminLink: document.getElementById('adminLink'),
      actionColumn: document.getElementById('actionColumn'),
      userInfo: document.getElementById('user-info')
    };

    if (elements.dataNav) elements.dataNav.style.display = 'block';
    if (elements.logoutLink) elements.logoutLink.style.display = 'block';
    if (elements.loginNav) elements.loginNav.style.display = 'none';
    if (elements.registerNav) elements.registerNav.style.display = 'none';
    if (elements.userInfo) elements.userInfo.style.display = 'block';

    // 更新用户信息显示
    const username = document.getElementById('username');
    const roleBadge = document.getElementById('role-badge');
    const industryBadge = document.getElementById('industry-badge');
    const expireWarning = document.getElementById('expire-warning');
    
    if (username) username.textContent = userInfo.username;
    
    if (roleBadge) {
      roleBadge.textContent = userInfo.role === 'admin' ? '管理员' : '普通用户';
      roleBadge.className = `role-badge ${userInfo.role === 'admin' ? 'admin' : ''}`;
    }
    
    if (industryBadge) {
      const industryText = userInfo.industry === 'all' || userInfo.role === 'admin' 
        ? '全部行业' 
        : userInfo.industry || '未分配';
      industryBadge.textContent = industryText;
    }

    // 显示过期警告
    if (expireWarning) {
      if (userInfo.expireWarning) {
        expireWarning.style.display = 'block';
        expireWarning.textContent = userInfo.expireWarning.message;
        expireWarning.className = userInfo.expireWarning.daysRemaining <= 3 
          ? 'expire-warning critical' 
          : 'expire-warning';
      } else if (userInfo.expireDate && userInfo.role !== 'admin') {
        // 显示过期时间信息
        const expireDate = new Date(userInfo.expireDate);
        const now = new Date();
        const daysRemaining = Math.ceil((expireDate - now) / (1000 * 60 * 60 * 24));
        
        if (daysRemaining > 0) {
          expireWarning.style.display = 'block';
          expireWarning.textContent = `账户有效期至 ${expireDate.toLocaleDateString('zh-CN')}，剩余 ${daysRemaining} 天`;
          expireWarning.className = 'expire-warning';
        }
      } else {
        expireWarning.style.display = 'none';
      }
    }

    // 管理员特殊权限
    if (userInfo.role === 'admin') {
      console.log('✅ 用户是管理员，显示管理员功能');
      if (elements.adminLink) {
        elements.adminLink.style.display = 'block';
        elements.adminLink.parentElement.style.display = 'block'; // 确保父元素也显示
        console.log('✅ 管理员控制台链接已显示');
      } else {
        console.error('❌ 找不到管理员链接元素');
      }
      if (elements.actionColumn) elements.actionColumn.style.display = 'table-cell';
    } else {
      console.log('ℹ️ 用户角色:', userInfo.role, '- 不是管理员，隐藏管理员功能');
      if (elements.adminLink) {
        elements.adminLink.style.display = 'none';
        elements.adminLink.parentElement.style.display = 'none';
      }
    }
  }

  // 更新已退出用户的UI
  function updateUIForLoggedOutUser() {
    console.log('更新未登录用户界面');
    const elements = {
      dataNav: document.getElementById('dataNav'),
      logoutLink: document.getElementById('logoutLink'),
      adminLink: document.getElementById('adminLink'),
      loginNav: document.getElementById('loginNav'),
      registerNav: document.getElementById('registerNav'),
      actionColumn: document.getElementById('actionColumn'),
      userInfo: document.getElementById('user-info')
    };

    if (elements.dataNav) elements.dataNav.style.display = 'none';
    if (elements.logoutLink) elements.logoutLink.style.display = 'none';
    if (elements.adminLink) elements.adminLink.style.display = 'none';
    if (elements.loginNav) elements.loginNav.style.display = 'block';
    if (elements.registerNav) elements.registerNav.style.display = 'block';
    if (elements.actionColumn) elements.actionColumn.style.display = 'none';
    if (elements.userInfo) elements.userInfo.style.display = 'none';

    // 如果当前在数据页面，跳转到欢迎页面
    const dataPanel = document.getElementById('data');
    if (dataPanel && dataPanel.classList.contains('active')) {
      showSection('welcome');
    }
  }

  // 处理登录
  function handleLogin(e) {
    e.preventDefault();
    console.log('处理登录表单提交');
    
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;

    if (!username || !password) {
      showAlert('error', '请输入用户名和密码');
      return;
    }

    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = '登录中...';
    submitBtn.disabled = true;

    fetch('/api/users/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, password })
    })
    .then(response => response.json())
    .then(data => {
      console.log('登录响应:', data);
      
      if (data.message === '登录成功') {
        userInfo = data.user;
        localStorage.setItem('userInfo', JSON.stringify(userInfo));
        if (data.token) {
          localStorage.setItem('authToken', data.token);
          console.log('Token已保存:', data.token.substring(0, 20) + '...');
        } else {
          console.error('登录响应中没有token!');
        }
        
        showAlert('success', '登录成功！');
        
        // 显示过期警告
        if (data.user.expireWarning) {
          setTimeout(() => {
            showAlert('warning', data.user.expireWarning.message);
          }, 1000);
        }
        
        updateUIForLoggedInUser();
        closeModal('loginModal');
        showSection('data');
      } else if (data.code === 'ACCOUNT_EXPIRED') {
        showAlert('error', '账户已过期，请联系管理员续期');
      } else {
        showAlert('error', data.error || data.message || '登录失败');
      }
    })
    .catch(error => {
      console.error('登录请求错误:', error);
      showAlert('error', '网络错误，请稍后重试');
    })
    .finally(() => {
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
    });
  }

  // 处理注册
  function handleRegister(e) {
    e.preventDefault();
    console.log('处理注册表单提交');
    
    const username = document.getElementById('registerUsername').value.trim();
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const email = document.getElementById('registerEmail').value.trim();
    const inviteCode = document.getElementById('inviteCode').value.trim();

    // 表单验证
    if (!username || !password || !confirmPassword || !email || !inviteCode) {
      showAlert('error', '请填写所有字段');
      return;
    }

    if (username.length < 3 || username.length > 20) {
      showAlert('error', '用户名长度应在3-20个字符之间');
      return;
    }

    if (password.length < 6) {
      showAlert('error', '密码长度至少6位');
      return;
    }

    if (password !== confirmPassword) {
      showAlert('error', '两次输入的密码不一致');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showAlert('error', '请输入有效的邮箱地址');
      return;
    }

    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = '注册中...';
    submitBtn.disabled = true;

    fetch('/api/users/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, password, email, inviteCode })
    })
    .then(response => response.json())
    .then(data => {
      console.log('注册响应:', data);
      
      if (data.message === '注册成功') {
        showAlert('success', '注册成功！请登录');
        closeModal('registerModal');
        setTimeout(() => showLoginModal(), 500);
      } else {
        showAlert('error', data.error || data.message || '注册失败');
      }
    })
    .catch(error => {
      console.error('注册请求错误:', error);
      showAlert('error', '网络错误，请稍后重试');
    })
    .finally(() => {
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
    });
  }

  // 显示指定部分 - 移到这里确保可以访问所有内部函数
  function showSection(sectionId) {
    console.log('显示部分:', sectionId, '用户信息:', userInfo);
    
    // 检查数据页面权限
    if (sectionId === 'data' && !userInfo) {
      console.log('未登录用户尝试访问数据页面');
      showSection('loginRequired');
      return;
    }

    // 隐藏所有面板
    const panels = document.querySelectorAll('.panel');
    panels.forEach(panel => {
      panel.classList.remove('active');
    });

    // 显示目标面板
    const targetPanel = document.getElementById(sectionId);
    if (targetPanel) {
      targetPanel.classList.add('active');
      console.log('显示面板成功:', sectionId);
    } else {
      console.error('找不到目标面板:', sectionId);
    }

    // 更新导航状态
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
      link.classList.remove('active');
    });
    
    const activeLink = document.querySelector(`[data-section="${sectionId}"]`);
    if (activeLink) {
      activeLink.classList.add('active');
    }

    // 如果切换到数据页面，加载数据
    if (sectionId === 'data' && userInfo) {
      console.log('准备加载投资数据...');
      loadInvestmentData();
    }
  }

  // 加载投资数据
  function loadInvestmentData() {
    if (isLoading || !userInfo) {
      console.log('跳过数据加载 - isLoading:', isLoading, 'userInfo:', !!userInfo);
      return;
    }

    console.log('开始加载投资数据，页码:', currentPage, '搜索:', currentSearch);
    isLoading = true;
    updateLoadingState(true);

    let url = `/api/investments?page=${currentPage}`;
    if (currentSearch) {
      url = `/api/investments/search?query=${encodeURIComponent(currentSearch)}&page=${currentPage}`;
    }

    const token = localStorage.getItem('authToken');
    const headers = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    fetch(url, { headers })
      .then(response => {
        console.log('数据请求响应状态:', response.status);
        if (!response.ok) {
          if (response.status === 401) {
            // Token过期或无效，重新登录
            localStorage.removeItem('authToken');
            localStorage.removeItem('userInfo');
            userInfo = null;
            updateUIForLoggedOutUser();
            showAlert('error', '登录已过期，请重新登录');
            showSection('welcome');
            return;
          }
          throw new Error(`HTTP ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        console.log('数据加载成功:', data);
        displayInvestmentData(data);
        updatePagination(data);
        updateDataStats(data);
      })
      .catch(error => {
        console.error('加载数据错误:', error);
        showAlert('error', '加载数据失败，请刷新页面重试');
        displayErrorState();
      })
      .finally(() => {
        isLoading = false;
        updateLoadingState(false);
      });
  }

  // 显示投资数据
  function displayInvestmentData(data) {
    if (!dataTableBody) return;

    dataTableBody.innerHTML = '';

    if (data.data && data.data.length > 0) {
      data.data.forEach(item => {
        const row = document.createElement('tr');
        
        let actionCell = '';
        if (userInfo && userInfo.role === 'admin') {
          actionCell = `
            <td>
              <button class="btn" onclick="editRecord(${item.id})" style="padding: 5px 10px; margin-right: 5px; font-size: 0.8rem;">编辑</button>
              <button class="btn btn-danger" onclick="deleteRecord(${item.id})" style="padding: 5px 10px; font-size: 0.8rem;">删除</button>
            </td>
          `;
        }

        row.innerHTML = `
          <td>${escapeHtml(item.company_name || '-')}</td>
          <td>${escapeHtml(truncateText(item.company_description || '-', 50))}</td>
          <td>${escapeHtml(item.funding_round || '-')}</td>
          <td>${escapeHtml(item.date || '-')}</td>
          <td>${escapeHtml(item.industry || '-')}</td>
          <td>${escapeHtml(item.investment_institution || '-')}</td>
          ${actionCell}
        `;
        
        dataTableBody.appendChild(row);
      });
    } else {
      displayNoDataState();
    }
  }

  // 显示无数据状态
  function displayNoDataState() {
    if (!dataTableBody) return;
    
    const message = currentSearch ? `未找到包含"${currentSearch}"的数据` : '暂无数据';
    const actionColumnCount = userInfo && userInfo.role === 'admin' ? 7 : 6;
    
    dataTableBody.innerHTML = `
      <tr>
        <td colspan="${actionColumnCount}" class="loading">
          ${message}
        </td>
      </tr>
    `;
  }

  // 显示错误状态
  function displayErrorState() {
    if (!dataTableBody) return;
    
    const actionColumnCount = userInfo && userInfo.role === 'admin' ? 7 : 6;
    dataTableBody.innerHTML = `
      <tr>
        <td colspan="${actionColumnCount}" class="loading" style="color: #e74c3c;">
          数据加载失败，请刷新页面重试
        </td>
      </tr>
    `;
  }

  // 更新分页信息 - 改进版本，带数字页码
  function updatePagination(data) {
    totalPages = data.totalPages || 1;
    
    // 更新页面信息文本
    if (pageInfo) {
      const total = data.total || 0;
      pageInfo.textContent = `第 ${currentPage} 页 / 共 ${totalPages} 页 (共 ${total} 条记录)`;
    }

    // 创建改进的分页控件
    createAdvancedPagination();
  }

  // 创建改进的分页控件
  function createAdvancedPagination() {
    const paginationContainer = document.querySelector('.pagination');
    if (!paginationContainer) return;
    
    // 清空现有内容
    paginationContainer.innerHTML = '';
    
    if (totalPages <= 1) {
      return;
    }
    
    const paginationWrapper = document.createElement('div');
    paginationWrapper.style.cssText = `
      display: flex;
      align-items: center;
      gap: 5px;
      flex-wrap: wrap;
      justify-content: center;
      margin: 20px 0;
    `;
    
    // 上一页按钮
    const prevBtn = document.createElement('button');
    prevBtn.textContent = '上一页';
    prevBtn.className = 'btn';
    prevBtn.disabled = currentPage === 1;
    prevBtn.onclick = () => {
      if (currentPage > 1) {
        currentPage--;
        loadInvestmentData();
      }
    };
    prevBtn.style.cssText = `
      padding: 8px 12px;
      margin: 2px;
      ${currentPage === 1 ? 'opacity: 0.5; cursor: not-allowed;' : ''}
    `;
    paginationWrapper.appendChild(prevBtn);
    
    // 计算显示的页码范围
    let startPage = Math.max(1, currentPage - 5);
    let endPage = Math.min(totalPages, currentPage + 4);
    
    // 如果总页数较少，显示所有页码
    if (totalPages <= 10) {
      startPage = 1;
      endPage = totalPages;
    }
    
    // 第一页
    if (startPage > 1) {
      const firstBtn = document.createElement('button');
      firstBtn.textContent = '1';
      firstBtn.className = 'btn';
      firstBtn.onclick = () => {
        currentPage = 1;
        loadInvestmentData();
      };
      firstBtn.style.cssText = `
        padding: 8px 12px;
        margin: 2px;
        min-width: 40px;
      `;
      paginationWrapper.appendChild(firstBtn);
      
      if (startPage > 2) {
        const dots1 = document.createElement('span');
        dots1.textContent = '...';
        dots1.style.cssText = 'padding: 8px 4px; color: #666;';
        paginationWrapper.appendChild(dots1);
      }
    }
    
    // 页码按钮
    for (let i = startPage; i <= endPage; i++) {
      const pageBtn = document.createElement('button');
      pageBtn.textContent = i;
      pageBtn.className = 'btn';
      pageBtn.onclick = () => {
        currentPage = i;
        loadInvestmentData();
      };
      
      const isActive = i === currentPage;
      pageBtn.style.cssText = `
        padding: 8px 12px;
        margin: 2px;
        min-width: 40px;
        ${isActive ? 'background-color: #007bff; color: white; font-weight: bold;' : ''}
      `;
      
      paginationWrapper.appendChild(pageBtn);
    }
    
    // 最后一页
    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        const dots2 = document.createElement('span');
        dots2.textContent = '...';
        dots2.style.cssText = 'padding: 8px 4px; color: #666;';
        paginationWrapper.appendChild(dots2);
      }
      
      const lastBtn = document.createElement('button');
      lastBtn.textContent = totalPages;
      lastBtn.className = 'btn';
      lastBtn.onclick = () => {
        currentPage = totalPages;
        loadInvestmentData();
      };
      lastBtn.style.cssText = `
        padding: 8px 12px;
        margin: 2px;
        min-width: 40px;
      `;
      paginationWrapper.appendChild(lastBtn);
    }
    
    // 下一页按钮
    const nextBtn = document.createElement('button');
    nextBtn.textContent = '下一页';
    nextBtn.className = 'btn';
    nextBtn.disabled = currentPage === totalPages;
    nextBtn.onclick = () => {
      if (currentPage < totalPages) {
        currentPage++;
        loadInvestmentData();
      }
    };
    nextBtn.style.cssText = `
      padding: 8px 12px;
      margin: 2px;
      ${currentPage === totalPages ? 'opacity: 0.5; cursor: not-allowed;' : ''}
    `;
    paginationWrapper.appendChild(nextBtn);
    
    // 页面信息
    const pageInfoDiv = document.createElement('div');
    pageInfoDiv.textContent = `第 ${currentPage} 页 / 共 ${totalPages} 页`;
    pageInfoDiv.style.cssText = `
      margin-left: 15px;
      color: #666;
      font-size: 0.9rem;
    `;
    paginationWrapper.appendChild(pageInfoDiv);
    
    paginationContainer.appendChild(paginationWrapper);
  }

  // 更新数据统计
  function updateDataStats(data) {
    const totalCount = document.getElementById('totalCount');
    if (totalCount) {
      totalCount.textContent = data.total || 0;
    }
  }

  // 更新加载状态
  function updateLoadingState(loading) {
    if (loading && dataTableBody) {
      const actionColumnCount = userInfo && userInfo.role === 'admin' ? 7 : 6;
      dataTableBody.innerHTML = `
        <tr>
          <td colspan="${actionColumnCount}" class="loading">
            正在加载数据...
          </td>
        </tr>
      `;
    }

    if (searchButton) searchButton.disabled = loading;
    if (prevPageBtn) prevPageBtn.disabled = loading || currentPage === 1;
    if (nextPageBtn) nextPageBtn.disabled = loading || currentPage === totalPages;
  }

  // 执行搜索
  function performSearch() {
    if (!searchInput) return;
    
    const query = searchInput.value.trim();
    currentSearch = query;
    currentPage = 1;
    
    if (clearSearchButton) {
      clearSearchButton.style.display = query ? 'inline-block' : 'none';
    }
    
    loadInvestmentData();
  }

  // 工具函数
  function showAlert(type, message) {
    console.log('显示提示:', type, message);
    
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    
    let bgColor, textColor, borderColor;
    switch(type) {
      case 'error':
        bgColor = '#f8d7da';
        textColor = '#721c24';
        borderColor = '#dc3545';
        break;
      case 'success':
        bgColor = '#d4edda';
        textColor = '#155724';
        borderColor = '#28a745';
        break;
      case 'warning':
        bgColor = '#fff3cd';
        textColor = '#856404';
        borderColor = '#ffc107';
        break;
      default:
        bgColor = '#d1ecf1';
        textColor = '#0c5460';
        borderColor = '#17a2b8';
    }
    
    alert.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${bgColor};
      color: ${textColor};
      padding: 15px 20px;
      border-radius: 8px;
      border-left: 4px solid ${borderColor};
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      z-index: 10000;
      max-width: 300px;
      word-wrap: break-word;
    `;
    alert.textContent = message;

    document.body.appendChild(alert);

    setTimeout(() => {
      if (alert.parentNode) {
        alert.parentNode.removeChild(alert);
      }
    }, type === 'warning' ? 5000 : 3000);
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }

  // 将showSection暴露为全局函数，但实际使用内部的版本
  window.showSection = showSection;

  // 退出登录 - 需要访问内部函数
  window.logout = function() {
    console.log('退出登录');
    if (confirm('确定要退出登录吗？')) {
      localStorage.removeItem('userInfo');
      localStorage.removeItem('authToken');
      userInfo = null;
      
      updateUIForLoggedOutUser();
      showAlert('success', '已退出登录');
      showSection('welcome');
    }
  };

  // 清空搜索 - 需要访问内部函数
  window.clearSearch = function() {
    if (searchInput) {
      searchInput.value = '';
    }
    if (clearSearchButton) {
      clearSearchButton.style.display = 'none';
    }
    
    currentSearch = '';
    currentPage = 1;
    loadInvestmentData();
  };
});

// 全局模态框函数 - 在DOMContentLoaded之前定义，确保HTML可以调用
window.showLoginModal = function() {
  console.log('showLoginModal被调用');
  const modal = document.getElementById('loginModal');
  if (modal) {
    modal.style.display = 'block';
    console.log('登录模态框已显示');
    // 清空表单
    const form = document.getElementById('loginForm');
    if (form) form.reset();
    // 聚焦到用户名输入框
    setTimeout(() => {
      const usernameInput = document.getElementById('loginUsername');
      if (usernameInput) usernameInput.focus();
    }, 100);
  } else {
    console.error('找不到登录模态框元素');
  }
};

window.showRegisterModal = function() {
  console.log('showRegisterModal被调用');
  const modal = document.getElementById('registerModal');
  if (modal) {
    modal.style.display = 'block';
    console.log('注册模态框已显示');
    // 清空表单
    const form = document.getElementById('registerForm');
    if (form) form.reset();
    // 聚焦到用户名输入框
    setTimeout(() => {
      const usernameInput = document.getElementById('registerUsername');
      if (usernameInput) usernameInput.focus();
    }, 100);
  } else {
    console.error('找不到注册模态框元素');
  }
};

window.closeModal = function(modalId) {
  console.log('关闭模态框:', modalId);
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.style.display = 'none';
    console.log('模态框已关闭');
  } else {
    console.error('找不到模态框元素:', modalId);
  }
};

window.editRecord = function(id) {
  alert(`编辑记录 ID: ${id} 的功能正在开发中`);
};

// 防复制保护功能 - 仅对普通用户生效
let copyProtectionActive = false;

function enableCopyProtection() {
  if (copyProtectionActive) return;
  
  console.log('🔒 启用数据保护模式');
  copyProtectionActive = true;
  
  // 为数据页面添加保护样式
  const dataSection = document.getElementById('data');
  if (dataSection) {
    dataSection.classList.add('copy-protected');
  }
  
  // 添加水印
  addDataWatermark();
  
  // 禁用右键菜单
  document.addEventListener('contextmenu', preventContextMenu, true);
  
  // 禁用键盘快捷键
  document.addEventListener('keydown', preventKeyboardShortcuts, true);
  
  // 禁用选择和复制
  document.addEventListener('selectstart', preventSelection, true);
  document.addEventListener('dragstart', preventDragStart, true);
  
  // 监听复制粘贴
  document.addEventListener('copy', showCopyWarning, true);
  document.addEventListener('cut', showCopyWarning, true);
  
  // 禁用打印
  window.addEventListener('beforeprint', preventPrint, true);
  
  // 监听开发者工具
  detectDevTools();
}

function disableCopyProtection() {
  if (!copyProtectionActive) return;
  
  console.log('🔓 关闭数据保护模式');
  copyProtectionActive = false;
  
  // 移除保护样式
  const dataSection = document.getElementById('data');
  if (dataSection) {
    dataSection.classList.remove('copy-protected');
  }
  
  // 移除水印
  removeDataWatermark();
  
  // 移除事件监听
  document.removeEventListener('contextmenu', preventContextMenu, true);
  document.removeEventListener('keydown', preventKeyboardShortcuts, true);
  document.removeEventListener('selectstart', preventSelection, true);
  document.removeEventListener('dragstart', preventDragStart, true);
  document.removeEventListener('copy', showCopyWarning, true);
  document.removeEventListener('cut', showCopyWarning, true);
  window.removeEventListener('beforeprint', preventPrint, true);
}

function preventContextMenu(e) {
  e.preventDefault();
  e.stopPropagation();
  showCopyWarning();
  return false;
}

function preventKeyboardShortcuts(e) {
  // 禁用复制、粘贴、全选等快捷键
  if (e.ctrlKey || e.metaKey) {
    const forbiddenKeys = ['a', 'c', 'v', 'x', 's', 'p', 'u', 'f', 'h', 'r', 'j'];
    if (forbiddenKeys.includes(e.key.toLowerCase())) {
      e.preventDefault();
      e.stopPropagation();
      showCopyWarning();
      return false;
    }
  }
  
  // 禁用F12、F5等功能键
  if ([112, 116, 123].includes(e.keyCode)) { // F1, F5, F12
    e.preventDefault();
    e.stopPropagation();
    showCopyWarning();
    return false;
  }
}

function preventSelection(e) {
  e.preventDefault();
  return false;
}

function preventDragStart(e) {
  e.preventDefault();
  return false;
}

function preventPrint(e) {
  e.preventDefault();
  showCopyWarning('禁止打印页面内容');
  return false;
}

function showCopyWarning(message = '数据受保护，禁止复制') {
  // 移除已存在的警告
  const existingWarning = document.querySelector('.copy-warning');
  if (existingWarning) {
    existingWarning.remove();
  }
  
  // 创建警告提示
  const warning = document.createElement('div');
  warning.className = 'copy-warning';
  warning.innerHTML = `
    <div style="display: flex; align-items: center; gap: 10px;">
      <span style="font-size: 20px;">🔒</span>
      <span>${message}</span>
    </div>
  `;
  
  document.body.appendChild(warning);
  
  // 3秒后自动消失
  setTimeout(() => {
    if (warning.parentNode) {
      warning.remove();
    }
  }, 3000);
}

function addDataWatermark() {
  removeDataWatermark(); // 确保不重复添加
  
  if (userInfo && userInfo.username) {
    const watermark = document.createElement('div');
    watermark.className = 'data-watermark';
    watermark.textContent = `${userInfo.username} - 数据保护`;
    watermark.id = 'data-watermark';
    document.body.appendChild(watermark);
  }
}

function removeDataWatermark() {
  const watermark = document.getElementById('data-watermark');
  if (watermark) {
    watermark.remove();
  }
}

function detectDevTools() {
  if (!copyProtectionActive) return;
  
  let devtools = { open: false, orientation: null };
  const threshold = 160;

  setInterval(() => {
    if (window.outerHeight - window.innerHeight > threshold || 
        window.outerWidth - window.innerWidth > threshold) {
      if (!devtools.open) {
        devtools.open = true;
        console.clear();
        console.log('%c🔒 数据受保护', 'color: red; font-size: 20px; font-weight: bold;');
        console.log('%c禁止查看或复制数据', 'color: red; font-size: 16px;');
        showCopyWarning('检测到开发者工具，请关闭');
      }
    } else {
      devtools.open = false;
    }
  }, 500);
}

// 在用户界面更新时应用保护
const originalUpdateUIForLoggedInUser = window.updateUIForLoggedInUser || (() => {});
window.updateUIForLoggedInUser = function() {
  // 调用原始函数
  if (typeof originalUpdateUIForLoggedInUser === 'function') {
    originalUpdateUIForLoggedInUser.call(this);
  }
  
  // 对普通用户启用保护
  if (userInfo && userInfo.role !== 'admin') {
    console.log('🔒 普通用户登录，启用数据保护');
    setTimeout(() => {
      enableCopyProtection();
    }, 1000);
  } else if (userInfo && userInfo.role === 'admin') {
    console.log('👑 管理员登录，不启用数据保护');
    disableCopyProtection();
  }
};

// 在退出登录时关闭保护
window.logout = function() {
  console.log('用户退出登录');
  
  disableCopyProtection();
  
  userInfo = null;
  localStorage.removeItem('userInfo');
  localStorage.removeItem('authToken');
  
  // 更新UI
  const updateUIForLoggedOutUser = window.updateUIForLoggedOutUser;
  if (typeof updateUIForLoggedOutUser === 'function') {
    updateUIForLoggedOutUser();
  }
  
  // 跳转到首页
  const showSection = window.showSection;
  if (typeof showSection === 'function') {
    showSection('welcome');
  }
  
  console.log('用户已退出登录');
};

window.deleteRecord = function(id) {
  if (!confirm('确定要删除这条记录吗？此操作不可撤销！')) return;
  
  const token = localStorage.getItem('authToken');
  if (!token) {
    showAlert('error', '请重新登录');
    return;
  }

  fetch(`/api/investments/${id}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
  .then(response => response.json())
  .then(data => {
    if (data.message) {
      alert('删除成功');
      // 重新加载数据需要触发内部的loadInvestmentData，暂时使用页面刷新
      location.reload();
    } else {
      alert(data.error || '删除失败');
    }
  })
  .catch(error => {
    console.error('删除错误:', error);
    alert('网络错误，删除失败');
  });
};

console.log('app.js 加载完成');