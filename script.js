const GAME_CONFIG = {
    selectionSlogan: "同学，你的校园碎片已送达，请查收。",
    gameSlogan: "你正在亲手还原\n一个关于未来的坐标。",
    achievementIconScale: 0.6,
    achievementIconOpacity: 1.0,
    version: Date.now(), // 添加版本号以解决图片缓存问题
    // 难度配置：现分为 1-4 级
    difficultySettings: {
        1: { maxSteps: 100, targetChaos: 10, caocaoWeight: 5 },
        2: { maxSteps: 400, targetChaos: 50, caocaoWeight: 10 },
        3: { maxSteps: 1000, targetChaos: 100, caocaoWeight: 20 },
        4: { maxSteps: 1500, targetChaos: 150, caocaoWeight: 50 } // 原最高难度 { maxSteps: 4000, targetChaos: 350, caocaoWeight: 100 }
    },
    api: {
        baseUrl: "https://leaderboard.liruochen.cn",
        gameId: "zgca-sliding-puzzle"
    }
};

const sceneSelection = document.getElementById('scene-selection');
const sceneGrid = document.getElementById('scene-grid');
const gameWrapper = document.getElementById('game-wrapper');
const boardElement = document.getElementById('board');
const winMsgElement = document.getElementById('win-msg');
const selectionTitle = document.getElementById('selection-title');
const gameTitle = document.getElementById('game-title');
const gameControls = document.getElementById('game-controls');
const solvedControls = document.getElementById('solved-controls');

const ROWS = 5;
const COLS = 4;
let CELL_SIZE = 80;
let currentImageId = 1;
let achievementData = null; 

/**
 * 获取本地存储的键名，包含用户 ID 以区分不同用户的进度
 */
function getStorageKey() {
    const userId = getUserId();
    return userId ? `sliding_puzzle_solved_${userId}` : 'sliding_puzzle_solved';
}

let solvedLevels = [];

/**
 * 从 URL 获取玩家 ID (user_id 或 userid)
 */
function getUserId() {
    const params = new URLSearchParams(window.location.search);
    return params.get('user_id') || params.get('userid');
}

/**
 * 更新页面上的用户信息栏
 */
function updateUserInfo() {
    const userId = getUserId();
    if (!userId) return;

    const infoBar = document.getElementById('user-info-bar');
    if (infoBar) {
        infoBar.style.display = 'flex';
        document.getElementById('display-userid').innerText = userId;
        
        const sceneMapping = [1, 2, 7, 4];
        const allSolved = sceneMapping.every(id => solvedLevels.includes(id));
        const statusEl = document.getElementById('display-status');
        if (statusEl) {
            if (allSolved) {
                statusEl.innerText = '已通关';
                statusEl.classList.add('cleared');
            } else {
                statusEl.innerText = '进行中';
                statusEl.classList.remove('cleared');
            }
        }
    }
}

/**
 * 从服务器同步玩家通关状态
 */
async function syncWithCloud() {
    const userId = getUserId();
    if (!userId) return;

    try {
        const response = await fetch(`${GAME_CONFIG.api.baseUrl}/api/player_score`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                game_id: GAME_CONFIG.api.gameId,
                user_id: userId,
                field_id: 'clear_time'
            })
        });

        if (response.ok) {
            const data = await response.json();
            // 如果有成绩（score），说明整个游戏已通关
            if (data && data.score) {
                // 标记所有打卡点为已通关
                const sceneMapping = [1, 2, 7, 4];
                sceneMapping.forEach(picId => {
                    if (!solvedLevels.includes(picId)) {
                        solvedLevels.push(picId);
                    }
                });
            }
        }
    } catch (e) {
        console.error(`同步云端状态失败:`, e);
    }
    
    // 更新本地缓存
    localStorage.setItem(getStorageKey(), JSON.stringify(solvedLevels));
}

/**
 * 上传通关记录（仅在全部打卡点通关后调用）
 */
async function uploadRecord() {
    const userId = getUserId();
    if (!userId) return;

    try {
        const response = await fetch(`${GAME_CONFIG.api.baseUrl}/api/upload`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                game_id: GAME_CONFIG.api.gameId,
                user_id: userId,
                score: 1, // 通关分数为 1
                field_id: 'clear_time'
            })
        });

        if (!response.ok) {
            console.error(`上传游戏通关成绩失败`);
        }
    } catch (e) {
        console.error(`上传记录出错:`, e);
    }
}

