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
    <div class="row">
      <div class="col-md-4">
        {% if series.image %}
        <img src="{{ series.image | relative_url }}" alt="{{ series.title }}" class="img-fluid rounded">
        {% else %}
        <div class="placeholder-image">
          <i class="fas fa-book fa-3x"></i>
        </div>
        {% endif %}
      </div>
      
      <div class="col-md-8">
        <h3>{{ series.title }}</h3>
        <p class="text-muted">{{ series.description }}</p>
        
        <div class="chapters-list">
          <h5>📚 章节列表</h5>
          <ul>
            {% for chapter in series.chapters %}
            <li>
              <a href="{{ series.base_url }}/{{ chapter.file | remove: '.md' }}/">
                {{ chapter.title }}
              </a>
            </li>
            {% endfor %}
          </ul>
        </div>
        
        {% if series.status %}
        <span class="badge badge-{{ series.status_color }}">{{ series.status }}</span>
        {% endif %}
      </div>
    </div>
  </div>
  {% endfor %}
</div>

<hr>

## 📅 计划内容

目前正在准备中，敬请期待...

<div class="planned-content">
  <ul>
    <li>🎨 Shader 基础入门系列</li>
    <li>⚡ Unity URP 渲染管线详解</li>
    <li>🎭 卡通渲染实现指南</li>
    <li>💎 PBR 工作流完整教程</li>
  </ul>
</div>

<style>
.tutorials-container {
  margin-bottom: 2rem;
}

.tutorial-card {
  background: var(--global-bg-color);
  border: 1px solid var(--global-divider-color);
  border-radius: 8px;
  padding: 2rem;
  margin-bottom: 2rem;
  transition: box-shadow 0.3s ease;
}

.tutorial-card:hover {
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.placeholder-image {
  background: var(--global-divider-color);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: var(--global-text-color-light);
}

.chapters-list {
  margin-top: 1rem;
}

.chapters-list h5 {
  font-size: 1rem;
  margin-bottom: 0.5rem;
  color: var(--global-theme-color);
}

.chapters-list ul {
  list-style: none;
  padding-left: 0;
}

.chapters-list li {
  padding: 0.3rem 0;
}

.chapters-list li::before {
  content: "▸ ";
  color: var(--global-theme-color);
  margin-right: 0.5rem;
}

.planned-content ul {
  list-style: none;
  padding-left: 1rem;
}

.planned-content li {
  padding: 0.5rem 0;
  font-size: 1.1rem;
}
</style>