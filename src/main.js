import './style.css'
import './styles/mainpage.scss'

let mediaRecorder;
let audioChunks = [];
let recordedBlob = null;
let animationId;
let audioCtx, analyser;
let uiState = 'idle'; // idle | playing_greeting | recording | ready | previewing
let playbackSourceNode = null; // cached MediaElementSource for audioPlayback
let playbackAnalyser = null;   // analyser used for playback waveform
let cameraStream = null; // media stream for inline selfie capture
let capturedPhotoBlob = null; // holds captured selfie

const actionBtn = document.getElementById("actionBtn");
const restartBtn = document.getElementById("restartBtn");
// const postControls = document.getElementById("postControls");
const audioPlayback = document.getElementById("audioPlayback");
const canvas = document.getElementById("visualizer");
const ctx = canvas.getContext("2d");

// Inline save elements
const inlineSave = document.getElementById("inlineSave");
const greetingVideo = document.getElementById("greetingVideo");
const camera = document.getElementById("camera");
const photoCanvas = document.getElementById("photoCanvas");
const photoPreview = document.getElementById("photoPreview");
const takePhotoBtn = document.getElementById("takePhotoBtn");
const retakePhotoBtn = document.getElementById("retakePhotoBtn");
const guestName = document.getElementById("guestName");
const backBtn = document.getElementById("backBtn");
const submitBtn = document.getElementById("submitBtn");
const nameSection = document.getElementById("nameSection");
const nameActions = document.getElementById("nameActions");

canvas.width = canvas.offsetWidth;
canvas.height = canvas.offsetHeight;

// === Random Greeting Pool ===
const greetings = [
  "/voice-note/voice4-effect.wav",
];

function playRandomGreeting() {
  const randomIndex = Math.floor(Math.random() * greetings.length);
  const url = greetings[randomIndex];
  const audio = new Audio(url);
  audio.crossOrigin = 'anonymous';
  audio.onerror = (e) => {
    console.error('Greeting failed to load', url, e);
  };
  // Attach to analyser for waveform
  const ctx = getAudioContext();
  try {
    const source = ctx.createMediaElementSource(audio);
    analyser = ctx.createAnalyser();
    analyser.fftSize = 2048;
    source.connect(analyser);
    analyser.connect(ctx.destination);
    drawWaveform(analyser);
  } catch (err) {
    console.warn('Could not attach greeting to analyser', err);
  }
  audio.play().catch((err) => {
    console.error('Greeting failed to play', err);
  });
  return audio; // so you can use .onended
}

// === Waveform drawing ===
function drawWaveform(analyser) {
  const bufferLength = analyser.fftSize;
  const dataArray = new Uint8Array(bufferLength);

  function draw() {
    animationId = requestAnimationFrame(draw);

    analyser.getByteTimeDomainData(dataArray);

    ctx.fillStyle = "#111";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.lineWidth = 2;
    ctx.strokeStyle = "gold"; // wedding touch ✨

    ctx.beginPath();

    const sliceWidth = canvas.width * 1.0 / bufferLength;
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
      const v = dataArray[i] / 128.0;
      const y = v * canvas.height / 2;

      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);

      x += sliceWidth;
    }

    ctx.lineTo(canvas.width, canvas.height / 2);
    ctx.stroke();
  }

  draw();
}

function stopVisualizer() {
  cancelAnimationFrame(animationId);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return audioCtx;
}

