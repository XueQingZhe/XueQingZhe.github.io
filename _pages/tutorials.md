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

<!-- 主布局 -->
<div class="tutorials-layout">
  <!-- 左侧弧形轨道区 -->
  <div class="arc-track-area">
    <svg class="arc-path-svg" width="100%" height="100%" viewBox="0 0 400 400">
      <!-- 定义弧形路径 -->
      <defs>
        <path id="arcPath" d="M 50,350 Q 50,50 350,50" fill="none"/>
      </defs>
      
      <!-- 轨道线 -->
      <path d="M 50,350 Q 50,50 350,50" 
            stroke="var(--global-divider-color)" 
            stroke-width="2" 
            fill="none" 
            opacity="0.3"/>
    </svg>
    
    <div class="arc-items-container" id="arcItems">
      {% assign tutorial_series = site.data.tutorials %}
      
      {% for series in tutorial_series %}
      <div class="arc-item" 
           data-index="{{ forloop.index0 }}"
           data-total="{{ tutorial_series.size }}"
           onmouseenter="showPreview({{ forloop.index }})"
           onmouseleave="hidePreview({{ forloop.index }})"
           onclick="selectTutorial({{ forloop.index }})">
        <div class="arc-item-inner">
          {% if series.image %}
          <img src="{{ series.image | relative_url }}" alt="{{ series.title }}">
          {% else %}
          <div class="arc-item-placeholder">
            <i class="fas fa-book-open"></i>
          </div>
          {% endif %}
          
          {% if series.status %}
          <span class="arc-item-badge">
            <i class="fas fa-circle"></i>
          </span>
          {% endif %}
        </div>
        
        <div class="arc-item-label">{{ series.title | truncate: 15 }}</div>
      </div>
      
      <!-- 预览卡片 -->
      <div class="preview-popup" id="preview-{{ forloop.index }}">
        <div class="popup-content">
          <div class="popup-image">
            {% if series.image %}
            <img src="{{ series.image | relative_url }}" alt="{{ series.title }}">
            {% else %}
            <div class="popup-placeholder">
              <i class="fas fa-book-open fa-2x"></i>
            </div>
            {% endif %}
          </div>
          <div class="popup-info">
            <h4>{{ series.title }}</h4>
            {% if series.status %}
            <span class="popup-status">{{ series.status }}</span>
            {% endif %}
            <p>{{ series.description | truncate: 80 }}</p>
            <div class="popup-meta">
              <i class="fas fa-list"></i> {{ series.chapters.size }} 章节
            </div>
          </div>
        </div>
      </div>
      {% endfor %}
    </div>
    
    <!-- 滚动控制 -->
    <div class="arc-controls">
      <button class="arc-btn" onclick="scrollArcItems(-1)">
        <i class="fas fa-arrow-left"></i>
      </button>
      <button class="arc-btn" onclick="scrollArcItems(1)">
        <i class="fas fa-arrow-right"></i>
      </button>
    </div>
  </div>
  
  <!-- 右侧详情面板 -->
  <div class="details-panel">
    <div class="panel-placeholder" id="panelPlaceholder">
      <i class="fas fa-hand-pointer fa-3x"></i>
      <p>点击左侧教程查看详情</p>
    </div>
    
    {% for series in tutorial_series %}
    <div class="panel-content" id="panel-{{ forloop.index }}" style="display: none;">
      <div class="panel-header">
        <div class="panel-image">
          {% if series.image %}
          <img src="{{ series.image | relative_url }}" alt="{{ series.title }}">
          {% else %}
          <div class="panel-image-placeholder">
            <i class="fas fa-book-open fa-2x"></i>
          </div>
          {% endif %}
        </div>
        
        <div class="panel-info">
          <h2>{{ series.title }}</h2>
          {% if series.status %}
          <span class="panel-badge">
            <i class="fas fa-circle"></i>
            {{ series.status }}
          </span>
          {% endif %}
          <p>{{ series.description }}</p>
          <div class="panel-stats">
            <i class="fas fa-book-open"></i>
            {{ series.chapters.size }} 章节
          </div>
        </div>
      </div>
      
      <div class="panel-divider"></div>
      
      <div class="panel-chapters">
        <h3><i class="fas fa-list-ul"></i> 章节列表</h3>
        <div class="chapters-bars">
          {% for chapter in series.chapters %}
          <a href="{{ series.base_url }}/{{ chapter.file | remove: '.md' }}/" class="chapter-bar">
            <span class="chapter-num">{{ forloop.index }}</span>
            <span class="chapter-title">{{ chapter.title }}</span>
            <i class="fas fa-arrow-right"></i>
          </a>
          {% endfor %}
        </div>
      </div>
    </div>
    {% endfor %}
  </div>
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