const targetLayout = [
    { id: 'caocao', type: 'caocao', x: 1, y: 0, w: 2, h: 2 },
    { id: 'zhangfei', type: 'general-v', x: 0, y: 0, w: 1, h: 2 },
    { id: 'zhaoyun', type: 'general-v', x: 3, y: 0, w: 1, h: 2 },
    { id: 'machao', type: 'general-v', x: 0, y: 2, w: 1, h: 2 },
    { id: 'huangzhong', type: 'general-v', x: 3, y: 2, w: 1, h: 2 },
    { id: 'soldier1', type: 'soldier', x: 1, y: 2, w: 1, h: 1 },
    { id: 'soldier2', type: 'soldier', x: 2, y: 2, w: 1, h: 1 },
    { id: 'soldier3', type: 'soldier', x: 1, y: 3, w: 1, h: 1 },
    { id: 'soldier4', type: 'soldier', x: 2, y: 3, w: 1, h: 1 },
    { id: 'guanyu_dummy', type: 'dummy-h', x: 1, y: 4, w: 2, h: 1 }
];

const targetLayoutScene1 = [
    { id: 'zhangfei', type: 'general-v', x: 0, y: 0, w: 1, h: 2 },
    { id: 'zhaoyun', type: 'general-v', x: 1, y: 0, w: 1, h: 2 },
    { id: 'machao', type: 'general-v', x: 2, y: 0, w: 1, h: 2 },
    { id: 'huangzhong', type: 'general-v', x: 3, y: 0, w: 1, h: 2 },
    { id: 'caocao', type: 'caocao', x: 0, y: 2, w: 2, h: 2 },
    { id: 'soldier1', type: 'soldier', x: 2, y: 2, w: 1, h: 1 },
    { id: 'soldier2', type: 'soldier', x: 3, y: 2, w: 1, h: 1 },
    { id: 'soldier3', type: 'soldier', x: 2, y: 3, w: 1, h: 1 },
    { id: 'soldier4', type: 'soldier', x: 3, y: 3, w: 1, h: 1 },
    { id: 'guanyu_dummy', type: 'dummy-h', x: 1, y: 4, w: 2, h: 1 }
];

const targetLayoutScene2 = [
    { id: 'zhangfei', type: 'general-v', x: 0, y: 0, w: 1, h: 2 },
    { id: 'zhaoyun', type: 'general-v', x: 1, y: 0, w: 1, h: 2 },
    { id: 'machao', type: 'general-v', x: 2, y: 0, w: 1, h: 2 },
    { id: 'huangzhong', type: 'general-v', x: 3, y: 0, w: 1, h: 2 },
    { id: 'caocao', type: 'caocao', x: 1, y: 2, w: 2, h: 2 },
    { id: 'soldier1', type: 'soldier', x: 0, y: 2, w: 1, h: 1 },
    { id: 'soldier2', type: 'soldier', x: 0, y: 3, w: 1, h: 1 },
    { id: 'soldier3', type: 'soldier', x: 3, y: 2, w: 1, h: 1 },
    { id: 'soldier4', type: 'soldier', x: 3, y: 3, w: 1, h: 1 },
    { id: 'guanyu_dummy', type: 'dummy-h', x: 1, y: 4, w: 2, h: 1 }
];

const targetLayoutScene3 = [
    { id: 'zhangfei', type: 'general-v', x: 0, y: 0, w: 1, h: 2 },
    { id: 'zhaoyun', type: 'general-v', x: 1, y: 0, w: 1, h: 2 },
    { id: 'caocao', type: 'caocao', x: 2, y: 0, w: 2, h: 2 },
    { id: 'soldier1', type: 'soldier', x: 0, y: 2, w: 1, h: 1 },
    { id: 'soldier2', type: 'soldier', x: 1, y: 2, w: 1, h: 1 },
    { id: 'soldier3', type: 'soldier', x: 0, y: 3, w: 1, h: 1 },
    { id: 'soldier4', type: 'soldier', x: 1, y: 3, w: 1, h: 1 },
    { id: 'machao', type: 'general-v', x: 2, y: 2, w: 1, h: 2 },
    { id: 'huangzhong', type: 'general-v', x: 3, y: 2, w: 1, h: 2 },
    { id: 'guanyu_dummy', type: 'dummy-h', x: 1, y: 4, w: 2, h: 1 }
];

let pieces = [];
let grid = [];
let isGameOver = false;

