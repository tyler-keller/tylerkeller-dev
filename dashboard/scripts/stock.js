let stockScoreData = null;
let stockSeries = [];
let stockStreaks = { bestHit: null, worstDrop: null };

async function loadStock() {
    try {
        const resp = await fetch(`${API_URL}/data/score`, {
            headers: { 'X-Key': apiKey }
        });
        if (!resp.ok) return;
        stockScoreData = await resp.json();
        computeStockSeries();
        renderStock();
    } catch (e) {
        console.error("Stock load error", e);
    }
}

function computeStockSeries() {
    if (!stockScoreData || stockScoreData.length === 0) {
        stockSeries = [];
        return;
    }

    const sorted = [...stockScoreData].sort((a, b) => a.date.localeCompare(b.date));
    stockSeries = [];
    let score = 0;

    for (let i = 0; i < sorted.length; i++) {
        const day = sorted[i];
        const hit = day.hit;

        if (i === 0) {
            score = hit ? 1000 : 950;
        } else if (hit) {
            // base 1.005 + 0.005 per bonus + small random variance
            const mult = 1.005 + day.bonus_count * 0.005 + Math.random() * 0.005;
            score = score * mult;
        } else {
            score = score * 0.95;
        }

        stockSeries.push({ date: day.date, score, hit, bonus_count: day.bonus_count });
    }

    computeStreaks();
}

function computeStreaks() {
    let bestHit   = { length: 0, start: '', end: '' };
    let worstDrop = { length: 0, start: '', end: '' };
    let hitRun = 0, hitStart = '';
    let dropRun = 0, dropStart = '';

    for (let i = 0; i < stockSeries.length; i++) {
        if (stockSeries[i].hit) {
            if (hitRun === 0) hitStart = stockSeries[i].date;
            hitRun++;
            if (dropRun > worstDrop.length)
                worstDrop = { length: dropRun, start: dropStart, end: stockSeries[i - 1].date };
            dropRun = 0;
        } else {
            if (dropRun === 0) dropStart = stockSeries[i].date;
            dropRun++;
            if (hitRun > bestHit.length)
                bestHit = { length: hitRun, start: hitStart, end: stockSeries[i - 1].date };
            hitRun = 0;
        }
    }
    if (hitRun  > bestHit.length)
        bestHit   = { length: hitRun,  start: hitStart,  end: stockSeries[stockSeries.length - 1].date };
    if (dropRun > worstDrop.length)
        worstDrop = { length: dropRun, start: dropStart, end: stockSeries[stockSeries.length - 1].date };

    stockStreaks = { bestHit, worstDrop };
}

function renderStock() {
    renderStockStats();
    renderStockChart();
}

function renderStockStats() {
    const container = document.getElementById('stock-stats');
    if (!container) return;
    container.innerHTML = '';

    if (stockSeries.length === 0) {
        container.innerHTML = '<span style="color:#666">no data</span>';
        return;
    }

    const current = stockSeries[stockSeries.length - 1].score;
    const periods = [
        { label: 'week',     days: 7     },
        { label: 'month',    days: 30    },
        { label: 'year',     days: 365   },
        { label: 'all time', days: 99999 },
    ];

    const statsHtml = periods.map(p => {
        const idx  = Math.max(0, stockSeries.length - 1 - p.days);
        const prev = stockSeries[idx].score;
        const pct  = (current - prev) / prev * 100;
        const sign = pct >= 0 ? '+' : '';
        const cls  = pct >= 0 ? 'stock-up' : 'stock-down';
        return `<div class="stock-stat">` +
               `<span class="stock-stat-label">${p.label}</span>` +
               `<span class="${cls}">${sign}${pct.toFixed(1)}%</span></div>`;
    }).join('');

    // today's bonus breakdown
    const today = stockSeries[stockSeries.length - 1];
    const todayData = stockScoreData.find(d => d.date === today.date);
    let bonusHtml = '';
    if (todayData) {
        const b = todayData.bonuses;
        const det = todayData.details;
        const fmt = (v, label) =>
            `<span class="${v ? 'stock-bonus-on' : 'stock-bonus-off'}">${label}</span>`;
        bonusHtml = `<div class="stock-bonuses">` +
            fmt(b.produce,   'produce') +
            fmt(b.no_yt,     'no yt') +
            fmt(b.cardio,    'cardio') +
            fmt(b.lift_week, `lift (${det.lifts_this_week}/3)`) +
            fmt(b.tir,       det.tir_pct != null ? `TIR ${det.tir_pct}%` : 'TIR') +
            fmt(b.insulin,   'insulin') +
        `</div>`;
    }

    const { bestHit, worstDrop } = stockStreaks;
    const streaksHtml =
        `<div class="stock-streak">` +
        `<span class="stock-stat-label">best streak</span>` +
        `<span class="stock-up">${bestHit.length}d</span>` +
        `<span class="stock-streak-dates">${bestHit.start} to ${bestHit.end}</span>` +
        `</div>` +
        `<div class="stock-streak">` +
        `<span class="stock-stat-label">worst drop</span>` +
        `<span class="stock-down">${worstDrop.length}d</span>` +
        `<span class="stock-streak-dates">${worstDrop.start} to ${worstDrop.end}</span>` +
        `</div>`;

    container.innerHTML =
        `<div class="stock-stats-left">` +
        `<div class="stock-score">${current.toFixed(1)}</div>` +
        `<div class="stock-stats-row">${statsHtml}</div>` +
        bonusHtml +
        `</div>` +
        `<div class="stock-stats-right">${streaksHtml}</div>`;
}

