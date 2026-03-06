<?php
// Preview page showing entries in gallery-style polaroid grid (with hardcoded sample data)
$entries = [
  [
    'id' => 1,
    'guest_name' => 'Alice',
    'event_date' => '2026-02-01',
    'photo' => 'public/image-assets/sample1.jpg',
    'audio' => 'public/voice-note/sample1.mp3',
    'created_at' => '2026-02-01 10:00:00',
  ],
  [
    'id' => 2,
    'guest_name' => 'Bob',
    'event_date' => '2026-01-30',
    'photo' => 'public/image-assets/sample2.jpg',
    'audio' => '',
    'created_at' => '2026-01-30 15:30:00',
  ],
  [
    'id' => 3,
    'guest_name' => 'Charlie',
    'event_date' => '2026-01-28',
    'photo' => '',
    'audio' => 'public/voice-note/sample3.mp3',
    'created_at' => '2026-01-28 09:15:00',
  ],
];
?>
<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Guest Gallery (Test)</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Homemade+Apple&family=Reenie+Beanie&display=swap" rel="stylesheet">
  <link href="https://fonts.googleapis.com/css2?family=Sacramento&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="src/styles/preview.css">
  <style>
    /* Inline fallback styles if needed */
  </style>
</head>
<body>
  <div class="gallery-section">
    <div class="gallery-container">
      <div class="gallery-header">
        <h1 class="gallery-title">Guest Gallery (Test)</h1>
        <p class="gallery-subtitle">See what others have shared! (Sample Data)</p>
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
  <!-- Lightbox Modal and JS copied from preview.php -->
  <div class="lightbox-modal" id="lightboxModal">
    <div class="lightbox-content">
      <button class="lightbox-close" id="lightboxClose">&times;</button>
      <button class="carousel-nav carousel-prev" id="carouselPrev" title="Previous">‹</button>
      <button class="carousel-nav carousel-next" id="carouselNext" title="Next">›</button>
      <div class="lightbox-image-container">
        <img id="lightboxImage" class="lightbox-image" alt="Gallery Image">
        <div class="lightbox-audio-section">
          <div class="lightbox-info">
            <h3 id="lightboxName" class="lightbox-guest-name">Guest Name</h3>
            <p id="lightboxDate" class="lightbox-guest-date">Date</p>
          </div>
          <div class="waveform-container">
            <canvas id="lightboxWaveform" class="lightbox-waveform" width="400" height="80"></canvas>
          </div>
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
    // JS copied from preview.php
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
        this.carouselPrev = document.getElementById('carouselPrev');
        this.carouselNext = document.getElementById('carouselNext');
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
        const polaroidItems = document.querySelectorAll('.polaroid-item');
        this.entries = Array.from(polaroidItems).map(item => ({
          name: item.dataset.name,
          date: item.dataset.date,
          audio: item.dataset.audio,
          photo: item.querySelector('.polaroid-photo').src
        }));
      }
      setupEventListeners() {
        const polaroidItems = document.querySelectorAll('.polaroid-item');
        polaroidItems.forEach((item, index) => {
          item.addEventListener('click', () => {
            this.openLightbox(index);
          });
        });
        this.lightboxClose.addEventListener('click', () => {
          this.closeLightbox();
        });
        this.carouselPrev.addEventListener('click', () => {
          this.previousEntry();
        });
        this.carouselNext.addEventListener('click', () => {
          this.nextEntry();
        });
        this.playPauseBtn.addEventListener('click', () => {
          this.toggleAudio();
        });
        this.progressBar.addEventListener('click', (e) => {
          if (this.lightboxAudio.duration) {
            const rect = this.progressBar.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const percentage = clickX / rect.width;
            this.lightboxAudio.currentTime = percentage * this.lightboxAudio.duration;
          }
        });
        this.lightboxModal.addEventListener('click', (e) => {
          if (e.target === this.lightboxModal) {
            this.closeLightbox();
          }
        });
        document.addEventListener('keydown', (e) => {
          if (e.key === 'Escape') {
            this.closeLightbox();
          } else if (e.key === 'ArrowLeft') {
            this.previousEntry();
          } else if (e.key === 'ArrowRight') {
            this.nextEntry();
          }
        });
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
        this.lightboxImage.src = this.currentEntry.photo;
        this.lightboxImage.alt = this.currentEntry.name || 'Guest';
        this.lightboxName.textContent = this.currentEntry.name || 'Guest';
        this.lightboxDate.textContent = this.currentEntry.date || '';
        if (this.currentEntry.audio) {
          this.lightboxAudio.src = this.currentEntry.audio;
          this.lightboxAudio.load();
        }
        this.updateCarouselNavigation();
        this.waveformContainer.classList.remove('show');
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
        ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
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
    document.addEventListener('DOMContentLoaded', () => {
      new PreviewGallery();
    });
  </script>
</body>
</html>
