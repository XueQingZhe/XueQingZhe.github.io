@ -23,76 +23,112 @@ nav_order: 5
  </div>
</div>

<div class="tutorials-container">
<!-- 教程卡片网格 -->
<div class="tutorials-grid">
  {% assign tutorial_series = site.data.tutorials %}
  
  {% for series in tutorial_series %}
  <div class="tutorial-card">
    <div class="card-glow"></div>
  <div class="tutorial-card-compact" onclick="openTutorialModal('modal-{{ forloop.index }}')">
    <!-- 背景图片 -->
    {% if series.image %}
    <div class="card-image" style="background-image: url('{{ series.image | relative_url }}')">
      <div class="card-overlay"></div>
    </div>
    {% else %}
    <div class="card-image placeholder">
      <div class="placeholder-icon">
        <i class="fas fa-book-open fa-3x"></i>
      </div>
    </div>
    {% endif %}
    
    <div class="row g-0">
      <!-- 左侧预览图 - 缩小宽度 -->
      <div class="col-md-4">
        {% if series.image %}
        <div class="tutorial-image-container" style="--preview-img: url('{{ series.image | relative_url }}')">
          <div class="image-overlay"></div>
          <img src="{{ series.image | relative_url }}" alt="{{ series.title }}" class="tutorial-preview-img">
        </div>
        {% else %}
        <div class="placeholder-image">
          <div class="placeholder-icon">
            <i class="fas fa-book-open fa-3x"></i>
          </div>
          <p class="placeholder-text">{{ series.title }}</p>
        </div>
        {% endif %}
    <!-- 卡片内容 -->
    <div class="card-content">
      {% if series.status %}
      <span class="status-badge-mini badge-{{ series.status_color }}">
        <i class="fas fa-circle"></i>
        {{ series.status }}
      </span>
      {% endif %}
      
      <h3 class="card-title">{{ series.title }}</h3>
      <p class="card-description">{{ series.description }}</p>
      
      <div class="card-footer">
        <span class="chapter-count">
          <i class="fas fa-list"></i>
          {{ series.chapters.size }} 章节
        </span>
        <span class="view-details">
          查看详情
          <i class="fas fa-arrow-right"></i>
        </span>
      </div>
    </div>
    
    <!-- 悬停提示 -->
    <div class="hover-hint">
      <i class="fas fa-search-plus"></i>
      点击查看完整目录
    </div>
  </div>
  
  <!-- 模态框 -->
  <div id="modal-{{ forloop.index }}" class="tutorial-modal">
    <div class="modal-backdrop" onclick="closeTutorialModal('modal-{{ forloop.index }}')"></div>
    <div class="modal-container">
      <button class="modal-close" onclick="closeTutorialModal('modal-{{ forloop.index }}')">
        <i class="fas fa-times"></i>
      </button>
      
      <!-- 右侧内容 - 增加宽度 -->
      <div class="col-md-8">
        <div class="tutorial-content">
          <div class="content-header">
            <h3 class="tutorial-title">
              <span class="title-icon"><i class="fas fa-book"></i></span>
      <div class="modal-content">
        <div class="modal-left">
          {% if series.image %}
          <div class="modal-image-container" style="--preview-img: url('{{ series.image | relative_url }}')">
            <div class="image-overlay"></div>
            <img src="{{ series.image | relative_url }}" alt="{{ series.title }}" class="modal-preview-img">
          </div>
          {% else %}
          <div class="modal-placeholder">
            <i class="fas fa-book-open fa-4x"></i>
            <p>{{ series.title }}</p>
          </div>
          {% endif %}
        </div>
        
        <div class="modal-right">
          <div class="modal-header">
            <h2 class="modal-title">
              <i class="fas fa-book"></i>
              {{ series.title }}
            </h3>
            </h2>
            {% if series.status %}
            <span class="status-badge badge-{{ series.status_color }}">
            <span class="status-badge-large badge-{{ series.status_color }}">
              <i class="fas fa-circle pulse-dot"></i>
              {{ series.status }}
            </span>
            {% endif %}
          </div>
          
          <p class="tutorial-description">{{ series.description }}</p>
          <p class="modal-description">{{ series.description }}</p>
          
          <div class="chapters-section">
          <div class="modal-chapters">
            <div class="chapters-header">
              <i class="fas fa-list-ul"></i>
              <span>章节列表</span>
              <span class="chapter-count-badge">{{ series.chapters.size }}</span>
              <span class="chapter-badge">{{ series.chapters.size }}</span>
            </div>
            
            <!-- 改为两列布局 -->
            <div class="chapters-grid">
            <div class="chapters-list-modal">
              {% for chapter in series.chapters %}
              <a href="{{ series.base_url }}/{{ chapter.file | remove: '.md' }}/" class="chapter-item">
                <span class="chapter-number">{{ forloop.index }}</span>
                <span class="chapter-title">{{ chapter.title }}</span>
                <i class="fas fa-arrow-right chapter-arrow"></i>
              <a href="{{ series.base_url }}/{{ chapter.file | remove: '.md' }}/" class="chapter-link">
                <span class="chapter-num">{{ forloop.index }}</span>
                <span class="chapter-name">{{ chapter.title }}</span>
                <i class="fas fa-external-link-alt"></i>
              </a>
              {% endfor %}
            </div>
          </div>
          
          <div class="tutorial-footer">
            <div class="tutorial-stats">
              <span class="stat-item">
                <i class="fas fa-book-open"></i>
                {{ series.chapters.size }} 章节
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
@ -148,6 +184,35 @@ nav_order: 5
  </div>
