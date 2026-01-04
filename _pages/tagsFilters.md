---
layout: page
permalink: /tags/
title: tagsFilters
description: 按标签浏览所有文章和教程
nav: true
nav_order: 6
---

{% assign all_posts = site.posts | concat: site.tutorials %}
{% assign all_tags = "" | split: "" %}
{% assign all_categories = "" | split: "" %}

{% for post in all_posts %}
  {% if post.tags %}
    {% for tag in post.tags %}
      {% unless all_tags contains tag %}
        {% assign all_tags = all_tags | push: tag %}
      {% endunless %}
    {% endfor %}
  {% endif %}
  
  {% if post.categories %}
    {% for category in post.categories %}
      {% unless all_categories contains category %}
        {% assign all_categories = all_categories | push: category %}
      {% endunless %}
    {% endfor %}
  {% endif %}
{% endfor %}

<!-- 页面头部 -->
<div class="tags-hero">
  <div class="hero-content">
    <h1 class="hero-title">
      <i class="fas fa-filter"></i>
      筛选文章
    </h1>
    <p class="hero-subtitle">通过分类和标签快速找到你感兴趣的内容</p>
  </div>
  <button class="clear-filters-hero" onclick="clearAllFilters()">
    <i class="fas fa-redo-alt"></i>
    <span>清除筛选</span>
  </button>
</div>

<!-- 过滤器区域 -->
<div class="filter-section">
  <!-- Categories -->
  <div class="filter-group">
    <div class="filter-group-header">
      <h3><i class="fas fa-folder-open"></i> 分类</h3>
      <span class="filter-count">{{ all_categories.size }} 个分类</span>
    </div>
    <div class="filter-tags">
      {% for category in all_categories %}
      {% assign count = 0 %}
      {% for post in all_posts %}
        {% if post.categories contains category %}
          {% assign count = count | plus: 1 %}
        {% endif %}
      {% endfor %}
      <div class="filter-tag category-tag" data-type="category" data-value="{{ category | slugify }}" onclick="toggleFilter(this)">
        <span class="tag-icon"><i class="fas fa-folder"></i></span>
        <span class="tag-name">{{ category }}</span>
        <span class="tag-count">{{ count }}</span>
      </div>
      {% endfor %}
    </div>
  </div>
  
  <!-- Tags -->
  <div class="filter-group">
    <div class="filter-group-header">
      <h3><i class="fas fa-tags"></i> 标签</h3>
      <span class="filter-count">{{ all_tags.size }} 个标签</span>
    </div>
    <div class="filter-tags">
      {% for tag in all_tags %}
      {% assign count = 0 %}
      {% for post in all_posts %}
        {% if post.tags contains tag %}
          {% assign count = count | plus: 1 %}
        {% endif %}
      {% endfor %}
      <div class="filter-tag tag-tag" data-type="tag" data-value="{{ tag | slugify }}" onclick="toggleFilter(this)">
        <span class="tag-icon"><i class="fas fa-tag"></i></span>
        <span class="tag-name">{{ tag }}</span>
        <span class="tag-count">{{ count }}</span>
      </div>
      {% endfor %}
    </div>
  </div>
</div>

<div class="results-divider">
  <span class="results-text">
    <i class="fas fa-arrow-down"></i>
    筛选结果
  </span>
</div>

