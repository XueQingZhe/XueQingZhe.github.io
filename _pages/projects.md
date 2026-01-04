---
layout: page
title: projects
permalink: /projects/
description: 我的技术作品集
nav: true
nav_order: 3
display_categories: [rendering, demo]
horizontal: false
---

<!-- 页面头部 -->
<div class="projects-hero">
  <div class="hero-bg-pattern"></div>
  <div class="hero-content">
    <h1 class="hero-title">
      <i class="fas fa-rocket"></i>
      项目作品集
    </h1>
    <p class="hero-subtitle">展示我的技术实践与创作</p>
  </div>
</div>

<!-- pages/projects.md -->
<div class="projects">
{% if site.enable_project_categories and page.display_categories %}
  <!-- Display categorized projects -->
  {% for category in page.display_categories %}
  
  <div class="category-section">
    <a id="{{ category }}" href=".#{{ category }}" class="category-anchor">
      <div class="category-header">
        <h2 class="category-title">
          {% if category == "rendering" %}
            <i class="fas fa-paint-brush"></i>
          {% elsif category == "demo" %}
            <i class="fas fa-cube"></i>
          {% else %}
            <i class="fas fa-folder-open"></i>
          {% endif %}
          {{ category }}
        </h2>
        <div class="category-line"></div>
      </div>
    </a>
    
    {% assign categorized_projects = site.projects | where: "category", category %}
    {% assign sorted_projects = categorized_projects | sort: "importance" %}
    
    <!-- Generate cards for each project -->
    {% if page.horizontal %}
    <div class="container">
      <div class="row row-cols-1 row-cols-md-2">
      {% for project in sorted_projects %}
        {% include projects_horizontal.liquid %}
      {% endfor %}
      </div>
    </div>
    {% else %}
    <div class="row row-cols-1 row-cols-md-3 projects-grid">
      {% for project in sorted_projects %}
        {% include projects.liquid %}
      {% endfor %}
    </div>
    {% endif %}
  </div>
  {% endfor %}

{% else %}

<!-- Display projects without categories -->
{% assign sorted_projects = site.projects | sort: "importance" %}

  <!-- Generate cards for each project -->
{% if page.horizontal %}
  <div class="container">
    <div class="row row-cols-1 row-cols-md-2">
    {% for project in sorted_projects %}
      {% include projects_horizontal.liquid %}
    {% endfor %}
    </div>
  </div>
  {% else %}
  <div class="row row-cols-1 row-cols-md-3 projects-grid">
    {% for project in sorted_projects %}
      {% include projects.liquid %}
    {% endfor %}
  </div>
  {% endif %}
{% endif %}
</div>

<style>
/* ========== 页面头部 ========== */
.projects-hero {
  position: relative;
  padding: 4rem 2rem;
  margin: -1rem -1rem 3rem;
  border-radius: 20px;
  overflow: hidden;
  background: linear-gradient(135deg,
    rgba(var(--global-theme-color-rgb), 0.08) 0%,
    rgba(var(--global-theme-color-rgb), 0.03) 100%
  );
  border: 1px solid rgba(var(--global-theme-color-rgb), 0.2);
}

/* 背景图案 */
.hero-bg-pattern {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  opacity: 0.05;
  background-image: 
    repeating-linear-gradient(45deg, transparent, transparent 35px, var(--global-theme-color) 35px, var(--global-theme-color) 36px),
    repeating-linear-gradient(-45deg, transparent, transparent 35px, var(--global-theme-color) 35px, var(--global-theme-color) 36px);
  animation: pattern-move 20s linear infinite;
}

@keyframes pattern-move {
  0% { transform: translate(0, 0); }
  100% { transform: translate(50px, 50px); }
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

/* ========== 分类区域 ========== */
.category-section {
  margin-bottom: 4rem;
}

.category-anchor {
  text-decoration: none;
}

.category-header {
  margin-bottom: 2.5rem;
  position: relative;
}

.category-title {
  font-size: 2rem;
  font-weight: 700;
  color: var(--global-text-color);
  margin: 0 0 1rem 0;
  display: inline-flex;
  align-items: center;
  gap: 0.75rem;
  text-transform: capitalize;
  position: relative;
  z-index: 1;
}

.category-title i {
  color: var(--global-theme-color);
  font-size: 1.75rem;
}

.category-line {
  height: 3px;
  background: linear-gradient(90deg,
    var(--global-theme-color) 0%,
    var(--global-hover-color) 30%,
    transparent 100%
  );
  border-radius: 3px;
}

/* ========== 项目网格增强 ========== */
.projects-grid {
  gap: 2rem !important;
}

/* 增强项目卡片样式 */
.projects .card {
  border: 1px solid var(--global-divider-color);
  border-radius: 16px;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
  background: var(--global-bg-color);
  height: 100%;
  position: relative;
}

.projects .card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg,
    var(--global-theme-color) 0%,
    var(--global-hover-color) 100%
  );
  transform: scaleX(0);
  transform-origin: left;
  transition: transform 0.4s;
}

.projects .card:hover::before {
  transform: scaleX(1);
}

.projects .card:hover {
  transform: translateY(-10px);
  box-shadow: 0 16px 48px rgba(0,0,0,0.15);
  border-color: var(--global-theme-color);
}

/* 项目图片增强 */
.projects .card img {
  border-radius: 12px 12px 0 0;
  transition: transform 0.4s;
}

.projects .card:hover img {
  transform: scale(1.08);
}

/* 项目标题 */
.projects .card-title {
  font-weight: 700;
  font-size: 1.2rem;
  margin-bottom: 0.75rem;
  color: var(--global-text-color);
  transition: color 0.3s;
}

.projects .card:hover .card-title {
  color: var(--global-theme-color);
}

/* 项目描述 */
.projects .card-text {
  color: var(--global-text-color-light);
  line-height: 1.7;
  font-size: 0.95rem;
}

/* 项目徽章 */
.projects .badge {
  padding: 0.4rem 0.8rem;
  border-radius: 12px;
  font-weight: 600;
  font-size: 0.8rem;
  margin-right: 0.5rem;
  margin-bottom: 0.5rem;
}

/* 响应式 */
@media (max-width: 768px) {
  .projects-hero {
    padding: 3rem 1.5rem;
  }
  
  .hero-title {
    font-size: 2rem;
  }
  
  .category-title {
    font-size: 1.6rem;
  }
  
  .projects-grid {
    gap: 1.5rem !important;
  }
}
</style>