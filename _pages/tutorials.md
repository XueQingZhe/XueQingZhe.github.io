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
    /* 定义炫酷的霓虹色系 */
    --neon-primary: #00f2fe;
    --neon-secondary: #4facfe;
    --neon-accent: #f093fb;
    --card-glass: rgba(255, 255, 255, 0.05);
    --card-border: rgba(255, 255, 255, 0.1);
    --text-glow: 0 0 10px rgba(79, 172, 254, 0.5);
  }

  /* ========== 动态背景层 ========== */
  .cool-bg-layer {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    z-index: -1;
    overflow: hidden;
    background: radial-gradient(circle at 50% 50%, #1a1a2e, #16213e);
  }

  /* 漂浮的光斑 */
  .blob {
    position: absolute;
    filter: blur(80px);
    opacity: 0.4;
    animation: float 20s infinite ease-in-out alternate;
  }
  .blob-1 { top: -10%; left: -10%; width: 50vw; height: 50vw; background: #4facfe; animation-delay: 0s; }
  .blob-2 { bottom: -10%; right: -10%; width: 60vw; height: 60vw; background: #764ba2; animation-delay: -5s; }
  .blob-3 { top: 40%; left: 40%; width: 40vw; height: 40vw; background: #f093fb; animation-delay: -10s; }

  @keyframes float {
    0% { transform: translate(0, 0) scale(1); }
    100% { transform: translate(30px, 50px) scale(1.1); }
  }

  /* ========== 页面头部 ========== */
  .tutorials-hero {
    text-align: center;
    padding: 5rem 1rem 4rem;
    position: relative;
  }
  
  .hero-title {
    font-size: clamp(2.5rem, 6vw, 4rem);
    font-weight: 900;
    margin-bottom: 1rem;
    color: white;
    text-shadow: var(--text-glow);
    letter-spacing: -1px;
    /* 标题渐变 */
    background: linear-gradient(to right, #fff, #b3e5fc);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    display: inline-block;
  }

  .hero-subtitle {
    font-size: 1.2rem;
    color: rgba(255, 255, 255, 0.8);
    max-width: 600px;
    margin: 0 auto;
    font-weight: 300;
    letter-spacing: 1px;
  }

  /* ========== 3D 卡片网格 ========== */
  .tutorials-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 2.5rem;
    padding: 1rem 2rem 5rem;
    max-width: 1400px;
    margin: 0 auto;
    perspective: 1000px; /* 开启 3D 视角 */
  }

  .tilt-card {
    position: relative;
    border-radius: 20px;
    background: var(--card-glass);
    border: 1px solid var(--card-border);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    transform-style: preserve-3d;
    transform: translateZ(0);
    transition: transform 0.1s ease-out; /* 快速响应鼠标 */
    cursor: pointer;
    box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.3);
    overflow: hidden;
    opacity: 0; /* 初始隐藏，用于入场动画 */
    animation: fadeUp 0.8s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
  }

  /* 入场动画延迟 */
  {% for i in (1..10) %}
  .tilt-card:nth-child({{ i }}) { animation-delay: {{ i | times: 0.1 }}s; }
  {% endfor %}

  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(40px); }
    to { opacity: 1; transform: translateY(0); }
  }

  /* 卡片悬停光效 */
  .tilt-card::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0; bottom: 0;
    border-radius: 20px;
    padding: 2px;
    background: linear-gradient(135deg, rgba(255,255,255,0.4), rgba(255,255,255,0) 40%);
    -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
    opacity: 0.5;
    transition: opacity 0.3s;
  }

  .tilt-card:hover::before {
    opacity: 1;
    background: linear-gradient(135deg, var(--neon-primary), var(--neon-accent));
  }

  /* 卡片内部内容浮动 (3D层次感) */
  .card-inner {
    transform: translateZ(20px); /* 让内容浮起来 */
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  .card-cover {
    height: 180px;
    position: relative;
    border-radius: 20px 20px 0 0;
    overflow: hidden;
  }

  .card-cover img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.5s ease;
  }

  .tilt-card:hover .card-cover img {
    transform: scale(1.1);
  }

  .card-badge {
    position: absolute;
    top: 15px;
    right: 15px;
    background: rgba(0,0,0,0.6);
    border: 1px solid rgba(255,255,255,0.2);
    color: #fff;
    padding: 4px 12px;
    border-radius: 30px;
    font-size: 0.75rem;
    font-weight: 600;
    backdrop-filter: blur(4px);
    box-shadow: 0 4px 10px rgba(0,0,0,0.2);
  }

  .card-body {
    padding: 1.5rem;
    color: white;
    flex: 1;
    display: flex;
    flex-direction: column;
    background: linear-gradient(180deg, rgba(255,255,255,0) 0%, rgba(0,0,0,0.2) 100%);
  }

  .card-title {
    font-size: 1.4rem;
    font-weight: 700;
    margin: 0 0 0.5rem 0;
    text-shadow: 0 2px 4px rgba(0,0,0,0.3);
  }

  .card-desc {
    font-size: 0.9rem;
    color: rgba(255,255,255,0.7);
    line-height: 1.6;
    margin-bottom: 1.5rem;
  }

  .card-footer {
    margin-top: auto;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.85rem;
    color: var(--neon-primary);
    font-weight: 600;
  }

  /* ========== 详情模态框 (Cyberpunk 风格) ========== */
  .modal-overlay {
    position: fixed;
    top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(0, 0, 0, 0.8);
    backdrop-filter: blur(10px);
    z-index: 10000;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    pointer-events: none;
    transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .modal-overlay.active {
    opacity: 1;
    pointer-events: auto;
  }

  .modal-content {
    width: 90%;
    max-width: 900px;
    max-height: 85vh;
    background: #1a1a2e;
    border: 1px solid var(--neon-secondary);
    box-shadow: 0 0 30px rgba(79, 172, 254, 0.2);
    border-radius: 24px;
    overflow: hidden;
    transform: scale(0.9) translateY(20px);
    transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
    display: flex;
    flex-direction: column;
    position: relative;
  }

  .modal-overlay.active .modal-content {
    transform: scale(1) translateY(0);
  }

  .modal-header {
    background: linear-gradient(90deg, rgba(26,26,46,1) 0%, rgba(22,33,62,1) 100%);
    padding: 2rem;
    display: flex;
    gap: 2rem;
    border-bottom: 1px solid rgba(255,255,255,0.1);
  }

  .modal-thumb {
    width: 100px;
    height: 100px;
    border-radius: 16px;
    object-fit: cover;
    border: 2px solid var(--neon-secondary);
    box-shadow: 0 0 15px rgba(79, 172, 254, 0.4);
  }

  .modal-text h2 {
    color: white;
    margin: 0 0 0.5rem;
    font-size: 1.8rem;
  }
  .modal-text p { color: rgba(255,255,255,0.7); }

  .close-btn {
    position: absolute;
    top: 1.5rem;
    right: 1.5rem;
    color: white;
    background: none;
    border: none;
    font-size: 1.5rem;
    cursor: pointer;
    transition: transform 0.3s;
  }
  .close-btn:hover { transform: rotate(90deg) scale(1.2); color: var(--neon-accent); }

  .modal-body {
    padding: 2rem;
    overflow-y: auto;
    /* 自定义滚动条 */
    scrollbar-width: thin;
    scrollbar-color: var(--neon-secondary) #1a1a2e;
  }
  
  .modal-body::-webkit-scrollbar { width: 6px; }
  .modal-body::-webkit-scrollbar-thumb { background: var(--neon-secondary); border-radius: 3px; }

  .chapter-item {
    display: flex;
    align-items: center;
    padding: 1.2rem;
    margin-bottom: 1rem;
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.05);
    border-radius: 12px;
    color: white;
    text-decoration: none;
    transition: all 0.3s;
  }

  .chapter-item:hover {
    background: rgba(79, 172, 254, 0.1);
    border-color: var(--neon-secondary);
    transform: translateX(10px);
    box-shadow: 0 0 15px rgba(79, 172, 254, 0.2);
    text-decoration: none;
    color: #fff;
  }

  .chapter-num {
    font-family: 'Courier New', monospace;
    color: var(--neon-accent);
    font-weight: bold;
    margin-right: 1.5rem;
    font-size: 1.2rem;
  }

  /* ========== 计划内容芯片 ========== */
  .plan-chips {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 1.5rem;
    padding-bottom: 4rem;
  }

  .chip {
    background: rgba(0,0,0,0.3);
    border: 1px solid var(--neon-secondary);
    color: white;
    padding: 0.8rem 1.5rem;
    border-radius: 50px;
    display: flex;
    align-items: center;
    gap: 0.8rem;
    transition: all 0.3s;
    cursor: default;
  }

  .chip:hover {
    background: var(--neon-secondary);
    box-shadow: 0 0 20px var(--neon-secondary);
    transform: scale(1.05);
  }
  
  /* 移动端适配 */
  @media (max-width: 768px) {
    .modal-header { flex-direction: column; text-align: center; }
    .modal-thumb { margin: 0 auto; }
    .hero-title { font-size: 2.2rem; }
  }