<!-- 标签列表 -->
<div class="tags-list">
  {% for category in all_categories %}
    {% assign category_posts = "" | split: "" %}
    {% for post in all_posts %}
      {% if post.categories contains category %}
        {% assign category_posts = category_posts | push: post %}
      {% endif %}
    {% endfor %}
    
    {% assign sorted_posts = category_posts | sort: 'date' | reverse %}
    
    <div class="tag-section" data-category="{{ category | slugify }}">
      <div class="section-header">
        <h2 class="tag-title">
          <span class="title-icon"><i class="fas fa-folder-open"></i></span>
          <span class="title-text">{{ category }}</span>
          <span class="tag-count-badge">{{ sorted_posts.size }}</span>
        </h2>
      </div>
      
      <div class="posts-grid">
        {% for post in sorted_posts %}
        <article class="post-card" 
          data-tags="{{ post.tags | join: ',' | slugify | split: ',' | join: ' ' }}"
          data-categories="{{ post.categories | join: ',' | slugify | split: ',' | join: ' ' }}">
          
          <div class="card-accent"></div>
          
          <div class="post-meta">
            <time datetime="{{ post.date | date_to_xmlschema }}">
              <i class="far fa-calendar-alt"></i>
              {{ post.date | date: "%Y-%m-%d" }}
            </time>
            {% if post.tutorial_series %}
            <span class="post-series">
              <i class="fas fa-book-open"></i>
              {{ post.tutorial_series }}
            </span>
            {% endif %}
          </div>
          
          <h3 class="post-title">
            <a href="{{ post.url | relative_url }}">{{ post.title }}</a>
          </h3>
          
          {% if post.description %}
          <p class="post-description">{{ post.description | truncate: 100 }}</p>
          {% endif %}
          
          <div class="post-tags">
            {% for tag in post.tags limit:4 %}
            <span class="mini-tag">
              <i class="fas fa-hashtag"></i>
              {{ tag }}
            </span>
            {% endfor %}
          </div>
        </article>
        {% endfor %}
      </div>
    </div>
  {% endfor %}
  
  {% for tag in all_tags %}
    {% assign tag_posts = "" | split: "" %}
    {% for post in all_posts %}
      {% if post.tags contains tag %}
        {% assign tag_posts = tag_posts | push: post %}
      {% endif %}
    {% endfor %}
    
    {% assign sorted_posts = tag_posts | sort: 'date' | reverse %}
    
    <div class="tag-section" data-tag="{{ tag | slugify }}">
      <div class="section-header">
        <h2 class="tag-title">
          <span class="title-icon"><i class="fas fa-tag"></i></span>
          <span class="title-text">{{ tag }}</span>
          <span class="tag-count-badge">{{ sorted_posts.size }}</span>
        </h2>
      </div>
      
      <div class="posts-grid">
        {% for post in sorted_posts %}
        <article class="post-card"
          data-tags="{{ post.tags | join: ',' | slugify | split: ',' | join: ' ' }}"
          data-categories="{{ post.categories | join: ',' | slugify | split: ',' | join: ' ' }}">
          
          <div class="card-accent"></div>
          
          <div class="post-meta">
            <time datetime="{{ post.date | date_to_xmlschema }}">
              <i class="far fa-calendar-alt"></i>
              {{ post.date | date: "%Y-%m-%d" }}
            </time>
            {% if post.categories %}
            <span class="post-category">
              <i class="fas fa-folder"></i>
              {{ post.categories | first }}
            </span>
            {% endif %}
          </div>
          
          <h3 class="post-title">
            <a href="{{ post.url | relative_url }}">{{ post.title }}</a>
          </h3>
          
          {% if post.description %}
          <p class="post-description">{{ post.description | truncate: 100 }}</p>
          {% endif %}
          
          <div class="post-tags">
            {% for post_tag in post.tags limit:4 %}
            {% if post_tag != tag %}
            <span class="mini-tag">
              <i class="fas fa-hashtag"></i>
              {{ post_tag }}
            </span>
            {% endif %}
            {% endfor %}
          </div>
        </article>
        {% endfor %}
      </div>
    </div>
  {% endfor %}
</div>

<!-- 无结果提示 -->
<div class="no-results" style="display: none;">
  <div class="no-results-icon">
    <i class="fas fa-search"></i>
  </div>
  <h3>未找到匹配的文章</h3>
  <p>试试调整筛选条件,或者
    <button onclick="clearAllFilters()" class="inline-clear-btn">清除所有筛选</button>
  </p>
