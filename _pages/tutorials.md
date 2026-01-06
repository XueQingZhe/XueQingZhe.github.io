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

<!-- 教程卡片网格 -->
<div class="tutorials-grid">
  {% assign tutorial_series = site.data.tutorials %}
  
  {% for series in tutorial_series %}
  <div class="tutorial-card-compact" onclick="openTutorialModal('modal-{{ forloop.index }}')">
    <!-- 背景图片 -->
    {% if series.image %}
    <div class="card-image" style="background-image: url('{{ series.image | relative_url }}')">
      <div class="card-overlay"></div>
    </div>
    {% else %}
    <div class="card-image placeholder">
      <div class="placeholder-icon">
        <i class="fas fa-book-open fa-3x"></i>
      </div>
    </div>
    {% endif %}
    
    <!-- 卡片内容 -->
    <div class="card-content">
      {% if series.status %}
      <span class="status-badge-mini badge-{{ series.status_color }}">
        <i class="fas fa-circle"></i>
        {{ series.status }}
      </span>
      {% endif %}
      
      <h3 class="card-title">{{ series.title }}</h3>
      <p class="card-description">{{ series.description }}</p>
      
      <div class="card-footer">
        <span class="chapter-count">
          <i class="fas fa-list"></i>
          {{ series.chapters.size }} 章节
        </span>
        <span class="view-details">
          查看详情
          <i class="fas fa-arrow-right"></i>
        </span>
      </div>
    </div>
    
    <!-- 悬停提示 -->
    <div class="hover-hint">
      <i class="fas fa-search-plus"></i>
      点击查看完整目录
    </div>
  </div>
  
  <!-- 模态框 -->
  <div id="modal-{{ forloop.index }}" class="tutorial-modal">
    <div class="modal-backdrop" onclick="closeTutorialModal('modal-{{ forloop.index }}')"></div>
    <div class="modal-container">
      <button class="modal-close" onclick="closeTutorialModal('modal-{{ forloop.index }}')">
        <i class="fas fa-times"></i>
      </button>
      
      <div class="modal-content">
        <div class="modal-left">
          {% if series.image %}
          <div class="modal-image-container" style="--preview-img: url('{{ series.image | relative_url }}')">
            <div class="image-overlay"></div>
            <img src="{{ series.image | relative_url }}" alt="{{ series.title }}" class="modal-preview-img">
          </div>
          {% else %}
          <div class="modal-placeholder">
            <i class="fas fa-book-open fa-4x"></i>
            <p>{{ series.title }}</p>
          </div>
          {% endif %}
        </div>
        
        <div class="modal-right">
          <div class="modal-header">
            <h2 class="modal-title">
              <i class="fas fa-book"></i>
              {{ series.title }}
            </h2>
            {% if series.status %}
            <span class="status-badge-large badge-{{ series.status_color }}">
              <i class="fas fa-circle pulse-dot"></i>
              {{ series.status }}
            </span>
            {% endif %}
          </div>
          
          <p class="modal-description">{{ series.description }}</p>
          
          <div class="modal-chapters">
            <div class="chapters-header">
              <i class="fas fa-list-ul"></i>
              <span>章节列表</span>
              <span class="chapter-badge">{{ series.chapters.size }}</span>
            </div>
            
            <div class="chapters-list-modal">
              {% for chapter in series.chapters %}
              <a href="{{ series.base_url }}/{{ chapter.file | remove: '.md' }}/" class="chapter-link">
                <span class="chapter-num">{{ forloop.index }}</span>
                <span class="chapter-name">{{ chapter.title }}</span>
                <i class="fas fa-external-link-alt"></i>
              </a>
              {% endfor %}
            </div>
          </div>
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
function openTutorialModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
}

function closeTutorialModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }
}

// ESC键关闭
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    const activeModal = document.querySelector('.tutorial-modal.active');
    if (activeModal) {
      activeModal.classList.remove('active');
      document.body.style.overflow = '';
    }
  }
});
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

