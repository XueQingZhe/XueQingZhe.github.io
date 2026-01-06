---
layout: page
permalink: /tutorials/
title: tutorials
description: 技术分享与教程
nav: true
nav_order: 5
---

<style>
  :root {
    /* 专业配色方案：克制、冷静 */
    --tech-bg: var(--global-bg-color);
    --tech-card-bg: var(--global-bg-color); /* 或者稍微亮一点的颜色 */
    --tech-border: var(--global-divider-color);
    --tech-primary: var(--global-theme-color); /* 使用博客主色调 */
    --tech-text-main: var(--global-text-color);
    --tech-text-sub: var(--global-text-color-light);
    
    /* 阴影层次 */
    --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
    --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  }

  /* ========== 头部区域 ========== */
  .tech-hero {
    padding: 4rem 0 3rem;
    border-bottom: 1px solid var(--tech-border);
    margin-bottom: 3rem;
  }

  .tech-title {
    font-size: 2.5rem;
    font-weight: 700;
    color: var(--tech-text-main);
    margin-bottom: 0.75rem;
    letter-spacing: -0.02em;
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .tech-subtitle {
    font-size: 1.1rem;
    color: var(--tech-text-sub);
    line-height: 1.6;
    max-width: 600px;
  }

  /* ========== 网格布局 ========== */
  .tech-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 2rem;
    margin-bottom: 5rem;
  }

  /* ========== 专业卡片样式 ========== */
  .tech-card {
    background: var(--tech-card-bg);
    border: 1px solid var(--tech-border);
    border-radius: 8px;
    overflow: hidden;
    transition: all 0.2s ease-in-out;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    position: relative;
  }

  /* 悬停效果：仅轻微上浮和加深阴影，不乱动 */
  .tech-card:hover {
    transform: translateY(-4px);
    box-shadow: var(--shadow-lg);
    border-color: var(--tech-primary);
  }

  .card-img-box {
    height: 160px;
    width: 100%;
    background: var(--global-code-bg-color); /* 这里的背景色可以根据你的深浅色模式自动变 */
    position: relative;
    border-bottom: 1px solid var(--tech-border);
    overflow: hidden;
  }

  .card-img-box img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.5s ease;
  }
  
  .tech-card:hover .card-img-box img {
    transform: scale(1.05);
  }

  /* 如果没有图片的占位符 */
  .card-placeholder {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--tech-text-sub);
    opacity: 0.3;
  }

  .card-status {
    position: absolute;
    top: 12px;
    right: 12px;
    background: rgba(0,0,0,0.7);
    color: #fff;
    font-size: 0.7rem;
    padding: 3px 8px;
    border-radius: 4px;
    font-weight: 500;
    backdrop-filter: blur(4px);
  }

  .card-body {
    padding: 1.5rem;
    flex: 1;
    display: flex;
    flex-direction: column;
  }

  .card-title {
    font-size: 1.15rem;
    font-weight: 600;
    color: var(--tech-text-main);
    margin: 0 0 0.5rem 0;
  }

  .card-desc {
    font-size: 0.9rem;
    color: var(--tech-text-sub);
    line-height: 1.6;
    margin-bottom: 1.5rem;
    display: -webkit-box;
    -webkit-line-clamp: 2; /* 限制2行 */
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .card-meta {
    margin-top: auto;
    padding-top: 1rem;
    border-top: 1px dashed var(--tech-border);
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.85rem;
    color: var(--tech-text-sub);
  }

  .card-meta i {
    color: var(--tech-primary);
    margin-right: 0.4rem;
  }

  /* ========== 弹窗 (Modal) - 稳定版 ========== */
  .modal-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.5); /* 纯粹的半透明黑，不用太复杂的模糊 */
    z-index: 9999;
    display: flex; /* Flex 居中 */
    align-items: center;
    justify-content: center;
    opacity: 0;
    visibility: hidden;
    transition: all 0.2s ease;
  }

  .modal-backdrop.active {
    opacity: 1;
    visibility: visible;
  }

  .modal-panel {
    width: 90%;
    max-width: 800px;
    max-height: 85vh;
    background: var(--tech-bg);
    border-radius: 8px;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
    display: flex;
    flex-direction: column;
    transform: scale(0.98);
    transition: transform 0.2s ease;
    border: 1px solid var(--tech-border);
    position: relative; /* 确保 z-index 上下文正确 */
  }

  .modal-backdrop.active .modal-panel {
    transform: scale(1);
  }

  .modal-header {
    padding: 1.5rem 2rem;
    border-bottom: 1px solid var(--tech-border);
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: var(--global-code-bg-color); /* 轻微区分头部 */
  }

  .modal-header h3 {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 600;
  }

  .close-btn {
    background: none;
    border: none;
    font-size: 1.5rem;
    color: var(--tech-text-sub);
    cursor: pointer;
    padding: 0.5rem;
    line-height: 1;
    transition: color 0.2s;
  }

  .close-btn:hover {
    color: var(--tech-primary);
  }

  .modal-content {
    padding: 0; /* 列表直接贴边或者留白 */
    overflow-y: auto;
    flex: 1;
  }

  /* 章节列表 - 类似文件浏览器的感觉 */
  .chapter-list {
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .chapter-link {
    display: flex;
    align-items: center;
    padding: 1rem 2rem;
    border-bottom: 1px solid var(--tech-border);
    text-decoration: none;
    color: var(--tech-text-main);
    transition: background 0.1s;
    /* 关键：确保它是块级交互区域 */
    position: relative; 
    z-index: 10; 
  }

  .chapter-link:hover {
    background: rgba(var(--global-theme-color-rgb), 0.05); /* 极淡的主题色背景 */
    text-decoration: none;
    color: var(--tech-primary);
  }

  .chapter-index {
    font-family: monospace;
    color: var(--tech-text-sub);
    width: 2.5rem;
    font-size: 1.1rem;
    opacity: 0.6;
  }

  .chapter-name {
    flex: 1;
    font-weight: 500;
  }

  .chapter-arrow {
    opacity: 0.3;
    font-size: 0.9rem;
  }
  
  .chapter-link:hover .chapter-arrow {
    opacity: 1;
    color: var(--tech-primary);
  }

  /* ========== 计划中模块 (Mini List) ========== */
  .planned-section {
    border-top: 1px solid var(--tech-border);
    padding-top: 3rem;
  }
  
  .planned-header {
    font-size: 1rem;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: var(--tech-text-sub);
    margin-bottom: 1.5rem;
    font-weight: 600;
  }

  .planned-list {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1.5rem;
  }

  .planned-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 1rem;
    background: var(--global-code-bg-color);
    border-radius: 6px;
    color: var(--tech-text-sub);
    border: 1px dashed var(--tech-border);
  }

  .planned-item i {
    color: var(--tech-text-sub);
    opacity: 0.5;
  }

  /* 移动端适配 */
  @media (max-width: 768px) {
    .tech-title { font-size: 1.8rem; }
    .modal-panel { width: 100%; height: 100%; max-height: 100%; border-radius: 0; }
    .chapter-link { padding: 1.2rem; }
  }
