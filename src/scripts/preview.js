import "../styles/preview.scss";

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


