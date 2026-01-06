---
layout: page
permalink: /tutorials/
title: tutorials
description: 技术分享与教程
nav: true
nav_order: 5
---

<!-- 页面头部 -->
<div class="tutorials-hero">
  <h1 class="hero-title">
    <i class="fas fa-graduation-cap"></i>
    教程系列
  </h1>
  <p class="hero-subtitle">系统化的技术学习路径</p>
</div>

<!-- 弧形轮播区域 -->
<div class="arc-carousel-area">
  <div class="arc-track">
    {% assign tutorial_series = site.data.tutorials %}
    
    {% for series in tutorial_series %}
    <div class="arc-thumbnail" 
         data-id="{{ forloop.index }}"
         onmouseenter="showPreviewCard({{ forloop.index }})"
         onmouseleave="hidePreviewCard({{ forloop.index }})"
         onclick="toggleChapters({{ forloop.index }})">
      <div class="thumb-inner">
        {% if series.image %}
        <img src="{{ series.image | relative_url }}" alt="{{ series.title }}">
        {% else %}
        <div class="thumb-placeholder">
          <i class="fas fa-book-open"></i>
        </div>
        {% endif %}
        
        {% if series.status %}
        <span class="thumb-badge badge-{{ series.status_color }}">
          <i class="fas fa-circle"></i>
        </span>
        {% endif %}
      </div>
      
      <!-- 悬停预览卡片 -->
      <div class="preview-card" id="preview-{{ forloop.index }}">
        <div class="preview-image-area">
          {% if series.image %}
          <img src="{{ series.image | relative_url }}" alt="{{ series.title }}">
          {% else %}
          <div class="preview-placeholder">
            <i class="fas fa-book-open fa-3x"></i>
          </div>
          {% endif %}
        </div>
        
        <div class="preview-info">
          <h3 class="preview-title">{{ series.title }}</h3>
          {% if series.status %}
          <span class="preview-status badge-{{ series.status_color }}">
            <i class="fas fa-circle"></i>
            {{ series.status }}
          </span>
          {% endif %}
          <p class="preview-desc">{{ series.description }}</p>
          <div class="preview-meta">
            <i class="fas fa-list"></i>
            {{ series.chapters.size }} 章节
          </div>
          <div class="preview-hint">
            <i class="fas fa-mouse-pointer"></i>
            点击查看完整目录
          </div>
        </div>
      </div>
    </div>
    {% endfor %}
  </div>
  
  <!-- 左右滚动按钮 -->
  <button class="scroll-btn scroll-left" onclick="scrollArc('left')">
    <i class="fas fa-chevron-left"></i>
  </button>
  <button class="scroll-btn scroll-right" onclick="scrollArc('right')">
    <i class="fas fa-chevron-right"></i>
  </button>
</div>

<!-- 展开的章节目录区域 -->
<div class="chapters-expand-area" id="chaptersArea">
  {% for series in tutorial_series %}
  <div class="chapters-panel" id="chapters-{{ forloop.index }}" style="display: none;">
    <div class="panel-header">
      <div class="header-left">
        <i class="fas fa-list-ul"></i>
        <h3>{{ series.title }} - 章节列表</h3>
        <span class="chapter-count">{{ series.chapters.size }}</span>
      </div>
      <button class="close-btn" onclick="closeChapters({{ forloop.index }})">
        <i class="fas fa-times"></i>
        收起
      </button>
    </div>
    
    <div class="chapters-list">
      {% for chapter in series.chapters %}
      <a href="{{ series.base_url }}/{{ chapter.file | remove: '.md' }}/" class="chapter-bar">
        <span class="bar-num">{{ forloop.index }}</span>
        <span class="bar-text">{{ chapter.title }}</span>
        <i class="fas fa-arrow-right bar-arrow"></i>
      </a>
      {% endfor %}
    </div>
  </div>
  {% endfor %}
</div>

<div class="section-divider">
  <span class="divider-icon"><i class="fas fa-ellipsis-h"></i></span>
</div>

<div class="planned-section">
  <div class="section-header">
    <h2 class="section-title">
      <i class="fas fa-calendar-check"></i>
      计划内容
    </h2>
    <p class="section-subtitle">正在筹备中,敬请期待...</p>
  </div>
  
  <div class="planned-grid">
    <div class="planned-item">
      <div class="planned-icon gradient-1">🎨</div>
      <div class="planned-content">
        <h4 class="planned-title">Shader 基础入门系列</h4>
        <p class="planned-desc">从零开始学习着色器编程</p>
      </div>
    </div>
    
    <div class="planned-item">
      <div class="planned-icon gradient-2">⚡</div>
      <div class="planned-content">
        <h4 class="planned-title">Unity URP 渲染管线详解</h4>
        <p class="planned-desc">深入理解可编程渲染管线</p>
      </div>
    </div>
    
    <div class="planned-item">
      <div class="planned-icon gradient-3">🎭</div>
      <div class="planned-content">
        <h4 class="planned-title">卡通渲染实现指南</h4>
        <p class="planned-desc">二次元风格渲染技术解析</p>
      </div>
    </div>
    
    <div class="planned-item">
      <div class="planned-icon gradient-4">💎</div>
      <div class="planned-content">
        <h4 class="planned-title">PBR 工作流完整教程</h4>
        <p class="planned-desc">物理渲染从理论到实践</p>
      </div>
    </div>
  </div>
