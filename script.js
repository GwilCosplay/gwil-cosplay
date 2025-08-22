// --- SCRIPT DO BACKGROUND HOLOGRÁFICO ---
let animationFrameId;
const HOLO_PARAMS = { scale: 0.94, ax: 1.0, ay: 1.0, az: 3.0, aw: 2.0, bx: 2.0, by: 1.0, color1: '#0f4bff', color2: '#84b3ff', color3: '#d510fe', color4: '#3f0fff' };
const vsSource = `
    attribute vec2 a_position;
    varying vec2 vUv;
    void main() {
      vUv = a_position * 0.5 + 0.5;
      gl_Position = vec4(a_position, 0.0, 1.0);
    }
`;
const fsSource = `
    precision highp float;
    varying vec2 vUv;
    uniform float u_time;
    uniform vec2 u_resolution;
    uniform float u_scale;
    uniform vec3 u_color1;
    uniform vec3 u_color2;
    uniform vec3 u_color3;
    uniform vec3 u_color4;
    uniform float u_ax;
    uniform float u_ay;
    uniform float u_az;
    uniform float u_aw;
    uniform float u_bx;
    uniform float u_by;

    float cheapNoise(vec3 stp) {
      vec3 p = stp;
      vec4 a = vec4(u_ax, u_ay, u_az, u_aw);
      return mix(
        sin(p.z + p.x * a.x + cos(p.x * a.x - p.z)) *
        cos(p.z + p.y * a.y + cos(p.y * a.x + p.z)),
        sin(1. + p.x * a.z + p.z + cos(p.y * a.w - p.z)) *
        cos(1. + p.y * a.w + p.z + cos(p.x * a.x + p.z)),
        .436
      );
    }

    void main() {
      vec2 aR = vec2(u_resolution.x/u_resolution.y, 1.);
      vec2 st = vUv * aR * u_scale;
      float S = sin(u_time * .005);
      float C = cos(u_time * .005);
      vec2 v1 = vec2(cheapNoise(vec3(st, 2.)), cheapNoise(vec3(st, 1.)));
      vec2 v2 = vec2(
        cheapNoise(vec3(st + u_bx * v1 + vec2(C * 1.7, S * 9.2), 0.15 * u_time)),
        cheapNoise(vec3(st + u_by * v1 + vec2(S * 8.3, C * 2.8), 0.126 * u_time))
      );
      float n = .5 + .5 * cheapNoise(vec3(st + v2, 0.));
      vec3 color = mix(u_color1, u_color2, clamp((n*n)*8.,0.0,1.0));
      color = mix(color, u_color3, clamp(length(v1),0.0,1.0));
      color = mix(color, u_color4, clamp(length(v2.x),0.0,1.0));
      color /= n*n + n * 7.;
      gl_FragColor = vec4(color,1.);
    }
`;

function hexToRgbNormalized(hex) {
    const h = hex.replace('#', '');
    const bigint = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return [r / 255, g / 255, b / 255];
}

function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const msg = gl.getShaderInfoLog(shader);
        gl.deleteShader(shader);
        throw new Error('Shader compile error: ' + msg);
    }
    return shader;
}

function createProgram(gl, vsSource, fsSource) {
    const vs = createShader(gl, gl.VERTEX_SHADER, vsSource);
    const fs = createShader(gl, gl.FRAGMENT_SHADER, fsSource);
    const program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        const msg = gl.getProgramInfoLog(program);
        gl.deleteProgram(program);
        throw new Error('Program link error: ' + msg);
    }
    return program;
}

const canvas = document.getElementById('glcanvas');
const gl = canvas.getContext('webgl', { antialias: true });

