// Sound input for listening: the chosen device (built-in mic, jack input, USB sound card…), taken WITHOUT echo
// cancellation or noise suppression – otherwise Chrome removes sound played by this computer and muffles the mixer feed.
// Also measures the level, so the host sees at once whether the sound arrives, too weak or too strong.

export function createAudioIn({ onLevel, onDevices }) {
  let deviceId = load();
  let echo = (() => { try { return localStorage.getItem('cl.anulareEcou') === '1'; } catch (e) { return false; } })();
  let stream = null, ctx = null, analyser = null, raf = 0, buf = null;

  function load() { try { return localStorage.getItem('cl.sursaAudio') || ''; } catch (e) { return ''; } }
  function save(id) { try { localStorage.setItem('cl.sursaAudio', id); } catch (e) { /* no storage */ } }

  const liveTrack = () => {
    const t = stream && stream.getAudioTracks()[0];
    return t && t.readyState === 'live' ? t : null;
  };

  async function track() {
    const t = liveTrack();
    if (t) return t;
    close();
    // echo cancellation: needed with the laptop's own mic when sound also comes out of its speakers
    const audio = { echoCancellation: echo, noiseSuppression: echo, autoGainControl: true, channelCount: 1 };
    if (deviceId) audio.deviceId = { exact: deviceId };
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio });
    } catch (e) {
      if (!deviceId || (e.name !== 'OverconstrainedError' && e.name !== 'NotFoundError')) throw e;
      deviceId = ''; // the chosen device is unplugged: back to the default one
      delete audio.deviceId;
      stream = await navigator.mediaDevices.getUserMedia({ audio });
    }
    meter();
    list();
    return stream.getAudioTracks()[0];
  }

  function meter() {
    try {
      ctx = ctx || new AudioContext();
      if (ctx.state === 'suspended') ctx.resume();
      const src = ctx.createMediaStreamSource(stream);
      analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      buf = new Float32Array(analyser.fftSize);
      src.connect(analyser);
    } catch (e) { analyser = null; return; }
    cancelAnimationFrame(raf);
    let shown = 0;
    const step = () => {
      if (!analyser) return;
      analyser.getFloatTimeDomainData(buf);
      let sum = 0, peak = 0;
      for (let i = 0; i < buf.length; i++) { const x = Math.abs(buf[i]); sum += x * x; if (x > peak) peak = x; }
      const rms = Math.sqrt(sum / buf.length);
      const db = 20 * Math.log10(rms || 1e-6); // about -60 (silence) … 0 (maximum)
      const level = Math.max(0, Math.min(1, (db + 60) / 60));
      shown = level > shown ? level : shown * 0.9 + level * 0.1; // rises fast, falls slowly
      if (onLevel) onLevel(shown, peak >= 0.98);
      raf = requestAnimationFrame(step);
    };
    step();
  }

  function close() {
    cancelAnimationFrame(raf);
    analyser = null;
    if (stream) stream.getTracks().forEach((t) => t.stop());
    stream = null;
    if (onLevel) onLevel(0, false);
  }

  async function list() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return;
    const all = (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === 'audioinput' && d.deviceId !== 'default' && d.deviceId !== 'communications');
    if (onDevices) onDevices(all, deviceId);
  }
  if (navigator.mediaDevices && navigator.mediaDevices.addEventListener) navigator.mediaDevices.addEventListener('devicechange', list);
  list();

  return {
    track,
    close,
    list,
    get device() { return deviceId; },
    get echo() { return echo; },
    setEcho(on) { echo = !!on; try { localStorage.setItem('cl.anulareEcou', echo ? '1' : '0'); } catch (e) { /* no storage */ } close(); },
    /** a new source: the current one is closed, the next track() opens the new one */
    setDevice(id) { deviceId = id || ''; save(deviceId); close(); },
  };
}
