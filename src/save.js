document.addEventListener('DOMContentLoaded', () => {

  let audioCtx;
  let analyser;
  let animationId;

  const voicePlayback = document.getElementById('voicePlayback');
  const waveCanvas = document.getElementById('waveCanvas');
  const waveCtx = waveCanvas.getContext('2d');
  const video = document.getElementById('camera');
  const snapBtn = document.getElementById('snapBtn');
  const retakeBtn = document.getElementById('retakeBtn');
  const clearBtn = document.getElementById('clearBtn');
  const thumbs = document.getElementById('thumbs');
  const guestNameInput = document.getElementById('guestName');
  const backBtn = document.getElementById('backBtn');
  const submitBtn = document.getElementById('submitBtn');

  const imgEls = [
    document.getElementById('img0'),
    document.getElementById('img1'),
    document.getElementById('img2'),
  ];
  const nameEls = [
    document.getElementById('name0'),
    document.getElementById('name1'),
    document.getElementById('name2'),
  ];

  waveCanvas.width = waveCanvas.offsetWidth;
  waveCanvas.height = waveCanvas.offsetHeight;

  function drawWaveform() {
    const bufferLength = analyser.fftSize;
    const dataArray = new Uint8Array(bufferLength);
    function draw() {
      animationId = requestAnimationFrame(draw);
      analyser.getByteTimeDomainData(dataArray);
      waveCtx.fillStyle = '#111';
      waveCtx.fillRect(0, 0, waveCanvas.width, waveCanvas.height);
      waveCtx.lineWidth = 2;
      waveCtx.strokeStyle = 'gold';
      waveCtx.beginPath();
      const sliceWidth = waveCanvas.width * 1.0 / bufferLength;
      let x = 0;
      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = v * waveCanvas.height / 2;
        if (i === 0) waveCtx.moveTo(x, y);
        else waveCtx.lineTo(x, y);
        x += sliceWidth;
      }
      waveCtx.lineTo(waveCanvas.width, waveCanvas.height / 2);
      waveCtx.stroke();
    }
    draw();
  }

  function stopWave() {
    cancelAnimationFrame(animationId);
  }

  async function initAudio() {
    const dataUrl = sessionStorage.getItem('guestAudioDataUrl');
    if (!dataUrl) return;
    voicePlayback.src = dataUrl;

    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const source = audioCtx.createMediaElementSource(voicePlayback);
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 2048;
    source.connect(analyser);
    analyser.connect(audioCtx.destination);
    drawWaveform();
  }

  async function initCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      video.srcObject = stream;
    } catch (e) {
      console.error('Camera error', e);
    }
  }

  const photos = [];

  function updateThumbs() {
    thumbs.innerHTML = '';
    for (let i = 0; i < 3; i++) {
      const dataUrl = photos[i];
      imgEls[i].src = dataUrl || '';
      nameEls[i].textContent = (guestNameInput.value || '').trim();
      const div = document.createElement('div');
      div.style.width = '100px';
      div.style.height = '100px';
      div.style.borderRadius = '8px';
      div.style.overflow = 'hidden';
      div.style.background = '#000';
      if (dataUrl) {
        const img = document.createElement('img');
        img.src = dataUrl;
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.objectFit = 'cover';
        div.appendChild(img);
      } else {
        div.style.display = 'grid';
        div.style.placeItems = 'center';
        div.style.color = '#888';
        div.textContent = `#${i + 1}`;
      }
      thumbs.appendChild(div);
    }
  }

  snapBtn.addEventListener('click', () => {
    if (photos.length >= 3) return;
    const canvas = document.createElement('canvas');
    const w = video.videoWidth;
    const h = video.videoHeight;
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, w, h);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    photos.push(dataUrl);
    updateThumbs();
  });

  retakeBtn.addEventListener('click', () => {
    if (photos.length > 0) {
      photos.pop();
      updateThumbs();
    }
  });

  clearBtn.addEventListener('click', () => {
    photos.length = 0;
    updateThumbs();
  });

  guestNameInput.addEventListener('input', updateThumbs);

  backBtn.addEventListener('click', () => {
    window.history.back();
  });

  submitBtn.addEventListener('click', async () => {
    const name = (guestNameInput.value || '').trim();
    if (!name) {
      alert('Please enter your name');
      return;
    }

    // For demo: use only the first captured photo and audio
    const canvas = document.createElement('canvas');
    const w = video.videoWidth;
    const h = video.videoHeight;
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, w, h);

    // Convert first photo into Blob
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.9));

    // Get audio Blob from sessionStorage (if stored as Base64 earlier)
    const audioBase64 = sessionStorage.getItem('guestAudioData');
    const audioBlob = audioBase64 ?
      new Blob([Uint8Array.from(atob(audioBase64), c => c.charCodeAt(0))], { type: sessionStorage.getItem('guestAudioMime') })
      : null;

    const formData = new FormData();
    formData.append("guest_name", name);
    formData.append("event_date", new Date().toISOString().slice(0, 10));
    if (blob) formData.append("video", blob, "guest_video.mp4");
    if (audioBlob) formData.append("audio", audioBlob, "guest_audio.webm");

    try {
      const res = await fetch("save_entry.php", {
        method: "POST",
        body: formData
      });
      const data = await res.json();
      if (data.status === "success") {
        alert("Entry saved to database!");
        window.location.href = "/";
      } else {
        alert("Save failed: " + data.message);
      }
    } catch (err) {
      console.error(err);
      alert("Network error");
    }
  });

  // Kickoff
  initAudio();
  initCamera();
  updateThumbs();

  voicePlayback.addEventListener('play', () => {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  });
});



