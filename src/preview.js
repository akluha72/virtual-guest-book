import "./preview.scss";

function initWaveformForCard(card) {
  const audio = card.querySelector("audio");
  const canvas = card.querySelector(".story-wave");
  if (!audio || !canvas) return;

  const ctx = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  const width = card.clientWidth - 32; // padding compensation
  canvas.width = width * dpr;
  canvas.height = 84 * dpr;
  canvas.style.width = width + "px";
  canvas.style.height = "84px";

  let audioCtx;
  let analyser;
  let rafId;

  function draw() {
    rafId = requestAnimationFrame(draw);
    if (!analyser) return;
    const bufferLength = analyser.fftSize;
    const dataArray = new Uint8Array(bufferLength);
    analyser.getByteTimeDomainData(dataArray);

    ctx.fillStyle = "#111";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.lineWidth = 2 * dpr;
    ctx.strokeStyle = "#daa520";
    ctx.beginPath();
    const sliceWidth = canvas.width / bufferLength;
    let x = 0;
    for (let i = 0; i < bufferLength; i++) {
      const v = dataArray[i] / 128.0;
      const y = (v * canvas.height) / 2;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
      x += sliceWidth;
    }
    ctx.lineTo(canvas.width, canvas.height / 2);
    ctx.stroke();
  }

  function setupAnalyser() {
    if (audioCtx) return;
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const source = audioCtx.createMediaElementSource(audio);
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 2048;
    source.connect(analyser);
    analyser.connect(audioCtx.destination);
    draw();
  }

  audio.addEventListener("play", setupAnalyser, { once: true });
  audio.addEventListener("ended", () => cancelAnimationFrame(rafId));
}

function init() {
  const cards = document.querySelectorAll(".story-card");
  cards.forEach(initWaveformForCard);
}

window.addEventListener("DOMContentLoaded", init);