// === Recording logic with Telephone Effect ===
async function startRecording() {
  const ctx = getAudioContext();
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const source = ctx.createMediaStreamSource(stream);

  // Phone-like filters
  const highPass = ctx.createBiquadFilter();
  highPass.type = "highpass";
  highPass.frequency.value = 300;

  const lowPass = ctx.createBiquadFilter();
  lowPass.type = "lowpass";
  lowPass.frequency.value = 3400;

  // Destination + analyser
  const destination = ctx.createMediaStreamDestination();
  analyser = ctx.createAnalyser();
  analyser.fftSize = 2048;

  source.connect(highPass);
  highPass.connect(lowPass);
  lowPass.connect(analyser);
  lowPass.connect(destination);

  // Pick supported codec for iOS
  let options = { mimeType: "audio/webm" };
  if (!MediaRecorder.isTypeSupported(options.mimeType)) {
    options = { mimeType: "audio/mp4" }; // fallback for iOS
  }

  mediaRecorder = new MediaRecorder(destination.stream, options);
  audioChunks = [];
  recordedBlob = null;
  mediaRecorder.start();

  mediaRecorder.addEventListener("dataavailable", e => {
    audioChunks.push(e.data);
  });

  mediaRecorder.addEventListener("stop", () => {
    const mimeType = mediaRecorder.mimeType || "audio/mp4";
    recordedBlob = new Blob(audioChunks, { type: mimeType });
    const audioUrl = URL.createObjectURL(recordedBlob);

    audioPlayback.src = audioUrl;
    // reveal playback and post controls
    // audioPlayback.style.display = 'block';
    // postControls.style.display = 'none';
    uiState = 'ready';
    actionBtn.textContent = '▶️ Preview';
    // After audio is recorded, unlock name entry and show Save controls
    if (nameSection) nameSection.style.display = 'block';
    if (nameActions) nameActions.style.display = 'flex';
  });

  drawWaveform(analyser);

  uiState = 'recording';
  actionBtn.textContent = '⏹ Stop';
}

// === Event Listeners ===
actionBtn.addEventListener('click', async () => {
  const state = uiState || 'idle';
  // Pause greeting video immediately on Start click
  try {
    if (typeof greetingVideo !== 'undefined' && greetingVideo && !greetingVideo.paused) {
      greetingVideo.pause();
    }
  } catch (_) { }

  if (state === 'idle') {
    // Play random greeting; after it ends, show selfie section (no auto-record)
    const ctx = getAudioContext();
    actionBtn.disabled = true;
    actionBtn.textContent = '🔊 Lutfi Speaking...';
    const audio = playRandomGreeting();
    await ctx.resume();
    audio.onended = () => {
      // stop greeting waveform; hide video; show selfie section only (lock recording)
      stopVisualizer();
      if (greetingVideo) greetingVideo.style.display = 'none';
      if (inlineSave) inlineSave.style.display = 'block';
      if (nameSection) nameSection.style.display = 'none';
      if (nameActions) nameActions.style.display = 'none';
      startCamera();
      actionBtn.disabled = true; // cannot record until selfie is taken
      actionBtn.textContent = '🎙️ Start Recording';
      uiState = 'awaiting_selfie';
    };
    uiState = 'playing_greeting';
  } else if (state === 'recording') {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
    }
    stopVisualizer();
    // move to ready; actual UI changes are handled in recorder.stop handler
  } else if (state === 'awaiting_recording') {
    // User starts recording after selfie section is shown
    startRecording();
  } else if (state === 'awaiting_selfie') {
    alert('Please take a selfie first.');
  } else if (state === 'ready' || state === 'previewing') {
    if (!recordedBlob) return;
    // Always play from start; disable button during preview. No Pause state.
    try { audioPlayback.currentTime = 0; } catch (_) { }
    audioPlayback.play();
    uiState = 'previewing';
    actionBtn.disabled = true;
    actionBtn.textContent = '▶️ Preview';
  }
});

restartBtn.addEventListener('click', () => {
  // reset UI to start state
  location.reload();
  // postControls.style.display = 'none';
  // if (inlineSave) inlineSave.style.display = 'none';
  // if (nameSection) nameSection.style.display = 'none';
  // if (nameActions) nameActions.style.display = 'none';
  // audioPlayback.removeAttribute('src');
  // recordedBlob = null;
  // audioPlayback.style.display = 'none';
  // uiState = 'idle';
  // actionBtn.textContent = '▶️ Start';
});

// === Inline Save Flow ===
async function startCamera() {
  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    if (camera) {
      camera.srcObject = cameraStream;
    }
  } catch (e) {
    console.error('Failed to start camera', e);
  }
}

function stopCamera() {
  if (cameraStream) {
    const tracks = cameraStream.getTracks();
    tracks.forEach(t => t.stop());
    cameraStream = null;
  }
  if (camera) {
    try { camera.srcObject = null; } catch (_) { }
  }
}

// (Selfie section is shown after greeting ends in the click handler above)

// Removed Save/Send button flow; inline save shows after stop