</style>

<div class="cool-bg-layer">
  <div class="blob blob-1"></div>
  <div class="blob blob-2"></div>
  <div class="blob blob-3"></div>
</div>

<div class="tutorials-hero">
  <h1 class="hero-title">
    <i class="fas fa-meteor fa-spin-hover"></i> EXPLORE KNOWLEDGE
  </h1>
  <p class="hero-subtitle">系统化的技术学习路径 · 沉浸式阅读体验</p>
</div>

<div class="tutorials-grid" id="gridArea">
  {% assign tutorial_series = site.data.tutorials %}
  {% for series in tutorial_series %}
  <div class="tilt-card" onclick="openModal('modal-{{ forloop.index }}')">
    <div class="card-inner">
      <div class="card-cover">
        {% if series.image %}
        <img src="{{ series.image | relative_url }}" alt="{{ series.title }}">
        {% else %}
        <div style="width:100%;height:100%;background:#111;display:flex;align-items:center;justify-content:center;color:#333;">
          <i class="fas fa-code fa-3x"></i>
        </div>
        {% endif %}
        {% if series.status %}
        <span class="card-badge">{{ series.status }}</span>
        {% endif %}
      </div>
      
      <div class="card-body">
        <h3 class="card-title">{{ series.title }}</h3>
        <p class="card-desc">{{ series.description | truncate: 50 }}</p>
        <div class="card-footer">
          <i class="fas fa-layer-group"></i>
          {{ series.chapters.size }} 章节
          <i class="fas fa-arrow-right" style="margin-left:auto;"></i>
        </div>
      </div>
    </div>
  </div>
  {% endfor %}
