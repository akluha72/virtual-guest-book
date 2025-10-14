import './style.css'
import './styles/mainpage.scss'
import './styles/splashscreen.scss'

/* ---------------- globals ---------------- */
let mediaRecorder;
let audioChunks = [];
let recordedBlob = null;
let animationId;

// Selected mime type for MediaRecorder (decided at runtime based on support)
let selectedAudioMimeType = null;

let audioCtx = null;
let analyser = null;            // generic analyser (when needed)
let playbackSourceNode = null;  // cached MediaElementSource for guest playback
let playbackAnalyser = null;    // analyser used for playback waveform

let cameraStream = null;
let capturedPhotoBlob = null;

// const actionBtn = document.getElementById("actionBtn");
const restartBtn = document.getElementById("restartBtn");
const submitNameBtn = document.getElementById("submitNameBtn");
const submitSelfieBtn = document.getElementById("submitSelfieBtn");
const takePhotoBtn = document.getElementById("takePhotoBtn");
const retakePhotoBtn = document.getElementById("retakePhotoBtn");
const recordBtn = document.getElementById("recordBtn");
const backBtn = document.getElementById("backBtn");
const submitBtn = document.getElementById("submitBtn");
const restartRecordingBtn = document.getElementById("restartRecordingBtn");
const saveRecordingBtn = document.getElementById("saveRecordingBtn");
const postControls = document.getElementById("postControls");

const splashScreenSection = document.querySelector(".splash-screen");
const bridesGreetingSection = document.querySelector(".brides-greeting-section");
const selfieSection = document.querySelector(".selfie-section");
const nameSection = document.querySelector(".name-section");
const guestWishesSection = document.querySelector(".guest-wishes-section");

// NOTE: two separate audio elements in the DOM
const audioPlaybackGuest = document.getElementById("audioPlayback"); // for recorded messages (guest)
const audioPlaybackGreetings = document.getElementById("audioPlayback-greetings"); // (if used)

// Ensure inline playback on iOS
if (audioPlaybackGuest) {
  try { audioPlaybackGuest.setAttribute('playsinline', ''); } catch (_) { }
}
if (audioPlaybackGreetings) {
  try { audioPlaybackGreetings.setAttribute('playsinline', ''); } catch (_) { }
}

const canvas = document.getElementById("visualizer");
const canvas2 = document.getElementById("visualizer2");

// New voice recorder elements
const recordingIndicator = document.getElementById("recordingIndicator");
const recordingTimer = document.getElementById("recordingTimer");

// Wait for DOM to be ready before drawing idle waveform
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    drawIdleWaveform(canvas2);
  });
} else {
  drawIdleWaveform(canvas2);
}


// Inline save elements
const camera = document.getElementById("camera");
const photoCanvas = document.getElementById("photoCanvas");
const photoPreview = document.getElementById("photoPreview");
const guestName = document.getElementById("guestName");
const nameActions = document.getElementById("nameActions");

// Final preview overlay elements
const finalPreviewOverlay = document.getElementById('finalPreviewOverlay');
const finalPreviewPhoto = document.getElementById('finalPreviewPhoto');
const finalPreviewName = document.getElementById('finalPreviewName');
const finalPreviewDate = document.getElementById('finalPreviewDate');
const finalPreviewCanvas = document.getElementById('finalPreviewCanvas');
const finalPreviewAudio = document.getElementById('finalPreviewAudio');
const retakePhotoText = document.getElementById('retakePhotoText');
const finalPreviewPlayBtn = document.getElementById('finalPreviewPlayBtn');
const editEntryBtn = document.getElementById('editEntryBtn');
const submitFinalBtn = document.getElementById('submitFinalBtn');

let uiState = 'idle'; // idle | playing_greeting | recording | ready | previewing
let currentState = "idle"; // idle | recording | stopped (local recorder state)
let currentRecording = null; // { stream, sourceNode, analyser, vizController }
let recordingStartTime = null;
let recordingTimerInterval = null;
let isPaused = false;

/* Map of canvas -> viz controller so we can stop specific ones */
const visualizers = new Map();

/* ---------------- timer functions ---------------- */
function startRecordingTimer() {
  recordingStartTime = Date.now();
  recordingTimerInterval = setInterval(updateTimer, 100);
}

