// ================== TETRIS ==================
const canvas = document.getElementById("tetris");
const ctx = canvas.getContext("2d");
const nextCanvas = document.getElementById("next");
const nextCtx = nextCanvas.getContext("2d");
const holdCanvas = document.getElementById("hold");
const holdCtx = holdCanvas.getContext("2d");

const COLS = 10;
const ROWS = 20;
const BLOCK = 30;

ctx.scale(BLOCK, BLOCK);
nextCtx.scale(20, 20);
holdCtx.scale(20, 20);

const COLORS = [
  null,
  "#00f0f0", // I - cyan
  "#0000f0", // J - blue
  "#f0a000", // L - orange
  "#f0f000", // O - yellow
  "#00f000", // S - green
  "#a000f0", // T - purple
  "#f00000"  // Z - red
];

const GHOST_COLOR = "rgba(255, 255, 255, 0.22)";

const SHAPES = [
  [],
  [[0,0,0,0], [1,1,1,1], [0,0,0,0], [0,0,0,0]], // I
  [[2,0,0], [2,2,2], [0,0,0]],                   // J
  [[0,0,3], [3,3,3], [0,0,0]],                   // L
  [[4,4], [4,4]],                               // O
  [[0,5,5], [5,5,0], [0,0,0]],                   // S
  [[0,6,0], [6,6,6], [0,0,0]],                   // T
  [[7,7,0], [0,7,7], [0,0,0]]                    // Z
];

let board = createBoard();
let piece = null;
let nextPiece = null;
let holdPiece = null;
let canHold = true;
let score = 0;
let lines = 0;
let level = 1;
let dropCounter = 0;
let dropInterval = 1000;
let lastTime = 0;
let paused = false;
let gameOver = false;
let animationId = null;

function createBoard() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(0));
}

function createPiece(type) {
  if (!type) type = Math.floor(Math.random() * 7) + 1;
  const shape = SHAPES[type].map(row => [...row]);
  return {
    type,
    shape,
    x: Math.floor(COLS / 2) - Math.ceil(shape[0].length / 2),
    y: 0
  };
}

function drawBlock(context, x, y, color, isGhost = false) {
  if (isGhost) {
    context.fillStyle = GHOST_COLOR;
    context.fillRect(x + 0.08, y + 0.08, 0.84, 0.84);
    context.strokeStyle = "rgba(255,255,255,0.5)";
    context.lineWidth = 0.07;
    context.strokeRect(x + 0.08, y + 0.08, 0.84, 0.84);
  } else {
    context.fillStyle = color;
    context.fillRect(x, y, 1, 1);

    // highlight
    context.fillStyle = "rgba(255,255,255,0.35)";
    context.fillRect(x, y, 1, 0.18);
    context.fillRect(x, y, 0.18, 1);

    // shadow
    context.fillStyle = "rgba(0,0,0,0.3)";
    context.fillRect(x, y + 0.82, 1, 0.18);
    context.fillRect(x + 0.82, y, 0.18, 1);

    context.strokeStyle = "rgba(0,0,0,0.4)";
    context.lineWidth = 0.04;
    context.strokeRect(x, y, 1, 1);
  }
}

function drawBoard() {
  ctx.fillStyle = "#0a1628";
  ctx.fillRect(0, 0, COLS, ROWS);

  // subtle grid
  ctx.strokeStyle = "rgba(255,255,255,0.05)";
  ctx.lineWidth = 0.03;
  for (let x = 0; x <= COLS; x++) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, ROWS);
    ctx.stroke();
  }
  for (let y = 0; y <= ROWS; y++) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(COLS, y);
    ctx.stroke();
  }

  board.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value) drawBlock(ctx, x, y, COLORS[value]);
    });
  });
}

function getGhostY(p) {
  let ghostY = p.y;
  while (true) {
    ghostY++;
    const test = { ...p, y: ghostY };
    if (collide(test)) {
      return ghostY - 1;
    }
  }
}

function drawGhost(p) {
  const ghostY = getGhostY(p);
  if (ghostY <= p.y) return;

  p.shape.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value) {
        drawBlock(ctx, p.x + x, ghostY + y, null, true);
      }
    });
  });
}

function drawPiece(p) {
  p.shape.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value) {
        drawBlock(ctx, p.x + x, p.y + y, COLORS[value]);
      }
    });
  });
}

function drawMini(context, p) {
  context.fillStyle = "#0c1a2e";
  context.fillRect(0, 0, 6, 6);

  if (!p) return;

  const shape = p.shape;
  const offsetX = (6 - shape[0].length) / 2;
  const offsetY = (6 - shape.length) / 2;

  shape.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value) {
        drawBlock(context, offsetX + x, offsetY + y, COLORS[value]);
      }
    });
  });
}

function collide(p) {
  for (let y = 0; y < p.shape.length; y++) {
    for (let x = 0; x < p.shape[y].length; x++) {
      if (
        p.shape[y][x] &&
        (board[p.y + y] === undefined ||
         board[p.y + y][p.x + x] === undefined ||
         board[p.y + y][p.x + x])
      ) {
        return true;
      }
    }
  }
  return false;
}

function merge(p) {
  p.shape.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value) {
        board[p.y + y][p.x + x] = value;
      }
    });
  });
}

