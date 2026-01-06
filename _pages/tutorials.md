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
    --card-radius: 16px;
    --card-bg: var(--global-bg-color);
    --card-border: var(--global-divider-color);
    --accent-color: var(--global-theme-color);
    --hover-shadow: 0 20px 40px -10px rgba(0,0,0,0.15);
  }

  /* ========== Hero 区域 ========== */
  .tutorials-hero {
    text-align: center;
    padding: 4rem 1rem 3rem;
    position: relative;
    overflow: hidden;
  }
  
  .hero-title {
    font-size: clamp(2rem, 5vw, 3rem);
    font-weight: 800;
    margin-bottom: 1rem;
    background: linear-gradient(135deg, var(--global-text-color), var(--accent-color));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    display: inline-flex;
    align-items: center;
    gap: 1rem;
  }

  .hero-subtitle {
    font-size: 1.2rem;
    color: var(--global-text-color-light);
    max-width: 600px;
    margin: 0 auto;
  }

  /* ========== 教程卡片网格 ========== */
  .tutorials-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 2rem;
    padding: 1rem 0 3rem;
    max-width: 1200px;
    margin: 0 auto;
  }

  .tutorial-card {
    position: relative;
    background: var(--card-bg);
    border: 1px solid var(--card-border);
    border-radius: var(--card-radius);
    overflow: hidden;
    cursor: pointer;
    transition: all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1);
    display: flex;
    flex-direction: column;
  }

  .tutorial-card:hover {
    transform: translateY(-8px);
    box-shadow: var(--hover-shadow);
    border-color: var(--accent-color);
  }

  .card-cover {
    height: 180px;
    width: 100%;
    position: relative;
    overflow: hidden;
    background: var(--global-code-bg-color);
  }

  .card-cover img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.6s ease;
  }

  .tutorial-card:hover .card-cover img {
    transform: scale(1.05);
  }

  .card-placeholder {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--accent-color);
    opacity: 0.2;
    font-size: 3rem;
  }

  .card-content {
    padding: 1.5rem;
    flex: 1;
    display: flex;
    flex-direction: column;
  }

  .card-status {
    position: absolute;
    top: 12px;
    right: 12px;
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(4px);
    color: white;
    font-size: 0.75rem;
    padding: 4px 10px;
    border-radius: 20px;
    font-weight: 600;
  }

  .card-title {
    font-size: 1.25rem;
    font-weight: 700;
    margin: 0 0 0.5rem 0;
    color: var(--global-text-color);
  }

  .card-desc {
    font-size: 0.9rem;
    color: var(--global-text-color-light);
    line-height: 1.6;
    margin-bottom: 1.5rem;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .card-meta {
    margin-top: auto;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.85rem;
    color: var(--global-text-color-light);
    font-weight: 500;
  }

  .card-meta i {
    color: var(--accent-color);
  }

  /* ========== 详情面板 - 重新设计 ========== */
  .details-panel {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.7);
    backdrop-filter: blur(12px);
    z-index: 9999;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.35s ease;
  }

  .details-panel.active {
    opacity: 1;
    pointer-events: auto;
  }

  .details-container {
    width: 92%;
    max-width: 720px;
    max-height: 90vh;
    background: linear-gradient(165deg, rgba(30, 32, 40, 0.98) 0%, rgba(20, 22, 28, 0.99) 100%);
    border-radius: 24px;
    box-shadow: 
      0 0 0 1px rgba(255, 255, 255, 0.08),
      0 25px 80px -12px rgba(0, 0, 0, 0.6),
      0 0 100px -20px var(--accent-color);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    transform: translateY(30px) scale(0.92);
    transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  .details-panel.active .details-container {
    transform: translateY(0) scale(1);
  }

  /* 顶部封面区域 */
  .details-hero {
    position: relative;
    height: 200px;
    overflow: hidden;
  }

  .details-hero-bg {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-size: cover;
    background-position: center;
    filter: blur(0px);
    transform: scale(1.1);
  }

  .details-hero-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: linear-gradient(
      180deg,
      rgba(20, 22, 28, 0) 0%,
      rgba(20, 22, 28, 0.4) 50%,
      rgba(20, 22, 28, 0.95) 100%
    );
  }

  /* 关闭按钮 */
  .details-close-btn {
    position: absolute;
    top: 16px;
    right: 16px;
    width: 40px;
    height: 40px;
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(8px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.1rem;
    color: rgba(255, 255, 255, 0.8);
    cursor: pointer;
    transition: all 0.25s ease;
    z-index: 10;
  }

  .details-close-btn:hover {
    background: rgba(255, 255, 255, 0.15);
    color: #fff;
    transform: rotate(90deg);
  }

  /* 状态标签 */
  .details-status {
    position: absolute;
    top: 16px;
    left: 16px;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 14px;
    background: var(--accent-color);
    border-radius: 20px;
    font-size: 0.75rem;
    font-weight: 600;
    color: #fff;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    z-index: 10;
  }

  /* 信息区域 */
  .details-info {
    position: relative;
    padding: 0 2rem 1.5rem;
    margin-top: -50px;
    z-index: 5;
  }

  .details-title {
    font-size: 1.6rem;
    font-weight: 700;
    color: #fff;
    margin: 0 0 0.75rem;
    line-height: 1.3;
  }

  .details-desc {
    font-size: 0.95rem;
    color: rgba(255, 255, 255, 0.6);
    line-height: 1.7;
    margin: 0 0 1.25rem;
  }

  .details-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 1.25rem;
  }

  .meta-item {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.85rem;
    color: rgba(255, 255, 255, 0.5);
  }

  .meta-item i {
    color: var(--accent-color);
    font-size: 0.9rem;
  }

  .meta-item strong {
    color: rgba(255, 255, 255, 0.9);
    font-weight: 600;
  }

  /* 分隔线 */
  .details-divider {
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
    margin: 0 2rem;
  }

  /* 章节列表区域 */
  .details-body {
    padding: 1.5rem 1.5rem 2rem;
    overflow-y: auto;
    flex: 1;
  }

  .chapter-section-title {
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    color: rgba(255, 255, 255, 0.4);
    margin: 0 0.5rem 1rem;
    font-weight: 600;
  }

  .chapter-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .chapter-link {
    display: flex;
    align-items: center;
    padding: 14px 18px;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 14px;
    text-decoration: none;
    color: rgba(255, 255, 255, 0.85);
    transition: all 0.25s ease;
    position: relative;
    overflow: hidden;
  }

  .chapter-link::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    height: 100%;
    width: 3px;
    background: var(--accent-color);
    opacity: 0;
    transition: opacity 0.25s ease;
  }

  .chapter-link:hover {
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(var(--global-theme-color-rgb, 100, 181, 246), 0.3);
    transform: translateX(6px);
    text-decoration: none;
  }

  .chapter-link:hover::before {
    opacity: 1;
  }

  .chapter-num {
    width: 32px;
    height: 32px;
    background: linear-gradient(135deg, var(--accent-color), rgba(var(--global-theme-color-rgb, 100, 181, 246), 0.7));
    color: white;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.85rem;
    font-weight: 700;
    margin-right: 14px;
    flex-shrink: 0;
    box-shadow: 0 4px 12px -2px rgba(var(--global-theme-color-rgb, 100, 181, 246), 0.4);
  }

  .chapter-title {
    flex: 1;
    font-size: 0.95rem;
    font-weight: 500;
  }

  .chapter-arrow {
    opacity: 0.3;
    font-size: 0.85rem;
    transition: all 0.25s ease;
  }

  .chapter-link:hover .chapter-arrow {
    opacity: 1;
    transform: translateX(4px);
    color: var(--accent-color);
  }

  /* 自定义滚动条 */
  .details-body::-webkit-scrollbar {
    width: 6px;
  }

  .details-body::-webkit-scrollbar-track {
    background: transparent;
  }

  .details-body::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.15);
    border-radius: 3px;
  }

  .details-body::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.25);
  }

  /* ========== 计划内容区 ========== */
  .section-divider {
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 4rem 0;
    color: var(--global-divider-color);
  }
  
  .section-divider::before,
  .section-divider::after {
    content: "";
    height: 1px;
    background: currentColor;
    flex: 1;
    margin: 0 1rem;
    opacity: 0.3;
  }

  .planned-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1.5rem;
    padding-bottom: 2rem;
  }

  .planned-card {
    background: var(--global-code-bg-color);
    border: 1px dashed var(--global-divider-color);
    border-radius: 16px;
    padding: 1.5rem;
    display: flex;
    align-items: center;
    gap: 1rem;
    transition: all 0.3s;
  }

  .planned-card:hover {
    border-style: solid;
    border-color: var(--accent-color);
    background: var(--card-bg);
    transform: translateY(-5px);
  }

  .planned-icon {
    font-size: 1.5rem;
    width: 50px;
    height: 50px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(var(--global-theme-color-rgb), 0.1);
    color: var(--accent-color);
    border-radius: 12px;
  }

  /* ========== 移动端适配 ========== */
  @media (max-width: 768px) {
    .details-container {
      width: 95%;
      max-height: 92vh;
      border-radius: 20px;
    }

    .details-hero {
      height: 160px;
    }

    .details-info {
      padding: 0 1.5rem 1.25rem;
      margin-top: -40px;
    }

    .details-title {
      font-size: 1.35rem;
    }

    .details-body {
      padding: 1.25rem;
    }

    .chapter-link {
      padding: 12px 14px;
    }

    .chapter-num {
      width: 28px;
      height: 28px;
      font-size: 0.8rem;
    }
  }

  @media (max-width: 480px) {
    .details-hero {
      height: 140px;
    }

    .details-close-btn {
      width: 36px;
      height: 36px;
      top: 12px;
      right: 12px;
    }

    .details-meta {
      gap: 0.75rem;
    }

    .meta-item {
      font-size: 0.8rem;
    }
  }
