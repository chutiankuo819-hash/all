const BACKEND_HTTP_URL = "https://friend-game-hall-backend.chutiankuo819.workers.dev";
const PLAYER_ID_KEY = "friendGameHallPlayerId";
const NAME_KEY = "partyNickname";

const gameRules = {
  baccarat: rule("百家乐", "下注闲、庄、和，等待系统发牌结算。", "2-5 人", "棋牌筹码，可申请当庄", ["玩家下注闲、庄或和。", "闲家和庄家各发两张牌。", "系统按百家乐规则补牌。", "结算后记录路单。"], ["闲赢 1:1，庄赢 0.95:1，和赢 8:1。", "和局时押闲/庄退回本金。"], ["点数只看个位数。", "10/J/Q/K 算 0，A 算 1。"]),
  sevenUpEightDown: rule("7上8下", "猜数字落在 7 上、8 下或触发特殊点。", "2-5 人", "棋牌筹码或惩罚分", ["下注 7 上、8 下或特殊。", "系统开出数字。", "根据点数结算。"], ["大于 8 为 7 上赢，小于 7 为 8 下赢。", "等于 7 或 8 触发特殊。"], ["朋友局轻量规则，特殊点可接惩罚。"]),
  niuniu: rule("终极牛牛", "五张牌算牛型，闲家和庄家比较。", "2-5 人", "棋牌筹码，可申请当庄", ["确定庄家。", "闲家下注。", "每人发 5 张牌。", "系统自动算牛并结算。"], ["任意 3 张合计为 10 的倍数则有牛。", "剩余 2 张取个位数决定牛几。"], ["保留牛牛、五花牛、四花牛、炸弹、五小牛。"]),
  liarsDice: rule("吹牛摇骰子", "轮流喊数量和点数，判断对方有没有吹牛。", "2-5 人", "默认输家加惩罚分", ["每人默认 5 个骰子。", "轮流喊“数量 + 点数”。", "下家加码或开牌质疑。"], ["实际数量够，喊的人赢；不足，喊的人输。"], ["默认 1 点万能；喊过 1 后本轮不再万能。"]),
  blackjack: rule("21点", "赌场玩法，玩家对庄家，比谁更接近 21 点。", "2-5 人", "棋牌筹码，可申请当庄", ["玩家下注。", "玩家两张明牌，庄家一明一暗。", "玩家要牌、停牌、加倍或分牌。", "庄家 16 以下要牌，17 以上停牌。"], ["Blackjack 赔 3:2，普通胜利 1:1，平局退注。"], ["A 算 1 或 11；第一版不做保险和投降。"]),
  zhajinhua: rule("炸金花", "三张牌暗战，比牌型、下注和胆量。", "2-5 人", "棋牌筹码", ["每人下底注。", "每人发 3 张暗牌。", "轮流看牌、跟注、加注、弃牌或比牌。"], ["牌型从大到小：豹子、顺金、金花、顺子、对子、单张。"], ["A 最大，A23 最小顺子，QKA 最大顺子。"]),
  truth: rule("真心话", "随机抽人回答问题，朋友投票判定。", "2-5 人", "派对惩罚分", ["系统随机选人。", "被选玩家抽题回答。", "其他玩家投票通过或不通过。"], ["不回答、跳过或未通过加惩罚分。"], ["普通题库和成人朋友局题库可分开。"]),
  dare: rule("大冒险", "抽挑战，完成后由朋友投票确认。", "2-5 人", "派对惩罚分", ["系统随机选人。", "抽取挑战。", "完成后其他玩家确认。"], ["失败、拒绝或未通过加惩罚分。"], ["挑战只显示文字，不要求上传证明。"]),
  vote: rule("指认投票", "看题目投票指认，得票最多的人受罚。", "3-5 人推荐", "派对惩罚分", ["系统展示题目。", "所有人投票给一名玩家。", "系统统计结果。"], ["得票最多者加惩罚分，平票可都加分。"], ["适合熟人局，可匿名或公开。"]),
  mostLikely: rule("谁最可能", "谁最可能做某事，朋友投票见分晓。", "3-5 人推荐", "派对惩罚分", ["系统展示“谁最可能”题目。", "所有玩家投票。", "公布结果。"], ["得票最高者加惩罚分。"], ["题库可切普通或成人朋友局。"]),
  bombPass: rule("炸弹传递", "轮流完成任务传炸弹，爆在谁手里谁受罚。", "2-5 人", "派对惩罚分", ["系统生成隐藏回合数。", "玩家完成任务后传给下家。", "隐藏回合结束时爆炸。"], ["爆炸时持有炸弹的人加惩罚分。"], ["第一版使用回合制隐藏计数。"]),
  oldMaid: rule("抽鬼牌", "轮流抽牌配对，最后剩鬼牌的人输。", "2-5 人", "惩罚分或棋牌筹码", ["发牌后先丢对子。", "轮流从下家抽一张。", "抽到对子就丢掉。"], ["最后剩鬼牌或无法配对牌的人输。"], ["默认自动识别对子。"]),
  highCard: rule("比大小", "每人翻一张牌，点数最大者赢本轮。", "2-5 人", "棋牌筹码", ["每人下同额筹码。", "每人发一张牌。", "公开比较点数。"], ["点数最大者赢底池，平局补牌。"], ["A 最大，花色默认不比大小。"]),
  memoryCards: rule("记忆翻牌", "轮流翻两张牌，记住位置找配对。", "2-5 人", "游戏得分或惩罚分", ["桌面放置成对暗牌。", "玩家轮流翻两张。", "配对成功得分并继续。"], ["所有牌配对后分数最高者赢。"], ["牌面翻开信息对所有玩家可见。"])
};

