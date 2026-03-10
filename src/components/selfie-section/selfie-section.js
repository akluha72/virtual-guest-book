import './selfie-section.scss';

export class SelfieSectionComponent {
  constructor(config = {}) {
    this.config = {
      hiddenOnInit: config.hiddenOnInit ?? true,
      ...config
    };

    this.element = null;
  }

  createElement() {
    const template = `
      <section class="selfie-section">
        <div class="camera-wrapper">
          <video id="camera" autoplay playsinline></video>
          <div class="camera-filter"></div>

          <div id="cameraPermissionOverlay" class="camera-permission-overlay">
            <div class="permission-content">
              <h2 class="permission-title">Camera Access Required</h2>
              <p class="permission-message">Please allow camera access to take your selfie. We need your permission to use
                the camera for this feature.</p>
              <button id="requestCameraPermission" class="permission-button">Allow Camera Access</button>
              <p class="permission-note">Your privacy is important to us. Camera access is only used for taking photos and
                is not stored or shared.</p>
            </div>
          </div>

          <div class="filter-controls">
            <button class="filter-btn active" data-filter="bw_grain">B&W</button>
            <button class="filter-btn" data-filter="vintage">Vintage</button>
            <button class="filter-btn" data-filter="dramatic">Dramatic</button>
            <button class="filter-btn" data-filter="none">None</button>
          </div>

          <div class="shutter-button-wrapper">
            <button id="takePhotoBtn" class="shutter-button" disabled></button>
          </div>
        </div>
        <canvas id="photoCanvas" style="display: none;"></canvas>
        <div id="flashOverlay" class="flash-overlay"></div>
      </section>
    `;

    const container = document.createElement('div');
    container.innerHTML = template;
    this.element = container.firstElementChild;

    return this.element;
  }

  init() {
    if (!this.element) {
      throw new Error('Selfie section element not created. Call createElement() first.');
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
