const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const hpText = document.getElementById("hp");
const goldText = document.getElementById("gold");
const waveText = document.getElementById("wave");
const startButton = document.getElementById("startButton");


// =====================================================
// MAP
// =====================================================

const COLS = 15;
const ROWS = 9;
const TILE_SIZE = 60;

canvas.width = COLS * TILE_SIZE;
canvas.height = ROWS * TILE_SIZE;


// =====================================================
// GAME STATE
// =====================================================

let gameRunning = false;

let baseHP = 100;
let gold = 100;
let wave = 1;

const towers = [];
const enemies = [];
const bullets = [];
const effects = [];

let mouseCol = -1;
let mouseRow = -1;


// =====================================================
// PATH
// 적이 지나가는 격자 좌표
// =====================================================

const pathTiles = [
    { col: 0, row: 4 },
    { col: 1, row: 4 },
    { col: 2, row: 4 },
    { col: 3, row: 4 },

    { col: 3, row: 3 },
    { col: 3, row: 2 },

    { col: 4, row: 2 },
    { col: 5, row: 2 },
    { col: 6, row: 2 },
    { col: 7, row: 2 },
    { col: 8, row: 2 },

    { col: 8, row: 3 },
    { col: 8, row: 4 },
    { col: 8, row: 5 },

    { col: 9, row: 5 },
    { col: 10, row: 5 },
    { col: 11, row: 5 },
    { col: 12, row: 5 },
    { col: 13, row: 5 },

    { col: 14, row: 5 }
];


// =====================================================
// GRID → PIXEL
// =====================================================

function tileCenter(col, row) {
    return {
        x: col * TILE_SIZE + TILE_SIZE / 2,
        y: row * TILE_SIZE + TILE_SIZE / 2
    };
}


// =====================================================
// START
// =====================================================

startButton.addEventListener("click", startGame);


function startGame() {

    gameRunning = true;

    baseHP = 100;
    gold = 100;
    wave = 1;

    towers.length = 0;
    enemies.length = 0;
    bullets.length = 0;
    effects.length = 0;

    startButton.disabled = true;
    startButton.textContent = "RUNNING";

    updateUI();

    spawnEnemy();

    requestAnimationFrame(gameLoop);
}


// =====================================================
// MOUSE
// =====================================================

canvas.addEventListener("mousemove", (event) => {

    const rect = canvas.getBoundingClientRect();

    const x =
        (event.clientX - rect.left)
        * (canvas.width / rect.width);

    const y =
        (event.clientY - rect.top)
        * (canvas.height / rect.height);

    mouseCol = Math.floor(x / TILE_SIZE);
    mouseRow = Math.floor(y / TILE_SIZE);
});


canvas.addEventListener("mouseleave", () => {

    mouseCol = -1;
    mouseRow = -1;
});


// =====================================================
// TOWER INSTALL
// =====================================================

canvas.addEventListener("click", () => {

    if (!gameRunning) return;

    if (
        mouseCol < 0 ||
        mouseRow < 0 ||
        mouseCol >= COLS ||
        mouseRow >= ROWS
    ) {
        return;
    }

    // 골드 부족
    if (gold < 40) {
        return;
    }

    // 이동 경로인지 확인
    if (isPathTile(mouseCol, mouseRow)) {
        return;
    }

    // 이미 타워가 있는지 확인
    if (hasTower(mouseCol, mouseRow)) {
        return;
    }


    // 타워 설치
    towers.push({

        col: mouseCol,
        row: mouseRow,

        x: mouseCol * TILE_SIZE + TILE_SIZE / 2,
        y: mouseRow * TILE_SIZE + TILE_SIZE / 2,

        range: 125,
        damage: 10,

        cooldown: 0,
        fireRate: 35
    });


    gold -= 40;

    updateUI();
});


// =====================================================
// PATH CHECK
// =====================================================

function isPathTile(col, row) {

    return pathTiles.some(tile =>
        tile.col === col &&
        tile.row === row
    );
}


// =====================================================
// TOWER CHECK
// =====================================================

function hasTower(col, row) {

    return towers.some(tower =>
        tower.col === col &&
        tower.row === row
    );
}


// =====================================================
// ENEMY SPAWN
// =====================================================

function spawnEnemy() {

    if (!gameRunning) return;

    const start = tileCenter(
        pathTiles[0].col,
        pathTiles[0].row
    );

    enemies.push({

        x: start.x,
        y: start.y,

        pathIndex: 1,

        hp: 30,
        maxHP: 30,

        speed: 1
    });


    setTimeout(spawnEnemy, 1400);
}


// =====================================================
// ENEMY UPDATE
// =====================================================

