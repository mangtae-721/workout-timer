// 운동 타이머 화면: 목록, 만들기·고치기.

import { askPersist, createStore } from "./store.js";

const LIMITS = {
  work: [1, 99 * 3600 + 59 * 60 + 59],
  rounds: [1, 99],
  cycles: [1, 99],
  roundRest: [0, 99 * 60 + 59],
  cycleRest: [0, 99 * 60 + 59],
  prep: [0, 99 * 60 + 59],
};

const NEW_TIMER = { name: "", work: 40, rounds: 5, cycles: 1, roundRest: 20, cycleRest: 60, prep: 10 };

const $ = (id) => document.getElementById(id);
const store = createStore(localStorage);

let timers = [];
let editing = null; // 지금 만들거나 고치는 타이머의 id

// ── 글자 만들기 ──

function durationText(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const parts = [];
  if (h) parts.push(`${h}시간`);
  if (m) parts.push(`${m}분`);
  if (s || !parts.length) parts.push(`${s}초`);
  return parts.join(" ");
}

function displayName(t) {
  if (t.name.trim()) return t.name.trim();
  const base = `${durationText(t.work)} × ${t.rounds}라운드`;
  return t.cycles > 1 ? `${base} × ${t.cycles}사이클` : base;
}

function summaryText(t) {
  const parts = [`운동 ${durationText(t.work)}`];
  if (t.roundRest) parts.push(`휴식 ${durationText(t.roundRest)}`);
  parts.push(t.cycles > 1 ? `${t.rounds}라운드 × ${t.cycles}사이클` : `${t.rounds}라운드`);
  if (t.cycles > 1 && t.cycleRest) parts.push(`사이클 휴식 ${durationText(t.cycleRest)}`);
  return parts.join(" · ");
}

function newId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// ── 목록 화면 ──

function showMessage(el, text) {
  el.textContent = text;
  el.hidden = !text;
}

function loadList() {
  const { timers: saved, broken } = store.load();
  timers = saved;
  showMessage($("list-message"), broken ? "저장 내용을 읽지 못했어요. 읽지 못한 내용은 지우지 않고 따로 보관해 두었어요." : "");
  renderList();
}

// 목록 전체를 저장한다. 실패하면 false.
function saveAll(next) {
  try {
    store.save(next);
  } catch {
    return false;
  }
  timers = next;
  askPersist();
  return true;
}

function renderList() {
  const ul = $("timer-list");
  ul.replaceChildren();
  for (const t of timers) {
    const li = document.createElement("li");
    li.className = "timer-item";
    const start = document.createElement("button");
    start.type = "button";
    start.className = "timer-start";
    const name = document.createElement("span");
    name.className = "timer-name";
    name.textContent = displayName(t);
    const summary = document.createElement("span");
    summary.className = "timer-summary";
    summary.textContent = summaryText(t);
    start.append(name, summary);
    const edit = document.createElement("button");
    edit.type = "button";
    edit.className = "timer-edit";
    edit.textContent = "고치기";
    edit.addEventListener("click", () => openEditor(t));
    li.append(start, edit);
    ul.append(li);
  }
  $("empty").hidden = timers.length > 0;
}

// ── 만들기·고치기 화면 ──

function show(screen) {
  $("list-screen").hidden = screen !== "list";
  $("edit-screen").hidden = screen !== "edit";
  window.scrollTo(0, 0);
}

function setNum(id, v) {
  $(id).value = String(v);
}

function getNum(id) {
  const v = Number($(id).value || 0);
  return Number.isFinite(v) ? Math.max(0, Math.floor(v)) : 0;
}