function updateTimer() {
  if (!recordingStartTime) return;
  
  const elapsed = Date.now() - recordingStartTime;
  const seconds = Math.floor(elapsed / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  const displaySeconds = (seconds % 60).toString().padStart(2, '0');
  const displayMinutes = (minutes % 60).toString().padStart(2, '0');
  const displayHours = hours.toString().padStart(2, '0');
  
  if (recordingTimer) {
    recordingTimer.textContent = `${displayHours}:${displayMinutes}:${displaySeconds}`;
  }
}

function stopRecordingTimer() {
  if (recordingTimerInterval) {
    clearInterval(recordingTimerInterval);
    recordingTimerInterval = null;
  }
  recordingStartTime = null;
  if (recordingTimer) {
    recordingTimer.textContent = "00:00:00";
  }
}

function startPreviewTimer() {
  recordingStartTime = Date.now();
  recordingTimerInterval = setInterval(updateTimer, 100);
}

function updateRecordingUI(state) {
  if (state === "recording") {
    // Show recording state
    if (recordingIndicator) {
      recordingIndicator.classList.add("recording");
    }
    if (recordingIndicator && recordingIndicator.parentElement) {
      recordingIndicator.parentElement.classList.add("recording");
    }
    if (recordBtn) {
      recordBtn.textContent = "⏹ Stop Recording";
      recordBtn.classList.remove("idle", "preview", "playing");
      recordBtn.classList.add("recording");
    }
  } else if (state === "idle") {
    // Show idle state
    if (recordingIndicator) {
      recordingIndicator.classList.remove("recording");
    }
    if (recordingIndicator && recordingIndicator.parentElement) {
      recordingIndicator.parentElement.classList.remove("recording");
    }
    if (recordBtn) {
      recordBtn.textContent = "🎤 Start Recording";
      recordBtn.classList.remove("recording", "preview", "playing");
      recordBtn.classList.add("idle");
    }
  } else if (state === "stopped") {
    // Show stopped state (ready to preview)
    if (recordingIndicator) {
      recordingIndicator.classList.remove("recording");
    }
    if (recordingIndicator && recordingIndicator.parentElement) {
      recordingIndicator.parentElement.classList.remove("recording");
    }
    if (recordBtn) {
      recordBtn.textContent = "▶️ Preview Recording";
      recordBtn.classList.remove("recording", "idle", "playing");
      recordBtn.classList.add("preview");
    }
  } else if (state === "previewing" || state === "playing") {
    // Show preview state
    if (recordingIndicator && recordingIndicator.parentElement) {
      recordingIndicator.parentElement.classList.add("recording"); // Show pulsing during preview
    }
    if (recordBtn) {
      recordBtn.textContent = "⏸️ Stop Preview";
      recordBtn.classList.remove("recording", "idle", "preview");
      recordBtn.classList.add("playing");
    }
  }
}


// Initialize audio context on first user interaction
document.addEventListener('touchstart', initializeAudioContext, { once: true });
document.addEventListener('click', initializeAudioContext, { once: true });

// v3 flow
/*
  STEP 1: Play greeting audio and guest record wish audio
*/

window.addEventListener('load', () => {
  // Ensure idle waveform is drawn when page loads
  drawIdleWaveform(canvas2);
  
  let isClicked = false;
  actionBtn.addEventListener('click', () => {
    if (isClicked) return; // ignore further clicks
    isClicked = true;
    setTimeout(() => {
      const audio = playRandomGreeting();
      splashScreenSection.classList.add('fade-out');
      // Wait for the fade animation to finish before hiding it
      setTimeout(() => {
        bridesGreetingSection.style.display = 'flex';
        splashScreenSection.style.display = 'none';
        // const audio = playRandomGreeting();
        audio.onended = () => {
          bridesGreetingSection.style.display = 'none';
          guestWishesSection.style.display = 'flex';
        };
      }, 3000); // match the transition duration in CSS
    }, 2000);
    setTimeout(() => (isClicked = false), 3000);
  });


  // Save recording functionality
  saveRecordingBtn && saveRecordingBtn.addEventListener('click', async () => {
    if (!recordedBlob) {
      alert('No recording to save!');
      return;
    }

    try {
      const audioUrl = URL.createObjectURL(recordedBlob);
      finalPreviewAudio.src = audioUrl;
    } catch (_) { }

    // Wire overlay play with visualizer
    ; (function wireOverlayPlayback() {
      let overlayCtx = null;
      let overlayAnalyser = null;
      let rafId = null;
      let isPlaying = false;
      function draw() {
        rafId = requestAnimationFrame(draw);
        if (!overlayAnalyser) return;
        const bufferLength = overlayAnalyser.fftSize;
        const dataArray = new Uint8Array(bufferLength);
        overlayAnalyser.getByteTimeDomainData(dataArray);
        const ctx2d = finalPreviewCanvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;
        const rect = finalPreviewCanvas.getBoundingClientRect();
        finalPreviewCanvas.width = rect.width * dpr;
        finalPreviewCanvas.height = rect.height * dpr;
        ctx2d.setTransform(dpr, 0, 0, dpr, 0, 0);
        // Clear canvas (transparent background)
        ctx2d.clearRect(0, 0, rect.width, rect.height);
        ctx2d.lineWidth = 2;
        ctx2d.strokeStyle = '#FFD700';
        ctx2d.beginPath();
        const sliceWidth = rect.width / bufferLength;
        let x = 0;
        for (let i = 0; i < bufferLength; i++) {
          const v = dataArray[i] / 128.0;
          const y = (v * rect.height) / 2;
          if (i === 0) ctx2d.moveTo(x, y); else ctx2d.lineTo(x, y);
          x += sliceWidth;
        }
        ctx2d.lineTo(rect.width, rect.height / 2);
        ctx2d.stroke();
      }
      function ensureAnalyser() {
        if (overlayCtx) return;
        try {
          overlayCtx = new (window.AudioContext || window.webkitAudioContext)();
          const src = overlayCtx.createMediaElementSource(finalPreviewAudio);
          overlayAnalyser = overlayCtx.createAnalyser();
          overlayAnalyser.fftSize = 2048;
          src.connect(overlayAnalyser);
          overlayAnalyser.connect(overlayCtx.destination);
          draw();
        } catch (e) { /* ignore */ }
      }
      if (finalPreviewPlayBtn && !finalPreviewPlayBtn.__wired) {
        finalPreviewPlayBtn.__wired = true;
        finalPreviewPlayBtn.onclick = () => {
          if (isPlaying) {
            finalPreviewAudio.pause();
            finalPreviewPlayBtn.textContent = '▶️ Play';
            finalPreviewPlayBtn.classList.remove('playing');
            isPlaying = false;
            if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
          } else {
            finalPreviewAudio.play().then(() => {
              ensureAnalyser();
              finalPreviewPlayBtn.textContent = '⏸️ Pause';
              finalPreviewPlayBtn.classList.add('playing');
              isPlaying = true;
            }).catch(() => { });
          }
        };
        finalPreviewAudio.onended = () => {
          finalPreviewPlayBtn.textContent = '▶️ Play';
          finalPreviewPlayBtn.classList.remove('playing');
          isPlaying = false;
          if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
        };
      }
    })();

    // Display the camera section
    bridesGreetingSection.style.display = 'none';
    guestWishesSection.style.display = 'none';
    selfieSection.style.display = "flex";
    if (selfieSection) {
      startCamera();
    }
  });

  /*
    STEP 2: Take selfie and enter guest name.
  */

  takePhotoBtn && takePhotoBtn.addEventListener('click', () => {
    if (!camera) return;
    const video = camera;
    const vw = video.videoWidth || 640;
    const vh = video.videoHeight || 480;

    // Trigger flash effect
    const flashOverlay = document.getElementById('flashOverlay');
    if (flashOverlay) {
      flashOverlay.classList.add('flash');
      setTimeout(() => {
        flashOverlay.classList.remove('flash');
      }, 150);
    }

    photoCanvas.width = vw;
    photoCanvas.height = vh;
    const pctx = photoCanvas.getContext('2d');
    pctx.save();
    pctx.scale(-1, 1);
    pctx.drawImage(video, -vw, 0, vw, vh);
    pctx.restore();
    pctx.drawImage(video, 0, 0, vw, vh, 0, 0, vw, vh);
    photoCanvas.toBlob((blob) => {
      if (blob) {
        capturedPhotoBlob = blob;
        const url = URL.createObjectURL(blob);
        if (finalPreviewPhoto) {
          finalPreviewPhoto.src = url;
          // finalPreviewPhoto.style.display = 'block';
        }
        if (photoCanvas) photoCanvas.style.display = 'none';
        if (camera) camera.style.display = 'none';
        if (retakePhotoBtn) retakePhotoBtn.disabled = false;
        if (takePhotoBtn) takePhotoBtn.disabled = true;
        stopCamera();
      }
    }, 'image/png');


    /* STEP 3: Flashing effect and polaroid appear with image taken. */
    if (finalPreviewOverlay) {
      // Add fade-out transition
      selfieSection.style.transition = 'opacity 0.5s ease-out';
      selfieSection.style.opacity = '0';
      
      setTimeout(() => {
        selfieSection.style.display = "none";
        finalPreviewOverlay.style.display = 'flex';
        finalPreviewOverlay.style.opacity = '0';
        finalPreviewOverlay.style.transition = 'opacity 0.5s ease-in';
        setTimeout(() => {
          finalPreviewOverlay.style.opacity = '1';
        }, 50);
      }, 500);
      // Populate overlay preview (mirror preview.php look & data)
      try {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        finalPreviewDate.textContent = `${yyyy}-${mm}-${dd}`;
      } catch (_) { }
      try {
        if (capturedPhotoBlob) {
          const url = URL.createObjectURL(capturedPhotoBlob);
          finalPreviewPhoto.src = url;
        } else if (photoPreview && photoPreview.src) {
          finalPreviewPhoto.src = photoPreview.src;
        } else {
          finalPreviewPhoto.src = '/vite.svg';
        }
      } catch (_) { }

      /* STEP 4: User entering name and submit? */
      const displayName = document.getElementById("displayName");
      const hiddenInput = document.getElementById("hiddenNameInput");

      function focusInput() {
        hiddenInput.focus();
      }

      // When user clicks or taps the name area
      displayName.addEventListener("click", focusInput);

      // Auto focus when page loads (optional)
      window.addEventListener("load", () => {
        hiddenInput.focus();
      });

      // Typing logic
      hiddenInput.addEventListener("input", () => {
        const text = hiddenInput.value.trim();
        displayName.childNodes[0].textContent = text || "Your Name";
      });

      // Handle Enter key (optional — to blur input)
      hiddenInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          hiddenInput.blur();
        }
      });

      submitNameBtn && submitNameBtn.addEventListener('click', async () => {
        nameSection.style.display = 'none';
        guestWishesSection.style.display = 'flex';
        // we don't call drawWaveform here — visualizers are tied to actual analysers
      });
    }
  });
});

