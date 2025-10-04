import './style.css'
import './styles/mainpage.scss'

/* ---------------- globals ---------------- */
let mediaRecorder;
let audioChunks = [];
let recordedBlob = null;
let animationId;

let audioCtx = null;
let analyser = null;            // generic analyser (when needed)
let playbackSourceNode = null;  // cached MediaElementSource for guest playback
let playbackAnalyser = null;    // analyser used for playback waveform

let cameraStream = null;
let capturedPhotoBlob = null;

const actionBtn = document.getElementById("actionBtn");
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

const canvas = document.getElementById("visualizer");   // greeting canvas
const canvas2 = document.getElementById("visualizer2"); // guest recording canvas

// Inline save elements
const camera = document.getElementById("camera");
const photoCanvas = document.getElementById("photoCanvas");
const photoPreview = document.getElementById("photoPreview");
const guestName = document.getElementById("guestName");
const nameActions = document.getElementById("nameActions");

let uiState = 'idle'; // idle | playing_greeting | recording | ready | previewing
let currentState = "idle"; // idle | recording | stopped (local recorder state)
let currentRecording = null; // { stream, sourceNode, analyser, vizController }

/* Map of canvas -> viz controller so we can stop specific ones */
const visualizers = new Map();

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
  if (audioCtx.state === "suspended") audioCtx.resume();
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

    // background
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, width, height);

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