function renderStockChart() {
    const container = document.getElementById('stock-chart');
    if (!container) return;
    container.innerHTML = '';

    if (stockSeries.length < 2) {
        container.innerHTML = '<span style="color:#666">need more data</span>';
        return;
    }

    const isDark     = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const axisColor  = isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)';
    const textColor  = isDark ? 'rgba(255,255,255,0.4)'  : 'rgba(0,0,0,0.4)';
    const upColor    = '#1eff00';
    const downColor  = '#ff6b6b';

    const padding    = { top: 10, right: 16, bottom: 24, left: 50 };
    const chartWidth = 740;
    const chartHeight = 140;
    const svgWidth   = chartWidth + padding.left + padding.right;
    const svgHeight  = chartHeight + padding.top + padding.bottom;

    const scores   = stockSeries.map(s => s.score);
    const minScore = Math.min(...scores) * 0.95;
    const maxScore = Math.max(...scores) * 1.05;
    const range    = maxScore - minScore || 1;

    const xScale = (i) => padding.left + (i / (stockSeries.length - 1)) * chartWidth;
    const yScale = (v) => padding.top + chartHeight - ((v - minScore) / range) * chartHeight;

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', svgWidth);
    svg.setAttribute('height', svgHeight);

    // grid lines
    for (let i = 0; i <= 4; i++) {
        const y   = padding.top + (i / 4) * chartHeight;
        const val = maxScore - (i / 4) * range;
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', padding.left); line.setAttribute('y1', y);
        line.setAttribute('x2', padding.left + chartWidth); line.setAttribute('y2', y);
        line.setAttribute('stroke', axisColor); line.setAttribute('stroke-width', '1');
        svg.appendChild(line);
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', padding.left - 6); text.setAttribute('y', y + 3);
        text.setAttribute('text-anchor', 'end'); text.setAttribute('font-size', '9');
        text.setAttribute('fill', textColor); text.setAttribute('font-family', 'monospace');
        text.textContent = val.toFixed(0);
        svg.appendChild(text);
    }

    // area fill
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    const grad = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
    grad.setAttribute('id', 'stock-gradient');
    grad.setAttribute('x1', '0'); grad.setAttribute('y1', '0');
    grad.setAttribute('x2', '0'); grad.setAttribute('y2', '1');
    [['0%', '0.2'], ['100%', '0']].forEach(([offset, opacity]) => {
        const stop = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
        stop.setAttribute('offset', offset);
        stop.setAttribute('stop-color', upColor);
        stop.setAttribute('stop-opacity', opacity);
        grad.appendChild(stop);
    });
    defs.appendChild(grad);
    svg.appendChild(defs);

    const areaPoints = [`${xScale(0)},${padding.top + chartHeight}`];
    for (let i = 0; i < stockSeries.length; i++)
        areaPoints.push(`${xScale(i)},${yScale(stockSeries[i].score)}`);
    areaPoints.push(`${xScale(stockSeries.length - 1)},${padding.top + chartHeight}`);
    const area = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    area.setAttribute('points', areaPoints.join(' '));
    area.setAttribute('fill', 'url(#stock-gradient)');
    svg.appendChild(area);

    // line segments
    for (let i = 1; i < stockSeries.length; i++) {
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', xScale(i - 1)); line.setAttribute('y1', yScale(stockSeries[i - 1].score));
        line.setAttribute('x2', xScale(i));     line.setAttribute('y2', yScale(stockSeries[i].score));
        line.setAttribute('stroke', stockSeries[i].hit ? upColor : downColor);
        line.setAttribute('stroke-width', '1.5');
        svg.appendChild(line);
    }

    // x-axis labels
    const interval = Math.max(1, Math.floor(stockSeries.length / 6));
    for (let i = 0; i < stockSeries.length; i += interval) {
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', xScale(i));
        text.setAttribute('y', padding.top + chartHeight + 16);
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('font-size', '8');
        text.setAttribute('fill', textColor);
        text.setAttribute('font-family', 'monospace');
        const parts = stockSeries[i].date.split('-');
        text.textContent = `${parts[1]}/${parts[2]}`;
        svg.appendChild(text);
    }

    // current dot
    const last = stockSeries.length - 1;
    const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    dot.setAttribute('cx', xScale(last)); dot.setAttribute('cy', yScale(stockSeries[last].score));
    dot.setAttribute('r', '3'); dot.setAttribute('fill', stockSeries[last].hit ? upColor : downColor);
    svg.appendChild(dot);

    container.appendChild(svg);
}