if (!gl) {
    canvas.style.display = 'none';
    console.error('WebGL não suportado');
} else {
    const program = createProgram(gl, vsSource, fsSource);
    gl.useProgram(program);
    const posLoc = gl.getAttribLocation(program, 'a_position');
    const timeLoc = gl.getUniformLocation(program, 'u_time');
    const resLoc = gl.getUniformLocation(program, 'u_resolution');
    const scaleLoc = gl.getUniformLocation(program, 'u_scale');
    const axLoc = gl.getUniformLocation(program, 'u_ax');
    const ayLoc = gl.getUniformLocation(program, 'u_ay');
    const azLoc = gl.getUniformLocation(program, 'u_az');
    const awLoc = gl.getUniformLocation(program, 'u_aw');
    const bxLoc = gl.getUniformLocation(program, 'u_bx');
    const byLoc = gl.getUniformLocation(program, 'u_by');
    const c1Loc = gl.getUniformLocation(program, 'u_color1');
    const c2Loc = gl.getUniformLocation(program, 'u_color2');
    const c3Loc = gl.getUniformLocation(program, 'u_color3');
    const c4Loc = gl.getUniformLocation(program, 'u_color4');
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    const vertices = new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    function resize() {
        const dpr = window.devicePixelRatio || 1;
        const width = Math.floor(canvas.clientWidth * dpr);
        const height = Math.floor(canvas.clientHeight * dpr);
        if (canvas.width !== width || canvas.height !== height) {
            canvas.width = width;
            canvas.height = height;
            gl.viewport(0, 0, canvas.width, canvas.height);
        }
    }
    const color1 = hexToRgbNormalized(HOLO_PARAMS.color1);
    const color2 = hexToRgbNormalized(HOLO_PARAMS.color2);
    const color3 = hexToRgbNormalized(HOLO_PARAMS.color3);
    const color4 = hexToRgbNormalized(HOLO_PARAMS.color4);
    gl.uniform3fv(c1Loc, new Float32Array(color1));
    gl.uniform3fv(c2Loc, new Float32Array(color2));
    gl.uniform3fv(c3Loc, new Float32Array(color3));
    gl.uniform3fv(c4Loc, new Float32Array(color4));
    gl.uniform1f(scaleLoc, HOLO_PARAMS.scale);
    gl.uniform1f(axLoc, HOLO_PARAMS.ax);
    gl.uniform1f(ayLoc, HOLO_PARAMS.ay);
    gl.uniform1f(azLoc, HOLO_PARAMS.az);
    gl.uniform1f(awLoc, HOLO_PARAMS.aw);
    gl.uniform1f(bxLoc, HOLO_PARAMS.bx);
    gl.uniform1f(byLoc, HOLO_PARAMS.by);
    let start = Date.now();

    function render() {
        resize();
        const now = Date.now();
        const t = (now - start);
        gl.uniform1f(timeLoc, t * 0.0025);
        gl.uniform2f(resLoc, canvas.width, canvas.height);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        animationFrameId = requestAnimationFrame(render);
    }
    requestAnimationFrame(render);
}

// --- SCRIPT DAS LINHAS SVG ---
function drawLines() {
    const svg = document.querySelector("svg.overlay");
    if (!svg) return;
    svg.innerHTML = "";

    const btnPP = document.getElementById("sizePP");
    const btnGG = document.getElementById("sizeGG");
    const btnM = document.getElementById("sizeM");
    const btnCustom = document.getElementById("custom-size");
    const text1 = document.getElementById("text1");
    const text2 = document.getElementById("text2");

    if (!btnPP || !btnGG || !btnM || !btnCustom || !text1 || !text2) return;

    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
    const strokeWidth = 0.025 * rem;
    const svgRect = svg.getBoundingClientRect();
    const rectPP = btnPP.getBoundingClientRect();
    const rectGG = btnGG.getBoundingClientRect();
    const rectM = btnM.getBoundingClientRect();
    const rectCustom = btnCustom.getBoundingClientRect();
    const rectT1 = text1.getBoundingClientRect();
    const rectT2 = text2.getBoundingClientRect();

    const toSvgX = (r) => r.left - svgRect.left + (r.width / 2);
    const toSvgY = (r) => r.top - svgRect.top;

    const buttonsY = toSvgY(rectPP) + rectPP.height + (1.5 * rem);
    const mainLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
    const lineStartX = rectPP.left - svgRect.left;
    const lineEndX = (rectGG.left - svgRect.left) + rectGG.width;
    mainLine.setAttribute("x1", lineStartX);
    mainLine.setAttribute("y1", buttonsY);
    mainLine.setAttribute("x2", lineEndX);
    mainLine.setAttribute("y2", buttonsY);
    mainLine.setAttribute("stroke", "white");
    mainLine.setAttribute("stroke-width", strokeWidth);
    svg.appendChild(mainLine);

    const midX = toSvgX(rectM);
    const text1Y = toSvgY(rectT1);
    const vertical1 = document.createElementNS("http://www.w3.org/2000/svg", "line");
    vertical1.setAttribute("x1", midX);
    vertical1.setAttribute("y1", buttonsY);
    vertical1.setAttribute("x2", midX);
    vertical1.setAttribute("y2", text1Y - (0.5 * rem));
    vertical1.setAttribute("stroke", "white");
    vertical1.setAttribute("stroke-width", strokeWidth);
    svg.appendChild(vertical1);

    const customX = toSvgX(rectCustom);
    const text2Y = toSvgY(rectT2) + (rectT2.height / 2);
    const vertical2 = document.createElementNS("http://www.w3.org/2000/svg", "line");
    vertical2.setAttribute("x1", customX);
    vertical2.setAttribute("y1", buttonsY);
    vertical2.setAttribute("x2", customX);
    vertical2.setAttribute("y2", text2Y);
    vertical2.setAttribute("stroke", "white");
    vertical2.setAttribute("stroke-width", strokeWidth);
    svg.appendChild(vertical2);

    const text2StartX = toSvgX(rectT2) - (rectT2.width / 1.13);
    const horizontal2 = document.createElementNS("http://www.w3.org/2000/svg", "line");
    horizontal2.setAttribute("x1", customX);
    horizontal2.setAttribute("y1", text2Y);
    horizontal2.setAttribute("x2", text2StartX + rectT2.width);
    horizontal2.setAttribute("y2", text2Y);
    horizontal2.setAttribute("stroke", "white");
    horizontal2.setAttribute("stroke-width", strokeWidth);
    svg.appendChild(horizontal2);
}