function updateEnemies() {

    for (
        let i = enemies.length - 1;
        i >= 0;
        i--
    ) {

        const enemy = enemies[i];

        const targetTile =
            pathTiles[enemy.pathIndex];


        if (!targetTile) {

            baseHP -= 10;

            enemies.splice(i, 1);

            createHitEffect(
                enemy.x,
                enemy.y,
                "#ff5252"
            );

            updateUI();


            if (baseHP <= 0) {
                gameOver();
            }

            continue;
        }


        const target =
            tileCenter(
                targetTile.col,
                targetTile.row
            );


        const dx = target.x - enemy.x;
        const dy = target.y - enemy.y;

        const distance =
            Math.hypot(dx, dy);


        if (distance <= enemy.speed) {

            enemy.x = target.x;
            enemy.y = target.y;

            enemy.pathIndex++;

        } else {

            enemy.x +=
                (dx / distance) *
                enemy.speed;

            enemy.y +=
                (dy / distance) *
                enemy.speed;
        }
    }
}


// =====================================================
// TOWER UPDATE
// =====================================================

function updateTowers() {

    towers.forEach(tower => {

        if (tower.cooldown > 0) {

            tower.cooldown--;

            return;
        }


        let target = null;
        let closestDistance = Infinity;


        enemies.forEach(enemy => {

            const distance =
                Math.hypot(
                    enemy.x - tower.x,
                    enemy.y - tower.y
                );


            if (
                distance <= tower.range &&
                distance < closestDistance
            ) {

                target = enemy;
                closestDistance = distance;
            }
        });


        if (target) {

            bullets.push({

                x: tower.x,
                y: tower.y,

                target: target,

                speed: 7,

                damage: tower.damage
            });


            tower.cooldown =
                tower.fireRate;
        }
    });
}


// =====================================================
// BULLET UPDATE
// =====================================================

function updateBullets() {

    for (
        let i = bullets.length - 1;
        i >= 0;
        i--
    ) {

        const bullet = bullets[i];

        if (!enemies.includes(bullet.target)) {

            bullets.splice(i, 1);

            continue;
        }


        const target = bullet.target;

        const dx = target.x - bullet.x;
        const dy = target.y - bullet.y;

        const distance =
            Math.hypot(dx, dy);


        if (distance <= bullet.speed + 4) {

            target.hp -= bullet.damage;

            createHitEffect(
                target.x,
                target.y,
                "#ffd54f"
            );


            bullets.splice(i, 1);


            if (target.hp <= 0) {

                const index =
                    enemies.indexOf(target);

                if (index !== -1) {

                    enemies.splice(index, 1);

                    gold += 10;

                    updateUI();
                }
            }

        } else {

            bullet.x +=
                (dx / distance) *
                bullet.speed;

            bullet.y +=
                (dy / distance) *
                bullet.speed;
        }
    }
}


// =====================================================
// EFFECTS
// =====================================================

function createHitEffect(x, y, color) {

    effects.push({

        x: x,
        y: y,

        radius: 4,

        alpha: 1,

        color: color
    });
}


function updateEffects() {

    for (
        let i = effects.length - 1;
        i >= 0;
        i--
    ) {

        const effect = effects[i];

        effect.radius += 2;
        effect.alpha -= 0.08;


        if (effect.alpha <= 0) {

            effects.splice(i, 1);
        }
    }
}


// =====================================================
// DRAW
// =====================================================

function draw() {

    ctx.clearRect(
        0,
        0,
        canvas.width,
        canvas.height
    );


    drawBackground();
    drawPath();
    drawTowerPreview();
    drawTowers();
    drawEnemies();
    drawBullets();
    drawEffects();
    drawBase();
}


// =====================================================
// BACKGROUND + GRID
// =====================================================

function drawBackground() {

    // 기본 배경
    ctx.fillStyle = "#6f9d52";

    ctx.fillRect(
        0,
        0,
        canvas.width,
        canvas.height
    );


    // 격자를 그리지 않고
    // 맵 전체를 자연스럽게 유지


    // 길 타일만 표시
    pathTiles.forEach(tile => {

        const x = tile.col * TILE_SIZE;
        const y = tile.row * TILE_SIZE;


        ctx.fillStyle = "#b6a477";

        ctx.fillRect(
            x + 2,
            y + 2,
            TILE_SIZE - 4,
            TILE_SIZE - 4
        );
    });
}


// =====================================================
// PATH
// =====================================================

