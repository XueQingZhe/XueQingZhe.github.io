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

<!-- 左上角弧形轨道 -->
<div class="arc-track-section">
  <svg class="arc-bg-svg" width="600" height="500" viewBox="0 0 600 500">
    <!-- 更大的弧线 -->
    <path d="M 80,80 Q 80,350 400,400" 
          stroke="var(--global-divider-color)" 
          stroke-width="2" 
          fill="none" 
          opacity="0.3"/>
  </svg>
  
  <div class="arc-items" id="arcItems">
    {% assign tutorial_series = site.data.tutorials %}
    
    {% for series in tutorial_series %}
    <div class="arc-item" 
         data-index="{{ forloop.index0 }}"
         data-total="{{ tutorial_series.size }}"
         onmouseenter="showPreview({{ forloop.index }})"
         onmouseleave="hidePreview({{ forloop.index }})"
         onclick="showDetails({{ forloop.index }})">
      <div class="item-thumb">
        {% if series.image %}
        <img src="{{ series.image | relative_url }}" alt="{{ series.title }}">
        {% else %}
        <div class="thumb-empty">
          <i class="fas fa-book-open"></i>
        </div>
        {% endif %}
        
        {% if series.status %}
        <span class="thumb-dot"></span>
        {% endif %}
      </div>
    </div>
    
    <!-- 右侧悬停预览 - 拉近距离 -->
    <div class="hover-preview" id="hover-{{ forloop.index }}">
      <div class="preview-layout">
        <div class="preview-images">
          {% if series.image %}
          <img src="{{ series.image | relative_url }}" alt="{{ series.title }}">
          <img src="{{ series.image | relative_url }}" alt="{{ series.title }}">
          <img src="{{ series.image | relative_url }}" alt="{{ series.title }}">
          {% else %}
          <div class="preview-empty">
            <i class="fas fa-book-open fa-2x"></i>
          </div>
          {% endif %}
        </div>
        
        <div class="preview-content">
          <h3>{{ series.title }}</h3>
          {% if series.status %}
          <span class="preview-badge">{{ series.status }}</span>
          {% endif %}
          <p>{{ series.description | truncate: 100 }}</p>
          <div class="preview-info">
            <i class="fas fa-book"></i> {{ series.chapters.size }} 章节
          </div>
        </div>
      </div>
    </div>
    {% endfor %}
  </div>
  
  <!-- 小箭头按钮 - 贴合曲线 -->
  <div class="arc-arrow arc-arrow-left" onclick="moveArc(-1)">
    <i class="fas fa-arrow-left"></i>
  </div>
  <div class="arc-arrow arc-arrow-right" onclick="moveArc(1)">
    <i class="fas fa-arrow-right"></i>
  </div>
</div>

<!-- 底部详情区 - 默认显示励志语句 -->
<div class="details-area" id="detailsArea">
  <!-- 励志占位 -->
  <div class="inspire-placeholder" id="inspirePlaceholder">
    <div class="inspire-content">
      <i class="fas fa-lightbulb fa-3x inspire-icon"></i>
      <h3 class="inspire-title">持续学习,不断进步</h3>
      <p class="inspire-text">每一个教程都是通往技术巅峰的阶梯</p>
      <p class="inspire-hint">
        <i class="fas fa-hand-pointer"></i>
        点击上方教程卡片查看完整内容
      </p>
    </div>
  </div>
  
  {% for series in tutorial_series %}
  <div class="detail-box" id="detail-{{ forloop.index }}" style="display: none;">
    <!-- 背景模糊层 -->
    <div class="detail-blur-bg" style="background-image: url('{{ series.image | relative_url }}')"></div>
    
    <div class="detail-content-wrapper">
      <div class="detail-top">
        <div class="detail-image">
          {% if series.image %}
          <div class="image-blur-layer" style="background-image: url('{{ series.image | relative_url }}')"></div>
          <img src="{{ series.image | relative_url }}" alt="{{ series.title }}" class="image-main">
          {% else %}
          <div class="detail-image-empty">
            <i class="fas fa-book-open fa-3x"></i>
          </div>
          {% endif %}
        </div>
        
        <div class="detail-header">
          <h2>{{ series.title }}</h2>
          {% if series.status %}
          <span class="detail-status">
            <i class="fas fa-circle"></i>
            {{ series.status }}
          </span>
          {% endif %}
          <p>{{ series.description }}</p>
          <div class="detail-meta">
            <i class="fas fa-book-open"></i>
            {{ series.chapters.size }} 章节
          </div>
        </div>
        
        <button class="detail-close" onclick="hideDetails()">
          <i class="fas fa-times"></i>
        </button>
      </div>
      
      <div class="detail-divider"></div>
      
      <div class="detail-chapters">
        <h3><i class="fas fa-list-ul"></i> 章节列表</h3>
        <div class="chapter-list">
          {% for chapter in series.chapters %}
          <a href="{{ series.base_url }}/{{ chapter.file | remove: '.md' }}/" class="chapter-item">
            <span class="item-number">{{ forloop.index }}</span>
            <span class="item-title">{{ chapter.title }}</span>
            <i class="fas fa-arrow-right"></i>
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
let currentOffset = 0;
let totalItems = {{ tutorial_series.size }};

