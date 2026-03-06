<?php
// Preview page showing entries in gallery-style polaroid grid
require __DIR__ . "/../../../private/db.php";

$entries = [];
$sql = "SELECT id, guest_name, event_date, photo, audio, created_at FROM guestbook_entries ORDER BY id DESC";
if ($result = $conn->query($sql)) {
    while ($row = $result->fetch_assoc()) {
        $entries[] = $row;
    }
    $result->free();
}
?>
<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Guest Gallery</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Homemade+Apple&family=Reenie+Beanie&display=swap" rel="stylesheet">
  <link href="https://fonts.googleapis.com/css2?family=Sacramento&display=swap" rel="stylesheet">
  <style>
    body {
      font-family: sans-serif;
      text-align: center;
      background-color: black;
      justify-content: center;
      margin: 0;
      padding: 0;
      min-height: 100vh;
    }

    .gallery-section {
      display: flex;
      /* position: fixed; */
      top: 0;
      left: 0;
      width: 100vw;
      background: black;
      z-index: 1000;
      overflow-x: hidden;
      padding: 1rem;
      box-sizing: border-box;
    }

    .gallery-container {
      width: 100%;
      max-width: 100%;
      margin: 0 auto;
      text-align: center;
      display: flex;
      flex-direction: column;
      min-height: 100vh;
      overflow-x: hidden;
      padding-bottom: 2rem;
      position: relative;
    }

    .gallery-header {
      margin-bottom: 1.5rem;
      color: white;
      flex-shrink: 0;
    }

    .gallery-title {
      font-family: 'Sacramento', cursive;
      font-size: 2rem;
      margin: 0 0 0.5rem;
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
      font-weight: 400;
    }

    .gallery-subtitle {
      font-size: 1rem;
      margin: 0 0 1rem;
      opacity: 0.9;
      font-weight: 300;
    }

    .gallery-stats {
      background: rgba(255, 255, 255, 0.1);
      padding: 0.8rem 1.5rem;
      border-radius: 20px;
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.2);
      display: inline-block;
      font-size: 0.9rem;
      font-weight: 500;
    }

    .polaroid-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 0.5rem;
      margin-bottom: 2rem;
      padding: 0 0 2rem 0;
      flex: 1;
      align-content: start;
      justify-items: center;
      width: 100%;
      max-width: 100%;
      overflow: visible;
      min-height: auto;
    }

    .polaroid-item {
      background: white;
      padding: 0.4rem 0.4rem 0;
      border-radius: 0;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      transition: all 0.3s ease;
      position: relative;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      width: 85%;
      max-width: 85%;
      height: 230px;
      overflow: hidden;
    }

    .polaroid-item:hover {
      transform: scale(1.02);
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.15);
    }

    .polaroid-photo {
      width: 100%;
      height: calc(100% - 40px);
      object-fit: cover;
      border-radius: 0;
      background: #f0f0f0;
      max-width: 100%;
    }

    .polaroid-photo[src=""], .polaroid-photo:not([src]) {
      background: #e0e0e0;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #999;
      font-size: 0.6rem;
    }

    .polaroid-info {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      background: white;
      padding: 0.3rem 0.4rem;
      text-align: center;
      color: #333;
      width: 100%;
      overflow: hidden;
      border-top: 1px solid #eee;
    }

    .guest-name {
      font-family: 'Reenie Beanie', cursive;
      font-size: 0.8rem;
      font-weight: 600;
      margin: 0 0 0.1rem;
      color: #2c3e50;
      line-height: 1.1;
      word-wrap: break-word;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .guest-date {
      font-size: 0.6rem;
      color: #7f8c8d;
      margin: 0;
      word-wrap: break-word;
    }

    /* Lightbox Modal */
    .lightbox-modal {
      display: none;
      position: fixed;
      z-index: 2000;
      left: 0;
      top: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.95);
      backdrop-filter: blur(20px);
      opacity: 0;
      transition: opacity 0.3s ease;
    }

    .lightbox-modal.show {
      display: flex;
      opacity: 1;
    }

    .lightbox-content {
      position: relative;
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem;
      box-sizing: border-box;
    }

    /* Carousel Navigation */
    .carousel-nav {
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      background: rgba(0, 0, 0, 0.5);
      color: white;
      border: none;
      width: 50px;
      height: 50px;
      border-radius: 50%;
      cursor: pointer;
      font-size: 1.5rem;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.3s ease;
      z-index: 2001;
    }

    .carousel-nav:hover {
      background: rgba(0, 0, 0, 0.7);
      transform: translateY(-50%) scale(1.1);
    }

    .carousel-prev {
      left: 30px;
    }

    .carousel-next {
      right: 30px;
    }

    .carousel-nav:disabled {
      opacity: 0.3;
      cursor: not-allowed;
    }

    .carousel-nav:disabled:hover {
      transform: translateY(-50%);
      background: rgba(0, 0, 0, 0.5);
    }

    .lightbox-close {
      position: absolute;
      top: 20px;
      right: 30px;
      color: white;
      font-size: 2.5rem;
      font-weight: bold;
      cursor: pointer;
      z-index: 2001;
      transition: all 0.3s ease;
      background: rgba(0, 0, 0, 0.5);
      border: none;
      width: 50px;
      height: 50px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .lightbox-close:hover {
      color: #ff6b6b;
      transform: scale(1.1);
      background: rgba(0, 0, 0, 0.7);
    }

    .lightbox-image-container {
      position: relative;
      max-width: 90%;
      max-height: 90%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }

    .lightbox-image {
      max-width: 100%;
      max-height: 60vh;
      object-fit: contain;
      border-radius: 0;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
      transition: transform 0.3s ease;
    }

    .lightbox-image:hover {
      transform: scale(1.02);
    }

    /* Audio Section */
    .lightbox-audio-section {
      margin-top: 2rem;
      width: 100%;
      max-width: 500px;
    }

    .lightbox-info {
      text-align: center;
      margin-bottom: 1.5rem;
    }

    .lightbox-guest-name {
      font-family: 'Reenie Beanie', cursive;
      font-size: 1.8rem;
      font-weight: 600;
      margin: 0 0 0.5rem;
      color: white;
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
    }

    .lightbox-guest-date {
      font-size: 1rem;
      color: #ccc;
      margin: 0;
      opacity: 0.9;
    }

    /* Waveform Container */
    .waveform-container {
      width: 100%;
      height: 80px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      margin-bottom: 1.5rem;
      padding: 1rem;
      display: none;
      align-items: center;
      justify-content: center;
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.2);
      transition: all 0.3s ease;
    }

    .waveform-container.show {
      display: flex;
    }

    .lightbox-waveform {
      width: 100%;
      height: 100%;
      background: transparent;
    }

    /* Spotify-style Player */
    .spotify-player {
      background: rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(20px);
      border-radius: 20px;
      padding: 1.5rem;
      border: 1px solid rgba(255, 255, 255, 0.2);
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    }

    .player-controls {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 1.5rem;
      margin-bottom: 1rem;
    }

    .control-btn {
      background: transparent;
      border: none;
      color: white;
      cursor: pointer;
      padding: 0.5rem;
      border-radius: 50%;
      transition: all 0.3s ease;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .control-btn:hover {
      background: rgba(255, 255, 255, 0.1);
      transform: scale(1.1);
    }

    .control-btn.active {
      color: #1db954;
      background: rgba(29, 185, 84, 0.2);
    }

    .play-pause-btn {
      background: white;
      color: black;
      width: 50px;
      height: 50px;
      border-radius: 50%;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
    }

    .play-pause-btn:hover {
      transform: scale(1.05);
      box-shadow: 0 6px 20px rgba(0, 0, 0, 0.4);
    }

    .play-pause-btn.playing {
      background: #1db954;
      color: white;
    }

    /* Progress Bar */
    .progress-container {
      display: flex;
      align-items: center;
      gap: 1rem;
      color: white;
      font-size: 0.8rem;
      font-weight: 500;
    }

    .progress-bar {
      flex: 1;
      height: 4px;
      background: rgba(255, 255, 255, 0.3);
      border-radius: 2px;
      position: relative;
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .progress-bar:hover {
      height: 6px;
    }

    .progress-fill {
      height: 100%;
      background: #1db954;
      border-radius: 2px;
      width: 0%;
      transition: width 0.1s ease;
    }

    .progress-handle {
      position: absolute;
      top: 50%;
      left: 0%;
      width: 12px;
      height: 12px;
      background: white;
      border-radius: 50%;
      transform: translate(-50%, -50%);
      opacity: 0;
      transition: opacity 0.3s ease;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    }

    .progress-bar:hover .progress-handle {
      opacity: 1;
    }

    .time-current, .time-total {
      min-width: 35px;
      text-align: center;
      font-family: 'Courier New', monospace;
    }

    /* Responsive Design */
    @media (max-width: 768px) {
      .lightbox-content {
        padding: 1rem;
      }

      .lightbox-image {
        max-height: 50vh;
      }

      .lightbox-audio-section {
        margin-top: 1rem;
        max-width: 100%;
      }

      .lightbox-guest-name {
        font-size: 1.5rem;
      }

      .lightbox-guest-date {
        font-size: 0.9rem;
      }

      .waveform-container {
        height: 60px;
        margin-bottom: 1rem;
        padding: 0.5rem;
      }

      .spotify-player {
        padding: 1rem;
      }

      .player-controls {
        gap: 1rem;
      }

      .control-btn {
        padding: 0.4rem;
      }

      .play-pause-btn {
        width: 45px;
        height: 45px;
      }

      .progress-container {
        gap: 0.5rem;
        font-size: 0.7rem;
      }

      .lightbox-close {
        top: 15px;
        right: 20px;
        width: 40px;
        height: 40px;
        font-size: 2rem;
      }

      .carousel-nav {
        width: 40px;
        height: 40px;
        font-size: 1.2rem;
      }

      .carousel-prev {
        left: 15px;
      }

      .carousel-next {
        right: 15px;
      }
    }

    @media (max-width: 480px) {
      .lightbox-content {
        padding: 0.5rem;
      }

      .lightbox-image {
        max-height: 40vh;
      }

      .lightbox-guest-name {
        font-size: 1.3rem;
      }

      .lightbox-guest-date {
        font-size: 0.8rem;
      }

      .waveform-container {
        height: 50px;
        margin-bottom: 0.8rem;
        padding: 0.3rem;
      }

      .spotify-player {
        padding: 0.8rem;
      }

      .player-controls {
        gap: 0.8rem;
      }

      .play-pause-btn {
        width: 40px;
        height: 40px;
      }

      .progress-container {
        gap: 0.3rem;
        font-size: 0.6rem;
      }
    }

    /* Empty state */
    .empty-state {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100vh;
      text-align: center;
      color: white;
    }

    .empty-content {
      background: rgba(255, 255, 255, 0.1);
      padding: 3rem 2rem;
      border-radius: 20px;
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.2);
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
      max-width: 400px;
      width: 90%;
    }

    .empty-content .empty-icon {
      font-size: 4rem;
      margin-bottom: 1rem;
    }

    .empty-content h1 {
      font-family: 'Sacramento', cursive;
      font-size: 2.5rem;
      margin: 0 0 1rem;
      font-weight: 400;
    }

    .empty-content p {
      font-size: 1.1rem;
      margin: 0;
      opacity: 0.9;
    }

    /* Responsive design */
    @media (max-width: 360px) {
      .gallery-section {
        padding: 0.5rem;
      }

      .polaroid-grid {
        grid-template-columns: repeat(2, 1fr);
        gap: 0.3rem;
      }

      .polaroid-item {
        padding: 0.3rem 0.3rem 0;
        border-radius: 0;
        width: 85%;
        max-width: 85%;
        height: 230px;
      }

      .polaroid-photo {
        border-radius: 0;
        height: calc(100% - 35px);
      }

      .polaroid-info .guest-name {
        font-size: 0.7rem;
      }

      .polaroid-info .guest-date {
        font-size: 0.5rem;
      }
    }

    @media (min-width: 768px) {
      .gallery-section {
        padding: 2rem;
      }

      .gallery-container {
        max-width: 900px;
      }

      .gallery-header {
        margin-bottom: 2rem;
      }

      .gallery-title {
        font-size: 3rem;
      }

      .gallery-subtitle {
        font-size: 1.2rem;
      }

      .gallery-stats {
        padding: 1rem 2rem;
        font-size: 1rem;
      }

      .polaroid-grid {
        grid-template-columns: repeat(2, 1fr);
        gap: 1rem;
        margin-bottom: 3rem;
        max-width: 100%;
      }

      .polaroid-item {
        padding: 0.8rem 0.8rem 0;
        border-radius: 0;
        width: 85%;
        max-width: 85%;
        height: 230px;
      }

      .polaroid-photo {
        border-radius: 0;
        height: calc(100% - 50px);
      }

      .polaroid-info .guest-name {
        font-size: 1.1rem;
        white-space: normal;
        line-height: 1.2;
      }

      .polaroid-info .guest-date {
        font-size: 0.8rem;
      }
    }

    @media (min-width: 1024px) {
      .gallery-header .gallery-title {
        font-size: 3.5rem;
      }

      .gallery-header .gallery-subtitle {
        font-size: 1.3rem;
      }

      .polaroid-grid {
        grid-template-columns: repeat(2, 1fr);
        gap: 1.5rem;
        max-width: 100%;
      }

      .polaroid-item {
        padding: 1rem 1rem 0;
        border-radius: 0;
        width: 85%;
        max-width: 85%;
        height: 230px;
      }

      .polaroid-photo {
        border-radius: 0;
        height: calc(100% - 60px);
      }

      .polaroid-info .guest-name {
        font-size: 1.2rem;
        white-space: normal;
        line-height: 1.3;
      }

      .polaroid-info .guest-date {
        font-size: 0.9rem;
      }
    }
  </style>
</head>
<body>
  <div class="gallery-section">
    <div class="gallery-container">
      <div class="gallery-header">
        <h1 class="gallery-title">Guest Gallery</h1>
        <p class="gallery-subtitle">See what others have shared!</p>
        <div class="gallery-stats">
          <span><?php echo count($entries); ?></span> guests have shared their wishes
        </div>
      </div>
      
      <?php if (empty($entries)): ?>
        <div class="empty-state">
          <div class="empty-content">
            <div class="empty-icon">📝</div>
            <h1>No entries yet</h1>
            <p>Be the first to leave a message!</p>
          </div>
        </div>
      <?php else: ?>
        <div class="polaroid-grid">
          <?php foreach ($entries as $index => $entry):
            $name = htmlspecialchars($entry['guest_name'] ?? '');
            $date = htmlspecialchars($entry['event_date'] ?? '');
            $photo = htmlspecialchars($entry['photo'] ?? '');
            $audio = htmlspecialchars($entry['audio'] ?? '');
          ?>
          <div class="polaroid-item" data-audio="<?php echo $audio; ?>" data-name="<?php echo $name; ?>" data-date="<?php echo $date; ?>">
            <?php if ($photo): ?>
              <img class="polaroid-photo" src="<?php echo $photo; ?>" alt="<?php echo $name ?: 'Guest'; ?>" loading="lazy" />
            <?php else: ?>
              <div class="polaroid-photo" style="background:#e0e0e0; display:flex; align-items:center; justify-content:center; color:#999; font-size:0.6rem;">No Image</div>
            <?php endif; ?>
            
            <div class="polaroid-info">
              <div class="guest-name"><?php echo $name ?: 'Guest'; ?></div>
              <div class="guest-date"><?php echo $date; ?></div>
            </div>
          </div>
          <?php endforeach; ?>
        </div>
      <?php endif; ?>
    </div>
  </div>

  <!-- Lightbox Modal -->
  <div class="lightbox-modal" id="lightboxModal">
    <div class="lightbox-content">
      <button class="lightbox-close" id="lightboxClose">&times;</button>
      
      <!-- Carousel Navigation -->
      <button class="carousel-nav carousel-prev" id="carouselPrev" title="Previous">‹</button>
      <button class="carousel-nav carousel-next" id="carouselNext" title="Next">›</button>
      
      <div class="lightbox-image-container">
        <img id="lightboxImage" class="lightbox-image" alt="Gallery Image">
        
        <!-- Audio Player Section -->
        <div class="lightbox-audio-section">
          <div class="lightbox-info">
            <h3 id="lightboxName" class="lightbox-guest-name">Guest Name</h3>
            <p id="lightboxDate" class="lightbox-guest-date">Date</p>
          </div>
          
          <!-- Waveform Visualizer -->
          <div class="waveform-container">
            <canvas id="lightboxWaveform" class="lightbox-waveform" width="400" height="80"></canvas>
          </div>
          
          <!-- Simplified Audio Controls -->
          <div class="spotify-player">
            <div class="player-controls">
              <button class="control-btn play-pause-btn" id="playPauseBtn" title="Play">
                <svg class="play-icon" width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M8 5v10l8-5-8-5z"/>
                </svg>
                <svg class="pause-icon" width="20" height="20" viewBox="0 0 20 20" fill="currentColor" style="display: none;">
                  <path d="M5 4h3v12H5V4zm7 0h3v12h-3V4z"/>
                </svg>
              </button>
            </div>
            
            <!-- Progress Bar -->
            <div class="progress-container">
              <span class="time-current" id="timeCurrent">0:00</span>
              <div class="progress-bar" id="progressBar">
                <div class="progress-fill" id="progressFill"></div>
                <div class="progress-handle" id="progressHandle"></div>
              </div>
              <span class="time-total" id="timeTotal">0:00</span>
            </div>
          </div>
        </div>
      </div>
      
      <audio id="lightboxAudio" class="lightbox-audio" preload="metadata"></audio>
    </div>
  </div>

  <script>
    class PreviewGallery {
      constructor() {
        this.lightboxModal = document.getElementById('lightboxModal');
        this.lightboxClose = document.getElementById('lightboxClose');
        this.lightboxImage = document.getElementById('lightboxImage');
        this.lightboxName = document.getElementById('lightboxName');
        this.lightboxDate = document.getElementById('lightboxDate');
        this.lightboxAudio = document.getElementById('lightboxAudio');
        this.lightboxWaveform = document.getElementById('lightboxWaveform');
        this.waveformContainer = document.querySelector('.waveform-container');
        
        // Carousel controls
        this.carouselPrev = document.getElementById('carouselPrev');
        this.carouselNext = document.getElementById('carouselNext');
        
        // Audio controls
        this.playPauseBtn = document.getElementById('playPauseBtn');
        this.progressBar = document.getElementById('progressBar');
        this.progressFill = document.getElementById('progressFill');
        this.progressHandle = document.getElementById('progressHandle');
        this.timeCurrent = document.getElementById('timeCurrent');
        this.timeTotal = document.getElementById('timeTotal');
        
        this.audioCtx = null;
        this.analyser = null;
        this.rafId = null;
        this.isPlaying = false;
        this.currentEntry = null;
        this.currentIndex = 0;
        this.entries = [];
        
        this.init();
      }

      init() {
        this.setupEventListeners();
        this.loadEntries();
      }

      loadEntries() {
        // Get all entries from polaroid items
        const polaroidItems = document.querySelectorAll('.polaroid-item');
        this.entries = Array.from(polaroidItems).map(item => ({
          name: item.dataset.name,
          date: item.dataset.date,
          audio: item.dataset.audio,
          photo: item.querySelector('.polaroid-photo').src
        }));
      }

      setupEventListeners() {
        // Polaroid click events
        const polaroidItems = document.querySelectorAll('.polaroid-item');
        polaroidItems.forEach((item, index) => {
          item.addEventListener('click', () => {
            this.openLightbox(index);
          });
        });

        // Lightbox controls
        this.lightboxClose.addEventListener('click', () => {
          this.closeLightbox();
        });

        // Carousel navigation
        this.carouselPrev.addEventListener('click', () => {
          this.previousEntry();
        });

        this.carouselNext.addEventListener('click', () => {
          this.nextEntry();
        });

        this.playPauseBtn.addEventListener('click', () => {
          this.toggleAudio();
        });

        // Progress bar interaction
        this.progressBar.addEventListener('click', (e) => {
          if (this.lightboxAudio.duration) {
            const rect = this.progressBar.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const percentage = clickX / rect.width;
            this.lightboxAudio.currentTime = percentage * this.lightboxAudio.duration;
          }
        });

        // Close lightbox when clicking outside
        this.lightboxModal.addEventListener('click', (e) => {
          if (e.target === this.lightboxModal) {
            this.closeLightbox();
          }
        });

        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
          if (e.key === 'Escape') {
            this.closeLightbox();
          } else if (e.key === 'ArrowLeft') {
            this.previousEntry();
          } else if (e.key === 'ArrowRight') {
            this.nextEntry();
          }
        });

        // Audio events
        this.lightboxAudio.addEventListener('timeupdate', () => {
          this.updateProgress();
        });

        this.lightboxAudio.addEventListener('loadedmetadata', () => {
          this.updateTimeDisplay();
        });

        this.lightboxAudio.addEventListener('ended', () => {
          this.stopAudio();
        });
      }

      openLightbox(index) {
        this.currentIndex = index;
        this.currentEntry = this.entries[index];
        if (!this.currentEntry) return;

        // Update lightbox content
        this.lightboxImage.src = this.currentEntry.photo;
        this.lightboxImage.alt = this.currentEntry.name || 'Guest';
        this.lightboxName.textContent = this.currentEntry.name || 'Guest';
        this.lightboxDate.textContent = this.currentEntry.date || '';

        // Set audio source if available
        if (this.currentEntry.audio) {
          this.lightboxAudio.src = this.currentEntry.audio;
          this.lightboxAudio.load();
        }

        // Update carousel navigation
        this.updateCarouselNavigation();

        // Hide waveform initially
        this.waveformContainer.classList.remove('show');

        // Show lightbox
        this.lightboxModal.classList.add('show');
        document.body.style.overflow = 'hidden';
      }

      closeLightbox() {
        this.stopAudio();
        this.lightboxModal.classList.remove('show');
        document.body.style.overflow = 'auto';
      }

      previousEntry() {
        if (this.currentIndex > 0) {
          this.openLightbox(this.currentIndex - 1);
        }
      }

      nextEntry() {
        if (this.currentIndex < this.entries.length - 1) {
          this.openLightbox(this.currentIndex + 1);
        }
      }

      updateCarouselNavigation() {
        this.carouselPrev.disabled = this.currentIndex === 0;
        this.carouselNext.disabled = this.currentIndex === this.entries.length - 1;
      }

      toggleAudio() {
        if (this.isPlaying) {
          this.pauseAudio();
        } else {
          this.playAudio();
        }
      }

      playAudio() {
        if (!this.currentEntry?.audio) return;

        this.lightboxAudio.play().then(() => {
          this.setupAudioVisualizer();
          this.updatePlayButton(true);
          this.isPlaying = true;
          // Show waveform when audio starts playing
          this.waveformContainer.classList.add('show');
        }).catch(error => {
          console.warn('Could not play audio:', error);
        });
      }

      pauseAudio() {
        this.lightboxAudio.pause();
        this.updatePlayButton(false);
        this.isPlaying = false;
      }

      stopAudio() {
        this.lightboxAudio.pause();
        this.lightboxAudio.currentTime = 0;
        this.updatePlayButton(false);
        this.isPlaying = false;
        
        // Hide waveform when audio stops
        this.waveformContainer.classList.remove('show');
        
        if (this.rafId) {
          cancelAnimationFrame(this.rafId);
          this.rafId = null;
        }
      }

      updatePlayButton(playing) {
        const playIcon = this.playPauseBtn.querySelector('.play-icon');
        const pauseIcon = this.playPauseBtn.querySelector('.pause-icon');
        
        if (playing) {
          playIcon.style.display = 'none';
          pauseIcon.style.display = 'block';
          this.playPauseBtn.classList.add('playing');
        } else {
          playIcon.style.display = 'block';
          pauseIcon.style.display = 'none';
          this.playPauseBtn.classList.remove('playing');
        }
      }

      setupAudioVisualizer() {
        if (this.audioCtx) return;
        
        try {
          this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
          const source = this.audioCtx.createMediaElementSource(this.lightboxAudio);
          this.analyser = this.audioCtx.createAnalyser();
          this.analyser.fftSize = 2048;
          source.connect(this.analyser);
          this.analyser.connect(this.audioCtx.destination);
          this.drawVisualizer();
        } catch (error) {
          console.warn('Could not setup audio visualizer:', error);
        }
      }

      drawVisualizer() {
        this.rafId = requestAnimationFrame(() => this.drawVisualizer());
        if (!this.analyser) return;

        const bufferLength = this.analyser.fftSize;
        const dataArray = new Uint8Array(bufferLength);
        this.analyser.getByteTimeDomainData(dataArray);

        const canvas = this.lightboxWaveform;
        const ctx = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);

        // Draw waveform
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#FFD700';
        ctx.beginPath();

        const sliceWidth = (canvas.width / dpr) / bufferLength;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          const v = dataArray[i] / 128.0;
          const y = (v * (canvas.height / dpr)) / 2;
          
          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
          x += sliceWidth;
        }

        ctx.lineTo(canvas.width / dpr, (canvas.height / dpr) / 2);
        ctx.stroke();
      }

      updateProgress() {
        if (!this.lightboxAudio.duration) return;
        
        const progress = (this.lightboxAudio.currentTime / this.lightboxAudio.duration) * 100;
        this.progressFill.style.width = `${progress}%`;
        this.progressHandle.style.left = `${progress}%`;
        
        this.timeCurrent.textContent = this.formatTime(this.lightboxAudio.currentTime);
      }

      updateTimeDisplay() {
        this.timeTotal.textContent = this.formatTime(this.lightboxAudio.duration);
      }

      formatTime(seconds) {
        if (isNaN(seconds)) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
      }
    }

    // Initialize when DOM is loaded
    document.addEventListener('DOMContentLoaded', () => {
      new PreviewGallery();
    });
  </script>
</body>
</html>