const gameOrder = ["baccarat", "sevenUpEightDown", "niuniu", "liarsDice", "blackjack", "zhajinhua", "truth", "dare", "vote", "mostLikely", "bombPass", "oldMaid", "highCard", "memoryCards"];

const els = {
  joinScreen: document.getElementById("join-screen"),
  appShell: document.getElementById("app-shell"),
  nickname: document.getElementById("nickname"),
  roomInput: document.getElementById("room-input"),
  createRoom: document.getElementById("create-room"),
  joinRoom: document.getElementById("join-room"),
  gameList: document.getElementById("game-list"),
  gameTitle: document.getElementById("game-title"),
  gameSummary: document.getElementById("game-summary"),
  statusDot: document.getElementById("status-dot"),
  connectionText: document.getElementById("connection-text"),
  roomCodeLabel: document.getElementById("room-code-label"),
  copyRoom: document.getElementById("copy-room"),
  playerList: document.getElementById("player-list"),
  roundResult: document.getElementById("round-result"),
  logList: document.getElementById("log-list"),
  startRound: document.getElementById("start-round"),
  randomPlayer: document.getElementById("random-player"),
  clearLog: document.getElementById("clear-log"),
  leaveRoom: document.getElementById("leave-room"),
  ruleButton: document.getElementById("rule-button"),
  ruleOverlay: document.getElementById("rule-overlay"),
  ruleTitle: document.getElementById("rule-title"),
  ruleBody: document.getElementById("rule-body"),
  closeRule: document.getElementById("close-rule"),
  chipPlus: document.getElementById("chip-plus"),
  chipMinus: document.getElementById("chip-minus"),
  penaltyPlus: document.getElementById("penalty-plus"),
  penaltyMinus: document.getElementById("penalty-minus")
};

let socket;
let reconnectTimer;
let reconnectAttempts = 0;
let roomCode = "";
let nickname = "";
let playerId = getOrCreatePlayerId();
let currentGameId = "baccarat";
let roomState = { players: [], logs: [], roundResult: "" };

renderGameList();
loadFromUrl();

els.createRoom.addEventListener("click", () => {
  els.roomInput.value = Math.random().toString(36).slice(2, 8).toUpperCase();
});
els.joinRoom.addEventListener("click", joinRoom);
els.copyRoom.addEventListener("click", copyRoom);
els.leaveRoom.addEventListener("click", leaveRoom);
els.startRound.addEventListener("click", () => send({ type: "startRound" }));
els.randomPlayer.addEventListener("click", () => send({ type: "randomPlayer" }));
els.clearLog.addEventListener("click", () => send({ type: "clearLog" }));
els.ruleButton.addEventListener("click", openRules);
els.closeRule.addEventListener("click", closeRules);
els.ruleOverlay.addEventListener("click", (event) => {
  if (event.target === els.ruleOverlay) closeRules();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeRules();
});
els.chipPlus.addEventListener("click", () => send({ type: "changeScore", chips: 100 }));
els.chipMinus.addEventListener("click", () => send({ type: "changeScore", chips: -100 }));
els.penaltyPlus.addEventListener("click", () => send({ type: "changeScore", penalty: 1 }));
els.penaltyMinus.addEventListener("click", () => send({ type: "changeScore", penalty: -1 }));

function rule(name, summary, players, score, flow, win, special) {
  return { name, summary, players, score, goal: summary, flow, win, special };
}

function joinRoom() {
  nickname = (els.nickname.value || localStorage.getItem(NAME_KEY) || "").trim();
  roomCode = (els.roomInput.value || "").trim().toUpperCase();
  if (!nickname) return alert("先输入昵称。");
  if (!roomCode) return alert("先输入房间码，或点击生成房间码。");

  localStorage.setItem(NAME_KEY, nickname);
  history.replaceState(null, "", `${location.pathname}#room=${encodeURIComponent(roomCode)}`);
  els.roomCodeLabel.textContent = roomCode;
  els.joinScreen.classList.add("hidden");
  els.appShell.classList.remove("hidden");
  connect();
}

