<?php
// Preview page showing entries in a single-column, "stories" style
// Uses same DB include style as save_entry.php
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
  <title>Guestbook Preview</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Sacramento&display=swap" rel="stylesheet">
  <link href="https://fonts.googleapis.com/css2?family=Fleur+De+Leah&display=swap" rel="stylesheet">
  <style>
    /* Preview page styles - Full screen swipeable cards */
    body {
      margin: 0;
      padding: 0;
      font-family: system-ui, -apple-system, sans-serif;
      background: #000000;
      overflow: hidden;
      height: 100vh;
    }

    #previewContainer {
      width: 100vw;
      height: 100vh;
      position: relative;
    }

    .page-title {
      position: absolute;
      top: 2rem;
      left: 50%;
      transform: translateX(-50%);
      z-index: 20;
      text-align: center;
    }

    .page-title h1 {
      font-family: 'Sacramento', cursive;
      font-size: 2.5rem;
      color: white;
      margin: 0;
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
      letter-spacing: 1px;
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

    /* Swipe container */
    .swipe-container {
      width: 100%;
      height: 100vh;
      position: relative;
      overflow: hidden;
    }

    .cards-wrapper {
      display: flex;
      width: 100%;
      height: 100%;
      transition: transform 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94);
    }

    /* Guest card */
    .guest-card {
      min-width: 100vw;
      height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem;
      box-sizing: border-box;
    }

    .card-content {
      background: rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(20px);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 24px;
      padding: 2rem;
      text-align: center;
      color: white;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
      max-width: 500px;
      width: 100%;
      max-height: 80vh;
      overflow-y: auto;
    }

    /* Photo container */
    .photo-container {
      margin-bottom: 2rem;
    }

    .photo-container .guest-photo {
      width: 200px;
      height: 200px;
      border-radius: 50%;
      object-fit: cover;
      border: 4px solid rgba(255, 255, 255, 0.3);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
      transition: transform 0.3s ease;
    }

    .photo-container .guest-photo:hover {
      transform: scale(1.05);
    }

    /* Guest info */
    .guest-info {
      margin-bottom: 2rem;
    }

    .guest-info .guest-name {
      font-family: 'Sacramento', cursive;
      font-size: 3rem;
      margin: 0 0 0.5rem;
      font-weight: 400;
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
    }

    .guest-info .guest-date {
      font-size: 1.1rem;
      margin: 0;
      opacity: 0.8;
      font-weight: 300;
    }

    /* Audio section */
    .audio-section .audio-visualizer {
      width: 100%;
      height: 120px;
      background: rgba(0, 0, 0, 0.3);
      border-radius: 12px;
      margin-bottom: 1rem;
      border: 1px solid rgba(255, 255, 255, 0.1);
    }

    .audio-section .audio-player {
      display: none;
    }

    .audio-section .play-button {
      background: rgba(0, 122, 255, 0.2);
      color: white;
      border: 1px solid rgba(0, 122, 255, 0.4);
      padding: 0.75rem 2rem;
      border-radius: 12px;
      font-size: 1.1rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease-in-out;
      backdrop-filter: blur(10px);
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
      letter-spacing: 0.3px;
    }

    .audio-section .play-button:hover {
      transform: translateY(-1px);
      background: rgba(0, 122, 255, 0.3);
      border-color: rgba(0, 122, 255, 0.5);
      box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
    }

    .audio-section .play-button:active {
      transform: translateY(0);
      background: rgba(0, 122, 255, 0.25);
    }

    .audio-section .play-button.playing {
      background: rgba(255, 59, 48, 0.2);
      border-color: rgba(255, 59, 48, 0.4);
    }

    .audio-section .play-button.playing:hover {
      background: rgba(255, 59, 48, 0.3);
      border-color: rgba(255, 59, 48, 0.5);
    }

    /* Navigation dots */
    .nav-dots {
      position: absolute;
      bottom: 2rem;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      gap: 0.5rem;
      z-index: 10;
    }

    .nav-dots .dot {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.3);
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .nav-dots .dot.active {
      background: rgba(255, 255, 255, 0.8);
      transform: scale(1.2);
    }

    .nav-dots .dot:hover {
      background: rgba(255, 255, 255, 0.6);
    }

    /* Navigation arrows */
    .nav-arrow {
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      background: rgba(255, 255, 255, 0.1);
      color: white;
      border: 1px solid rgba(255, 255, 255, 0.2);
      width: 60px;
      height: 60px;
      border-radius: 50%;
      font-size: 2rem;
      font-weight: bold;
      cursor: pointer;
      transition: all 0.2s ease-in-out;
      backdrop-filter: blur(10px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
      z-index: 10;
    }

    .nav-arrow:hover {
      background: rgba(255, 255, 255, 0.2);
      border-color: rgba(255, 255, 255, 0.3);
      transform: translateY(-50%) scale(1.1);
      box-shadow: 0 6px 16px rgba(0, 0, 0, 0.3);
    }

    .nav-arrow:active {
      transform: translateY(-50%) scale(0.95);
    }

    .nav-arrow.nav-prev {
      left: 2rem;
    }

    .nav-arrow.nav-next {
      right: 2rem;
    }

    .nav-arrow:disabled {
      opacity: 0.3;
      cursor: not-allowed;
    }

    .nav-arrow:disabled:hover {
      transform: translateY(-50%);
      background: rgba(255, 255, 255, 0.1);
    }

    /* Responsive design */
    @media (max-width: 768px) {
      .page-title h1 {
        font-size: 2rem;
      }
      
      .card-content {
        padding: 1.5rem;
        margin: 1rem;
      }
      
      .photo-container .guest-photo {
        width: 150px;
        height: 150px;
      }
      
      .guest-info .guest-name {
        font-size: 2.5rem;
      }
      
      .nav-arrow {
        width: 50px;
        height: 50px;
        font-size: 1.5rem;
      }
      
      .nav-arrow.nav-prev {
        left: 1rem;
      }
      
      .nav-arrow.nav-next {
        right: 1rem;
      }
      
      .nav-dots {
        bottom: 1rem;
      }
    }

    @media (max-width: 480px) {
      .page-title {
        top: 1rem;
      }
      
      .page-title h1 {
        font-size: 1.8rem;
      }
      
      .guest-card {
        padding: 1rem;
      }
      
      .card-content {
        padding: 1rem;
      }
      
      .photo-container .guest-photo {
        width: 120px;
        height: 120px;
      }
      
      .guest-info .guest-name {
        font-size: 2rem;
      }
      
      .audio-section .audio-visualizer {
        height: 80px;
      }
    }
  </style>
</head>
<body>
  <div id="previewContainer">
    <div class="page-title">
      <h1>Guest Wishes</h1>
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
      <div class="swipe-container" id="swipeContainer">
        <div class="cards-wrapper" id="cardsWrapper">
          <?php foreach ($entries as $index => $e):
            $name = htmlspecialchars($e['guest_name'] ?? '');
            $date = htmlspecialchars($e['event_date'] ?? '');
            $photo = htmlspecialchars($e['photo'] ?? '');
            $audio = htmlspecialchars($e['audio'] ?? '');
          ?>
          <div class="guest-card" data-index="<?php echo $index; ?>">
            <div class="card-content">
              <div class="photo-container">
                <img class="guest-photo" src="<?php echo $photo ? $photo : '/vite.svg'; ?>" alt="<?php echo $name ?: 'Guest'; ?>" />
              </div>
              <div class="guest-info">
                <h2 class="guest-name"><?php echo $name ?: 'Guest'; ?></h2>
                <p class="guest-date"><?php echo $date; ?></p>
              </div>
              <?php if ($audio): ?>
              <div class="audio-section">
                <canvas class="audio-visualizer" width="400" height="120"></canvas>
                <audio class="audio-player" preload="metadata" src="<?php echo $audio; ?>"></audio>
                <button class="play-button">▶️ Play</button>
              </div>
              <?php endif; ?>
            </div>
          </div>
          <?php endforeach; ?>
        </div>
        
        <!-- Navigation dots -->
        <div class="nav-dots">
          <?php for ($i = 0; $i < count($entries); $i++): ?>
            <span class="dot <?php echo $i === 0 ? 'active' : ''; ?>" data-index="<?php echo $i; ?>"></span>
          <?php endfor; ?>
        </div>
        
        <!-- Navigation arrows -->
        <button class="nav-arrow nav-prev" id="prevBtn">‹</button>
        <button class="nav-arrow nav-next" id="nextBtn">›</button>
      </div>
    <?php endif; ?>
  </div>

  <script>
    class PreviewPage {
      constructor() {
        this.currentIndex = 0;
        this.totalCards = 0;
        this.cardsWrapper = null;
        this.dots = [];
        this.prevBtn = null;
        this.nextBtn = null;
        this.isTransitioning = false;
        this.touchStartX = 0;
        this.touchEndX = 0;
        this.audioContexts = new Map();
        
        this.init();
      }

      init() {
        this.cardsWrapper = document.getElementById('cardsWrapper');
        this.prevBtn = document.getElementById('prevBtn');
        this.nextBtn = document.getElementById('nextBtn');
        this.dots = document.querySelectorAll('.dot');
        this.totalCards = document.querySelectorAll('.guest-card').length;

        if (this.totalCards === 0) return;

        this.setupEventListeners();
        this.setupAudioVisualizers();
        this.updateNavigation();
      }

      setupEventListeners() {
        // Navigation buttons
        this.prevBtn?.addEventListener('click', () => this.previousCard());
        this.nextBtn?.addEventListener('click', () => this.nextCard());

        // Dot navigation
        this.dots.forEach((dot, index) => {
          dot.addEventListener('click', () => this.goToCard(index));
        });

        // Touch/swipe support
        this.cardsWrapper?.addEventListener('touchstart', (e) => {
          this.touchStartX = e.changedTouches[0].screenX;
        });

        this.cardsWrapper?.addEventListener('touchend', (e) => {
          this.touchEndX = e.changedTouches[0].screenX;
          this.handleSwipe();
        });

        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
          if (e.key === 'ArrowLeft') this.previousCard();
          if (e.key === 'ArrowRight') this.nextCard();
        });
      }

      setupAudioVisualizers() {
        const cards = document.querySelectorAll('.guest-card');
        cards.forEach((card, index) => {
          const audio = card.querySelector('.audio-player');
          const canvas = card.querySelector('.audio-visualizer');
          const playBtn = card.querySelector('.play-button');

          if (audio && canvas && playBtn) {
            this.setupCardAudio(card, audio, canvas, playBtn);
          }
        });
      }

      setupCardAudio(card, audio, canvas, playBtn) {
        let audioCtx = null;
        let analyser = null;
        let rafId = null;
        let isPlaying = false;

        // Setup canvas
        const ctx = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        function draw() {
          rafId = requestAnimationFrame(draw);
          if (!analyser) return;

          const bufferLength = analyser.fftSize;
          const dataArray = new Uint8Array(bufferLength);
          analyser.getByteTimeDomainData(dataArray);

          // Clear canvas
          ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
          ctx.fillRect(0, 0, canvas.width / dpr, canvas.height / dpr);

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

        function setupAnalyser() {
          if (audioCtx) return;
          
          try {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const source = audioCtx.createMediaElementSource(audio);
            analyser = audioCtx.createAnalyser();
            analyser.fftSize = 2048;
            source.connect(analyser);
            analyser.connect(audioCtx.destination);
            draw();
          } catch (error) {
            console.warn('Could not setup audio analyser:', error);
          }
        }

        playBtn.addEventListener('click', () => {
          if (isPlaying) {
            audio.pause();
            playBtn.textContent = '▶️ Play';
            playBtn.classList.remove('playing');
            isPlaying = false;
            if (rafId) {
              cancelAnimationFrame(rafId);
              rafId = null;
            }
          } else {
            // Stop other audios
            this.stopAllAudios();
            
            audio.play().then(() => {
              setupAnalyser();
              playBtn.textContent = '⏸️ Pause';
              playBtn.classList.add('playing');
              isPlaying = true;
            }).catch(error => {
              console.warn('Could not play audio:', error);
            });
          }
        });

        audio.addEventListener('ended', () => {
          playBtn.textContent = '▶️ Play';
          playBtn.classList.remove('playing');
          isPlaying = false;
          if (rafId) {
            cancelAnimationFrame(rafId);
            rafId = null;
          }
        });

        // Store context for cleanup
        this.audioContexts.set(card, { audioCtx, analyser, rafId });
      }

      stopAllAudios() {
        const audios = document.querySelectorAll('.audio-player');
        const playBtns = document.querySelectorAll('.play-button');
        
        audios.forEach(audio => {
          audio.pause();
          audio.currentTime = 0;
        });
        
        playBtns.forEach(btn => {
          btn.textContent = '▶️ Play';
          btn.classList.remove('playing');
        });

        // Stop all visualizers
        this.audioContexts.forEach(({ rafId }) => {
          if (rafId) cancelAnimationFrame(rafId);
        });
      }

      handleSwipe() {
        const swipeThreshold = 50;
        const diff = this.touchStartX - this.touchEndX;

        if (Math.abs(diff) > swipeThreshold) {
          if (diff > 0) {
            this.nextCard();
          } else {
            this.previousCard();
          }
        }
      }

      nextCard() {
        if (this.isTransitioning) return;
        this.currentIndex = (this.currentIndex + 1) % this.totalCards;
        this.updateCardPosition();
        this.updateNavigation();
      }

      previousCard() {
        if (this.isTransitioning) return;
        this.currentIndex = this.currentIndex === 0 ? this.totalCards - 1 : this.currentIndex - 1;
        this.updateCardPosition();
        this.updateNavigation();
      }

      goToCard(index) {
        if (this.isTransitioning || index === this.currentIndex) return;
        this.currentIndex = index;
        this.updateCardPosition();
        this.updateNavigation();
      }

      updateCardPosition() {
        if (!this.cardsWrapper) return;
        
        this.isTransitioning = true;
        const translateX = -this.currentIndex * 100;
        this.cardsWrapper.style.transform = `translateX(${translateX}%)`;
        
        // Stop all audios when changing cards
        this.stopAllAudios();
        
        setTimeout(() => {
          this.isTransitioning = false;
        }, 500);
      }

      updateNavigation() {
        // Update dots
        this.dots.forEach((dot, index) => {
          dot.classList.toggle('active', index === this.currentIndex);
        });

        // Update arrow states
        if (this.prevBtn) {
          this.prevBtn.disabled = this.currentIndex === 0;
        }
        if (this.nextBtn) {
          this.nextBtn.disabled = this.currentIndex === this.totalCards - 1;
        }
      }
    }

    // Initialize when DOM is loaded
    document.addEventListener('DOMContentLoaded', () => {
      new PreviewPage();
    });
  </script>
</body>
</html>

