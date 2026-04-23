const TREND_ARROWS = {
    DoubleUp:        '↑↑',
    SingleUp:        '↑',
    FortyFiveUp:     '↗',
    Flat:            '→',
    FortyFiveDown:   '↘',
    SingleDown:      '↓',
    DoubleDown:      '↓↓',
    NotComputable:   '?',
    RateOutOfRange:  '?',
};

const GLUCOSE_LOW  = 70;
const GLUCOSE_HIGH = 180;

function glucoseColor(mg_dl) {
    if (mg_dl < GLUCOSE_LOW)  return '#ff6b6b';
    if (mg_dl > GLUCOSE_HIGH) return '#ffd43b';
    return '#1eff00';
}

async function loadGlucose() {
    const container = document.getElementById('glucose-container');
    if (!container) return;

    try {
        const [glucoseResp, mealsResp] = await Promise.all([
            fetch(`${API_URL}/data/glucose`,      { headers: { 'X-Key': apiKey } }),
            fetch(`${API_URL}/data/meals?days=2`, { headers: { 'X-Key': apiKey } }),
        ]);
        if (!glucoseResp.ok) {
            container.innerHTML = '<span style="color:#666">failed to load</span>';
            return;
        }
        const data  = await glucoseResp.json();
        const meals = mealsResp.ok ? await mealsResp.json() : [];
        if (data.length === 0) {
            container.innerHTML = '<span style="color:#666">no readings yet</span>';
            return;
        }
        renderGlucose(data, meals);
    } catch (e) {
        console.error("Glucose load error", e);
        container.innerHTML = '<span style="color:#666">error loading</span>';
    }
}

