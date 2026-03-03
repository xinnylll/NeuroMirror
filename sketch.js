
let currentEmotion = 'neutral'; 
let targetIntensity = 0;        
let emotionIntensity = 0;       

// --- 场景 1: 开心 (童话小火车) 全局变量 ---
let bgTexture;
let trainT = 0; 
let trees = []; 
let preRenderedTrees = {}; 

// --- 场景 2: 伤心 (水彩落雨) 全局变量 ---
let rainBgGraphics;
let rainDrops = [];
let rainRipples = [];
const MAX_RAIN_DROPS = 600; // 雨滴池最大容量

// --- 场景 3: 愤怒 (火山爆发) 全局变量 ---
let volcanoParticles = [];

// ====================================================
// p5.js 生命周期
// ====================================================
function setup() {
    let canvas = createCanvas(windowWidth * 0.75, windowHeight);
    canvas.parent('canvas-container');
    frameRate(60); 

    // 初始化各个场景的静态元素
    initTrainScene();
    initRainScene();
}

function draw() {
    // 1. 数据平滑处理 (Lerp)，让情绪和天气的转变顺滑自然
    emotionIntensity = lerp(emotionIntensity, targetIntensity, 0.05);

    // 2. 状态机切换场景
    if (currentEmotion === 'happy' && emotionIntensity > 0.05) {
        drawTrainScene(); 
    } else if (currentEmotion === 'sad' && emotionIntensity > 0.05) {
        drawWatercolorRain(); // 调用新的水彩落雨场景
    } else if (currentEmotion === 'angry' && emotionIntensity > 0.05) {
        drawVolcano();
    } else {
        // 中立待机状态
        background(20); 
        fill(100);
        noStroke();
        textAlign(CENTER, CENTER);
        textSize(24);
        text(" show your emotions (smiling, frowning, or getting angry)", width/2, height/2);
    }
}

// ----------------------------------------------------
// 全局接口：接收来自 index.html 的 MediaPipe 数据
// ----------------------------------------------------
window.setEmotion = function(emotion, valuePercentage) {
    currentEmotion = emotion;
    targetIntensity = valuePercentage / 100; 

    let barHappy = document.getElementById('bar-happy');
    let barSad = document.getElementById('bar-sad');
    let barAngry = document.getElementById('bar-angry');
    
    if(barHappy && barSad && barAngry) {
        barHappy.value = (emotion === 'happy') ? valuePercentage : 0;
        barSad.value = (emotion === 'sad') ? valuePercentage : 0;
        barAngry.value = (emotion === 'angry') ? valuePercentage : 0;
    }
}

// ====================================================
// 场景 2: 伤心 - 45度俯视水彩风落雨 (你的代码集成)
// ====================================================
function initRainScene() {
    // 1. 预渲染静态风景到缓冲区 (极大提升性能)
    rainBgGraphics = createGraphics(width, height);
    drawWatercolorBackground(rainBgGraphics);
    drawWatercolorScenery(rainBgGraphics);

    // 2. 预先装填雨滴对象池
    rainDrops = [];
    for (let i = 0; i < MAX_RAIN_DROPS; i++) { 
        rainDrops.push(new RainDrop());
    }
}

function drawWatercolorRain() {
    // 1. 绘制预渲染的静态水彩风景底图
    imageMode(CORNER);
    image(rainBgGraphics, 0, 0, width, height);

    // 2. 【核心交互】情绪控制雨势和氛围
    // 伤心值越大，画面越暗沉 (阴霾效果)
    let stormDarkness = map(emotionIntensity, 0, 1, 0, 120);
    noStroke();
    fill(0, 0, 0, stormDarkness);
    rect(0, 0, width, height);

    // 伤心值控制雨量：从 10 滴淅沥小雨 到 600 滴倾盆大雨
    let activeDrops = floor(map(emotionIntensity, 0, 1, 10, MAX_RAIN_DROPS));

    // 3. 更新并渲染水波纹涟漪
    for (let i = rainRipples.length - 1; i >= 0; i--) {
        rainRipples[i].update();
        rainRipples[i].show();
        if (rainRipples[i].isFinished()) {
            rainRipples.splice(i, 1);
        }
    }

    // 4. 更新并渲染活跃的雨滴
    for (let i = 0; i < activeDrops; i++) {
        rainDrops[i].fall(emotionIntensity); // 传入情绪值控制下落速度
        rainDrops[i].show();
    }
}

