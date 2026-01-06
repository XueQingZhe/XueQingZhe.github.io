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
  <div class="hero-background">
    <div class="bg-circle bg-circle-1"></div>
    <div class="bg-circle bg-circle-2"></div>
    <div class="bg-circle bg-circle-3"></div>
  </div>
  <div class="hero-content">
    <h1 class="hero-title">
      <i class="fas fa-graduation-cap"></i>
      教程系列
    </h1>
    <p class="hero-subtitle">系统化的技术学习路径</p>
  </div>
</div>

<!-- 胶片滚动区域 -->
<div class="film-strip-container">
  <div class="film-strip-wrapper">
    <button class="scroll-btn scroll-left" onclick="scrollFilm(-1)">
      <i class="fas fa-chevron-left"></i>
    </button>
    
    <div class="film-strip" id="filmStrip">
      {% assign tutorial_series = site.data.tutorials %}
      
      {% for series in tutorial_series %}
      <div class="film-frame" data-tutorial-id="{{ forloop.index }}">
        <!-- 胶片孔 -->
        <div class="film-holes film-holes-top">
          <span class="hole"></span>
          <span class="hole"></span>
          <span class="hole"></span>
        </div>
        
        <!-- 缩略图 -->
        <div class="film-thumbnail" 
             onmouseenter="showPreview({{ forloop.index }})"
             onmouseleave="hidePreview({{ forloop.index }})"
             onclick="expandTutorial({{ forloop.index }})">
          {% if series.image %}
          <img src="{{ series.image | relative_url }}" alt="{{ series.title }}">
          {% else %}
          <div class="placeholder-thumb">
            <i class="fas fa-book-open fa-2x"></i>
          </div>
          {% endif %}
          
          {% if series.status %}
          <span class="status-indicator badge-{{ series.status_color }}">
            <i class="fas fa-circle"></i>
          </span>
          {% endif %}
          
          <div class="film-label">{{ series.title }}</div>
        </div>
        
        <!-- 胶片孔 -->
        <div class="film-holes film-holes-bottom">
          <span class="hole"></span>
          <span class="hole"></span>
          <span class="hole"></span>
        </div>
        
        <!-- 悬停预览卡片 -->
        <div class="preview-card" id="preview-{{ forloop.index }}">
          <div class="preview-content">
            {% if series.status %}
            <span class="preview-badge badge-{{ series.status_color }}">
              <i class="fas fa-circle"></i>
              {{ series.status }}
            </span>
            {% endif %}
            
            <h3 class="preview-title">{{ series.title }}</h3>
            <p class="preview-description">{{ series.description }}</p>
            
            <div class="preview-footer">
              <span class="preview-chapters">
                <i class="fas fa-list"></i>
                {{ series.chapters.size }} 章节
              </span>
              <span class="preview-hint">
                点击查看详情 <i class="fas fa-arrow-down"></i>
              </span>
            </div>
          </div>
        </div>
      </div>
      {% endfor %}
    </div>
    
    <button class="scroll-btn scroll-right" onclick="scrollFilm(1)">
      <i class="fas fa-chevron-right"></i>
    </button>
  </div>
</div>

<!-- 展开的详情区域 -->
<div class="tutorial-details-container" id="detailsContainer">
  {% for series in tutorial_series %}
  <div class="tutorial-details" id="details-{{ forloop.index }}" style="display: none;">
    <div class="details-close" onclick="collapseTutorial()">
      <i class="fas fa-times"></i>
      收起
    </div>
    
    <div class="details-content">
      <div class="details-left">
        {% if series.image %}
        <div class="details-image-container" style="--preview-img: url('{{ series.image | relative_url }}')">
          <div class="image-blur-bg"></div>
          <img src="{{ series.image | relative_url }}" alt="{{ series.title }}" class="details-image">
        </div>
        {% else %}
        <div class="details-placeholder">
          <i class="fas fa-book-open fa-4x"></i>
        </div>
        {% endif %}
        
        <div class="details-info">
          <h2 class="details-title">
            <i class="fas fa-book"></i>
            {{ series.title }}
          </h2>
          {% if series.status %}
          <span class="details-badge badge-{{ series.status_color }}">
            <i class="fas fa-circle pulse-dot"></i>
            {{ series.status }}
          </span>
          {% endif %}
          
          <p class="details-description">{{ series.description }}</p>
          
          <div class="details-stats">
            <div class="stat">
              <i class="fas fa-book-open"></i>
              <span>{{ series.chapters.size }} 章节</span>
            </div>
          </div>
        </div>
      </div>
      
      <div class="details-right">
        <div class="chapters-header">
          <i class="fas fa-list-ul"></i>
          <span>章节列表</span>
          <span class="chapters-count">{{ series.chapters.size }}</span>
        </div>
        
        <div class="chapters-grid">
          {% for chapter in series.chapters %}
          <a href="{{ series.base_url }}/{{ chapter.file | remove: '.md' }}/" class="chapter-item">
            <span class="chapter-number">{{ forloop.index }}</span>
            <span class="chapter-title">{{ chapter.title }}</span>
            <i class="fas fa-arrow-right chapter-arrow"></i>
          </a>
          {% endfor %}
        </div>
      </div>
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
let currentExpanded = null;

