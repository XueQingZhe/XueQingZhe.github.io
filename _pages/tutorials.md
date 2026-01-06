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
  <svg class="arc-bg-svg" width="500" height="400" viewBox="0 0 500 400">
    <!-- 反转的弧线: 左上到右下 -->
    <path d="M 50,50 Q 350,50 350,350" 
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
    
    <!-- 右侧悬停预览 -->
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
          <p>{{ series.description }}</p>
          <div class="preview-info">
            <i class="fas fa-book"></i> {{ series.chapters.size }} 章节
          </div>
        </div>
      </div>
    </div>
    {% endfor %}
  </div>
  
  <!-- 左右控制按钮 -->
  <div class="arc-buttons">
    <button class="arc-control" onclick="moveArc(-1)">
      <i class="fas fa-chevron-left"></i>
    </button>
    <button class="arc-control" onclick="moveArc(1)">
      <i class="fas fa-chevron-right"></i>
    </button>
  </div>
</div>

<!-- 底部详情展开区 -->
<div class="details-area" id="detailsArea">
  {% for series in tutorial_series %}
  <div class="detail-box" id="detail-{{ forloop.index }}" style="display: none;">
    <div class="detail-top">
      <div class="detail-image">
        {% if series.image %}
        <img src="{{ series.image | relative_url }}" alt="{{ series.title }}">
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

// 计算反转弧形位置 (左上到右下)
function getArcPosition(index, total) {
  const t = index / (total - 1);
  
  // 反转的二次贝塞尔: 左上(50,50) -> 控制点(350,50) -> 右下(350,350)
  const P0 = { x: 50, y: 50 };
  const P1 = { x: 350, y: 50 };
  const P2 = { x: 350, y: 350 };
  
  const x = Math.pow(1-t, 2) * P0.x + 2 * (1-t) * t * P1.x + Math.pow(t, 2) * P2.x;
  const y = Math.pow(1-t, 2) * P0.y + 2 * (1-t) * t * P1.y + Math.pow(t, 2) * P2.y;
  
  return { x, y };
}

// 更新位置
function updateArcPositions() {
  const items = document.querySelectorAll('.arc-item');
  
  items.forEach((item, index) => {
    const visualIndex = (index + currentOffset + totalItems) % totalItems;
    const pos = getArcPosition(visualIndex, totalItems);
    
    item.style.left = `${pos.x}px`;
    item.style.top = `${pos.y}px`;
    
    const progress = visualIndex / (totalItems - 1);
    const opacity = 0.3 + (1 - Math.abs(progress - 0.5) * 2) * 0.7;
    const scale = 0.75 + (1 - Math.abs(progress - 0.5) * 2) * 0.25;
    
    item.style.opacity = opacity;
    item.style.transform = `translate(-50%, -50%) scale(${scale})`;
    item.style.zIndex = Math.floor((1 - Math.abs(progress - 0.5)) * 100);
  });
}

// 移动弧形
function moveArc(direction) {
  currentOffset = (currentOffset + direction + totalItems) % totalItems;
  updateArcPositions();
}

// 显示预览
function showPreview(id) {
  const preview = document.getElementById(`hover-${id}`);
  if (preview) {
    preview.style.display = 'block';
    setTimeout(() => preview.classList.add('visible'), 10);
  }
}

// 隐藏预览
function hidePreview(id) {
  const preview = document.getElementById(`hover-${id}`);
  if (preview) {
    preview.classList.remove('visible');
    setTimeout(() => preview.style.display = 'none', 300);
  }
}