// --- 水彩雨景辅助函数与类 ---
function getShoreX(y) {
    let baseDiagonalX = map(y, 0, height, width * 0.8, width * 0.3);
    let noiseOffset = map(noise(y * 0.01), 0, 1, -50, 50); 
    return baseDiagonalX + noiseOffset;
}

function drawColorHex(target, type, hexStr, alphaVal) {
    let c = color(hexStr);
    c.setAlpha(alphaVal);
    if (type === 'fill') target.fill(c);
    else target.stroke(c);
}

function drawWatercolorBackground(pg) {
    pg.noStroke();
    let ctx = pg.drawingContext;
    let lakeGradient = ctx.createLinearGradient(0, height, width * 0.8, 0); 
    lakeGradient.addColorStop(0, '#324655');   // 墨蓝
    lakeGradient.addColorStop(0.4, '#506473'); // 过渡
    lakeGradient.addColorStop(0.8, '#738791'); // 浅灰蓝
    ctx.fillStyle = lakeGradient;
    ctx.fillRect(0, 0, width, height);

    // 陆地泥沙
    drawColorHex(pg, 'fill', '#a09682', 200); 
    pg.beginShape();
    pg.vertex(width, 0);
    for (let y = 0; y <= height; y += 10) {
        pg.vertex(getShoreX(y), y); 
    }
    pg.vertex(width, height);
    pg.endShape(CLOSE);
    
    // 湿润泥沙过渡
    drawColorHex(pg, 'fill', '#8c826e', 100); 
    pg.beginShape();
    pg.vertex(width, 0);
    for (let y = 0; y <= height; y += 10) {
        pg.vertex(getShoreX(y) - 30, y); 
    }
    pg.vertex(width, height);
    pg.endShape(CLOSE);
}

function drawWatercolorScenery(pg) {
    // 1. 草丛
    pg.noStroke();
    for (let i = 0; i < Math.floor(width/3); i++) {
        let gx = random(0, width); let gy = random(0, height);
        if (gx > getShoreX(gy) && noise(gx * 0.02, gy * 0.02) > 0.4) {
            drawColorHex(pg, 'fill', '#465a3c', 80);
            pg.ellipse(gx, gy, 4, 2.5);
        }
    }

    // 2. 码头
    pg.push();
    pg.translate(width * 0.55, height * 0.5); 
    pg.rotate(PI / 6); 
    drawColorHex(pg, 'fill', '#50463c', 60); 
    pg.rect(-30, 3, 70, 15, 2);
    drawColorHex(pg, 'fill', '#786450', 180); 
    pg.rect(-25, 0, 70, 12, 2);
    drawColorHex(pg, 'stroke', '#5a4632', 100); 
    for (let i = 5; i < 70; i += 8) { pg.line(i-25, 0, i-25, 12); }
    pg.pop();

    // 3. 小船
    pg.push();
    pg.translate(width * 0.55, height * 0.50); 
    pg.rotate(PI / 3);
    pg.noStroke();
    drawColorHex(pg, 'fill', '#465a64', 100); pg.ellipse(-5, 25, 30, 12); 
    drawColorHex(pg, 'fill', '#8c8c91', 200); pg.ellipse(-15, 30, 30, 12);
    drawColorHex(pg, 'fill', '#646469', 150); pg.ellipse(-15, 30, 22, 6);
    pg.pop();

    // 4. 水彩树林
    pg.noStroke();
    for (let i = 0; i < Math.floor(width/3); i++) {
        let tx = random(0, width); let ty = random(-50, height + 50);
        let shoreBoundary = getShoreX(ty);
        if (tx > shoreBoundary + 20 && noise(tx * 0.01, ty * 0.01) > 0.35) {
            let s = random(0.6, 1.4);
            drawColorHex(pg, 'fill', '#5a5046', 40); pg.ellipse(tx - 5, ty + 8, 30 * s, 20 * s); 
            drawColorHex(pg, 'fill', '#2d4b37', 40); pg.ellipse(tx, ty, 35 * s, 30 * s); 
            drawColorHex(pg, 'fill', '#3c5a41', 50); pg.ellipse(tx + 3, ty - 3, 25 * s, 22 * s); 
            drawColorHex(pg, 'fill', '#506e50', 60); pg.ellipse(tx + 4, ty - 4, 15 * s, 12 * s); 
        }
    }
}

