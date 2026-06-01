const DEFAULT_GAME = "baccarat";
const MAX_PLAYERS = 5;

const GAME_NAMES = {
  baccarat: "百家乐",
  sevenUpEightDown: "7上8下",
  niuniu: "终极牛牛",
  liarsDice: "吹牛摇骰子",
  blackjack: "21点",
  zhajinhua: "炸金花",
  truth: "真心话",
  dare: "大冒险",
  vote: "指认投票",
  mostLikely: "谁最可能",
  bombPass: "炸弹传递",
  oldMaid: "抽鬼牌",
  highCard: "比大小",
  memoryCards: "记忆翻牌",
};

const QUESTIONS = [
  "谁最容易迟到？",
  "谁最会装淡定？",
  "谁最可能偷偷喜欢朋友？",
  "谁最容易冲动消费？",
  "谁最会讲冷笑话？",
  "谁最像今晚的气氛担当？",
];

const DARES = [
  "用夸张语气读出最近一条普通消息。",
  "模仿一位朋友 10 秒。",
  "给大家讲一个尴尬小故事。",
  "闭眼描述房间里三样东西。",
];

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders() });
    }

    if (url.pathname === "/health") {
      return json({ ok: true, service: "friend-game-hall-backend" });
    }

    const match = url.pathname.match(/^\/room\/([A-Za-z0-9_-]{2,32})$/);
    if (!match) {
      return json({ error: "Not found" }, 404);
    }

    const roomCode = match[1].toUpperCase();
    const id = env.GAME_ROOM.idFromName(roomCode);
    const room = env.GAME_ROOM.get(id);
    return room.fetch(request);
  },
};

export class GameRoom {
  constructor(state) {
    this.state = state;
    this.sessions = new Map();
    this.room = null;
  }

  async fetch(request) {
    const upgrade = request.headers.get("Upgrade");
    if (upgrade !== "websocket") {
      return json({ error: "Expected WebSocket" }, 426);
    }

    await this.loadRoom();

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    server.accept();

    const sessionId = crypto.randomUUID();
    this.sessions.set(sessionId, { socket: server, playerId: null });

    server.addEventListener("message", (event) => this.onMessage(sessionId, event.data));
    server.addEventListener("close", () => this.onClose(sessionId));
    server.addEventListener("error", () => this.onClose(sessionId));

    this.send(sessionId, { type: "welcome", sessionId });
    this.sendState(sessionId);

    return new Response(null, { status: 101, webSocket: client });
  }

  async loadRoom() {
    if (this.room) return;
    this.room = await this.state.storage.get("room");
    if (!this.room) {
      this.room = {
        gameId: DEFAULT_GAME,
        players: {},
        playerOrder: [],
        logs: [],
        roundResult: "还没有开始。选择一个游戏，然后点击“开始一轮”。",
        updatedAt: Date.now(),
      };
      await this.saveRoom();
    }
  }

  async saveRoom() {
    this.room.updatedAt = Date.now();
    await this.state.storage.put("room", this.room);
  }

  async onMessage(sessionId, raw) {
    let message;
    try {
      message = JSON.parse(raw);
    } catch {
      this.send(sessionId, { type: "error", message: "消息格式错误。" });
      return;
    }

    await this.loadRoom();

    if (message.type === "join") {
      await this.join(sessionId, message);
      return;
    }

    const session = this.sessions.get(sessionId);
    if (!session?.playerId || !this.room.players[session.playerId]) {
      this.send(sessionId, { type: "error", message: "请先进入房间。" });
      return;
    }

    if (message.type === "selectGame") {
      await this.selectGame(session.playerId, message.gameId);
    } else if (message.type === "startRound") {
      await this.startRound(session.playerId);
    } else if (message.type === "randomPlayer") {
      await this.randomPlayer(session.playerId);
    } else if (message.type === "changeScore") {
      await this.changeScore(session.playerId, message);
    } else if (message.type === "clearLog") {
      this.room.logs = [];
      await this.saveRoom();
      this.broadcastState();
    } else if (message.type === "leave") {
      await this.removePlayer(sessionId);
    }
  }

