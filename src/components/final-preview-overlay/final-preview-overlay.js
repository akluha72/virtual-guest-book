import './final-preview-overlay.scss';

export class FinalPreviewOverlayComponent {
  constructor(config = {}) {
    this.config = {
      hiddenOnInit: config.hiddenOnInit ?? true,
      ...config
    };

    this.element = null;
  }

  createElement() {
    const template = `
      <section class="final-preview-overlay" id="finalPreviewOverlay">
        <div class="flower-top">
          <img src="images/cover/flower-top.png" alt="Decorative flowers">
        </div>
        
        <div class="preview-wrapper">
          <div class="polaroid-frame">
            <div class="photo-area">
              <img id="finalPreviewPhoto" class="guest-photo" alt="Guest">
            </div>

            <div class="guest-info">
              <canvas id="finalPreviewCanvas" class="audio-visualizer" width="400" height="60"></canvas>
              <audio id="finalPreviewAudio" class="audio-player" preload="metadata"></audio>
              <h2 id="displayName" class="editable-name" tabindex="0">Click here to enter your name<span class="cursor">|</span></h2>
              <input id="hiddenNameInput" type="text" style="position:absolute; opacity:0; pointer-events:none;">
            </div>

            <div class="bottom-bar">
              <span id="finalPreviewDate" class="guest-date">Oct 9, 2025</span>
            </div>
          </div>

          <div class="retake-photo-section">
            <span id="retakePhotoText" class="retake-photo-text">Retake Photo</span>
          </div>

          <div class="final-button">
            <button id="restartBtn">Restart</button>
            <button id="submitFinalBtn">Submit</button>
          </div>
        </div>

        <div class="flower-bottom">
          <img src="images/cover/flower-bottom.png" alt="Decorative flowers">
        </div>
      </section>
    `;

    const container = document.createElement('div');
    container.innerHTML = template;
    this.element = container.firstElementChild;

    return this.element;
  }

  init() {
    if (!this.element) {
      throw new Error('Final preview overlay element not created. Call createElement() first.');
    }

    if (this.config.hiddenOnInit) {
      this.element.style.display = 'none';
    }

    return this;
  }

  show() {
    if (this.element) {
      this.element.style.display = 'flex';
    }
    return this;
  }

  hide() {
    if (this.element) {
      this.element.style.display = 'none';
    }
    return this;
  }

  destroy() {
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
    this.element = null;
  }
}
