const CORR_FIELDS = [
    { key: 'morning_routine',  label: 'morning routine' },
    { key: 'evening_routine',  label: 'evening routine' },
    { key: 'hit',              label: 'hit (MR+ER)' },
    { key: 'lift',             label: 'lift' },
    { key: 'muay_thai',        label: 'muay thai' },
    { key: 'run',              label: 'run' },
    { key: 'school_hours',     label: 'school (h)' },
    { key: 'home_hours',       label: 'home (h)' },
    { key: 'work_hours',       label: 'work (h)' },
    { key: 'weight',           label: 'weight' },
    { key: 'produce_mins',     label: 'produce (m)' },
    { key: 'youtube_mins',     label: 'youtube (m)' },
    { key: 'bonus_count',      label: 'bonuses' },
    { key: 'stress',           label: 'stress' },
    { key: 'mood',             label: 'mood' },
    { key: 'energy',           label: 'energy' },
    { key: 'tir_pct',          label: 'TIR %' },
    { key: 'sleep_mins',       label: 'sleep (m)' },
    { key: 'sleep_efficiency', label: 'sleep eff.' },
];

const MIN_N = 5; // minimum shared observations to show a correlation

async function loadCorrelation() {
    const el = document.getElementById('correlation-matrix');
    if (!el) return;
    try {
        const resp = await fetch(`${API_URL}/data/correlations`, {
            headers: { 'X-Key': apiKey }
        });
        if (!resp.ok) { el.textContent = 'failed to load'; return; }
        const data = await resp.json();
        renderCorrelationMatrix(el, data);
    } catch (e) {
        console.error('Correlation load error', e);
    }
}

function pearson(data, keyX, keyY) {
    const pairs = data
        .map(d => [d[keyX], d[keyY]])
        .filter(([x, y]) => x != null && y != null && isFinite(x) && isFinite(y));

    const n = pairs.length;
    if (n < MIN_N) return { r: null, n };

    let sumX = 0, sumY = 0;
    for (const [x, y] of pairs) { sumX += x; sumY += y; }
    const mx = sumX / n, my = sumY / n;

    let num = 0, dx2 = 0, dy2 = 0;
    for (const [x, y] of pairs) {
        const dx = x - mx, dy = y - my;
        num += dx * dy;
        dx2 += dx * dx;
        dy2 += dy * dy;
    }
    const denom = Math.sqrt(dx2 * dy2);
    return { r: denom === 0 ? 0 : num / denom, n };
}

// Red (−1) → near-white (0) → green (+1), in monospace dark-mode-aware style
function corrColor(r) {
    if (r === null) return 'transparent';
    const t = (r + 1) / 2; // 0..1
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (isDark) {
        // dark mode: negative → dark red, positive → dark green
        const nr = Math.round(40 + (1 - t) * 160);
        const g  = Math.round(40 + t * 160);
        return `rgb(${nr},${g},40)`;
    } else {
        const nr = Math.round(255 - t * 120);
        const g  = Math.round(135 + t * 120);
        return `rgb(${nr},${g},135)`;
    }
}

