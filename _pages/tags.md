---
layout: page
permalink: /tags/
title: tags
description: 按标签浏览所有文章和教程
nav: true
nav_order: 6
---

{% assign all_posts = site.posts | concat: site.tutorials %}
{% assign all_tags = "" | split: "" %}
{% assign all_categories = "" | split: "" %}

{% comment %} 收集所有标签和分类 {% endcomment %}
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

<!-- 过滤器区域 -->
<div class="filter-section">
  <div class="filter-header">
    <h3><i class="fas fa-filter"></i> 筛选文章</h3>
    <button class="clear-filters" onclick="clearAllFilters()">
      <i class="fas fa-times-circle"></i> 清除筛选
    </button>
  </div>
  
  <!-- Categories过滤 -->
  <div class="filter-group">
    <h4><i class="fas fa-folder"></i> 分类 (Categories)</h4>
    <div class="filter-tags">
      {% for category in all_categories %}
      {% assign count = 0 %}
      {% for post in all_posts %}
        {% if post.categories contains category %}
          {% assign count = count | plus: 1 %}
        {% endif %}
      {% endfor %}
      <div class="filter-tag" data-type="category" data-value="{{ category | slugify }}" onclick="toggleFilter(this)">
        <span class="tag-name">{{ category }}</span>
        <span class="tag-count">{{ count }}</span>
      </div>
      {% endfor %}
    </div>
  </div>
  
  <!-- Tags过滤 -->
  <div class="filter-group">
    <h4><i class="fas fa-tags"></i> 标签 (Tags)</h4>
    <div class="filter-tags">
      {% for tag in all_tags %}
      {% assign count = 0 %}
      {% for post in all_posts %}
        {% if post.tags contains tag %}
          {% assign count = count | plus: 1 %}
        {% endif %}
      {% endfor %}
      <div class="filter-tag" data-type="tag" data-value="{{ tag | slugify }}" onclick="toggleFilter(this)">
        <span class="tag-name">{{ tag }}</span>
        <span class="tag-count">{{ count }}</span>
      </div>
      {% endfor %}
    </div>
  </div>
</div>

<hr>

<!-- 标签列表(原有的展示方式) -->
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
      <h2 class="tag-title">
        <i class="fas fa-folder"></i>
        {{ category }}
        <span class="tag-count-badge">{{ sorted_posts.size }} 篇</span>
      </h2>
      
      <div class="posts-grid">
        {% for post in sorted_posts %}
        <article class="post-card" 
          data-tags="{{ post.tags | join: ',' | slugify | split: ',' | join: ' ' }}"
          data-categories="{{ post.categories | join: ',' | slugify | split: ',' | join: ' ' }}">
          
          <div class="post-meta">
            <time datetime="{{ post.date | date_to_xmlschema }}">
              <i class="far fa-calendar"></i>
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
            <span class="mini-tag">{{ tag }}</span>
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
      <h2 class="tag-title">
        <i class="fas fa-tag"></i>
        {{ tag }}
        <span class="tag-count-badge">{{ sorted_posts.size }} 篇</span>
      </h2>
      
      <div class="posts-grid">
        {% for post in sorted_posts %}
        <article class="post-card"
          data-tags="{{ post.tags | join: ',' | slugify | split: ',' | join: ' ' }}"
          data-categories="{{ post.categories | join: ',' | slugify | split: ',' | join: ' ' }}">
          
          <div class="post-meta">
            <time datetime="{{ post.date | date_to_xmlschema }}">
              <i class="far fa-calendar"></i>
              {{ post.date | date: "%Y-%m-%d" }}
            </time>
            
            {% if post.categories %}
            <span class="post-category">
              <i class="fas fa-folder"></i>
              {{ post.categories | first }}
            </span>
            {% endif %}
            
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
            {% for post_tag in post.tags limit:4 %}
            {% if post_tag != tag %}
            <span class="mini-tag">{{ post_tag }}</span>
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
  <i class="fas fa-search fa-3x"></i>
  <h3>未找到匹配的文章</h3>
  <p>请尝试调整筛选条件</p>
</div>

<style>
/* ========== 过滤器区域 ========== */
.filter-section {
  background: linear-gradient(135deg,
    rgba(255, 255, 255, 0.03) 0%,
    rgba(255, 255, 255, 0.01) 100%
  );
  border: 1px solid var(--global-divider-color);
  border-radius: 16px;
  padding: 2rem;
  margin: 2rem 0;
}

.filter-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid var(--global-divider-color);
}