function scrollFilm(direction) {
  const filmStrip = document.getElementById('filmStrip');
  const scrollAmount = 300;
  filmStrip.scrollBy({
    left: direction * scrollAmount,
    behavior: 'smooth'
  });
}

function showPreview(id) {
  const preview = document.getElementById(`preview-${id}`);
  if (preview && currentExpanded === null) {
    preview.style.display = 'block';
    setTimeout(() => {
      preview.classList.add('visible');
    }, 10);
  }
}

function hidePreview(id) {
  const preview = document.getElementById(`preview-${id}`);
  if (preview) {
    preview.classList.remove('visible');
    setTimeout(() => {
      preview.style.display = 'none';
    }, 300);
  }
}

function expandTutorial(id) {
  // 隐藏所有预览卡片
  document.querySelectorAll('.preview-card').forEach(card => {
    card.classList.remove('visible');
    card.style.display = 'none';
  });
  
  // 如果点击的是当前展开的,则收起
  if (currentExpanded === id) {
    collapseTutorial();
    return;
  }
  
  // 隐藏其他详情
  document.querySelectorAll('.tutorial-details').forEach(details => {
    details.style.display = 'none';
  });
  
  // 显示选中的详情
  const details = document.getElementById(`details-${id}`);
  if (details) {
    details.style.display = 'block';
    currentExpanded = id;
    
    // 平滑滚动到详情区域
    setTimeout(() => {
      details.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 100);
  }
}

function collapseTutorial() {
  if (currentExpanded) {
    const details = document.getElementById(`details-${currentExpanded}`);
    if (details) {
      details.style.display = 'none';
    }
    currentExpanded = null;
  }
}
</script>

<style>
/* ========== 页面头部 ========== */
.tutorials-hero {
  position: relative;
  padding: 4rem 2rem;
  margin: -1rem -1rem 3rem;
  border-radius: 20px;
  overflow: hidden;
  background: linear-gradient(135deg,
    rgba(var(--global-theme-color-rgb), 0.1) 0%,
    rgba(var(--global-theme-color-rgb), 0.05) 100%
  );
}

.hero-background {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  overflow: hidden;
}

.bg-circle {
  position: absolute;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(var(--global-theme-color-rgb), 0.15) 0%, transparent 70%);
  animation: float 20s ease-in-out infinite;
}

.bg-circle-1 {
  width: 300px;
  height: 300px;
  top: -100px;
  right: 10%;
  animation-delay: 0s;
}

.bg-circle-2 {
  width: 200px;
  height: 200px;
  bottom: -50px;
  left: 15%;
  animation-delay: -5s;
}

.bg-circle-3 {
  width: 150px;
  height: 150px;
  top: 50%;
  right: 20%;
  animation-delay: -10s;
}

@keyframes float {
  0%, 100% { transform: translateY(0) scale(1); }
  50% { transform: translateY(-30px) scale(1.1); }
}

.hero-content {
  position: relative;
  z-index: 1;
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

/* ========== 胶片滚动区域 ========== */
.film-strip-container {
  margin: 3rem 0;
  padding: 2rem 0;
}

.film-strip-wrapper {
  position: relative;
  max-width: 100%;
  overflow: hidden;
}

.film-strip {
  display: flex;
  gap: 2rem;
  padding: 2rem 4rem;
  overflow-x: auto;
  scroll-behavior: smooth;
  scrollbar-width: thin;
  scrollbar-color: var(--global-theme-color) var(--global-divider-color);
}

.film-strip::-webkit-scrollbar {
  height: 8px;
}

.film-strip::-webkit-scrollbar-track {
  background: var(--global-divider-color);
  border-radius: 4px;
}

.film-strip::-webkit-scrollbar-thumb {
  background: var(--global-theme-color);
  border-radius: 4px;
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
  z-index: 10;
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
  left: 0;
}

.scroll-right {
  right: 0;
}

/* ========== 胶片帧 ========== */
.film-frame {
  flex-shrink: 0;
  width: 280px;
  background: #1a1a1a;
  border-radius: 8px;
  padding: 1rem 0.8rem;
  position: relative;
  box-shadow: 0 4px 12px rgba(0,0,0,0.3);
  transition: transform 0.3s;
}

.film-frame:hover {
  transform: scale(1.05);
}

/* 胶片孔 */
.film-holes {
  display: flex;
  justify-content: space-around;
  padding: 0.5rem 0;
}

.hole {
  width: 12px;
  height: 12px;
  background: #000;
  border: 2px solid #333;
  border-radius: 50%;
  box-shadow: inset 0 2px 4px rgba(0,0,0,0.5);
}

/* 缩略图 */
.film-thumbnail {
  width: 100%;
  height: 320px;
  background: #000;
  border-radius: 4px;
  overflow: hidden;
  cursor: pointer;
  position: relative;
  transition: all 0.3s;
}

.film-thumbnail:hover {
  box-shadow: 0 0 20px rgba(var(--global-theme-color-rgb), 0.5);
}

.film-thumbnail img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s;
}