</div>

<script>
let currentOpenPanel = null;

function scrollArc(direction) {
  const track = document.querySelector('.arc-track');
  const scrollAmount = 250;
  
  if (direction === 'left') {
    track.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
  } else {
    track.scrollBy({ left: scrollAmount, behavior: 'smooth' });
  }
}

function showPreviewCard(id) {
  const preview = document.getElementById(`preview-${id}`);
  if (preview) {
    preview.style.display = 'flex';
    setTimeout(() => {
      preview.classList.add('visible');
    }, 10);
  }
}

function hidePreviewCard(id) {
  const preview = document.getElementById(`preview-${id}`);
  if (preview) {
    preview.classList.remove('visible');
    setTimeout(() => {
      preview.style.display = 'none';
    }, 300);
  }
}

function toggleChapters(id) {
  const panel = document.getElementById(`chapters-${id}`);
  const area = document.getElementById('chaptersArea');
  
  // 如果点击的是当前打开的面板,则关闭
  if (currentOpenPanel === id) {
    closeChapters(id);
    return;
  }
  
  // 关闭其他面板
  if (currentOpenPanel !== null) {
    closeChapters(currentOpenPanel);
  }
  
  // 打开新面板
  if (panel) {
    area.style.display = 'block';
    panel.style.display = 'block';
    currentOpenPanel = id;
    
    // 平滑滚动到章节区域
    setTimeout(() => {
      panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 100);
  }
}

function closeChapters(id) {
  const panel = document.getElementById(`chapters-${id}`);
  const area = document.getElementById('chaptersArea');
  
  if (panel) {
    panel.style.display = 'none';
    currentOpenPanel = null;
    
    // 检查是否还有其他打开的面板
    const anyOpen = Array.from(document.querySelectorAll('.chapters-panel'))
      .some(p => p.style.display === 'block');
    
    if (!anyOpen) {
      area.style.display = 'none';
    }
  }
}
</script>

<style>
/* ========== 页面头部 ========== */
.tutorials-hero {
  padding: 3rem 0 2rem;
  text-align: center;
}

.hero-title {
  font-size: 2.5rem;
  font-weight: 800;
  margin: 0 0 0.75rem 0;
  background: linear-gradient(135deg,
    var(--global-theme-color) 0%,
    var(--global-hover-color) 100%
  );
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  display: inline-flex;
  align-items: center;
  gap: 1rem;
}

.hero-subtitle {
  font-size: 1.15rem;
  color: var(--global-text-color-light);
  margin: 0;
}

/* ========== 弧形轮播区域 ========== */
.arc-carousel-area {
  position: relative;
  margin: 3rem 0;
  padding: 3rem 0;
  min-height: 400px;
}

.arc-track {
  display: flex;
  gap: 2rem;
  padding: 2rem 4rem;
  overflow-x: auto;
  overflow-y: visible;
  scroll-behavior: smooth;
  scrollbar-width: thin;
  scrollbar-color: var(--global-theme-color) var(--global-divider-color);
  
  /* 创建弧形视觉效果 */
  align-items: center;
  padding-bottom: 4rem;
}

.arc-track::-webkit-scrollbar {
  height: 8px;
}

.arc-track::-webkit-scrollbar-track {
  background: var(--global-divider-color);
  border-radius: 4px;
}

.arc-track::-webkit-scrollbar-thumb {
  background: var(--global-theme-color);
  border-radius: 4px;
}

/* 弧形排列效果 */
.arc-thumbnail {
  flex-shrink: 0;
  width: 180px;
  position: relative;
  cursor: pointer;
  transition: all 0.3s;
}

.arc-thumbnail:nth-child(odd) {
  margin-top: -20px;
}

.arc-thumbnail:nth-child(even) {
  margin-top: 20px;
}

.arc-thumbnail:nth-child(3n) {
  margin-top: 0px;
}

.arc-thumbnail:nth-child(3n+1) {
  margin-top: -30px;
}

.arc-thumbnail:nth-child(3n+2) {
  margin-top: 30px;
}

.arc-thumbnail:hover {
  transform: translateY(-10px) scale(1.05);
  z-index: 100;
}

.thumb-inner {
  width: 180px;
  height: 240px;
  background: var(--global-bg-color);
  border: 2px solid var(--global-divider-color);
  border-radius: 12px;
  overflow: hidden;
  position: relative;
  transition: all 0.3s;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.arc-thumbnail:hover .thumb-inner {
  border-color: var(--global-theme-color);
  box-shadow: 0 8px 24px rgba(var(--global-theme-color-rgb), 0.3);
}

.thumb-inner img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.thumb-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg,
    rgba(var(--global-theme-color-rgb), 0.1) 0%,
    rgba(var(--global-theme-color-rgb), 0.05) 100%
  );
  color: var(--global-theme-color);
  opacity: 0.3;
}