// 更大的弧线路径
function getArcPosition(index, total) {
  const t = index / (total - 1);
  
  // 新弧线: (80,80) -> (80,350) -> (400,400)
  const P0 = { x: 80, y: 80 };
  const P1 = { x: 80, y: 350 };
  const P2 = { x: 400, y: 400 };
  
  const x = Math.pow(1-t, 2) * P0.x + 2 * (1-t) * t * P1.x + Math.pow(t, 2) * P2.x;
  const y = Math.pow(1-t, 2) * P0.y + 2 * (1-t) * t * P1.y + Math.pow(t, 2) * P2.y;
  
  return { x, y };
}

function updateArcPositions() {
  const items = document.querySelectorAll('.arc-item');
  
  items.forEach((item, index) => {
    const visualIndex = (index + currentOffset + totalItems) % totalItems;
    const pos = getArcPosition(visualIndex, totalItems);
    
    item.style.left = `${pos.x}px`;
    item.style.top = `${pos.y}px`;
    
    const progress = visualIndex / (totalItems - 1);
    const opacity = 0.4 + (1 - Math.abs(progress - 0.5) * 2) * 0.6;
    const scale = 0.8 + (1 - Math.abs(progress - 0.5) * 2) * 0.2;
    
    item.style.opacity = opacity;
    item.style.transform = `translate(-50%, -50%) scale(${scale})`;
    item.style.zIndex = Math.floor((1 - Math.abs(progress - 0.5)) * 100);
  });
}

function moveArc(direction) {
  currentOffset = (currentOffset + direction + totalItems) % totalItems;
  updateArcPositions();
}

function showPreview(id) {
  const preview = document.getElementById(`hover-${id}`);
  if (preview) {
    preview.style.display = 'block';
    setTimeout(() => preview.classList.add('visible'), 10);
  }
}

function hidePreview(id) {
  const preview = document.getElementById(`hover-${id}`);
  if (preview) {
    preview.classList.remove('visible');
    setTimeout(() => preview.style.display = 'none', 300);
  }
}

