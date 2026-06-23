// Google Meet タブ内で動く content script。
//   1) Meet の「現在の発言者」を検出する（best-effort）
//   2) ブラウザ標準の音声認識で書き起こす
//   3) 発話に話者ラベルを付けて SuperMeeting アプリへ送る
//   4) Meet 上に小さなオーバーレイを表示（手動で話者を上書き可能）
//
// 注意: Meet の DOM は難読化されており頻繁に変わります。
//       自動検出が外れる場合は下の SELECTORS を調整するか、
//       オーバーレイで手動上書きしてください（手動は常に動作します）。
(() => {
  "use strict";
  if (window.__superMeetingInjected) return;
  window.__superMeetingInjected = true;

  // ---- 調整ポイント（Meet の更新で外れたらここを直す） --------------------
  const SELECTORS = {
    // 参加者タイル。data-participant-id は比較的安定している。
    tile: "[data-participant-id]",
    // タイル内の参加者名の候補。先頭から順に試す。
    name: ["[data-self-name]", '[class*="name"]', "[data-tooltip]"],
    // 「発言中」を示す要素の候補。Meet が話者に付けるアニメ表示など。
    // 環境に合わせて、発言中タイル内の要素を Inspect して class を追記する。
    speaking: [
      ".IisKdb", // 音声レベルのインジケータ（変更されうる）
      '[class*="speaking"]',
    ],
  };
  const UNKNOWN = "不明";
  const POLL_MS = 400;
  // ------------------------------------------------------------------------

  const state = {
    detected: null, // 自動検出した発言者
    manual: null, // 手動上書き（あれば優先）
    transcribing: false,
  };

  function send(message) {
    try {
      chrome.runtime.sendMessage(message);
    } catch {
      /* 拡張のリロード直後など。無視。 */
    }
  }

  // ---- 話者検出 -----------------------------------------------------------
  function getTiles() {
    return Array.from(document.querySelectorAll(SELECTORS.tile));
  }

  function getName(tile) {
    for (const sel of SELECTORS.name) {
      const el = tile.querySelector(sel);
      const text = el && (el.getAttribute("data-self-name") || el.textContent);
      if (text && text.trim()) return text.trim().split("\n")[0].slice(0, 30);
    }
    const aria = tile.getAttribute("aria-label");
    if (aria && aria.trim()) return aria.trim().slice(0, 30);
    const text = (tile.textContent || "").trim();
    return text ? text.split("\n")[0].slice(0, 30) : null;
  }

  function isSpeaking(tile) {
    for (const sel of SELECTORS.speaking) {
      const el = tile.querySelector(sel);
      // 要素が存在し、表示されていれば発言中とみなす（best-effort）。
      if (el && el.offsetParent !== null) return true;
    }
    return false;
  }

  function detectActiveSpeaker() {
    const tiles = getTiles();
    for (const tile of tiles) {
      if (isSpeaking(tile)) {
        const name = getName(tile);
        if (name) return name;
      }
    }
    return null;
  }

  function participantNames() {
    const names = new Set();
    for (const tile of getTiles()) {
      const n = getName(tile);
      if (n) names.add(n);
    }
    return [...names];
  }

  function effectiveSpeaker() {
    return state.manual || state.detected || UNKNOWN;
  }

  // ---- 音声認識 -----------------------------------------------------------
  let recognition = null;
  let stopRequested = false;

  function startTranscription() {
    const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Ctor) {
      setStatus("このブラウザは音声認識に非対応です");
      return;
    }
    stopRequested = false;
    const rec = new Ctor();
    rec.lang = "ja-JP";
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 1;

    rec.onresult = (event) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const text = result[0].transcript;
        if (result.isFinal) {
          const t = text.trim();
          if (t) {
            send({
              type: "SM_SEGMENT",
              text: t,
              speaker: effectiveSpeaker(),
              at: Date.now(),
            });
          }
        } else {
          interim += text;
        }
      }
      if (interim) {
        send({ type: "SM_INTERIM", text: interim, speaker: effectiveSpeaker() });
      }
    };

    rec.onerror = (e) => {
      if (e.error && e.error !== "no-speech" && e.error !== "aborted") {
        setStatus("認識エラー: " + e.error);
      }
    };

    rec.onend = () => {
      // 長時間会議向けに自動再開。
      if (!stopRequested) {
        try {
          rec.start();
        } catch {
          state.transcribing = false;
          renderOverlay();
        }
      } else {
        state.transcribing = false;
        renderOverlay();
      }
    };

    recognition = rec;
    rec.start();
    state.transcribing = true;
    renderOverlay();
  }

  function stopTranscription() {
    stopRequested = true;
    if (recognition) recognition.stop();
    recognition = null;
    state.transcribing = false;
    renderOverlay();
  }

  // ---- オーバーレイ UI ----------------------------------------------------
  let overlay, statusEl, listEl, toggleBtn;

  function buildOverlay() {
    overlay = document.createElement("div");
    overlay.style.cssText = [
      "position:fixed",
      "bottom:16px",
      "right:16px",
      "z-index:2147483647",
      "width:240px",
      "background:rgba(15,23,42,0.95)",
      "color:#e5e7eb",
      "font:12px system-ui,sans-serif",
      "border:1px solid #334155",
      "border-radius:10px",
      "padding:10px",
      "box-shadow:0 8px 24px rgba(0,0,0,0.4)",
    ].join(";");

    const header = document.createElement("div");
    header.style.cssText =
      "display:flex;align-items:center;gap:6px;margin-bottom:6px;font-weight:600;";
    header.innerHTML = "🧠 SuperMeeting";
    overlay.appendChild(header);

    statusEl = document.createElement("div");
    statusEl.style.cssText = "color:#94a3b8;margin-bottom:6px;";
    overlay.appendChild(statusEl);

    toggleBtn = document.createElement("button");
    toggleBtn.style.cssText = [
      "width:100%",
      "padding:6px",
      "margin-bottom:8px",
      "border:none",
      "border-radius:6px",
      "cursor:pointer",
      "font:12px system-ui,sans-serif",
      "color:#fff",
    ].join(";");
    toggleBtn.onclick = () =>
      state.transcribing ? stopTranscription() : startTranscription();
    overlay.appendChild(toggleBtn);

    const label = document.createElement("div");
    label.textContent = "発言者（クリックで手動固定）";
    label.style.cssText = "color:#94a3b8;margin-bottom:4px;";
    overlay.appendChild(label);

    listEl = document.createElement("div");
    listEl.style.cssText = "display:flex;flex-wrap:wrap;gap:4px;";
    overlay.appendChild(listEl);

    document.body.appendChild(overlay);
  }

  function setStatus(text) {
    if (statusEl) statusEl.textContent = text;
  }

  function renderOverlay() {
    if (!overlay) return;
    toggleBtn.textContent = state.transcribing
      ? "■ 書き起こし停止"
      : "● 書き起こし開始";
    toggleBtn.style.background = state.transcribing ? "#dc2626" : "#0284c7";

    const eff = effectiveSpeaker();
    setStatus(
      `現在: ${eff}` +
        (state.manual ? "（手動固定）" : state.detected ? "（自動）" : "（未検出）"),
    );

    const names = participantNames();
    listEl.innerHTML = "";

    const mk = (name, active, onClick) => {
      const b = document.createElement("button");
      b.textContent = name;
      b.onclick = onClick;
      b.style.cssText = [
        "padding:3px 8px",
        "border-radius:999px",
        "border:1px solid " + (active ? "#38bdf8" : "#334155"),
        "background:" + (active ? "#0c4a6e" : "#1e293b"),
        "color:#e5e7eb",
        "cursor:pointer",
        "font:11px system-ui,sans-serif",
      ].join(";");
      return b;
    };

    // 自動に戻すボタン。
    listEl.appendChild(
      mk("自動", state.manual === null, () => {
        state.manual = null;
        renderOverlay();
      }),
    );

    for (const name of names) {
      listEl.appendChild(
        mk(name, state.manual === name, () => {
          state.manual = name;
          renderOverlay();
        }),
      );
    }

    if (names.length === 0) {
      const hint = document.createElement("div");
      hint.style.cssText = "color:#64748b;";
      hint.textContent = "参加者を検出できません（手動入力はアプリ側で可能）";
      listEl.appendChild(hint);
    }
  }

  // ---- 起動 ---------------------------------------------------------------
  function boot() {
    if (!document.body) {
      setTimeout(boot, 500);
      return;
    }
    buildOverlay();
    renderOverlay();
    setInterval(() => {
      state.detected = detectActiveSpeaker();
      renderOverlay();
    }, POLL_MS);
  }

  boot();
})();
