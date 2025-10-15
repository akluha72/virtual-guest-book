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

    /* Audio player overlay */
    .audio-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.9);
      backdrop-filter: blur(10px);
      display: none;
      align-items: center;
      justify-content: center;
      z-index: 2000;
      opacity: 0;
      transition: opacity 0.3s ease;
    }

    .audio-overlay.show {
      display: flex;
      opacity: 1;
    }

    .audio-player-container {
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(20px);
      border-radius: 20px;
      padding: 2rem;
      text-align: center;
      max-width: 400px;
      width: 90%;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
      border: 1px solid rgba(255, 255, 255, 0.2);
    }

    .audio-visualizer {
      width: 100%;
      height: 120px;
      background: rgba(0, 0, 0, 0.3);
      border-radius: 12px;
      margin-bottom: 1rem;
      border: 1px solid rgba(255, 255, 255, 0.1);
    }

    .audio-player {
      display: none;
    }

    .play-button {
      background: linear-gradient(135deg, #007AFF, #5856D6);
      color: white;
      border: none;
      padding: 1rem 2rem;
      border-radius: 25px;
      font-size: 1.1rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
      box-shadow: 0 4px 15px rgba(0, 122, 255, 0.3);
      font-family: "Reenie Beanie", cursive;
    }

    .play-button:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(0, 122, 255, 0.4);
    }

    .play-button.playing {
      background: linear-gradient(135deg, #ff4757, #ff6b9d);
    }

    .close-audio {
      position: absolute;
      top: 20px;
      right: 20px;
      background: rgba(255, 255, 255, 0.1);
      color: white;
      border: none;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      font-size: 1.5rem;
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .close-audio:hover {
      background: rgba(255, 255, 255, 0.2);
      transform: scale(1.1);
    }

    .audio-info {
      margin-bottom: 1rem;
    }

    .audio-info h3 {
      font-family: 'Reenie Beanie', cursive;
      font-size: 1.5rem;
      margin: 0 0 0.5rem;
      color: #333;
    }

    .audio-info p {
      font-size: 0.9rem;
      color: #666;
      margin: 0;
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

  <!-- Audio Player Overlay -->
  <div class="audio-overlay" id="audioOverlay">
    <div class="audio-player-container">
      <button class="close-audio" id="closeAudio">&times;</button>
      <div class="audio-info">
        <h3 id="audioGuestName">Guest Name</h3>
        <p id="audioGuestDate">Date</p>
      </div>
      <canvas class="audio-visualizer" id="audioVisualizer" width="400" height="120"></canvas>
      <audio class="audio-player" id="audioPlayer" preload="metadata"></audio>
      <button class="play-button" id="playButton">▶️ Play</button>
    </div>
  </div>

  <script>
    class PreviewGallery {
      constructor() {
        this.audioOverlay = document.getElementById('audioOverlay');
        this.closeAudio = document.getElementById('closeAudio');
        this.audioPlayer = document.getElementById('audioPlayer');
        this.playButton = document.getElementById('playButton');
        this.audioVisualizer = document.getElementById('audioVisualizer');
        this.audioGuestName = document.getElementById('audioGuestName');
        this.audioGuestDate = document.getElementById('audioGuestDate');
        
        this.audioCtx = null;
        this.analyser = null;
        this.rafId = null;
        this.isPlaying = false;
        
        this.init();
      }

      init() {
        this.setupEventListeners();
      }

      setupEventListeners() {
        // Polaroid click events
        const polaroidItems = document.querySelectorAll('.polaroid-item');
        polaroidItems.forEach(item => {
          item.addEventListener('click', () => {
            const audio = item.dataset.audio;
            const name = item.dataset.name;
            const date = item.dataset.date;
            
            if (audio) {
              this.openAudioPlayer(audio, name, date);
            }
          });
        });

        // Audio player controls
        this.closeAudio.addEventListener('click', () => {
          this.closeAudioPlayer();
        });

        this.playButton.addEventListener('click', () => {
          this.toggleAudio();
        });

        // Close overlay when clicking outside
        this.audioOverlay.addEventListener('click', (e) => {
          if (e.target === this.audioOverlay) {
            this.closeAudioPlayer();
          }
        });

        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
          if (e.key === 'Escape') {
            this.closeAudioPlayer();
          }
        });
      }

      openAudioPlayer(audioSrc, name, date) {
        this.audioGuestName.textContent = name || 'Guest';
        this.audioGuestDate.textContent = date || '';
        this.audioPlayer.src = audioSrc;
        
        this.audioOverlay.classList.add('show');
        document.body.style.overflow = 'hidden';
      }

      closeAudioPlayer() {
        this.stopAudio();
        this.audioOverlay.classList.remove('show');
        document.body.style.overflow = 'auto';
      }

      toggleAudio() {
        if (this.isPlaying) {
          this.stopAudio();
        } else {
          this.playAudio();
        }
      }

      playAudio() {
        this.audioPlayer.play().then(() => {
          this.setupAudioVisualizer();
          this.playButton.textContent = '⏸️ Pause';
          this.playButton.classList.add('playing');
          this.isPlaying = true;
        }).catch(error => {
          console.warn('Could not play audio:', error);
        });
      }

      stopAudio() {
        this.audioPlayer.pause();
        this.audioPlayer.currentTime = 0;
        this.playButton.textContent = '▶️ Play';
        this.playButton.classList.remove('playing');
        this.isPlaying = false;
        
        if (this.rafId) {
          cancelAnimationFrame(this.rafId);
          this.rafId = null;
        }
      }

      setupAudioVisualizer() {
        if (this.audioCtx) return;
        
        try {
          this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
          const source = this.audioCtx.createMediaElementSource(this.audioPlayer);
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

        const canvas = this.audioVisualizer;
        const ctx = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

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
    }

    // Initialize when DOM is loaded
    document.addEventListener('DOMContentLoaded', () => {
      new PreviewGallery();
    });
  </script>
</body>
</html>