.film-thumbnail:hover img {
  transform: scale(1.1);
}

.placeholder-thumb {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--global-theme-color);
  opacity: 0.3;
}

/* 状态指示器 */
.status-indicator {
  position: absolute;
  top: 0.75rem;
  right: 0.75rem;
  background: linear-gradient(135deg,
    var(--global-theme-color) 0%,
    var(--global-hover-color) 100%
  );
  color: white;
  padding: 0.4rem 0.8rem;
  border-radius: 16px;
  font-size: 0.7rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.3);
}

.status-indicator i {
  font-size: 0.4rem;
  animation: pulse 2s ease-in-out infinite;
}

/* 胶片标签 */
.film-label {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.9) 100%);
  color: white;
  padding: 1rem 0.75rem 0.5rem;
  font-size: 0.9rem;
  font-weight: 600;
  text-align: center;
}

/* ========== 悬停预览卡片 ========== */
.preview-card {
  position: absolute;
  top: -20px;
  left: 50%;
  transform: translateX(-50%) translateY(-100%) scale(0.9);
  width: 350px;
  background: var(--global-bg-color);
  border: 2px solid var(--global-theme-color);
  border-radius: 16px;
  box-shadow: 0 12px 32px rgba(0,0,0,0.3);
  z-index: 100;
  display: none;
  opacity: 0;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  pointer-events: none;
}

.preview-card.visible {
  opacity: 1;
  transform: translateX(-50%) translateY(-100%) scale(1);
}

.preview-card::after {
  content: '';
  position: absolute;
  bottom: -10px;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 10px solid transparent;
  border-right: 10px solid transparent;
  border-top: 10px solid var(--global-theme-color);
}

.preview-content {
  padding: 1.5rem;
}

.preview-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background: linear-gradient(135deg,
    var(--global-theme-color) 0%,
    var(--global-hover-color) 100%
  );
  color: white;
  padding: 0.4rem 0.9rem;
  border-radius: 16px;
  font-size: 0.75rem;
  font-weight: 600;
  margin-bottom: 0.75rem;
}

.preview-badge i {
  font-size: 0.5rem;
}

.preview-title {
  font-size: 1.3rem;
  font-weight: 700;
  color: var(--global-text-color);
  margin: 0 0 0.75rem 0;
}

.preview-description {
  font-size: 0.9rem;
  color: var(--global-text-color-light);
  line-height: 1.6;
  margin: 0 0 1rem 0;
}

.preview-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 1rem;
  border-top: 1px solid var(--global-divider-color);
}

.preview-chapters {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--global-text-color-light);
  font-size: 0.9rem;
  font-weight: 500;
}

.preview-chapters i {
  color: var(--global-theme-color);
}

