const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const hpText = document.getElementById("hp");
const goldText = document.getElementById("gold");
const waveText = document.getElementById("wave");
const startButton = document.getElementById("startButton");

let gameRunning = false;

let baseHP = 100;
let gold = 100;
let wave = 1;

const towers = [];
const enemies = [];
const bullets = [];
const effects = [];

let mouseX = 0;
let mouseY = 0;
let mouseInside = false;


/* =========================
   PATH
========================= */

const path = [
    { x: 0, y: 275 },
    { x: 220, y: 275 },
    { x: 220, y: 130 },
    { x: 600, y: 130 },
    { x: 600, y: 410 },
    { x: 900, y: 410 }
];


/* =========================
   GAME START
========================= */

startButton.addEventListener("click", () => {

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
});


/* =========================
   MOUSE
========================= */

canvas.addEventListener("mousemove", (event) => {

    const rect = canvas.getBoundingClientRect();

    mouseX =
        (event.clientX - rect.left)
        * (canvas.width / rect.width);

    mouseY =
        (event.clientY - rect.top)
        * (canvas.height / rect.height);

    mouseInside = true;
});


canvas.addEventListener("mouseleave", () => {
    mouseInside = false;
});


canvas.addEventListener("click", (event) => {

    if (!gameRunning) return;

    const rect = canvas.getBoundingClientRect();

    const x =
        (event.clientX - rect.left)
        * (canvas.width / rect.width);

    const y =
        (event.clientY - rect.top)
        * (canvas.height / rect.height);


    if (gold < 40) return;


    // 경로 위에는 타워 설치 불가
    if (isOnPath(x, y)) {
        return;
    }


    // 기존 타워와 너무 가까우면 설치 불가
    for (const tower of towers) {

        const distance = Math.hypot(
            tower.x - x,
            tower.y - y
        );

        if (distance < 45) {
            return;
        }
    }


    towers.push({
        x: x,
        y: y,
        range: 120,
        damage: 10,
        cooldown: 0,
        fireRate: 35
    });


    gold -= 40;

    updateUI();
});


/* =========================
   PATH CHECK
========================= */

function isOnPath(x, y) {

    for (let i = 0; i < path.length - 1; i++) {

        const a = path[i];
        const b = path[i + 1];

        const distance = pointToLineDistance(
            x,
            y,
            a.x,
            a.y,
            b.x,
            b.y
        );

        if (distance < 35) {
            return true;
        }
    }

    return false;
}


function pointToLineDistance(
    px,
    py,
    x1,
    y1,
    x2,
    y2
) {

    const dx = x2 - x1;
    const dy = y2 - y1;

    const lengthSquared = dx * dx + dy * dy;

    if (lengthSquared === 0) {
        return Math.hypot(px - x1, py - y1);
    }

    let t =
        ((px - x1) * dx +
            (py - y1) * dy) /
        lengthSquared;

    t = Math.max(0, Math.min(1, t));

    const closestX = x1 + t * dx;
    const closestY = y1 + t * dy;

    return Math.hypot(
        px - closestX,
        py - closestY
    );
}


/* =========================
   ENEMY SPAWN
========================= */

function spawnEnemy() {

    if (!gameRunning) return;


    enemies.push({

        x: path[0].x,
        y: path[0].y,

        targetIndex: 1,

        hp: 30,
        maxHP: 30,

        speed: 1
    });


    setTimeout(spawnEnemy, 1400);
}


/* =========================
   ENEMY UPDATE
========================= */

