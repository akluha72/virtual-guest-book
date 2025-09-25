import './style.css'

let mediaRecorder;
let audioChunks = [];
let recordedBlob = null;
let animationId;
let audioCtx, analyser;

const actionBtn = document.getElementById("actionBtn");
const restartBtn = document.getElementById("restartBtn");
const saveBtn = document.getElementById("saveBtn");
const postControls = document.getElementById("postControls");
const audioPlayback = document.getElementById("audioPlayback");
const downloadLink = document.getElementById("downloadLink");
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
  audio.onerror = (e) => {
    console.error('Greeting failed to load', url, e);
  };
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
    downloadLink.href = audioUrl;
    downloadLink.textContent = "⬇️ Download your message";

    // show post controls
    postControls.style.display = 'flex';
    actionBtn.textContent = '▶️ Start';
  });

  drawWaveform(analyser);

  actionBtn.dataset.state = 'recording';
  actionBtn.textContent = '⏹ Stop';
}

// === Event Listeners ===
actionBtn.addEventListener('click', async () => {
  const state = actionBtn.dataset.state || 'idle';

  if (state === 'idle') {
    // Play random greeting, then begin recording
    const ctx = getAudioContext();
    actionBtn.disabled = true;
    actionBtn.textContent = '🔊 Playing greeting...';
    const audio = playRandomGreeting();
    await ctx.resume();
    audio.onended = () => {
      actionBtn.disabled = false;
      startRecording();
    };
  } else if (state === 'recording') {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
    }
    stopVisualizer();
    actionBtn.dataset.state = 'idle';
  }
});

restartBtn.addEventListener('click', () => {
  // reset UI to start state
  postControls.style.display = 'none';
  audioPlayback.removeAttribute('src');
  downloadLink.removeAttribute('href');
  downloadLink.textContent = 'No recording yet';
  recordedBlob = null;
  actionBtn.dataset.state = 'idle';
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
  const source = audioCtx.createMediaElementSource(audioPlayback);
  analyser = audioCtx.createAnalyser();
  analyser.fftSize = 2048;

  source.connect(analyser);
  analyser.connect(audioCtx.destination);

  drawWaveform(analyser);
});

audioPlayback.addEventListener("pause", stopVisualizer);
audioPlayback.addEventListener("ended", stopVisualizer);
