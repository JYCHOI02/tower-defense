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

let hoveredTower = null;
let selectedTower = null;


// =====================================================
// TOWER SETTINGS
// =====================================================

const towerLevels = {

    1: {
        damage: 10,
        range: 125,
        fireRate: 35,
        upgradeCost: 60
    },

    2: {
        damage: 18,
        range: 140,
        fireRate: 28,
        upgradeCost: 120
    },

    3: {
        damage: 30,
        range: 160,
        fireRate: 20,
        upgradeCost: 0
    }
};


// =====================================================
// PATH
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
// START GAME
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

    selectedTower = null;
    hoveredTower = null;

    startButton.disabled = true;
    startButton.textContent = "RUNNING";

    updateUI();

    spawnEnemy();

    requestAnimationFrame(gameLoop);
}


// =====================================================
// MOUSE MOVE
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


    // 현재 마우스가 올라간 타워 찾기

    hoveredTower = null;

    for (const tower of towers) {

        const distance = Math.hypot(
            tower.x - x,
            tower.y - y
        );

        if (distance < 24) {

            hoveredTower = tower;

            break;
        }
    }
});


// =====================================================
// MOUSE LEAVE
// =====================================================

canvas.addEventListener("mouseleave", () => {

    mouseCol = -1;
    mouseRow = -1;

    hoveredTower = null;
});


// =====================================================
// CLICK
// =====================================================

canvas.addEventListener("click", (event) => {

    if (!gameRunning) return;


    const rect = canvas.getBoundingClientRect();

    const x =
        (event.clientX - rect.left)
        * (canvas.width / rect.width);

    const y =
        (event.clientY - rect.top)
        * (canvas.height / rect.height);


    // -----------------------------------------
    // 1. 기존 타워를 클릭했는지 확인
    // -----------------------------------------

    for (const tower of towers) {

        const distance = Math.hypot(
            tower.x - x,
            tower.y - y
        );

        if (distance < 25) {

            selectedTower = tower;

            return;
        }
    }


    // -----------------------------------------
    // 2. 빈 칸 클릭 → 타워 설치
    // -----------------------------------------

    const col = Math.floor(x / TILE_SIZE);
    const row = Math.floor(y / TILE_SIZE);


    if (
        col < 0 ||
        row < 0 ||
        col >= COLS ||
        row >= ROWS
    ) {
        return;
    }


    // 빈 공간을 클릭하면 선택 해제
    selectedTower = null;


    // 골드 부족
    if (gold < 40) {
        return;
    }


    // 길에는 설치 불가능
    if (isPathTile(col, row)) {
        return;
    }


    // 기존 타워가 있는 경우
    if (hasTower(col, row)) {
        return;
    }


    // -----------------------------------------
    // 타워 설치
    // -----------------------------------------

    const center =
        tileCenter(col, row);


    towers.push({

        col: col,
        row: row,

        x: center.x,
        y: center.y,

        level: 1,

        damage: towerLevels[1].damage,
        range: towerLevels[1].range,
        fireRate: towerLevels[1].fireRate,

        cooldown: 0
    });


    gold -= 40;

    updateUI();
});


// =====================================================
// UPGRADE CLICK
// =====================================================

canvas.addEventListener("click", (event) => {

    if (!selectedTower) return;


    const rect = canvas.getBoundingClientRect();

    const x =
        (event.clientX - rect.left)
        * (canvas.width / rect.width);

    const y =
        (event.clientY - rect.top)
        * (canvas.height / rect.height);


    const panelX = canvas.width - 215;
    const panelY = 20;

    const buttonX = panelX + 15;
    const buttonY = panelY + 145;
    const buttonWidth = 185;
    const buttonHeight = 40;


    // 업그레이드 버튼 클릭

    if (
        x >= buttonX &&
        x <= buttonX + buttonWidth &&
        y >= buttonY &&
        y <= buttonY + buttonHeight
    ) {

        upgradeTower(selectedTower);
    }
});


// =====================================================
// UPGRADE TOWER
// =====================================================

