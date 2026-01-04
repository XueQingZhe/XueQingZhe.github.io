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

{% for post in all_posts %}
  {% if post.tags %}
    {% for tag in post.tags %}
      {% unless all_tags contains tag %}
        {% assign all_tags = all_tags | push: tag %}
      {% endunless %}
    {% endfor %}
  {% endif %}
{% endfor %}

<div class="tags-cloud">
  {% for tag in all_tags %}
    {% assign tag_post_count = 0 %}
    {% for post in all_posts %}
      {% if post.tags contains tag %}
        {% assign tag_post_count = tag_post_count | plus: 1 %}
      {% endif %}
    {% endfor %}
    
    <a href="#{{ tag | slugify }}" class="tag-item" data-count="{{ tag_post_count }}">
      <span class="tag-name">{{ tag }}</span>
      <span class="tag-count">{{ tag_post_count }}</span>
    </a>
  {% endfor %}
</div>

<hr>

<div class="tags-list">
  {% for tag in all_tags %}
    {% assign tag_posts = "" | split: "" %}
    {% for post in all_posts %}
      {% if post.tags contains tag %}
        {% assign tag_posts = tag_posts | push: post %}
      {% endif %}
    {% endfor %}
    
    {% assign sorted_posts = tag_posts | sort: 'date' | reverse %}
    
    <div class="tag-section" id="{{ tag | slugify }}">
      <h2 class="tag-title">
        <i class="fas fa-tag"></i>
        {{ tag }}
        <span class="tag-count-badge">{{ sorted_posts.size }} 篇</span>
      </h2>
      
      <div class="posts-grid">
        {% for post in sorted_posts %}
        <article class="post-card">
          <div class="post-meta">
            <time datetime="{{ post.date | date_to_xmlschema }}">
              <i class="far fa-calendar"></i>
              {{ post.date | date: "%Y-%m-%d" }}
            </time>
            {% if post.categories %}
            <span class="post-category">
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
          
          {% if post.tags %}
          <div class="post-tags">
            {% for post_tag in post.tags limit:4 %}
            {% if post_tag != tag %}
            <span class="mini-tag">{{ post_tag }}</span>
            {% endif %}
            {% endfor %}
          </div>
          {% endif %}
        </article>
        {% endfor %}
      </div>
    </div>
  {% endfor %}
</div>

<style>
/* ========== 渐变标签云 ========== */
.tags-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin: 2rem 0;
  padding: 2.5rem;
  
  /* 多色渐变背景 */
  background: linear-gradient(135deg, 
    rgba(99, 102, 241, 0.1) 0%,
    rgba(168, 85, 247, 0.1) 25%,
    rgba(236, 72, 153, 0.1) 50%,
    rgba(251, 146, 60, 0.1) 75%,
    rgba(34, 197, 94, 0.1) 100%
  );
  
  border-radius: 16px;
  border: 1px solid var(--global-divider-color);
  position: relative;
  overflow: hidden;
}

/* 添加动态光效 */
.tags-cloud::before {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(
    circle,
    rgba(var(--global-theme-color-rgb), 0.1) 0%,
    transparent 70%
  );
  animation: rotate-gradient 20s linear infinite;
  pointer-events: none;
}

@keyframes rotate-gradient {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.tag-item {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.6rem 1.1rem;
  background: var(--global-bg-color);
  border: 1px solid var(--global-divider-color);
  border-radius: 24px;
  color: var(--global-text-color);
  text-decoration: none;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  font-size: 0.9rem;
  position: relative;
  z-index: 1;
  backdrop-filter: blur(10px);
}

.tag-item:hover {
  background: linear-gradient(135deg, 
    var(--global-theme-color) 0%, 
    var(--global-hover-color) 100%
  );
  color: white;
  border-color: transparent;
  transform: translateY(-3px) scale(1.05);
  box-shadow: 0 8px 20px rgba(0,0,0,0.2);
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

.tag-item:hover .tag-count {
  background: rgba(255,255,255,0.3);
}

/* 标签列表 */
.tags-list {
  margin-top: 3rem;
}

.tag-section {
  margin-bottom: 4rem;
  scroll-margin-top: 100px;
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
  background: linear-gradient(135deg, 
    var(--global-theme-color) 0%, 
    var(--global-hover-color) 100%
  );
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
  transition: all 0.2s;
}

.mini-tag:hover {
  background: var(--global-theme-color);
  color: white;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .posts-grid {
    grid-template-columns: 1fr;
  }
  
  .tags-cloud {
    padding: 1.5rem;
  }
  
  .tag-title {
    font-size: 1.5rem;
  }
}
</style>

<script>
// 平滑滚动到标签
document.querySelectorAll('.tag-item').forEach(item => {
  item.addEventListener('click', (e) => {
    e.preventDefault();
    const target = document.querySelector(item.getAttribute('href'));
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      
      // 高亮标签标题
      const title = target.querySelector('.tag-title');
      if (title) {
        title.style.animation = 'highlight 0.6s ease';
        setTimeout(() => {
          title.style.animation = '';
        }, 600);
      }
    }
  });
});

// 高亮动画
const style = document.createElement('style');
style.textContent = `
  @keyframes highlight {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.05); }
  }
`;
document.head.appendChild(style);
</script>