</style>

<div class="tutorials-hero">
  <h1 class="hero-title">
    <i class="fas fa-graduation-cap"></i>
    教程系列
  </h1>
  <p class="hero-subtitle">系统化的技术学习路径，从入门到精通的完整知识体系。</p>
</div>

<div class="tutorials-grid">
  {% assign tutorial_series = site.data.tutorials %}
  {% for series in tutorial_series %}
  <div class="tutorial-card" onclick="openDetails('detail-modal-{{ forloop.index }}')">
    <div class="card-cover">
      {% if series.image %}
        <img src="{{ series.image | relative_url }}" alt="{{ series.title }}" loading="lazy">
      {% else %}
        <div class="card-placeholder">
          <i class="fas fa-book-open"></i>
        </div>
      {% endif %}
      
      {% if series.status %}
        <span class="card-status">{{ series.status }}</span>
      {% endif %}
    </div>
    
    <div class="card-content">
      <h3 class="card-title">{{ series.title }}</h3>
      <p class="card-desc">{{ series.description }}</p>
      
      <div class="card-meta">
        <i class="fas fa-list-ul"></i>
        <span>{{ series.chapters.size }} 章节</span>
      </div>
    </div>
  </div>
  {% endfor %}
</div>

<div id="modal-container">
  {% for series in tutorial_series %}
  <div class="details-panel" id="detail-modal-{{ forloop.index }}" onclick="closeDetails(event)">
    <div class="details-container" onclick="event.stopPropagation()">
      
      <!-- 顶部封面 -->
      <div class="details-hero">
        {% if series.image %}
          <div class="details-hero-bg" style="background-image: url('{{ series.image | relative_url }}');"></div>
        {% else %}
          <div class="details-hero-bg" style="background: linear-gradient(135deg, #1a1c24 0%, #2d3142 100%);"></div>
        {% endif %}
        <div class="details-hero-overlay"></div>
        
        {% if series.status %}
          <div class="details-status">
            <i class="fas fa-circle" style="font-size: 6px;"></i>
            {{ series.status }}
          </div>
        {% endif %}
        
        <button class="details-close-btn" onclick="closeDetailsDirect('detail-modal-{{ forloop.index }}')">
          <i class="fas fa-times"></i>
        </button>
      </div>
      
      <!-- 信息区域 -->
      <div class="details-info">
        <h2 class="details-title">{{ series.title }}</h2>
        <p class="details-desc">{{ series.description }}</p>
        
        <div class="details-meta">
          <div class="meta-item">
            <i class="fas fa-book-reader"></i>
            <span>共 <strong>{{ series.chapters.size }}</strong> 节课程</span>
          </div>
          <div class="meta-item">
            <i class="fas fa-clock"></i>
            <span>预计 <strong>{{ series.chapters.size | times: 15 }}</strong> 分钟</span>
          </div>
        </div>
      </div>
      
      <div class="details-divider"></div>
      
      <!-- 章节列表 -->
      <div class="details-body">
        <div class="chapter-section-title">课程目录</div>
        <div class="chapter-list">
          {% for chapter in series.chapters %}
          <a href="{{ series.base_url }}/{{ chapter.file | remove: '.md' }}/" class="chapter-link">
            <span class="chapter-num">{{ forloop.index }}</span>
            <span class="chapter-title">{{ chapter.title }}</span>
            <i class="fas fa-chevron-right chapter-arrow"></i>
          </a>
          {% endfor %}
        </div>
      </div>
      
    </div>
  </div>
  {% endfor %}
