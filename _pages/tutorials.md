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

  /* ========== 详情面板 (折叠动画) ========== */
  .details-panel {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(5px);
    z-index: 9999;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.3s ease;
  }

  .details-panel.active {
    opacity: 1;
    pointer-events: auto;
  }

  .details-container {
    width: 90%;
    max-width: 900px;
    max-height: 85vh;
    background: var(--global-bg-color);
    border-radius: 24px;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    transform: translateY(20px) scale(0.95);
    transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  .details-panel.active .details-container {
    transform: translateY(0) scale(1);
  }

  .details-header {
    padding: 2rem;
    background: var(--global-code-bg-color);
    display: flex;
    gap: 2rem;
    align-items: flex-start;
    position: relative;
    border-bottom: 1px solid var(--global-divider-color);
  }

  .details-thumb {
    width: 120px;
    height: 160px;
    border-radius: 12px;
    overflow: hidden;
    flex-shrink: 0;
    box-shadow: 0 8px 16px rgba(0,0,0,0.1);
  }
  
  .details-thumb img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .details-info {
    flex: 1;
  }

  .details-info h2 {
    margin: 0 0 0.5rem;
    font-size: 1.8rem;
  }

  .details-close-btn {
    position: absolute;
    top: 1.5rem;
    right: 1.5rem;
    background: transparent;
    border: none;
    font-size: 1.5rem;
    color: var(--global-text-color-light);
    cursor: pointer;
    transition: color 0.2s;
  }

  .details-close-btn:hover {
    color: var(--accent-color);
  }

  .details-body {
    padding: 2rem;
    overflow-y: auto;
  }

  .chapter-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: grid;
    gap: 0.75rem;
  }

  .chapter-link {
    display: flex;
    align-items: center;
    padding: 1rem 1.5rem;
    background: var(--global-bg-color);
    border: 1px solid var(--global-divider-color);
    border-radius: 12px;
    text-decoration: none;
    color: var(--global-text-color);
    transition: all 0.2s;
  }

  .chapter-link:hover {
    border-color: var(--accent-color);
    transform: translateX(5px);
    background: var(--global-code-bg-color);
    text-decoration: none;
  }

  .chapter-num {
    width: 28px;
    height: 28px;
    background: var(--accent-color);
    color: white;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.8rem;
    font-weight: bold;
    margin-right: 1rem;
    flex-shrink: 0;
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

  /* 移动端适配 */
  @media (max-width: 768px) {
    .details-header {
      flex-direction: column;
      align-items: center;
      text-align: center;
      padding: 1.5rem;
    }
    .details-thumb {
      width: 100px;
      height: 100px;
      border-radius: 50%;
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
      <div class="details-header">
        <button class="details-close-btn" onclick="closeDetailsDirect('detail-modal-{{ forloop.index }}')">
          <i class="fas fa-times"></i>
        </button>
        
        <div class="details-thumb">
          {% if series.image %}
            <img src="{{ series.image | relative_url }}" alt="{{ series.title }}">
          {% else %}
            <div class="card-placeholder" style="font-size: 2rem;">
              <i class="fas fa-book"></i>
            </div>
          {% endif %}
        </div>
        
        <div class="details-info">
          <h2>{{ series.title }}</h2>
          <p>{{ series.description }}</p>
          <div style="margin-top: 1rem; color: var(--accent-color); font-weight: bold;">
            <i class="fas fa-book-reader"></i> 共 {{ series.chapters.size }} 节课程
          </div>
        </div>
      </div>
      
      <div class="details-body">
        <div class="chapter-list">
          {% for chapter in series.chapters %}
          <a href="{{ series.base_url }}/{{ chapter.file | remove: '.md' }}/" class="chapter-link">
            <span class="chapter-num">{{ forloop.index }}</span>
            <span class="chapter-title">{{ chapter.title }}</span>
            <i class="fas fa-arrow-right" style="margin-left: auto; opacity: 0.5;"></i>
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
    document.body.style.overflow = 'hidden'; // 禁止背景滚动
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