backBtn && backBtn.addEventListener('click', () => {
  stopCamera();
});

recordBtn && recordBtn.addEventListener("click", () => {
  if (currentState === "idle") {
    startRecording();
  } else if (currentState === "recording") {
    stopRecording();
  } else if (currentState === "stopped") {
    previewRecording();
  } else if (currentState === "previewing" || currentState === "playing") {
    // Stop preview and return to stopped state
    if (audioPlaybackGuest && !audioPlaybackGuest.paused) {
      audioPlaybackGuest.pause();
    }
    stopVisualizer(canvas2);
    stopRecordingTimer();
    currentState = "stopped";
    updateRecordingUI("stopped");
  }
});


submitBtn && submitBtn.addEventListener('click', async () => {
  if (!recordedBlob) return;
  console.log("submit");

  const form = new FormData();
  form.append('guest_name', (guestName && guestName.value) || '');
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  form.append('event_date', `${yyyy}-${mm}-${dd}`);

  const audioExt = (recordedBlob.type && recordedBlob.type.includes('mp4')) ? 'mp4' : 'webm';
  form.append('audio', recordedBlob, `message.${audioExt}`);

  if (capturedPhotoBlob) {
    form.append('photo', capturedPhotoBlob, 'selfie.png');
  }

  try {
    const res = await fetch('/save_entry.php', {
      method: 'POST',
      body: form
    });
    const data = await res.json().catch(() => ({ status: 'error', message: 'Invalid server response' }));
    if (data.status === 'success') {
      try { stopCamera(); } catch (_) { }
      try { if (mediaRecorder && mediaRecorder.state === 'recording') mediaRecorder.stop(); } catch (_) { }
      const html = '<div style="display:flex;align-items:center;justify-content:center;min-height:100vh;text-align:center;background:#000000;color:white;font-family:system-ui,-apple-system,sans-serif;">\
        <div style="background:rgba(255,255,255,0.05);padding:4rem 3rem;border-radius:16px;backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,0.1);box-shadow:0 20px 40px rgba(0,0,0,0.5);max-width:500px;width:90%;">\
          <h1 style="font-family:\'Sacramento\',cursive;font-size:3rem;margin:0 0 1.5rem;font-weight:400;letter-spacing:1px;">Thank You</h1>\
          <p style="font-size:1.1rem;margin:0 0 2rem;opacity:0.8;line-height:1.6;font-weight:300;">Your message has been successfully saved to our guestbook.</p>\
          <div style="width:60px;height:2px;background:linear-gradient(90deg, #007AFF, #5856D6);margin:0 auto;border-radius:1px;"></div>\
        </div>\
      </div>';
      document.body.innerHTML = html;
      return;
    } else {
      alert('Failed to save. Please try again.');
    }
  } catch (e) {
    console.error('Save error', e);
    alert('Save error. Please check your connection.');
  }
});