async function init() {
    // 重新根据当前 userid 加载本地进度
    solvedLevels = JSON.parse(localStorage.getItem(getStorageKey()) || '[]');

    // 优先同步云端数据
    await syncWithCloud();

    updateUserInfo();

    try {
        const sloganRes = await fetch(`slogan.txt?v=${GAME_CONFIG.version}`);
        if (sloganRes.ok) {
            const text = await sloganRes.text();
            const lines = text.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);
            if (lines.length >= 2) {
                GAME_CONFIG.gameSlogan = lines[0].replace(/\\n/g, '\n');
                GAME_CONFIG.selectionSlogan = lines[1].replace(/\\n/g, '\n');
            }
        }
    } catch (e) {}
    selectionTitle.innerHTML = GAME_CONFIG.selectionSlogan.replace(/\n/g, '<br>');
    gameTitle.innerHTML = GAME_CONFIG.gameSlogan.replace(/\n/g, '<br>');

    try {
        const achievementRes = await fetch(`achievement_text.json?v=${GAME_CONFIG.version}`);
        if (achievementRes.ok) achievementData = await achievementRes.json();
    } catch (e) { console.warn("无法加载成就数据"); }

    renderSceneSelection();
    // 监听窗口大小变化
    window.addEventListener('resize', () => {
        if (gameWrapper.style.display === 'flex') {
            updateResponsiveSize();
            render(); // 重新渲染棋子背景图
        }
    });
}

function renderSceneSelection() {
    updateUserInfo();
    sceneGrid.innerHTML = '';
    const sceneMapping = [1, 2, 7, 4]; // 映射到原始图片编号
    
    for (let i = 0; i < sceneMapping.length; i++) {
        const picId = sceneMapping[i];
        const sceneIndex = i + 1;
        const isSolved = solvedLevels.includes(picId);
        const card = document.createElement('div');
        card.className = `scene-card ${isSolved ? 'solved' : ''}`;
        card.onclick = () => selectScene(picId);
        const imgSrc = (isSolved ? `pic/game_pic/pic_${picId}.jpg` : `pic/cover_pic/pic_${picId}.jpg`) + `?v=${GAME_CONFIG.version}`;
        
        // 难度显示逻辑：场景 1-4 分别对应 1-4 星
        const starCount = sceneIndex;
        const stars = '★'.repeat(starCount) + '☆'.repeat(4 - starCount);
        
        card.innerHTML = `
            <div class="img-container">
                <img src="${imgSrc}" class="thumbnail" alt="打卡点 ${sceneIndex}">
                <div class="achievement-badge">
                    <img src="pic/icon/achievement_2.svg?v=${GAME_CONFIG.version}" class="achievement-icon" 
                         style="width: ${GAME_CONFIG.achievementIconScale * 100}%; opacity: ${GAME_CONFIG.achievementIconOpacity};">
                    <div class="achievement-win-text">WIN</div>
                </div>
            </div>
            <p>打卡点 ${sceneIndex}</p>
            <div class="difficulty-stars">${stars}</div>
        `;
        sceneGrid.appendChild(card);
    }
}

function clearProgress() {
    if (confirm("确定要清除所有通关进度吗？(此操作不可恢复)")) {
        localStorage.removeItem(getStorageKey());
        location.reload();
    }
}

function updateResponsiveSize() {
    const screenWidth = window.innerWidth;
    const padding = 40; // 预留左右边距
    const maxBoardWidth = screenWidth - padding;
    
    // 棋盘宽是 4 个 CELL_SIZE，外加 12px*2 的边框和 15px*2 的内边距
    const totalExtraWidth = (12 * 2) + (15 * 2);
    let calculatedSize = Math.floor((maxBoardWidth - totalExtraWidth) / 4);
    
    // 限制最大和最小尺寸
    if (calculatedSize > 90) calculatedSize = 90;
    if (calculatedSize < 45) calculatedSize = 45;
    
    CELL_SIZE = calculatedSize;
    // 同步给 CSS 变量，确保渲染一致
    document.documentElement.style.setProperty('--cell-size', `${CELL_SIZE}px`);
}

async function selectScene(id) {
    currentImageId = id;
    sceneSelection.style.display = 'none';
    gameWrapper.style.display = 'flex';
    
    updateResponsiveSize();
    
    // 根据场景 ID 选择布局：
    // 场景 1 (picId 为 1) 使用 targetLayoutScene1
    // 场景 2 (picId 为 2) 使用 targetLayoutScene2
    // 场景 3 (picId 为 7) 使用 targetLayoutScene3
    // 其他场景使用默认布局 targetLayout
    let currentTargetLayout = targetLayout;
    if (id === 1) currentTargetLayout = targetLayoutScene1;
    else if (id === 2) currentTargetLayout = targetLayoutScene2;
    else if (id === 7) currentTargetLayout = targetLayoutScene3;
    
    pieces = JSON.parse(JSON.stringify(currentTargetLayout));
    pieces.forEach(p => { p.targetX = p.x; p.targetY = p.y; });
    render();
    updateGrid();

    if (solvedLevels.includes(id)) {
        isGameOver = true;
        winMsgElement.innerText = "已达成！";
        gameControls.style.display = 'none';
        solvedControls.style.display = 'flex';
    } else {
        enterChallengeMode();
    }
}