function drawPath() {

    pathTiles.forEach(tile => {

        const x = tile.col * TILE_SIZE;
        const y = tile.row * TILE_SIZE;


        ctx.fillStyle = "#b6a477";

        ctx.fillRect(
            x + 2,
            y + 2,
            TILE_SIZE - 4,
            TILE_SIZE - 4
        );


        // 길 중앙선
        ctx.strokeStyle =
            "rgba(255,255,255,0.22)";

        ctx.setLineDash([6, 6]);

        ctx.beginPath();

        ctx.moveTo(
            x + 10,
            y + TILE_SIZE / 2
        );

        ctx.lineTo(
            x + TILE_SIZE - 10,
            y + TILE_SIZE / 2
        );

        ctx.stroke();

        ctx.setLineDash([]);
    });
}


// =====================================================
// TOWER PREVIEW
// =====================================================

function drawTowerPreview() {

    // 마우스가 맵 밖에 있으면 표시하지 않음
    if (
        mouseCol < 0 ||
        mouseRow < 0 ||
        !gameRunning
    ) {
        return;
    }


    const x =
        mouseCol * TILE_SIZE;

    const y =
        mouseRow * TILE_SIZE;


    // 설치 가능 여부
    const canBuild =
        !isPathTile(
            mouseCol,
            mouseRow
        ) &&
        !hasTower(
            mouseCol,
            mouseRow
        ) &&
        gold >= 40;


    // ==========================================
    // 마우스가 올라간 칸만 표시
    // ==========================================

    ctx.fillStyle =
        canBuild
            ? "rgba(80, 180, 255, 0.18)"
            : "rgba(255, 70, 70, 0.18)";


    ctx.fillRect(
        x + 2,
        y + 2,
        TILE_SIZE - 4,
        TILE_SIZE - 4
    );


    // 현재 칸의 테두리
    ctx.strokeStyle =
        canBuild
            ? "rgba(140, 220, 255, 0.9)"
            : "rgba(255, 100, 100, 0.9)";

    ctx.lineWidth = 2;

    ctx.strokeRect(
        x + 2,
        y + 2,
        TILE_SIZE - 4,
        TILE_SIZE - 4
    );


    // ==========================================
    // 설치 가능할 때만 타워 미리보기
    // ==========================================

    if (canBuild) {

        const center =
            tileCenter(
                mouseCol,
                mouseRow
            );


        ctx.globalAlpha = 0.5;


        // 타워 바닥
        ctx.fillStyle = "#263238";

        ctx.beginPath();

        ctx.arc(
            center.x,
            center.y,
            20,
            0,
            Math.PI * 2
        );

        ctx.fill();


        // 타워 본체
        ctx.fillStyle = "#4569d4";

        ctx.fillRect(
            center.x - 14,
            center.y - 14,
            28,
            28
        );


        // 포신
        ctx.fillStyle = "#a9c0ff";

        ctx.fillRect(
            center.x - 4,
            center.y - 27,
            8,
            17
        );


        ctx.globalAlpha = 1;
    }
}

// =====================================================
// TOWERS
// =====================================================

function drawTowers() {

    towers.forEach(tower => {

        // 공격 범위
        ctx.beginPath();

        ctx.arc(
            tower.x,
            tower.y,
            tower.range,
            0,
            Math.PI * 2
        );

        ctx.fillStyle =
            "rgba(80,120,255,0.06)";

        ctx.fill();


        // 타워 바닥
        ctx.fillStyle = "#263238";

        ctx.beginPath();

        ctx.arc(
            tower.x,
            tower.y,
            20,
            0,
            Math.PI * 2
        );

        ctx.fill();


        // 본체
        ctx.fillStyle = "#4569d4";

        ctx.fillRect(
            tower.x - 14,
            tower.y - 14,
            28,
            28
        );


        // 포신
        ctx.fillStyle = "#a9c0ff";

        ctx.fillRect(
            tower.x - 4,
            tower.y - 27,
            8,
            17
        );


        // 중앙
        ctx.fillStyle = "#e1e8ff";

        ctx.beginPath();

        ctx.arc(
            tower.x,
            tower.y,
            5,
            0,
            Math.PI * 2
        );

        ctx.fill();
    });
}


// =====================================================
// ENEMIES
// =====================================================

function drawEnemies() {

    enemies.forEach(enemy => {

        // 그림자
        ctx.fillStyle =
            "rgba(0,0,0,0.25)";

        ctx.beginPath();

        ctx.ellipse(
            enemy.x,
            enemy.y + 14,
            15,
            6,
            0,
            0,
            Math.PI * 2
        );

        ctx.fill();


        // 몸체
        ctx.fillStyle = "#d93636";

        ctx.beginPath();

        ctx.arc(
            enemy.x,
            enemy.y,
            15,
            0,
            Math.PI * 2
        );

        ctx.fill();


        // 눈
        ctx.fillStyle = "#fff";

        ctx.beginPath();

        ctx.arc(
            enemy.x - 5,
            enemy.y - 3,
            3,
            0,
            Math.PI * 2
        );

        ctx.arc(
            enemy.x + 5,
            enemy.y - 3,
            3,
            0,
            Math.PI * 2
        );

        ctx.fill();


        // HP 배경
        ctx.fillStyle = "#222";

        ctx.fillRect(
            enemy.x - 18,
            enemy.y - 27,
            36,
            5
        );


        // HP
        ctx.fillStyle = "#55d66a";

        ctx.fillRect(
            enemy.x - 18,
            enemy.y - 27,
            36 *
            Math.max(
                0,
                enemy.hp / enemy.maxHP
            ),
            5
        );
    });
}


