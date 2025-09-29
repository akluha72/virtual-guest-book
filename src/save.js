document.addEventListener('DOMContentLoaded', () => {

  let audioCtx;
  let analyser;
  let animationId;

  const voicePlayback = document.getElementById('voicePlayback');
  const waveCanvas = document.getElementById('waveCanvas');
  const waveCtx = waveCanvas.getContext('2d');
  const camera = document.getElementById('camera');
  const videoPreview = document.getElementById('videoPreview');
  const recordVideoBtn = document.getElementById('recordVideoBtn');
  const retakeVideoBtn = document.getElementById('retakeVideoBtn');
  const guestNameInput = document.getElementById('guestName');
  const eventDateInput = document.getElementById('eventDate');
  const backBtn = document.getElementById('backBtn');
  const submitBtn = document.getElementById('submitBtn');

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
      camera.srcObject = stream;
    } catch (e) {
      console.error('Camera error', e);
    }
  }

  let recordedVideoBlob = null;
  let mediaRecorder = null;

  recordVideoBtn.addEventListener('click', async () => {
    if (!camera.srcObject) return;
    const stream = camera.srcObject;

    let mimeType = 'video/webm;codecs=vp9';
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8')) mimeType = 'video/webm;codecs=vp8';
      else mimeType = 'video/webm';
    }

    mediaRecorder = new MediaRecorder(stream, { mimeType });
    const chunks = [];
    recordedVideoBlob = null;
    recordVideoBtn.disabled = true;
    retakeVideoBtn.disabled = true;
    recordVideoBtn.textContent = '⏳ Recording...';

    mediaRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunks.push(e.data);
    };
    mediaRecorder.onstop = () => {
      recordedVideoBlob = new Blob(chunks, { type: mimeType });
      const url = URL.createObjectURL(recordedVideoBlob);
      videoPreview.src = url;
      videoPreview.style.display = 'block';
      retakeVideoBtn.disabled = false;
      recordVideoBtn.textContent = '🎥 Record (8s)';
      recordVideoBtn.disabled = false;
    };

    mediaRecorder.start();
    setTimeout(() => {
      if (mediaRecorder && mediaRecorder.state === 'recording') mediaRecorder.stop();
    }, 8000);
  });

  retakeVideoBtn.addEventListener('click', () => {
    recordedVideoBlob = null;
    videoPreview.removeAttribute('src');
    videoPreview.style.display = 'none';
    retakeVideoBtn.disabled = true;
  });

  backBtn.addEventListener('click', () => {
    window.history.back();
  });

  function dataUrlToBlob(dataUrl) {
    const parts = dataUrl.split(',');
    const mime = /data:(.*?);base64/.exec(parts[0])[1] || 'application/octet-stream';
    const binary = atob(parts[1]);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
    return new Blob([bytes], { type: mime });
  }

  submitBtn.addEventListener('click', async () => {
    const name = (guestNameInput.value || '').trim();
    if (!name) {
      alert('Please enter your name');
      return;
    }
    if (!recordedVideoBlob) {
      alert('Please record a short video');
      return;
    }
    const audioDataUrl = sessionStorage.getItem('guestAudioDataUrl');
    if (!audioDataUrl) {
      alert('Missing recorded audio');
      return;
    }

    const audioBlob = dataUrlToBlob(audioDataUrl);

    const form = new FormData();
    form.append('guest_name', name);
    const evt = (eventDateInput && eventDateInput.value) ? eventDateInput.value : new Date().toISOString().slice(0, 10);
    form.append('event_date', evt);
    form.append('video', recordedVideoBlob, `video_${Date.now()}.webm`);
    const audioExt = (audioBlob.type.split('/')[1] || 'webm');
    form.append('audio', audioBlob, `audio_${Date.now()}.${audioExt}`);

    try {
      const res = await fetch('/save_entry.php', { method: 'POST', body: form });
      const json = await res.json();
      if (json.status === 'success') {
        alert('Saved!');
        window.location.href = '/';
      } else {
        alert('Failed to save: ' + (json.message || 'Unknown error'));
      }
    } catch (e) {
      console.error(e);
      alert('Network error');
    }
  });

  // Kickoff
  initAudio();
  initCamera();

  voicePlayback.addEventListener('play', () => {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  });
});



