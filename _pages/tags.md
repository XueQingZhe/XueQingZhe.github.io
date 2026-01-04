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
    <div class="filter-items">
      {% for category in all_categories %}
      <label class="filter-checkbox">
        <input type="checkbox" class="category-filter" value="{{ category | slugify }}" onchange="applyFilters()">
        <span class="checkmark"></span>
        <span class="filter-label">{{ category }}</span>
        <span class="filter-count">
          {% assign count = 0 %}
          {% for post in all_posts %}
            {% if post.categories contains category %}
              {% assign count = count | plus: 1 %}
            {% endif %}
          {% endfor %}
          {{ count }}
        </span>
      </label>
      {% endfor %}
    </div>
  </div>
  
  <!-- Tags过滤 -->
  <div class="filter-group">
    <h4><i class="fas fa-tags"></i> 标签 (Tags)</h4>
    <div class="filter-items">
      {% for tag in all_tags %}
      <label class="filter-checkbox">
        <input type="checkbox" class="tag-filter" value="{{ tag | slugify }}" onchange="applyFilters()">
        <span class="checkmark"></span>
        <span class="filter-label">{{ tag }}</span>
        <span class="filter-count">
          {% assign count = 0 %}
          {% for post in all_posts %}
            {% if post.tags contains tag %}
              {% assign count = count | plus: 1 %}
            {% endif %}
          {% endfor %}
          {{ count }}
        </span>
      </label>
      {% endfor %}
    </div>
  </div>
</div>

<hr>

<!-- 文章列表 -->
<div class="posts-grid">
  {% for post in all_posts %}
  {% assign sorted_posts = all_posts | sort: 'date' | reverse %}
  {% endfor %}
  
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
      {% for tag in post.tags limit:4 %}
      <span class="mini-tag">{{ tag }}</span>
      {% endfor %}
    </div>
  </article>
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
    rgba(255, 255, 255, 0.05) 0%,
    rgba(255, 255, 255, 0.02) 100%
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

.filter-items {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 0.75rem;
}

/* 自定义复选框 */
.filter-checkbox {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  background: var(--global-bg-color);
  border: 1px solid var(--global-divider-color);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.3s;
  position: relative;
  user-select: none;
}

.filter-checkbox:hover {
  background: var(--global-code-bg-color);
  border-color: var(--global-theme-color);
}

.filter-checkbox input[type="checkbox"] {
  position: absolute;
  opacity: 0;
  cursor: pointer;
}

/* 自定义复选框样式 */
.checkmark {
  width: 20px;
  height: 20px;
  border: 2px solid var(--global-divider-color);
  border-radius: 6px;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.filter-checkbox input:checked ~ .checkmark {
  background: var(--global-theme-color);
  border-color: var(--global-theme-color);
}

.filter-checkbox input:checked ~ .checkmark::after {
  content: '✓';
  color: white;
  font-size: 14px;
  font-weight: bold;
}

.filter-label {
  flex-grow: 1;
  font-size: 0.9rem;
  color: var(--global-text-color);
}

.filter-count {
  background: var(--global-code-bg-color);
  color: var(--global-text-color-light);
  padding: 0.2rem 0.6rem;
  border-radius: 8px;
  font-size: 0.8rem;
  font-weight: 600;
  min-width: 2rem;
  text-align: center;
}

.filter-checkbox input:checked ~ .filter-count {
  background: var(--global-theme-color);
  color: white;
}

/* ========== 文章网格 ========== */
.posts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1.5rem;
  margin: 2rem 0;
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
  .filter-items {
    grid-template-columns: 1fr;
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
// 过滤功能
function applyFilters() {
  const selectedTags = Array.from(document.querySelectorAll('.tag-filter:checked'))
    .map(cb => cb.value);
  const selectedCategories = Array.from(document.querySelectorAll('.category-filter:checked'))
    .map(cb => cb.value);
  
  const posts = document.querySelectorAll('.post-card');
  let visibleCount = 0;
  
  posts.forEach(post => {
    const postTags = (post.dataset.tags || '').split(' ').filter(Boolean);
    const postCategories = (post.dataset.categories || '').split(' ').filter(Boolean);
    
    let showPost = true;
    
    // 如果选择了categories,必须匹配至少一个
    if (selectedCategories.length > 0) {
      const categoryMatch = selectedCategories.some(cat => 
        postCategories.includes(cat)
      );
      if (!categoryMatch) showPost = false;
    }
    
    // 如果选择了tags,必须匹配至少一个
    if (selectedTags.length > 0) {
      const tagMatch = selectedTags.some(tag => 
        postTags.includes(tag)
      );
      if (!tagMatch) showPost = false;
    }
    
    if (showPost) {
      post.classList.remove('hidden');
      visibleCount++;
    } else {
      post.classList.add('hidden');
    }
  });
  
  // 显示/隐藏无结果提示
  const noResults = document.querySelector('.no-results');
  if (visibleCount === 0) {
    noResults.style.display = 'block';
  } else {
    noResults.style.display = 'none';
  }
}

// 清除所有筛选
function clearAllFilters() {
  document.querySelectorAll('.tag-filter, .category-filter').forEach(cb => {
    cb.checked = false;
  });
  applyFilters();
}
</script>