function showDetails(id) {
  document.querySelectorAll('.hover-preview').forEach(p => {
    p.classList.remove('visible');
    p.style.display = 'none';
  });
  
  document.getElementById('inspirePlaceholder').style.display = 'none';
  
  document.querySelectorAll('.detail-box').forEach(d => {
    d.style.display = 'none';
  });
  
  const detail = document.getElementById(`detail-${id}`);
  const area = document.getElementById('detailsArea');
  
  if (detail) {
    area.style.display = 'block';
    detail.style.display = 'block';
    
    setTimeout(() => {
      detail.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 100);
  }
}

function hideDetails() {
  document.querySelectorAll('.detail-box').forEach(d => {
    d.style.display = 'none';
  });
  
  document.getElementById('inspirePlaceholder').style.display = 'flex';
}

updateArcPositions();
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

/* ========== 弧形轨道 ========== */
.arc-track-section {
  position: relative;
  width: 600px;
  height: 500px;
  margin: 2rem 0 3rem 0;
}

.arc-bg-svg {
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
}

.arc-items {
  position: relative;
  width: 100%;
  height: 100%;
}

/* 弧形项目 - 完整显示图片 */
.arc-item {
  position: absolute;
  width: 140px;
  cursor: pointer;
  transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

.item-thumb {
  width: 140px;
  height: 200px;
  background: var(--global-bg-color);
  border: 2px solid var(--global-divider-color);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  transition: all 0.3s;
  position: relative;
}

.arc-item:hover .item-thumb {
  border-color: var(--global-theme-color);
  box-shadow: 0 8px 24px rgba(var(--global-theme-color-rgb), 0.4);
  transform: scale(1.08);
}

.item-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.thumb-empty {
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

.thumb-dot {
  position: absolute;
  top: 0.6rem;
  right: 0.6rem;
  width: 12px;
  height: 12px;
  background: var(--global-theme-color);
  border-radius: 50%;
  box-shadow: 0 0 10px rgba(var(--global-theme-color-rgb), 0.8);
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.6; transform: scale(0.9); }
}

/* 小箭头按钮 - 贴合曲线 */
.arc-arrow {
  position: absolute;
  width: 36px;
  height: 36px;
  background: var(--global-theme-color);
  color: white;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.9rem;
  transition: all 0.3s;
  box-shadow: 0 2px 8px rgba(0,0,0,0.2);
  z-index: 200;
}

.arc-arrow:hover {
  background: var(--global-hover-color);
  transform: scale(1.15);
}

.arc-arrow-left {
  left: 40px;
  top: 220px;
}

.arc-arrow-right {
  left: 320px;
  top: 420px;
}

/* ========== 右侧悬停预览 - 拉近 ========== */
.hover-preview {
  position: fixed;
  top: 35%;
  right: 15%;
  transform: translateY(-50%);
  width: 400px;
  background: var(--global-bg-color);
  border: 3px solid var(--global-theme-color);
  border-radius: 18px;
  box-shadow: 0 16px 48px rgba(0,0,0,0.35);
  display: none;
  opacity: 0;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 9999;
  pointer-events: none;
}

.hover-preview.visible {
  opacity: 1;
}

.preview-layout {
  padding: 1.5rem;
}

.preview-images {
  display: flex;
  gap: 0.6rem;
  margin-bottom: 1.25rem;
}

.preview-images img {
  width: calc(33.33% - 0.4rem);
  height: 130px;
  object-fit: cover;
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.12);
}

.preview-empty {
  width: 100%;
  height: 130px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg,
    rgba(var(--global-theme-color-rgb), 0.1) 0%,
    rgba(var(--global-theme-color-rgb), 0.05) 100%
  );
  border-radius: 10px;
  color: var(--global-theme-color);
  opacity: 0.3;
}

.preview-content h3 {
  font-size: 1.3rem;
  font-weight: 700;
  color: var(--global-text-color);
  margin: 0 0 0.75rem 0;
}

.preview-badge {
  display: inline-block;
  background: var(--global-theme-color);
  color: white;
  padding: 0.35rem 0.85rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  margin-bottom: 0.9rem;
}

.preview-content p {
  font-size: 0.9rem;
  line-height: 1.65;
  color: var(--global-text-color-light);
  margin: 0 0 0.9rem 0;
}

.preview-info {
  font-size: 0.85rem;
  color: var(--global-text-color-light);
  font-weight: 500;
}

.preview-info i {
  color: var(--global-theme-color);
  margin-right: 0.4rem;
}

/* ========== 励志占位 ========== */
.details-area {
  margin: 3rem 0;
  display: block;
}

.inspire-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 320px;
  background: linear-gradient(135deg,
    rgba(var(--global-theme-color-rgb), 0.05) 0%,
    rgba(var(--global-theme-color-rgb), 0.02) 100%
  );
  border: 2px dashed var(--global-divider-color);
  border-radius: 20px;
  padding: 3rem;
}

.inspire-content {
  text-align: center;
  max-width: 600px;
}

.inspire-icon {
  color: var(--global-theme-color);
  margin-bottom: 1.5rem;
  opacity: 0.8;
}

.inspire-title {
  font-size: 1.8rem;
  font-weight: 700;
  color: var(--global-text-color);
  margin: 0 0 1rem 0;
}

.inspire-text {
  font-size: 1.1rem;
  line-height: 1.8;
  color: var(--global-text-color-light);
  margin: 0 0 2rem 0;
}

