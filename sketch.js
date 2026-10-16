// =====================================================================
//  答題拼圖：雨過天晴（p5.js）
//
//  玩法：
//   1. 每一塊拼圖一開始都是鎖住的（顯示「?」），點一下會跳出一道題目。
//   2. 選出答案後，那一塊就會解鎖（答錯也會解鎖，只是不計分）。
//   3. 把解鎖的拼圖拖到左邊（手機是上方）的拼圖板，位置對了會自動吸附。
//   4. 全部拼好會出現完整的圖畫，並顯示答對題數、分數和用時。
//
//  只需要這個 sketch.js，搭配原本的 index.html 與 libraries 即可執行。
// =====================================================================


// ---------------------------------------------------------------------
// 1. 設定（老師修改這裡就好）
// ---------------------------------------------------------------------
const PUZZLE_TITLE = "答題拼圖：雨過天晴";
const PICTURE_NAME = "雨過天晴";     // 拼完後顯示的圖畫名稱
const GRID = { cols: 3, rows: 3 };   // 3×3＝9 塊；題目數量最好和塊數一樣

// 想用自己的圖片（例如班級合照、台灣地圖）：填入網址或檔名，例如 "media/taiwan.jpg"
// 留空 "" 會使用程式畫的內建圖。自備圖片需用 Live Server 或架在網站 / NAS 上開啟。
const IMAGE_URL = "";

// 題目：q 題目、options 選項（2～4 個，會自動打亂）、answer 正確答案、explain 解說
const QUESTIONS = [
  { q: "雨停後，天空出現七種顏色的彎彎拱橋，叫做什麼？", options: ["彩虹", "閃電", "流星"], answer: "彩虹",
    explain: "陽光照到空氣中的小水滴，被分成七種顏色，就形成彩虹。" },
  { q: "彩虹最容易在什麼時候看到？", options: ["雨剛停、太陽出來時", "半夜睡覺時", "下大雪的時候"], answer: "雨剛停、太陽出來時",
    explain: "要同時有陽光和空氣中的小水滴，所以雨剛停、太陽出來時最容易看到。" },
  { q: "下雨天出門，最需要帶什麼？", options: ["雨傘", "太陽眼鏡", "扇子"], answer: "雨傘",
    explain: "帶雨傘或穿雨衣，才不會被雨淋濕。" },
  { q: "天上的雲是由什麼組成的？", options: ["很多很小的水滴", "棉花", "煙"], answer: "很多很小的水滴",
    explain: "水蒸氣升到高空變冷，變成很多很小的水滴或冰晶，聚在一起就是雲。" },
  { q: "打雷閃電時，哪裡最安全？", options: ["室內，遠離窗戶", "大樹下面", "空曠的操場"], answer: "室內，遠離窗戶",
    explain: "大樹和空曠的地方容易被雷打到，待在室內最安全。" },
  { q: "想知道今天幾度，要用什麼工具？", options: ["溫度計", "尺", "時鐘"], answer: "溫度計",
    explain: "溫度計可以量出氣溫是幾度。" },
  { q: "風向袋（像大襪子的布袋）是用來看什麼的？", options: ["風從哪裡吹來", "下了多少雨", "現在幾點"], answer: "風從哪裡吹來",
    explain: "風向袋會被風吹向另一邊，看它飄的方向就知道風從哪裡來。" },
  { q: "太陽每天從哪個方向升起？", options: ["東邊", "西邊", "北邊"], answer: "東邊",
    explain: "太陽從東邊升起、西邊落下。" },
  { q: "天氣很熱的時候，要特別注意什麼？", options: ["多喝水，避免中暑", "穿厚外套", "整天不喝水"], answer: "多喝水，避免中暑",
    explain: "天氣熱容易流汗，要多喝水、少在大太陽下活動，避免中暑。" },
];


// ---------------------------------------------------------------------
// 2. 顏色與尺寸
// ---------------------------------------------------------------------
const C = {
  bg: "#EEF1F5", panel: "#FFFFFF", ink: "#17212D", muted: "#5A6777",
  line: "#CED6E0", accent: "#D9480F", accentDark: "#B93C0B",
  ok: "#2B8A57", okSoft: "#E3F3EA", bad: "#C92A2A", badSoft: "#FBE5E5",
  board: "#DDE3EA",
};
const PIC_W = 600, PIC_H = 450;                 // 圖片的原始大小
const PW = PIC_W / GRID.cols, PH = PIC_H / GRID.rows;   // 每塊的大小（原始）
const M = Math.round(Math.max(PW, PH) * 0.26);  // 拼圖凸起需要的留白


// ---------------------------------------------------------------------
// 3. 狀態
// ---------------------------------------------------------------------
let picture;               // 整張圖（p5.Graphics）
let pieces = [];           // 每一塊拼圖
let zOrder = [];           // 畫的順序（後面的在上層）
let modal = null;          // 題目視窗 {piece, chosen, t}
let drag = null;           // 拖曳中 {piece, offX, offY}
let hits = [];
let L = {};                // 版面
let startMs = 0, doneMs = 0, finished = false, showCard = false;
let soundOn = true;
let hEdges = [], vEdges = [];   // 拼圖凸凹方向