</div>

<style>
/* ========== 页面头部 ========== */
.tags-hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 2.5rem 2rem;
  margin: -1rem -1rem 2rem;
  background: linear-gradient(135deg,
    rgba(var(--global-theme-color-rgb), 0.08) 0%,
    rgba(var(--global-theme-color-rgb), 0.03) 100%
  );
  border-radius: 16px;
  border: 1px solid rgba(var(--global-theme-color-rgb), 0.2);
  position: relative;
  overflow: hidden;
}

.tags-hero::before {
  content: '';
  position: absolute;
  top: -50%;
  right: -10%;
  width: 40%;
  height: 200%;
  background: radial-gradient(
    circle,
    rgba(var(--global-theme-color-rgb), 0.1) 0%,
    transparent 70%
  );
  animation: float 20s ease-in-out infinite;
}

@keyframes float {
  0%, 100% { transform: translateY(0) rotate(0deg); }
  50% { transform: translateY(-20px) rotate(5deg); }
}

.hero-content {
  position: relative;
  z-index: 1;
}

.hero-title {
  font-size: 2rem;
  font-weight: 700;
  margin: 0 0 0.5rem 0;
  background: linear-gradient(135deg,
    var(--global-theme-color) 0%,
    var(--global-hover-color) 100%
  );
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.hero-subtitle {
  color: var(--global-text-color-light);
  margin: 0;
  font-size: 1.05rem;
}

.clear-filters-hero {
  background: var(--global-theme-color);
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  gap: 0.6rem;
  font-size: 1rem;
  font-weight: 600;
  box-shadow: 0 4px 12px rgba(var(--global-theme-color-rgb), 0.3);
  position: relative;
  z-index: 1;
}

.clear-filters-hero:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(var(--global-theme-color-rgb), 0.4);
}

/* ========== 过滤器区域 ========== */
.filter-section {
  background: var(--global-bg-color);
  border: 1px solid var(--global-divider-color);
  border-radius: 16px;
  padding: 2rem;
  margin: 2rem 0;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
}

.filter-group {
  margin-bottom: 2.5rem;
}

.filter-group:last-child {
  margin-bottom: 0;
}

.filter-group-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.25rem;
  padding-bottom: 0.75rem;
  border-bottom: 2px solid var(--global-divider-color);
}

.filter-group-header h3 {
  margin: 0;
  font-size: 1.2rem;
  color: var(--global-text-color);
  display: flex;
  align-items: center;
  gap: 0.6rem;
  font-weight: 700;
}

.filter-count {
  background: var(--global-code-bg-color);
  color: var(--global-text-color-light);
  padding: 0.3rem 0.8rem;
  border-radius: 12px;
  font-size: 0.85rem;
  font-weight: 600;
}

.filter-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

/* 过滤标签样式 */
.filter-tag {
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.7rem 1.2rem;
  background: var(--global-bg-color);
  border: 2px solid var(--global-divider-color);
  border-radius: 28px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  user-select: none;
  position: relative;
  overflow: hidden;
}

.filter-tag::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg,
    var(--global-theme-color) 0%,
    var(--global-hover-color) 100%
  );
  opacity: 0;
  transition: opacity 0.3s;
}

.filter-tag > * {
  position: relative;
  z-index: 1;
}

.filter-tag:hover {
  transform: translateY(-3px);
  box-shadow: 0 6px 16px rgba(0,0,0,0.15);
  border-color: var(--global-theme-color);
}

.filter-tag.active {
  border-color: var(--global-theme-color);
  box-shadow: 0 8px 20px rgba(var(--global-theme-color-rgb), 0.3);
}

.filter-tag.active::before {
  opacity: 1;
}

.filter-tag.active .tag-icon,
.filter-tag.active .tag-name,
.filter-tag.active .tag-count {
  color: white;
}