</div>

<script>
function openTutorialModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
}

function closeTutorialModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }
}

// ESC键关闭
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    const activeModal = document.querySelector('.tutorial-modal.active');
    if (activeModal) {
      activeModal.classList.remove('active');
      document.body.style.overflow = '';
    }
  }
});
</script>

<style>
/* ========== 页面头部 ========== */
.tutorials-hero {
@ -235,78 +300,305 @@ nav_order: 5
  margin: 0;
}

/* ========== 教程卡片 ========== */
.tutorials-container {
/* ========== 教程卡片网格 ========== */
.tutorials-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 2rem;
  margin-bottom: 4rem;
}

.tutorial-card {
/* ========== 紧凑卡片 ========== */
.tutorial-card-compact {
  background: var(--global-bg-color);
  border: 1px solid var(--global-divider-color);
  border-radius: 20px;
  border-radius: 16px;
  overflow: hidden;
  margin-bottom: 2.5rem;
  transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 4px 12px rgba(0,0,0,0.05);
  cursor: pointer;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  height: 420px;
  display: flex;
  flex-direction: column;
}

.tutorial-card-compact:hover {
  transform: translateY(-8px);
  box-shadow: 0 16px 48px rgba(0,0,0,0.15);
  border-color: var(--global-theme-color);
}

/* 卡片图片 */
.card-image {
  width: 100%;
  height: 200px;
  background-size: cover;
  background-position: center;
  position: relative;
  overflow: hidden;
}

/* 发光效果 */
.card-glow {
.card-image::before {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle, rgba(var(--global-theme-color-rgb), 0.15) 0%, transparent 50%);
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(180deg,
    transparent 0%,
    rgba(0,0,0,0.3) 100%
  );
}

.card-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.2);
  transition: background 0.3s;
}

.tutorial-card-compact:hover .card-overlay {
  background: rgba(0,0,0,0.1);
}

.card-image.placeholder {
  background: linear-gradient(135deg,
    rgba(var(--global-theme-color-rgb), 0.1) 0%,
    rgba(var(--global-theme-color-rgb), 0.05) 100%
  );
  display: flex;
  align-items: center;
  justify-content: center;
}

.placeholder-icon {
  color: var(--global-theme-color);
  opacity: 0.3;
}

/* 卡片内容 */
.card-content {
  padding: 1.5rem;
  flex: 1;
  display: flex;
  flex-direction: column;
  position: relative;
}