// ---------------------------------------------------------------------
// 4. p5.js 主程式
// ---------------------------------------------------------------------
function setup() {
  createCanvas(windowWidth, windowHeight);
  textFont("sans-serif");
  textWrap(CHAR);
  picture = createGraphics(PIC_W, PIC_H);
  drawScene(picture);
  if (IMAGE_URL) {
    loadImage(IMAGE_URL, img => {
      picture.clear();
      const s = max(PIC_W / img.width, PIC_H / img.height);
      picture.image(img, (PIC_W - img.width * s) / 2, (PIC_H - img.height * s) / 2, img.width * s, img.height * s);
      buildPieceImages();
    }, () => console.warn("圖片讀取失敗，改用內建圖：", IMAGE_URL));
  }
  newGame();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  computeLayout();
  placeAll();
}

function draw() {
  background(C.bg);
  hits = [];
  drawHeader();
  drawBoard();
  drawPieces();
  if (finished) drawFinishedPicture();
  if (modal) drawModal();
  if (showCard) drawResultCard();
  cursor(drag ? "grabbing" : hits.some(h => inRect(mouseX, mouseY, h)) || hoverPiece() ? HAND : ARROW);
}


// ---------------------------------------------------------------------
// 5. 建立新遊戲
// ---------------------------------------------------------------------
function newGame() {
  for (const p of pieces) { if (p.img) p.img.remove(); if (p.lockedImg) p.lockedImg.remove(); }
  const n = GRID.cols * GRID.rows;
  // 隨機決定每條邊是凸還是凹
  hEdges = []; vEdges = [];
  for (let r = 0; r < GRID.rows; r++) {
    hEdges.push([]); vEdges.push([]);
    for (let c = 0; c < GRID.cols; c++) {
      hEdges[r].push(random() < 0.5 ? 1 : -1);
      vEdges[r].push(random() < 0.5 ? 1 : -1);
    }
  }
  const qOrder = shuffle([...Array(n).keys()]);
  const slots = shuffle([...Array(n).keys()]);
  pieces = [];
  for (let r = 0; r < GRID.rows; r++) {
    for (let c = 0; c < GRID.cols; c++) {
      const i = r * GRID.cols + c;
      const p = {
        i, r, c,
        q: QUESTIONS[qOrder[i] % QUESTIONS.length],
        opts: null,
        state: "locked",     // locked → open → placed
        correct: null,       // 第一次作答是否答對
        slot: slots[i],
        x: 0, y: 0,
        edges: {
          top: r === 0 ? 0 : -hEdges[r - 1][c],
          right: c === GRID.cols - 1 ? 0 : vEdges[r][c],
          bottom: r === GRID.rows - 1 ? 0 : hEdges[r][c],
          left: c === 0 ? 0 : -vEdges[r][c - 1],
        },
      };
      p.opts = shuffle(p.q.options.slice());
      p.path = piecePath(p.edges);
      pieces.push(p);
    }
  }
  zOrder = pieces.slice();
  buildPieceImages();
  modal = null; drag = null; finished = false; showCard = false;
  startMs = millis(); doneMs = 0;
  computeLayout();
  placeAll();
}


// ---------------------------------------------------------------------
// 6. 拼圖形狀（用貝茲曲線畫出凸起和凹槽）
// ---------------------------------------------------------------------
// 從 (x0,y0) 畫到 (x1,y1)；s = 1 往外凸、-1 往內凹、0 平邊
function edgeTo(ctx, x0, y0, x1, y1, s) {
  if (!s) { ctx.lineTo(x1, y1); return; }
  const dx = x1 - x0, dy = y1 - y0;
  const nx = dy, ny = -dx;                     // 往外的法線方向
  const P = (t, k) => [x0 + dx * t + nx * k * s, y0 + dy * t + ny * k * s];
  ctx.lineTo(...P(0.36, 0));
  ctx.bezierCurveTo(...P(0.42, 0.02), ...P(0.33, 0.22), ...P(0.5, 0.22));
  ctx.bezierCurveTo(...P(0.67, 0.22), ...P(0.58, 0.02), ...P(0.64, 0));
  ctx.lineTo(x1, y1);
}

function tracePiece(ctx, e) {
  ctx.moveTo(0, 0);
  edgeTo(ctx, 0, 0, PW, 0, e.top);
  edgeTo(ctx, PW, 0, PW, PH, e.right);
  edgeTo(ctx, PW, PH, 0, PH, e.bottom);
  edgeTo(ctx, 0, PH, 0, 0, e.left);
  ctx.closePath();
}

function piecePath(e) { const p = new Path2D(); tracePiece(p, e); return p; }

// 把每一塊的圖案先畫好存起來（解鎖版 + 鎖住版），之後直接貼上
function buildPieceImages() {
  for (const p of pieces) {
    if (p.img) p.img.remove();
    if (p.lockedImg) p.lockedImg.remove();
    p.img = makePieceGraphic(p, false);
    p.lockedImg = makePieceGraphic(p, true);
  }
}