function enterChallengeMode() {
    isGameOver = false;
    winMsgElement.innerText = "";
    gameControls.style.display = 'flex';
    solvedControls.style.display = 'none';
    
    autoShuffle();
}

function replayGame() {
    if (confirm("要重新挑战这个打卡点吗？")) {
        enterChallengeMode();
    }
}

function backToSelection() {
    gameWrapper.style.display = 'none';
    sceneSelection.style.display = 'block';
    renderSceneSelection();
}

function render() {
    boardElement.innerHTML = '';
    pieces.forEach(p => {
        const el = document.createElement('div');
        el.className = `piece ${p.type}`;
        el.id = p.id;
        if (!p.type.includes('dummy')) {
            el.style.backgroundImage = `url(pic/game_pic/pic_${currentImageId}.jpg?v=${GAME_CONFIG.version})`;
            // 素材图是 400*400，棋盘逻辑是 4x5
            // 背景图宽度撑满 4 列，高度按比例缩放（400/400 = 1:1，所以高度也是 4 列的宽度）
            el.style.backgroundSize = `${CELL_SIZE * 4}px ${CELL_SIZE * 4}px`;
            el.style.backgroundPosition = `-${p.targetX * CELL_SIZE}px -${p.targetY * CELL_SIZE}px`;
        }
        updatePieceStyle(el, p);
        el.onmousedown = (e) => handleInput(e, p);
        el.ontouchstart = (e) => handleInput(e, p);
        boardElement.appendChild(el);
    });
}

function updatePieceStyle(el, p) {
    el.style.left = `${p.x * CELL_SIZE}px`;
    el.style.top = `${p.y * CELL_SIZE}px`;
}

function updateGrid() {
    grid = Array(ROWS).fill().map(() => Array(COLS).fill(null));
    pieces.forEach(p => {
        for (let r = p.y; r < p.y + p.h; r++) {
            for (let c = p.x; c < p.x + p.w; c++) {
                if (r >= 0 && r < ROWS && c >= 0 && c < COLS) grid[r][c] = p.id;
            }
        }
    });
}

function handleInput(e, p) {
    if (isGameOver) return;
    e.preventDefault();
    const startX = e.type === 'mousedown' ? e.clientX : e.touches[0].clientX;
    const startY = e.type === 'mousedown' ? e.clientY : e.touches[0].clientY;
    const onEnd = (ee) => {
        const endX = ee.type === 'mouseup' ? ee.clientX : ee.changedTouches[0].clientX;
        const endY = ee.type === 'mouseup' ? ee.clientY : ee.changedTouches[0].clientY;
        const dx = endX - startX, dy = endY - startY, threshold = 10;
        if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > threshold) tryMove(p, dx > 0 ? 1 : -1, 0);
        else if (Math.abs(dy) > threshold) tryMove(p, 0, dy > 0 ? 1 : -1);
        window.onmouseup = null; window.ontouchend = null;
    };
    window.onmouseup = onEnd; window.ontouchend = onEnd;
}

function canMove(p, dx, dy, customGrid = null) {
    const nx = p.x + dx, ny = p.y + dy, targetGrid = customGrid || grid;
    if (nx < 0 || ny < 0 || nx + p.w > COLS || ny + p.h > ROWS) return false;
    for (let r = ny; r < ny + p.h; r++) {
        for (let c = nx; c < nx + p.w; c++) {
            if (targetGrid[r] && targetGrid[r][c] && targetGrid[r][c] !== p.id) return false;
        }
    }
    return true;
}

function tryMove(p, dx, dy, isShuffling = false) {
    if (!canMove(p, dx, dy)) return false;
    p.x += dx; p.y += dy;
    updateGrid();
    const el = document.getElementById(p.id);
    if (el) updatePieceStyle(el, p);
    if (!isShuffling) checkWin();
    return true;
}