.status-badge-mini {
  position: absolute;
  top: -28px;
  right: 1.5rem;
  background: linear-gradient(135deg,
    var(--global-theme-color) 0%,
    var(--global-hover-color) 100%
  );
  color: white;
  padding: 0.4rem 0.9rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  box-shadow: 0 4px 12px rgba(var(--global-theme-color-rgb), 0.3);
}

.status-badge-mini i {
  font-size: 0.5rem;
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

.card-title {
  font-size: 1.4rem;
  font-weight: 700;
  color: var(--global-text-color);
  margin: 0 0 0.75rem 0;
  line-height: 1.3;
}

.card-description {
  font-size: 0.95rem;
  color: var(--global-text-color-light);
  line-height: 1.7;
  margin: 0 0 1.5rem 0;
  flex: 1;
}

.card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 1rem;
  border-top: 1px solid var(--global-divider-color);
}

.chapter-count {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--global-text-color-light);
  font-size: 0.9rem;
  font-weight: 500;
}

.chapter-count i {
  color: var(--global-theme-color);
}

.view-details {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--global-theme-color);
  font-size: 0.9rem;
  font-weight: 600;
  transition: gap 0.3s;
}

.tutorial-card-compact:hover .view-details {
  gap: 0.75rem;
}

/* 悬停提示 */
.hover-hint {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(0,0,0,0.85);
  color: white;
  padding: 1rem 1.5rem;
  border-radius: 12px;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-weight: 600;
  opacity: 0;
  transition: opacity 0.5s;
  pointer-events: none;
  transition: opacity 0.3s;
  z-index: 10;
}

