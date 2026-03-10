import './guest-wishes.scss';

export class GuestWishesComponent {
  constructor(config = {}) {
    this.config = {
      hiddenOnInit: config.hiddenOnInit ?? true,
      ...config
    };

    this.element = null;
  }

  createElement() {
    const template = `
      <section class="guest-wishes-section" style="display: none;">
        <div class="flower-top">
          <img src="images/cover/flower-top.png" alt="Decorative flowers">
        </div>

        <div class="voice-recorder-container">
          <h2 class="recorder-title">Voice Recorder</h2>

          <div class="recording-indicator-container">
            <div class="recording-indicator" id="recordingIndicator">
              <div class="microphone-icon">
                <div class="mic-circle">
                  <img src="./images/microphone-2-edit.png" alt="microphone">
                </div>
              </div>
            </div>
          </div>

          <div class="recording-timer" id="recordingTimer">00:00:00</div>

          <div class="waveform-container">
            <canvas id="visualizer2" class="waveform-canvas"></canvas>
          </div>

          <div class="recording-controls">
            <button id="recordBtn" class="record-btn idle">Start Recording</button>
          </div>

          <div id="postControls" class="post-controls" style="display:none;">
            <button id="restartRecordingBtn" class="restart-btn">Restart</button>
            <button id="saveRecordingBtn" class="save-btn">Next</button>
          </div>
        </div>

        <audio id="audioPlayback" controls style="display:none;" preload="auto" playsinline webkit-playsinline></audio>

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
      throw new Error('Guest wishes element not created. Call createElement() first.');
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