.thumb-badge {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  background: linear-gradient(135deg,
    var(--global-theme-color) 0%,
    var(--global-hover-color) 100%
  );
  color: white;
  padding: 0.3rem 0.7rem;
  border-radius: 12px;
  font-size: 0.65rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.3rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.2);
}

.thumb-badge i {
  font-size: 0.4rem;
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

/* 滚动按钮 */
.scroll-btn {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 50px;
  height: 50px;
  background: rgba(var(--global-theme-color-rgb), 0.9);
  color: white;
  border: none;
  border-radius: 50%;
  font-size: 1.2rem;
  cursor: pointer;
  z-index: 200;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(0,0,0,0.2);
}

.scroll-btn:hover {
  background: var(--global-theme-color);
  transform: translateY(-50%) scale(1.1);
}

.scroll-left {
  left: 1rem;
}

.scroll-right {
  right: 1rem;
}

/* ========== 悬停预览卡片 ========== */
.preview-card {
  position: absolute;
  bottom: -20px;
  left: 50%;
  transform: translateX(-50%) translateY(100%);
  width: 400px;
  background: var(--global-bg-color);
  border: 2px solid var(--global-theme-color);
  border-radius: 16px;
  box-shadow: 0 12px 36px rgba(0,0,0,0.3);
  display: none;
  flex-direction: row;
  overflow: hidden;
  z-index: 1000;
  opacity: 0;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  pointer-events: none;
}

.preview-card.visible {
  opacity: 1;
  transform: translateX(-50%) translateY(100%) scale(1);
}

.preview-image-area {
  width: 140px;
  height: 100%;
  background: #000;
  flex-shrink: 0;
}

.preview-image-area img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.preview-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg,
    rgba(var(--global-theme-color-rgb), 0.1) 0%,
    rgba(var(--global-theme-color-rgb), 0.05) 100%
  );
  color: var(--global-theme-color);
  opacity: 0.3;
}

.preview-info {
  flex: 1;
  padding: 1.25rem;
}

.preview-title {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--global-text-color);
  margin: 0 0 0.5rem 0;
  line-height: 1.3;
}