.tutorial-card:hover .card-glow {
.tutorial-card-compact:hover .hover-hint {
  opacity: 1;
  animation: rotate 10s linear infinite;
}

@keyframes rotate {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
/* ========== 模态框 ========== */
.tutorial-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.3s;
}

.tutorial-card:hover {
  transform: translateY(-8px);
  box-shadow: 0 16px 48px rgba(0,0,0,0.15);
  border-color: var(--global-theme-color);
.tutorial-modal.active {
  opacity: 1;
  pointer-events: auto;
}

/* ========== 图片区域 - 缩小高度 ========== */
.tutorial-image-container {
  width: 100%;
  height: 100%;
  min-height: 280px;
.modal-backdrop {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.8);
  backdrop-filter: blur(8px);
}

.modal-container {
  position: relative;
  width: 90%;
  max-width: 1200px;
  max-height: 85vh;
  background: var(--global-bg-color);
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0,0,0,0.3);
  transform: scale(0.9);
  transition: transform 0.3s;
}

.tutorial-modal.active .modal-container {
  transform: scale(1);
}

.modal-close {
  position: absolute;
  top: 1.5rem;
  right: 1.5rem;
  width: 40px;
  height: 40px;
  border: none;
  background: rgba(0,0,0,0.5);
  color: white;
  border-radius: 50%;
  font-size: 1.2rem;
  cursor: pointer;
  z-index: 10;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-close:hover {
  background: var(--global-theme-color);
  transform: rotate(90deg);
}

.modal-content {
  display: flex;
  height: 85vh;
  max-height: 800px;
}

/* 模态框左侧 */
.modal-left {
  width: 35%;
  background: linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 100%);
  position: relative;
  overflow: hidden;
}

.modal-image-container {
  width: 100%;
  height: 100%;
  position: relative;
}

/* 模糊背景 */
.tutorial-image-container::before {
.modal-image-container::before {
  content: '';
  position: absolute;
  top: -20px;
  left: -20px;
  right: -20px;
  bottom: -20px;
  top: -30px;
  left: -30px;
  right: -30px;
  bottom: -30px;
  background-image: var(--preview-img);
  background-size: cover;
  background-position: center;
  filter: blur(25px) brightness(0.4);
  transform: scale(1.15);
  z-index: 0;
  filter: blur(30px) brightness(0.4);
  transform: scale(1.2);
}

/* 渐变遮罩 */
.image-overlay {
  position: absolute;
  top: 0;
@ -317,106 +609,72 @@ nav_order: 5
    rgba(var(--global-theme-color-rgb), 0.2) 0%,
    transparent 100%
  );
  z-index: 1;
}

/* 前景图片 */
.tutorial-preview-img {
.modal-preview-img {
  position: relative;
  z-index: 2;
  z-index: 1;
  width: 100%;
  height: 100%;
  object-fit: contain;
  padding: 1.5rem;
  filter: drop-shadow(0 8px 20px rgba(0,0,0,0.7));
  transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  padding: 3rem;
  filter: drop-shadow(0 10px 30px rgba(0,0,0,0.7));
}

.tutorial-card:hover .tutorial-preview-img {
  transform: scale(1.05) translateY(-6px);
  filter: drop-shadow(0 12px 28px rgba(0,0,0,0.8));
}

/* 占位图 */
.placeholder-image {
  background: linear-gradient(135deg,
    rgba(var(--global-theme-color-rgb), 0.1) 0%,
    rgba(var(--global-theme-color-rgb), 0.05) 100%
  );
.modal-placeholder {
  width: 100%;
  height: 100%;
  min-height: 280px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  position: relative;
  overflow: hidden;
}

.placeholder-icon {
  color: var(--global-theme-color);
  opacity: 0.3;
  transition: all 0.5s;
}

.tutorial-card:hover .placeholder-icon {
  transform: scale(1.15) rotate(8deg);
  opacity: 0.5;
}

.placeholder-text {
  margin-top: 1rem;
  font-weight: 600;
  color: var(--global-text-color-light);
  font-size: 1rem;
  padding: 2rem;
  text-align: center;
}

/* ========== 内容区域 ========== */
.tutorial-content {
  padding: 2rem;
  height: 100%;
/* 模态框右侧 */
.modal-right {
  width: 65%;
  padding: 3rem;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.content-header {
.modal-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 0.75rem;
  gap: 1rem;
  gap: 1.5rem;
  margin-bottom: 1.5rem;
}

.tutorial-title {
  font-size: 1.5rem;
.modal-title {
  font-size: 2rem;
  font-weight: 700;
  margin: 0;
  color: var(--global-text-color);
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex: 1;
}

.title-icon {
.modal-title i {
  color: var(--global-theme-color);
  font-size: 1.2rem;
}

/* 状态徽章 */
.status-badge {
  padding: 0.45rem 0.9rem;
  border-radius: 20px;
  font-size: 0.8rem;
.status-badge-large {
  padding: 0.6rem 1.2rem;
  border-radius: 24px;
  font-size: 0.9rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  gap: 0.6rem;
  white-space: nowrap;
}

.badge-primary {
  background: linear-gradient(135deg,
    var(--global-theme-color) 0%,
    var(--global-hover-color) 100%
@ -427,25 +685,18 @@ nav_order: 5

.pulse-dot {
  font-size: 0.5rem;
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

.tutorial-description {
.modal-description {
  font-size: 1.1rem;
  line-height: 1.8;
  color: var(--global-text-color-light);
  margin-bottom: 1.5rem;
  line-height: 1.7;
  font-size: 1rem;
  margin: 0 0 2rem 0;
}

/* ========== 章节列表 - 改为网格布局 ========== */
.chapters-section {
  flex-grow: 1;
  margin-bottom: 1.25rem;
/* 章节列表 */
.modal-chapters {
  flex: 1;
}

.chapters-header {
@ -454,36 +705,35 @@ nav_order: 5
  gap: 0.75rem;
  font-weight: 700;
  color: var(--global-theme-color);
  margin-bottom: 1rem;
  font-size: 1rem;
  padding-bottom: 0.65rem;
  margin-bottom: 1.5rem;
  font-size: 1.1rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid var(--global-divider-color);
}

.chapter-count-badge {
.chapter-badge {
  background: var(--global-theme-color);
  color: white;
  padding: 0.2rem 0.6rem;
  border-radius: 10px;
  font-size: 0.75rem;
  padding: 0.3rem 0.8rem;
  border-radius: 12px;
  font-size: 0.85rem;
  margin-left: auto;
}

/* 章节网格 - 两列布局 */
.chapters-grid {
.chapters-list-modal {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.75rem;
  gap: 1rem;
}

.chapter-item {
.chapter-link {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  gap: 1rem;
  padding: 1rem 1.25rem;
  background: var(--global-bg-color);
  border: 1px solid var(--global-divider-color);
  border-radius: 10px;
  border-radius: 12px;
  color: var(--global-text-color);
  text-decoration: none;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
@ -491,13 +741,13 @@ nav_order: 5
  overflow: hidden;
}

.chapter-item::before {
.chapter-link::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  width: 4px;
  background: linear-gradient(180deg,
    var(--global-theme-color) 0%,
    var(--global-hover-color) 100%
@ -506,20 +756,20 @@ nav_order: 5
  transition: transform 0.3s;
}

.chapter-item:hover::before {
.chapter-link:hover::before {
  transform: scaleY(1);
}

.chapter-item:hover {
  transform: translateX(4px);
.chapter-link:hover {
  transform: translateX(6px);
  background: var(--global-code-bg-color);
  border-color: var(--global-theme-color);
  box-shadow: 0 3px 10px rgba(0,0,0,0.08);
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.chapter-number {
  width: 28px;
  height: 28px;
.chapter-num {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
@ -528,59 +778,31 @@ nav_order: 5
    var(--global-hover-color) 100%
  );
  color: white;
  border-radius: 7px;
  border-radius: 8px;
  font-weight: 700;
  font-size: 0.85rem;
  font-size: 0.9rem;
  flex-shrink: 0;
}

.chapter-title {
.chapter-name {
  flex: 1;
  font-weight: 500;
  font-size: 0.9rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.95rem;
}

.chapter-arrow {
.chapter-link i {
  color: var(--global-theme-color);
  opacity: 0;
  transform: translateX(-8px);
  transform: translateX(-10px);
  transition: all 0.3s;
  font-size: 0.85rem;
}

.chapter-item:hover .chapter-arrow {
.chapter-link:hover i {
  opacity: 1;
  transform: translateX(0);
}

/* 底部信息 */
.tutorial-footer {
  margin-top: auto;
  padding-top: 1.25rem;
  border-top: 1px solid var(--global-divider-color);
}

.tutorial-stats {
  display: flex;
  gap: 1.5rem;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--global-text-color-light);
  font-size: 0.9rem;
  font-weight: 500;
}

.stat-item i {
  color: var(--global-theme-color);
}

/* ========== 分隔线 ========== */
.section-divider {
  text-align: center;
@ -717,8 +939,21 @@ nav_order: 5
}

/* ========== 响应式 ========== */
@media (max-width: 992px) {
  .chapters-grid {
@media (max-width: 1024px) {
  .modal-content {
    flex-direction: column;
  }
  
  .modal-left {
    width: 100%;
    height: 250px;
  }
  
  .modal-right {
    width: 100%;
  }
  
  .chapters-list-modal {
    grid-template-columns: 1fr;
  }
}
@ -732,34 +967,21 @@ nav_order: 5
    font-size: 2rem;
  }
  
  .tutorial-card .row {
    flex-direction: column;
  }
  
  .tutorial-image-container,
  .placeholder-image {
    min-height: 240px;
  }
  
  .tutorial-content {
    padding: 1.75rem;
  }
  
  .content-header {
    flex-direction: column;
    align-items: flex-start;
  .tutorials-grid {
    grid-template-columns: 1fr;
  }
  
  .tutorial-title {
    font-size: 1.3rem;
  .modal-container {
    width: 95%;
    max-height: 90vh;
  }
  
  .chapters-grid {
    grid-template-columns: 1fr;
  .modal-right {
    padding: 2rem;
  }
  
  .chapter-item {
    padding: 0.75rem 0.9rem;
  .modal-title {
    font-size: 1.5rem;
  }
  
  .planned-grid {
