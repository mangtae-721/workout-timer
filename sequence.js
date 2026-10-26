// 순서 계산: 화면·소리와 떨어진 순수 계산.
// 휴식·준비 단계의 round·cycle은 바로 다음 운동의 번호다.

export function buildPhases(t) {
  const phases = [];
  const add = (kind, duration, round, cycle) => {
    if (duration > 0) phases.push({ kind, duration, round, cycle });
  };
  add("prep", t.prep, 1, 1);
  for (let c = 1; c <= t.cycles; c++) {
    for (let r = 1; r <= t.rounds; r++) {
      add("work", t.work, r, c);
      if (r < t.rounds) add("rest", t.roundRest, r + 1, c);
      else if (c < t.cycles) add("cycleRest", t.cycleRest, 1, c + 1);
    }
  }
  return phases;
}

// elapsed초가 흘렀을 때 지금 단계 번호와 남은 초. 다 끝났으면 done.
export function locate(phases, elapsed) {
  let start = 0;
  for (let i = 0; i < phases.length; i++) {
    const end = start + phases[i].duration;
    if (elapsed < end) return { index: i, remaining: end - elapsed, done: false };
    start = end;
  }
  return { index: phases.length - 1, remaining: 0, done: true };
}

// 알림 순간. prev는 직전에 그린 { index, sec }(sec = 남은 초 올림), 처음이면 null.
// "change" 단계가 바뀜, "tick" 3·2·1초 전, "end" 끝, 그 밖에는 null.
export function cue(prev, pos) {
  if (pos.done) return "end";
  if (!prev) return null;
  if (pos.index !== prev.index) return "change";
  const sec = Math.ceil(pos.remaining);
  return sec !== prev.sec && sec >= 1 && sec <= 3 ? "tick" : null;
}