.tag-icon {
  font-size: 1.1rem;
  color: var(--global-theme-color);
  transition: color 0.3s;
}

.tag-name {
  font-weight: 600;
  font-size: 0.95rem;
  color: var(--global-text-color);
  transition: color 0.3s;
}

.tag-count {
  background: var(--global-code-bg-color);
  color: var(--global-text-color-light);
  padding: 0.25rem 0.7rem;
  border-radius: 14px;
  font-size: 0.8rem;
  font-weight: 700;
  min-width: 2rem;
  text-align: center;
  transition: all 0.3s;
}

.filter-tag.active .tag-count {
  background: rgba(255,255,255,0.25);
}

/* ========== 分隔线 ========== */
.results-divider {
  text-align: center;
  margin: 3rem 0;
  position: relative;
}

.results-divider::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  height: 1px;
  background: var(--global-divider-color);
}

.results-text {
  display: inline-block;
  background: var(--global-bg-color);
  padding: 0.5rem 1.5rem;
  color: var(--global-text-color-light);
  font-weight: 600;
  position: relative;
  z-index: 1;
  border: 1px solid var(--global-divider-color);
  border-radius: 20px;
}

.results-text i {
  animation: bounce 2s ease-in-out infinite;
}

@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(4px); }
}

/* ========== 标签section ========== */
.tag-section {
  margin-bottom: 4rem;
  scroll-margin-top: 100px;
}

.tag-section.hidden {
  display: none;
}

.section-header {
  margin-bottom: 2rem;
}

.tag-title {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin: 0;
  padding-bottom: 1rem;
  border-bottom: 3px solid var(--global-theme-color);
  position: relative;
}

.tag-title::after {
  content: '';
  position: absolute;
  bottom: -3px;
  left: 0;
  width: 100px;
  height: 3px;
  background: var(--global-hover-color);
}

.title-icon {
  font-size: 1.5rem;
  color: var(--global-theme-color);
}

.title-text {
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--global-text-color);
}

.tag-count-badge {
  background: linear-gradient(135deg,
    var(--global-theme-color) 0%,
    var(--global-hover-color) 100%
  );
  color: white;
  padding: 0.4rem 1rem;
  border-radius: 16px;
  font-size: 0.95rem;
  font-weight: 700;
  margin-left: auto;
  box-shadow: 0 2px 8px rgba(var(--global-theme-color-rgb), 0.3);
}

/* ========== 文章卡片 ========== */
.posts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1.5rem;
}

.post-card {
  background: var(--global-bg-color);
  border: 1px solid var(--global-divider-color);
  border-radius: 16px;
  padding: 1.75rem;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
}

/* 卡片装饰条 */
.card-accent {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 4px;
  background: linear-gradient(90deg,
    var(--global-theme-color) 0%,
    var(--global-hover-color) 100%
  );
  transform: scaleX(0);
  transform-origin: left;
  transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.post-card:hover .card-accent {
  transform: scaleX(1);
}

.post-card:hover {
  transform: translateY(-6px);
  box-shadow: 0 12px 32px rgba(0,0,0,0.15);
  border-color: var(--global-theme-color);
}

.post-meta {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
  font-size: 0.85rem;
  color: var(--global-text-color-light);
  flex-wrap: wrap;
}

.post-category,
.post-series {
  background: var(--global-code-bg-color);
  padding: 0.3rem 0.7rem;
  border-radius: 8px;
  font-size: 0.75rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.3rem;
}

.post-category {
  color: var(--global-theme-color);
  border: 1px solid rgba(var(--global-theme-color-rgb), 0.3);
}

.post-series {
  color: var(--global-hover-color);
  border: 1px solid rgba(var(--global-hover-color-rgb), 0.3);
}

.post-title {
  margin: 0 0 1rem 0;
  font-size: 1.2rem;
  line-height: 1.4;
  font-weight: 700;
}

.post-title a {
  color: var(--global-text-color);
  text-decoration: none;
  transition: color 0.3s;
}

.post-title a:hover {
  color: var(--global-theme-color);
}

.post-description {
  color: var(--global-text-color-light);
  font-size: 0.95rem;
  line-height: 1.7;
  margin-bottom: 1rem;
  flex-grow: 1;
}

.post-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: auto;
  padding-top: 1rem;
  border-top: 1px solid var(--global-divider-color);
}