restartBtn && restartBtn.addEventListener('click', () => {
  console.log("restart button works");
  location.reload();
});

// Restart recording functionality
restartRecordingBtn && restartRecordingBtn.addEventListener('click', () => {
  // Reset state
  currentState = "idle";
  stopRecordingTimer();
  updateRecordingUI("idle");

  // Hide post controls
  if (postControls) {
    postControls.style.display = "none";
  }

  // Clear previous recording
  recordedBlob = null;
  audioChunks = [];

  // Clear audio playback
  if (audioPlaybackGuest) {
    audioPlaybackGuest.src = "";
  }

  // Stop any existing visualizer
  stopVisualizer(canvas2);

  // Start new recording
  startRecording();
});

// Edit button closes overlay to make changes
editEntryBtn && editEntryBtn.addEventListener('click', () => {
  if (finalPreviewOverlay) finalPreviewOverlay.style.display = 'none';
});

// Retake photo functionality
retakePhotoText && retakePhotoText.addEventListener('click', () => {
  if (finalPreviewOverlay) {
    finalPreviewOverlay.style.display = 'none';
  }
  
  // Reset photo capture state
  if (photoCanvas) photoCanvas.style.display = 'none';
  if (camera) camera.style.display = 'block'; // Make sure camera is visible
  if (takePhotoBtn) takePhotoBtn.disabled = false;
  if (retakePhotoBtn) retakePhotoBtn.disabled = true;
  
  // Clear captured photo
  capturedPhotoBlob = null;
  
  // Show camera section again
  if (selfieSection) {
    selfieSection.style.display = 'flex';
    selfieSection.style.opacity = '1';
    selfieSection.style.transition = 'opacity 0.5s ease-in';
  }
  
  // Restart camera
  startCamera();
});

