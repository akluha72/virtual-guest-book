/**
 * Splash Screen Component
 * Handles the initial splash screen with wedding couple information
 * and transition to the main guestbook functionality
 */

import './splash-screen.scss';

export class SplashScreenComponent {
  constructor(config = {}) {
    this.config = {
      coupleNames: config.coupleNames || 'Firdaus & Najiha',
      weddingDate: config.weddingDate || 'December 4th, 2026',
      fadeOutDuration: config.fadeOutDuration || 1000,
      ...config
    };
    
    this.element = null;
    this.actionBtn = null;
    this.isClicked = false;
    
    // Event callbacks
    this.onStart = config.onStart || (() => {});
  }

  /**
   * Create and return the splash screen HTML element
   */
  createElement() {
    const template = `
      <section class="splash-screen">
        <div class="flower-top">
          <img src="images/cover/flower-top.png" alt="Decorative flowers">
        </div>
        <div class="brides-button-wrapper">
          <div class="brides-name">
            <p>Our Guestbook</p>
            <h2 id="coupleNames">${this.config.coupleNames}</h2>
            <p id="weddingDate">${this.config.weddingDate}</p>
          </div>
        </div>
        <div class="start-button" id="actionBtn">
          <p>UPLOAD MEDIA</p>
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

  /**
   * Initialize the component and attach event listeners
   */
  init() {
    if (!this.element) {
      throw new Error('Splash screen element not created. Call createElement() first.');
    }

    this.actionBtn = this.element.querySelector('#actionBtn');
    
    if (this.actionBtn) {
      this.actionBtn.addEventListener('click', this.handleStartClick.bind(this));
    }

    return this;
  }

  /**
   * Handle the start button click
   */
  handleStartClick() {
    if (this.isClicked) return; // Prevent multiple clicks
    this.isClicked = true;

    // Add fade-out effect
    this.element.classList.add('fade-out');
    
    // Call the onStart callback after a delay
    setTimeout(() => {
      this.onStart();
      this.hide();
    }, this.config.fadeOutDuration);

    // Reset click flag after animation
    setTimeout(() => (this.isClicked = false), this.config.fadeOutDuration + 1000);
  }

  /**
   * Show the splash screen
   */
  show() {
    if (this.element) {
      this.element.style.display = 'flex';
      this.element.classList.remove('fade-out', 'removed');
    }
    return this;
  }

  /**
   * Hide the splash screen
   */
  hide() {
    if (this.element) {
      this.element.style.display = 'none';
      this.element.classList.add('removed');
    }
    return this;
  }

  /**
   * Update couple names
   */
  updateCoupleNames(names) {
    const coupleNamesEl = this.element?.querySelector('#coupleNames');
    if (coupleNamesEl) {
      coupleNamesEl.textContent = names;
      this.config.coupleNames = names;
    }
    return this;
  }

  /**
   * Update wedding date
   */
  updateWeddingDate(date) {
    const weddingDateEl = this.element?.querySelector('#weddingDate');
    if (weddingDateEl) {
      weddingDateEl.textContent = date;
      this.config.weddingDate = date;
    }
    return this;
  }

  /**
   * Clean up event listeners and remove element
   */
  destroy() {
    if (this.actionBtn) {
      this.actionBtn.removeEventListener('click', this.handleStartClick.bind(this));
    }
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
    this.element = null;
    this.actionBtn = null;
  }
}