.mini-tag {
  background: var(--global-code-bg-color);
  padding: 0.3rem 0.7rem;
  border-radius: 8px;
  font-size: 0.75rem;
  color: var(--global-text-color-light);
  display: flex;
  align-items: center;
  gap: 0.3rem;
  transition: all 0.2s;
}

.mini-tag:hover {
  background: var(--global-theme-color);
  color: white;
  transform: translateY(-2px);
}

/* ========== 无结果提示 ========== */
.no-results {
  text-align: center;
  padding: 5rem 2rem;
}

.no-results-icon {
  font-size: 4rem;
  color: var(--global-divider-color);
  margin-bottom: 1.5rem;
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 0.5; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.1); }
}

.no-results h3 {
  color: var(--global-text-color);
  margin: 0 0 0.75rem;
  font-size: 1.5rem;
}

.no-results p {
  color: var(--global-text-color-light);
  font-size: 1.05rem;
}

.inline-clear-btn {
  background: none;
  border: none;
  color: var(--global-theme-color);
  text-decoration: underline;
  cursor: pointer;
  font-size: inherit;
  padding: 0;
  font-weight: 600;
}

.inline-clear-btn:hover {
  color: var(--global-hover-color);
}

/* ========== 响应式 ========== */
@media (max-width: 768px) {
  .tags-hero {
    flex-direction: column;
    gap: 1.5rem;
    padding: 2rem 1.5rem;
  }
  
  .hero-title {
    font-size: 1.5rem;
  }
  
  .filter-section {
    padding: 1.5rem;
  }
  
  .filter-tags {
    gap: 0.5rem;
  }
  
  .filter-tag {
    font-size: 0.85rem;
    padding: 0.6rem 1rem;
  }
  
  .posts-grid {
    grid-template-columns: 1fr;
  }
  
  .tag-title .title-text {
    font-size: 1.4rem;
  }
}
</style>

<script>
function toggleFilter(element) {
  element.classList.toggle('active');
  applyFilters();
}

function applyFilters() {
  const selectedTags = Array.from(document.querySelectorAll('.filter-tag[data-type="tag"].active'))
    .map(el => el.dataset.value);
  const selectedCategories = Array.from(document.querySelectorAll('.filter-tag[data-type="category"].active'))
    .map(el => el.dataset.value);
  
  const sections = document.querySelectorAll('.tag-section');
  let hasVisibleSection = false;
  
  sections.forEach(section => {
    const sectionTag = section.dataset.tag;
    const sectionCategory = section.dataset.category;
    
    let showSection = true;
    
    if (selectedTags.length > 0 || selectedCategories.length > 0) {
      showSection = false;
      
      if (sectionTag && selectedTags.includes(sectionTag)) {
        showSection = true;
      }
      if (sectionCategory && selectedCategories.includes(sectionCategory)) {
        showSection = true;
      }
    }
    
    if (showSection) {
      section.classList.remove('hidden');
      hasVisibleSection = true;
    } else {
      section.classList.add('hidden');
    }
  });
  
  const noResults = document.querySelector('.no-results');
  if (!hasVisibleSection && (selectedTags.length > 0 || selectedCategories.length > 0)) {
    noResults.style.display = 'block';
  } else {
    noResults.style.display = 'none';
  }
}

function clearAllFilters() {
  document.querySelectorAll('.filter-tag.active').forEach(el => {
    el.classList.remove('active');
  });
  applyFilters();
}
</script>