/* ========== 教程卡片网格 ========== */
.tutorials-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 2rem;
  margin-bottom: 4rem;
}

/* ========== 紧凑卡片 ========== */
.tutorial-card-compact {
  background: var(--global-bg-color);
  border: 1px solid var(--global-divider-color);
  border-radius: 16px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  height: 420px;
  display: flex;
  flex-direction: column;
}

.tutorial-card-compact:hover {
  transform: translateY(-8px);
  box-shadow: 0 16px 48px rgba(0,0,0,0.15);
  border-color: var(--global-theme-color);
}

/* 卡片图片 */
.card-image {
  width: 100%;
  height: 200px;
  background-size: cover;
  background-position: center;
  position: relative;
  overflow: hidden;
}

.card-image::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(180deg,
    transparent 0%,
    rgba(0,0,0,0.3) 100%
  );
}

.card-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.2);
  transition: background 0.3s;
}

.tutorial-card-compact:hover .card-overlay {
  background: rgba(0,0,0,0.1);
}

.card-image.placeholder {
  background: linear-gradient(135deg,
    rgba(var(--global-theme-color-rgb), 0.1) 0%,
    rgba(var(--global-theme-color-rgb), 0.05) 100%
  );
  display: flex;
  align-items: center;
  justify-content: center;
}

.placeholder-icon {
  color: var(--global-theme-color);
  opacity: 0.3;
}

/* 卡片内容 */
.card-content {
  padding: 1.5rem;
  flex: 1;
  display: flex;
  flex-direction: column;
  position: relative;
}

.status-badge-mini {
  position: absolute;
  top: -28px;
  right: 1.5rem;
  background: linear-gradient(135deg,
    var(--global-theme-color) 0%,
    var(--global-hover-color) 100%
  );
  color: white;
  padding: 0.4rem 0.9rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  box-shadow: 0 4px 12px rgba(var(--global-theme-color-rgb), 0.3);
}

.status-badge-mini i {
  font-size: 0.5rem;
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

.card-title {
  font-size: 1.4rem;
  font-weight: 700;
  color: var(--global-text-color);
  margin: 0 0 0.75rem 0;
  line-height: 1.3;
}

.card-description {
  font-size: 0.95rem;
  color: var(--global-text-color-light);
  line-height: 1.7;
  margin: 0 0 1.5rem 0;
  flex: 1;
}

.card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 1rem;
  border-top: 1px solid var(--global-divider-color);
}

.chapter-count {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--global-text-color-light);
  font-size: 0.9rem;
  font-weight: 500;
}

.chapter-count i {
  color: var(--global-theme-color);
}

.view-details {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--global-theme-color);
  font-size: 0.9rem;
  font-weight: 600;
  transition: gap 0.3s;
}

.tutorial-card-compact:hover .view-details {
  gap: 0.75rem;
}

/* 悬停提示 */
.hover-hint {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(0,0,0,0.85);
  color: white;
  padding: 1rem 1.5rem;
  border-radius: 12px;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-weight: 600;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.3s;
  z-index: 10;
}

.tutorial-card-compact:hover .hover-hint {
  opacity: 1;
}

/* ========== 模态框 ========== */
.tutorial-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.3s;
}

.tutorial-modal.active {
  opacity: 1;
  pointer-events: auto;
}

.modal-backdrop {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.8);
  backdrop-filter: blur(8px);
}

.modal-container {
  position: relative;
  width: 90%;
  max-width: 1200px;
  max-height: 85vh;
  background: var(--global-bg-color);
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0,0,0,0.3);
  transform: scale(0.9);
  transition: transform 0.3s;
}

.tutorial-modal.active .modal-container {
  transform: scale(1);
}