function makePieceGraphic(p, locked) {
  const g = createGraphics(PW + M * 2, PH + M * 2);
  const ctx = g.drawingContext;
  ctx.save();
  ctx.translate(M, M);
  ctx.save();
  ctx.clip(p.path);
  ctx.drawImage(picture.elt, -p.c * PW, -p.r * PH, PIC_W, PIC_H);
  if (locked) { ctx.fillStyle = "rgba(23,33,45,0.78)"; ctx.fillRect(-M, -M, PW + M * 2, PH + M * 2); }
  ctx.restore();
  ctx.lineWidth = 3; ctx.strokeStyle = "rgba(255,255,255,0.75)"; ctx.stroke(p.path);
  ctx.lineWidth = 1.2; ctx.strokeStyle = "rgba(0,0,0,0.35)"; ctx.stroke(p.path);
  ctx.restore();
  if (locked) {
    g.noStroke(); g.fill(255); g.textAlign(CENTER, CENTER); g.textStyle(BOLD);
    g.textSize(PH * 0.42); g.text("?", M + PW / 2, M + PH / 2 - PH * 0.08);
    g.textSize(PH * 0.11); g.textStyle(NORMAL); g.fill(255, 220);
    g.text("點我答題", M + PW / 2, M + PH * 0.78);
  }
  return g;
}


// ---------------------------------------------------------------------
// 7. 版面：寬螢幕左右排，窄螢幕上下排
// ---------------------------------------------------------------------
function computeLayout() {
  L.fs = constrain(min(width, height * 1.3) / 55, 12, 17);
  L.pad = constrain(width * 0.03, 12, 28);
  L.narrow = width < 700;
  L.headerH = L.narrow ? L.fs * 7.4 : L.fs * 5.2;
  const wide = width >= 760 && width > height * 1.05;
  L.wide = wide;
  const areaY = L.headerH, areaH = height - areaY - L.pad;
  let boardArea, trayArea;
  if (wide) {
    const bw = (width - L.pad * 3) * 0.55;
    boardArea = { x: L.pad, y: areaY, w: bw, h: areaH };
    trayArea = { x: L.pad * 2 + bw, y: areaY, w: width - L.pad * 3 - bw, h: areaH };
  } else {
    const bh = min((width - L.pad * 2) * 0.75 + 40, areaH * 0.44);
    boardArea = { x: L.pad, y: areaY, w: width - L.pad * 2, h: bh };
    trayArea = { x: L.pad, y: areaY + bh + L.pad * 0.5, w: width - L.pad * 2, h: areaH - bh - L.pad * 0.5 };
  }
  trayArea.y += L.fs * 1.6; trayArea.h -= L.fs * 1.6;   // 托盤上方留一行提示文字
  // 拼圖板：保持 4:3，四周留凸起的空間
  const inner = 0.9;
  L.S = min(boardArea.w * inner / PIC_W, boardArea.h * inner / PIC_H);
  // 托盤要放得下全部的塊，必要時再縮小
  const n = pieces.length;
  const fitTray = s => {
    const cw = (PW + M * 0.6) * s, ch = (PH + M * 0.6) * s;
    const cols = max(1, floor(trayArea.w / cw));
    return ceil(n / cols) * ch <= trayArea.h;
  };
  while (L.S > 0.25 && !fitTray(L.S)) L.S *= 0.95;
  L.board = { x: boardArea.x + (boardArea.w - PIC_W * L.S) / 2, y: boardArea.y + (boardArea.h - PIC_H * L.S) / 2, w: PIC_W * L.S, h: PIC_H * L.S };
  L.boardArea = boardArea;
  L.tray = trayArea;
}

function targetOf(p) { return { x: L.board.x + p.c * PW * L.S, y: L.board.y + p.r * PH * L.S }; }

function slotOf(p) {
  const s = L.S, t = L.tray, n = pieces.length;
  const cw = (PW + M * 0.6) * s, ch = (PH + M * 0.6) * s;
  const cols = max(1, min(n, floor(t.w / cw)));
  const rows = ceil(n / cols);
  const gx = (t.w - cols * cw) / 2, gy = max(0, (t.h - rows * ch) / 2);
  const c = p.slot % cols, r = floor(p.slot / cols);
  return { x: t.x + gx + c * cw + (cw - PW * s) / 2, y: t.y + gy + r * ch + (ch - PH * s) / 2 };
}

function placeAll() {
  for (const p of pieces) {
    const pos = p.state === "placed" ? targetOf(p) : slotOf(p);
    p.x = pos.x; p.y = pos.y;
  }
}