function rotate(shape) {
  const N = shape.length;
  const result = Array.from({ length: N }, () => Array(N).fill(0));
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      result[x][N - 1 - y] = shape[y][x];
    }
  }
  return result;
}

function playerRotate() {
  const oldShape = piece.shape;
  piece.shape = rotate(piece.shape);
  if (collide(piece)) {
    const kicks = [-1, 1, -2, 2];
    let kicked = false;
    for (const k of kicks) {
      piece.x += k;
      if (!collide(piece)) {
        kicked = true;
        break;
      }
      piece.x -= k;
    }
    if (!kicked) piece.shape = oldShape;
  }
}

function clearLines() {
  let cleared = 0;
  outer: for (let y = ROWS - 1; y >= 0; y--) {
    for (let x = 0; x < COLS; x++) {
      if (!board[y][x]) continue outer;
    }
    board.splice(y, 1);
    board.unshift(Array(COLS).fill(0));
    cleared++;
    y++;
  }

  if (cleared > 0) {
    const points = [0, 100, 300, 500, 800];
    score += points[cleared] * level;
    lines += cleared;
    level = Math.floor(lines / 10) + 1;
    dropInterval = Math.max(100, 1000 - (level - 1) * 80);

    document.getElementById("score").textContent = score;
    document.getElementById("lines").textContent = lines;
    document.getElementById("level").textContent = level;
  }
}

function drop() {
  piece.y++;
  if (collide(piece)) {
    piece.y--;
    merge(piece);
    clearLines();
    piece = nextPiece;
    nextPiece = createPiece();
    canHold = true;
    drawMini(nextCtx, nextPiece);

    if (collide(piece)) {
      gameOver = true;
      document.getElementById("final-score").textContent = score;
      document.getElementById("game-over").classList.remove("hidden");
      cancelAnimationFrame(animationId);
    }
  }
  dropCounter = 0;
}

function hardDrop() {
  while (!collide(piece)) {
    piece.y++;
  }
  piece.y--;
  drop();
}

function move(dir) {
  piece.x += dir;
  if (collide(piece)) piece.x -= dir;
}

function hold() {
  if (!canHold) return;

  if (holdPiece === null) {
    holdPiece = { type: piece.type, shape: SHAPES[piece.type].map(r => [...r]) };
    piece = nextPiece;
    nextPiece = createPiece();
    drawMini(nextCtx, nextPiece);
  } else {
    const tempType = holdPiece.type;
    holdPiece = { type: piece.type, shape: SHAPES[piece.type].map(r => [...r]) };
    piece = createPiece(tempType);
  }

  piece.x = Math.floor(COLS / 2) - Math.ceil(piece.shape[0].length / 2);
  piece.y = 0;
  canHold = false;
  drawMini(holdCtx, holdPiece);
}

function update(time = 0) {
  if (paused || gameOver) return;

  const delta = time - lastTime;
  lastTime = time;
  dropCounter += delta;

  if (dropCounter > dropInterval) {
    drop();
  }

  drawBoard();
  drawGhost(piece);   // ghost shadow
  drawPiece(piece);
  animationId = requestAnimationFrame(update);
}

function startGame() {
  board = createBoard();
  score = 0;
  lines = 0;
  level = 1;
  dropInterval = 1000;
  gameOver = false;
  paused = false;
  holdPiece = null;
  canHold = true;

  document.getElementById("score").textContent = "0";
  document.getElementById("lines").textContent = "0";
  document.getElementById("level").textContent = "1";
  document.getElementById("game-over").classList.add("hidden");

  holdCtx.fillStyle = "#0c1a2e";
  holdCtx.fillRect(0, 0, 6, 6);

  piece = createPiece();
  nextPiece = createPiece();
  drawMini(nextCtx, nextPiece);
  lastTime = 0;
  update();
}

function restartGame() {
  cancelAnimationFrame(animationId);
  startGame();
}

document.addEventListener("keydown", e => {
  if (document.getElementById("popup") && !document.getElementById("popup").classList.contains("hidden")) return;
  if (gameOver) return;

  if (e.code === "KeyP") {
    paused = !paused;
    if (!paused) {
      lastTime = performance.now();
      update();
    }
    return;
  }

  if (paused) return;

  switch (e.code) {
    case "ArrowLeft":
      move(-1);
      break;
    case "ArrowRight":
      move(1);
      break;
    case "ArrowDown":
      drop();
      break;
    case "ArrowUp":
      playerRotate();
      break;
    case "Space":
      e.preventDefault();
      hardDrop();
      break;
    case "KeyC":
      hold();
      break;
  }
});

function answerYes() {
  document.getElementById("popup").classList.add("hidden");
  document.getElementById("game-screen").classList.remove("hidden");
  startGame();
}

function answerNo() {
  const box = document.querySelector(".popup-box");
  box.innerHTML = `
    <h2>😂 Respect.</h2>
    <p class="question">At least you're honest.</p>
    <p class="sub">Go play Tetris anyway.<br>We'll pretend this never happened.</p>
    <div class="popup-buttons">
      <button onclick="answerYes()">Okay, let's go!</button>
    </div>
    <p class="credit">Made by Leigh</p>
  `;
}

document.getElementById("popup").classList.remove("hidden");
