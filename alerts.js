// 알림: 소리는 코드로 직접 만들고(소리 파일 없음) 진동을 낸다.
// 크롬은 손 동작 없이 소리를 막으므로, 시작 누름 때 unlock()으로 소리 장치를 켠다.

let ctx = null;

export function unlock() {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return;
  ctx ??= new Ctx();
  if (ctx.state === "suspended") ctx.resume();
}

function tone(freq, start, length, volume = 0.5) {
  if (!ctx) return;
  const t = ctx.currentTime + start;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "square";
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(volume, t + 0.01);
  gain.gain.setValueAtTime(volume, t + length - 0.03);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + length);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + length + 0.02);
}

function vibrate(pattern) {
  navigator.vibrate?.(pattern);
}

const SOUNDS = {
  // 3·2·1초 전: 짧은 삐
  tick: () => tone(880, 0, 0.12, 0.35),
  // 단계가 바뀔 때: 긴 삐와 짧은 진동
  change: () => {
    tone(1320, 0, 0.6);
    vibrate(250);
  },
  // 끝: 올라가는 세 음과 긴 진동
  end: () => {
    tone(660, 0, 0.2);
    tone(880, 0.22, 0.2);
    tone(1320, 0.44, 0.9);
    vibrate([400, 150, 400, 150, 900]);
  },
};

export function play(kind) {
  SOUNDS[kind]?.();
}
