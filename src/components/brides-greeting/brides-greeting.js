/**
 * Brides Greeting Component
 * Handles the greeting message from the bride and groom with audio visualization and lyrics
 */

import './brides-greeting.scss';

export class BridesGreetingComponent {
    constructor(config = {}) {
        this.config = {
            greetings: config.greetings || ["/voice-note/voice4-effect.wav"],
            lyrics: config.lyrics || [
                { time: 0, text: "Hi guys!" },
                { time: 3, text: "Thank you sebab datang kenduri kitaorang" },
                { time: 6, text: "Appreciate sangat" },
                { time: 7, text: "And..." },
                { time: 10, text: "Hopefully you guys enjoy the weddings" },
                { time: 12, text: "And please leave some message for us" },
                { time: 14, text: "Okay?" },
                { time: 15, text: "Bye-Bye!" },
                { time: 16, text: "" }
            ],
            fadeOutDuration: config.fadeOutDuration || 1000,
            ...config
        };

        this.element = null;
        this.canvas = null;
        this.lyricsBox = null;
        this.audioElement = null;
        this.currentAudio = null;
        this.currentLine = -1;
        this.audioContext = null;
        this.analyser = null;
        this.visualizationController = null;
        this.canvasRetryCount = 0;
        this.maxCanvasRetries = 20;

        // Event callbacks
        this.onGreetingEnd = config.onGreetingEnd || (() => { });
    }