.modal-close {
  position: absolute;
  top: 1.5rem;
  right: 1.5rem;
  width: 40px;
  height: 40px;
  border: none;
  background: rgba(0,0,0,0.5);
  color: white;
  border-radius: 50%;
  font-size: 1.2rem;
  cursor: pointer;
  z-index: 10;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-close:hover {
  background: var(--global-theme-color);
  transform: rotate(90deg);
}

.modal-content {
  display: flex;
  height: 85vh;
  max-height: 800px;
}

/* 模态框左侧 */
.modal-left {
  width: 35%;
  background: linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 100%);
  position: relative;
  overflow: hidden;
}

.modal-image-container {
  width: 100%;
  height: 100%;
  position: relative;
}

.modal-image-container::before {
  content: '';
  position: absolute;
  top: -30px;
  left: -30px;
  right: -30px;
  bottom: -30px;
  background-image: var(--preview-img);
  background-size: cover;
  background-position: center;
  filter: blur(30px) brightness(0.4);
  transform: scale(1.2);
}

.image-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg,
    rgba(var(--global-theme-color-rgb), 0.2) 0%,
    transparent 100%
  );
}

.modal-preview-img {
  position: relative;
  z-index: 1;
  width: 100%;
  height: 100%;
  object-fit: contain;
  padding: 3rem;
  filter: drop-shadow(0 10px 30px rgba(0,0,0,0.7));
}

.modal-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--global-theme-color);
  opacity: 0.3;
  padding: 2rem;
  text-align: center;
}

/* 模态框右侧 */
.modal-right {
  width: 65%;
  padding: 3rem;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1.5rem;
  margin-bottom: 1.5rem;
}

.modal-title {
  font-size: 2rem;
  font-weight: 700;
  color: var(--global-text-color);
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex: 1;
}

.modal-title i {
  color: var(--global-theme-color);
}

.status-badge-large {
  padding: 0.6rem 1.2rem;
  border-radius: 24px;
  font-size: 0.9rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.6rem;
  white-space: nowrap;
  background: linear-gradient(135deg,
    var(--global-theme-color) 0%,
    var(--global-hover-color) 100%
  );
  color: white;
  box-shadow: 0 4px 12px rgba(var(--global-theme-color-rgb), 0.3);
}

.pulse-dot {
  font-size: 0.5rem;
}

.modal-description {
  font-size: 1.1rem;
  line-height: 1.8;
  color: var(--global-text-color-light);
  margin: 0 0 2rem 0;
}

/* 章节列表 */
.modal-chapters {
  flex: 1;
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

.chapter-badge {
  background: var(--global-theme-color);
  color: white;
  padding: 0.3rem 0.8rem;
  border-radius: 12px;
  font-size: 0.85rem;
  margin-left: auto;
}

.chapters-list-modal {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
}

.chapter-link {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem 1.25rem;
  background: var(--global-bg-color);
  border: 1px solid var(--global-divider-color);
  border-radius: 12px;
  color: var(--global-text-color);
  text-decoration: none;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.chapter-link::before {
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

.chapter-link:hover::before {
  transform: scaleY(1);
}

.chapter-link:hover {
  transform: translateX(6px);
  background: var(--global-code-bg-color);
  border-color: var(--global-theme-color);
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
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

.chapter-name {
  flex: 1;
  font-weight: 500;
  font-size: 0.95rem;
}

.chapter-link i {
  color: var(--global-theme-color);
  opacity: 0;
  transform: translateX(-10px);
  transition: all 0.3s;
  font-size: 0.85rem;
}

.chapter-link:hover i {
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
  .modal-content {
    flex-direction: column;
  }
  
  .modal-left {
    width: 100%;
    height: 250px;
  }
  
  .modal-right {
    width: 100%;
  }
  
  .chapters-list-modal {
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
  
  .tutorials-grid {
    grid-template-columns: 1fr;
  }
  
  .modal-container {
    width: 95%;
    max-height: 90vh;
  }
  
  .modal-right {
    padding: 2rem;
  }
  
  .modal-title {
    font-size: 1.5rem;
  }
  
  .planned-grid {
    grid-template-columns: 1fr;
  }
}
</style>