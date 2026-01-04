---
layout: default
permalink: /blog/
title: blog
nav: true
nav_order: 2
pagination:
  enabled: true
  collection: posts
  permalink: /page/:num/
  per_page: 5
  sort_field: date
  sort_reverse: true
  trail:
    before: 1
    after: 3
---

<div class="post">

{% assign blog_name_size = site.blog_name | size %}
{% assign blog_description_size = site.blog_description | size %}

{% if blog_name_size > 0 or blog_description_size > 0 %}
  <div class="header-bar">
    <h1>{{ site.blog_name }}</h1>
    <h2>{{ site.blog_description }}</h2>
  </div>
{% endif %}

{% assign featured_posts = site.posts | where: "featured", "true" %}
{% if featured_posts.size > 0 %}
<br>
<div class="container featured-posts">
{% assign is_even = featured_posts.size | modulo: 2 %}
<div class="row row-cols-{% if featured_posts.size <= 2 or is_even == 0 %}2{% else %}3{% endif %}">
{% for post in featured_posts %}
<div class="col mb-4">
<a href="{{ post.url | relative_url }}">
<div class="card hoverable featured-card">
<div class="row g-0">
<div class="col-md-12">
<div class="card-body">
<div class="float-right">
<i class="fa-solid fa-thumbtack fa-xs"></i>
</div>
<h3 class="card-title text-lowercase">{{ post.title }}</h3>
<p class="card-text">{{ post.description }}</p>

                    {% if post.external_source == blank %}
                      {% assign read_time = post.content | number_of_words | divided_by: 180 | plus: 1 %}
                    {% else %}
                      {% assign read_time = post.feed_content | strip_html | number_of_words | divided_by: 180 | plus: 1 %}
                    {% endif %}
                    {% assign year = post.date | date: "%Y" %}

                    <p class="post-meta">
                      {{ read_time }} min read &nbsp; &middot; &nbsp;
                      <a href="{{ year | prepend: '/blog/' | relative_url }}">
                        <i class="fa-solid fa-calendar fa-sm"></i> {{ year }} </a>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </a>
        </div>
      {% endfor %}
      </div>
    </div>
    <hr>
{% endif %}

  <ul class="post-list">
    {% if page.pagination.enabled %}
      {% assign postlist = paginator.posts %}
    {% else %}
      {% assign postlist = site.posts %}
    {% endif %}

    {% for post in postlist %}
    {% if post.external_source == blank %}
      {% assign read_time = post.content | number_of_words | divided_by: 180 | plus: 1 %}
    {% else %}
      {% assign read_time = post.feed_content | strip_html | number_of_words | divided_by: 180 | plus: 1 %}
    {% endif %}
    {% assign year = post.date | date: "%Y" %}
    {% assign tags = post.tags | join: "" %}
    {% assign categories = post.categories | join: "" %}

    <li class="blog-post-item">
{% if post.thumbnail %}
<div class="row">
          <div class="col-sm-9">
{% endif %}
        <div class="post-header">
          <span class="post-date">
            <i class="far fa-calendar-alt"></i>
            {{ post.date | date: '%B %d, %Y' }}
          </span>
          {% if categories != "" %}
          <span class="post-category-badge">
            <i class="fas fa-folder"></i>
            {{ post.categories | first }}
          </span>
          {% endif %}
        </div>
        
        <h3>
        {% if post.redirect == blank %}
          <a class="post-title" href="{{ post.url | relative_url }}">{{ post.title }}</a>
        {% elsif post.redirect contains '://' %}
          <a class="post-title" href="{{ post.redirect }}" target="_blank">{{ post.title }}</a>
          <svg width="2rem" height="2rem" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
            <path d="M17 13.5v6H5v-12h6m3-3h6v6m0-6-9 9" class="icon_svg-stroke" stroke="#999" stroke-width="1.5" fill="none" fill-rule="evenodd" stroke-linecap="round" stroke-linejoin="round"></path>
          </svg>
        {% else %}
          <a class="post-title" href="{{ post.redirect | relative_url }}">{{ post.title }}</a>
        {% endif %}
      </h3>
      
      <p class="post-description">{{ post.description }}</p>
      
      <div class="post-footer">
        <span class="read-time">
          <i class="far fa-clock"></i>
          {{ read_time }} min read
        </span>
        {% if post.external_source %}
        <span class="external-source">
          <i class="fas fa-external-link-alt"></i>
          {{ post.external_source }}
        </span>
        {% endif %}
      </div>

{% if post.thumbnail %}
</div>
  <div class="col-sm-3">
    <img class="card-img post-thumbnail" src="{{ post.thumbnail | relative_url }}" alt="image">
  </div>
</div>
{% endif %}
    </li>
    {% endfor %}
  </ul>

{% if page.pagination.enabled %}
{% include pagination.liquid %}
{% endif %}

</div>