// ---------------------------------------------------------------------
// 8. 繪製
// ---------------------------------------------------------------------
function drawHeader() {
  const fs = L.fs, p = L.pad;
  noStroke(); textAlign(LEFT, TOP);
  fill(C.accent); textStyle(BOLD); textSize(fs * 0.75);
  text("PUZZLE QUIZ", p, p * 0.7);
  fill(C.ink); textSize(fs * 1.5);
  text(PUZZLE_TITLE, p, p * 0.7 + fs * 1.1);
  textStyle(NORMAL);

  // 右邊：進度
  const placed = pieces.filter(q => q.state === "placed").length;
  const right = pieces.filter(q => q.correct === true).length;
  const secs = floor(((finished ? doneMs : millis()) - startMs) / 1000);
  const stats = [["拼好", placed + "/" + pieces.length], ["答對", right + " 題"], ["時間", nf(floor(secs / 60), 2) + ":" + nf(secs % 60, 2)]];
  textSize(fs * 1.1); textStyle(BOLD);
  const bw = max(...stats.map(s => textWidth(s[1]))) + fs * 1.4, bh = fs * 2.9;
  const narrow = L.narrow;                                        // 小螢幕：統計移到標題下面
  let x = narrow ? p : width - p - stats.length * (bw + 6) + 6;
  const y = narrow ? p * 0.7 + fs * 3.1 : p * 0.7;
  for (const [lab, val] of stats) {
    fill(C.panel); stroke(C.line); strokeWeight(1); rect(x, y, bw, bh, 8);
    noStroke(); fill(C.muted); textStyle(NORMAL); textSize(fs * 0.65); textAlign(LEFT, TOP);
    text(lab, x + fs * 0.6, y + fs * 0.4);
    fill(C.ink); textStyle(BOLD); textSize(fs * 1.1);
    text(val, x + fs * 0.6, y + fs * 1.25);
    x += bw + 6;
  }
  textStyle(NORMAL);

  // 音效開關
  {
    const label = soundOn ? "音效：開" : "音效：關";
    textSize(fs * 0.8);
    const w = textWidth(label) + fs * 1.4, h = fs * 1.9;
    const sx = narrow ? width - p - w : x - stats.length * (bw + 6) - w - 4;
    smallButton(sx, y + (bh - h) / 2, w, h, label, () => soundOn = !soundOn);
  }
}

function drawBoard() {
  const b = L.board, S = L.S;
  if (!b) return;
  // 拼圖板底色
  noStroke(); fill(C.board);
  rect(b.x - 10, b.y - 10, b.w + 20, b.h + 20, 14);
  fill("#E8EDF2"); rect(b.x, b.y, b.w, b.h, 4);
  // 每一格的虛線輪廓（提示形狀，不提示圖案）
  const ctx = drawingContext;
  for (const p of pieces) {
    if (p.state === "placed") continue;
    const t = targetOf(p);
    ctx.save();
    ctx.translate(t.x, t.y); ctx.scale(S, S);
    ctx.setLineDash([6 / S, 5 / S]); ctx.lineWidth = 1.4 / S; ctx.strokeStyle = "rgba(90,103,119,0.55)";
    ctx.stroke(p.path);
    ctx.restore();
  }
  // 托盤標題
  noStroke(); fill(C.muted); textSize(L.fs * 0.8); textAlign(LEFT, BOTTOM);
  const open = pieces.filter(p => p.state !== "placed").length;
  if (open && L.tray) {
    const tip = pieces.some(p => p.state === "open") ? "把解鎖的拼圖拖到拼圖板上" : "點「?」拼圖回答問題，答完就能拼";
    textAlign(LEFT, TOP);
    text(tip, L.tray.x, L.tray.y - L.fs * 1.4);
  }
}

function drawPieces() {
  const S = L.S;
  // 已拼好的在最下層
  const order = zOrder.filter(p => p.state === "placed").concat(zOrder.filter(p => p.state !== "placed"));
  for (const p of order) {
    if (finished) break;
    const g = p.state === "locked" ? p.lockedImg : p.img;
    const lifted = drag && drag.piece === p;
    push();
    if (lifted) { drawingContext.shadowColor = "rgba(0,0,0,0.3)"; drawingContext.shadowBlur = 18; drawingContext.shadowOffsetY = 8; }
    else if (p.state !== "placed") { drawingContext.shadowColor = "rgba(0,0,0,0.15)"; drawingContext.shadowBlur = 6; drawingContext.shadowOffsetY = 2; }
    // 剛解鎖的拼圖閃一下
    if (p.state === "open" && p.unlockMs && millis() - p.unlockMs < 900) {
      const k = (millis() - p.unlockMs) / 900;
      drawingContext.shadowColor = `rgba(245,177,0,${0.9 * (1 - k)})`; drawingContext.shadowBlur = 30 * (1 - k) + 6;
    }
    image(g, p.x - M * S, p.y - M * S, g.width * S, g.height * S);
    pop();
  }
}

