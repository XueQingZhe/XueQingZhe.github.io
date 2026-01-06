@ -31,8 +31,8 @@ nav_order: 5
    <div class="card-glow"></div>
    
    <div class="row g-0">
      <!-- 左侧预览图 -->
      <div class="col-md-5">
      <!-- 左侧预览图 - 缩小宽度 -->
      <div class="col-md-4">
        {% if series.image %}
        <div class="tutorial-image-container" style="--preview-img: url('{{ series.image | relative_url }}')">
          <div class="image-overlay"></div>
@ -41,15 +41,15 @@ nav_order: 5
        {% else %}
        <div class="placeholder-image">
          <div class="placeholder-icon">
            <i class="fas fa-book-open fa-4x"></i>
            <i class="fas fa-book-open fa-3x"></i>
          </div>
          <p class="placeholder-text">{{ series.title }}</p>
        </div>
        {% endif %}
      </div>
      
      <!-- 右侧内容 -->
      <div class="col-md-7">
      <!-- 右侧内容 - 增加宽度 -->
      <div class="col-md-8">
        <div class="tutorial-content">
          <div class="content-header">
            <h3 class="tutorial-title">
@ -73,17 +73,16 @@ nav_order: 5
              <span class="chapter-count-badge">{{ series.chapters.size }}</span>
            </div>
            
            <ul class="chapters-list">
            <!-- 改为两列布局 -->
            <div class="chapters-grid">
              {% for chapter in series.chapters %}
              <li class="chapter-item">
                <a href="{{ series.base_url }}/{{ chapter.file | remove: '.md' }}/">
                  <span class="chapter-number">{{ forloop.index }}</span>
                  <span class="chapter-title">{{ chapter.title }}</span>
                  <i class="fas fa-arrow-right chapter-arrow"></i>
                </a>
              </li>
              <a href="{{ series.base_url }}/{{ chapter.file | remove: '.md' }}/" class="chapter-item">
                <span class="chapter-number">{{ forloop.index }}</span>
                <span class="chapter-title">{{ chapter.title }}</span>
                <i class="fas fa-arrow-right chapter-arrow"></i>
              </a>
              {% endfor %}
            </ul>
            </div>
          </div>
          
          <div class="tutorial-footer">
@ -281,11 +280,11 @@ nav_order: 5
  border-color: var(--global-theme-color);
}

/* ========== 图片区域 ========== */
/* ========== 图片区域 - 缩小高度 ========== */
.tutorial-image-container {
  width: 100%;
  height: 100%;
  min-height: 360px;
  min-height: 280px;
  position: relative;
  overflow: hidden;
  background: linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 100%);
@ -295,15 +294,15 @@ nav_order: 5
.tutorial-image-container::before {
  content: '';
  position: absolute;
  top: -30px;
  left: -30px;
  right: -30px;
  bottom: -30px;
  top: -20px;
  left: -20px;
  right: -20px;
  bottom: -20px;
  background-image: var(--preview-img);
  background-size: cover;
  background-position: center;
  filter: blur(30px) brightness(0.4);
  transform: scale(1.2);
  filter: blur(25px) brightness(0.4);
  transform: scale(1.15);
  z-index: 0;
}

@ -328,14 +327,14 @@ nav_order: 5
  width: 100%;
  height: 100%;
  object-fit: contain;
  padding: 2rem;
  filter: drop-shadow(0 10px 25px rgba(0,0,0,0.7));
  padding: 1.5rem;
  filter: drop-shadow(0 8px 20px rgba(0,0,0,0.7));
  transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

.tutorial-card:hover .tutorial-preview-img {
  transform: scale(1.08) translateY(-8px) rotate(2deg);
  filter: drop-shadow(0 15px 35px rgba(0,0,0,0.8));
  transform: scale(1.05) translateY(-6px);
  filter: drop-shadow(0 12px 28px rgba(0,0,0,0.8));
}

/* 占位图 */
@ -345,12 +344,12 @@ nav_order: 5
    rgba(var(--global-theme-color-rgb), 0.05) 100%
  );
  height: 100%;
  min-height: 360px;
  min-height: 280px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  padding: 1.5rem;
  position: relative;
  overflow: hidden;
}
@ -362,20 +361,20 @@ nav_order: 5
}

.tutorial-card:hover .placeholder-icon {
  transform: scale(1.2) rotate(10deg);
  transform: scale(1.15) rotate(8deg);
  opacity: 0.5;
}

.placeholder-text {
  margin-top: 1.5rem;
  margin-top: 1rem;
  font-weight: 600;
  color: var(--global-text-color-light);
  font-size: 1.1rem;
  font-size: 1rem;
}

/* ========== 内容区域 ========== */
.tutorial-content {
  padding: 2.5rem;
  padding: 2rem;
  height: 100%;
  display: flex;
  flex-direction: column;
@ -385,12 +384,12 @@ nav_order: 5
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 1rem;
  margin-bottom: 0.75rem;
  gap: 1rem;
}