    /**
     * Create and return the component HTML element
     */
    createElement() {
        const template = `
      <section class="brides-greeting-section">
        <div class="flower-top">
          <img src="images/cover/flower-top.png" alt="Decorative flowers">
        </div>
        <div class="content-wrapper">
            <div class="waveform-container">
                <canvas id="visualizer" class="visualizer-canvas"></canvas>
            </div>
          <audio id="audioPlayback-greetings" controls style="display:none"></audio>
          <div class="vtt-container" id="lyricsBox"></div>
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
            throw new Error('Brides greeting element not created. Call createElement() first.');
        }

        this.canvas = this.element.querySelector('#visualizer');
        this.lyricsBox = this.element.querySelector('#lyricsBox');
        this.audioElement = this.element.querySelector('#audioPlayback-greetings');

        // Debug: Log element finding results
        console.log('BridesGreeting init:', {
            canvas: !!this.canvas,
            lyricsBox: !!this.lyricsBox,
            audioElement: !!this.audioElement
        });

        // Initialize canvas for visualization - delay to ensure proper mounting
        if (this.canvas) {
            // Use requestAnimationFrame to ensure the element is properly rendered
            requestAnimationFrame(() => {
                this.initializeCanvas();
            });
        }

        // Initialize lyrics box
        if (this.lyricsBox) {
            this.lyricsBox.textContent = "Ready to play greeting...";
            this.lyricsBox.style.display = "block"; // Ensure it's visible
            console.log('LyricsBox initialized with placeholder text');
        } else {
            console.error('LyricsBox element not found!');
        }

        return this;
    }

    /**
     * Initialize the audio visualization canvas
     */
    initializeCanvas() {
        if (!this.canvas) {
            console.warn('Canvas element not found');
            return;
        }

        // If section is hidden, wait until show() triggers reinitialization.
        if (!this.element || this.element.style.display === 'none' || this.element.classList.contains('hidden')) {
            return;
        }

        // Ensure canvas has dimensions
        const rect = this.canvas.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) {
            if (this.canvasRetryCount >= this.maxCanvasRetries) {
                console.warn('Canvas still has zero dimensions after retries, skipping for now.', rect);
                return;
            }

            this.canvasRetryCount += 1;
            // Retry after a short delay while visible
            setTimeout(() => this.initializeCanvas(), 100);
            return;
        }

        this.canvasRetryCount = 0;

        // Setup canvas with proper DPR handling
        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;

        const ctx = this.canvas.getContext("2d");
        ctx.scale(dpr, dpr);

        // Draw initial idle line
        this.drawIdleLine();

        console.log('Canvas initialized:', {
            width: this.canvas.width,
            height: this.canvas.height,
            cssWidth: rect.width,
            cssHeight: rect.height,
            dpr
        });
    }

    /**
     * Draw a static idle line on the canvas
     */
    drawIdleLine() {
        if (!this.canvas) return;

        const ctx = this.canvas.getContext("2d");
        const rect = this.canvas.getBoundingClientRect();

        // Clear canvas
        ctx.clearRect(0, 0, rect.width, rect.height);

        // Draw horizontal line
        ctx.strokeStyle = "white";
        ctx.lineWidth = 2;
        ctx.beginPath();

        const midY = rect.height / 2;
        ctx.moveTo(0, midY);
        ctx.lineTo(rect.width, midY);
        ctx.stroke();

        console.log('Idle line drawn at canvas dimensions:', {
            width: rect.width,
            height: rect.height,
            midY
        });
    }

    /**
     * Show the component
     */
    show() {
        if (this.element) {
            this.element.style.display = 'flex';
            this.element.classList.remove('fade-out', 'hidden');

            // Reinitialize canvas when showing the component
            setTimeout(() => {
                if (this.canvas) {
                    this.initializeCanvas();
                }
            }, 50); // Small delay to ensure CSS is applied
        }
        return this;
    }

    /**
     * Hide the component
     */
    hide() {
        if (this.element) {
            this.element.classList.add('fade-out');
            setTimeout(() => {
                this.element.style.display = 'none';
                this.element.classList.add('hidden');
            }, this.config.fadeOutDuration);
        }
        return this;
    }

    /**
     * Make lyrics box very visible for debugging
     */
    makeLyricsVisible() {
        if (!this.lyricsBox) {
            console.error('No lyricsBox found for visibility test');
            return;
        }
        
        // Apply very obvious styles for debugging
        Object.assign(this.lyricsBox.style, {
            backgroundColor: 'yellow',
            color: 'red',
            fontSize: '24px',
            fontWeight: 'bold',
            border: '5px solid blue',
            padding: '20px',
            margin: '20px',
            display: 'block',
            visibility: 'visible',
            position: 'relative',
            zIndex: '9999',
            textAlign: 'center',
            minHeight: '100px',
            width: 'auto'
        });
        
        this.lyricsBox.textContent = 'LYRICS BOX IS VISIBLE!';
        console.log('Applied high-visibility styles to lyricsBox');
    }

    /**
     * Play a random greeting audio with visualization
     */
    async playRandomGreeting() {
        // Test lyrics display first
        console.log('=== Starting audio playback ===');
        if (this.lyricsBox) {
            this.lyricsBox.textContent = "Starting audio...";
            console.log('Set initial text before playing audio');
        }

        const randomIndex = Math.floor(Math.random() * this.config.greetings.length);
        const url = this.config.greetings[randomIndex];

        this.currentAudio = new Audio(url);
        this.currentAudio.crossOrigin = 'anonymous';

        this.currentAudio.onerror = (e) => {
            console.error('Greeting failed to load', url, e);
        };

        // Setup audio visualization
        try {
            await this.setupAudioVisualization();
        } catch (err) {
            console.warn('Could not attach greeting to analyser', err);
        }

        // Reset lyric tracking
        this.currentLine = -1;
        if (this.lyricsBox) {
            this.lyricsBox.textContent = "🎵 Audio loading...";
            console.log('Lyrics reset, starting audio playback');
        }

        // Setup lyric timing
        this.currentAudio.addEventListener("timeupdate", () => {
            this.updateLyrics();
        });

        this.currentAudio.addEventListener("loadedmetadata", () => {
            console.log(`Audio loaded: ${url}, duration: ${this.currentAudio.duration}s`);
            console.log('Lyrics configuration:', this.config.lyrics);
        });

        this.currentAudio.addEventListener("play", () => {
            console.log('Audio started playing');
        });

        this.currentAudio.onended = () => {
            console.log('Audio ended');
            this.handleGreetingEnd();
        };

        // Play audio
        try {
            await this.currentAudio.play();
        } catch (err) {
            console.error('Greeting failed to play', err);
        }

        return this.currentAudio;
    }

    /**
     * Setup audio context and visualization
     */
    async setupAudioVisualization() {
        // Get or create audio context
        this.audioContext = this.getAudioContext();

        // Ensure audio context is resumed (required for iOS)
        if (this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
        }

        // Create audio source and analyser
        const source = this.audioContext.createMediaElementSource(this.currentAudio);
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 2048;

        // Connect audio graph
        source.connect(this.analyser);
        this.analyser.connect(this.audioContext.destination);

        // Start visualization
        this.startVisualization();
    }

    /**
     * Get or create audio context
     */
    getAudioContext() {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        return this.audioContext;
    }

    /**
     * Start waveform visualization
     */
    startVisualization() {
        if (!this.analyser || !this.canvas) return;

        this.stopVisualization(); // Stop any existing visualization

        const ctx = this.canvas.getContext("2d");
        const bufferLength = this.analyser.fftSize;
        const dataArray = new Uint8Array(bufferLength);

        const render = () => {
            this.visualizationController = requestAnimationFrame(render);

            this.analyser.getByteTimeDomainData(dataArray);

            const rect = this.canvas.getBoundingClientRect();

            // Clear canvas
            ctx.clearRect(0, 0, rect.width, rect.height);

            // Draw waveform
            ctx.lineWidth = 2;
            ctx.strokeStyle = "white";
            ctx.beginPath();

            const sliceWidth = rect.width / bufferLength;
            let x = 0;

            for (let i = 0; i < bufferLength; i++) {
                const v = dataArray[i] / 128.0;
                const y = v * rect.height / 2;

                if (i === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }

                x += sliceWidth;
            }

            ctx.lineTo(rect.width, rect.height / 2);
            ctx.stroke();
        };

        render();
    }

    /**
     * Stop visualization
     */
    stopVisualization() {
        if (this.visualizationController) {
            cancelAnimationFrame(this.visualizationController);
            this.visualizationController = null;
        }

        // Draw idle line
        this.drawIdleLine();
    }

    /**
     * Update lyrics display based on current audio time
     */
    updateLyrics(newLyrics = null) {
        // If an array is passed, treat this as a config update API call.
        if (Array.isArray(newLyrics)) {
            this.config.lyrics = newLyrics;
            this.currentLine = -1;
            return this;
        }

        if (!this.currentAudio || !this.lyricsBox) {
            console.warn('UpdateLyrics failed:', {
                hasAudio: !!this.currentAudio,
                hasLyricsBox: !!this.lyricsBox
            });
            return;
        }

        const currentTime = this.currentAudio.currentTime;

        for (let i = this.config.lyrics.length - 1; i >= 0; i--) {
            if (currentTime >= this.config.lyrics[i].time) {
                if (this.currentLine !== i) {
                    this.currentLine = i;
                    console.log(`Showing lyric ${i}: "${this.config.lyrics[i].text}" at time ${currentTime.toFixed(2)}s`);
                    this.showLyric(this.config.lyrics[i].text);
                }
                break;
            }
        }
    }

    /**
     * Display lyric text (simplified without fade for debugging)
     */
    showLyric(text) {
        if (!this.lyricsBox) {
            console.error('Cannot show lyric: lyricsBox not found');
            return;
        }

        console.log(`🎵 SHOWING LYRIC: "${text}"`);
        
        // Clear any existing classes and styles
        this.lyricsBox.classList.remove("fade-out");
        
        // Set the text directly
        this.lyricsBox.textContent = text;
        
        // Apply visible styles
        Object.assign(this.lyricsBox.style, {
            display: 'block',
            visibility: 'visible',
            opacity: '1',
            color: 'black',
            padding: '10px',
            borderRadius: '5px',
            textAlign: 'center',
            fontSize: '18px',
            minHeight: '30px'
        });
        
        console.log(`✅ Lyric displayed: "${text}" - Element text: "${this.lyricsBox.textContent}"`);
    }

    /**
     * Handle when greeting audio ends
     */
    handleGreetingEnd() {
        // Clear lyrics
        if (this.lyricsBox) {
            this.lyricsBox.textContent = "";
        }

        // Stop visualization
        this.stopVisualization();

        // Call callback
        this.onGreetingEnd();
    }

    /**
     * Stop any playing audio
     */
    stopAudio() {
        if (this.currentAudio && !this.currentAudio.paused) {
            this.currentAudio.pause();
            this.currentAudio.currentTime = 0;
        }
        this.stopVisualization();
    }

    /**
     * Update greetings array
     */
    updateGreetings(greetings) {
        this.config.greetings = greetings;
        return this;
    }

    /**
     * Update lyrics array
     */
    setLyrics(lyrics) {
        return this.updateLyrics(lyrics);
    }

    /**
     * Manually reinitialize canvas (useful for debugging)
     */
    reinitializeCanvas() {
        console.log('Manual canvas reinitialization requested');
        if (this.canvas) {
            this.initializeCanvas();
        } else {
            console.error('Canvas element not found for reinitialization');
        }
        return this;
    }

    /**
     * Test lyrics display without fade effect (for debugging)
     */
    testLyrics() {
        if (!this.lyricsBox) {
            console.error('LyricsBox not found for testing');
            return;
        }
        
        console.log('Testing lyrics display...');
        this.lyricsBox.textContent = "TEST: Lyrics are working!";
        this.lyricsBox.style.display = "block";
        this.lyricsBox.style.visibility = "visible";
        this.lyricsBox.style.opacity = "1";
        this.lyricsBox.style.background = "red"; // Make it very visible
        
        console.log('Test lyric set, element should be visible now');
        return this;
    }

    /**
     * Clean up component
     */
    destroy() {
        this.stopAudio();
        this.stopVisualization();

        if (this.audioContext) {
            try {
                this.audioContext.close();
            } catch (e) {
                // Ignore errors
            }
        }

        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }

        this.element = null;
        this.canvas = null;
        this.lyricsBox = null;
        this.audioElement = null;
        this.currentAudio = null;
    }
}