function connect() {
  clearTimeout(reconnectTimer);
  setConnection(false, "连接后端中");

  socket = new WebSocket(`${backendWebSocketUrl()}/room/${encodeURIComponent(roomCode)}`);

  socket.addEventListener("open", () => {
    reconnectAttempts = 0;
    setConnection(true, "已连接后端");
    send({ type: "join", nickname, playerId });
  });

  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (message.type === "state") {
      roomState = message.state;
      currentGameId = roomState.gameId || "baccarat";
      renderAll();
    } else if (message.type === "joined") {
      playerId = message.playerId;
      localStorage.setItem(PLAYER_ID_KEY, playerId);
    } else if (message.type === "error") {
      alert(message.message || "后端返回错误。");
    }
  });

  socket.addEventListener("close", scheduleReconnect);
  socket.addEventListener("error", () => setConnection(false, "连接异常"));
}

function scheduleReconnect() {
  setConnection(false, "连接断开，重连中");
  reconnectAttempts += 1;
  reconnectTimer = setTimeout(connect, Math.min(8000, 800 * reconnectAttempts));
}

function send(message) {
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    alert("后端还没连上，请稍等一下。");
    return;
  }
  socket.send(JSON.stringify(message));
}

function renderGameList() {
  els.gameList.innerHTML = "";
  gameOrder.forEach((gameId) => {
    const game = gameRules[gameId];
    const button = document.createElement("button");
    button.className = "game-tab";
    button.type = "button";
    button.dataset.gameId = gameId;
    button.innerHTML = `<strong>${game.name}</strong><span>${game.summary}</span>`;
    button.addEventListener("click", () => send({ type: "selectGame", gameId }));
    els.gameList.appendChild(button);
  });
}

function renderAll() {
  const game = gameRules[currentGameId] || gameRules.baccarat;
  els.gameTitle.textContent = game.name;
  els.gameSummary.textContent = game.summary;
  els.roundResult.textContent = roomState.roundResult || "还没有开始。选择一个游戏，然后点击“开始一轮”。";
  document.querySelectorAll(".game-tab").forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.gameId === currentGameId);
  });
  renderPlayers();
  renderLogs();
}

function renderPlayers() {
  const records = (roomState.players || []).slice(0, 5);
  els.playerList.innerHTML = records.map((player) => `
    <li class="player">
      <strong>${escapeHtml(player.name)}${player.id === playerId ? "<span>我</span>" : ""}</strong>
      <span>筹码：${player.chips ?? 1000} · 惩罚：${player.penalty ?? 0} · ${player.online ? "在线" : "离线"}</span>
    </li>
  `).join("") || "<li class='player'><span>等待玩家加入</span></li>";
}

function renderLogs() {
  els.logList.innerHTML = (roomState.logs || []).slice(-40).reverse().map((item) => `<li>${escapeHtml(item)}</li>`).join("");
}

function openRules() {
  const game = gameRules[currentGameId] || gameRules.baccarat;
  els.ruleTitle.textContent = `${game.name}规则`;
  els.ruleBody.innerHTML = `
    <div class="rule-meta">
      <span class="rule-tag">适合人数：${game.players}</span>
      <span class="rule-tag">${game.score}</span>
    </div>
    ${section("游戏目标", game.goal)}
    ${section("操作流程", game.flow)}
    ${section("胜负 / 结算", game.win)}
    ${section("特殊规则", game.special)}
  `;
  els.ruleOverlay.classList.add("open");
  els.closeRule.focus();
}

function closeRules() {
  els.ruleOverlay.classList.remove("open");
  if (!els.appShell.classList.contains("hidden")) els.ruleButton.focus();
}

function section(title, items) {
  const body = Array.isArray(items) ? `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>` : `<p>${escapeHtml(items)}</p>`;
  return `<section class="rule-section"><h3>${title}</h3>${body}</section>`;
}

async function copyRoom() {
  const text = els.roomCodeLabel.textContent;
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    alert(`房间码：${text}`);
  }
}

function leaveRoom() {
  if (socket?.readyState === WebSocket.OPEN) send({ type: "leave" });
  location.href = location.pathname;
}

function loadFromUrl() {
  const params = new URLSearchParams(location.hash.slice(1));
  const room = params.get("room");
  const savedName = localStorage.getItem(NAME_KEY) || "";
  if (savedName) els.nickname.value = savedName;
  if (room) els.roomInput.value = room.toUpperCase();
}

function backendWebSocketUrl() {
  const params = new URLSearchParams(location.search);
  const configured = params.get("server") || localStorage.getItem("friendGameServerUrl") || BACKEND_HTTP_URL;
  return configured.replace(/^http:/, "ws:").replace(/^https:/, "wss:").replace(/\/$/, "");
}

function setConnection(online, text) {
  els.statusDot.classList.toggle("online", online);
  els.connectionText.textContent = text;
}

function getOrCreatePlayerId() {
  const existing = localStorage.getItem(PLAYER_ID_KEY);
  if (existing) return existing;
  const next = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  localStorage.setItem(PLAYER_ID_KEY, next);
  return next;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[char]));
}