// 计算弧形轨道上的位置
function getArcPosition(index, total) {
  const t = index / (total - 1); // 0 到 1
  
  // 二次贝塞尔曲线: P = (1-t)²P0 + 2(1-t)tP1 + t²P2
  const P0 = { x: 50, y: 350 };   // 起点(左下)
  const P1 = { x: 50, y: 50 };    // 控制点(左上)
  const P2 = { x: 350, y: 50 };   // 终点(右上)
  
  const x = Math.pow(1-t, 2) * P0.x + 2 * (1-t) * t * P1.x + Math.pow(t, 2) * P2.x;
  const y = Math.pow(1-t, 2) * P0.y + 2 * (1-t) * t * P1.y + Math.pow(t, 2) * P2.y;
  
  return { x, y };
}

// 更新弧形项目位置
function updateArcPositions() {
  const items = document.querySelectorAll('.arc-item');
  
  items.forEach((item, index) => {
    const visualIndex = (index + currentOffset + totalItems) % totalItems;
    const pos = getArcPosition(visualIndex, totalItems);
    
    item.style.left = `${pos.x}px`;
    item.style.top = `${pos.y}px`;
    
    // 根据位置调整透明度和大小
    const progress = visualIndex / (totalItems - 1);
    const opacity = 0.4 + (1 - Math.abs(progress - 0.5) * 2) * 0.6;
    const scale = 0.7 + (1 - Math.abs(progress - 0.5) * 2) * 0.3;
    
    item.style.opacity = opacity;
    item.style.transform = `translate(-50%, -50%) scale(${scale})`;
    item.style.zIndex = Math.floor((1 - Math.abs(progress - 0.5)) * 100);
  });
}

// 滚动弧形项目
function scrollArcItems(direction) {
  currentOffset = (currentOffset + direction + totalItems) % totalItems;
  updateArcPositions();
}

// 显示预览
function showPreview(id) {
  const preview = document.getElementById(`preview-${id}`);
  if (preview) {
    preview.style.display = 'block';
    setTimeout(() => preview.classList.add('visible'), 10);
  }
}

// 隐藏预览
function hidePreview(id) {
  const preview = document.getElementById(`preview-${id}`);
  if (preview) {
    preview.classList.remove('visible');
    setTimeout(() => preview.style.display = 'none', 300);
  }
}

