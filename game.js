// =====================================================
// CANVAS
// =====================================================

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");


// =====================================================
// UI
// =====================================================

const hpText = document.getElementById("hp");
const goldText = document.getElementById("gold");
const waveText = document.getElementById("wave");
const startButton = document.getElementById("startButton");


// =====================================================
// MAP SETTINGS
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

let gameEnded = false;
let gameResult = "";
let enemiesDefeated = 0;
const CLEAR_KILLS = 20;


// =====================================================
// OBJECTS
// =====================================================

const towers = [];
const enemies = [];
const bullets = [];
const effects = [];


// =====================================================
// MOUSE STATE
// =====================================================

let mouseCol = -1;
let mouseRow = -1;

let hoveredTower = null;
let selectedTower = null;


// =====================================================
// TOWER SETTINGS
// =====================================================

const TOWER_COST = 40;

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
// MONSTER PATH
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
// TILE CENTER
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
    gameEnded = false;
    gameResult = "";

    baseHP = 100;
    gold = 100;
    wave = 1;
    enemiesDefeated = 0;

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


    hoveredTower = null;


    for (const tower of towers) {

        const distance = Math.hypot(
            tower.x - x,
            tower.y - y
        );


        if (distance < 25) {

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
// MOUSE CLICK
// =====================================================

canvas.addEventListener("click", (event) => {

    const rect = canvas.getBoundingClientRect();

    const x =
        (event.clientX - rect.left)
        * (canvas.width / rect.width);

    const y =
        (event.clientY - rect.top)
        * (canvas.height / rect.height);

    if (gameEnded) {

        const centerX = canvas.width / 2;
        const buttonY = canvas.height / 2 + 65;
        const buttonWidth = 170;
        const buttonHeight = 48;
        const gap = 20;
        const homeX = centerX - buttonWidth - gap / 2;
        const restartX = centerX + gap / 2;

        if (x >= homeX && x <= homeX + buttonWidth && y >= buttonY && y <= buttonY + buttonHeight) {
            window.location.reload();
            return;
        }

        if (x >= restartX && x <= restartX + buttonWidth && y >= buttonY && y <= buttonY + buttonHeight) {
            startGame();
            return;
        }

        return;
    }

    if (!gameRunning) return;

    // =================================================
    // 1. 업그레이드 버튼 확인
    // =================================================

    if (selectedTower) {

        const panelWidth = 250;

        const panelX =
            canvas.width - panelWidth - 15;

        const panelY = 15;

        const closeX = panelX + panelWidth - 40;
        const closeY = panelY + 10;
        const closeWidth = 28;
        const closeHeight = 28;

        if (x >= closeX && x <= closeX + closeWidth && y >= closeY && y <= closeY + closeHeight) {
            selectedTower = null;
            return;
        }

        const buttonX =
            panelX + 15;

        const buttonY =
            panelY + 145;

        const buttonWidth = 220;
        const buttonHeight = 40;


        if (
            x >= buttonX &&
            x <= buttonX + buttonWidth &&
            y >= buttonY &&
            y <= buttonY + buttonHeight
        ) {

            upgradeTower(selectedTower);

            // 중요:
            // 여기서 반드시 종료
            // 타워 설치 코드로 내려가지 않음

            return;
        }
    }


    // =================================================
    // 2. 기존 타워 클릭
    // =================================================

    for (const tower of towers) {

        const distance =
            Math.hypot(
                tower.x - x,
                tower.y - y
            );


        if (distance < 25) {

            selectedTower = tower;

            return;
        }
    }


    // =================================================
    // 3. 맵 좌표 계산
    // =================================================

    const col =
        Math.floor(x / TILE_SIZE);

    const row =
        Math.floor(y / TILE_SIZE);


    if (
        col < 0 ||
        row < 0 ||
        col >= COLS ||
        row >= ROWS
    ) {

        return;
    }


    // =================================================
    // 4. 빈 공간 클릭
    // =================================================

    selectedTower = null;


    // =================================================
    // 5. 골드 확인
    // =================================================

    if (gold < TOWER_COST) {

        return;
    }


    // =================================================
    // 6. 길 확인
    // =================================================

    if (isPathTile(col, row)) {

        return;
    }


    // =================================================
    // 7. 기존 타워 확인
    // =================================================

    if (hasTower(col, row)) {

        return;
    }


    // =================================================
    // 8. 타워 설치
    // =================================================

    const center =
        tileCenter(col, row);


    towers.push({

        col: col,
        row: row,

        x: center.x,
        y: center.y,

        level: 1,

        damage:
            towerLevels[1].damage,

        range:
            towerLevels[1].range,

        fireRate:
            towerLevels[1].fireRate,

        cooldown: 0
    });


    gold -= TOWER_COST;

    updateUI();
});


// =====================================================
// UPGRADE TOWER
// =====================================================

function upgradeTower(tower) {

    if (!tower) return;


    // 최고 레벨
    if (tower.level >= 3) {

        return;
    }


    const currentLevel =
        tower.level;


    const nextLevel =
        currentLevel + 1;


    const upgradeCost =
        towerLevels[
            currentLevel
        ].upgradeCost;


    // 골드 부족
    if (gold < upgradeCost) {

        return;
    }


    // 비용 차감
    gold -= upgradeCost;


    // 레벨 상승
    tower.level =
        nextLevel;


    // 능력치 변경
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

    if (!gameRunning) {

        return;
    }


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

        const enemy =
            enemies[i];


        const targetTile =
            pathTiles[
                enemy.pathIndex
            ];


        // 기지 도착
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


        if (
            distance <=
            enemy.speed
        ) {

            enemy.x =
                target.x;

            enemy.y =
                target.y;

            enemy.pathIndex++;

        } else {

            enemy.x +=
                (dx / distance)
                * enemy.speed;

            enemy.y +=
                (dy / distance)
                * enemy.speed;
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

        let closestDistance =
            Infinity;


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

                closestDistance =
                    distance;
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

        const bullet =
            bullets[i];


        if (
            !enemies.includes(
                bullet.target
            )
        ) {

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


            // 몬스터 사망
            if (target.hp <= 0) {

                const index =
                    enemies.indexOf(target);


                if (index !== -1) {

                    enemies.splice(
                        index,
                        1
                    );

                    enemiesDefeated++;
                    gold += 10;
                    updateUI();

                    if (enemiesDefeated >= CLEAR_KILLS) {
                        gameClear();
                        return;
                    }
                }
            }

        } else {

            bullet.x +=
                (dx / distance)
                * bullet.speed;

            bullet.y +=
                (dy / distance)
                * bullet.speed;
        }
    }
}


// =====================================================
// EFFECT
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

        color: color,

        upgrade: false
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

        const effect =
            effects[i];


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

    if (gameEnded) {
        drawEndScreen();
    }
}


// =====================================================
// BACKGROUND
// =====================================================

function drawBackground() {

    ctx.fillStyle =
        "#6f9d52";


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

    if (
        pathTiles.length === 0
    ) {

        return;
    }


    ctx.save();


    const first =
        tileCenter(
            pathTiles[0].col,
            pathTiles[0].row
        );


    // ---------------------------------------------
    // 길 외곽
    // ---------------------------------------------

    ctx.strokeStyle =
        "#8d7a52";

    ctx.lineWidth =
        TILE_SIZE + 6;

    ctx.lineJoin =
        "round";

    ctx.lineCap =
        "round";


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


    // ---------------------------------------------
    // 실제 길
    // ---------------------------------------------

    ctx.strokeStyle =
        "#b6a477";

    ctx.lineWidth =
        TILE_SIZE;

    ctx.lineJoin =
        "round";

    ctx.lineCap =
        "round";


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


    // ---------------------------------------------
    // 길 중앙 장식
    // ---------------------------------------------

    ctx.strokeStyle =
        "rgba(255,255,255,0.15)";

    ctx.lineWidth = 2;

    ctx.lineCap =
        "round";

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


    // 기존 타워 위에서는
    // 설치 미리보기 표시하지 않음

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
        gold >= TOWER_COST;


    // ---------------------------------------------
    // 마우스가 올라간 칸
    // ---------------------------------------------

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


    // ---------------------------------------------
    // 설치 미리보기
    // ---------------------------------------------

    if (canBuild) {

        const center =
            tileCenter(
                mouseCol,
                mouseRow
            );


        ctx.globalAlpha =
            0.45;


        // 타워 바닥

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


        // 타워 본체

        ctx.fillStyle =
            "#4569d4";


        ctx.fillRect(
            center.x - 14,
            center.y - 14,
            28,
            28
        );


        // 포신

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
// DRAW TOWERS
// =====================================================

function drawTowers() {

    towers.forEach(tower => {


        // ---------------------------------------------
        // 사거리 표시
        // ---------------------------------------------

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


        // ---------------------------------------------
        // 그림자
        // ---------------------------------------------

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


        // ---------------------------------------------
        // 타워 바닥
        // ---------------------------------------------

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


        // ---------------------------------------------
        // 레벨별 색상
        // ---------------------------------------------

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


        // ---------------------------------------------
        // 타워 본체
        // ---------------------------------------------

        ctx.fillRect(
            tower.x - 14,
            tower.y - 14,
            28,
            28
        );


        // ---------------------------------------------
        // 포신
        // ---------------------------------------------

        ctx.fillStyle =
            "#a9c0ff";


        ctx.fillRect(
            tower.x - 4,
            tower.y - 27,
            8,
            17
        );


        // ---------------------------------------------
        // 중앙
        // ---------------------------------------------

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


        // ---------------------------------------------
        // 레벨 숫자
        // ---------------------------------------------

        ctx.fillStyle =
            "#ffffff";

        ctx.font =
            "bold 11px Arial";

        ctx.textAlign =
            "center";


        ctx.fillText(
            tower.level,
            tower.x,
            tower.y + 4
        );


        // ---------------------------------------------
        // 3단계 별
        // ---------------------------------------------

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

    if (!selectedTower) return;

    const panelWidth = 250;
    const panelHeight = 205;
    const panelX = canvas.width - panelWidth - 15;
    const panelY = 15;

    ctx.save();
    ctx.beginPath();
    ctx.rect(panelX, panelY, panelWidth, panelHeight);
    ctx.clip();

    ctx.fillStyle = "rgba(25,30,38,0.96)";
    ctx.fillRect(panelX, panelY, panelWidth, panelHeight);

    ctx.strokeStyle = "rgba(255,255,255,0.2)";
    ctx.lineWidth = 1;
    ctx.strokeRect(panelX, panelY, panelWidth, panelHeight);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 17px Arial";
    ctx.textAlign = "left";
    ctx.fillText("TOWER", panelX + 15, panelY + 25);

    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.fillRect(panelX + panelWidth - 40, panelY + 10, 28, 28);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 18px Arial";
    ctx.textAlign = "center";
    ctx.fillText("×", panelX + panelWidth - 26, panelY + 30);

    ctx.fillStyle = "#8ed8ff";
    ctx.font = "bold 14px Arial";
    ctx.textAlign = "left";
    ctx.fillText("LEVEL " + selectedTower.level, panelX + 15, panelY + 48);

    ctx.fillStyle = "#dddddd";
    ctx.font = "13px Arial";
    ctx.fillText("Damage: " + selectedTower.damage, panelX + 15, panelY + 73);
    ctx.fillText("Range: " + selectedTower.range, panelX + 130, panelY + 73);
    ctx.fillText("Attack Speed: " + selectedTower.fireRate, panelX + 15, panelY + 95);

    ctx.fillStyle = "#999999";
    ctx.font = "11px Arial";
    ctx.fillText("Upgrade this tower", panelX + 15, panelY + 125);

    const buttonX = panelX + 15;
    const buttonY = panelY + 145;
    const buttonWidth = 220;
    const buttonHeight = 40;

    let buttonColor;
    if (selectedTower.level >= 3) {
        buttonColor = "#555b63";
    } else {
        const cost = towerLevels[selectedTower.level].upgradeCost;
        buttonColor = gold >= cost ? "#3c9b68" : "#754747";
    }

    ctx.fillStyle = buttonColor;
    ctx.fillRect(buttonX, buttonY, buttonWidth, buttonHeight);
    ctx.strokeStyle = "rgba(255,255,255,0.25)";
    ctx.strokeRect(buttonX, buttonY, buttonWidth, buttonHeight);

    ctx.textAlign = "center";
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 13px Arial";

    if (selectedTower.level >= 3) {
        ctx.fillText("MAX LEVEL", buttonX + buttonWidth / 2, buttonY + 25);
    } else {
        const cost = towerLevels[selectedTower.level].upgradeCost;
        ctx.fillText("UPGRADE  •  " + cost + " GOLD", buttonX + buttonWidth / 2, buttonY + 25);
    }

    ctx.restore();
}

// =====================================================
// ENEMY DRAW
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


        // 몬스터

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
            "#ffffff";


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
            "#222222";


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
// BULLET DRAW
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
            (
                bullet.target.x -
                bullet.x
            ) * 0.35,

            bullet.y -
            (
                bullet.target.y -
                bullet.y
            ) * 0.35
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
// EFFECT DRAW
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


    // 기지 그림자

    ctx.fillStyle =
        "rgba(0,0,0,0.2)";


    ctx.fillRect(
        center.x - 26,
        center.y + 27,
        52,
        6
    );


    // 기지 본체

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
        "#ffffff";

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
        "#222222";


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
// UI UPDATE
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
    endGame("GAME OVER", "기지가 파괴되었습니다.");
}

function gameClear() {
    endGame("CLEAR!", "기지를 지켜냈습니다.");
}

function endGame(title, message) {
    gameRunning = false;
    gameEnded = true;
    gameResult = message;
    selectedTower = null;
    hoveredTower = null;
    startButton.disabled = false;
    startButton.textContent = "RESTART";
    draw();
}

function drawEndScreen() {

    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.62)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const panelWidth = 500;
    const panelHeight = 250;
    const panelX = centerX - panelWidth / 2;
    const panelY = centerY - panelHeight / 2;

    ctx.fillStyle = "rgba(25,30,38,0.98)";
    ctx.fillRect(panelX, panelY, panelWidth, panelHeight);
    ctx.strokeStyle = "rgba(255,255,255,0.25)";
    ctx.lineWidth = 2;
    ctx.strokeRect(panelX, panelY, panelWidth, panelHeight);

    ctx.textAlign = "center";
    ctx.fillStyle = gameResult === "기지를 지켜냈습니다." ? "#ffd54f" : "#ff6b6b";
    ctx.font = "bold 36px Arial";
    ctx.fillText(gameResult === "기지를 지켜냈습니다." ? "CLEAR!" : "GAME OVER", centerX, centerY - 55);

    ctx.fillStyle = "#dddddd";
    ctx.font = "16px Arial";
    ctx.fillText(gameResult, centerX, centerY - 20);

    const buttonWidth = 170;
    const buttonHeight = 48;
    const gap = 20;
    const buttonY = centerY + 65;
    const homeX = centerX - buttonWidth - gap / 2;
    const restartX = centerX + gap / 2;

    ctx.fillStyle = "#4c5663";
    ctx.fillRect(homeX, buttonY, buttonWidth, buttonHeight);
    ctx.fillStyle = "#3c9b68";
    ctx.fillRect(restartX, buttonY, buttonWidth, buttonHeight);
    ctx.strokeStyle = "rgba(255,255,255,0.25)";
    ctx.strokeRect(homeX, buttonY, buttonWidth, buttonHeight);
    ctx.strokeRect(restartX, buttonY, buttonWidth, buttonHeight);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 15px Arial";
    ctx.fillText("시작화면", homeX + buttonWidth / 2, buttonY + 30);
    ctx.fillText("재시작", restartX + buttonWidth / 2, buttonY + 30);

    ctx.restore();
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
// INITIALIZE
// =====================================================

updateUI();

draw();