.preview-status {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  background: linear-gradient(135deg,
    var(--global-theme-color) 0%,
    var(--global-hover-color) 100%
  );
  color: white;
  padding: 0.3rem 0.7rem;
  border-radius: 12px;
  font-size: 0.7rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.preview-status i {
  font-size: 0.4rem;
}

.preview-desc {
  font-size: 0.85rem;
  line-height: 1.5;
  color: var(--global-text-color-light);
  margin: 0 0 0.75rem 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.preview-meta {
  font-size: 0.8rem;
  color: var(--global-text-color-light);
  margin-bottom: 0.5rem;
}

.preview-meta i {
  color: var(--global-theme-color);
  margin-right: 0.4rem;
}

.preview-hint {
  font-size: 0.75rem;
  color: var(--global-theme-color);
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

/* ========== 章节展开区域 ========== */
.chapters-expand-area {
  margin: 3rem 0;
  display: none;
}

.chapters-panel {
  background: var(--global-bg-color);
  border: 2px solid var(--global-theme-color);
  border-radius: 20px;
  padding: 2rem;
  margin-bottom: 2rem;
  animation: expandIn 0.4s ease-out;
}

@keyframes expandIn {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid var(--global-divider-color);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex: 1;
}

.header-left i {
  color: var(--global-theme-color);
  font-size: 1.2rem;
}

.header-left h3 {
  font-size: 1.4rem;
  font-weight: 700;
  color: var(--global-text-color);
  margin: 0;
}

.chapter-count {
  background: var(--global-theme-color);
  color: white;
  padding: 0.3rem 0.8rem;
  border-radius: 12px;
  font-size: 0.85rem;
  font-weight: 600;
}

.close-btn {
  background: var(--global-theme-color);
  color: white;
  border: none;
  padding: 0.6rem 1.2rem;
  border-radius: 20px;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.3s;
}

.close-btn:hover {
  background: var(--global-hover-color);
  transform: scale(1.05);
}

/* 章节横条列表 */
.chapters-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.chapter-bar {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem 1.5rem;
  background: var(--global-code-bg-color);
  border: 2px solid var(--global-divider-color);
  border-radius: 12px;
  text-decoration: none;
  color: var(--global-text-color);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.chapter-bar::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 5px;
  background: linear-gradient(180deg,
    var(--global-theme-color) 0%,
    var(--global-hover-color) 100%
  );
  transform: scaleY(0);
  transition: transform 0.3s;
}

.chapter-bar:hover::before {
  transform: scaleY(1);
}

.chapter-bar:hover {
  transform: translateX(10px);
  background: var(--global-bg-color);
  border-color: var(--global-theme-color);
  box-shadow: 0 4px 12px rgba(var(--global-theme-color-rgb), 0.2);
}

.bar-num {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg,
    var(--global-theme-color) 0%,
    var(--global-hover-color) 100%
  );
  color: white;
  border-radius: 8px;
  font-weight: 700;
  font-size: 1rem;
  flex-shrink: 0;
}

.bar-text {
  flex: 1;
  font-weight: 500;
  font-size: 1rem;
}

.bar-arrow {
  color: var(--global-theme-color);
  opacity: 0;
  transform: translateX(-10px);
  transition: all 0.3s;
}

.chapter-bar:hover .bar-arrow {
  opacity: 1;
  transform: translateX(0);
}

/* ========== 分隔线 ========== */
.section-divider {
  text-align: center;
  margin: 4rem 0;
  position: relative;
}

.section-divider::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  height: 1px;
  background: var(--global-divider-color);
}

.divider-icon {
  display: inline-block;
  background: var(--global-bg-color);
  padding: 0.5rem 1.5rem;
  color: var(--global-text-color-light);
  position: relative;
  z-index: 1;
  font-size: 1.5rem;
}

/* ========== 计划内容 ========== */
.planned-section {
  margin-top: 4rem;
}

.section-header {
  text-align: center;
  margin-bottom: 3rem;
}

.section-title {
  font-size: 2rem;
  font-weight: 700;
  margin: 0 0 0.75rem 0;
  display: inline-flex;
  align-items: center;
  gap: 0.75rem;
  color: var(--global-text-color);
}

.section-subtitle {
  color: var(--global-text-color-light);
  font-size: 1.05rem;
  margin: 0;
}

.planned-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 2rem;
}

.planned-item {
  background: var(--global-bg-color);
  border: 2px dashed var(--global-divider-color);
  border-radius: 16px;
  padding: 2rem;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
  position: relative;
  overflow: hidden;
}

.planned-item::before {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle, rgba(var(--global-theme-color-rgb), 0.05) 0%, transparent 70%);
  opacity: 0;
  transition: opacity 0.4s;
}

.planned-item:hover {
  border-style: solid;
  border-color: var(--global-theme-color);
  background: var(--global-code-bg-color);
  transform: translateY(-8px);
  box-shadow: 0 12px 32px rgba(0,0,0,0.12);
}

.planned-item:hover::before {
  opacity: 1;
}

.planned-icon {
  font-size: 3rem;
  width: 80px;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 16px;
  margin: 0 auto 1.5rem;
  transition: transform 0.4s;
}

.gradient-1 { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
.gradient-2 { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); }
.gradient-3 { background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); }
.gradient-4 { background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%); }

.planned-item:hover .planned-icon {
  transform: scale(1.1) rotate(5deg);
}

.planned-content {
  text-align: center;
  position: relative;
  z-index: 1;
}

.planned-title {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--global-text-color);
  margin: 0 0 0.75rem 0;
}

.planned-desc {
  color: var(--global-text-color-light);
  font-size: 0.95rem;
  margin: 0;
  line-height: 1.6;
}

/* ========== 响应式 ========== */
@media (max-width: 768px) {
  .hero-title {
    font-size: 2rem;
  }
  
  .arc-track {
    padding: 2rem 2rem;
  }
  
  .arc-thumbnail {
    width: 150px;
  }
  
  .thumb-inner {
    width: 150px;
    height: 200px;
  }
  
  .preview-card {
    width: 320px;
    flex-direction: column;
  }
  
  .preview-image-area {
    width: 100%;
    height: 150px;
  }
  
  .scroll-btn {
    width: 40px;
    height: 40px;
    font-size: 1rem;
  }
  
  .chapters-panel {
    padding: 1.5rem;
  }
  
  .planned-grid {
    grid-template-columns: 1fr;
  }
}
</style>