// Final submit inside overlay
submitFinalBtn && submitFinalBtn.addEventListener('click', async () => {
  if (!recordedBlob) return;
  try {
    const form = new FormData();
    form.append('guest_name', (guestName && guestName.value) || '');
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    form.append('event_date', `${yyyy}-${mm}-${dd}`);
    const audioExt = (recordedBlob.type && recordedBlob.type.includes('mp4')) ? 'mp4' : 'webm';
    form.append('audio', recordedBlob, `message.${audioExt}`);
    if (capturedPhotoBlob) { form.append('photo', capturedPhotoBlob, 'selfie.png'); }
    const res = await fetch('/save_entry.php', { method: 'POST', body: form });
    const data = await res.json().catch(() => ({ status: 'error', message: 'Invalid server response' }));
    if (data.status === 'success') {
      if (finalPreviewOverlay) finalPreviewOverlay.style.display = 'none';
      const html = '<div style="display:flex;align-items:center;justify-content:center;min-height:100vh;text-align:center;background:#000000;color:white;font-family:system-ui,-apple-system,sans-serif;">\
        <div style="background:rgba(255,255,255,0.05);padding:4rem 3rem;border-radius:16px;backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,0.1);box-shadow:0 20px 40px rgba(0,0,0,0.5);max-width:500px;width:90%;">\
          <h1 style="font-family:\'Sacramento\',cursive;font-size:3rem;margin:0 0 1.5rem;font-weight:400;letter-spacing:1px;">Thank You</h1>\
          <p style="font-size:1.1rem;margin:0 0 2rem;opacity:0.8;line-height:1.6;font-weight:300;">Your message has been successfully saved to our guestbook.</p>\
          <div style="width:60px;height:2px;background:linear-gradient(90deg, #007AFF, #5856D6);margin:0 auto;border-radius:1px;"></div>\
        </div>\
      </div>';
      document.body.innerHTML = html;
    } else {
      alert('Failed to save. Please try again.');
    }
  } catch (e) {
    console.error('Save error', e);
    alert('Save error. Please check your connection.');
  }
});

/* ---------------- guest audio element playback handlers (optional) -------------
   We manage playback visualizer via previewRecording(), so no global 'play' listener is necessary.
   If you want playback via normal controls to also show waveform, you could wire it here.
----------------------------------------------------------------------------*/


/* ---------------- cleanup on page unload ---------------- */
window.addEventListener('beforeunload', () => {
  try {
    if (audioCtx && audioCtx.state !== 'closed') audioCtx.close();
  } catch (e) { }
});