function upgradeTower(tower) {

    if (!tower) return;


    // 이미 최고 단계
    if (tower.level >= 3) {
        return;
    }


    const nextLevel =
        tower.level + 1;


    const cost =
        towerLevels[tower.level].upgradeCost;


    // 골드 부족
    if (gold < cost) {
        return;
    }


    // 비용 지불
    gold -= cost;


    // 레벨 증가
    tower.level = nextLevel;


    // 능력치 적용
    tower.damage =
        towerLevels[nextLevel].damage;

    tower.range =
        towerLevels[nextLevel].range;

    tower.fireRate =
        towerLevels[nextLevel].fireRate;


    // 업그레이드 효과
    createUpgradeEffect(
        tower.x,
        tower.y
    );


    updateUI();
}


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


    const start =
        tileCenter(
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


    setTimeout(
        spawnEnemy,
        1400
    );
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


        const dx =
            target.x - enemy.x;

        const dy =
            target.y - enemy.y;

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


        const target =
            bullet.target;


        const dx =
            target.x - bullet.x;

        const dy =
            target.y - bullet.y;

        const distance =
            Math.hypot(dx, dy);


        if (
            distance <=
            bullet.speed + 4
        ) {

            target.hp -=
                bullet.damage;


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

                    enemies.splice(
                        index,
                        1
                    );

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

function createHitEffect(
    x,
    y,
    color
) {

    effects.push({

        x: x,
        y: y,

        radius: 4,

        alpha: 1,

        color: color
    });
}


function createUpgradeEffect(
    x,
    y
) {

    effects.push({

        x: x,
        y: y,

        radius: 10,

        alpha: 1,

        color: "#64d8ff",

        upgrade: true
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

        effect.alpha -=
            effect.upgrade
                ? 0.04
                : 0.08;


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
    drawUpgradePanel();
}


// =====================================================
// BACKGROUND
// =====================================================

function drawBackground() {

    ctx.fillStyle = "#6f9d52";

    ctx.fillRect(
        0,
        0,
        canvas.width,
        canvas.height
    );
}


// =====================================================
// PATH
// =====================================================

function drawPath() {

    if (pathTiles.length === 0) {
        return;
    }


    ctx.save();


    // 길 외곽

    ctx.strokeStyle = "#8d7a52";

    ctx.lineWidth =
        TILE_SIZE + 6;

    ctx.lineJoin = "round";
    ctx.lineCap = "round";


    ctx.beginPath();


    const first =
        tileCenter(
            pathTiles[0].col,
            pathTiles[0].row
        );


    ctx.moveTo(
        first.x,
        first.y
    );


    for (
        let i = 1;
        i < pathTiles.length;
        i++
    ) {

        const point =
            tileCenter(
                pathTiles[i].col,
                pathTiles[i].row
            );


        ctx.lineTo(
            point.x,
            point.y
        );
    }


    ctx.stroke();


    // 실제 길

    ctx.strokeStyle = "#b6a477";

    ctx.lineWidth =
        TILE_SIZE;

    ctx.lineJoin = "round";
    ctx.lineCap = "round";


    ctx.beginPath();


    ctx.moveTo(
        first.x,
        first.y
    );


    for (
        let i = 1;
        i < pathTiles.length;
        i++
    ) {

        const point =
            tileCenter(
                pathTiles[i].col,
                pathTiles[i].row
            );


        ctx.lineTo(
            point.x,
            point.y
        );
    }


    ctx.stroke();


    // 길 중앙 장식

    ctx.strokeStyle =
        "rgba(255,255,255,0.15)";

    ctx.lineWidth = 2;

    ctx.setLineDash([
        8,
        10
    ]);


    ctx.beginPath();


    ctx.moveTo(
        first.x,
        first.y
    );


    for (
        let i = 1;
        i < pathTiles.length;
        i++
    ) {

        const point =
            tileCenter(
                pathTiles[i].col,
                pathTiles[i].row
            );


        ctx.lineTo(
            point.x,
            point.y
        );
    }


    ctx.stroke();

    ctx.setLineDash([]);

    ctx.restore();
}


// =====================================================
// TOWER PREVIEW
// =====================================================

function drawTowerPreview() {

    if (
        mouseCol < 0 ||
        mouseRow < 0 ||
        !gameRunning
    ) {
        return;
    }


    // 설치된 타워에 마우스를 올린 경우
    // 설치 미리보기는 표시하지 않음

    if (hoveredTower) {
        return;
    }


    const x =
        mouseCol * TILE_SIZE;

    const y =
        mouseRow * TILE_SIZE;


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


    // 현재 칸만 표시

    ctx.fillStyle =
        canBuild
            ? "rgba(80,180,255,0.18)"
            : "rgba(255,70,70,0.18)";


    ctx.fillRect(
        x + 2,
        y + 2,
        TILE_SIZE - 4,
        TILE_SIZE - 4
    );


    ctx.strokeStyle =
        canBuild
            ? "rgba(140,220,255,0.9)"
            : "rgba(255,100,100,0.9)";


    ctx.lineWidth = 2;


    ctx.strokeRect(
        x + 2,
        y + 2,
        TILE_SIZE - 4,
        TILE_SIZE - 4
    );


    // 설치 가능한 타워 미리보기

    if (canBuild) {

        const center =
            tileCenter(
                mouseCol,
                mouseRow
            );


        ctx.globalAlpha = 0.45;


        ctx.fillStyle =
            "#263238";


        ctx.beginPath();

        ctx.arc(
            center.x,
            center.y,
            20,
            0,
            Math.PI * 2
        );

        ctx.fill();


        ctx.fillStyle =
            "#4569d4";


        ctx.fillRect(
            center.x - 14,
            center.y - 14,
            28,
            28
        );


        ctx.fillStyle =
            "#a9c0ff";


        ctx.fillRect(
            center.x - 4,
            center.y - 27,
            8,
            17
        );


        ctx.globalAlpha = 1;


        // 예상 사거리

        ctx.beginPath();

        ctx.arc(
            center.x,
            center.y,
            towerLevels[1].range,
            0,
            Math.PI * 2
        );


        ctx.fillStyle =
            "rgba(80,140,255,0.05)";

        ctx.fill();


        ctx.strokeStyle =
            "rgba(120,180,255,0.35)";

        ctx.lineWidth = 1;

        ctx.stroke();
    }
}


// =====================================================
// TOWERS
// =====================================================

function drawTowers() {

    towers.forEach(tower => {

        // 선택된 타워 또는 마우스를 올린 타워의 사거리

        if (
            tower === hoveredTower ||
            tower === selectedTower
        ) {

            ctx.beginPath();

            ctx.arc(
                tower.x,
                tower.y,
                tower.range,
                0,
                Math.PI * 2
            );


            ctx.fillStyle =
                "rgba(80,140,255,0.08)";

            ctx.fill();


            ctx.strokeStyle =
                "rgba(130,190,255,0.75)";

            ctx.lineWidth = 2;

            ctx.setLineDash([
                6,
                5
            ]);

            ctx.stroke();

            ctx.setLineDash([]);
        }


        // 타워 그림자

        ctx.fillStyle =
            "rgba(0,0,0,0.25)";


        ctx.beginPath();

        ctx.ellipse(
            tower.x,
            tower.y + 17,
            20,
            7,
            0,
            0,
            Math.PI * 2
        );

        ctx.fill();


        // 타워 바닥

        ctx.fillStyle =
            "#263238";


        ctx.beginPath();

        ctx.arc(
            tower.x,
            tower.y,
            20,
            0,
            Math.PI * 2
        );

        ctx.fill();


        // 레벨에 따른 타워 색상

        if (tower.level === 1) {

            ctx.fillStyle =
                "#4569d4";

        } else if (tower.level === 2) {

            ctx.fillStyle =
                "#6355d9";

        } else {

            ctx.fillStyle =
                "#d49a35";
        }


        // 타워 본체

        ctx.fillRect(
            tower.x - 14,
            tower.y - 14,
            28,
            28
        );


        // 포신

        ctx.fillStyle =
            "#a9c0ff";


        ctx.fillRect(
            tower.x - 4,
            tower.y - 27,
            8,
            17
        );


        // 중앙

        ctx.fillStyle =
            "#e1e8ff";


        ctx.beginPath();

        ctx.arc(
            tower.x,
            tower.y,
            5,
            0,
            Math.PI * 2
        );

        ctx.fill();


        // 레벨 표시

        ctx.fillStyle = "#ffffff";

        ctx.font =
            "bold 11px Arial";

        ctx.textAlign =
            "center";

        ctx.fillText(
            tower.level,
            tower.x,
            tower.y + 4
        );


        // 최고 단계 표시

        if (tower.level === 3) {

            ctx.fillStyle =
                "#ffe066";

            ctx.font =
                "bold 13px Arial";

            ctx.fillText(
                "★",
                tower.x,
                tower.y - 32
            );
        }
    });
}


// =====================================================
// UPGRADE PANEL
// =====================================================

function drawUpgradePanel() {

    if (!selectedTower) {
        return;
    }


    const panelWidth = 215;
    const panelHeight = 205;

    const panelX =
        canvas.width - panelWidth - 15;

    const panelY = 15;


    // 패널 배경

    ctx.fillStyle =
        "rgba(25,30,38,0.96)";


    ctx.fillRect(
        panelX,
        panelY,
        panelWidth,
        panelHeight
    );


    // 패널 테두리

    ctx.strokeStyle =
        "rgba(255,255,255,0.2)";

    ctx.lineWidth = 1;

    ctx.strokeRect(
        panelX,
        panelY,
        panelWidth,
        panelHeight
    );


    // 제목

    ctx.fillStyle =
        "#ffffff";

    ctx.font =
        "bold 17px Arial";

    ctx.textAlign =
        "left";


    ctx.fillText(
        "TOWER",
        panelX + 15,
        panelY + 25
    );


    // 현재 레벨

    ctx.fillStyle =
        "#8ed8ff";

    ctx.font =
        "bold 14px Arial";


    ctx.fillText(
        "LEVEL " +
        selectedTower.level,
        panelX + 15,
        panelY + 48
    );


    // 스탯

    ctx.fillStyle =
        "#dddddd";

    ctx.font =
        "13px Arial";


    ctx.fillText(
        "Damage: " +
        selectedTower.damage,
        panelX + 15,
        panelY + 73
    );


    ctx.fillText(
        "Range: " +
        selectedTower.range,
        panelX + 105,
        panelY + 73
    );


    ctx.fillText(
        "Attack Speed: " +
        selectedTower.fireRate,
        panelX + 15,
        panelY + 95
    );


    // 업그레이드 버튼

    const buttonX =
        panelX + 15;

    const buttonY =
        panelY + 145;

    const buttonWidth = 185;
    const buttonHeight = 40;


    if (selectedTower.level >= 3) {

        ctx.fillStyle =
            "#555b63";

    } else {

        const cost =
            towerLevels[
                selectedTower.level
            ].upgradeCost;


        ctx.fillStyle =
            gold >= cost
                ? "#3c9b68"
                : "#754747";
    }


    ctx.fillRect(
        buttonX,
        buttonY,
        buttonWidth,
        buttonHeight
    );


    ctx.strokeStyle =
        "rgba(255,255,255,0.25)";

    ctx.strokeRect(
        buttonX,
        buttonY,
        buttonWidth,
        buttonHeight
    );


    ctx.textAlign =
        "center";


    if (selectedTower.level >= 3) {

        ctx.fillStyle =
            "#dddddd";

        ctx.font =
            "bold 13px Arial";

        ctx.fillText(
            "MAX LEVEL",
            buttonX + buttonWidth / 2,
            buttonY + 25
        );

    } else {

        const cost =
            towerLevels[
                selectedTower.level
            ].upgradeCost;


        ctx.fillStyle =
            "#ffffff";

        ctx.font =
            "bold 13px Arial";


        ctx.fillText(
            "UPGRADE  •  " +
            cost +
            " GOLD",
            buttonX + buttonWidth / 2,
            buttonY + 25
        );
    }


    // 패널 밖 클릭 안내

    ctx.textAlign =
        "left";

    ctx.fillStyle =
        "#999999";

    ctx.font =
        "11px Arial";


    ctx.fillText(
        "Click another tower to select",
        panelX + 15,
        panelY + 132
    );
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

        ctx.fillStyle =
            "#d93636";


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

        ctx.fillStyle =
            "#fff";


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

        ctx.fillStyle =
            "#222";


        ctx.fillRect(
            enemy.x - 18,
            enemy.y - 27,
            36,
            5
        );


        // HP

        ctx.fillStyle =
            "#55d66a";


        ctx.fillRect(
            enemy.x - 18,
            enemy.y - 27,
            36 *
            Math.max(
                0,
                enemy.hp /
                enemy.maxHP
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

        // 총알 궤적

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
            (bullet.target.x -
            bullet.x) * 0.35,

            bullet.y -
            (bullet.target.y -
            bullet.y) * 0.35
        );


        ctx.stroke();


        // 총알

        ctx.fillStyle =
            "#ffe066";


        ctx.beginPath();

        ctx.arc(
            bullet.x,
            bullet.y,
            5,
            0,
            Math.PI * 2
        );

        ctx.fill();


        // 총알 빛

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
        pathTiles[
            pathTiles.length - 1
        ];


    const center =
        tileCenter(
            base.col,
            base.row
        );


    // 기지

    ctx.fillStyle =
        "#552b2b";


    ctx.fillRect(
        base.col * TILE_SIZE + 2,
        base.row * TILE_SIZE + 2,
        TILE_SIZE - 4,
        TILE_SIZE - 4
    );


    // 본체

    ctx.fillStyle =
        "#d63c3c";


    ctx.fillRect(
        center.x - 24,
        center.y - 24,
        48,
        48
    );


    // 지붕

    ctx.fillStyle =
        "#8e2020";


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


    // BASE

    ctx.fillStyle =
        "#fff";

    ctx.font =
        "bold 10px Arial";

    ctx.textAlign =
        "center";


    ctx.fillText(
        "BASE",
        center.x,
        center.y + 4
    );


    // HP 배경

    ctx.fillStyle =
        "#222";


    ctx.fillRect(
        center.x - 25,
        center.y + 31,
        50,
        5
    );


    // HP

    ctx.fillStyle =
        "#4caf50";


    ctx.fillRect(
        center.x - 25,
        center.y + 31,
        50 *
        Math.max(
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
        Math.max(
            0,
            baseHP
        );

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

    selectedTower = null;

    startButton.disabled = false;

    startButton.textContent =
        "RESTART";


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


    requestAnimationFrame(
        gameLoop
    );
}


// =====================================================
// INITIAL DRAW
// =====================================================

updateUI();

draw();
