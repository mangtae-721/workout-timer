// 저장: 타이머 목록을 휴대폰 크롬 저장소에 읽고 쓴다(보호-1).

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

export function createStore(storage) {
  return {
    // 읽지 못하는 내용은 지우지 않고 KEY:broken으로 옮긴 뒤 빈 목록을 돌려준다.
    load() {
      const raw = storage.getItem(KEY);
      if (raw === null) return { timers: [], broken: false };
      try {
        const doc = JSON.parse(raw);
        if (doc.version === 1 && Array.isArray(doc.timers) && doc.timers.every(isTimer)) {
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