/* Stops visualizer for a specific canvas (or both if no arg) */
function stopVisualizer(target) {
  if (target) {
    const v = visualizers.get(target);
    if (v && typeof v.stop === 'function') v.stop();
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

    // setup MediaRecorder
    mediaRecorder = new MediaRecorder(stream);
    audioChunks = [];

    mediaRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) audioChunks.push(e.data);
    };

    mediaRecorder.onstop = () => {
      recordedBlob = new Blob(audioChunks, { type: "audio/webm" });
      const audioUrl = URL.createObjectURL(recordedBlob);

      // put recorded audio into guest playback element
      if (audioPlaybackGuest) {
        audioPlaybackGuest.src = audioUrl;
      }
    };

    mediaRecorder.start();

    currentState = "recording";
    recordBtn.textContent = "⏹ Stop";
    recordBtn.classList.remove("idle");
    recordBtn.classList.add("recording");
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
  recordBtn.textContent = "▶️ Preview";
  recordBtn.classList.remove("recording");
  recordBtn.classList.add("preview");
  
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

  const ctx = getAudioContext();

  // create MediaElementSource only once for this guest playback element
  if (!playbackSourceNode) {
    try {
      playbackSourceNode = ctx.createMediaElementSource(audioPlaybackGuest);
    } catch (e) {
      console.warn("Could not create MediaElementSource for guest playback", e);
      // fallback: just play the audio without waveform
      audioPlaybackGuest.play();
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

  // play
  audioPlaybackGuest.play().catch(err => {
    console.error('Playback failed', err);
    // stop visualizer if play fails
    if (viz && typeof viz.stop === 'function') viz.stop();
    return;
  });

  // when finished, stop visualizer and show preview again
  audioPlaybackGuest.onended = () => {
    if (viz && typeof viz.stop === 'function') viz.stop();
    currentState = "stopped";
    recordBtn.textContent = "▶️ Preview";
    recordBtn.classList.remove("playing");
    recordBtn.classList.add("preview");
  };

  // update UI
  currentState = "previewing";
  recordBtn.textContent = "⏸️ Playing";
  recordBtn.classList.remove("preview");
  recordBtn.classList.add("playing");
}

/* ---------------- camera / selfie helpers ---------------- */
async function startCamera() {
  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    if (camera) camera.srcObject = cameraStream;
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

/* ---------------- UI event wiring ---------------- */
actionBtn && actionBtn.addEventListener('click', async () => {
  const state = uiState || 'idle';
  splashScreenSection.classList.add("removed");

  if (state === 'idle') {
    actionBtn.disabled = true;
    const audio = playRandomGreeting();
    uiState = 'playing_greeting';

    // After greeting ends we show selfie UI in your earlier flow
    // playRandomGreeting will stop its visualizer when ended
    audio.onended = () => {
      // move to selfie step
      nameSection.style.display = 'none';
      nameActions.style.display = 'none';
      bridesGreetingSection.style.display = 'none';
      selfieSection.classList.add('active');
      startCamera();
      actionBtn.disabled = false;
      uiState = 'awaiting_selfie';
    };
  }
});

takePhotoBtn && takePhotoBtn.addEventListener('click', () => {
  if (!camera) return;
  const video = camera;
  submitSelfieBtn.disabled = false;

  const vw = video.videoWidth || 520;
  const vh = video.videoHeight || 520;
  const size = Math.min(vw, vh);
  photoCanvas.width = size;
  photoCanvas.height = size;
  const pctx = photoCanvas.getContext('2d');
  const sx = (vw - size) / 2;
  const sy = (vh - size) / 2;
  pctx.drawImage(video, sx, sy, size, size, 0, 0, size, size);
  photoCanvas.toBlob((blob) => {
    if (blob) {
      capturedPhotoBlob = blob;
      const url = URL.createObjectURL(blob);
      if (photoPreview) {
        photoPreview.src = url;
        photoPreview.style.display = 'block';
      }
      if (photoCanvas) photoCanvas.style.display = 'none';
      if (camera) camera.style.display = 'none';
      if (retakePhotoBtn) retakePhotoBtn.disabled = false;
      if (takePhotoBtn) takePhotoBtn.disabled = true;
      stopCamera();
      actionBtn.disabled = false;
      uiState = 'awaiting_recording';
    }
  }, 'image/png');
});

retakePhotoBtn && retakePhotoBtn.addEventListener('click', () => {
  if (camera) camera.style.display = 'block';
  capturedPhotoBlob = null;
  if (photoCanvas) photoCanvas.style.display = 'none';
  if (photoPreview) { photoPreview.style.display = 'none'; photoPreview.removeAttribute('src'); }
  if (retakePhotoBtn) retakePhotoBtn.disabled = true;
  if (takePhotoBtn) takePhotoBtn.disabled = false;
  startCamera();
  if (submitSelfieBtn) submitSelfieBtn.disabled = true;
  uiState = 'awaiting_selfie';
});

backBtn && backBtn.addEventListener('click', () => {
  stopCamera();
});

submitSelfieBtn && submitSelfieBtn.addEventListener('click', async () => {
  selfieSection.style.display = 'none';
  nameSection.style.display = 'flex';
  nameActions.style.display = 'flex';
});

submitNameBtn && submitNameBtn.addEventListener('click', async () => {
  nameSection.style.display = 'none';
  guestWishesSection.style.display = 'flex';
  // we don't call drawWaveform here — visualizers are tied to actual analysers
});

recordBtn && recordBtn.addEventListener("click", () => {
  if (currentState === "idle") {
    startRecording();
  } else if (currentState === "recording") {
    stopRecording();
  } else if (currentState === "stopped") {
    previewRecording();
  } else if (currentState === "previewing" || currentState === "playing") {
    // if user presses while previewing, pause playback
    if (audioPlaybackGuest && !audioPlaybackGuest.paused) {
      audioPlaybackGuest.pause();
      // stop playback visualizer
      stopVisualizer(canvas2);
      currentState = "stopped";
      recordBtn.textContent = "▶️ Preview Again";
      recordBtn.classList.remove("playing");
      recordBtn.classList.add("preview");
    }
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
      const html = '<div style="display:flex;align-items:center;justify-content:center;min-height:100vh;text-align:center;background:linear-gradient(135deg, #667eea 0%, #764ba2 100%);color:white;font-family:system-ui,-apple-system,sans-serif;">\
        <div style="background:rgba(255,255,255,0.1);padding:3rem 2rem;border-radius:20px;backdrop-filter:blur(10px);border:1px solid rgba(255,255,255,0.2);box-shadow:0 8px 32px rgba(0,0,0,0.3);max-width:400px;width:90%;">\
          <div style="font-size:4rem;margin-bottom:1rem;">🎉</div>\
          <h1 style="font-family:\'Sacramento\',cursive;font-size:3.5rem;margin:0 0 1rem;font-weight:400;">Thank you!</h1>\
          <p style="font-size:1.2rem;margin:0 0 2rem;opacity:0.9;">Your message has been saved successfully</p>\
          <div style="font-size:2rem;opacity:0.8;">❤️</div>\
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
  location.reload();
});

// Restart recording functionality
restartRecordingBtn && restartRecordingBtn.addEventListener('click', () => {
  // Reset state
  currentState = "idle";
  recordBtn.textContent = "🎤 Start";
  recordBtn.classList.remove("preview", "recording", "playing");
  recordBtn.classList.add("idle");
  
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

// Save recording functionality
saveRecordingBtn && saveRecordingBtn.addEventListener('click', async () => {
  if (!recordedBlob) {
    alert('No recording to save!');
    return;
  }
  
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

    if (capturedPhotoBlob) {
      form.append('photo', capturedPhotoBlob, 'selfie.png');
    }

    const res = await fetch('/save_entry.php', {
      method: 'POST',
      body: form
    });
    const data = await res.json().catch(() => ({ status: 'error', message: 'Invalid server response' }));
    
    if (data.status === 'success') {
      // Show success message
      const html = '<div style="display:flex;align-items:center;justify-content:center;min-height:100vh;text-align:center;background:linear-gradient(135deg, #667eea 0%, #764ba2 100%);color:white;font-family:system-ui,-apple-system,sans-serif;">\
        <div style="background:rgba(255,255,255,0.1);padding:3rem 2rem;border-radius:20px;backdrop-filter:blur(10px);border:1px solid rgba(255,255,255,0.2);box-shadow:0 8px 32px rgba(0,0,0,0.3);max-width:400px;width:90%;">\
          <div style="font-size:4rem;margin-bottom:1rem;">🎉</div>\
          <h1 style="font-family:\'Sacramento\',cursive;font-size:3.5rem;margin:0 0 1rem;font-weight:400;">Thank you!</h1>\
          <p style="font-size:1.2rem;margin:0 0 2rem;opacity:0.9;">Your message has been saved successfully</p>\
          <div style="font-size:2rem;opacity:0.8;">❤️</div>\
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

/* ---------------- guest name live display ---------------- */
const guestNameInput = document.getElementById("guestName");
const displayName = document.getElementById("displayName");

if (guestNameInput && displayName) {
  guestNameInput.addEventListener("input", () => {
    displayName.textContent = guestNameInput.value.trim() || "Your Name";
  });
}

/* ---------------- cleanup on page unload ---------------- */
window.addEventListener('beforeunload', () => {
  try {
    if (audioCtx && audioCtx.state !== 'closed') audioCtx.close();
  } catch (e) { }
});
