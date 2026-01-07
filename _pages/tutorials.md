---
layout: page
permalink: /tutorials/
title: tutorials
description: 技术分享与教程
nav: true
nav_order: 5
---

<style>
  :root {
    --card-radius: 20px;
    --card-bg: var(--global-bg-color);
    --card-border: var(--global-divider-color);
    --accent-color: var(--global-theme-color);
    --accent-rgb: var(--global-theme-color-rgb, 100, 181, 246);
  }

  /* ========== 加载动画 ========== */
  .page-loader {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: var(--global-bg-color, #0d1117);
    z-index: 99999;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    transition: opacity 0.6s ease, visibility 0.6s ease;
  }

  .page-loader.fade-out {
    opacity: 0;
    visibility: hidden;
  }

  .loader-content {
    text-align: center;
    animation: loaderFadeIn 0.8s ease forwards;
  }

  @keyframes loaderFadeIn {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .loader-logo {
    font-size: 3rem;
    font-weight: 800;
    background: linear-gradient(135deg, var(--global-text-color, #fff) 30%, var(--accent-color, #64b5f6));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    margin-bottom: 0.5rem;
    letter-spacing: -1px;
  }

  .loader-subtitle {
    font-size: 1rem;
    color: var(--global-text-color-light, rgba(255,255,255,0.5));
    margin-bottom: 2.5rem;
    font-weight: 400;
    letter-spacing: 2px;
  }

  .loader-progress {
    width: 200px;
    height: 3px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 3px;
    overflow: hidden;
    position: relative;
  }

  .loader-progress-bar {
    height: 100%;
    background: linear-gradient(90deg, var(--accent-color, #64b5f6), rgba(var(--accent-rgb, 100, 181, 246), 0.6));
    border-radius: 3px;
    animation: progressLoad 1.5s ease forwards;
    box-shadow: 0 0 20px rgba(var(--accent-rgb, 100, 181, 246), 0.5);
  }

  @keyframes progressLoad {
    0% { width: 0%; }
    30% { width: 40%; }
    60% { width: 70%; }
    100% { width: 100%; }
  }

  .loader-particles {
    position: absolute;
    width: 100%;
    height: 100%;
    overflow: hidden;
    pointer-events: none;
  }

  .particle {
    position: absolute;
    width: 4px;
    height: 4px;
    background: var(--accent-color, #64b5f6);
    border-radius: 50%;
    opacity: 0.3;
    animation: particleFloat 3s ease-in-out infinite;
  }

  .particle:nth-child(1) { left: 10%; top: 20%; animation-delay: 0s; }
  .particle:nth-child(2) { left: 20%; top: 80%; animation-delay: 0.5s; }
  .particle:nth-child(3) { left: 80%; top: 30%; animation-delay: 1s; }
  .particle:nth-child(4) { left: 70%; top: 70%; animation-delay: 1.5s; }
  .particle:nth-child(5) { left: 50%; top: 10%; animation-delay: 0.3s; }
  .particle:nth-child(6) { left: 90%; top: 50%; animation-delay: 0.8s; }

  @keyframes particleFloat {
    0%, 100% { transform: translateY(0) scale(1); opacity: 0.3; }
    50% { transform: translateY(-20px) scale(1.5); opacity: 0.6; }
  }

  .page-content {
    opacity: 0;
    transform: translateY(30px);
    transition: opacity 0.8s ease, transform 0.8s ease;
  }

  .page-content.loaded {
    opacity: 1;
    transform: translateY(0);
  }

  /* ========== Hero 区域 ========== */
  .tutorials-hero {
    text-align: center;
    padding: 5rem 1.5rem 4rem;
    position: relative;
    overflow: hidden;
  }

  .tutorials-hero::before {
    content: '';
    position: absolute;
    top: -50%;
    left: 50%;
    transform: translateX(-50%);
    width: 600px;
    height: 600px;
    background: radial-gradient(circle, rgba(var(--accent-rgb), 0.08) 0%, transparent 70%);
    pointer-events: none;
  }
  
  .hero-title {
    font-size: clamp(2.2rem, 5vw, 3.2rem);
    font-weight: 800;
    margin-bottom: 1.25rem;
    background: linear-gradient(135deg, var(--global-text-color) 30%, var(--accent-color));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    display: inline-flex;
    align-items: center;
    gap: 1rem;
    position: relative;
  }

  .hero-subtitle {
    font-size: 1.15rem;
    color: var(--global-text-color-light);
    max-width: 520px;
    margin: 0 auto;
    line-height: 1.7;
    opacity: 0.8;
  }

  /* ========== 教程卡片网格 ========== */
  .tutorials-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 2.5rem;
    padding: 1rem 0 4rem;
    max-width: 1200px;
    margin: 0 auto;
  }

  .tutorial-card {
    position: relative;
    background: var(--card-bg);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: var(--card-radius);
    overflow: hidden;
    cursor: pointer;
    transition: all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1);
    display: flex;
    flex-direction: column;
    box-shadow: 
      0 4px 24px -8px rgba(0, 0, 0, 0.3),
      0 0 0 1px rgba(255, 255, 255, 0.03) inset;
    opacity: 0;
    transform: translateY(40px);
    animation: cardFadeIn 0.6s ease forwards;
  }

  .tutorial-card:nth-child(1) { animation-delay: 0.1s; }
  .tutorial-card:nth-child(2) { animation-delay: 0.2s; }
  .tutorial-card:nth-child(3) { animation-delay: 0.3s; }
  .tutorial-card:nth-child(4) { animation-delay: 0.4s; }
  .tutorial-card:nth-child(5) { animation-delay: 0.5s; }
  .tutorial-card:nth-child(6) { animation-delay: 0.6s; }

  @keyframes cardFadeIn {
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .tutorial-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    border-radius: var(--card-radius);
    padding: 1px;
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, transparent 50%, transparent 100%);
    -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
    pointer-events: none;
    opacity: 0.5;
  }

  .tutorial-card:hover {
    transform: translateY(-10px) scale(1.02);
    box-shadow: 
      0 24px 48px -12px rgba(0, 0, 0, 0.4),
      0 0 0 1px rgba(var(--accent-rgb), 0.2),
      0 0 60px -20px rgba(var(--accent-rgb), 0.3);
    border-color: rgba(var(--accent-rgb), 0.3);
  }

  .card-cover {
    height: 200px;
    width: 100%;
    position: relative;
    overflow: hidden;
    background: linear-gradient(135deg, #1a1c24 0%, #2d3142 100%);
  }

  .card-cover img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center;
    transition: transform 0.6s cubic-bezier(0.25, 0.8, 0.25, 1);
  }

  .tutorial-card:hover .card-cover img {
    transform: scale(1.08);
  }

  .card-cover::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 80px;
    background: linear-gradient(to top, var(--card-bg), transparent);
    pointer-events: none;
  }

  .card-placeholder {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--accent-color);
    opacity: 0.15;
    font-size: 4rem;
  }

  .card-content {
    padding: 1.5rem 1.75rem 1.75rem;
    flex: 1;
    display: flex;
    flex-direction: column;
    position: relative;
    margin-top: -20px;
  }

  .card-status {
    position: absolute;
    top: 16px;
    right: 16px;
    background: rgba(0, 0, 0, 0.65);
    backdrop-filter: blur(8px);
    color: white;
    font-size: 0.72rem;
    padding: 5px 12px;
    border-radius: 20px;
    font-weight: 600;
    letter-spacing: 0.3px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    z-index: 5;
  }

  .card-title {
    font-size: 1.35rem;
    font-weight: 700;
    margin: 0 0 0.6rem 0;
    color: var(--global-text-color);
    line-height: 1.3;
  }

  .card-desc {
    font-size: 0.9rem;
    color: var(--global-text-color-light);
    line-height: 1.65;
    margin-bottom: 1.5rem;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    opacity: 0.75;
  }

  .card-footer {
    margin-top: auto;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-top: 1rem;
    border-top: 1px solid rgba(255, 255, 255, 0.06);
  }

  .card-meta {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.85rem;
    color: var(--global-text-color-light);
    font-weight: 500;
  }

  .card-meta i {
    color: var(--accent-color);
  }

  .card-action {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.8rem;
    color: var(--accent-color);
    font-weight: 600;
    opacity: 0;
    transform: translateX(-10px);
    transition: all 0.3s ease;
  }

  .tutorial-card:hover .card-action {
    opacity: 1;
    transform: translateX(0);
  }

  /* ========== 详情面板 ========== */
  .details-panel {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.75);
    backdrop-filter: blur(16px);
    z-index: 9999;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.35s ease;
  }

  .details-panel.active {
    opacity: 1;
    pointer-events: auto;
  }

  .details-container {
    width: 92%;
    max-width: 680px;
    max-height: 88vh;
    background: linear-gradient(165deg, rgba(28, 30, 38, 0.98) 0%, rgba(18, 20, 26, 0.99) 100%);
    border-radius: 28px;
    box-shadow: 
      0 0 0 1px rgba(255, 255, 255, 0.08),
      0 32px 80px -16px rgba(0, 0, 0, 0.65),
      0 0 120px -30px rgba(var(--accent-rgb), 0.25);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    transform: translateY(40px) scale(0.9);
    transition: transform 0.45s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  .details-panel.active .details-container {
    transform: translateY(0) scale(1);
  }

  .details-hero {
    position: relative;
    height: 220px;
    overflow: hidden;
    flex-shrink: 0;
  }

  .details-hero-bg {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-size: cover;
    background-position: center top;
    background-repeat: no-repeat;
  }

  .details-hero-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: linear-gradient(180deg, rgba(18, 20, 26, 0) 0%, rgba(18, 20, 26, 0.3) 40%, rgba(18, 20, 26, 0.85) 80%, rgba(18, 20, 26, 1) 100%);
  }

  .details-close-btn {
    position: absolute;
    top: 18px;
    right: 18px;
    width: 42px;
    height: 42px;
    background: rgba(0, 0, 0, 0.45);
    backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.1rem;
    color: rgba(255, 255, 255, 0.85);
    cursor: pointer;
    transition: all 0.3s ease;
    z-index: 10;
  }

  .details-close-btn:hover {
    background: rgba(255, 255, 255, 0.15);
    color: #fff;
    transform: rotate(90deg);
    border-color: rgba(255, 255, 255, 0.2);
  }

  .details-status {
    position: absolute;
    top: 18px;
    left: 18px;
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 7px 16px;
    background: var(--accent-color);
    border-radius: 22px;
    font-size: 0.75rem;
    font-weight: 600;
    color: #fff;
    text-transform: uppercase;
    letter-spacing: 0.6px;
    z-index: 10;
    box-shadow: 0 4px 16px -4px rgba(var(--accent-rgb), 0.5);
  }

  .details-status i { font-size: 5px; }

  .details-info {
    position: relative;
    padding: 0 2.25rem 1.75rem;
    margin-top: -60px;
    z-index: 5;
  }

  .details-title {
    font-size: 1.75rem;
    font-weight: 700;
    color: #fff;
    margin: 0 0 0.85rem;
    line-height: 1.35;
  }

  .details-desc {
    font-size: 0.95rem;
    color: rgba(255, 255, 255, 0.55);
    line-height: 1.75;
    margin: 0 0 1.5rem;
  }

  .details-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 1.5rem;
  }

  .meta-item {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 0.88rem;
    color: rgba(255, 255, 255, 0.5);
  }

  .meta-icon {
    width: 36px;
    height: 36px;
    background: rgba(var(--accent-rgb), 0.12);
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .meta-icon i {
    color: var(--accent-color);
    font-size: 0.9rem;
  }

  .meta-item strong {
    color: rgba(255, 255, 255, 0.95);
    font-weight: 600;
  }

  .details-divider {
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent);
    margin: 0 2.25rem;
  }

  .details-body {
    padding: 1.75rem 1.75rem 2.25rem;
    overflow-y: auto;
    flex: 1;
  }

  .chapter-section-title {
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 2px;
    color: rgba(255, 255, 255, 0.35);
    margin: 0 0.5rem 1.25rem;
    font-weight: 600;
  }

  .chapter-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .chapter-link {
    display: flex;
    align-items: center;
    padding: 16px 20px;
    background: rgba(255, 255, 255, 0.025);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 16px;
    text-decoration: none;
    color: rgba(255, 255, 255, 0.85);
    transition: all 0.28s ease;
    position: relative;
    overflow: hidden;
  }

  .chapter-link::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    height: 100%;
    width: 3px;
    background: linear-gradient(180deg, var(--accent-color), rgba(var(--accent-rgb), 0.5));
    opacity: 0;
    transition: opacity 0.28s ease;
    border-radius: 0 2px 2px 0;
  }

  .chapter-link:hover {
    background: rgba(255, 255, 255, 0.06);
    border-color: rgba(var(--accent-rgb), 0.25);
    transform: translateX(8px);
    text-decoration: none;
  }

  .chapter-link:hover::before { opacity: 1; }

  .chapter-num {
    width: 34px;
    height: 34px;
    background: linear-gradient(135deg, var(--accent-color), rgba(var(--accent-rgb), 0.65));
    color: white;
    border-radius: 11px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.85rem;
    font-weight: 700;
    margin-right: 16px;
    flex-shrink: 0;
    box-shadow: 0 6px 16px -4px rgba(var(--accent-rgb), 0.45);
  }

  .chapter-title {
    flex: 1;
    font-size: 0.95rem;
    font-weight: 500;
  }

  .chapter-arrow {
    opacity: 0.25;
    font-size: 0.8rem;
    transition: all 0.28s ease;
  }

  .chapter-link:hover .chapter-arrow {
    opacity: 1;
    transform: translateX(5px);
    color: var(--accent-color);
  }

  .details-body::-webkit-scrollbar { width: 5px; }
  .details-body::-webkit-scrollbar-track { background: transparent; }
  .details-body::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.12); border-radius: 3px; }
  .details-body::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.22); }

  /* ========== 计划内容区 ========== */
  .section-divider {
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 5rem 0 3rem;
    color: var(--global-divider-color);
  }
  
  .section-divider::before,
  .section-divider::after {
    content: "";
    height: 1px;
    background: linear-gradient(90deg, transparent, currentColor, transparent);
    flex: 1;
    margin: 0 1.5rem;
    opacity: 0.2;
  }

  .section-divider-content {
    background: var(--global-bg-color);
    padding: 0.5rem 1.25rem;
    border-radius: 20px;
    font-weight: 600;
    font-size: 0.9rem;
    color: var(--global-text-color-light);
    border: 1px solid rgba(255, 255, 255, 0.06);
  }

  .planned-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
    gap: 1.5rem;
    padding-bottom: 3rem;
    max-width: 1200px;
    margin: 0 auto;
  }

  .planned-card {
    background: rgba(255, 255, 255, 0.02);
    border: 1px dashed rgba(255, 255, 255, 0.1);
    border-radius: 18px;
    padding: 1.75rem;
    display: flex;
    align-items: center;
    gap: 1.25rem;
    transition: all 0.35s ease;
  }

  .planned-card:hover {
    border-style: solid;
    border-color: rgba(var(--accent-rgb), 0.3);
    background: rgba(255, 255, 255, 0.04);
    transform: translateY(-6px);
    box-shadow: 0 16px 32px -12px rgba(0, 0, 0, 0.3);
  }

  .planned-icon {
    font-size: 1.4rem;
    width: 56px;
    height: 56px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(var(--accent-rgb), 0.1);
    color: var(--accent-color);
    border-radius: 16px;
    flex-shrink: 0;
  }

  .planned-info h4 { margin: 0 0 0.35rem; font-size: 1.05rem; font-weight: 600; }
  .planned-info p { margin: 0; font-size: 0.85rem; opacity: 0.6; }

  /* ========== 移动端适配 ========== */
  @media (max-width: 768px) {
    .loader-logo { font-size: 2.2rem; }
    .loader-subtitle { font-size: 0.85rem; }
    .tutorials-grid { grid-template-columns: 1fr; gap: 2rem; padding: 1rem 0.5rem 3rem; }
    .details-container { width: 95%; max-height: 92vh; border-radius: 24px; }
    .details-hero { height: 180px; }
    .details-info { padding: 0 1.5rem 1.5rem; margin-top: -50px; }
    .details-title { font-size: 1.45rem; }
    .details-body { padding: 1.25rem 1.25rem 2rem; }
    .chapter-link { padding: 14px 16px; }
    .chapter-num { width: 30px; height: 30px; font-size: 0.8rem; }
  }

  @media (max-width: 480px) {
    .tutorials-hero { padding: 3rem 1rem 2.5rem; }
    .details-hero { height: 150px; }
    .details-close-btn { width: 38px; height: 38px; top: 14px; right: 14px; }
    .details-meta { gap: 1rem; }
    .meta-item { font-size: 0.82rem; }
  }
