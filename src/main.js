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

const actionBtn = document.getElementById("actionBtn");
const restartBtn = document.getElementById("restartBtn");
const saveBtn = document.getElementById("saveBtn");
const postControls = document.getElementById("postControls");
const audioPlayback = document.getElementById("audioPlayback");
const canvas = document.getElementById("visualizer");
const ctx = canvas.getContext("2d");

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
    postControls.style.display = 'flex';
    uiState = 'ready';
    actionBtn.textContent = '▶️ Preview';
  });

  drawWaveform(analyser);

  uiState = 'recording';
  actionBtn.textContent = '⏹ Stop';
}

// === Event Listeners ===
actionBtn.addEventListener('click', async () => {
  const state = uiState || 'idle';

  if (state === 'idle') {
    // Play random greeting, then begin recording
    const ctx = getAudioContext();
    actionBtn.disabled = true;
    actionBtn.textContent = '🔊 Lutfi Speaking...';
    const audio = playRandomGreeting();
    await ctx.resume();
    audio.onended = () => {
      // stop greeting waveform before starting mic waveform
      stopVisualizer();
      actionBtn.disabled = false;
      startRecording();
    };
    uiState = 'playing_greeting';
  } else if (state === 'recording') {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
    }
    stopVisualizer();
    // move to ready; actual UI changes are handled in recorder.stop handler
  } else if (state === 'ready' || state === 'previewing') {
    if (!recordedBlob) return;
    // Always play from start; disable button during preview. No Pause state.
    try { audioPlayback.currentTime = 0; } catch (_) {}
    audioPlayback.play();
    uiState = 'previewing';
    actionBtn.disabled = true;
    actionBtn.textContent = '▶️ Preview';
  }
});

restartBtn.addEventListener('click', () => {
  // reset UI to start state
  postControls.style.display = 'none';
  audioPlayback.removeAttribute('src');
  recordedBlob = null;
  audioPlayback.style.display = 'none';
  uiState = 'idle';
  actionBtn.textContent = '▶️ Start';
});

saveBtn.addEventListener('click', async () => {
  if (!recordedBlob) return;
  // Persist as Data URL to avoid large base64 spread issues
  const reader = new FileReader();
  reader.onloadend = () => {
    try {
      sessionStorage.setItem('guestAudioDataUrl', reader.result);
      sessionStorage.setItem('guestAudioMime', recordedBlob.type || 'audio/webm');
    } catch (e) {
      console.error('Failed to store audio in sessionStorage', e);
    }
    window.location.href = '/save.html';
  };
  reader.readAsDataURL(recordedBlob);
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
    try { playbackSourceNode.disconnect(playbackAnalyser); } catch (_) {}
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
