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

let gameState = "menu"; // menu / howto / playing / ended
let gameResult = null;  // clear / gameover
let enemiesDefeated = 0;

const WIN_KILLS = 20;

let baseHP = 100;
let gold = 100;
let wave = 1;


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

// 모든 타워의 설치 가격은 동일합니다.
const towerTypes = {
    basic:  { name: "BASIC",  damage: 1.00, range: 1.00, fireRate: 1.00, splash: 0 },
    cannon: { name: "CANNON", damage: 1.80, range: 0.90, fireRate: 1.45, splash: 0 },
    splash: { name: "SPLASH", damage: 0.75, range: 0.95, fireRate: 1.15, splash: 48 }
};

let selectedTowerType = "basic";

const towerLevels = {

    1: { damage: 10, range: 125, fireRate: 35, upgradeCost: 60 },
    2: { damage: 18, range: 140, fireRate: 28, upgradeCost: 120 },
    3: { damage: 30, range: 160, fireRate: 20, upgradeCost: 0 }
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

// 기존 HTML 시작 버튼은 사용하지 않고
// Canvas 중앙 메뉴를 사용합니다.
if (startButton) {
    startButton.style.display = "none";
}


function startGame() {

    gameRunning = true;
    gameState = "playing";
    gameResult = null;
    enemiesDefeated = 0;

    baseHP = 100;
    gold = 100;
    wave = 1;

    towers.length = 0;
    enemies.length = 0;
    bullets.length = 0;
    effects.length = 0;

    selectedTower = null;
    hoveredTower = null;
    selectedTowerType = "basic";

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


    // =================================================
    // 초기 화면
    // =================================================

    if (gameState === "menu") {

        const centerX = canvas.width / 2;

        if (
            x >= centerX - 120 &&
            x <= centerX + 120 &&
            y >= 255 &&
            y <= 305
        ) {
            startGame();
            return;
        }

        if (
            x >= centerX - 120 &&
            x <= centerX + 120 &&
            y >= 325 &&
            y <= 375
        ) {
            gameState = "howto";
            draw();
            return;
        }

        return;
    }


    // =================================================
    // 게임 설명 화면
    // =================================================

    if (gameState === "howto") {

        const centerX = canvas.width / 2;

        if (
            x >= centerX - 100 &&
            x <= centerX + 100 &&
            y >= 430 &&
            y <= 480
        ) {
            gameState = "menu";
            draw();
            return;
        }

        return;
    }


    // =================================================
    // 게임 종료 화면
    // =================================================

    if (gameState === "ended") {

        const centerX = canvas.width / 2;

        // 초기 화면으로
        if (
            x >= centerX - 145 &&
            x <= centerX - 10 &&
            y >= 330 &&
            y <= 380
        ) {
            gameResult = null;
            gameState = "menu";
            draw();
            return;
        }

        // 바로 재시작
        if (
            x >= centerX + 10 &&
            x <= centerX + 145 &&
            y >= 330 &&
            y <= 380
        ) {
            startGame();
            return;
        }

        return;
    }


    if (!gameRunning) return;

    // =================================================
    // 타워 종류 선택
    // =================================================

    if (gameState === "playing") {

        const selectorY = canvas.height - 72;
        const buttonWidth = 125;
        const gap = 10;
        const totalWidth = buttonWidth * 3 + gap * 2;
        const startX = (canvas.width - totalWidth) / 2;
        const types = ["basic", "cannon", "splash"];

        for (let i = 0; i < types.length; i++) {

            const bx = startX + i * (buttonWidth + gap);

            if (
                x >= bx &&
                x <= bx + buttonWidth &&
                y >= selectorY &&
                y <= selectorY + 48
            ) {
                selectedTowerType = types[i];
                selectedTower = null;
                return;
            }
        }
    }


    // =================================================
    // 1. 업그레이드 패널 닫기 / 버튼 확인
    // =================================================

    if (selectedTower) {

        const panelWidth = 240;

        const panelX =
            canvas.width - panelWidth - 15;

        const panelY = 15;

        const closeX = panelX + panelWidth - 35;
        const closeY = panelY + 10;
        const closeWidth = 25;
        const closeHeight = 25;

        if (
            x >= closeX &&
            x <= closeX + closeWidth &&
            y >= closeY &&
            y <= closeY + closeHeight
        ) {
            selectedTower = null;
            return;
        }

        const buttonX =
            panelX + 15;

        const buttonY =
            panelY + 145;

        const buttonWidth = 210;
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


    const towerType = towerTypes[selectedTowerType];

    towers.push({

        col: col,
        row: row,

        x: center.x,
        y: center.y,

        type: selectedTowerType,

        level: 1,

        damage:
            towerLevels[1].damage *
            towerType.damage,

        range:
            towerLevels[1].range *
            towerType.range,

        fireRate:
            towerLevels[1].fireRate *
            towerType.fireRate,

        splashRadius:
            towerType.splash,

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
    const towerType =
        towerTypes[tower.type || "basic"];

    tower.damage =
        towerLevels[nextLevel].damage *
        towerType.damage;

    tower.range =
        towerLevels[nextLevel].range *
        towerType.range;

    tower.fireRate =
        towerLevels[nextLevel].fireRate *
        towerType.fireRate;

    tower.splashRadius =
        towerType.splash;


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

                speed:
                    tower.type === "cannon"
                        ? 6
                        : 7,

                damage: tower.damage,

                type: tower.type || "basic",

                splashRadius:
                    tower.splashRadius || 0
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
                bullet.type === "cannon"
                    ? "#ff9f43"
                    : bullet.type === "splash"
                        ? "#b983ff"
                        : "#ffd54f"
            );

            if (
                bullet.type === "splash" &&
                bullet.splashRadius > 0
            ) {

                enemies.forEach(enemy => {

                    if (enemy === target) return;

                    const distance =
                        Math.hypot(
                            enemy.x - target.x,
                            enemy.y - target.y
                        );

                    if (distance <= bullet.splashRadius) {

                        enemy.hp -=
                            bullet.damage * 0.6;

                        createHitEffect(
                            enemy.x,
                            enemy.y,
                            "#b983ff"
                        );
                    }
                });
            }

            bullets.splice(i, 1);

            for (
                let enemyIndex = enemies.length - 1;
                enemyIndex >= 0;
                enemyIndex--
            ) {

                const enemy = enemies[enemyIndex];

                if (enemy.hp <= 0) {

                    enemies.splice(
                        enemyIndex,
                        1
                    );

                    enemiesDefeated++;
                    gold += 10;
                }
            }

            updateUI();

            if (enemiesDefeated >= WIN_KILLS) {
                gameClear();
                return;
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

    drawTowerSelector();

    drawUpgradePanel();

    if (gameState === "menu") {
        drawMainMenu();
    }

    if (gameState === "howto") {
        drawHowToPlay();
    }

    if (gameState === "ended") {
        drawGameEndPopup();
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

        if (tower.type === "cannon") {

            ctx.fillStyle =
                tower.level === 1
                    ? "#b85c45"
                    : tower.level === 2
                        ? "#c96e4e"
                        : "#e0a13c";

        } else if (tower.type === "splash") {

            ctx.fillStyle =
                tower.level === 1
                    ? "#7d5ab8"
                    : tower.level === 2
                        ? "#9369d0"
                        : "#d49a35";

        } else {

            ctx.fillStyle =
                tower.level === 1
                    ? "#4569d4"
                    : tower.level === 2
                        ? "#6355d9"
                        : "#d49a35";
        }

        ctx.fillRect(
            tower.x - 14,
            tower.y - 14,
            28,
            28
        );


        // ---------------------------------------------
        // 포신 / 특수 장치
        // ---------------------------------------------

        if (tower.type === "cannon") {

            ctx.fillStyle = "#ffd0a8";

            ctx.fillRect(
                tower.x - 7,
                tower.y - 28,
                14,
                20
            );

        } else if (tower.type === "splash") {

            ctx.fillStyle = "#e0c8ff";

            ctx.beginPath();

            ctx.arc(
                tower.x,
                tower.y - 10,
                10,
                0,
                Math.PI * 2
            );

            ctx.fill();

        } else {

            ctx.fillStyle = "#a9c0ff";

            ctx.fillRect(
                tower.x - 4,
                tower.y - 27,
                8,
                17
            );
        }


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
// TOWER TYPE SELECTOR
// =====================================================

function drawTowerSelector() {

    if (gameState !== "playing") return;

    const y = canvas.height - 72;
    const width = 125;
    const height = 48;
    const gap = 10;
    const total = width * 3 + gap * 2;
    const startX = (canvas.width - total) / 2;

    const types = [
        ["basic", "BASIC"],
        ["cannon", "CANNON"],
        ["splash", "SPLASH"]
    ];

    types.forEach((item, i) => {

        const x =
            startX + i * (width + gap);

        const selected =
            selectedTowerType === item[0];

        ctx.fillStyle =
            selected
                ? "rgba(75,125,210,0.98)"
                : "rgba(25,30,38,0.94)";

        ctx.fillRect(
            x,
            y,
            width,
            height
        );

        ctx.strokeStyle =
            selected
                ? "rgba(170,220,255,0.95)"
                : "rgba(255,255,255,0.2)";

        ctx.lineWidth =
            selected ? 2 : 1;

        ctx.strokeRect(
            x,
            y,
            width,
            height
        );

        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 12px Arial";
        ctx.textAlign = "center";

        ctx.fillText(
            item[1],
            x + width / 2,
            y + 20
        );

        ctx.fillStyle = "#bfc8d8";
        ctx.font = "11px Arial";

        ctx.fillText(
            TOWER_COST + " GOLD",
            x + width / 2,
            y + 37
        );
    });
}


// =====================================================
// UPGRADE PANEL
// =====================================================

function drawUpgradePanel() {

    if (!selectedTower) {

        return;
    }


    const panelWidth = 240;
    const panelHeight = 210;


    const panelX =
        canvas.width -
        panelWidth -
        15;


    const panelY = 15;


    // ---------------------------------------------
    // 패널
    // ---------------------------------------------

    ctx.fillStyle =
        "rgba(25,30,38,0.96)";


    ctx.fillRect(
        panelX,
        panelY,
        panelWidth,
        panelHeight
    );


    ctx.strokeStyle =
        "rgba(255,255,255,0.2)";

    ctx.lineWidth = 1;


    ctx.strokeRect(
        panelX,
        panelY,
        panelWidth,
        panelHeight
    );


    // ---------------------------------------------
    // 제목
    // ---------------------------------------------

    ctx.fillStyle =
        "#ffffff";

    ctx.font =
        "bold 17px Arial";

    ctx.textAlign =
        "left";


    const selectedType =
        towerTypes[selectedTower.type || "basic"];

    ctx.fillText(
        selectedType.name + " TOWER",
        panelX + 15,
        panelY + 25
    );


    // ---------------------------------------------
    // 닫기 버튼
    // ---------------------------------------------

    ctx.fillStyle = "rgba(255,255,255,0.10)";
    ctx.fillRect(
        panelX + panelWidth - 35,
        panelY + 10,
        25,
        25
    );

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 17px Arial";
    ctx.textAlign = "center";

    ctx.fillText(
        "×",
        panelX + panelWidth - 22.5,
        panelY + 28
    );


    // ---------------------------------------------
    // 레벨
    // ---------------------------------------------

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


    // ---------------------------------------------
    // 스탯
    // ---------------------------------------------

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
        panelX + 125,
        panelY + 73
    );


    ctx.fillText(
        "Attack Speed: " +
        selectedTower.fireRate,
        panelX + 15,
        panelY + 95
    );


    // ---------------------------------------------
    // 안내 문구
    // ---------------------------------------------

    ctx.fillStyle =
        "#999999";

    ctx.font =
        "11px Arial";


    ctx.fillText(
        "Upgrade this tower",
        panelX + 15,
        panelY + 125
    );


    // ---------------------------------------------
    // 업그레이드 버튼
    // ---------------------------------------------

    const buttonX =
        panelX + 15;

    const buttonY =
        panelY + 145;

    const buttonWidth = 210;
    const buttonHeight = 40;


    let buttonColor;


    if (
        selectedTower.level >= 3
    ) {

        buttonColor =
            "#555b63";

    } else {

        const cost =
            towerLevels[
                selectedTower.level
            ].upgradeCost;


        buttonColor =
            gold >= cost
                ? "#3c9b68"
                : "#754747";
    }


    ctx.fillStyle =
        buttonColor;


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


    if (
        selectedTower.level >= 3
    ) {

        ctx.fillStyle =
            "#dddddd";

        ctx.font =
            "bold 13px Arial";


        ctx.fillText(
            "MAX LEVEL",
            buttonX +
            buttonWidth / 2,
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
            buttonX +
            buttonWidth / 2,
            buttonY + 25
        );
    }
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
            bullet.type === "cannon"
                ? "#ff9f43"
                : bullet.type === "splash"
                    ? "#c792ff"
                    : "#ffe066";


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

function gameClear() {

    gameRunning = false;
    gameState = "ended";
    gameResult = "clear";
    selectedTower = null;

    draw();
}


function gameOver() {

    gameRunning = false;
    gameState = "ended";
    gameResult = "gameover";
    selectedTower = null;

    draw();
}


// =====================================================
// MAIN MENU
// =====================================================

function drawMainMenu() {

    ctx.fillStyle = "rgba(15,20,28,0.82)";
    ctx.fillRect(
        0,
        0,
        canvas.width,
        canvas.height
    );


    const centerX = canvas.width / 2;


    ctx.textAlign = "center";

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 42px Arial";

    ctx.fillText(
        "TOWER DEFENSE",
        centerX,
        190
    );


    ctx.fillStyle = "#9fc9ff";
    ctx.font = "16px Arial";

    ctx.fillText(
        "Defend your base from incoming monsters",
        centerX,
        220
    );


    drawMenuButton(
        centerX - 120,
        255,
        240,
        50,
        "GAME START"
    );


    drawMenuButton(
        centerX - 120,
        325,
        240,
        50,
        "HOW TO PLAY"
    );
}


// =====================================================
// HOW TO PLAY
// =====================================================

function drawHowToPlay() {

    ctx.fillStyle = "rgba(15,20,28,0.92)";
    ctx.fillRect(
        0,
        0,
        canvas.width,
        canvas.height
    );


    const centerX = canvas.width / 2;


    ctx.textAlign = "center";

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 30px Arial";

    ctx.fillText(
        "HOW TO PLAY",
        centerX,
        105
    );


    ctx.textAlign = "left";
    ctx.fillStyle = "#dddddd";
    ctx.font = "16px Arial";


    const lines = [
        "• 마우스를 올려 설치 가능한 칸을 확인하세요.",
        "• 빈 칸을 클릭하면 타워를 설치할 수 있습니다.",
        "• 타워를 클릭하면 사거리와 업그레이드 정보가 표시됩니다.",
        "• 몬스터를 처치하면 골드를 얻습니다.",
        "• 골드를 사용해 타워를 최대 3단계까지 업그레이드하세요.",
        "• 기지 HP가 0이 되면 게임 오버입니다.",
        "• 몬스터 20마리를 처치하면 게임 클리어입니다."
    ];


    lines.forEach((line, index) => {

        ctx.fillText(
            line,
            centerX - 300,
            165 + index * 34
        );
    });


    drawMenuButton(
        centerX - 100,
        430,
        200,
        50,
        "BACK"
    );
}


// =====================================================
// GAME END POPUP
// =====================================================

function drawGameEndPopup() {

    ctx.fillStyle = "rgba(0,0,0,0.58)";
    ctx.fillRect(
        0,
        0,
        canvas.width,
        canvas.height
    );


    const width = 460;
    const height = 245;

    const x =
        (canvas.width - width) / 2;

    const y =
        (canvas.height - height) / 2;


    // 팝업
    ctx.fillStyle =
        "rgba(25,30,38,0.98)";

    ctx.fillRect(
        x,
        y,
        width,
        height
    );


    ctx.strokeStyle =
        "rgba(255,255,255,0.25)";

    ctx.lineWidth = 2;

    ctx.strokeRect(
        x,
        y,
        width,
        height
    );


    ctx.textAlign = "center";


    if (gameResult === "clear") {

        ctx.fillStyle = "#72e08a";
        ctx.font = "bold 36px Arial";

        ctx.fillText(
            "GAME CLEAR!",
            canvas.width / 2,
            y + 65
        );


        ctx.fillStyle = "#dddddd";
        ctx.font = "16px Arial";

        ctx.fillText(
            "기지를 성공적으로 지켰습니다.",
            canvas.width / 2,
            y + 105
        );

    } else {

        ctx.fillStyle = "#ff6666";
        ctx.font = "bold 36px Arial";

        ctx.fillText(
            "GAME OVER",
            canvas.width / 2,
            y + 65
        );


        ctx.fillStyle = "#dddddd";
        ctx.font = "16px Arial";

        ctx.fillText(
            "기지가 파괴되었습니다.",
            canvas.width / 2,
            y + 105
        );
    }


    ctx.fillStyle = "#aaaaaa";
    ctx.font = "14px Arial";

    ctx.fillText(
        "어디로 이동할지 선택하세요.",
        canvas.width / 2,
        y + 140
    );


    drawMenuButton(
        canvas.width / 2 - 145,
        y + 160,
        135,
        50,
        "MAIN MENU"
    );


    drawMenuButton(
        canvas.width / 2 + 10,
        y + 160,
        135,
        50,
        "RESTART"
    );
}


// =====================================================
// MENU BUTTON
// =====================================================

function drawMenuButton(
    x,
    y,
    width,
    height,
    text
) {

    ctx.fillStyle =
        "rgba(70,110,190,0.95)";

    ctx.fillRect(
        x,
        y,
        width,
        height
    );


    ctx.strokeStyle =
        "rgba(255,255,255,0.3)";

    ctx.lineWidth = 1;

    ctx.strokeRect(
        x,
        y,
        width,
        height
    );


    ctx.fillStyle = "#ffffff";

    ctx.font =
        "bold 15px Arial";

    ctx.textAlign = "center";


    ctx.fillText(
        text,
        x + width / 2,
        y + height / 2 + 5
    );
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

gameState = "menu";
draw();
