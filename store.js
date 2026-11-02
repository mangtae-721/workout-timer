// 저장: 타이머 목록을 휴대폰 크롬 저장소에 읽고 쓴다(보호-1). 복원 링크 글자도 만든다.

export const KEY = "workout-timer:v1";

const INT_FIELDS = ["work", "rounds", "cycles", "roundRest", "cycleRest", "prep"];

function isTimer(t) {
  return (
    t !== null &&
    typeof t === "object" &&
    typeof t.id === "string" &&
    typeof t.name === "string" &&
    INT_FIELDS.every((k) => Number.isInteger(t[k]) && t[k] >= 0)
  );
}

function isDoc(doc) {
  return doc !== null && typeof doc === "object" && doc.version === 1 && Array.isArray(doc.timers) && doc.timers.every(isTimer);
}

export function createStore(storage) {
  return {
    // 읽지 못하는 내용은 지우지 않고 KEY:broken으로 옮긴 뒤 빈 목록을 돌려준다.
    load() {
      const raw = storage.getItem(KEY);
      if (raw === null) return { timers: [], broken: false };
      try {
        const doc = JSON.parse(raw);
        if (isDoc(doc)) {
          return { timers: doc.timers, broken: false };
        }
      } catch {
        // 아래에서 옮긴다
      }
      storage.setItem(KEY + ":broken", raw);
      storage.removeItem(KEY);
      return { timers: [], broken: true };
    },

    // 목록 전체를 한 번에 바꿔 쓴다. 실패하면 오류를 그대로 낸다.
    save(timers) {
      storage.setItem(KEY, JSON.stringify({ version: 1, timers }));
    },
  };
}

// 크롬에 "지우지 말고 계속 보관"을 요청한다. 거절돼도 저장은 그대로 된다.
export function askPersist() {
  navigator.storage?.persist?.().catch(() => {});
}

// 복원 링크: 타이머 목록을 링크 뒤에 붙일 글자로 바꾼다(저장 형식 → UTF-8 → base64url).
export function toBackup(timers) {
  const bytes = new TextEncoder().encode(JSON.stringify({ version: 1, timers }));
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// 복원 링크 글자를 타이머 목록으로 되돌린다. 읽지 못하거나 형식이 틀리면 null.
export function fromBackup(code) {
  try {
    const bin = atob(code.replace(/-/g, "+").replace(/_/g, "/"));
    const text = new TextDecoder("utf-8", { fatal: true }).decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
    const doc = JSON.parse(text);
    return isDoc(doc) ? doc.timers : null;
  } catch {
    return null;
  }
}

// 지금 목록에 없는 id의 타이머만 뒤에 더한다. 지금 있는 타이머는 그대로 둔다(보호-1).
export function mergeTimers(current, incoming) {
  const have = new Set(current.map((t) => t.id));
  const added = [];
  for (const t of incoming) {
    if (have.has(t.id)) continue;
    have.add(t.id);
    added.push(t);
  }
  return { next: [...current, ...added], added: added.length };
}