.preview-hint {
  color: var(--global-theme-color);
  font-size: 0.85rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

/* ========== 展开详情区域 ========== */
.tutorial-details-container {
  margin: 3rem 0;
}

.tutorial-details {
  background: var(--global-bg-color);
  border: 2px solid var(--global-theme-color);
  border-radius: 20px;
  padding: 2.5rem;
  margin-bottom: 2rem;
  position: relative;
  box-shadow: 0 8px 24px rgba(0,0,0,0.1);
  animation: slideDown 0.4s ease-out;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.details-close {
  position: absolute;
  top: 1.5rem;
  right: 1.5rem;
  background: var(--global-theme-color);
  color: white;
  padding: 0.6rem 1.2rem;
  border-radius: 20px;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.3s;
}

.details-close:hover {
  background: var(--global-hover-color);
  transform: scale(1.05);
}

.details-content {
  display: grid;
  grid-template-columns: 1fr 1.5fr;
  gap: 2.5rem;
}

/* 详情左侧 */
.details-left {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.details-image-container {
  width: 100%;
  height: 300px;
  border-radius: 16px;
  overflow: hidden;
  position: relative;
  background: #000;
}

.image-blur-bg {
  position: absolute;
  top: -20px;
  left: -20px;
  right: -20px;
  bottom: -20px;
  background-image: var(--preview-img);
  background-size: cover;
  background-position: center;
  filter: blur(20px) brightness(0.4);
  transform: scale(1.1);
}

.details-image {
  position: relative;
  z-index: 1;
  width: 100%;
  height: 100%;
  object-fit: contain;
  padding: 1.5rem;
  filter: drop-shadow(0 8px 16px rgba(0,0,0,0.6));
}

.details-placeholder {
  width: 100%;
  height: 300px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg,
    rgba(var(--global-theme-color-rgb), 0.1) 0%,
    rgba(var(--global-theme-color-rgb), 0.05) 100%
  );
  border-radius: 16px;
  color: var(--global-theme-color);
  opacity: 0.3;
}

.details-info {
  background: var(--global-code-bg-color);
  padding: 1.5rem;
  border-radius: 12px;
}

.details-title {
  font-size: 1.6rem;
  font-weight: 700;
  color: var(--global-text-color);
  margin: 0 0 1rem 0;
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.details-title i {
  color: var(--global-theme-color);
}

.details-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background: linear-gradient(135deg,
    var(--global-theme-color) 0%,
    var(--global-hover-color) 100%
  );
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 600;
  margin-bottom: 1rem;
}

.pulse-dot {
  font-size: 0.5rem;
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

.details-description {
  font-size: 1rem;
  line-height: 1.7;
  color: var(--global-text-color-light);
  margin: 0 0 1.5rem 0;
}

.details-stats {
  display: flex;
  gap: 1.5rem;
}

.stat {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--global-text-color);
  font-weight: 500;
}

.stat i {
  color: var(--global-theme-color);
}

/* 详情右侧 - 章节列表 */
.details-right {
  display: flex;
  flex-direction: column;
}

.chapters-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-weight: 700;
  color: var(--global-theme-color);
  margin-bottom: 1.5rem;
  font-size: 1.1rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid var(--global-divider-color);
}

.chapters-count {
  background: var(--global-theme-color);
  color: white;
  padding: 0.3rem 0.8rem;
  border-radius: 12px;
  font-size: 0.85rem;
  margin-left: auto;
}

.chapters-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.75rem;
  max-height: 450px;
  overflow-y: auto;
  padding-right: 0.5rem;
}

.chapters-grid::-webkit-scrollbar {
  width: 6px;
}

.chapters-grid::-webkit-scrollbar-track {
  background: var(--global-divider-color);
  border-radius: 3px;
}

.chapters-grid::-webkit-scrollbar-thumb {
  background: var(--global-theme-color);
  border-radius: 3px;
}

.chapter-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.85rem 1rem;
  background: var(--global-bg-color);
  border: 1px solid var(--global-divider-color);
  border-radius: 10px;
  color: var(--global-text-color);
  text-decoration: none;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.chapter-item::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background: linear-gradient(180deg,
    var(--global-theme-color) 0%,
    var(--global-hover-color) 100%
  );
  transform: scaleY(0);
  transition: transform 0.3s;
}

.chapter-item:hover::before {
  transform: scaleY(1);
}

.chapter-item:hover {
  transform: translateX(4px);
  background: var(--global-code-bg-color);
  border-color: var(--global-theme-color);
  box-shadow: 0 3px 10px rgba(0,0,0,0.08);
}

.chapter-number {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg,
    var(--global-theme-color) 0%,
    var(--global-hover-color) 100%
  );
  color: white;
  border-radius: 7px;
  font-weight: 700;
  font-size: 0.85rem;
  flex-shrink: 0;
}

.chapter-title {
  flex: 1;
  font-weight: 500;
  font-size: 0.9rem;
}

.chapter-arrow {
  color: var(--global-theme-color);
  opacity: 0;
  transform: translateX(-8px);
  transition: all 0.3s;
  font-size: 0.85rem;
}

.chapter-item:hover .chapter-arrow {
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
@media (max-width: 1024px) {
  .details-content {
    grid-template-columns: 1fr;
  }
  
  .chapters-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .tutorials-hero {
    padding: 3rem 1.5rem;
  }
  
  .hero-title {
    font-size: 2rem;
  }
  
  .film-frame {
    width: 240px;
  }
  
  .film-thumbnail {
    height: 280px;
  }
  
  .preview-card {
    width: 300px;
  }
  
  .tutorial-details {
    padding: 1.5rem;
  }
  
  .scroll-btn {
    width: 40px;
    height: 40px;
    font-size: 1rem;
  }
  
  .planned-grid {
    grid-template-columns: 1fr;
  }
}
</style>