takePhotoBtn && takePhotoBtn.addEventListener('click', () => {
  if (!camera) return;
  const video = camera;
  // Use a centered square crop to match circular frame
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
      // Prefer IMG preview so custom styles apply
      const url = URL.createObjectURL(blob);
      if (photoPreview) {
        photoPreview.src = url;
        photoPreview.style.display = 'block';
        // Ensure circular styling if desired
        if (!photoPreview.style.borderRadius) photoPreview.style.borderRadius = '50%';
        if (!photoPreview.style.aspectRatio) photoPreview.style.aspectRatio = '1 / 1';
        if (!photoPreview.style.objectFit) photoPreview.style.objectFit = 'cover';
      }
      // Hide canvas when using IMG preview
      if (photoCanvas) photoCanvas.style.display = 'none';
      // Hide camera feed
      if (camera) camera.style.display = 'none';
      if (retakePhotoBtn) retakePhotoBtn.disabled = false;
      if (takePhotoBtn) takePhotoBtn.disabled = true;
      stopCamera();
      // Unlock recording after selfie is captured
      actionBtn.disabled = false;
      uiState = 'awaiting_recording';
    }
  }, 'image/png');
});

retakePhotoBtn && retakePhotoBtn.addEventListener('click', () => {
  // Clear previous preview and restart camera
  capturedPhotoBlob = null;
  if (photoCanvas) photoCanvas.style.display = 'none';
  if (photoPreview) { photoPreview.style.display = 'none'; photoPreview.removeAttribute('src'); }
  if (retakePhotoBtn) retakePhotoBtn.disabled = true;
  if (takePhotoBtn) takePhotoBtn.disabled = false;
  startCamera();
  // Lock recording again until selfie recaptured
  actionBtn.disabled = true;
  uiState = 'awaiting_selfie';
});

backBtn && backBtn.addEventListener('click', () => {
  // Return to post controls
  stopCamera();
  if (inlineSave) inlineSave.style.display = 'none';
  // postControls.style.display = 'flex';
});

submitBtn && submitBtn.addEventListener('click', async () => {
  if (!recordedBlob) return;
  const form = new FormData();
  form.append('guest_name', (guestName && guestName.value) || '');
  // auto-fill today's date in YYYY-MM-DD
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  form.append('event_date', `${yyyy}-${mm}-${dd}`);
  // Attach audio
  const audioExt = (recordedBlob.type && recordedBlob.type.includes('mp4')) ? 'mp4' : 'webm';
  form.append('audio', recordedBlob, `message.${audioExt}`);
  // Attach photo if available
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
      // Stop media and clear UI, then show Thank You screen centered
      try { stopCamera(); } catch (_) { }
      try { if (mediaRecorder && mediaRecorder.state === 'recording') mediaRecorder.stop(); } catch (_) { }
      const html = '<div style="display:flex;align-items:center;justify-content:center;min-height:100vh;text-align:center;">\
        <div>\
          <h1 style="font-family: \'Sacramento\', cursive; font-size:3rem; margin:0 0 .5rem;">Thank you! ❤️</h1>\
          <p>Your message has been saved.</p>\
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

// === Playback waveform ===
audioPlayback.addEventListener("play", () => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  // Create the MediaElementSource only once for this element
  if (!playbackSourceNode) {
    try {
      playbackSourceNode = audioCtx.createMediaElementSource(audioPlayback);
    } catch (e) {
      console.error('Failed to create MediaElementSource for playback', e);
      return;
    }
  }

  // Disconnect previous analyser connection if present
  if (playbackAnalyser) {
    try { playbackSourceNode.disconnect(playbackAnalyser); } catch (_) { }
  }

  playbackAnalyser = audioCtx.createAnalyser();
  playbackAnalyser.fftSize = 2048;
  try {
    playbackSourceNode.connect(playbackAnalyser);
    playbackAnalyser.connect(audioCtx.destination);
  } catch (e) {
    console.warn('Playback graph connection issue', e);
  }

  analyser = playbackAnalyser;
  drawWaveform(analyser);
});

audioPlayback.addEventListener("pause", stopVisualizer);
audioPlayback.addEventListener("ended", () => {
  stopVisualizer();
  uiState = 'ready';
  actionBtn.disabled = false;
  actionBtn.textContent = '▶️ Preview';
});