/* ensure canvases have reasonable pixel size (DPR handling) */
function fitCanvasToDisplaySize(canvas) {
  if (!canvas) return;
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  const width = Math.max(1, Math.round(rect.width * dpr));
  const height = Math.max(1, Math.round(rect.height * dpr));
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    // scale so drawing uses CSS pixels coordinates
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
}

/* ---------------- audio context helper ---------------- */
function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioCtx;
}

/* ---------------- waveform drawing ----------------
   drawWaveform returns a controller { stop() } which cancels RAF
*/
function drawWaveform(analyserNode, targetCanvas) {
  if (!analyserNode || !targetCanvas) return null;

  // stop existing visualizer for this canvas
  const existing = visualizers.get(targetCanvas);
  if (existing && typeof existing.stop === 'function') existing.stop();

  fitCanvasToDisplaySize(targetCanvas);

  const ctx = targetCanvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  const width = targetCanvas.width / dpr;   // CSS pixel width
  const height = targetCanvas.height / dpr; // CSS pixel height

  // Use frequencyBinCount (half of fftSize) for sensible sample count, but
  // time domain expects a Uint8Array sized to fftSize, so use analyser.fftSize
  const bufferLength = analyserNode.fftSize;
  const dataArray = new Uint8Array(bufferLength);

  let rafId = null;

  function render() {
    rafId = requestAnimationFrame(render);

    analyserNode.getByteTimeDomainData(dataArray);

    // Clear canvas (transparent background)
    ctx.clearRect(0, 0, width, height);

    ctx.lineWidth = 2;
    ctx.strokeStyle = "gold";
    ctx.beginPath();

    const sliceWidth = width / bufferLength;
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
      const v = dataArray[i] / 128.0; // normalize 0..2
      const y = v * height / 2;      // scale to canvas
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
      x += sliceWidth;
    }
    ctx.lineTo(width, height / 2);
    ctx.stroke();
  }

  render();

  const controller = {
    stop() {
      if (rafId) cancelAnimationFrame(rafId);
      // clear canvas area (CSS pixel coords)
      ctx.clearRect(0, 0, width, height);
      visualizers.delete(targetCanvas);
    }
  };

  visualizers.set(targetCanvas, controller);
  return controller;
}


function drawIdleWaveform(targetCanvas) {
  if (!targetCanvas) {
    console.log("canvas missing");
    return;
  }

  console.log("draw idle waveform for canvas:", targetCanvas.id);
  const ctx = targetCanvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  const width = targetCanvas.clientWidth * dpr;
  const height = targetCanvas.clientHeight * dpr;

  console.log("Canvas dimensions:", { width, height, clientWidth: targetCanvas.clientWidth, clientHeight: targetCanvas.clientHeight });

  // Resize canvas for sharp rendering
  targetCanvas.width = width;
  targetCanvas.height = height;
  ctx.scale(dpr, dpr);

  // Clear canvas (transparent background)
  ctx.clearRect(0, 0, targetCanvas.clientWidth, targetCanvas.clientHeight);

  // Create a straight yellow line in the center
  ctx.lineWidth = 2;
  ctx.strokeStyle = "gold";
  ctx.beginPath();

  const midY = targetCanvas.clientHeight / 2;

  // Draw straight line from left to right
  ctx.moveTo(0, midY);
  ctx.lineTo(targetCanvas.clientWidth, midY);

  ctx.stroke();
  console.log("Idle line drawn at y:", midY);
}

/* Stops visualizer for a specific canvas (or both if no arg) */
function stopVisualizer(target) {
  if (target) {
    const v = visualizers.get(target);
    if (v && typeof v.stop === 'function') v.stop();
    // Restore idle line for visualizer2 when stopping
    if (target === canvas2) {
      drawIdleWaveform(canvas2);
    }
    return;
  }
  // stop both if present
  if (visualizers.size === 0) return;
  for (const [c, controller] of visualizers.entries()) {
    try { controller.stop(); } catch (e) { /* ignore */ }
  }
}


/* ---------------- greetings (random) ---------------- */
const greetings = [
  "/voice-note/voice4-effect.wav",
];

const lyrics = [
  { time: 0, text: "Hi guyss!" },
  { time: 3, text: "Thankyou sebab datang kenduri kitaorang" },
  { time: 6, text: "Appreciate sangat" },
  { time: 7, text: "And..." },
  { time: 10, text: "Hopefully you guys enjoy the weddings" },
  { time: 12, text: "And please leave some message for us" },
  { time: 14, text: "Okay?" },
  { time: 15, text: "Bye-Bye!" },
  { time: 16, text: "" }
];