function updateEnemies() {

    for (
        let i = enemies.length - 1;
        i >= 0;
        i--
    ) {

        const enemy = enemies[i];

        const target =
            path[enemy.targetIndex];

        if (!target) continue;


        const dx = target.x - enemy.x;
        const dy = target.y - enemy.y;

        const distance =
            Math.hypot(dx, dy);


        if (distance <= enemy.speed) {

            enemy.targetIndex++;


            if (
                enemy.targetIndex >=
                path.length
            ) {

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


/* =========================
   TOWER UPDATE
========================= */

function updateTowers() {

    towers.forEach(tower => {

        if (tower.cooldown > 0) {

            tower.cooldown--;

            return;
        }


        let target = null;

        let closestDistance = Infinity;


        for (const enemy of enemies) {

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
        }


        if (target) {

            /*
             * 총알 생성
             */

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


/* =========================
   BULLET UPDATE
========================= */

function updateBullets() {

    for (
        let i = bullets.length - 1;
        i >= 0;
        i--
    ) {

        const bullet = bullets[i];

        // 적이 죽거나 사라진 경우
        if (!enemies.includes(bullet.target)) {

            bullets.splice(i, 1);

            continue;
        }


        const target = bullet.target;


        const dx =
            target.x - bullet.x;

        const dy =
            target.y - bullet.y;

        const distance =
            Math.hypot(dx, dy);


        if (distance <= bullet.speed + 3) {

            /*
             * 총알 명중
             */

            target.hp -= bullet.damage;


            createHitEffect(
                target.x,
                target.y,
                "#ffd54f"
            );


            bullets.splice(i, 1);


            /*
             * 적 사망
             */

            if (target.hp <= 0) {

                const enemyIndex =
                    enemies.indexOf(target);

                if (enemyIndex !== -1) {

                    enemies.splice(
                        enemyIndex,
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


/* =========================
   EFFECT
========================= */

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


/* =========================
   DRAW
========================= */

function draw() {

    ctx.clearRect(
        0,
        0,
        canvas.width,
        canvas.height
    );


    drawBackground();

    drawPath();

    drawBase();

    drawTowers();

    drawEnemies();

    drawBullets();

    drawEffects();

    drawTowerPreview();
}


/* =========================
   BACKGROUND
========================= */

function drawBackground() {

    ctx.fillStyle = "#6f9d52";

    ctx.fillRect(
        0,
        0,
        canvas.width,
        canvas.height
    );


    // 간단한 격자
    ctx.strokeStyle =
        "rgba(255,255,255,0.05)";

    ctx.lineWidth = 1;


    for (let x = 0; x < canvas.width; x += 40) {

        ctx.beginPath();

        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);

        ctx.stroke();
    }


    for (let y = 0; y < canvas.height; y += 40) {

        ctx.beginPath();

        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);

        ctx.stroke();
    }
}


/* =========================
   PATH
========================= */

function drawPath() {

    ctx.beginPath();

    ctx.moveTo(
        path[0].x,
        path[0].y
    );


    for (
        let i = 1;
        i < path.length;
        i++
    ) {

        ctx.lineTo(
            path[i].x,
            path[i].y
        );
    }


    ctx.lineWidth = 70;

    ctx.strokeStyle = "#b7a678";

    ctx.lineCap = "square";

    ctx.lineJoin = "round";

    ctx.stroke();


    ctx.beginPath();

    ctx.moveTo(
        path[0].x,
        path[0].y
    );


    for (
        let i = 1;
        i < path.length;
        i++
    ) {

        ctx.lineTo(
            path[i].x,
            path[i].y
        );
    }


    ctx.lineWidth = 3;

    ctx.strokeStyle =
        "rgba(255,255,255,0.25)";

    ctx.setLineDash([10, 10]);

    ctx.stroke();

    ctx.setLineDash([]);
}


/* =========================
   BASE
========================= */

function drawBase() {

    const base =
        path[path.length - 1];


    // 외곽
    ctx.fillStyle = "#20252d";

    ctx.fillRect(
        base.x - 42,
        base.y - 42,
        84,
        84
    );


    // 본체
    ctx.fillStyle = "#d63c3c";

    ctx.fillRect(
        base.x - 32,
        base.y - 32,
        64,
        64
    );


    // 지붕
    ctx.fillStyle = "#8e2020";

    ctx.beginPath();

    ctx.moveTo(
        base.x - 38,
        base.y - 32
    );

    ctx.lineTo(
        base.x,
        base.y - 55
    );

    ctx.lineTo(
        base.x + 38,
        base.y - 32
    );

    ctx.closePath();

    ctx.fill();


    ctx.fillStyle = "#ffffff";

    ctx.font =
        "bold 12px Arial";

    ctx.textAlign = "center";

    ctx.fillText(
        "BASE",
        base.x,
        base.y + 5
    );


    // HP 바

    const width = 70;

    ctx.fillStyle = "#222";

    ctx.fillRect(
        base.x - width / 2,
        base.y + 50,
        width,
        7
    );


    ctx.fillStyle = "#4caf50";

    ctx.fillRect(
        base.x - width / 2,
        base.y + 50,
        width * Math.max(
            0,
            baseHP / 100
        ),
        7
    );
}


/* =========================
   TOWERS
========================= */

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
            "rgba(70,120,255,0.07)";

        ctx.fill();

        ctx.strokeStyle =
            "rgba(100,150,255,0.18)";

        ctx.stroke();


        // 그림자
        ctx.fillStyle =
            "rgba(0,0,0,0.25)";

        ctx.beginPath();

        ctx.ellipse(
            tower.x,
            tower.y + 16,
            20,
            7,
            0,
            0,
            Math.PI * 2
        );

        ctx.fill();


        // 타워 바닥
        ctx.fillStyle = "#263238";

        ctx.beginPath();

        ctx.arc(
            tower.x,
            tower.y,
            19,
            0,
            Math.PI * 2
        );

        ctx.fill();


        // 타워 본체
        ctx.fillStyle = "#4569d4";

        ctx.fillRect(
            tower.x - 13,
            tower.y - 13,
            26,
            26
        );


        // 포신
        ctx.fillStyle = "#9bb8ff";

        ctx.fillRect(
            tower.x - 4,
            tower.y - 27,
            8,
            18
        );


        // 중앙
        ctx.fillStyle = "#d7e2ff";

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


/* =========================
   ENEMIES
========================= */

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


        // 적 몸체
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
        ctx.fillStyle = "#ffffff";

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
        ctx.fillStyle = "#252525";

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
                    enemy.hp /
                    enemy.maxHP
                ),
            5
        );
    });
}


/* =========================
   BULLETS
========================= */

function drawBullets() {

    bullets.forEach(bullet => {

        // 총알 궤적
        ctx.strokeStyle =
            "rgba(255,220,80,0.35)";

        ctx.lineWidth = 3;

        ctx.beginPath();

        ctx.moveTo(
            bullet.x,
            bullet.y
        );

        ctx.lineTo(
            bullet.x -
                ((bullet.target.x - bullet.x) * 0.4),
            bullet.y -
                ((bullet.target.y - bullet.y) * 0.4)
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


/* =========================
   HIT EFFECT
========================= */

function drawEffects() {

    effects.forEach(effect => {

        ctx.strokeStyle =
            effect.color;

        ctx.globalAlpha =
            effect.alpha;

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


/* =========================
   TOWER PREVIEW
========================= */

function drawTowerPreview() {

    if (
        !mouseInside ||
        !gameRunning
    ) {
        return;
    }


    const valid =
        gold >= 40 &&
        !isOnPath(
            mouseX,
            mouseY
        );


    ctx.globalAlpha = 0.35;

    ctx.fillStyle =
        valid
            ? "#6da2ff"
            : "#ff5555";


    ctx.beginPath();

    ctx.arc(
        mouseX,
        mouseY,
        16,
        0,
        Math.PI * 2
    );

    ctx.fill();


    ctx.globalAlpha = 1;
}


/* =========================
   UI
========================= */

function updateUI() {

    hpText.textContent =
        Math.max(0, baseHP);

    goldText.textContent =
        gold;

    waveText.textContent =
        wave;
}


/* =========================
   GAME OVER
========================= */

function gameOver() {

    gameRunning = false;

    startButton.disabled = false;

    startButton.textContent =
        "RESTART";


    setTimeout(() => {

        alert(
            "GAME OVER\n\n기지가 파괴되었습니다."
        );

    }, 100);
}


/* =========================
   GAME LOOP
========================= */

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


/* =========================
   INITIAL
========================= */

updateUI();

draw();