</div>

<div class="section-divider">
  <span style="background: var(--global-bg-color); padding: 0 1rem; font-weight: bold;">
    <i class="fas fa-hourglass-half"></i> 筹备中
  </span>
</div>

<div class="planned-grid">
  <div class="planned-card">
    <div class="planned-icon"><i class="fas fa-palette"></i></div>
    <div>
      <h4 style="margin:0 0 0.3rem">Shader 入门</h4>
      <p style="margin:0; font-size:0.85rem; opacity:0.7">着色器编程基础</p>
    </div>
  </div>
  <div class="planned-card">
    <div class="planned-icon"><i class="fas fa-bolt"></i></div>
    <div>
      <h4 style="margin:0 0 0.3rem">Unity URP</h4>
      <p style="margin:0; font-size:0.85rem; opacity:0.7">渲染管线详解</p>
    </div>
  </div>
  <div class="planned-card">
    <div class="planned-icon"><i class="fas fa-magic"></i></div>
    <div>
      <h4 style="margin:0 0 0.3rem">卡通渲染</h4>
      <p style="margin:0; font-size:0.85rem; opacity:0.7">NPR技术解析</p>
    </div>
  </div>
</div>

<script>
// 打开模态框
function openDetails(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
}

// 关闭模态框 (点击背景)
function closeDetails(event) {
  if (event.target.classList.contains('details-panel')) {
    event.target.classList.remove('active');
    document.body.style.overflow = '';
  }
}

// 关闭模态框 (按钮)
function closeDetailsDirect(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }
}

// 键盘 ESC 关闭
document.addEventListener('keydown', function(event) {
  if (event.key === "Escape") {
    const activeModals = document.querySelectorAll('.details-panel.active');
    activeModals.forEach(modal => {
      modal.classList.remove('active');
    });
    document.body.style.overflow = '';
  }
});
</script>