function drawFinishedPicture() {
  const b = L.board;
  const k = constrain((millis() - doneMs) / 600, 0, 1);
  push();
  image(picture, b.x, b.y, b.w, b.h);
  noStroke(); fill(0, 0, 0, 110 * k);
  rect(b.x, b.y + b.h - L.fs * 2.6, b.w, L.fs * 2.6);
  fill(255, 255 * k); textAlign(CENTER, CENTER); textStyle(BOLD); textSize(L.fs * 1.2);
  text("完成！「" + PICTURE_NAME + "」", b.x + b.w / 2, b.y + b.h - L.fs * 1.3);
  pop();
  if (!showCard) {
    const t = L.tray, w = min(260, t.w), h = L.fs * 3;
    bigButton(t.x + (t.w - w) / 2, t.y + t.h / 2 - h - 5, w, h, "看成績", true, () => showCard = true);
    bigButton(t.x + (t.w - w) / 2, t.y + t.h / 2 + 5, w, h, "再玩一次", false, newGame);
  }
}

function drawModal() {
  const p = modal.piece, q = p.q, fs = L.fs;
  const answered = modal.chosen !== null;
  fill(15, 20, 28, 150); noStroke(); rect(0, 0, width, height);
  addHit(0, 0, width, height, () => {});            // 擋住後面的點擊

  const w = min(560, width - L.pad * 2);
  const btnH = fs * 2.9;
  const qH = fs * 1.25 * 2.6;
  const fbH = answered ? fs * 5.2 : 0;
  const h = fs * 6.2 + qH + p.opts.length * (btnH + 10) + fbH + fs * 4.2;
  const x = (width - w) / 2, y = max(L.pad, (height - h) / 2);
  const k = easeOut(constrain((millis() - modal.t) / 250, 0, 1));
  push();
  translate(width / 2, y + h / 2); scale(0.94 + 0.06 * k); translate(-width / 2, -(y + h / 2));
  drawingContext.globalAlpha = k;
  fill(C.panel); rect(x, y, w, h, 16);

  // 左上角：這一塊拼圖的縮圖
  const th = fs * 3.6, ts = th / (PH + M * 2);
  const g = answered ? p.img : p.lockedImg;
  image(g, x + fs * 1.1, y + fs * 0.9, g.width * ts, g.height * ts);
  fill(C.accent); textStyle(BOLD); textSize(fs * 0.75); textAlign(LEFT, TOP);
  const done = pieces.filter(z => z.state !== "locked").length;
  text("拼圖題目　第 " + (done + (answered ? 0 : 1)) + " / " + pieces.length + " 題", x + fs * 1.4 + g.width * ts, y + fs * 1.4);
  fill(C.muted); textStyle(NORMAL); textSize(fs * 0.8);
  text("答完這題，這塊拼圖就會解鎖", x + fs * 1.4 + g.width * ts, y + fs * 2.8);

  let cy = y + fs * 5.6;
  fill(C.ink); textStyle(BOLD); textSize(fs * 1.25); textAlign(LEFT, TOP);
  text(q.q, x + fs * 1.4, cy, w - fs * 2.8, qH);
  cy += qH;

  p.opts.forEach((o, i) => {
    const bx = x + fs * 1.4, bw = w - fs * 2.8;
    const isAns = o === q.answer, chosen = modal.chosen === o;
    const hover = !answered && inRect(mouseX, mouseY, { x: bx, y: cy, w: bw, h: btnH });
    let bg = C.panel, bd = C.line, badge = C.ink, ink = C.ink;
    if (hover) { bd = C.accent; badge = C.accent; }
    if (answered) {
      if (isAns) { bg = C.okSoft; bd = C.ok; badge = C.ok; }
      else if (chosen) { bg = C.badSoft; bd = C.bad; badge = C.bad; }
      else { ink = C.muted; badge = C.line; }
    }
    fill(bg); stroke(bd); strokeWeight(hover || (answered && (isAns || chosen)) ? 2.5 : 1.5);
    rect(bx, cy, bw, btnH, 10);
    noStroke(); fill(badge); circle(bx + btnH * 0.5, cy + btnH / 2, btnH * 0.6);
    fill(255); textAlign(CENTER, CENTER); textStyle(BOLD); textSize(fs * 0.9);
    text(answered && isAns ? "✓" : answered && chosen ? "✗" : String(i + 1), bx + btnH * 0.5, cy + btnH / 2);
    fill(ink); textAlign(LEFT, CENTER); textSize(fs * 1.05);
    text(o, bx + btnH, cy + btnH / 2);
    if (!answered) addHit(bx, cy, bw, btnH, () => answer(o));
    cy += btnH + 10;
  });

  if (answered) {
    const ok = modal.chosen === q.answer;
    fill(ok ? C.ok : C.bad); textStyle(BOLD); textSize(fs * 1.05); textAlign(LEFT, TOP);
    text(ok ? "答對了！拼圖解鎖" : "答錯了，正確答案是「" + q.answer + "」（拼圖一樣解鎖，但這題不計分）", x + fs * 1.4, cy + fs * 0.3, w - fs * 2.8, fs * 2.8);
    fill(C.ink); textStyle(NORMAL); textSize(fs * 0.9);
    text(q.explain, x + fs * 1.4, cy + fs * (ok ? 1.9 : 3.1), w - fs * 2.8, fs * 3);
    const bw = min(240, w - fs * 2.8), bh = fs * 2.8;
    bigButton(x + (w - bw) / 2, y + h - bh - fs * 1.1, bw, bh, "去拼這塊拼圖", true, closeModal);
  } else {
    fill(C.muted); textSize(fs * 0.8); textAlign(CENTER, TOP); textStyle(NORMAL);
    text(width >= 700 ? "點選答案，或按鍵盤 1～" + p.opts.length : "點選一個答案", x, y + h - fs * 2.6, w);
    smallButton(x + w - fs * 4.6, y + fs * 1.0, fs * 3.6, fs * 1.8, "稍後", closeModal);
  }
  pop();
}