class RainDrop {
    constructor() {
        this.reset();
        this.y = random(this.targetY - height, this.targetY); 
    }
    reset() {
        this.x = random(-50, width); 
        this.targetY = random(0, height); 
        this.y = this.targetY - random(height*0.4, height); 
        this.z = random(0, 20); 
        this.len = map(this.z, 0, 20, 3, 8); 
        this.yspeed = map(this.z, 0, 20, 8, 15); 
    }
    fall(intensity) {
        // 【核心交互】情绪越强，雨滴下落速度翻倍 (模拟狂风暴雨)
        let speedMultiplier = map(intensity, 0, 1, 1, 2.5);
        
        this.y += this.yspeed * speedMultiplier;
        this.x += this.yspeed * 0.1 * speedMultiplier; 

        if (this.y >= this.targetY) {
            let currentShoreX = getShoreX(this.targetY);
            if (this.x < currentShoreX) {
                // 雨越急，水面产生波纹的概率和数量越大
                if (random() > (1.0 - intensity * 0.6)) {
                    rainRipples.push(new Ripple(this.x, this.targetY, this.z));
                }
            }
            this.reset();
        }
    }
    show() {
        let thick = map(this.z, 0, 20, 0.5, 1.2);
        drawColorHex(window, 'stroke', '#c8d2dc', 35); 
        strokeCap(ROUND); strokeWeight(thick);
        line(this.x, this.y, this.x - this.len * 0.1, this.y + this.len);
    }
}

class Ripple {
    constructor(x, y, z) {
        this.x = x; this.y = y;
        this.r = 1; this.alpha = 80;
        this.growthRate = map(z, 0, 20, 0.2, 0.4); 
    }
    update() {
        this.r += this.growthRate;
        this.alpha -= 2;
    }
    show() {
        noFill();
        drawColorHex(window, 'stroke', '#D0E1F3', this.alpha);
        strokeWeight(1);
        ellipse(this.x, this.y, this.r * 3, this.r); 
    }
    isFinished() { return this.alpha <= 0; }
}

// ====================================================
// 场景 1: 开心 - 童话小火车 (保持不变)
// ====================================================
function initTrainScene() {
    bgTexture = createGraphics(width, height);
    bgTexture.background('#FCEAE4'); bgTexture.noStroke();
    for (let i = 0; i < 2000; i++) {
        let colors = ['#F9D3C5', '#F2E2A4', '#E0988F', '#C8D8C5'];
        bgTexture.fill(random(colors)); bgTexture.circle(random(width), random(height), random(1, 3));
    }
    let mixedGreenPalettes = [
        { light: '#A2BBA6', dark: '#425F4C', trunk: '#8D6E63' },
        { light: '#8FA793', dark: '#2C4234', trunk: '#795548' }  
    ];
    let treeBufferSize = { w: 300, h: 400 }; 
    function initTreePG(pg) { pg.noStroke(); pg.push(); pg.translate(pg.width / 2, pg.height * 0.8); }
    preRenderedTrees.cone1 = createGraphics(treeBufferSize.w, treeBufferSize.h); initTreePG(preRenderedTrees.cone1); buildStainedTree(preRenderedTrees.cone1, 'cone', mixedGreenPalettes[0]);
    preRenderedTrees.cone2 = createGraphics(treeBufferSize.w, treeBufferSize.h); initTreePG(preRenderedTrees.cone2); buildStainedTree(preRenderedTrees.cone2, 'cone', mixedGreenPalettes[1]);
    preRenderedTrees.cloud1 = createGraphics(treeBufferSize.w, treeBufferSize.h); initTreePG(preRenderedTrees.cloud1); buildStainedTree(preRenderedTrees.cloud1, 'cloud', mixedGreenPalettes[0]);
    preRenderedTrees.cloud2 = createGraphics(treeBufferSize.w, treeBufferSize.h); initTreePG(preRenderedTrees.cloud2); buildStainedTree(preRenderedTrees.cloud2, 'cloud', mixedGreenPalettes[1]);
    for (let i = 0; i < 60; i++) {
        let paletteIdx = random() < 0.5 ? 1 : 2; 
        let type = random() < 0.5 ? 'cone' : 'cloud'; 
        trees.push({ x: random(-600, 600), y: random(120, 220), z: random(-350, 450), scale: random(0.8, 1.5), graphic: preRenderedTrees[type + paletteIdx] });
    }
}