.tutorial-title {
  font-size: 1.6rem;
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0;
  color: var(--global-text-color);
@ -402,14 +401,14 @@ nav_order: 5

.title-icon {
  color: var(--global-theme-color);
  font-size: 1.3rem;
  font-size: 1.2rem;
}

/* 状态徽章 */
.status-badge {
  padding: 0.5rem 1rem;
  padding: 0.45rem 0.9rem;
  border-radius: 20px;
  font-size: 0.85rem;
  font-size: 0.8rem;
  font-weight: 600;
  display: flex;
  align-items: center;
@ -438,15 +437,15 @@ nav_order: 5

.tutorial-description {
  color: var(--global-text-color-light);
  margin-bottom: 2rem;
  line-height: 1.8;
  font-size: 1.05rem;
  margin-bottom: 1.5rem;
  line-height: 1.7;
  font-size: 1rem;
}

/* ========== 章节列表 ========== */
/* ========== 章节列表 - 改为网格布局 ========== */
.chapters-section {
  flex-grow: 1;
  margin-bottom: 1.5rem;
  margin-bottom: 1.25rem;
}

.chapters-header {
@ -455,9 +454,9 @@ nav_order: 5
  gap: 0.75rem;
  font-weight: 700;
  color: var(--global-theme-color);
  margin-bottom: 1.25rem;
  font-size: 1.05rem;
  padding-bottom: 0.75rem;
  margin-bottom: 1rem;
  font-size: 1rem;
  padding-bottom: 0.65rem;
  border-bottom: 2px solid var(--global-divider-color);
}

@ -466,29 +465,25 @@ nav_order: 5
  color: white;
  padding: 0.2rem 0.6rem;
  border-radius: 10px;
  font-size: 0.8rem;
  font-size: 0.75rem;
  margin-left: auto;
}

.chapters-list {
  list-style: none;
  padding: 0;
  margin: 0;
/* 章节网格 - 两列布局 */
.chapters-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.75rem;
}

.chapter-item {
  margin-bottom: 0.75rem;
  transition: all 0.3s;
}

.chapter-item a {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem 1.25rem;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  background: var(--global-bg-color);
  border: 1px solid var(--global-divider-color);
  border-radius: 12px;
  border-radius: 10px;
  color: var(--global-text-color);
  text-decoration: none;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
@ -496,13 +491,13 @@ nav_order: 5
  overflow: hidden;
}

.chapter-item a::before {
.chapter-item::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  width: 3px;
  background: linear-gradient(180deg,
    var(--global-theme-color) 0%,
    var(--global-hover-color) 100%
@ -511,20 +506,20 @@ nav_order: 5
  transition: transform 0.3s;
}

.chapter-item a:hover::before {
.chapter-item:hover::before {
  transform: scaleY(1);
}

.chapter-item a:hover {
  transform: translateX(8px);
.chapter-item:hover {
  transform: translateX(4px);
  background: var(--global-code-bg-color);
  border-color: var(--global-theme-color);
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  box-shadow: 0 3px 10px rgba(0,0,0,0.08);
}

.chapter-number {
  width: 32px;
  height: 32px;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
@ -533,25 +528,30 @@ nav_order: 5
    var(--global-hover-color) 100%
  );
  color: white;
  border-radius: 8px;
  border-radius: 7px;
  font-weight: 700;
  font-size: 0.9rem;
  font-size: 0.85rem;
  flex-shrink: 0;
}

.chapter-title {
  flex: 1;
  font-weight: 500;
  font-size: 0.9rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chapter-arrow {
  color: var(--global-theme-color);
  opacity: 0;
  transform: translateX(-10px);
  transform: translateX(-8px);
  transition: all 0.3s;
  font-size: 0.85rem;
}

.chapter-item a:hover .chapter-arrow {
.chapter-item:hover .chapter-arrow {
  opacity: 1;
  transform: translateX(0);
}
@ -559,7 +559,7 @@ nav_order: 5
/* 底部信息 */
.tutorial-footer {
  margin-top: auto;
  padding-top: 1.5rem;
  padding-top: 1.25rem;
  border-top: 1px solid var(--global-divider-color);
}

@ -573,7 +573,7 @@ nav_order: 5
  align-items: center;
  gap: 0.5rem;
  color: var(--global-text-color-light);
  font-size: 0.95rem;
  font-size: 0.9rem;
  font-weight: 500;
}

@ -717,6 +717,12 @@ nav_order: 5
}

/* ========== 响应式 ========== */
@media (max-width: 992px) {
  .chapters-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .tutorials-hero {
    padding: 3rem 1.5rem;
@ -732,11 +738,11 @@ nav_order: 5
  
  .tutorial-image-container,
  .placeholder-image {
    min-height: 300px;
    min-height: 240px;
  }
  
  .tutorial-content {
    padding: 2rem;
    padding: 1.75rem;
  }
  
  .content-header {
@ -745,11 +751,15 @@ nav_order: 5
  }
  
  .tutorial-title {
    font-size: 1.4rem;
    font-size: 1.3rem;
  }
  
  .chapters-grid {
    grid-template-columns: 1fr;
  }
  
  .chapter-item a {
    padding: 0.875rem 1rem;
  .chapter-item {
    padding: 0.75rem 0.9rem;
  }
  
  .planned-grid {
