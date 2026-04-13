let stockSheetData = null;
let stockSeries = [];

async function loadStock() {
    try {
        const resp = await fetch(`${API_URL}/data/sheet`, {
            headers: { 'X-Key': apiKey }
        });
        if (!resp.ok) return;
        stockSheetData = await resp.json();
        computeStockSeries();
        renderStock();
    } catch (e) {
        console.error("Stock load error", e);
    }
}

function computeStockSeries() {
    if (!stockSheetData || stockSheetData.length === 0) {
        stockSeries = [];
        return;
    }

    const sorted = [...stockSheetData].sort((a, b) => a.date.localeCompare(b.date));
    stockSeries = [];
    let score = 100;

    for (let i = 0; i < sorted.length; i++) {
        const day = sorted[i];
        // const hit = day.morning_routine && day.evening_routine && (day.lift || day.muay_thai || day.run);
        const hit = day.morning_routine && day.evening_routine 

        if (i === 0) {
            score = hit ? 100 : 80;
        } else if (hit) {
            const additionalMult = (day.lift || day.muay_thai || day.run) ? 0.02 : 0;
            const randomMult = 1.005 + Math.random() * 0.01 + additionalMult;
            score = score * randomMult;
        } else {
            score = score * 0.95;
        }

        stockSeries.push({
            date: day.date,
            score: score,
            hit: hit
        });
    }
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
        { label: 'week', days: 7 },
        { label: 'month', days: 30 },
        { label: 'year', days: 365 },
        { label: 'all time', days: 99999 }
    ];

    const html = periods.map(p => {
        const idx = Math.max(0, stockSeries.length - 1 - p.days);
        const prev = stockSeries[idx].score;
        const pct = ((current - prev) / prev * 100);
        const sign = pct >= 0 ? '+' : '';
        const cls = pct >= 0 ? 'stock-up' : 'stock-down';
        return `<div class="stock-stat"><span class="stock-stat-label">${p.label}</span><span class="${cls}">${sign}${pct.toFixed(1)}%</span></div>`;
    }).join('');

    container.innerHTML = `
        <div class="stock-score">${current.toFixed(1)}</div>
        <div class="stock-stats-row">${html}</div>
    `;
}

function renderStockChart() {
    const container = document.getElementById('stock-chart');
    if (!container) return;
    container.innerHTML = '';

    if (stockSeries.length < 2) {
        container.innerHTML = '<span style="color:#666">need more data</span>';
        return;
    }

    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const axisColor = isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)';
    const textColor = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)';
    const upColor = '#1eff00';
    const downColor = '#ff6b6b';

    const padding = { top: 10, right: 16, bottom: 24, left: 50 };
    const chartWidth = 740;
    const chartHeight = 140;
    const svgWidth = chartWidth + padding.left + padding.right;
    const svgHeight = chartHeight + padding.top + padding.bottom;

    const scores = stockSeries.map(s => s.score);
    const minScore = Math.min(...scores) * 0.95;
    const maxScore = Math.max(...scores) * 1.05;
    const range = maxScore - minScore || 1;

    const xScale = (i) => padding.left + (i / (stockSeries.length - 1)) * chartWidth;
    const yScale = (v) => padding.top + chartHeight - ((v - minScore) / range) * chartHeight;

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', svgWidth);
    svg.setAttribute('height', svgHeight);

    // horizontal grid lines
    const gridSteps = 4;
    for (let i = 0; i <= gridSteps; i++) {
        const y = padding.top + (i / gridSteps) * chartHeight;
        const val = maxScore - (i / gridSteps) * range;
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', padding.left);
        line.setAttribute('y1', y);
        line.setAttribute('x2', padding.left + chartWidth);
        line.setAttribute('y2', y);
        line.setAttribute('stroke', axisColor);
        line.setAttribute('stroke-width', '1');
        svg.appendChild(line);

        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', padding.left - 6);
        text.setAttribute('y', y + 3);
        text.setAttribute('text-anchor', 'end');
        text.setAttribute('font-size', '9');
        text.setAttribute('fill', textColor);
        text.setAttribute('font-family', 'monospace');
        text.textContent = val.toFixed(0);
        svg.appendChild(text);
    }

    // area fill
    const areaPoints = [];
    areaPoints.push(`${xScale(0)},${padding.top + chartHeight}`);
    for (let i = 0; i < stockSeries.length; i++) {
        areaPoints.push(`${xScale(i)},${yScale(stockSeries[i].score)}`);
    }
    areaPoints.push(`${xScale(stockSeries.length - 1)},${padding.top + chartHeight}`);

    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    const grad = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
    grad.setAttribute('id', 'stock-gradient');
    grad.setAttribute('x1', '0');
    grad.setAttribute('y1', '0');
    grad.setAttribute('x2', '0');
    grad.setAttribute('y2', '1');
    const stop1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    stop1.setAttribute('offset', '0%');
    stop1.setAttribute('stop-color', upColor);
    stop1.setAttribute('stop-opacity', '0.2');
    const stop2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    stop2.setAttribute('offset', '100%');
    stop2.setAttribute('stop-color', upColor);
    stop2.setAttribute('stop-opacity', '0');
    grad.appendChild(stop1);
    grad.appendChild(stop2);
    defs.appendChild(grad);
    svg.appendChild(defs);

    const areaPoly = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    areaPoly.setAttribute('points', areaPoints.join(' '));
    areaPoly.setAttribute('fill', 'url(#stock-gradient)');
    svg.appendChild(areaPoly);

    // line segments colored by direction
    for (let i = 1; i < stockSeries.length; i++) {
        const prev = stockSeries[i - 1];
        const curr = stockSeries[i];
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', xScale(i - 1));
        line.setAttribute('y1', yScale(prev.score));
        line.setAttribute('x2', xScale(i));
        line.setAttribute('y2', yScale(curr.score));
        line.setAttribute('stroke', curr.hit ? upColor : downColor);
        line.setAttribute('stroke-width', '1.5');
        svg.appendChild(line);
    }

    // x-axis date labels
    const labelInterval = Math.max(1, Math.floor(stockSeries.length / 6));
    for (let i = 0; i < stockSeries.length; i += labelInterval) {
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

    // current score dot
    const lastIdx = stockSeries.length - 1;
    const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    dot.setAttribute('cx', xScale(lastIdx));
    dot.setAttribute('cy', yScale(stockSeries[lastIdx].score));
    dot.setAttribute('r', '3');
    dot.setAttribute('fill', stockSeries[lastIdx].hit ? upColor : downColor);
    svg.appendChild(dot);

    container.appendChild(svg);
}