</style>

<div class="tech-hero">
  <h1 class="tech-title">
    <i class="fas fa-book-reader" style="color: var(--tech-primary);"></i>
    Tutorials
  </h1>
  <p class="tech-subtitle">
    系统化的技术专栏。这里汇总了按系列编写的深度教程，旨在提供完整的知识路径，而非碎片化的技巧。
  </p>
</div>

<div class="tech-grid">
  {% assign tutorial_series = site.data.tutorials %}
  {% for series in tutorial_series %}
  <div class="tech-card" onclick="openModal('modal-{{ forloop.index }}')">
    <div class="card-img-box">
      {% if series.image %}
      <img src="{{ series.image | relative_url }}" alt="{{ series.title }}" loading="lazy">
      {% else %}
      <div class="card-placeholder">
        <i class="fas fa-terminal fa-3x"></i>
      </div>
      {% endif %}
      
      {% if series.status %}
      <span class="card-status">{{ series.status }}</span>
      {% endif %}
    </div>
    
    <div class="card-body">
      <h3 class="card-title">{{ series.title }}</h3>
      <p class="card-desc">{{ series.description }}</p>
      
      <div class="card-meta">
        <span><i class="fas fa-list"></i> {{ series.chapters.size }} 章节</span>
        <span><i class="fas fa-arrow-right" style="font-size: 0.8em;"></i></span>
      </div>
    </div>
  </div>
  {% endfor %}
</div>

<div class="planned-section">
  <h4 class="planned-header"><i class="fas fa-hourglass-half"></i> Writing Plan</h4>
  <div class="planned-list">
    <div class="planned-item">
      <i class="fas fa-cube"></i>
      <span>Unity Shader 进阶</span>
    </div>
    <div class="planned-item">
      <i class="fas fa-project-diagram"></i>
      <span>设计模式实战</span>
    </div>
    <div class="planned-item">
      <i class="fas fa-gamepad"></i>
      <span>游戏服务器架构</span>
    </div>
  </div>
</div>

{% for series in tutorial_series %}
<div class="modal-backdrop" id="modal-{{ forloop.index }}" onclick="closeModal(event)">
  <div class="modal-panel" onclick="event.stopPropagation()">
    <div class="modal-header">
      <h3>{{ series.title }}</h3>
      <button class="close-btn" onclick="closeModalDirect('modal-{{ forloop.index }}')">
        <i class="fas fa-times"></i>
      </button>
    </div>
    
    <div class="modal-content">
      <div class="chapter-list">
        {% for chapter in series.chapters %}
        <a href="{{ series.base_url }}/{{ chapter.file | remove: '.md' }}/" class="chapter-link">
          <span class="chapter-index">{{ forloop.index | prepend: '0' | slice: -2, 2 }}</span>
          <span class="chapter-name">{{ chapter.title }}</span>
          <i class="fas fa-chevron-right chapter-arrow"></i>
        </a>
        {% endfor %}
      </div>
    </div>
  </div>
</div>
{% endfor %}

<script>
// 打开弹窗
function openModal(id) {
  const modal = document.getElementById(id);
  if(modal) {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden'; // 锁住背景滚动
  }
}

// 点击背景关闭
function closeModal(event) {
  // 只有直接点击 backdrop 层才关闭
  if (event.target.classList.contains('modal-backdrop')) {
    event.target.classList.remove('active');
    document.body.style.overflow = '';
  }
}

// 按钮直接关闭
function closeModalDirect(id) {
  const modal = document.getElementById(id);
  if(modal) {
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }
}

// 键盘 ESC 关闭
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    const actives = document.querySelectorAll('.modal-backdrop.active');
    actives.forEach(m => {
      m.classList.remove('active');
    });
    document.body.style.overflow = '';
  }
});
</script>