function drawTrainScene() {
    imageMode(CORNER); image(bgTexture, 0, 0, width, height); 
    let renderQueue = [];
    let numSegments = 120; 
    for (let i = 0; i < numSegments; i++) {
        let t1 = (i / numSegments) * TWO_PI; let t2 = ((i + 1) / numSegments) * TWO_PI;
        let p1_3d = getTrack3DPoint(t1); let p2_3d = getTrack3DPoint(t2);
        let p1 = project(p1_3d); let p2 = project(p2_3d);
        let pGround = project({ x: p1_3d.x, y: 250, z: p1_3d.z });
        renderQueue.push({ z: (p1.z + p2.z) / 2, drawFn: () => {
                if (i % 3 === 0) { stroke('#D59762'); strokeWeight(4 * p1.sFactor); strokeCap(SQUARE); line(p1.sx, p1.sy, pGround.sx, pGround.sy); }
                strokeCap(ROUND); stroke('#A61D10'); strokeWeight(13 * p1.sFactor); line(p1.sx, p1.sy + 3 * p1.sFactor, p2.sx, p2.sy + 3 * p2.sFactor);
                stroke('#DF3821'); strokeWeight(7 * p1.sFactor); line(p1.sx, p1.sy, p2.sx, p2.sy);
        }});
    }
    for (let tree of trees) {
        let p = project(tree);
        renderQueue.push({ z: p.z, drawFn: () => {
                push(); translate(p.sx, p.sy); scale(p.sFactor * tree.scale); translate(0, -tree.graphic.height * 0.3); 
                imageMode(CENTER); image(tree.graphic, 0, 0); pop();
        }});
    }
    let currentSpeed = 0.005 + (emotionIntensity * 0.04);
    trainT += currentSpeed; 
    let cats = [ { body: '#2A2A2A', hasBalloons: false }, { body: '#8C8C94', hasBalloons: false }, { body: '#E59551', hasBalloons: true } ];
    for (let i = 2; i >= 0; i--) {
        let tOffset = trainT - i * 0.16; 
        let pt3d = getTrack3DPoint(tOffset); let ptNext3d = getTrack3DPoint(tOffset + 0.05); 
        let p1 = project(pt3d); let p2 = project(ptNext3d);
        let angle = atan2(p2.sy - p1.sy, p2.sx - p1.sx);
        renderQueue.push({ z: p1.z, drawFn: () => {
                push(); translate(p1.sx, p1.sy); rotate(angle); scale(p1.sFactor); translate(0, -14); drawCartAndCat(cats[i]); pop();
        }});
    }
    renderQueue.sort((a, b) => b.z - a.z);
    for (let item of renderQueue) { item.drawFn(); }
}