let currentLine = -1;
function showLyric(text) {
  const box = document.getElementById("lyricsBox");
  if (!box) return;
  box.classList.add("fade-out");
  setTimeout(() => {
    box.textContent = text;
    box.classList.remove("fade-out");
  }, 400);
}

function playRandomGreeting() {
  const randomIndex = Math.floor(Math.random() * greetings.length);
  const url = greetings[randomIndex];
  const audio = new Audio(url);
  audio.crossOrigin = 'anonymous';

  audio.onerror = (e) => {
    console.error('Greeting failed to load', url, e);
  };

  // attach greeting audio to an analyser and visualizer on the greeting canvas
  try {
    const ctx = getAudioContext();
    const source = ctx.createMediaElementSource(audio);
    const greetAnalyser = ctx.createAnalyser();
    greetAnalyser.fftSize = 2048;

    // connect source -> analyser -> destination (so user hears it)
    source.connect(greetAnalyser);
    greetAnalyser.connect(ctx.destination);

    // draw on greeting canvas
    drawWaveform(greetAnalyser, canvas);
  } catch (err) {
    console.warn('Could not attach greeting to analyser', err);
  }

  // reset lyric tracking
  currentLine = -1;
  const box = document.getElementById("lyricsBox");
  if (box) box.textContent = "";

  audio.addEventListener("timeupdate", () => {
    const current = audio.currentTime;
    for (let i = lyrics.length - 1; i >= 0; i--) {
      if (current >= lyrics[i].time) {
        if (currentLine !== i) {
          currentLine = i;
          showLyric(lyrics[i].text);
        }
        break;
      }
    }
  });

  audio.onended = () => {
    const box = document.getElementById("lyricsBox");
    if (box) box.textContent = "";
    // stop greeting visualizer
    stopVisualizer(canvas);
  };

  audio.play().catch(err => {
    console.error('Greeting failed to play', err);
  });

  return audio;
}

/* ---------------- recording lifecycle ---------------- */
async function startRecording() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const ctx = getAudioContext();

    // create analyser and source node for visualiser (do NOT connect to destination to avoid echo)
    const sourceNode = ctx.createMediaStreamSource(stream);
    const micAnalyser = ctx.createAnalyser();
    micAnalyser.fftSize = 2048;

    // connect only source -> analyser (no destination)
    sourceNode.connect(micAnalyser);

    // draw waveform on the guest canvas during recording
    const vizController = drawWaveform(micAnalyser, canvas2);

    // store for cleanup
    currentRecording = { stream, sourceNode, analyser: micAnalyser, vizController };

    // Decide best supported audio mime type (iOS Safari prefers AAC in MP4)
    if (!selectedAudioMimeType) {
      const candidates = [
        'audio/mp4;codecs=mp4a.40.2', // AAC in MP4 container
        'audio/mp4',                   // generic MP4
        'audio/webm;codecs=opus',     // Opus in WebM
        'audio/webm'                   // generic WebM
      ];
      selectedAudioMimeType = candidates.find(t => {
        try { return window.MediaRecorder && MediaRecorder.isTypeSupported(t); } catch (_) { return false; }
      }) || '';
    }

    // setup MediaRecorder with preferred type if available
    try {
      mediaRecorder = selectedAudioMimeType
        ? new MediaRecorder(stream, { mimeType: selectedAudioMimeType })
        : new MediaRecorder(stream);
    } catch (err) {
      // Fallback without mimeType
      mediaRecorder = new MediaRecorder(stream);
    }
    audioChunks = [];

    mediaRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) audioChunks.push(e.data);
    };

    mediaRecorder.onstop = () => {
      // Use the recorder's mimeType if available, else fall back to selection or webm
      const blobType = (mediaRecorder && mediaRecorder.mimeType) || selectedAudioMimeType || 'audio/webm';
      recordedBlob = new Blob(audioChunks, { type: blobType });
      const audioUrl = URL.createObjectURL(recordedBlob);

      // put recorded audio into guest playback element
      if (audioPlaybackGuest) {
        audioPlaybackGuest.src = audioUrl;
        try { audioPlaybackGuest.load(); } catch (_) { }
      }
    };

    mediaRecorder.start();

    currentState = "recording";
    startRecordingTimer();
    updateRecordingUI("recording");
  } catch (err) {
    console.error("Mic error:", err);
  }
}

