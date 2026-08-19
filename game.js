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

// 적이 이동할 경로
const path = [
    { x: 0, y: 275 },
    { x: 250, y: 275 },
    { x: 250, y: 150 },
    { x: 600, y: 150 },
    { x: 600, y: 400 },
    { x: 900, y: 400 }
];


// ========================
// 게임 시작
// ========================

startButton.addEventListener("click", () => {
    startGame();
});

function startGame() {
    gameRunning = true;

    baseHP = 100;
    gold = 100;
    wave = 1;

    towers.length = 0;
    enemies.length = 0;

    startButton.disabled = true;

    updateUI();
    spawnEnemy();

    gameLoop();
}


// ========================
// 마우스로 타워 설치
// ========================

canvas.addEventListener("click", (event) => {

    if (!gameRunning) return;

    const rect = canvas.getBoundingClientRect();

    const x = (event.clientX - rect.left)
        * (canvas.width / rect.width);

    const y = (event.clientY - rect.top)
        * (canvas.height / rect.height);

    // 타워 설치 비용
    if (gold < 40) {
        return;
    }

    towers.push({
        x: x,
        y: y,
        range: 100,
        damage: 10,
        cooldown: 0
    });

    gold -= 40;

    updateUI();
});


// ========================
// 적 생성
// ========================

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

    setTimeout(spawnEnemy, 1500);
}


// ========================
// 적 이동
// ========================

function updateEnemies() {

    for (let i = enemies.length - 1; i >= 0; i--) {

        const enemy = enemies[i];

        const target = path[enemy.targetIndex];

        const dx = target.x - enemy.x;
        const dy = target.y - enemy.y;

        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < enemy.speed) {

            enemy.targetIndex++;

            if (enemy.targetIndex >= path.length) {

                // 기지 도착
                baseHP -= 10;

                enemies.splice(i, 1);

                updateUI();

                if (baseHP <= 0) {
                    gameOver();
                }

                continue;
            }

        } else {

            enemy.x += (dx / distance) * enemy.speed;
            enemy.y += (dy / distance) * enemy.speed;

        }
    }
}


// ========================
// 타워 공격
// ========================

function updateTowers() {

    towers.forEach(tower => {

        if (tower.cooldown > 0) {
            tower.cooldown--;
            return;
        }

        for (let enemy of enemies) {

            const dx = enemy.x - tower.x;
            const dy = enemy.y - tower.y;

            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance <= tower.range) {

                enemy.hp -= tower.damage;

                tower.cooldown = 30;

                if (enemy.hp <= 0) {

                    const index = enemies.indexOf(enemy);

                    if (index !== -1) {
                        enemies.splice(index, 1);
                        gold += 10;
                        updateUI();
                    }
                }

                break;
            }
        }
    });
}


// ========================
// 화면 그리기
// ========================

function draw() {

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    drawPath();
    drawBase();
    drawTowers();
    drawEnemies();
}


// 경로
function drawPath() {

    ctx.beginPath();

    ctx.moveTo(path[0].x, path[0].y);

    for (let i = 1; i < path.length; i++) {
        ctx.lineTo(path[i].x, path[i].y);
    }

    ctx.lineWidth = 60;
    ctx.strokeStyle = "#c9b98a";
    ctx.lineCap = "square";
    ctx.stroke();
}


// 기지
function drawBase() {

    const base = path[path.length - 1];

    ctx.fillStyle = "#555";
    ctx.fillRect(base.x - 35, base.y - 35, 70, 70);

    ctx.fillStyle = "#e53935";
    ctx.fillRect(base.x - 25, base.y - 25, 50, 50);

    ctx.fillStyle = "white";
    ctx.font = "bold 14px Arial";
    ctx.textAlign = "center";
    ctx.fillText("BASE", base.x, base.y + 5);
}


// 타워
function drawTowers() {

    towers.forEach(tower => {

        // 공격 범위
        ctx.beginPath();
        ctx.arc(tower.x, tower.y, tower.range, 0, Math.PI * 2);

        ctx.fillStyle = "rgba(255,255,255,0.08)";
        ctx.fill();

        ctx.strokeStyle = "rgba(255,255,255,0.2)";
        ctx.stroke();

        // 타워 본체
        ctx.fillStyle = "#3f51b5";
        ctx.fillRect(
            tower.x - 15,
            tower.y - 15,
            30,
            30
        );

        ctx.fillStyle = "#90caf9";
        ctx.fillRect(
            tower.x - 5,
            tower.y - 25,
            10,
            15
        );
    });
}


// 적
function drawEnemies() {

    enemies.forEach(enemy => {

        // 몸체
        ctx.fillStyle = "#d32f2f";

        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y, 15, 0, Math.PI * 2);
        ctx.fill();

        // 체력바
        const hpWidth = 30;
        const currentHP = hpWidth * (enemy.hp / enemy.maxHP);

        ctx.fillStyle = "#333";
        ctx.fillRect(
            enemy.x - 15,
            enemy.y - 25,
            hpWidth,
            5
        );

        ctx.fillStyle = "#4caf50";
        ctx.fillRect(
            enemy.x - 15,
            enemy.y - 25,
            currentHP,
            5
        );
    });
}


// ========================
// UI 업데이트
// ========================

function updateUI() {

    hpText.textContent = Math.max(0, baseHP);
    goldText.textContent = gold;
    waveText.textContent = wave;
}


// ========================
// 게임 종료
// ========================

function gameOver() {

    gameRunning = false;

    startButton.disabled = false;
    startButton.textContent = "RESTART";

    setTimeout(() => {
        alert("GAME OVER");
    }, 100);
}


// ========================
// 게임 루프
// ========================

function gameLoop() {

    if (!gameRunning) {
        draw();
        return;
    }

    updateEnemies();
    updateTowers();
    draw();

    requestAnimationFrame(gameLoop);
}


// 초기 화면
draw();