// =====================================================
// BULLETS
// =====================================================

function drawBullets() {

    bullets.forEach(bullet => {

        // 궤적
        ctx.strokeStyle =
            "rgba(255,220,80,0.4)";

        ctx.lineWidth = 3;

        ctx.beginPath();

        ctx.moveTo(
            bullet.x,
            bullet.y
        );

        ctx.lineTo(
            bullet.x -
            (bullet.target.x - bullet.x) * 0.35,

            bullet.y -
            (bullet.target.y - bullet.y) * 0.35
        );

        ctx.stroke();


        // 총알
        ctx.fillStyle = "#ffe066";

        ctx.beginPath();

        ctx.arc(
            bullet.x,
            bullet.y,
            5,
            0,
            Math.PI * 2
        );

        ctx.fill();


        // 빛
        ctx.fillStyle =
            "rgba(255,235,120,0.3)";

        ctx.beginPath();

        ctx.arc(
            bullet.x,
            bullet.y,
            10,
            0,
            Math.PI * 2
        );

        ctx.fill();
    });
}


// =====================================================
// EFFECTS
// =====================================================

function drawEffects() {

    effects.forEach(effect => {

        ctx.globalAlpha =
            effect.alpha;

        ctx.strokeStyle =
            effect.color;

        ctx.lineWidth = 3;

        ctx.beginPath();

        ctx.arc(
            effect.x,
            effect.y,
            effect.radius,
            0,
            Math.PI * 2
        );

        ctx.stroke();

        ctx.globalAlpha = 1;
    });
}


// =====================================================
// BASE
// =====================================================

function drawBase() {

    const base =
        pathTiles[pathTiles.length - 1];


    const center =
        tileCenter(
            base.col,
            base.row
        );


    // 기지 타일
    ctx.fillStyle = "#552b2b";

    ctx.fillRect(
        base.col * TILE_SIZE + 2,
        base.row * TILE_SIZE + 2,
        TILE_SIZE - 4,
        TILE_SIZE - 4
    );


    // 본체
    ctx.fillStyle = "#d63c3c";

    ctx.fillRect(
        center.x - 24,
        center.y - 24,
        48,
        48
    );


    // 지붕
    ctx.fillStyle = "#8e2020";

    ctx.beginPath();

    ctx.moveTo(
        center.x - 29,
        center.y - 24
    );

    ctx.lineTo(
        center.x,
        center.y - 42
    );

    ctx.lineTo(
        center.x + 29,
        center.y - 24
    );

    ctx.closePath();

    ctx.fill();


    ctx.fillStyle = "#fff";

    ctx.font =
        "bold 10px Arial";

    ctx.textAlign = "center";

    ctx.fillText(
        "BASE",
        center.x,
        center.y + 4
    );


    // HP
    ctx.fillStyle = "#222";

    ctx.fillRect(
        center.x - 25,
        center.y + 31,
        50,
        5
    );


    ctx.fillStyle = "#4caf50";

    ctx.fillRect(
        center.x - 25,
        center.y + 31,
        50 * Math.max(
            0,
            baseHP / 100
        ),
        5
    );
}


// =====================================================
// UI
// =====================================================

function updateUI() {

    hpText.textContent =
        Math.max(0, baseHP);

    goldText.textContent =
        gold;

    waveText.textContent =
        wave;
}


// =====================================================
// GAME OVER
// =====================================================

function gameOver() {

    gameRunning = false;

    startButton.disabled = false;
    startButton.textContent = "RESTART";


    setTimeout(() => {

        alert(
            "GAME OVER\n\n기지가 파괴되었습니다."
        );

    }, 100);
}


// =====================================================
// GAME LOOP
// =====================================================

function gameLoop() {

    if (!gameRunning) {

        draw();

        return;
    }


    updateEnemies();
    updateTowers();
    updateBullets();
    updateEffects();

    draw();

    requestAnimationFrame(gameLoop);
}


// =====================================================
// INITIAL DRAW
// =====================================================

updateUI();
draw();