// 显示详情
function showDetails(id) {
  // 隐藏所有预览
  document.querySelectorAll('.hover-preview').forEach(p => {
    p.classList.remove('visible');
    p.style.display = 'none';
  });
  
  // 隐藏其他详情
  document.querySelectorAll('.detail-box').forEach(d => {
    d.style.display = 'none';
  });
  
  // 显示选中详情
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

// 隐藏详情
function hideDetails() {
  const area = document.getElementById('detailsArea');
  area.style.display = 'none';
  
  document.querySelectorAll('.detail-box').forEach(d => {
    d.style.display = 'none';
  });
}

// 初始化
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

/* ========== 左上角弧形轨道 ========== */
.arc-track-section {
  position: relative;
  width: 500px;
  height: 400px;
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

/* 弧形项目 */
.arc-item {
  position: absolute;
  width: 100px;
  cursor: pointer;
  transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

.item-thumb {
  width: 100px;
  height: 120px;
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
  transform: scale(1.1);
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
  top: 0.5rem;
  right: 0.5rem;
  width: 10px;
  height: 10px;
  background: var(--global-theme-color);
  border-radius: 50%;
  box-shadow: 0 0 8px rgba(var(--global-theme-color-rgb), 0.6);
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

/* 控制按钮 */
.arc-buttons {
  position: absolute;
  bottom: 1rem;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 1rem;
}

.arc-control {
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
  font-size: 1.1rem;
  transition: all 0.3s;
  box-shadow: 0 4px 12px rgba(0,0,0,0.2);
}

.arc-control:hover {
  background: var(--global-hover-color);
  transform: scale(1.1);
}

/* ========== 右侧悬停预览 ========== */
.hover-preview {
  position: fixed;
  top: 50%;
  right: 5%;
  transform: translateY(-50%);
  width: 420px;
  background: var(--global-bg-color);
  border: 3px solid var(--global-theme-color);
  border-radius: 20px;
  box-shadow: 0 16px 48px rgba(0,0,0,0.3);
  display: none;
  opacity: 0;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 9999;
  pointer-events: none;
}

.hover-preview.visible {
  opacity: 1;
  transform: translateY(-50%) translateX(0);
}

.preview-layout {
  padding: 1.5rem;
}

.preview-images {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 1.25rem;
}

.preview-images img {
  width: calc(33.33% - 0.5rem);
  height: 140px;
  object-fit: cover;
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.preview-empty {
  width: 100%;
  height: 140px;
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
  font-size: 1.4rem;
  font-weight: 700;
  color: var(--global-text-color);
  margin: 0 0 0.75rem 0;
}

.preview-badge {
  display: inline-block;
  background: var(--global-theme-color);
  color: white;
  padding: 0.4rem 0.9rem;
  border-radius: 14px;
  font-size: 0.75rem;
  font-weight: 600;
  margin-bottom: 1rem;
}

.preview-content p {
  font-size: 0.95rem;
  line-height: 1.7;
  color: var(--global-text-color-light);
  margin: 0 0 1rem 0;
}

.preview-info {
  font-size: 0.9rem;
  color: var(--global-text-color-light);
  font-weight: 500;
}

.preview-info i {
  color: var(--global-theme-color);
  margin-right: 0.5rem;
}

/* ========== 底部详情区 ========== */
.details-area {
  margin: 3rem 0;
  display: none;
}

.detail-box {
  background: var(--global-bg-color);
  border: 3px solid var(--global-theme-color);
  border-radius: 24px;
  padding: 2.5rem;
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

.detail-top {
  display: flex;
  gap: 2rem;
  margin-bottom: 2rem;
  position: relative;
}

.detail-image {
  width: 160px;
  height: 160px;
  border-radius: 16px;
  overflow: hidden;
  background: #000;
  flex-shrink: 0;
}

.detail-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
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
}

.detail-chapters h3 {
  font-size: 1.3rem;
  font-weight: 700;
  color: var(--global-text-color);
  margin: 0 0 1.5rem 0;
  display: flex;
  align-items: center;
  gap: 0.75rem;
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
  background: var(--global-code-bg-color);
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
  background: var(--global-bg-color);
  border-color: var(--global-theme-color);
  box-shadow: 0 6px 20px rgba(var(--global-theme-color-rgb), 0.25);
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
    height: 350px;
  }
  
  .hover-preview {
    width: 90%;
    right: 5%;
    left: 5%;
    transform: translate(0, -50%);
  }
  
  .hover-preview.visible {
    transform: translate(0, -50%);
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
    height: 200px;
  }
  
  .planned-grid {
    grid-template-columns: 1fr;
  }
}
</style>