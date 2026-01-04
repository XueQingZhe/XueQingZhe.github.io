---
layout: page
permalink: /tutorials/
title: tutorials
description: 技术分享与教程
nav: true
nav_order: 5
---

<div class="tutorials-container">
  {% assign tutorial_series = site.data.tutorials %}
  
  {% for series in tutorial_series %}
  <div class="tutorial-card">
    <div class="row g-0">
      <!-- 左侧预览图 - 带模糊背景效果 -->
      <div class="col-md-5">
        {% if series.image %}
        <div class="tutorial-image-container" style="--preview-img: url('{{ series.image | relative_url }}')">
          <img src="{{ series.image | relative_url }}" alt="{{ series.title }}" class="tutorial-preview-img">
        </div>
        {% else %}
        <div class="placeholder-image">
          <i class="fas fa-book-open fa-4x"></i>
          <p class="mt-3">{{ series.title }}</p>
        </div>
        {% endif %}
      </div>
      
      <!-- 右侧内容 -->
      <div class="col-md-7">
        <div class="tutorial-content">
          <h3 class="tutorial-title">{{ series.title }}</h3>
          <p class="tutorial-description">{{ series.description }}</p>
          
          <div class="chapters-section">
            <div class="chapters-header">
              <i class="fas fa-list-ul"></i>
              <span>章节列表</span>
            </div>
            <ul class="chapters-list">
              {% for chapter in series.chapters %}
              <li>
                <a href="{{ series.base_url }}/{{ chapter.file | remove: '.md' }}/">
                  {{ chapter.title }}
                </a>
              </li>
              {% endfor %}
            </ul>
          </div>
          
          <div class="tutorial-footer">
            {% if series.status %}
            <span class="badge bg-{{ series.status_color }}">
              <i class="fas fa-sync-alt"></i> {{ series.status }}
            </span>
            {% endif %}
            
            <div class="tutorial-meta">
              <span class="chapter-count">
                <i class="fas fa-book"></i> {{ series.chapters.size }} 章节
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  {% endfor %}
</div>

<hr class="section-divider">

<div class="planned-section">
  <h2>
    <i class="fas fa-calendar-alt"></i>
    计划内容
  </h2>
  <p class="text-muted">目前正在准备中，敬请期待...</p>
  
  <div class="planned-grid">
    <div class="planned-item">
      <div class="planned-icon">🎨</div>
      <div class="planned-title">Shader 基础入门系列</div>
    </div>
    <div class="planned-item">
      <div class="planned-icon">⚡</div>
      <div class="planned-title">Unity URP 渲染管线详解</div>
    </div>
    <div class="planned-item">
      <div class="planned-icon">🎭</div>
      <div class="planned-title">卡通渲染实现指南</div>
    </div>
    <div class="planned-item">
      <div class="planned-icon">💎</div>
      <div class="planned-title">PBR 工作流完整教程</div>
    </div>
  </div>
</div>

<style>
/* 容器样式 */
.tutorials-container {
  margin-bottom: 3rem;
}

/* 教程卡片 */
.tutorial-card {
  background: var(--global-bg-color);
  border: 1px solid var(--global-divider-color);
  border-radius: 12px;
  overflow: hidden;
  margin-bottom: 2rem;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
}

.tutorial-card:hover {
  box-shadow: 0 8px 24px rgba(0,0,0,0.12);
  transform: translateY(-2px);
}

/* ========== 模糊背景图片容器 ========== */
.tutorial-image-container {
  width: 100%;
  height: 100%;
  min-height: 320px;
  position: relative;
  overflow: hidden;
  background: #000;
}

/* 模糊背景层 */
.tutorial-image-container::before {
  content: '';
  position: absolute;
  top: -20px;
  left: -20px;
  right: -20px;
  bottom: -20px;
  background-image: var(--preview-img);
  background-size: cover;
  background-position: center;
  filter: blur(25px) brightness(0.5);
  transform: scale(1.1);
  z-index: 0;
}