function drawResultCard() {
  const n = pieces.length, right = pieces.filter(p => p.correct === true).length;
  const score = round(right / n * 100), fs = L.fs;
  const secs = round((doneMs - startMs) / 1000);
  fill(15, 20, 28, 150); noStroke(); rect(0, 0, width, height);
  addHit(0, 0, width, height, () => {});
  const cellSz = fs * 1.9;
  const w = min(440, width - L.pad * 2), h = fs * 10.2 + GRID.rows * (cellSz + 4) + fs * 6.4;
  const x = (width - w) / 2, y = (height - h) / 2, cx = width / 2;
  fill(C.panel); rect(x, y, w, h, 16);

  textAlign(CENTER, TOP); fill(C.accent); textStyle(BOLD); textSize(fs * 0.8);
  text("拼圖完成", cx, y + fs * 1.3);
  fill(C.ink); textSize(fs * 1.3);
  text("「" + PICTURE_NAME + "」測驗成績", cx, y + fs * 2.6);
  const k = easeOut(constrain((millis() - doneMs - 300) / 900, 0, 1));
  fill(C.accent); textSize(fs * 4.2);
  const shown = round(score * k);
  text(shown, cx - fs * 0.7, y + fs * 4.4);
  const sw = textWidth(String(shown));
  fill(C.muted); textSize(fs * 1.1); textAlign(LEFT, TOP);
  text("分", cx - fs * 0.7 + sw / 2 + 4, y + fs * 7.3);

  // 九宮格：每一塊的對錯
  const cell = cellSz, gw = GRID.cols * (cell + 4) - 4;
  let gx = cx - gw / 2, gy = y + fs * 9.6;
  for (const p of pieces) {
    const px = gx + p.c * (cell + 4), py = gy + p.r * (cell + 4);
    noStroke(); fill(p.correct ? C.ok : C.bad); rect(px, py, cell, cell, 4);
    fill(255); textAlign(CENTER, CENTER); textSize(fs * 0.9); textStyle(BOLD);
    text(p.correct ? "✓" : "✗", px + cell / 2, py + cell / 2);
  }
  textStyle(NORMAL); fill(C.muted); textSize(fs * 0.85); textAlign(CENTER, TOP);
  const tStr = (secs >= 60 ? floor(secs / 60) + " 分 " : "") + (secs % 60) + " 秒";
  text("答對 " + right + " / " + n + " 題・用時 " + tStr, cx, gy + GRID.rows * (cell + 4) + fs * 0.4);

  const bw = (w - fs * 2.8 - 10) / 2, bh = fs * 2.8, by = y + h - bh - fs * 1.2;
  bigButton(x + fs * 1.4, by, bw, bh, "再玩一次", true, newGame);
  bigButton(x + fs * 1.4 + bw + 10, by, bw, bh, "看完成的圖", false, () => showCard = false);
}


// ---------------------------------------------------------------------
// 9. 作答與拖曳
// ---------------------------------------------------------------------
function openQuestion(p) { modal = { piece: p, chosen: null, t: millis() }; tone(660, 660, 0, 0.08, 0.08); }

function answer(o) {
  const p = modal.piece;
  modal.chosen = o;
  p.correct = o === p.q.answer;
  p.state = "open";
  p.unlockMs = millis() + 300;
  if (p.correct) { tone(784, 784, 0, 0.14, 0.2, "triangle"); tone(1175, 1175, 0.11, 0.3, 0.2, "triangle"); }
  else tone(330, 220, 0, 0.35, 0.16, "sawtooth");
}

function closeModal() {
  if (modal && modal.chosen !== null) {
    const p = modal.piece;
    p.unlockMs = millis();
    zOrder = zOrder.filter(z => z !== p).concat([p]);
  }
  modal = null;
}

// isPointInPath 會套用目前的變換，所以先重設成單位矩陣再判斷
function hitPiece(mx, my) {
  const ctx = drawingContext;
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
  let found = null;
  for (let i = zOrder.length - 1; i >= 0 && !found; i--) {
    const p = zOrder[i];
    if (p.state === "placed") continue;
    const lx = (mx - p.x) / L.S, ly = (my - p.y) / L.S;
    if (lx < -M || ly < -M || lx > PW + M || ly > PH + M) continue;
    if (ctx.isPointInPath(p.path, lx, ly)) found = p;
  }
  ctx.restore();
  return found;
}

function hoverPiece() { return !modal && !showCard && !finished && hitPiece(mouseX, mouseY); }