  async join(sessionId, message) {
    const nickname = sanitizeName(message.nickname);
    if (!nickname) {
      this.send(sessionId, { type: "error", message: "昵称不能为空。" });
      return;
    }

    const existingCount = Object.keys(this.room.players).length;
    const session = this.sessions.get(sessionId);
    const playerId = sanitizeId(message.playerId) || crypto.randomUUID();

    if (!this.room.players[playerId] && existingCount >= MAX_PLAYERS) {
      this.send(sessionId, { type: "error", message: "房间已满，最多 5 人。" });
      return;
    }

    session.playerId = playerId;
    if (!this.room.players[playerId]) {
      this.room.players[playerId] = { id: playerId, name: nickname, chips: 1000, penalty: 0, online: true };
      this.room.playerOrder.push(playerId);
      this.addLog(`${nickname} 进入房间`);
    } else {
      this.room.players[playerId].name = nickname;
      this.room.players[playerId].online = true;
      this.addLog(`${nickname} 重新连接`);
    }

    await this.saveRoom();
    this.send(sessionId, { type: "joined", playerId });
    this.broadcastState();
  }

  async selectGame(playerId, gameId) {
    if (!GAME_NAMES[gameId]) return;
    this.room.gameId = gameId;
    this.room.roundResult = `已切换到《${GAME_NAMES[gameId]}》。点击左上角问号查看规则。`;
    this.addLog(`${this.room.players[playerId].name} 切换游戏：${GAME_NAMES[gameId]}`);
    await this.saveRoom();
    this.broadcastState();
  }

  async startRound(playerId) {
    const gameId = this.room.gameId || DEFAULT_GAME;
    const result = generateRound(gameId, this.activePlayers());
    this.room.roundResult = result;
    this.addLog(`${this.room.players[playerId].name} 开始《${GAME_NAMES[gameId]}》：${result.replace(/\n/g, " / ")}`);
    await this.saveRoom();
    this.broadcastState();
  }

  async randomPlayer(playerId) {
    const players = this.activePlayers();
    if (!players.length) return;
    const picked = pick(players);
    const text = `随机选中：${picked.name}`;
    this.room.roundResult = text;
    this.addLog(`${this.room.players[playerId].name} ${text}`);
    await this.saveRoom();
    this.broadcastState();
  }

  async changeScore(playerId, message) {
    const player = this.room.players[playerId];
    const chipsDelta = clampNumber(message.chips, -10000, 10000);
    const penaltyDelta = clampNumber(message.penalty, -100, 100);
    player.chips = Math.max(0, (player.chips || 0) + chipsDelta);
    player.penalty = Math.max(0, (player.penalty || 0) + penaltyDelta);
    await this.saveRoom();
    this.broadcastState();
  }

  async onClose(sessionId) {
    await this.removePlayer(sessionId, true);
  }

  async removePlayer(sessionId, keepSeat = false) {
    const session = this.sessions.get(sessionId);
    this.sessions.delete(sessionId);
    if (!session?.playerId || !this.room?.players[session.playerId]) return;

    const player = this.room.players[session.playerId];
    if (keepSeat) {
      player.online = false;
      this.addLog(`${player.name} 暂时离线`);
    } else {
      delete this.room.players[session.playerId];
      this.room.playerOrder = this.room.playerOrder.filter((id) => id !== session.playerId);
      this.addLog(`${player.name} 离开房间`);
    }

    await this.saveRoom();
    this.broadcastState();
  }

  activePlayers() {
    return this.room.playerOrder.map((id) => this.room.players[id]).filter(Boolean).slice(0, MAX_PLAYERS);
  }