async function autoShuffle() {
    isGameOver = true; 
    winMsgElement.innerText = "智能生成局面中...";
    pieces.forEach(p => { const el = document.getElementById(p.id); if (el) el.classList.add('no-transition'); });
    
    // 获取 4 星难度等级：对应场景 1, 2, 3, 4
    const sceneMapping = [1, 2, 7, 4];
    const level = sceneMapping.indexOf(currentImageId) + 1;
    const settings = GAME_CONFIG.difficultySettings[level];
    
    let bestState = JSON.stringify(pieces), maxChaos = -999;
    const MAX_STEPS = settings.maxSteps; 
    const TARGET_CHAOS = settings.targetChaos;
    let steps = 0, lastPieceId = null;
    
    while (steps < MAX_STEPS) {
        let validMoves = [];
        const dirs = [[1,0], [-1,0], [0,1], [0,-1]];
        pieces.forEach(p => {
            dirs.forEach(([dx, dy]) => {
                if (canMove(p, dx, dy)) {
                    let weight = (p.id === 'caocao') ? settings.caocaoWeight : (p.type.includes('general') ? 20 : 5);
                    if (p.id === lastPieceId) weight = 0.01;
                    for(let k=0; k < weight; k++) validMoves.push({p, dx, dy});
                }
            });
        });
        if (validMoves.length > 0) {
            const move = validMoves[Math.floor(Math.random() * validMoves.length)];
            tryMove(move.p, move.dx, move.dy, true);
            lastPieceId = move.p.id;
            steps++;
            let currentScore = calculateChaosScore(pieces);
            if (currentScore > maxChaos) { maxChaos = currentScore; bestState = JSON.stringify(pieces); }
            if (currentScore >= TARGET_CHAOS) break;
            if (steps % 200 === 0) await new Promise(r => setTimeout(r, 1));
        } else break;
    }
    pieces = JSON.parse(bestState); render(); updateGrid();
    isGameOver = false; 
    winMsgElement.innerText = "";
}

function calculateChaosScore(currentPieces) {
    let score = 0;
    const weights = { 'caocao': 20, 'general-v': 10, 'soldier': 5, 'dummy-h': 0 };
    currentPieces.forEach(p => {
        const dist = Math.abs(p.x - p.targetX) + Math.abs(p.y - p.targetY);
        score += dist * weights[p.type];
    });
    for (let i = 0; i < currentPieces.length; i++) {
        for (let j = i + 1; j < currentPieces.length; j++) {
            const p1 = currentPieces[i], p2 = currentPieces[j];
            if (p1.type === 'dummy-h' || p2.type === 'dummy-h') continue;
            if (p1.x - p2.x === p1.targetX - p2.targetX && p1.y - p2.y === p1.targetY - p2.targetY) score -= 15;
        }
    }
    return score;
}

function checkWin() {
    const isWin = pieces.filter(p => !p.type.includes('dummy')).every(p => p.x === p.targetX && p.y === p.targetY);
    if (isWin) {
        isGameOver = true; winMsgElement.innerText = "完美拼合！";
        if (!solvedLevels.includes(currentImageId)) {
            solvedLevels.push(currentImageId);
            localStorage.setItem(getStorageKey(), JSON.stringify(solvedLevels));
            
            // 检查是否所有打卡点都已完成
            const sceneMapping = [1, 2, 7, 4];
            const allSolved = sceneMapping.every(id => solvedLevels.includes(id));
            
            if (allSolved) {
                // 只有全部通关后，才异步上传到云端
                uploadRecord();
            }
        }
        setTimeout(showSettlement, 900);
    }
}

function debugReset() {
    pieces.forEach(p => { p.x = p.targetX; p.y = p.targetY; updatePieceStyle(document.getElementById(p.id), p); });
    updateGrid(); checkWin();
}

// 暴露调试接口到 console
window.win = debugReset;
window.clear = clearProgress;

function showSettlement() {
    const overlay = document.getElementById('settlement-overlay');
    const img = document.getElementById('settlement-img');
    const titleChs = document.getElementById('settlement-title-chs');
    const titleEn = document.getElementById('settlement-title-en');
    const desc = document.getElementById('settlement-desc');

    const data = achievementData[`pic_${currentImageId}`] || {
        title_chs: `打卡点 ${currentImageId}`,
        title_en: `SPOT ${currentImageId}`,
        description_chs: "恭喜完成挑战！"
    };

    img.src = `pic/game_pic/pic_${currentImageId}.jpg?v=${GAME_CONFIG.version}`;
    titleChs.innerText = data.title_chs;
    titleEn.innerText = data.title_en;
    desc.innerText = data.description_chs;

    overlay.style.display = 'flex';
    setTimeout(() => overlay.classList.add('active'), 10);
}

function closeSettlement() {
    const overlay = document.getElementById('settlement-overlay');
    overlay.classList.remove('active');
    setTimeout(() => {
        overlay.style.display = 'none';
        if (!solvedControls.style.display || solvedControls.style.display === 'none') {
            backToSelection(); 
        }
    }, 500);
}

init();