function renderCorrelationMatrix(el, data) {
    const fields = CORR_FIELDS;
    const n = fields.length;

    // Precompute all pairs
    const matrix = [];
    for (let i = 0; i < n; i++) {
        matrix[i] = [];
        for (let j = 0; j < n; j++) {
            if (i === j) {
                matrix[i][j] = { r: 1, n: data.filter(d => d[fields[i].key] != null).length };
            } else {
                matrix[i][j] = pearson(data, fields[i].key, fields[j].key);
            }
        }
    }

    // SVG layout constants
    const cellSize   = 38;
    const labelWidth = 90;   // row label width
    const headerH    = 110;  // rotated col label space
    const padLeft    = labelWidth;
    const padTop     = headerH;
    const svgW = padLeft + n * cellSize + 1;
    const svgH = padTop  + n * cellSize + 1;

    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const labelColor = isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.55)';
    const lineColor  = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';
    const diagColor  = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)';

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width',  svgW);
    svg.setAttribute('height', svgH);
    svg.style.fontFamily = 'monospace';

    // ── Column labels (rotated 45°) ────────────────────────────────────────
    for (let j = 0; j < n; j++) {
        const cx = padLeft + j * cellSize + cellSize / 2;
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', cx);
        text.setAttribute('y', padTop - 6);
        text.setAttribute('font-size', '10');
        text.setAttribute('fill', labelColor);
        text.setAttribute('text-anchor', 'start');
        text.setAttribute('transform', `rotate(-45, ${cx}, ${padTop - 6})`);
        text.textContent = fields[j].label;
        svg.appendChild(text);
    }

    // ── Rows ───────────────────────────────────────────────────────────────
    for (let i = 0; i < n; i++) {
        const cy = padTop + i * cellSize;

        // Row label
        const rowLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        rowLabel.setAttribute('x', padLeft - 6);
        rowLabel.setAttribute('y', cy + cellSize / 2 + 4);
        rowLabel.setAttribute('font-size', '10');
        rowLabel.setAttribute('fill', labelColor);
        rowLabel.setAttribute('text-anchor', 'end');
        rowLabel.textContent = fields[i].label;
        svg.appendChild(rowLabel);

        for (let j = 0; j < n; j++) {
            const cx = padLeft + j * cellSize;
            const { r, n: cnt } = matrix[i][j];
            const isNullCell = r === null;
            const isDiag     = i === j;

            // Background rect
            const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            rect.setAttribute('x',      cx);
            rect.setAttribute('y',      cy);
            rect.setAttribute('width',  cellSize);
            rect.setAttribute('height', cellSize);
            rect.setAttribute('fill', isDiag ? diagColor : (isNullCell ? lineColor : corrColor(r)));
            rect.setAttribute('stroke', lineColor);
            rect.setAttribute('stroke-width', '0.5');
            svg.appendChild(rect);

            if (!isNullCell) {
                // r value
                const rText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                rText.setAttribute('x', cx + cellSize / 2);
                rText.setAttribute('y', cy + cellSize / 2 + (isDiag ? 4 : 1));
                rText.setAttribute('font-size', isDiag ? '9' : '8.5');
                rText.setAttribute('fill', isDark ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.85)');
                rText.setAttribute('text-anchor', 'middle');
                rText.setAttribute('dominant-baseline', 'middle');
                rText.textContent = isDiag ? `n=${cnt}` : r.toFixed(2);
                svg.appendChild(rText);

                // N below (only for off-diagonal)
                if (!isDiag) {
                    const nText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                    nText.setAttribute('x', cx + cellSize / 2);
                    nText.setAttribute('y', cy + cellSize - 5);
                    nText.setAttribute('font-size', '7');
                    nText.setAttribute('fill', isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.4)');
                    nText.setAttribute('text-anchor', 'middle');
                    nText.textContent = `${cnt}`;
                    svg.appendChild(nText);
                }
            }
        }
    }

    el.innerHTML = '';
    el.appendChild(svg);

    // ── Tooltip ────────────────────────────────────────────────────────────
    let tooltip = document.getElementById('corr-tooltip');
    if (!tooltip) {
        tooltip = document.createElement('div');
        tooltip.id = 'corr-tooltip';
        tooltip.className = 'heatmap-tooltip'; // reuse existing tooltip style
        document.body.appendChild(tooltip);
    }

    svg.addEventListener('mousemove', e => {
        const svgRect = svg.getBoundingClientRect();
        const mx = e.clientX - svgRect.left;
        const my = e.clientY - svgRect.top;

        const j = Math.floor((mx - padLeft) / cellSize);
        const i = Math.floor((my - padTop)  / cellSize);

        if (i < 0 || i >= n || j < 0 || j >= n) {
            tooltip.style.display = 'none';
            return;
        }

        const { r, n: cnt } = matrix[i][j];
        const labelA = fields[i].label;
        const labelB = fields[j].label;

        let html = `<div class="heatmap-tooltip-date">${labelA} × ${labelB}</div>`;
        if (i === j) {
            html += `<div>${cnt} observations</div>`;
        } else if (r === null) {
            html += `<div class="heatmap-tooltip-miss">not enough data (n&lt;${MIN_N})</div>`;
        } else {
            const strength =
                Math.abs(r) >= 0.7 ? 'strong' :
                Math.abs(r) >= 0.4 ? 'moderate' : 'weak';
            const dir = r > 0 ? 'positive' : 'negative';
            html += `<div>r = ${r.toFixed(3)}</div>`;
            html += `<div style="opacity:0.65">${strength} ${dir} &nbsp;·&nbsp; n=${cnt}</div>`;
        }

        tooltip.innerHTML = html;
        tooltip.style.display = 'block';
        const tb = tooltip.getBoundingClientRect();
        let left = e.pageX + 12;
        let top  = e.pageY - tb.height / 2;
        if (left + tb.width > window.innerWidth) left = e.pageX - tb.width - 12;
        if (top < 0) top = 4;
        tooltip.style.left = left + 'px';
        tooltip.style.top  = top  + 'px';
    });

    svg.addEventListener('mouseleave', () => { tooltip.style.display = 'none'; });
}