function openEditor(timer) {
  editing = timer ? timer.id : newId();
  const t = timer || NEW_TIMER;
  $("edit-title").textContent = timer ? "타이머 고치기" : "새 타이머";
  $("f-name").value = t.name;
  setNum("f-work-h", Math.floor(t.work / 3600));
  setNum("f-work-m", Math.floor((t.work % 3600) / 60));
  setNum("f-work-s", t.work % 60);
  setNum("f-rounds", t.rounds);
  setNum("f-cycles", t.cycles);
  for (const key of ["roundRest", "cycleRest", "prep"]) {
    setNum(`f-${key}-m`, Math.floor(t[key] / 60));
    setNum(`f-${key}-s`, t[key] % 60);
  }
  showMessage($("edit-message"), "");
  $("edit-delete").hidden = !timer;
  show("edit");
}

function readForm() {
  const t = {
    id: editing,
    name: $("f-name").value.trim(),
    work: getNum("f-work-h") * 3600 + getNum("f-work-m") * 60 + getNum("f-work-s"),
    rounds: getNum("f-rounds"),
    cycles: getNum("f-cycles"),
  };
  for (const key of ["roundRest", "cycleRest", "prep"]) {
    t[key] = getNum(`f-${key}-m`) * 60 + getNum(`f-${key}-s`);
  }
  return t;
}

function problemOf(t) {
  if (t.work < LIMITS.work[0]) return "운동 시간을 1초 이상으로 정해 주세요.";
  if (t.work > LIMITS.work[1]) return "운동 시간은 99시간 59분 59초까지예요.";
  if (t.rounds < 1 || t.rounds > 99) return "라운드 수는 1에서 99 사이로 정해 주세요.";
  if (t.cycles < 1 || t.cycles > 99) return "사이클 수는 1에서 99 사이로 정해 주세요.";
  if (t.roundRest > LIMITS.roundRest[1] || t.cycleRest > LIMITS.cycleRest[1] || t.prep > LIMITS.prep[1])
    return "휴식과 준비 시간은 99분 59초까지예요.";
  return "";
}

function save(event) {
  event.preventDefault();
  const t = readForm();
  const problem = problemOf(t);
  if (problem) {
    showMessage($("edit-message"), problem);
    return;
  }
  const i = timers.findIndex((x) => x.id === t.id);
  const next = i >= 0 ? timers.with(i, t) : [...timers, t];
  if (!saveAll(next)) {
    showMessage($("edit-message"), "저장하지 못했어요. 다시 눌러 주세요.");
    return;
  }
  renderList();
  show("list");
}

// 앱 화면 안에서 한 번 더 묻는다. 예를 누르면 true.
function confirmBox(text, yesLabel) {
  const box = $("confirm");
  $("confirm-text").textContent = text;
  $("confirm-yes").textContent = yesLabel;
  return new Promise((resolve) => {
    const done = (answer) => {
      box.close();
      $("confirm-yes").onclick = $("confirm-no").onclick = box.oncancel = null;
      resolve(answer);
    };
    $("confirm-yes").onclick = () => done(true);
    $("confirm-no").onclick = () => done(false);
    box.oncancel = () => done(false);
    box.showModal();
  });
}

async function removeTimer() {
  const t = timers.find((x) => x.id === editing);
  if (!t || !(await confirmBox(`'${displayName(t)}'을(를) 지울까요?
지우면 되돌릴 수 없어요.`, "지우기"))) return;
  if (!saveAll(timers.filter((x) => x.id !== editing))) {
    showMessage($("edit-message"), "지우지 못했어요. 다시 눌러 주세요.");
    return;
  }
  renderList();
  show("list");
}

function setupSteppers() {
  for (const box of document.querySelectorAll(".stepper")) {
    const input = $(box.dataset.for);
    box.addEventListener("click", (e) => {
      const step = Number(e.target.dataset.step || 0);
      if (!step) return;
      const v = Math.min(99, Math.max(1, getNum(input.id) + step));
      input.value = String(v);
    });
  }
}

function init() {
  $("new-timer").addEventListener("click", () => openEditor(null));
  $("edit-cancel").addEventListener("click", () => show("list"));
  $("edit-screen").addEventListener("submit", save);
  $("edit-delete").addEventListener("click", removeTimer);
  setupSteppers();
  loadList();
}

init();