let resizeTimer;
window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(drawLines, 100);
});
window.addEventListener("load", () => {
    setTimeout(drawLines, 100);
});
drawLines();

// --- SCRIPT PRINCIPAL DA APLICAÇÃO ---
document.addEventListener('DOMContentLoaded', () => {
    const { PDFDocument, rgb, StandardFonts } = PDFLib;

    const PRESET_SIZES = {
        male: {
            sizePP: { 'input-brachial': 30, 'input-wrist': 17, 'input-forearm': 25, 'input-shoulders': 41, 'input-bust': 89, 'input-waist': 75, 'input-neck': 35, 'input-arm': 54, 'input-torso': 45, 'input-hip': 91, 'input-upper-leg': 57, 'input-lower-leg': 36, 'input-calf': 38, 'input-ankle': 24, 'input-leg': 104 },
            sizeP:  { 'input-brachial': 32, 'input-wrist': 17, 'input-forearm': 26, 'input-shoulders': 42, 'input-bust': 95, 'input-waist': 81, 'input-neck': 36, 'input-arm': 55, 'input-torso': 46, 'input-hip': 97, 'input-upper-leg': 59, 'input-lower-leg': 37, 'input-calf': 39, 'input-ankle': 25, 'input-leg': 105 },
            sizeM:  { 'input-brachial': 34, 'input-wrist': 18, 'input-forearm': 27, 'input-shoulders': 43, 'input-bust': 101, 'input-waist': 87, 'input-neck': 37, 'input-arm': 56, 'input-torso': 47, 'input-hip': 103, 'input-upper-leg': 61, 'input-lower-leg': 38, 'input-calf': 40, 'input-ankle': 26, 'input-leg': 106 },
            sizeG:  { 'input-brachial': 36, 'input-wrist': 19, 'input-forearm': 28, 'input-shoulders': 45, 'input-bust': 107, 'input-waist': 93, 'input-neck': 38, 'input-arm': 57, 'input-torso': 48, 'input-hip': 109, 'input-upper-leg': 63, 'input-lower-leg': 39, 'input-calf': 41, 'input-ankle': 27, 'input-leg': 107 },
            sizeGG: { 'input-brachial': 38, 'input-wrist': 20, 'input-forearm': 30, 'input-shoulders': 47, 'input-bust': 113, 'input-waist': 99, 'input-neck': 39, 'input-arm': 58, 'input-torso': 49, 'input-hip': 115, 'input-upper-leg': 65, 'input-lower-leg': 40, 'input-calf': 42, 'input-ankle': 28, 'input-leg': 108 }
        },
        female: {
            sizePP: { 'input-brachial': 28, 'input-wrist': 14, 'input-forearm': 23, 'input-shoulders': 36, 'input-bust': 83, 'input-waist': 63, 'input-neck': 32, 'input-arm': 51, 'input-torso': 40, 'input-hip': 87, 'input-upper-leg': 55, 'input-lower-leg': 31, 'input-calf': 36, 'input-ankle': 20, 'input-leg': 102 },
            sizeP:  { 'input-brachial': 30, 'input-wrist': 15, 'input-forearm': 24, 'input-shoulders': 38, 'input-bust': 91, 'input-waist': 71, 'input-neck': 33, 'input-arm': 52, 'input-torso': 41, 'input-hip': 95, 'input-upper-leg': 57, 'input-lower-leg': 32, 'input-calf': 37, 'input-ankle': 21, 'input-leg': 103 },
            sizeM:  { 'input-brachial': 32, 'input-wrist': 16, 'input-forearm': 25, 'input-shoulders': 40, 'input-bust': 99, 'input-waist': 79, 'input-neck': 34, 'input-arm': 53, 'input-torso': 42, 'input-hip': 103, 'input-upper-leg': 60, 'input-lower-leg': 33, 'input-calf': 38, 'input-ankle': 22, 'input-leg': 104 },
            sizeG:  { 'input-brachial': 34, 'input-wrist': 17, 'input-forearm': 27, 'input-shoulders': 41, 'input-bust': 107, 'input-waist': 91, 'input-neck': 36, 'input-arm': 54, 'input-torso': 43, 'input-hip': 115, 'input-upper-leg': 63, 'input-lower-leg': 34, 'input-calf': 40, 'input-ankle': 23, 'input-leg': 105 },
            sizeGG: { 'input-brachial': 36, 'input-wrist': 18, 'input-forearm': 28, 'input-shoulders': 42, 'input-bust': 115, 'input-waist': 100, 'input-neck': 37, 'input-arm': 55, 'input-torso': 44, 'input-hip': 123, 'input-upper-leg': 66, 'input-lower-leg': 35, 'input-calf': 42, 'input-ankle': 24, 'input-leg': 106 }
        }
    };

    const formatOnInput = (inputEl, maxDigits, suffix) => {
        let rawValue = inputEl.value.replace(/\D/g, '');
        if (rawValue.length > maxDigits) rawValue = rawValue.slice(-maxDigits);
        if (rawValue === '') {
            inputEl.value = '';
            return;
        }
        const decimals = parseInt(inputEl.dataset.decimals, 10) || 0;
        let formattedValue;
        if (decimals > 0) {
            const paddedValue = rawValue.padStart(decimals + 1, '0');
            const decimalIndex = paddedValue.length - decimals;
            const integerPart = parseInt(paddedValue.substring(0, decimalIndex), 10) || 0;
            const decimalPart = paddedValue.substring(decimalIndex);
            formattedValue = `${integerPart},${decimalPart}`;
        } else {
            formattedValue = `${parseInt(rawValue, 10) || 0}`;
        }
        inputEl.value = formattedValue + suffix;
    };

    const checkOnBlur = (inputEl, suffix) => {
        const numericValue = parseFloat(inputEl.value.replace(suffix, '').replace(',', '.'));
        if (isNaN(numericValue) || numericValue === 0) inputEl.value = '';
    };

    const alturaInput = document.getElementById('altura');
    if (alturaInput) {
        alturaInput.addEventListener('input', () => formatOnInput(alturaInput, 3, ' m'));
        alturaInput.addEventListener('blur', () => checkOnBlur(alturaInput, ' m'));
    }

    const pesoInput = document.getElementById('peso');
    if (pesoInput) {
        pesoInput.addEventListener('input', () => formatOnInput(pesoInput, 5, ' kg'));
        pesoInput.addEventListener('blur', () => checkOnBlur(pesoInput, ' kg'));
    }

    const mainWrapper = document.querySelector('.main-wrapper');
    const successScreen = document.getElementById('success-screen');
    const maleBtn = document.getElementById('sex-btn-male');
    const femaleBtn = document.getElementById('sex-btn-female');
    const sizeButtons = document.querySelectorAll('.size-btn');
    const customSizeBtn = document.getElementById('custom-size');
    const mannequinInputs = document.querySelectorAll('.measurement-input');
    const modalOverlay = document.getElementById('confirm-modal-overlay');
    const openModalBtn = document.getElementById('open-modal-btn');
    const finalSubmitBtn = document.getElementById('confirm-and-submit-btn');
    const resetBtn = document.getElementById('reset-btn');

    function setupSvgHighlighting() {
        const measurementPoints = document.querySelectorAll('.measurement-point[data-svg-target]');
        measurementPoints.forEach(point => {
            const input = point.querySelector('input');
            const svgTargetId = point.dataset.svgTarget;
            if (!input || !svgTargetId) return;
            const svgElement = document.getElementById(svgTargetId);
            if (svgElement) {
                input.addEventListener('focus', () => svgElement.classList.add('highlighted'));
                input.addEventListener('blur', () => svgElement.classList.remove('highlighted'));
            }
        });
    }

    function loadSvg(fileName) {
        return fetch(`images/${fileName}`)
            .then(response => {
                if (!response.ok) throw new Error(`Erro na rede: ${response.statusText}`);
                return response.text();
            })
            .then(svgData => {
                const placeholder = document.getElementById('mannequin-placeholder');
                if (placeholder) {
                    placeholder.innerHTML = svgData;
                    const svgElement = placeholder.querySelector('svg');
                    if (svgElement) svgElement.classList.add('mannequin-svg');
                    setupSvgHighlighting();
                }
            })
            .catch(error => console.error(`Falha ao carregar ${fileName}:`, error));
    }

    function switchMannequin(gender) {
        maleBtn.classList.remove('selected');
        femaleBtn.classList.remove('selected');
        let fileName;
        if (gender === 'male') {
            maleBtn.classList.add('selected');
            fileName = 'tposemasc-full.svg';
        } else {
            femaleBtn.classList.add('selected');
            fileName = 'tposefem-full.svg';
        }
        return loadSvg(fileName);
    }

    function selectSizeButton(buttonToSelect) {
        sizeButtons.forEach(btn => btn.classList.remove('selected'));
        if (buttonToSelect) buttonToSelect.classList.add('selected');
    }

    async function captureElementByDrawing(selector, scale = 4) {
        const container = document.querySelector(selector);
        const containerRect = container.getBoundingClientRect();
        
        const canvas = document.createElement('canvas');
        canvas.width = containerRect.width * scale;
        canvas.height = containerRect.height * scale;
        const ctx = canvas.getContext('2d');
        ctx.scale(scale, scale);

        const buttons = Array.from(container.children);
        for (const btn of buttons) {
            const rect = btn.getBoundingClientRect();
            const styles = getComputedStyle(btn);

            const x = rect.left - containerRect.left;
            const y = rect.top - containerRect.top;
            
            ctx.fillStyle = styles.backgroundColor;
            ctx.beginPath();
            ctx.roundRect(x, y, rect.width, rect.height, parseFloat(styles.borderRadius));
            ctx.fill();

            const img = btn.querySelector('img');
            if (img) {
                const imgRect = img.getBoundingClientRect();
                const imgX = imgRect.left - containerRect.left;
                const imgY = imgRect.top - containerRect.top;
                ctx.drawImage(img, imgX, imgY, imgRect.width, imgRect.height);
            } else {
                ctx.fillStyle = styles.color;
                ctx.font = `${styles.fontWeight} ${styles.fontSize} ${styles.fontFamily}`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(btn.textContent, x + rect.width / 2, y + rect.height / 2);
            }
        }
        return canvas.toDataURL();
    }
    
    async function handleFinalSubmit() {
        const customerName = document.getElementById('nome').value || 'Cliente';
        finalSubmitBtn.textContent = 'Gerando e salvando...';
        finalSubmitBtn.disabled = true;

        try {
            const PDF_CONFIG = {
                CUSTOMER_INFO: { 
                    y: 710, 
                    nameX: 55,
                    column1X: 102,
                    fontColorBlack: rgb(0, 0, 0), 
                    fontSize: 12, 
                    lineHeight: 50 
                },
                SEX_BUTTONS: { x: 440, y: 680, targetWidth: 67 },
                SIZE_BUTTONS: { x: 292.5, y: 631.5, targetWidth: 215 },
                MANNEQUIN: { 
                    x: 72.5,
                    y: 120,
                    targetWidth: 450
                },
            };

            const mannequinContainer = document.querySelector('.mannequin-container');
            
            const [mannequinImagePng, sexButtonsImagePng, sizeButtonsImagePng] = await Promise.all([
                html2canvas(mannequinContainer, { backgroundColor: null, scale: 4, onclone: (doc) => {
                    doc.querySelectorAll('.measurement-input').forEach(input => {
                        if (!input.value.trim()) {
                            input.value = "N/I";
                        } else {
                            input.value = input.value.replace(' (cm)', 'cm');
                        }
                        input.style.color = '#000';
                    });
                    doc.querySelectorAll('.mannequin-svg g:not([id^="svg-"]) path, .mannequin-svg g:not([id^="svg-"]) ellipse').forEach(el => {
                        el.style.fill = '#664586ff';
                        el.style.stroke = '#664586ff';
                    });
                    doc.querySelectorAll('.mannequin-svg g[id^="svg-"] path, .mannequin-svg g[id^="svg-"] line, .mannequin-svg g[id^="svg-"] ellipse').forEach(el => {
                        el.style.stroke = '#9865bfff';
                    });
                }}).then(canvas => canvas.toDataURL()),
                captureElementByDrawing('.sex-options'),
                captureElementByDrawing('.size-selector')
            ]);
            
            const existingPdfBytes = await fetch('docs/base-documento-oficial-de-medidas.pdf').then(res => res.arrayBuffer());
            const pdfDoc = await PDFDocument.load(existingPdfBytes);
            const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
            
            const page = pdfDoc.getPages()[1];

            const { y, nameX, column1X, fontColorBlack, fontSize, lineHeight } = PDF_CONFIG.CUSTOMER_INFO;
            page.drawText(`${customerName}`, { x: nameX, y: y, font: helveticaFont, size: fontSize, color: fontColorBlack });
            page.drawText(`${document.getElementById('altura').value || 'Não informado'}`, { x: column1X, y: y - lineHeight, font: helveticaFont, size: fontSize, color: fontColorBlack });
            page.drawText(`${document.getElementById('peso').value || 'Não informado'}`, { x: column1X, y: y - (lineHeight * 2), font: helveticaFont, size: fontSize, color: fontColorBlack });

            const sexButtonsImage = await pdfDoc.embedPng(sexButtonsImagePng);
            const sizeButtonsImage = await pdfDoc.embedPng(sizeButtonsImagePng);

            const sexRatio = sexButtonsImage.width / sexButtonsImage.height;
            const sexW = PDF_CONFIG.SEX_BUTTONS.targetWidth;
            const sexH = sexW / sexRatio;
            page.drawImage(sexButtonsImage, { x: PDF_CONFIG.SEX_BUTTONS.x, y: PDF_CONFIG.SEX_BUTTONS.y - sexH, width: sexW, height: sexH });
            
            const sizeRatio = sizeButtonsImage.width / sizeButtonsImage.height;
            const sizeW = PDF_CONFIG.SIZE_BUTTONS.targetWidth;
            const sizeH = sizeW / sizeRatio;
            page.drawImage(sizeButtonsImage, { x: PDF_CONFIG.SIZE_BUTTONS.x, y: PDF_CONFIG.SIZE_BUTTONS.y - sizeH, width: sizeW, height: sizeH });
            
            if (PDF_CONFIG.MANNEQUIN.targetWidth > 0) {
                const mannequinImage = await pdfDoc.embedPng(mannequinImagePng);
                const mannequinRatio = mannequinImage.width / mannequinImage.height;
                const manW = PDF_CONFIG.MANNEQUIN.targetWidth;
                const manH = manW / mannequinRatio;
                page.drawImage(mannequinImage, { x: PDF_CONFIG.MANNEQUIN.x, y: PDF_CONFIG.MANNEQUIN.y, width: manW, height: manH });
            }

            const pdfBytes = await pdfDoc.save();
            const blob = new Blob([pdfBytes], { type: 'application/pdf' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `Documento Oficial de Medidas - ${customerName}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href);

            // --- ENVIO DE E-MAIL COM EMAILJS ---
            let measurementsText = `--- Dados do Cliente ---\n\n`;
            measurementsText += `Nome: ${customerName}\n`;
            measurementsText += `Altura: ${document.getElementById('altura').value || 'Não informado'}\n`;
            measurementsText += `Peso: ${document.getElementById('peso').value || 'Não informado'}\n`;
            measurementsText += `Sexo: ${maleBtn.classList.contains('selected') ? 'Masculino' : 'Feminino'}\n\n`;
            measurementsText += '--- Medidas do Cliente ---\n\n';
            
            mannequinInputs.forEach(input => {
                const label = input.placeholder.replace(' (cm)', '');
                const value = input.value || 'Não informado';
                measurementsText += `${label}: ${value}\n`;
            });

            const templateParams = {
                to_email: 'gwilcosplay@gmail.com',
                customerName: customerName,
                measurements_data: measurementsText 
            };
            
            const serviceID = 'service_e5eap4n';
            const templateID = 'template_umuuzcf';
            const publicKey = 'cwMLg-7XaeKjmpHmz';

            await emailjs.send(serviceID, templateID, templateParams, publicKey);

            closeModal();
            mainWrapper.classList.add('hidden');
            successScreen.classList.remove('hidden');

        } catch (error) {
            console.error('Erro ao gerar, salvar ou enviar o documento:', error);
        } finally {
            finalSubmitBtn.textContent = 'Aceitar e continuar';
            finalSubmitBtn.disabled = false;
        }
    }

    function openModal() {
        modalOverlay.classList.remove('hidden');
        document.body.classList.add('modal-active');
        if (typeof cancelAnimationFrame === 'function') {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }
    }

    function closeModal() {
        modalOverlay.classList.add('hidden');
        document.body.classList.remove('modal-active');
        if (typeof requestAnimationFrame === 'function' && !animationFrameId) {
            requestAnimationFrame(render);
        }
    }

    function showTooltip(element, message) {
        if (element.hasAttribute('data-tooltip-active')) return;

        element.setAttribute('data-tooltip-active', 'true');

        const tooltip = document.createElement('div');
        tooltip.className = 'validation-tooltip';
        tooltip.textContent = message;
        document.body.appendChild(tooltip);

        const rect = element.parentElement.getBoundingClientRect();
        tooltip.style.left = `${rect.right + 10}px`;
        tooltip.style.top = `${rect.top + rect.height / 2 - tooltip.offsetHeight / 2}px`;

        setTimeout(() => {
            tooltip.classList.add('fade-out');
            setTimeout(() => {
                tooltip.remove();
                element.removeAttribute('data-tooltip-active');
            }, 300);
        }, 2000);
    }

    function validateAndOpenModal() {
        const requiredFields = [
            { el: document.getElementById('nome'), name: 'Nome' },
            { el: document.getElementById('altura'), name: 'Altura' },
            { el: document.getElementById('peso'), name: 'Peso' }
        ];

        let allValid = true;
        requiredFields.forEach(field => {
            if (!field.el.value.trim()) {
                showTooltip(field.el, 'Campo obrigatório!');
                allValid = false;
            }
        });

        if (allValid) {
            openModal();
        }
    }

    function resetPage() {
        document.getElementById('nome').value = '';
        alturaInput.value = '';
        pesoInput.value = '';

        mannequinInputs.forEach(input => {
            input.value = '';
        });

        switchMannequin('male');
        selectSizeButton(customSizeBtn);

        successScreen.classList.add('hidden');
        mainWrapper.classList.remove('hidden');
    }

    openModalBtn.addEventListener('click', validateAndOpenModal);
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) closeModal();
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !modalOverlay.classList.contains('hidden')) {
            closeModal();
        }
    });
    finalSubmitBtn.addEventListener('click', handleFinalSubmit);
    resetBtn.addEventListener('click', resetPage);

    sizeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            selectSizeButton(btn);
            const sizeId = btn.id;
            const gender = maleBtn.classList.contains('selected') ? 'male' : 'female';
            const measurements = PRESET_SIZES[gender][sizeId];

            if (measurements) {
                for (const inputId in measurements) {
                    const inputElement = document.getElementById(inputId);
                    if (inputElement) {
                        const value = measurements[inputId];
                        inputElement.value = value.toFixed(2).replace('.', ',') + ' (cm)';
                    }
                }
            }
        });
    });

    mannequinInputs.forEach(input => {
        input.addEventListener('input', () => {
            selectSizeButton(customSizeBtn);
            formatOnInput(input, 5, ' (cm)');
        });
        input.addEventListener('blur', () => checkOnBlur(input, ' (cm)'));
    });

    document.addEventListener('selectionchange', () => {
        const activeEl = document.activeElement;
        if (activeEl && activeEl.classList.contains('measurement-input')) {
            const input = activeEl;
            const suffix = ' (cm)';
            const value = input.value;
            if (!value.endsWith(suffix)) {
                return;
            }
            const boundary = value.length - suffix.length;
            if (input.selectionStart > boundary || input.selectionEnd > boundary) {
                input.setSelectionRange(boundary, boundary);
            }
        }
    });

    maleBtn.addEventListener('click', () => switchMannequin('male'));
    femaleBtn.addEventListener('click', () => switchMannequin('female'));

    switchMannequin('male').then(() => {
        selectSizeButton(customSizeBtn);
    });
});