  addLog(message) {
    const stamp = new Date().toLocaleTimeString("zh-CN", { hour12: false });
    this.room.logs.push(`${stamp} ${message}`);
    this.room.logs = this.room.logs.slice(-60);
  }

  sendState(sessionId) {
    this.send(sessionId, { type: "state", state: publicRoomState(this.room) });
  }

  broadcastState() {
    this.broadcast({ type: "state", state: publicRoomState(this.room) });
  }

  send(sessionId, message) {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    try {
      session.socket.send(JSON.stringify(message));
    } catch {
      this.sessions.delete(sessionId);
    }
  }

  broadcast(message) {
    const payload = JSON.stringify(message);
    for (const [sessionId, session] of this.sessions) {
      try {
        session.socket.send(payload);
      } catch {
        this.sessions.delete(sessionId);
      }
    }
  }
}

function publicRoomState(room) {
  return {
    gameId: room.gameId,
    players: room.playerOrder.map((id) => room.players[id]).filter(Boolean).slice(0, MAX_PLAYERS),
    logs: room.logs,
    roundResult: room.roundResult,
    updatedAt: room.updatedAt,
  };
}

function generateRound(gameId, players) {
  const deck = makeDeck();
  const names = players.map((player) => player.name).slice(0, MAX_PLAYERS);

  if (gameId === "liarsDice") return names.map((name) => `${name} 摇到：${Array.from({ length: 5 }, () => rand(1, 6)).join(" ")}`).join("\n");
  if (gameId === "blackjack") return names.map((name) => `${name}: ${draw(deck, 2).join(" ")}，庄家: ${draw(deck, 2).join(" ")}`).join("\n");
  if (gameId === "zhajinhua") return names.map((name) => `${name}: ${draw(deck, 3).join(" ")}`).join("\n");
  if (gameId === "baccarat") return `闲家：${draw(deck, 2).join(" ")}\n庄家：${draw(deck, 2).join(" ")}\n请按点数判断闲、庄、和。`;
  if (gameId === "niuniu") return names.map((name) => `${name}: ${draw(deck, 5).join(" ")}`).join("\n");
  if (gameId === "sevenUpEightDown") {
    const n = rand(1, 13);
    return `开出点数：${n}\n${n > 8 ? "7上赢" : n < 7 ? "8下赢" : "触发特殊点"}`;
  }
  if (gameId === "truth") return `真心话：${pick(QUESTIONS)}`;
  if (gameId === "dare") return `大冒险：${pick(DARES)}`;
  if (gameId === "vote") return `指认投票：${pick(QUESTIONS)}`;
  if (gameId === "mostLikely") return `谁最可能：${pick(QUESTIONS)}`;
  if (gameId === "bombPass") return `炸弹传递开始。隐藏爆炸回合：${rand(3, 9)}。`;
  if (gameId === "oldMaid") return "抽鬼牌开始。系统已洗牌，按顺序抽下家一张牌。";
  if (gameId === "highCard") return names.map((name) => `${name}: ${draw(deck, 1).join(" ")}`).join("\n");
  if (gameId === "memoryCards") return "记忆翻牌开始。按顺序翻两张，配对成功得分。";
  return "本轮开始。";
}

function makeDeck() {
  const suits = ["♠", "♥", "♣", "♦"];
  const ranks = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
  const deck = [];
  for (const suit of suits) {
    for (const rank of ranks) deck.push(`${rank}${suit}`);
  }
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function draw(deck, count) {
  return deck.splice(0, count);
}

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function sanitizeName(value) {
  return String(value || "").trim().slice(0, 12);
}

function sanitizeId(value) {
  return String(value || "").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64);
}

function clampNumber(value, min, max) {
  const number = Number(value || 0);
  if (!Number.isFinite(number)) return 0;
  return Math.max(min, Math.min(max, number));
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...corsHeaders() },
  });
}

function corsHeaders() {
  return {
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET, OPTIONS",
    "access-control-allow-headers": "content-type",
  };
}