function renderGlucose(data, meals = []) {
    const container = document.getElementById('glucose-container');
    container.innerHTML = '';

    const latest = data[data.length - 1];
    const color  = glucoseColor(latest.mg_dl);
    const arrow  = TREND_ARROWS[latest.trend_direction] || '?';

    const latestTime = new Date(latest.timestamp);
    const minsAgo = Math.round((Date.now() - latestTime.getTime()) / 60000);
    const agoStr  = minsAgo < 60 ? `${minsAgo}m ago` : `${Math.round(minsAgo / 60)}h ago`;

    // current reading header
    const header = document.createElement('div');
    header.className = 'glucose-header';
    header.innerHTML =
        `<span class="glucose-value" style="color:${color}">${latest.mg_dl}</span>` +
        `<span class="glucose-arrow" style="color:${color}">${arrow}</span>` +
        `<span class="glucose-meta">mg/dL &nbsp;·&nbsp; ${agoStr}</span>`;
    container.appendChild(header);

    // chart
    const isDark     = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const axisColor  = isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)';
    const textColor  = isDark ? 'rgba(255,255,255,0.4)'  : 'rgba(0,0,0,0.4)';
    const bandColor  = isDark ? 'rgba(30,255,0,0.06)'    : 'rgba(30,255,0,0.10)';

    const padding     = { top: 10, right: 16, bottom: 28, left: 42 };
    const chartWidth  = 740;
    const chartHeight = 140;
    const svgWidth    = chartWidth + padding.left + padding.right;
    const svgHeight   = chartHeight + padding.top + padding.bottom;

    const Y_MIN = 40;
    const Y_MAX = 400;
    const yRange = Y_MAX - Y_MIN;

    const now      = Date.now();
    const windowMs = 24 * 60 * 60 * 1000;
    const tMin     = now - windowMs;

    const xScale = (ts) => padding.left + ((new Date(ts).getTime() - tMin) / windowMs) * chartWidth;
    const yScale = (v)  => padding.top + chartHeight - ((v - Y_MIN) / yRange) * chartHeight;

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', `0 0 ${svgWidth} ${svgHeight}`);
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', 'auto');
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');

    // target range band 70-180
    const bandTop    = yScale(GLUCOSE_HIGH);
    const bandBottom = yScale(GLUCOSE_LOW);
    const band = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    band.setAttribute('x', padding.left);
    band.setAttribute('y', bandTop);
    band.setAttribute('width', chartWidth);
    band.setAttribute('height', bandBottom - bandTop);
    band.setAttribute('fill', bandColor);
    svg.appendChild(band);

    // horizontal grid lines at 70, 100, 140, 180, 250, 350
    for (const val of [70, 100, 140, 180, 250, 350]) {
        const y = yScale(val);
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', padding.left);
        line.setAttribute('y1', y);
        line.setAttribute('x2', padding.left + chartWidth);
        line.setAttribute('y2', y);
        line.setAttribute('stroke', axisColor);
        line.setAttribute('stroke-width', val === 70 || val === 180 ? '1.5' : '1');
        svg.appendChild(line);

        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', padding.left - 4);
        text.setAttribute('y', y + 3);
        text.setAttribute('text-anchor', 'end');
        text.setAttribute('font-size', '8');
        text.setAttribute('fill', textColor);
        text.setAttribute('font-family', 'monospace');
        text.textContent = val;
        svg.appendChild(text);
    }

    // x-axis time labels every 4h
    for (let h = 0; h <= 24; h += 4) {
        const ts  = tMin + h * 60 * 60 * 1000;
        const x   = padding.left + (h / 24) * chartWidth;
        const d   = new Date(ts);
        const lbl = h === 24 ? 'now' : d.toLocaleTimeString([], { hour: 'numeric', hour12: true });

        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', x);
        text.setAttribute('y', padding.top + chartHeight + 18);
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('font-size', '8');
        text.setAttribute('fill', textColor);
        text.setAttribute('font-family', 'monospace');
        text.textContent = lbl;
        svg.appendChild(text);
    }

    // line segments colored by in-range status
    for (let i = 1; i < data.length; i++) {
        const x1 = xScale(data[i - 1].timestamp);
        const y1 = yScale(data[i - 1].mg_dl);
        const x2 = xScale(data[i].timestamp);
        const y2 = yScale(data[i].mg_dl);
        const segColor = glucoseColor((data[i - 1].mg_dl + data[i].mg_dl) / 2);

        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', x1);
        line.setAttribute('y1', y1);
        line.setAttribute('x2', x2);
        line.setAttribute('y2', y2);
        line.setAttribute('stroke', segColor);
        line.setAttribute('stroke-width', '1.5');
        svg.appendChild(line);
    }

    // meal markers
    const mealColors = { breakfast: '#ffd43b', lunch: '#69db7c', dinner: '#4a9eff', snack: '#b197fc', low_snack: '#ff6b6b' };
    for (const meal of meals) {
        const mx = xScale(meal.timestamp);
        if (mx < padding.left || mx > padding.left + chartWidth) continue;
        const mc = mealColors[meal.meal_type] || 'rgba(255,255,255,0.4)';

        const mline = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        mline.setAttribute('x1', mx); mline.setAttribute('y1', padding.top);
        mline.setAttribute('x2', mx); mline.setAttribute('y2', padding.top + chartHeight);
        mline.setAttribute('stroke', mc); mline.setAttribute('stroke-width', '1');
        mline.setAttribute('stroke-dasharray', '3,3'); mline.setAttribute('opacity', '0.65');
        svg.appendChild(mline);

        const mlabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        mlabel.setAttribute('x', mx + 2); mlabel.setAttribute('y', padding.top + 9);
        mlabel.setAttribute('font-size', '7'); mlabel.setAttribute('fill', mc);
        mlabel.setAttribute('font-family', 'monospace');
        mlabel.textContent = meal.name ? meal.name.slice(0, 14) : (meal.meal_type || 'meal');
        svg.appendChild(mlabel);
    }

    // latest dot
    const lx = xScale(latest.timestamp);
    const ly = yScale(latest.mg_dl);
    const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    dot.setAttribute('cx', lx);
    dot.setAttribute('cy', ly);
    dot.setAttribute('r', '3');
    dot.setAttribute('fill', color);
    svg.appendChild(dot);

    container.appendChild(svg);
}