// 选择教程
function selectTutorial(id) {
  // 隐藏所有预览
  document.querySelectorAll('.preview-popup').forEach(p => {
    p.classList.remove('visible');
    p.style.display = 'none';
  });
  
  // 隐藏占位符和其他面板
  document.getElementById('panelPlaceholder').style.display = 'none';
  document.querySelectorAll('.panel-content').forEach(p => {
    p.style.display = 'none';
  });
  
  // 显示选中面板
  const panel = document.getElementById(`panel-${id}`);
  if (panel) {
    panel.style.display = 'block';
  }
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

/* ========== 主布局 ========== */
.tutorials-layout {
  display: grid;
  grid-template-columns: 420px 1fr;
  gap: 2rem;
  margin: 3rem 0;
  min-height: 600px;
}

/* ========== 左侧弧形轨道区 ========== */
.arc-track-area {
  position: relative;
  background: linear-gradient(135deg,
    rgba(var(--global-theme-color-rgb), 0.05) 0%,
    rgba(var(--global-theme-color-rgb), 0.02) 100%
  );
  border: 2px solid var(--global-divider-color);
  border-radius: 20px;
  padding: 1rem;
  overflow: hidden;
}

.arc-path-svg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.arc-items-container {
  position: relative;
  width: 100%;
  height: 500px;
}

/* 弧形轨道项目 */
.arc-item {
  position: absolute;
  width: 100px;
  height: 130px;
  cursor: pointer;
  transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

.arc-item-inner {
  width: 100%;
  height: 100px;
  background: var(--global-bg-color);
  border: 2px solid var(--global-divider-color);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  transition: all 0.3s;
  position: relative;
}

.arc-item:hover .arc-item-inner {
  border-color: var(--global-theme-color);
  box-shadow: 0 8px 24px rgba(var(--global-theme-color-rgb), 0.3);
  transform: scale(1.1);
}

.arc-item-inner img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.arc-item-placeholder {
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

.arc-item-badge {
  position: absolute;
  top: 0.4rem;
  right: 0.4rem;
  width: 12px;
  height: 12px;
  background: var(--global-theme-color);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 0.35rem;
}

.arc-item-label {
  margin-top: 0.5rem;
  text-align: center;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--global-text-color);
}

/* 预览弹出卡片 */
.preview-popup {
  position: fixed;
  top: 50%;
  left: 35%;
  transform: translate(-50%, -50%);
  width: 380px;
  background: var(--global-bg-color);
  border: 2px solid var(--global-theme-color);
  border-radius: 16px;
  box-shadow: 0 12px 36px rgba(0,0,0,0.3);
  display: none;
  opacity: 0;
  transition: all 0.3s;
  z-index: 1000;
  pointer-events: none;
}

.preview-popup.visible {
  opacity: 1;
}

.popup-content {
  display: flex;
}

.popup-image {
  width: 140px;
  height: 100%;
  background: #000;
  flex-shrink: 0;
  border-radius: 14px 0 0 14px;
  overflow: hidden;
}

.popup-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.popup-placeholder {
  width: 100%;
  min-height: 200px;
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

.popup-info {
  flex: 1;
  padding: 1.25rem;
}

.popup-info h4 {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--global-text-color);
  margin: 0 0 0.5rem 0;
}

.popup-status {
  display: inline-block;
  background: var(--global-theme-color);
  color: white;
  padding: 0.25rem 0.6rem;
  border-radius: 10px;
  font-size: 0.7rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.popup-info p {
  font-size: 0.85rem;
  line-height: 1.5;
  color: var(--global-text-color-light);
  margin: 0 0 0.75rem 0;
}

.popup-meta {
  font-size: 0.8rem;
  color: var(--global-text-color-light);
}

.popup-meta i {
  color: var(--global-theme-color);
  margin-right: 0.4rem;
}

/* 弧形控制按钮 */
.arc-controls {
  position: absolute;
  bottom: 1.5rem;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 1rem;
  z-index: 100;
}

.arc-btn {
  width: 40px;
  height: 40px;
  background: var(--global-theme-color);
  color: white;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s;
  box-shadow: 0 2px 8px rgba(0,0,0,0.2);
}

.arc-btn:hover {
  background: var(--global-hover-color);
  transform: scale(1.1);
}

/* ========== 右侧详情面板 ========== */
.details-panel {
  background: var(--global-bg-color);
  border: 2px solid var(--global-theme-color);
  border-radius: 20px;
  padding: 2rem;
  min-height: 600px;
}

.panel-placeholder {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--global-text-color-light);
  opacity: 0.5;
}

.panel-placeholder i {
  color: var(--global-theme-color);
  margin-bottom: 1rem;
}

.panel-placeholder p {
  font-size: 1.1rem;
  margin: 0;
}

.panel-content {
  animation: fadeIn 0.4s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.panel-header {
  display: flex;
  gap: 1.5rem;
  margin-bottom: 1.5rem;
}

.panel-image {
  width: 140px;
  height: 140px;
  border-radius: 12px;
  overflow: hidden;
  background: #000;
  flex-shrink: 0;
}

.panel-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.panel-image-placeholder {
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

.panel-info {
  flex: 1;
}

.panel-info h2 {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--global-text-color);
  margin: 0 0 0.75rem 0;
}

.panel-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  background: var(--global-theme-color);
  color: white;
  padding: 0.35rem 0.8rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  margin-bottom: 0.75rem;
}

.panel-badge i {
  font-size: 0.4rem;
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

.panel-info p {
  font-size: 0.95rem;
  line-height: 1.7;
  color: var(--global-text-color-light);
  margin: 0 0 0.75rem 0;
}

.panel-stats {
  font-size: 0.9rem;
  color: var(--global-text-color-light);
}

.panel-stats i {
  color: var(--global-theme-color);
  margin-right: 0.4rem;
}

.panel-divider {
  height: 2px;
  background: var(--global-divider-color);
  margin: 1.5rem 0;
}

.panel-chapters h3 {
  font-size: 1.2rem;
  font-weight: 700;
  color: var(--global-text-color);
  margin: 0 0 1.25rem 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.panel-chapters h3 i {
  color: var(--global-theme-color);
}

.chapters-bars {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  max-height: 300px;
  overflow-y: auto;
  padding-right: 0.5rem;
}

.chapters-bars::-webkit-scrollbar {
  width: 6px;
}

.chapters-bars::-webkit-scrollbar-track {
  background: var(--global-divider-color);
  border-radius: 3px;
}

.chapters-bars::-webkit-scrollbar-thumb {
  background: var(--global-theme-color);
  border-radius: 3px;
}

.chapter-bar {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.9rem 1.25rem;
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
  width: 4px;
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
  transform: translateX(8px);
  background: var(--global-bg-color);
  border-color: var(--global-theme-color);
  box-shadow: 0 4px 12px rgba(var(--global-theme-color-rgb), 0.2);
}

.chapter-num {
  width: 32px;
  height: 32px;
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
  font-size: 0.9rem;
  flex-shrink: 0;
}

.chapter-title {
  flex: 1;
  font-weight: 500;
  font-size: 0.95rem;
}

.chapter-bar i {
  color: var(--global-theme-color);
  opacity: 0;
  transform: translateX(-10px);
  transition: all 0.3s;
}

.chapter-bar:hover i {
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
  .tutorials-layout {
    grid-template-columns: 1fr;
  }
  
  .arc-track-area {
    height: 500px;
  }
}

@media (max-width: 768px) {
  .hero-title {
    font-size: 2rem;
  }
  
  .details-panel {
    padding: 1.5rem;
  }
  
  .panel-header {
    flex-direction: column;
  }
  
  .panel-image {
    width: 100%;
    height: 180px;
  }
  
  .preview-popup {
    width: 90%;
    left: 50%;
  }
  
  .popup-content {
    flex-direction: column;
  }
  
  .popup-image {
    width: 100%;
    height: 150px;
    border-radius: 14px 14px 0 0;
  }
  
  .planned-grid {
    grid-template-columns: 1fr;
  }
}
</style>