<style>
/* ========== 页面整体优化 ========== */
.header-bar {
  text-align: center;
  margin-bottom: 3rem;
  padding: 2rem 0;
  position: relative;
}

.header-bar::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 100px;
  height: 3px;
  background: linear-gradient(90deg, 
    transparent 0%,
    var(--global-theme-color) 50%,
    transparent 100%
  );
}

.header-bar h1 {
  background: linear-gradient(135deg, 
    var(--global-theme-color) 0%,
    var(--global-hover-color) 100%
  );
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  font-weight: 700;
  margin-bottom: 0.5rem;
}

/* ========== 特色文章卡片 ========== */
.featured-card {
  border-radius: 16px;
  border: 2px solid var(--global-divider-color);
  background: var(--global-bg-color);
  position: relative;
  overflow: hidden;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.featured-card::before {
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
}

.featured-card:hover {
  transform: translateY(-8px);
  box-shadow: 0 16px 48px rgba(0,0,0,0.2);
  border-color: var(--global-theme-color);
}

.featured-card .card-title {
  font-weight: 700;
  margin-top: 0.5rem;
}

/* ========== 文章列表优化 ========== */
.post-list {
  list-style: none;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.blog-post-item {
  background: var(--global-bg-color);
  border: 1px solid var(--global-divider-color);
  border-radius: 16px;
  padding: 2rem;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

/* 左侧彩色装饰条 */
.blog-post-item::before {
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
  opacity: 0;
  transition: opacity 0.3s;
}

.blog-post-item:hover::before {
  opacity: 1;
}

/* 背景渐变效果 */
.blog-post-item::after {
  content: '';
  position: absolute;
  top: -50%;
  right: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(
    circle,
    rgba(var(--global-theme-color-rgb), 0.03) 0%,
    transparent 70%
  );
  opacity: 0;
  transition: opacity 0.4s;
  pointer-events: none;
}

.blog-post-item:hover::after {
  opacity: 1;
}

.blog-post-item:hover {
  transform: translateX(8px);
  box-shadow: -4px 8px 32px rgba(0,0,0,0.12);
  border-color: var(--global-theme-color);
}

/* 文章头部 */
.post-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}

.post-date {
  font-size: 0.9rem;
  color: var(--global-text-color-light);
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.post-category-badge {
  background: linear-gradient(135deg,
    rgba(var(--global-theme-color-rgb), 0.15) 0%,
    rgba(var(--global-theme-color-rgb), 0.25) 100%
  );
  color: var(--global-theme-color);
  padding: 0.3rem 0.9rem;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  border: 1px solid rgba(var(--global-theme-color-rgb), 0.3);
}

/* 标题 */
.blog-post-item h3 {
  font-size: 1.6rem;
  font-weight: 700;
  margin: 0.5rem 0 1rem;
  line-height: 1.3;
}

.blog-post-item .post-title {
  color: var(--global-text-color);
  text-decoration: none;
  transition: all 0.3s;
  background: linear-gradient(
    to right,
    var(--global-theme-color) 0%,
    var(--global-hover-color) 100%
  );
  background-size: 0% 2px;
  background-repeat: no-repeat;
  background-position: left bottom;
}

.blog-post-item:hover .post-title {
  color: var(--global-theme-color);
  background-size: 100% 2px;
}

/* 描述文字 */
.post-description {
  color: var(--global-text-color-light);
  font-size: 1.05rem;
  line-height: 1.8;
  margin-bottom: 1.5rem;
}

/* 文章底部 */
.post-footer {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  padding-top: 1rem;
  border-top: 1px solid var(--global-divider-color);
  font-size: 0.9rem;
  color: var(--global-text-color-light);
}

.read-time,
.external-source {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

/* 缩略图 */
.post-thumbnail {
  border-radius: 12px;
  object-fit: cover;
  height: 200px;
  width: 100%;
  transition: transform 0.4s;
}

.blog-post-item:hover .post-thumbnail {
  transform: scale(1.05);
}

/* 分页样式优化 */
.pagination {
  margin: 3rem 0;
}

.pagination .page-item {
  margin: 0 0.25rem;
}

.pagination .page-link {
  border-radius: 8px;
  border: 1px solid var(--global-divider-color);
  color: var(--global-text-color);
  padding: 0.5rem 1rem;
  transition: all 0.3s;
}

.pagination .page-link:hover {
  background: var(--global-theme-color);
  color: white;
  border-color: var(--global-theme-color);
  transform: translateY(-2px);
}

.pagination .page-item.active .page-link {
  background: var(--global-theme-color);
  border-color: var(--global-theme-color);
}

/* 响应式 */
@media (max-width: 768px) {
  .blog-post-item {
    padding: 1.5rem;
  }
  
  .blog-post-item h3 {
    font-size: 1.3rem;
  }
  
  .blog-post-item:hover {
    transform: translateX(4px);
  }
  
  .post-thumbnail {
    height: 150px;
  }
}
</style>