/* 清晰前景图片 */
.tutorial-preview-img {
  position: relative;
  z-index: 1;
  width: 100%;
  height: 100%;
  object-fit: contain;
  max-height: 90%;
  padding: 1.5rem;
  filter: drop-shadow(0 8px 16px rgba(0,0,0,0.6));
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.tutorial-card:hover .tutorial-preview-img {
  transform: scale(1.05) translateY(-5px);
  filter: drop-shadow(0 12px 24px rgba(0,0,0,0.7));
}

/* 占位图 */
.placeholder-image {
  background: linear-gradient(135deg, var(--global-divider-color) 0%, var(--global-bg-color) 100%);
  height: 100%;
  min-height: 320px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--global-text-color-light);
  padding: 2rem;
  text-align: center;
}

.placeholder-image p {
  font-weight: 500;
  margin: 0;
  opacity: 0.6;
}

/* 内容区域 */
.tutorial-content {
  padding: 2rem;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.tutorial-title {
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 0.75rem;
  color: var(--global-theme-color);
}

.tutorial-description {
  color: var(--global-text-color-light);
  margin-bottom: 1.5rem;
  line-height: 1.6;
  flex-shrink: 0;
}

/* 章节列表 */
.chapters-section {
  flex-grow: 1;
  margin-bottom: 1rem;
}

.chapters-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
  color: var(--global-theme-color);
  margin-bottom: 0.75rem;
  font-size: 0.95rem;
}

.chapters-list {
  list-style: none;
  padding-left: 0;
  margin: 0;
}

.chapters-list li {
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--global-divider-color);
  transition: all 0.2s ease;
}

.chapters-list li:last-child {
  border-bottom: none;
}

.chapters-list li:hover {
  padding-left: 0.5rem;
  background: var(--global-code-bg-color);
  border-radius: 4px;
}

.chapters-list li::before {
  content: "▸";
  color: var(--global-theme-color);
  margin-right: 0.75rem;
  font-weight: bold;
  transition: transform 0.2s ease;
}

.chapters-list li:hover::before {
  transform: translateX(3px);
}

.chapters-list a {
  color: var(--global-text-color);
  text-decoration: none;
  transition: color 0.2s ease;
}

.chapters-list a:hover {
  color: var(--global-theme-color);
}

/* 底部元信息 */
.tutorial-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: auto;
  padding-top: 1rem;
  border-top: 1px solid var(--global-divider-color);
}

.badge {
  padding: 0.4rem 0.8rem;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 500;
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.8; }
}

.bg-primary {
  background-color: var(--global-theme-color) !important;
  color: white;
}

.tutorial-meta {
  display: flex;
  align-items: center;
  gap: 1rem;
  color: var(--global-text-color-light);
  font-size: 0.9rem;
}

.chapter-count i {
  margin-right: 0.3rem;
}

/* 分隔线 */
.section-divider {
  margin: 3rem 0;
  border-color: var(--global-divider-color);
}

/* 计划内容区域 */
.planned-section {
  margin-top: 3rem;
}

.planned-section h2 {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.planned-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-top: 2rem;
}

.planned-item {
  background: var(--global-bg-color);
  border: 2px dashed var(--global-divider-color);
  border-radius: 8px;
  padding: 1.5rem;
  text-align: center;
  transition: all 0.3s ease;
}

.planned-item:hover {
  border-color: var(--global-theme-color);
  background: var(--global-code-bg-color);
  transform: translateY(-4px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.planned-icon {
  font-size: 2.5rem;
  margin-bottom: 0.75rem;
}

.planned-title {
  font-weight: 500;
  color: var(--global-text-color);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .tutorial-card .row {
    flex-direction: column;
  }
  
  .tutorial-image-container,
  .placeholder-image {
    min-height: 280px;
  }
  
  .tutorial-preview-img {
    padding: 1rem;
  }
  
  .tutorial-content {
    padding: 1.5rem;
  }
  
  .tutorial-footer {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }
  
  .planned-grid {
    grid-template-columns: 1fr;
  }
}

/* 暗色模式优化 */
@media (prefers-color-scheme: dark) {
  .tutorial-image-container::before {
    filter: blur(25px) brightness(0.4);
  }
}
</style>