.filter-header h3 {
  margin: 0;
  color: var(--global-theme-color);
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.clear-filters {
  background: transparent;
  border: 1px solid var(--global-divider-color);
  color: var(--global-text-color);
  padding: 0.5rem 1rem;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
}

.clear-filters:hover {
  background: var(--global-theme-color);
  color: white;
  border-color: var(--global-theme-color);
}

/* 过滤组 */
.filter-group {
  margin-bottom: 2rem;
}

.filter-group:last-child {
  margin-bottom: 0;
}

.filter-group h4 {
  color: var(--global-text-color);
  margin-bottom: 1rem;
  font-size: 1.1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.filter-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

/* 过滤标签 - 点击变亮 */
.filter-tag {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.6rem 1.1rem;
  background: var(--global-bg-color);
  border: 1px solid var(--global-divider-color);
  border-radius: 24px;
  color: var(--global-text-color);
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  font-size: 0.9rem;
  user-select: none;
}

.filter-tag:hover {
  background: var(--global-code-bg-color);
  border-color: var(--global-theme-color);
  transform: translateY(-2px);
}

/* 选中状态 - 点亮 */
.filter-tag.active {
  background: var(--global-theme-color);
  color: white;
  border-color: var(--global-theme-color);
  box-shadow: 0 4px 12px rgba(var(--global-theme-color-rgb), 0.4);
}

.tag-name {
  font-weight: 500;
}

.tag-count {
  background: rgba(0,0,0,0.1);
  padding: 0.2rem 0.6rem;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 600;
  min-width: 1.8rem;
  text-align: center;
}

.filter-tag.active .tag-count {
  background: rgba(255,255,255,0.3);
}

/* ========== 标签列表 ========== */
.tags-list {
  margin-top: 3rem;
}

.tag-section {
  margin-bottom: 4rem;
  scroll-margin-top: 100px;
}

.tag-section.hidden {
  display: none;
}

.tag-title {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
  color: var(--global-theme-color);
  font-size: 1.75rem;
  border-bottom: 2px solid var(--global-theme-color);
  padding-bottom: 0.5rem;
}

.tag-count-badge {
  background: var(--global-theme-color);
  color: white;
  padding: 0.3rem 0.8rem;
  border-radius: 12px;
  font-size: 0.9rem;
  font-weight: 500;
}

/* 文章网格 */
.posts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1.5rem;
}

.post-card {
  background: var(--global-bg-color);
  border: 1px solid var(--global-divider-color);
  border-radius: 12px;
  padding: 1.5rem;
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
}

.post-card.hidden {
  display: none;
}

.post-card:hover {
  box-shadow: 0 8px 24px rgba(0,0,0,0.12);
  transform: translateY(-4px);
  border-color: var(--global-theme-color);
}

.post-meta {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
  font-size: 0.85rem;
  color: var(--global-text-color-light);
  flex-wrap: wrap;
}

.post-category {
  background: var(--global-theme-color);
  color: white;
  padding: 0.25rem 0.7rem;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 0.3rem;
}

.post-series {
  background: var(--global-code-bg-color);
  color: var(--global-theme-color);
  padding: 0.25rem 0.7rem;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 500;
  border: 1px solid var(--global-theme-color);
  display: flex;
  align-items: center;
  gap: 0.3rem;
}

.post-title {
  margin: 0 0 0.75rem 0;
  font-size: 1.15rem;
  line-height: 1.4;
  font-weight: 600;
}

.post-title a {
  color: var(--global-text-color);
  text-decoration: none;
  transition: color 0.2s;
}

.post-title a:hover {
  color: var(--global-theme-color);
}

.post-description {
  color: var(--global-text-color-light);
  font-size: 0.9rem;
  line-height: 1.6;
  margin-bottom: 0.75rem;
  flex-grow: 1;
}

.post-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: auto;
  padding-top: 0.75rem;
  border-top: 1px solid var(--global-divider-color);
}

.mini-tag {
  background: var(--global-code-bg-color);
  padding: 0.25rem 0.6rem;
  border-radius: 6px;
  font-size: 0.75rem;
  color: var(--global-text-color-light);
}

/* 无结果提示 */
.no-results {
  text-align: center;
  padding: 4rem 2rem;
  color: var(--global-text-color-light);
}

.no-results i {
  color: var(--global-divider-color);
  margin-bottom: 1rem;
}

.no-results h3 {
  color: var(--global-text-color);
  margin: 1rem 0 0.5rem;
}

/* 响应式 */
@media (max-width: 768px) {
  .filter-tags {
    gap: 0.5rem;
  }
  
  .filter-tag {
    font-size: 0.85rem;
    padding: 0.5rem 0.9rem;
  }
  
  .posts-grid {
    grid-template-columns: 1fr;
  }
  
  .filter-section {
    padding: 1.5rem;
  }
  
  .filter-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }
}
</style>

<script>
// 切换过滤器
function toggleFilter(element) {
  element.classList.toggle('active');
  applyFilters();
}

// 应用过滤
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
    
    // 如果有筛选条件
    if (selectedTags.length > 0 || selectedCategories.length > 0) {
      showSection = false;
      
      // 检查是否匹配
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
  
  // 显示/隐藏无结果提示
  const noResults = document.querySelector('.no-results');
  if (!hasVisibleSection && (selectedTags.length > 0 || selectedCategories.length > 0)) {
    noResults.style.display = 'block';
  } else {
    noResults.style.display = 'none';
  }
}

// 清除所有筛选
function clearAllFilters() {
  document.querySelectorAll('.filter-tag.active').forEach(el => {
    el.classList.remove('active');
  });
  applyFilters();
}
</script>