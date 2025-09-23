import './style.css'
import javascriptLogo from './javascript.svg'
import viteLogo from '/vite.svg'
import { setupCounter } from './counter.js'

let mediaRecorder;
let audioChunks = [];
let animationId;
let audioCtx, analyser;

const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");
const audioPlayback = document.getElementById("audioPlayback");
const downloadLink = document.getElementById("downloadLink");
const canvas = document.getElementById("visualizer");
const ctx = canvas.getContext("2d");

canvas.width = canvas.offsetWidth;
canvas.height = canvas.offsetHeight;

// === Random Greeting Pool ===
const greetings = [
  "voice-note/voice1-effect.wav",
  "voice-note/voice2-effect.wav",
  "voice-note/voice3-effect.wav"
];

function playRandomGreeting() {
  const randomIndex = Math.floor(Math.random() * greetings.length);
  const audio = new Audio(greetings[randomIndex]);
  audio.play();
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
  mediaRecorder.start();

  mediaRecorder.addEventListener("dataavailable", e => {
    audioChunks.push(e.data);
  });

  mediaRecorder.addEventListener("stop", () => {
    const mimeType = mediaRecorder.mimeType || "audio/mp4";
    const audioBlob = new Blob(audioChunks, { type: mimeType });
    const audioUrl = URL.createObjectURL(audioBlob);

    audioPlayback.src = audioUrl;
    downloadLink.href = audioUrl;
    downloadLink.textContent = "⬇️ Download your message";
  });

  drawWaveform(analyser);

  startBtn.disabled = true;
  stopBtn.disabled = false;
  startBtn.textContent = "Recording...";
}

// === Event Listeners ===
startBtn.addEventListener("click", () => {
  const ctx = getAudioContext();

  // Create greeting inside click event
  const randomIndex = Math.floor(Math.random() * greetings.length);
  const audio = new Audio(greetings[randomIndex]);

  audio.play().then(() => {
    // Ensure context stays active
    ctx.resume();
  });

  audio.onended = () => {
    startRecording();
  };
});

stopBtn.addEventListener("click", () => {
  if (mediaRecorder && mediaRecorder.state === "recording") {
    mediaRecorder.stop();
  }
  stopVisualizer();

  startBtn.disabled = false;
  stopBtn.disabled = true;
  startBtn.textContent = "▶️ Let's Start";
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