function pointerDown() {
  for (let i = hits.length - 1; i >= 0; i--) {
    if (inRect(mouseX, mouseY, hits[i])) { hits[i].fn(); return; }
  }
  if (modal || showCard || finished) return;
  const p = hitPiece(mouseX, mouseY);
  if (!p) return;
  if (p.state === "locked") { openQuestion(p); return; }
  drag = { piece: p, offX: mouseX - p.x, offY: mouseY - p.y };
  zOrder = zOrder.filter(z => z !== p).concat([p]);
}

function pointerMove() {
  if (!drag) return;
  const p = drag.piece;
  p.x = constrain(mouseX - drag.offX, -PW * L.S * 0.5, width - PW * L.S * 0.5);
  p.y = constrain(mouseY - drag.offY, 0, height - PH * L.S * 0.5);
}

function pointerUp() {
  if (!drag) return;
  const p = drag.piece;
  drag = null;
  const t = targetOf(p);
  if (dist(p.x, p.y, t.x, t.y) < max(PW, PH) * L.S * 0.3) {
    p.x = t.x; p.y = t.y; p.state = "placed";
    tone(520, 780, 0, 0.12, 0.15, "triangle");
    if (pieces.every(z => z.state === "placed")) {
      finished = true; doneMs = millis();
      [523, 659, 784, 1047].forEach((f, i) => tone(f, f, 0.2 + i * 0.13, i === 3 ? 0.5 : 0.16, 0.18, "triangle"));
      setTimeout(() => { if (finished) showCard = true; }, 1300);
    }
  } else {
    tone(300, 280, 0, 0.06, 0.05);
  }
}

let lastTouch = -9999;
function mousePressed()  { if (millis() - lastTouch > 700) pointerDown(); return false; }
function mouseDragged()  { if (millis() - lastTouch > 700) pointerMove(); return false; }
function mouseReleased() { if (millis() - lastTouch > 700) pointerUp(); return false; }
function touchStarted()  { lastTouch = millis(); pointerDown(); return false; }
function touchMoved()    { lastTouch = millis(); pointerMove(); return false; }
function touchEnded()    { lastTouch = millis(); pointerUp(); return false; }

function keyPressed() {
  if (!modal) return;
  const k = int(key);
  if (modal.chosen === null && k >= 1 && k <= modal.piece.opts.length) { answer(modal.piece.opts[k - 1]); return false; }
  if (modal.chosen !== null && (keyCode === ENTER || key === " ")) { closeModal(); return false; }
  if (keyCode === ESCAPE && modal.chosen === null) { closeModal(); return false; }
}


// ---------------------------------------------------------------------
// 10. 按鈕、音效、小工具
// ---------------------------------------------------------------------
function bigButton(x, y, w, h, label, primary, fn) {
  const hover = inRect(mouseX, mouseY, { x, y, w, h });
  push();
  if (primary) { fill(hover ? C.accentDark : C.accent); noStroke(); }
  else { fill(hover ? "#E3E7EC" : C.panel); stroke(C.ink); strokeWeight(1.5); }
  rect(x, y, w, h, 10);
  noStroke(); fill(primary ? 255 : C.ink);
  textAlign(CENTER, CENTER); textStyle(BOLD); textSize(L.fs * 1.02);
  text(label, x + w / 2, y + h / 2);
  pop();
  addHit(x, y, w, h, fn);
}

function smallButton(x, y, w, h, label, fn) {
  const hover = inRect(mouseX, mouseY, { x, y, w, h });
  push();
  fill(hover ? "#E3E7EC" : C.panel); stroke(C.line); strokeWeight(1);
  rect(x, y, w, h, 6);
  noStroke(); fill(C.ink); textAlign(CENTER, CENTER); textSize(L.fs * 0.8);
  text(label, x + w / 2, y + h / 2);
  pop();
  addHit(x, y, w, h, fn);
}

function addHit(x, y, w, h, fn) { hits.push({ x, y, w, h, fn }); }
function inRect(px, py, r) { return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h; }
function easeOut(k) { return 1 - pow(1 - k, 3); }

let AC = null;
function tone(f1, f2, start, dur, vol, type = "sine") {
  if (!soundOn) return;
  if (!AC) { const Ctx = window.AudioContext || window.webkitAudioContext; if (!Ctx) return; AC = new Ctx(); }
  if (AC.state === "suspended") AC.resume();
  const t = AC.currentTime + start;
  const o = AC.createOscillator(), g = AC.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f1, t);
  if (f2 !== f1) o.frequency.exponentialRampToValueAtTime(f2, t + dur * 0.8);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(AC.destination);
  o.start(t); o.stop(t + dur + 0.05);
}