</style>

<!-- 加载动画 -->
<div class="page-loader" id="pageLoader">
  <div class="loader-particles">
    <div class="particle"></div>
    <div class="particle"></div>
    <div class="particle"></div>
    <div class="particle"></div>
    <div class="particle"></div>
    <div class="particle"></div>
  </div>
  <div class="loader-content">
    <div class="loader-logo">吟处雪轻遮</div>
    <div class="loader-subtitle">TECHNICAL ARTIST</div>
    <div class="loader-progress">
      <div class="loader-progress-bar"></div>
    </div>
  </div>
</div>

<!-- 页面内容 -->
<div class="page-content" id="pageContent">
  <div class="tutorials-hero">
    <h1 class="hero-title">
      <i class="fas fa-graduation-cap"></i>
      教程系列
    </h1>
    <p class="hero-subtitle">系统化的技术学习路径，从入门到精通的完整知识体系</p>
  </div>

  <div class="tutorials-grid">
    {% assign tutorial_series = site.data.tutorials %}
    {% for series in tutorial_series %}
    <div class="tutorial-card" onclick="openDetails('detail-modal-{{ forloop.index }}')">
      <div class="card-cover">
        {% if series.image %}
          <img src="{{ series.image | relative_url }}" alt="{{ series.title }}" loading="lazy">
        {% else %}
          <div class="card-placeholder">
            <i class="fas fa-book-open"></i>
          </div>
        {% endif %}
        {% if series.status %}
          <span class="card-status">{{ series.status }}</span>
        {% endif %}
      </div>
      <div class="card-content">
        <h3 class="card-title">{{ series.title }}</h3>
        <p class="card-desc">{{ series.description }}</p>
        <div class="card-footer">
          <div class="card-meta">
            <i class="fas fa-list-ul"></i>
            <span>{{ series.chapters.size }} 章节</span>
          </div>
          <div class="card-action">
            <span>查看详情</span>
            <i class="fas fa-arrow-right"></i>
          </div>
        </div>
      </div>
    </div>
    {% endfor %}
  </div>

  <div id="modal-container">
    {% for series in tutorial_series %}
    <div class="details-panel" id="detail-modal-{{ forloop.index }}" onclick="closeDetails(event)">
      <div class="details-container" onclick="event.stopPropagation()">
        <div class="details-hero">
          {% if series.image %}
            <div class="details-hero-bg" style="background-image: url('{{ series.image | relative_url }}');"></div>
          {% else %}
            <div class="details-hero-bg" style="background: linear-gradient(135deg, #1a1c24 0%, #2d3142 100%);"></div>
          {% endif %}
          <div class="details-hero-overlay"></div>
          {% if series.status %}
            <div class="details-status">
              <i class="fas fa-circle"></i>
              {{ series.status }}
            </div>
          {% endif %}
          <button class="details-close-btn" onclick="closeDetailsDirect('detail-modal-{{ forloop.index }}')">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="details-info">
          <h2 class="details-title">{{ series.title }}</h2>
          <p class="details-desc">{{ series.description }}</p>
          <div class="details-meta">
            <div class="meta-item">
              <div class="meta-icon"><i class="fas fa-book-reader"></i></div>
              <span>共 <strong>{{ series.chapters.size }}</strong> 节课程</span>
            </div>
            <div class="meta-item">
              <div class="meta-icon"><i class="fas fa-clock"></i></div>
              <span>预计 <strong>{{ series.chapters.size | times: 15 }}</strong> 分钟</span>
            </div>
          </div>
        </div>
        <div class="details-divider"></div>
        <div class="details-body">
          <div class="chapter-section-title">课程目录</div>
          <div class="chapter-list">
            {% for chapter in series.chapters %}
            <a href="{{ series.base_url }}/{{ chapter.file | remove: '.md' }}/" class="chapter-link">
              <span class="chapter-num">{{ forloop.index }}</span>
              <span class="chapter-title">{{ chapter.title }}</span>
              <i class="fas fa-chevron-right chapter-arrow"></i>
            </a>
            {% endfor %}
          </div>
        </div>
      </div>
    </div>
    {% endfor %}
  </div>

  <div class="section-divider">
    <span class="section-divider-content">
      <i class="fas fa-hourglass-half"></i> 筹备中
    </span>
  </div>

  <div class="planned-grid">
    <div class="planned-card">
      <div class="planned-icon"><i class="fas fa-palette"></i></div>
      <div class="planned-info">
        <h4>Shader 入门</h4>
        <p>着色器编程基础</p>
      </div>
    </div>
    <div class="planned-card">
      <div class="planned-icon"><i class="fas fa-bolt"></i></div>
      <div class="planned-info">
        <h4>Unity URP</h4>
        <p>渲染管线详解</p>
      </div>
    </div>
    <div class="planned-card">
      <div class="planned-icon"><i class="fas fa-magic"></i></div>
      <div class="planned-info">
        <h4>卡通渲染</h4>
        <p>NPR技术解析</p>
      </div>
    </div>
  </div>
</div>

<script>
document.addEventListener('DOMContentLoaded', function() {
  const loader = document.getElementById('pageLoader');
  const content = document.getElementById('pageContent');
  
  setTimeout(function() {
    loader.classList.add('fade-out');
    content.classList.add('loaded');
    setTimeout(function() {
      loader.style.display = 'none';
    }, 600);
  }, 1800);
});

function openDetails(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
}

function closeDetails(event) {
  if (event.target.classList.contains('details-panel')) {
    event.target.classList.remove('active');
    document.body.style.overflow = '';
  }
}

function closeDetailsDirect(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }
}

document.addEventListener('keydown', function(event) {
  if (event.key === "Escape") {
    const activeModals = document.querySelectorAll('.details-panel.active');
    activeModals.forEach(modal => { modal.classList.remove('active'); });
    document.body.style.overflow = '';
  }
});
</script>