function stopRecording() {
  // stop MediaRecorder (this triggers onstop)
  if (mediaRecorder && mediaRecorder.state !== "inactive") {
    mediaRecorder.stop();
  }

  // cleanup audio nodes and tracks
  if (currentRecording) {
    try { currentRecording.sourceNode.disconnect(); } catch (e) { }
    try { currentRecording.analyser.disconnect(); } catch (e) { }
    try {
      currentRecording.stream.getTracks().forEach(t => t.stop());
    } catch (e) { }
    if (currentRecording.vizController && typeof currentRecording.vizController.stop === 'function') {
      currentRecording.vizController.stop();
    }
    currentRecording = null;
  }

  // set state to stopped (ready to preview)
  currentState = "stopped";
  stopRecordingTimer();
  updateRecordingUI("stopped");

  // show restart and save buttons
  if (postControls) {
    postControls.style.display = "flex";
  }
}

/* preview the last recorded audio with waveform */
function previewRecording() {
  if (!audioPlaybackGuest || !audioPlaybackGuest.src) {
    // nothing recorded; reset
    currentState = "idle";
    recordBtn.textContent = "🎤 Start";
    recordBtn.classList.remove("preview");
    recordBtn.classList.add("idle");
    return;
  }
  // iOS Safari requires user interaction to start audio context
  const ctx = getAudioContext();

  // Ensure audio context is running on iOS
  if (ctx.state === 'suspended') {
    ctx.resume().then(() => {
      setupAudioPlayback();
    }).catch(err => {
      console.warn('Could not resume audio context:', err);
      // Fallback: play without visualizer
      audioPlaybackGuest.play().catch(playErr => {
        console.error('Audio play failed:', playErr);
      });
    });
  } else {
    setupAudioPlayback();
  }

  function setupAudioPlayback() {
    // create MediaElementSource only once for this guest playback element
    if (!playbackSourceNode) {
      try {
        playbackSourceNode = ctx.createMediaElementSource(audioPlaybackGuest);
      } catch (e) {
        console.warn("Could not create MediaElementSource for guest playback", e);
        // fallback: just play the audio without waveform
        audioPlaybackGuest.play().catch(playErr => {
          console.error('Audio play failed:', playErr);
        });
        return;
      }
    }

    // disconnect previous analyser if present
    try {
      if (playbackAnalyser) {
        playbackSourceNode.disconnect(playbackAnalyser);
        playbackAnalyser.disconnect(ctx.destination);
        // also stop any visualizer tied to canvas2
        stopVisualizer(canvas2);
      }
    } catch (e) { /* ignore */ }

    // create a fresh analyser for playback
    playbackAnalyser = ctx.createAnalyser();
    playbackAnalyser.fftSize = 2048;
    try {
      playbackSourceNode.connect(playbackAnalyser);
      playbackAnalyser.connect(ctx.destination);
    } catch (e) {
      console.warn('Playback graph connection issue', e);
    }

    // draw waveform while previewing on guest canvas (canvas2)
    const viz = drawWaveform(playbackAnalyser, canvas2);

    // play with iOS compatibility
    const playPromise = audioPlaybackGuest.play();

    if (playPromise !== undefined) {
      playPromise.then(() => {
        // Audio started successfully
        currentState = "previewing";
        updateRecordingUI("previewing");
        
        // Start timer for preview
        startPreviewTimer();
      }).catch(err => {
        console.error('Playback failed', err);
        // stop visualizer if play fails
        if (viz && typeof viz.stop === 'function') viz.stop();
        // Reset button state
        currentState = "stopped";
        updateRecordingUI("stopped");
      });
    }

    // when finished, stop visualizer and show preview again
    audioPlaybackGuest.onended = () => {
      if (viz && typeof viz.stop === 'function') viz.stop();
      stopRecordingTimer();
      currentState = "stopped";
      updateRecordingUI("stopped");
    };
  }
}

/* ---------------- camera / selfie helpers ---------------- */
async function startCamera() {
  try {
    // Stop any existing stream first
    if (cameraStream) {
      cameraStream.getTracks().forEach(t => t.stop());
    }
    
    cameraStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    if (camera) {
      camera.srcObject = cameraStream;
      camera.style.display = 'block'; // Ensure camera is visible
    }
  } catch (e) {
    console.error('Failed to start camera', e);
  }
}

function stopCamera() {
  if (cameraStream) {
    cameraStream.getTracks().forEach(t => t.stop());
    cameraStream = null;
  }
  if (camera) {
    try { camera.srcObject = null; } catch (_) { }
  }
}

/* ---------------- iOS audio context initialization ---------------- */
// iOS requires user interaction to start audio context
function initializeAudioContext() {
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(err => {
      console.warn('Could not resume audio context:', err);
    });
  }
}