const COLORS = {
    home: '#4a9eff',
    school: '#ffd43b',
    work: '#b197fc',
    muay_thai: '#ff6b6b',
    run: '#69db7c',
    lift: '#ffa94d',
    other: '#333'
};

const FUTURE_STRIPE = 'future-stripe';

let timelineStatusData = null;
let timelineSheetData = null;

async function loadTimeline() {
    try {
        const [statusResp, sheetResp] = await Promise.all([
            fetch(`${API_URL}/status`, { headers: { 'X-Key': apiKey } }),
            fetch(`${API_URL}/data/sheet`, { headers: { 'X-Key': apiKey } })
        ]);
        if (statusResp.ok) timelineStatusData = await statusResp.json();
        if (sheetResp.ok) timelineSheetData = await sheetResp.json();

        renderAllTimelines();
    } catch (e) {
        console.error("Timeline load error", e);
    }
}

function renderAllTimelines() {
    renderTodayTimeline();
    renderPeriodTimeline('timeline-7d', 7);
    renderPeriodTimeline('timeline-month', 30);
    renderPeriodTimeline('timeline-year', 365);
    renderTimelineLegend();
}

function buildTodayBreakdown() {
    const events = (timelineStatusData && timelineStatusData.today_events) || [];
    const breakdown = { home: 0, school: 0, work: 0, muay_thai: 0, run: 0, lift: 0 };

    const toggleLocations = ['home', 'school', 'work'];
    const activeStarts = {};

    const sorted = [...events].sort((a, b) => a.start_time.localeCompare(b.start_time));

    for (const ev of sorted) {
        const name = ev.event_name;
        const start = new Date(ev.start_time);

        if (name.endsWith('_start')) {
            const loc = name.replace('_start', '');
            activeStarts[loc] = start;
        } else if (name.endsWith('_end')) {
            const loc = name.replace('_end', '');
            if (activeStarts[loc]) {
                const hours = (start - activeStarts[loc]) / 3600000;
                breakdown[loc] += Math.max(0, hours);
                delete activeStarts[loc];
            }
        } else if (name === 'muay_thai') {
            breakdown.muay_thai += 1;
        } else if (name === 'run') {
            breakdown.run += 1;
        } else if (name === 'lift') {
            breakdown.lift += 1;
        }
    }

    // close open toggles at now
    const now = new Date();
    for (const loc of toggleLocations) {
        if (activeStarts[loc]) {
            const hours = (now - activeStarts[loc]) / 3600000;
            breakdown[loc] += Math.max(0, hours);
        }
    }

    return breakdown;
}

function renderTodayTimeline() {
    const container = document.getElementById('timeline-today');
    if (!container) return;
    container.innerHTML = '';

    const nowDenver = new Date();
    const currentHourDecimal = nowDenver.getHours() + nowDenver.getMinutes() / 60;

    const breakdown = buildTodayBreakdown();
    const segments = ['home', 'school', 'work', 'muay_thai', 'run', 'lift'];

    const barHeight = 32;
    const totalWidth = 720;
    const hourWidth = totalWidth / 24;
    const labelWidth = 40;
    const svgWidth = labelWidth + totalWidth;

    const svg = createSvg(svgWidth, barHeight + 20);

    // hour labels
    for (let h = 0; h <= 24; h += 3) {
        const text = createSvgText(labelWidth + h * hourWidth, barHeight + 14, `${h}`, '9');
        svg.appendChild(text);
    }

    // build hour-by-hour allocation from breakdown
    const hourAllocation = allocateHours(breakdown);

    // draw segments
    let x = labelWidth;
    for (let h = 0; h < 24; h++) {
        const loc = hourAllocation[h] || 'other';
        const rect = createRect(x, 0, hourWidth, barHeight, COLORS[loc] || COLORS.other, 0);
        svg.appendChild(rect);

        if (h >= Math.floor(currentHourDecimal)) {
            // future - overlay with diagonal stripes
            const clipId = `stripe-today-${h}`;
            addStripePattern(svg, clipId);
            const stripe = createRect(x, 0, hourWidth, barHeight, `url(#${clipId})`, 0);
            stripe.setAttribute('fill-opacity', '0.5');
            svg.appendChild(stripe);
        }

        x += hourWidth;
    }

    // now marker
    const nowX = labelWidth + currentHourDecimal * hourWidth;
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', nowX);
    line.setAttribute('y1', -2);
    line.setAttribute('x2', nowX);
    line.setAttribute('y2', barHeight + 2);
    line.setAttribute('stroke', '#ff6b6b');
    line.setAttribute('stroke-width', '2');
    svg.appendChild(line);

    // title
    const title = createSvgText(0, -4, 'today', '10');
    title.setAttribute('font-weight', 'bold');
    svg.appendChild(title);

    container.appendChild(svg);
}

function allocateHours(breakdown) {
    const order = ['school', 'work', 'muay_thai', 'run', 'lift', 'home'];
    const allocation = new Array(24).fill('other');

    const remaining = {};
    for (const loc of order) {
        remaining[loc] = breakdown[loc] || 0;
    }

    for (let h = 0; h < 24; h++) {
        for (const loc of order) {
            if (remaining[loc] >= 1) {
                allocation[h] = loc;
                remaining[loc] -= 1;
                break;
            }
        }
    }

    // fill leftover partial hours
    for (const loc of order) {
        if (remaining[loc] > 0) {
            for (let h = 0; h < 24; h++) {
                if (allocation[h] === 'other') {
                    allocation[h] = loc;
                    remaining[loc] -= 1;
                    if (remaining[loc] <= 0) break;
                }
            }
        }
    }

    return allocation;
}