.inspire-hint {
  font-size: 0.95rem;
  color: var(--global-theme-color);
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

/* ========== 详情区 - 背景模糊 ========== */
.detail-box {
  position: relative;
  border-radius: 24px;
  overflow: hidden;
  border: 3px solid var(--global-theme-color);
  animation: slideUp 0.4s ease-out;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 背景模糊层 */
.detail-blur-bg {
  position: absolute;
  top: -20px;
  left: -20px;
  right: -20px;
  bottom: -20px;
  background-size: cover;
  background-position: center;
  filter: blur(40px) brightness(0.3);
  transform: scale(1.1);
  z-index: 0;
}

.detail-content-wrapper {
  position: relative;
  z-index: 1;
  background: rgba(var(--global-bg-color-rgb), 0.85);
  backdrop-filter: blur(10px);
  padding: 2.5rem;
}

.detail-top {
  display: flex;
  gap: 2rem;
  margin-bottom: 2rem;
  position: relative;
}

.detail-image {
  width: 180px;
  height: 240px;
  border-radius: 16px;
  overflow: hidden;
  flex-shrink: 0;
  position: relative;
  background: #000;
}

/* 图片模糊背景 */
.image-blur-layer {
  position: absolute;
  top: -10px;
  left: -10px;
  right: -10px;
  bottom: -10px;
  background-size: cover;
  background-position: center;
  filter: blur(20px) brightness(0.4);
  transform: scale(1.1);
}

.image-main {
  position: relative;
  z-index: 1;
  width: 100%;
  height: 100%;
  object-fit: contain;
  padding: 1rem;
  filter: drop-shadow(0 4px 12px rgba(0,0,0,0.6));
}

.detail-image-empty {
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

.detail-header {
  flex: 1;
}

.detail-header h2 {
  font-size: 1.8rem;
  font-weight: 700;
  color: var(--global-text-color);
  margin: 0 0 0.75rem 0;
  text-shadow: 0 2px 4px rgba(0,0,0,0.2);
}

.detail-status {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background: var(--global-theme-color);
  color: white;
  padding: 0.5rem 1.1rem;
  border-radius: 16px;
  font-size: 0.85rem;
  font-weight: 600;
  margin-bottom: 1rem;
}

.detail-status i {
  font-size: 0.5rem;
}

.detail-header p {
  font-size: 1rem;
  line-height: 1.8;
  color: var(--global-text-color-light);
  margin: 0 0 1rem 0;
}

.detail-meta {
  font-size: 0.95rem;
  color: var(--global-text-color-light);
  font-weight: 500;
}

.detail-meta i {
  color: var(--global-theme-color);
  margin-right: 0.5rem;
}

.detail-close {
  position: absolute;
  top: 0;
  right: 0;
  width: 44px;
  height: 44px;
  background: var(--global-theme-color);
  color: white;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  transition: all 0.3s;
}

.detail-close:hover {
  background: var(--global-hover-color);
  transform: rotate(90deg);
}

.detail-divider {
  height: 2px;
  background: var(--global-divider-color);
  margin: 2rem 0;
  opacity: 0.5;
}

.detail-chapters h3 {
  font-size: 1.3rem;
  font-weight: 700;
  color: var(--global-text-color);
  margin: 0 0 1.5rem 0;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  text-shadow: 0 2px 4px rgba(0,0,0,0.2);
}

.detail-chapters h3 i {
  color: var(--global-theme-color);
}

.chapter-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.chapter-item {
  display: flex;
  align-items: center;
  gap: 1.25rem;
  padding: 1.25rem 1.75rem;
  background: rgba(var(--global-code-bg-color-rgb), 0.7);
  border: 2px solid var(--global-divider-color);
  border-radius: 14px;
  text-decoration: none;
  color: var(--global-text-color);
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.chapter-item::before {
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
  transition: transform 0.4s;
}

.chapter-item:hover::before {
  transform: scaleY(1);
}

.chapter-item:hover {
  transform: translateX(12px);
  background: rgba(var(--global-bg-color-rgb), 0.9);
  border-color: var(--global-theme-color);
  box-shadow: 0 6px 20px rgba(var(--global-theme-color-rgb), 0.3);
}

.item-number {
  width: 42px;
  height: 42px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg,
    var(--global-theme-color) 0%,
    var(--global-hover-color) 100%
  );
  color: white;
  border-radius: 10px;
  font-weight: 700;
  font-size: 1.1rem;
  flex-shrink: 0;
}

.item-title {
  flex: 1;
  font-weight: 500;
  font-size: 1.05rem;
}

.chapter-item i {
  color: var(--global-theme-color);
  opacity: 0;
  transform: translateX(-12px);
  transition: all 0.4s;
  font-size: 1.1rem;
}

.chapter-item:hover i {
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
  
  .arc-track-section {
    width: 100%;
    height: 400px;
  }
  
  .hover-preview {
    width: 90%;
    right: 5%;
    left: 5%;
  }
  
  .preview-images {
    flex-direction: column;
  }
  
  .preview-images img {
    width: 100%;
  }
  
  .detail-box {
    padding: 1.5rem;
  }
  
  .detail-top {
    flex-direction: column;
  }
  
  .detail-image {
    width: 100%;
    height: 220px;
  }
  
  .planned-grid {
    grid-template-columns: 1fr;
  }
}
</style>