// ---------------------------------------------------------------------
// 11. 內建圖畫「雨過天晴」（600 × 450）
//     九宮格每一格都有可辨認的東西，學生才能依圖案判斷位置
// ---------------------------------------------------------------------
function drawScene(g) {
  // 天空
  for (let y = 0; y < PIC_H; y++) {
    g.stroke(g.lerpColor(g.color("#6FBDEB"), g.color("#D9F0FB"), y / PIC_H));
    g.line(0, y, PIC_W, y);
  }
  // 太陽（右上）
  g.push(); g.translate(512, 78);
  g.stroke("#FFC21A"); g.strokeWeight(6); g.strokeCap(ROUND);
  for (let i = 0; i < 12; i++) { const a = i * PI / 6; g.line(cos(a) * 46, sin(a) * 46, cos(a) * (i % 2 ? 66 : 58), sin(a) * (i % 2 ? 66 : 58)); }
  g.noStroke(); g.fill("#FFD23F"); g.circle(0, 0, 76);
  g.fill("#E8A800"); g.circle(-12, -6, 7); g.circle(12, -6, 7);
  g.noFill(); g.stroke("#E8A800"); g.strokeWeight(3); g.arc(0, 4, 26, 18, 0.2, PI - 0.2);
  g.pop();
  // 彩虹
  const cols = ["#E8483B", "#F28C28", "#F7D038", "#4CB050", "#3A8FD9", "#4B57C2", "#8E5CC9"];
  g.noFill(); g.strokeWeight(11); g.strokeCap(SQUARE);
  cols.forEach((c, i) => { g.stroke(c); g.arc(300, 345, 470 - i * 22, 440 - i * 22, PI, TWO_PI); });
  // 左上：灰色雨雲＋小雨
  g.stroke("#7FA6C9"); g.strokeWeight(2);
  for (let i = 0; i < 14; i++) { const x = 30 + i * 11, y = 92 + (i % 3) * 12; g.line(x, y, x - 5, y + 14); }
  cloud(g, 95, 62, 34, "#9AA6B4");
  // 白雲：彩虹兩腳
  cloud(g, 92, 300, 26, "#FFFFFF");
  cloud(g, 505, 296, 28, "#FFFFFF");
  cloud(g, 300, 210, 18, "#F4F8FC");
  // 小鳥（中間）
  g.noFill(); g.stroke("#2E3A48"); g.strokeWeight(2.5);
  [[262, 182, 1], [300, 168, 1.2], [336, 186, 0.9]].forEach(([x, y, s]) => {
    g.arc(x - 7 * s, y, 14 * s, 10 * s, PI + 0.3, TWO_PI - 0.2);
    g.arc(x + 7 * s, y, 14 * s, 10 * s, PI + 0.2, TWO_PI - 0.3);
  });
  // 山丘
  g.noStroke();
  g.fill("#86C86A"); g.ellipse(120, 430, 420, 200);
  g.fill("#74B95A"); g.ellipse(470, 440, 460, 210);
  g.fill("#62A84B"); g.rect(0, 400, PIC_W, 50);
  // 左下：房子
  g.fill("#F6E7C8"); g.rect(48, 330, 110, 80);
  g.fill("#D9483B"); g.triangle(36, 334, 103, 280, 170, 334);
  g.fill("#8A5A3C"); g.rect(88, 362, 30, 48, 3);
  g.fill("#9ED3F2"); g.rect(56, 346, 24, 22, 2); g.rect(128, 346, 24, 22, 2);
  g.fill("#B33A2F"); g.rect(134, 288, 14, 26);
  // 中下：小路、水窪、雨傘、花
  g.fill("#E5D2A8"); g.quad(260, 450, 340, 450, 318, 372, 284, 372);
  g.fill("#7EC3EA"); g.ellipse(232, 418, 70, 16); g.ellipse(372, 428, 56, 13);
  g.fill("#D9483B"); g.arc(330, 382, 56, 40, PI, TWO_PI);
  g.stroke("#3B2A20"); g.strokeWeight(2.5); g.line(330, 382, 330, 410); g.noFill(); g.arc(335, 410, 10, 10, 0, PI);
  g.noStroke();
  [[210, 392, "#FF7AA8"], [236, 384, "#FFD23F"], [392, 398, "#FFFFFF"], [418, 388, "#FF7AA8"], [252, 440, "#FFFFFF"]].forEach(([x, y, c]) => {
    g.fill(c); for (let a = 0; a < 5; a++) g.circle(x + cos(a * TWO_PI / 5) * 5, y + sin(a * TWO_PI / 5) * 5, 7);
    g.fill("#F2A900"); g.circle(x, y, 5);
  });
  // 右下：大樹
  g.fill("#7A5235"); g.rect(486, 330, 22, 86, 4);
  g.fill("#3E8E47"); g.circle(497, 300, 96); g.circle(462, 322, 64); g.circle(532, 322, 64);
  g.fill("#E8483B"); [[478, 296], [512, 286], [522, 318], [470, 330], [500, 330]].forEach(([x, y]) => g.circle(x, y, 9));
}

function cloud(g, cx, cy, r, col) {
  g.noStroke(); g.fill(col);
  for (const [dx, dy, rr] of [[-1.1, 0.25, 0.7], [-0.4, -0.25, 0.9], [0.45, -0.1, 0.8], [1.1, 0.3, 0.6], [0, 0.35, 0.75]]) g.circle(cx + dx * r, cy + dy * r, rr * r * 2);
}
