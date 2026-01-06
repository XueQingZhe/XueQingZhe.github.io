---
layout: page
permalink: /tutorials/
title: tutorials
description: 技术分享与教程
nav: true
nav_order: 5
---

<!-- ========== 页面头部 ========== -->
<div class="tutorials-hero">
  <div class="hero-content">
    <h1 class="hero-title">教程系列</h1>
    <p class="hero-subtitle">系统化的技术学习路径</p>
  </div>
</div>

<!-- ========== 红色弧形教程选择区 ========== -->
<div class="arc-series-wrapper">
  <div class="arc-series-track">
    {% for series in site.data.tutorials %}
    <div class="arc-series-item" data-series-index="{{ forloop.index0 }}">
      <img src="{{ series.image | relative_url }}" alt="{{ series.title }}">
      <div class="arc-hover-card">
        <h4>{{ series.title }}</h4>
        <p>{{ series.description }}</p>
      </div>
    </div>
    {% endfor %}
  </div>
</div>

<!-- ========== 绿色区域：教程完整目录 ========== -->
<div class="tutorials-container" id="tutorial-detail">
  {% for series in site.data.tutorials %}
  <div class="tutorial-card">
    <div class="row g-0">

      <div class="col-md-5">
        <div class="tutorial-image-container">
          <img src="{{ series.image | relative_url }}" class="tutorial-preview-img">
        </div>
      </div>

      <div class="col-md-7">
        <div class="tutorial-content">
          <h3 class="tutorial-title">{{ series.title }}</h3>
          <p class="tutorial-description">{{ series.description }}</p>

          <div class="chapters-section">
            <div class="chapters-header">
              章节列表
            </div>
            <ul class="chapters-list">
              {% for chapter in series.chapters %}
              <li class="chapter-item">
                <a href="{{ series.base_url }}/{{ chapter.file | remove: '.md' }}/">
                  <span class="chapter-number">{{ forloop.index }}</span>
                  <span class="chapter-title">{{ chapter.title }}</span>
                </a>
              </li>
              {% endfor %}
            </ul>
          </div>

        </div>
      </div>

    </div>
  </div>
  {% endfor %}
</div>

<style>
/* ===== 头部 ===== */
.tutorials-hero {
  text-align: center;
  padding: 4rem 2rem;
}

/* ===== 弧形区域 ===== */
.arc-series-wrapper {
  position: relative;
  height: 260px;
  overflow: hidden;
  margin-bottom: 4rem;
}

.arc-series-track {
  position: absolute;
  left: 50%;
  top: 100%;
  transform: translateX(-50%);
  width: 1400px;
  height: 700px;
  border-radius: 50%;
  display: flex;
  justify-content: space-around;
}

.arc-series-item {
  width: 130px;
  height: 180px;
  transform-origin: center 560px;
  cursor: pointer;
  transition: transform 0.3s;
}

.arc-series-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 14px;
  box-shadow: 0 15px 40px rgba(0,0,0,0.35);
}

.arc-series-item:hover {
  transform: scale(1.2);
  z-index: 10;
}

/* ===== hover 弹出卡牌 ===== */
.arc-hover-card {
  position: absolute;
  top: -190px;
  left: 50%;
  transform: translateX(-50%);
  width: 280px;
  background: var(--global-bg-color);
  border-radius: 18px;
  padding: 1.2rem;
  box-shadow: 0 25px 60px rgba(0,0,0,0.25);
  opacity: 0;
  pointer-events: none;
  transition: all 0.25s ease;
}

.arc-series-item:hover .arc-hover-card {
  opacity: 1;
  transform: translateX(-50%) translateY(-12px);
}

.arc-hover-card h4 {
  margin: 0 0 0.5rem;
}

.arc-hover-card p {
  font-size: 0.9rem;
  color: var(--global-text-color-light);
}

/* ===== 教程详情 ===== */
.tutorial-card {
  display: none;
  margin-bottom: 4rem;
}

.tutorial-image-container {
  height: 100%;
  min-height: 320px;
}

.tutorial-preview-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  padding: 2rem;
}

.chapter-item a {
  display: flex;
  gap: 1rem;
  padding: 0.8rem 1rem;
  border-radius: 10px;
  border: 1px solid var(--global-divider-color);
  margin-bottom: 0.6rem;
  text-decoration: none;
}
</style>

<script>
const arcItems = document.querySelectorAll('.arc-series-item');
const cards = document.querySelectorAll('.tutorial-card');

arcItems.forEach(item => {
  item.addEventListener('click', () => {
    const index = item.dataset.seriesIndex;
    cards.forEach((card, i) => {
      card.style.display = (i == index) ? 'block' : 'none';
    });
    document.getElementById('tutorial-detail')
      .scrollIntoView({ behavior: 'smooth' });
  });
});
</script>