</div>

<div style="text-align: center; margin: 4rem 0 2rem;">
  <h4 style="color: rgba(255,255,255,0.5); text-transform: uppercase; letter-spacing: 2px; margin-bottom: 2rem;">Coming Soon</h4>
  <div class="plan-chips">
    <div class="chip"><i class="fas fa-magic"></i> Shader 进阶</div>
    <div class="chip"><i class="fas fa-cube"></i> Unity DOTS</div>
    <div class="chip"><i class="fas fa-robot"></i> AI 行为树</div>
  </div>
</div>

<div id="modals-container">
  {% for series in tutorial_series %}
  <div class="modal-overlay" id="modal-{{ forloop.index }}" onclick="closeModal(event)">
    <div class="modal-content" onclick="event.stopPropagation()">
      <button class="close-btn" onclick="closeModalDirect('modal-{{ forloop.index }}')"><i class="fas fa-times"></i></button>
      
      <div class="modal-header">
        {% if series.image %}
        <img src="{{ series.image | relative_url }}" class="modal-thumb">
        {% else %}
        <div class="modal-thumb" style="background:#000;display:flex;align-items:center;justify-content:center;color:white;"><i class="fas fa-book"></i></div>
        {% endif %}
        <div class="modal-text">
          <h2>{{ series.title }}</h2>
          <p>{{ series.description }}</p>
        </div>
      </div>
      
      <div class="modal-body">
        {% for chapter in series.chapters %}
        <a href="{{ series.base_url }}/{{ chapter.file | remove: '.md' }}/" class="chapter-item">
          <span class="chapter-num">0{{ forloop.index }}</span>
          <span>{{ chapter.title }}</span>
          <i class="fas fa-chevron-right" style="margin-left: auto; opacity: 0.5;"></i>
        </a>
        {% endfor %}
      </div>
    </div>
  </div>
  {% endfor %}
</div>

<script>
// ========== 3D TILT 效果脚本 (核心炫酷逻辑) ==========
const cards = document.querySelectorAll('.tilt-card');

cards.forEach(card => {
  card.addEventListener('mousemove', (e) => {
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // 计算中心点
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    // 计算旋转角度 (限制最大旋转角度为 15deg)
    const rotateX = ((y - centerY) / centerY) * -10;
    const rotateY = ((x - centerX) / centerX) * 10;
    
    // 应用变换：旋转 + 略微放大
    card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.02)`;
  });

  // 鼠标离开时复原
  card.addEventListener('mouseleave', () => {
    card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) scale(1)';
  });
});

// ========== 模态框逻辑 ==========
function openModal(id) {
  const modal = document.getElementById(id);
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeModal(e) {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.remove('active');
    document.body.style.overflow = '';
  }
}

function closeModalDirect(id) {
  document.getElementById(id).classList.remove('active');
  document.body.style.overflow = '';
}

// ESC 关闭
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay.active').forEach(m => {
      m.classList.remove('active');
      document.body.style.overflow = '';
    });
  }
});
</script>