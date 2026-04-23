let radarSheetData = null;
let radarScoreData = null;
let radarSleepData = null;
let radarMode = 'week';
let radarSliderIndex = -1;
let radarSortedDates = [];

const RADAR_CATEGORIES = ['physical', 'professional', 'health', 'discipline', 'production'];
const RADAR_LABELS = {
    physical: 'physical',
    professional: 'professional',
    health: 'health',
    discipline: 'discipline',
    production: 'production'
};

async function loadRadar() {
    try {
        const [sheetResp, scoreResp, sleepResp] = await Promise.all([
            fetch(`${API_URL}/data/sheet`,       { headers: { 'X-Key': apiKey } }),
            fetch(`${API_URL}/data/score`,        { headers: { 'X-Key': apiKey } }),
            fetch(`${API_URL}/data/sleep?days=365`, { headers: { 'X-Key': apiKey } }),
        ]);
        if (!sheetResp.ok) return;
        radarSheetData = await sheetResp.json();
        radarScoreData = scoreResp.ok ? await scoreResp.json() : [];
        radarSleepData = sleepResp.ok ? await sleepResp.json() : [];
        radarSortedDates = radarSheetData.map(d => d.date).sort();
        setupRadarControls();
        renderRadar();
    } catch (e) {
        console.error("Radar load error", e);
    }
}

function setupRadarControls() {
    const btns = document.querySelectorAll('.radar-mode-btn');
    btns.forEach(btn => {
        btn.addEventListener('click', () => {
            btns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            radarMode = btn.dataset.mode;
            const sliderWrap = document.getElementById('radar-slider-wrap');
            sliderWrap.style.display = radarMode === 'daily' ? 'flex' : 'none';
            if (radarMode === 'daily') initRadarSlider();
            renderRadar();
        });
    });

    const slider = document.getElementById('radar-slider');
    slider.addEventListener('input', () => {
        radarSliderIndex = parseInt(slider.value);
        updateRadarSliderLabel();
        renderRadar();
    });
}

function initRadarSlider() {
    const slider = document.getElementById('radar-slider');
    const dates = radarSortedDates;
    if (dates.length === 0) return;
    slider.min = 0;
    slider.max = dates.length - 1;
    if (radarSliderIndex < 0) radarSliderIndex = dates.length - 1;
    slider.value = radarSliderIndex;
    updateRadarSliderLabel();
}

function updateRadarSliderLabel() {
    const label = document.getElementById('radar-slider-label');
    const dates = radarSortedDates;
    if (radarSliderIndex >= 0 && radarSliderIndex < dates.length) {
        label.textContent = dates[radarSliderIndex];
    } else {
        label.textContent = '';
    }
}

function getDateRange() {
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    if (radarMode === 'daily') {
        const dates = radarSortedDates;
        if (radarSliderIndex >= 0 && radarSliderIndex < dates.length) {
            return { start: dates[radarSliderIndex], end: dates[radarSliderIndex], single: true };
        }
        return { start: todayStr, end: todayStr, single: true };
    }

    let days;
    if (radarMode === 'week') days = 7;
    else if (radarMode === 'month') days = 30;
    else if (radarMode === 'year') days = 365;
    else days = 99999;

    const cutoff = new Date(now);
    cutoff.setDate(cutoff.getDate() - days);
    const startStr = `${cutoff.getFullYear()}-${String(cutoff.getMonth() + 1).padStart(2, '0')}-${String(cutoff.getDate()).padStart(2, '0')}`;
    return { start: startStr, end: todayStr, single: false };
}

function computeRadarScores(range) {
    if (!radarSheetData) return { physical: 0, professional: 0, health: 0, discipline: 0, production: 0 };

    const days = radarSheetData.filter(d => d.date >= range.start && d.date <= range.end);
    const count = days.length;
    if (count === 0) return { physical: 0, professional: 0, health: 0, discipline: 0, production: 0 };

    // physical: workout days / total days * 100
    const workoutDays = days.filter(d => d.lift || d.muay_thai || d.run).length;
    const physical = Math.min(100, Math.round((workoutDays / count) * 100));

    // professional: avg (school + work) hours, target 8h/day
    const avgProf = days.reduce((s, d) => s + (d.school_hours || 0) + (d.work_hours || 0), 0) / count;
    const professional = Math.min(100, Math.round((avgProf / 8) * 100));

    // health: average of TIR% (from score data) and sleep efficiency (from sleep data)
    const healthValues = [];
    if (radarScoreData) {
        for (const d of radarScoreData) {
            if (d.date >= range.start && d.date <= range.end && d.details.tir_pct != null) {
                healthValues.push(d.details.tir_pct);
            }
        }
    }
    if (radarSleepData) {
        for (const d of radarSleepData) {
            if (d.date >= range.start && d.date <= range.end && d.efficiency != null) {
                healthValues.push(d.efficiency);
            }
        }
    }
    const health = healthValues.length > 0
        ? Math.min(100, Math.round(healthValues.reduce((a, b) => a + b, 0) / healthValues.length))
        : 0;

    // discipline: routines done / possible routines * 100
    const morningCount = days.filter(d => d.morning_routine).length;
    const eveningCount = days.filter(d => d.evening_routine).length;
    const discipline = Math.min(100, Math.round(((morningCount + eveningCount) / (count * 2)) * 100));

    // production: produce_mins / (produce + youtube + browser) for days with AW data
    const awDays = days.filter(d => d.has_aw_data);
    const totalProduceMins = awDays.reduce((s, d) => s + (d.produce_mins || 0), 0);
    const totalScreenMins  = awDays.reduce((s, d) => s + (d.produce_mins || 0) + (d.youtube_mins || 0) + (d.browser_mins || 0), 0);
    const production = (totalScreenMins > 0 && awDays.length > 0)
        ? Math.min(100, Math.round((totalProduceMins / totalScreenMins) * 100))
        : 0;

    return { physical, professional, health, discipline, production };
}