function getTrack3DPoint(t) { return { x: cos(t) * 380, y: sin(t * 2) * 90 - 60, z: sin(t) * 280 }; }
function project(p3d) { let sFactor = 800 / (800 + p3d.z); return { sx: width / 2 + p3d.x * sFactor, sy: height / 2 + p3d.y * sFactor, sFactor, z: p3d.z }; }
function buildStainedTree(pg, type, colors) {
    pg.noStroke(); let cTrunkMain = color(colors.trunk); let cTrunkShadow = lerpColor(cTrunkMain, color(0), 0.3); 
    for(let i=0; i<10; i++) { let inter = map(i, 0, 9, 0, 1); let cLayer = lerpColor(cTrunkShadow, cTrunkMain, inter + random(-0.1, 0.1)); cLayer.setAlpha(150); pg.fill(cLayer); let currentW = 12 + random(-2, 2); pg.rect(-currentW/2, -80, currentW, 80); }
    pg.fill(0, 40); for(let i=0; i<40; i++) { pg.circle(random(-6, 6), random(-80, 0), random(1, 3)); }
    pg.push();
    if (type === 'cone') { pg.translate(0, -65); for(let i=0; i<4; i++) { pg.push(); pg.translate(0, -i * 22); fillShapeWithStains(pg, 'triangle', { w: 50 - i * 8, h: 28 }, colors); pg.pop(); } } 
    else { pg.translate(0, -70); fillShapeWithStains(pg, 'circle', { x: 0, y: -20, r: 45 }, colors); fillShapeWithStains(pg, 'circle', { x: -20, y: 5, r: 35 }, colors); fillShapeWithStains(pg, 'circle', { x: 20, y: 5, r: 35 }, colors); fillShapeWithStains(pg, 'circle', { x: 0, y: 15, r: 40 }, colors); }
    pg.pop();
}
function fillShapeWithStains(pg, shapeType, vertices, colors) {
    pg.noStroke(); let cLight = color(colors.light); let cDark = color(colors.dark);
    for (let j = 0; j < (shapeType === 'triangle' ? 1200 : 800); j++) {
        let p = {}; let lerpAmt = 0; 
        if (shapeType === 'triangle') { let u = random(); let v = random(); if (u + v > 1) { u = 1 - u; v = 1 - v; } p.x = u * (-vertices.w/2) + v * (vertices.w/2); p.y = (1-u-v) * (-vertices.h); lerpAmt = map(p.y, -vertices.h, 0, 0, 1); } 
        else { let angle = random(TWO_PI); let r = sqrt(random()) * vertices.r; p.x = vertices.x + r * cos(angle); p.y = vertices.y + r * sin(angle); lerpAmt = map(p.y, vertices.y - vertices.r, vertices.y + vertices.r, 0, 1); }
        let finalColor = lerpColor(cLight, cDark, constrain(lerpAmt + random(-0.35, 0.35), 0, 1)); finalColor.setAlpha(random(15, 35)); pg.fill(finalColor); pg.circle(p.x, p.y, random(10, 25)); 
    }
}
function drawCartAndCat(catProps) {
    if (catProps.hasBalloons) { stroke('#333'); strokeWeight(1.2); line(-20, -10, -50, -60); line(-20, -10, -35, -75); line(-20, -10, -15, -80); noStroke(); fill('#E87A5D'); circle(-50, -60, 24); fill('#74B49B'); circle(-35, -75, 26); fill('#E8C468'); circle(-15, -80, 24); }
    noStroke(); fill(catProps.body); triangle(-12, -40, -18, -25, -5, -30); triangle(12, -40, 18, -25, 5, -30); circle(0, -25, 30); stroke('#FCEAE4'); strokeWeight(2); noFill(); arc(-6, -26, 8, 8, PI, TWO_PI); arc(6, -26, 8, 8, PI, TWO_PI); line(-2, -20, 0, -18); line(0, -18, 2, -20);
    noStroke(); fill('#F8BA25'); rect(-35, -15, 70, 30, 8); fill('#8C5A35'); ellipse(15, -5, 25, 15); ellipse(-20, 5, 20, 10); ellipse(-10, -10, 10, 8);
    fill('#FFF4E0'); stroke('#D1A775'); strokeWeight(1.5); circle(-20, 15, 16); circle(20, 15, 16);
}

// ====================================================
// 场景 3: 愤怒 - 火山爆发 (保持不变)
// ====================================================
function drawVolcano() {
    let shakeAmount = emotionIntensity * 8; let shakeX = random(-shakeAmount, shakeAmount); let shakeY = random(-shakeAmount, shakeAmount);
    background(20 + emotionIntensity * 80, 10, 10); push(); translate(shakeX, shakeY); 
    fill(30); noStroke(); triangle(width / 2 - 200, height, width / 2 + 200, height, width / 2, height - 250);
    fill(20 + emotionIntensity * 80, 10, 10); ellipse(width/2, height - 250, 100, 20);
    if (random(1) < emotionIntensity) { for (let i = 0; i <= Math.floor(emotionIntensity * 8); i++) { volcanoParticles.push({ x: width / 2 + random(-40, 40), y: height - 250, vx: random(-4, 4), vy: random(-5, -10 - emotionIntensity * 20), life: 255, size: random(8, 20) }); } }
    for (let i = volcanoParticles.length - 1; i >= 0; i--) { let p = volcanoParticles[i];
        if (p.life > 200) fill(255, 255, 100, p.life); else if (p.life > 100) fill(255, 100, 0, p.life); else fill(100, 50, 50, p.life);
        noStroke(); ellipse(p.x, p.y, p.size); p.x += p.vx; p.y += p.vy; p.vy += 0.6; p.life -= 3; p.size *= 0.98; 
        if (p.life <= 0 || p.y > height) { volcanoParticles.splice(i, 1); }
    }
    pop();
}

function windowResized() {
    resizeCanvas(windowWidth * 0.75, windowHeight);
    initTrainScene(); // 重新生成背景和元素布局以适配新窗口大小
    initRainScene();
}