function renderPeriodTimeline(containerId, days) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';

    if (!timelineSheetData || timelineSheetData.length === 0) {
        container.innerHTML = '<span style="color:#666">no data</span>';
        return;
    }

    const nowDenver = new Date();
    const todayStr = `${nowDenver.getFullYear()}-${String(nowDenver.getMonth() + 1).padStart(2, '0')}-${String(nowDenver.getDate()).padStart(2, '0')}`;

    // collect days in range
    const cutoff = new Date(nowDenver);
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffStr = `${cutoff.getFullYear()}-${String(cutoff.getMonth() + 1).padStart(2, '0')}-${String(cutoff.getDate()).padStart(2, '0')}`;

    const daysInRange = timelineSheetData.filter(d => d.date >= cutoffStr && d.date < todayStr);

    if (daysInRange.length === 0) {
        container.innerHTML = '<span style="color:#666">no data for this period</span>';
        return;
    }

    // compute averages and consistency
    const segments = ['home', 'school', 'work', 'muay_thai', 'run', 'lift'];
    const avg = {};
    const consistency = {};
    const count = daysInRange.length;

    for (const seg of segments) {
        if (['muay_thai', 'run', 'lift'].includes(seg)) {
            const daysWith = daysInRange.filter(d => d[seg]).length;
            avg[seg] = daysWith > 0 ? (daysWith / count) : 0; // fraction of days, max 1h equiv
            consistency[seg] = daysWith / count;
        } else {
            const total = daysInRange.reduce((s, d) => s + (d[`${seg}_hours`] || 0), 0);
            avg[seg] = total / count;
            const daysWith = daysInRange.filter(d => (d[`${seg}_hours`] || 0) > 0).length;
            consistency[seg] = daysWith / count;
        }
    }

    const totalAvg = Object.values(avg).reduce((s, v) => s + v, 0);
    avg.other = Math.max(0, 24 - totalAvg);
    consistency.other = 1;

    // sort by priority for visual stacking
    const order = ['school', 'work', 'muay_thai', 'run', 'lift', 'home', 'other'];

    const barHeight = 24;
    const totalWidth = 720;
    const hourWidth = totalWidth / 24;
    const labelWidth = 40;
    const svgWidth = labelWidth + totalWidth;

    const svg = createSvg(svgWidth, barHeight + 18);

    // hour labels
    for (let h = 0; h <= 24; h += 6) {
        const text = createSvgText(labelWidth + h * hourWidth, barHeight + 14, `${h}h`, '9');
        svg.appendChild(text);
    }

    // stacked bar
    let x = labelWidth;
    for (const seg of order) {
        const hours = avg[seg] || 0;
        if (hours <= 0) continue;
        const w = hours * hourWidth;
        const opacity = seg === 'other' ? 0.15 : consistency[seg];
        const rect = createRect(x, 0, w, barHeight, COLORS[seg] || COLORS.other, 0);
        rect.setAttribute('opacity', Math.max(0.15, opacity));
        svg.appendChild(rect);
        x += w;
    }

    // title
    const label = days === 7 ? 'last 7 days' : days === 30 ? 'last 30 days' : 'last year';
    const title = createSvgText(0, -4, label, '10');
    title.setAttribute('font-weight', 'bold');
    svg.appendChild(title);

    container.appendChild(svg);
}

function renderTimelineLegend() {
    const container = document.getElementById('timeline-legend');
    if (!container) return;
    container.innerHTML = '';

    const items = [
        { label: 'home', color: COLORS.home },
        { label: 'school', color: COLORS.school },
        { label: 'work', color: COLORS.work },
        { label: 'muay thai', color: COLORS.muay_thai },
        { label: 'run', color: COLORS.run },
        { label: 'lift', color: COLORS.lift }
    ];

    const svg = createSvg(600, 16);
    let x = 0;
    for (const item of items) {
        const rect = createRect(x, 2, 10, 10, item.color, 2);
        svg.appendChild(rect);
        const text = createSvgText(x + 14, 12, item.label, '9');
        text.setAttribute('fill', 'rgba(128,128,128,0.8)');
        svg.appendChild(text);
        x += item.label.length * 6 + 28;
    }

    container.appendChild(svg);
}

// SVG helpers

function createSvg(width, height) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', width);
    svg.setAttribute('height', height);
    return svg;
}

function createRect(x, y, w, h, fill, rx) {
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', x);
    rect.setAttribute('y', y);
    rect.setAttribute('width', w);
    rect.setAttribute('height', h);
    rect.setAttribute('fill', fill);
    rect.setAttribute('rx', rx);
    return rect;
}

function createSvgText(x, y, content, fontSize) {
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', x);
    text.setAttribute('y', y);
    text.setAttribute('font-size', fontSize);
    text.setAttribute('fill', '#666');
    text.setAttribute('font-family', 'monospace');
    text.textContent = content;
    return text;
}

function addStripePattern(svg, id) {
    const defs = svg.querySelector('defs') || document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    if (!svg.querySelector('defs')) svg.appendChild(defs);

    const pattern = document.createElementNS('http://www.w3.org/2000/svg', 'pattern');
    pattern.setAttribute('id', id);
    pattern.setAttribute('patternUnits', 'userSpaceOnUse');
    pattern.setAttribute('width', '6');
    pattern.setAttribute('height', '6');
    pattern.setAttribute('patternTransform', 'rotate(45)');

    const line = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    line.setAttribute('width', '2');
    line.setAttribute('height', '6');
    line.setAttribute('fill', 'rgba(128,128,128,0.4)');

    pattern.appendChild(line);
    defs.appendChild(pattern);
}