function renderRadar() {
    const container = document.getElementById('radar-chart');
    if (!container) return;
    container.innerHTML = '';

    const range = getDateRange();
    const scores = computeRadarScores(range);

    const size = 440;
    const cx = size / 2;
    const cy = size / 2;
    const maxR = 110;
    const levels = [0.2, 0.4, 0.6, 0.8, 1.0];

    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const ringColor = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)';
    const labelColor = isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)';
    const greenFill = 'rgba(30, 255, 0, 0.25)';
    const greenStroke = 'rgba(30, 255, 0, 0.8)';

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', size);
    svg.setAttribute('height', size);

    const angles = RADAR_CATEGORIES.map((_, i) => (-90 + i * 72) * Math.PI / 180);

    // concentric pentagon rings
    for (const level of levels) {
        const r = maxR * level;
        const points = angles.map(a => `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`).join(' ');
        const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        polygon.setAttribute('points', points);
        polygon.setAttribute('fill', 'none');
        polygon.setAttribute('stroke', ringColor);
        polygon.setAttribute('stroke-width', '1');
        svg.appendChild(polygon);

        // level label
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', cx + 4);
        text.setAttribute('y', cy - r + 3);
        text.setAttribute('font-size', '8');
        text.setAttribute('fill', ringColor);
        text.setAttribute('font-family', 'monospace');
        text.textContent = `${Math.round(level * 100)}`;
        svg.appendChild(text);
    }

    // axis lines from center to vertices
    for (const angle of angles) {
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', cx);
        line.setAttribute('y1', cy);
        line.setAttribute('x2', cx + maxR * Math.cos(angle));
        line.setAttribute('y2', cy + maxR * Math.sin(angle));
        line.setAttribute('stroke', ringColor);
        line.setAttribute('stroke-width', '1');
        svg.appendChild(line);
    }

    // data polygon
    const dataPoints = RADAR_CATEGORIES.map((cat, i) => {
        const r = maxR * (scores[cat] / 100);
        return `${cx + r * Math.cos(angles[i])},${cy + r * Math.sin(angles[i])}`;
    }).join(' ');

    const dataPoly = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    dataPoly.setAttribute('points', dataPoints);
    dataPoly.setAttribute('fill', greenFill);
    dataPoly.setAttribute('stroke', greenStroke);
    dataPoly.setAttribute('stroke-width', '2');
    svg.appendChild(dataPoly);

    // data vertices (dots)
    RADAR_CATEGORIES.forEach((cat, i) => {
        const r = maxR * (scores[cat] / 100);
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', cx + r * Math.cos(angles[i]));
        circle.setAttribute('cy', cy + r * Math.sin(angles[i]));
        circle.setAttribute('r', '3');
        circle.setAttribute('fill', greenStroke);
        svg.appendChild(circle);
    });

    // category labels
    const labelR = maxR + 20;
    RADAR_CATEGORIES.forEach((cat, i) => {
        const angle = angles[i];
        const lx = cx + labelR * Math.cos(angle);
        const ly = cy + labelR * Math.sin(angle);

        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', lx);
        text.setAttribute('y', ly);
        text.setAttribute('font-size', '10');
        text.setAttribute('fill', labelColor);
        text.setAttribute('font-family', 'monospace');
        text.setAttribute('text-anchor', Math.abs(Math.cos(angle)) < 0.1 ? 'middle' : Math.cos(angle) > 0 ? 'start' : 'end');
        text.setAttribute('dominant-baseline', 'central');
        text.textContent = RADAR_LABELS[cat];
        svg.appendChild(text);
    });

    container.appendChild(svg);
}
