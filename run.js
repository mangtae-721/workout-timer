// 진행 화면: 눌러 시작한 타이머를 끝까지 보여 준다.

import { play, unlock } from "./alerts.js";
import { buildPhases, cue, locate } from "./sequence.js";

const LABEL = { prep: "준비", work: "운동", rest: "휴식", cycleRest: "사이클 휴식" };

const $ = (id) => document.getElementById(id);

let run = null; // { timer, phases, startedAt, interval, prev, pausedAt, over }
let screenLock = null;

// 화면 켜 두기: 진행 중에만 잡는다. 안 되면 작은 안내를 띄운다.
async function holdScreen() {
  try {
    screenLock = await navigator.wakeLock.request("screen");
    screenLock.addEventListener("release", () => (screenLock = null));
    $("run-note").hidden = true;
  } catch {
    $("run-note").hidden = false;
  }
}

function releaseScreen() {
  screenLock?.release();
  screenLock = null;
}

function running() {
  return run && !run.over && !run.pausedAt;
}

function clockText(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const ss = String(s).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${m}:${ss}`;
}

function infoText(phase, timer) {
  const parts = [`라운드 ${phase.round}/${timer.rounds}`];
  if (timer.cycles > 1) parts.push(`사이클 ${phase.cycle}/${timer.cycles}`);
  const text = parts.join(" · ");
  return phase.kind === "work" ? text : `다음 · ${text}`;
}

function elapsed() {
  return (Date.now() - run.startedAt) / 1000;
}

function render() {
  const pos = locate(run.phases, elapsed());
  play(cue(run.prev, pos));
  run.prev = { index: pos.index, sec: Math.ceil(pos.remaining) };
  if (pos.done) {
    finish();
    return;
  }
  const phase = run.phases[pos.index];
  const time = clockText(Math.ceil(pos.remaining));
  $("run-screen").dataset.kind = phase.kind;
  $("run-phase").textContent = run.pausedAt ? "일시정지" : LABEL[phase.kind];
  $("run-time").textContent = time;
  $("run-time").dataset.len = String(time.length);
  $("run-info").textContent = infoText(phase, run.timer);
}

function stopLoop() {
  if (run) clearInterval(run.interval);
}

function end() {
  stopLoop();
  releaseScreen();
  run.over = true;
}

function finish() {
  end();
  $("done-name").textContent = $("run-name").textContent;
  ui.show("done");
}

function togglePause() {
  if (run.pausedAt) {
    run.startedAt += Date.now() - run.pausedAt;
    run.pausedAt = 0;
    run.interval = setInterval(render, 100);
    holdScreen();
  } else {
    stopLoop();
    releaseScreen();
    run.pausedAt = Date.now();
  }
  $("run-pause").textContent = run.pausedAt ? "이어하기" : "일시정지";
  render();
}

async function askStop() {
  if (await ui.confirm("그만할까요?", "그만하기")) {
    end();
    ui.show("list");
  }
}

let ui = null;

// ui: { show(screen), displayName(timer), confirm(text, yesLabel) }
export function startRun(timer, uiHooks) {
  ui = uiHooks;
  stopLoop();
  unlock();
  run = { timer, phases: buildPhases(timer), startedAt: Date.now(), interval: 0, prev: null, pausedAt: 0, over: false };
  $("run-pause").textContent = "일시정지";
  $("run-name").textContent = ui.displayName(timer);
  ui.show("run");
  render();
  run.interval = setInterval(render, 100);
  holdScreen();
}

export function setupRun() {
  $("run-pause").addEventListener("click", togglePause);
  $("run-stop").addEventListener("click", askStop);
  // 다른 앱에서 돌아오면 화면 켜 두기를 다시 잡고 흐른 만큼 앞선 자리를 그린다.
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && running()) {
      holdScreen();
      render();
    }
  });
  $("done-again").addEventListener("click", () => startRun(run.timer, ui));
  $("done-list").addEventListener("click", () => ui.show("list"));
}
