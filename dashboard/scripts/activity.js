const ACTIVITY_COLORS = {
    produce: '#69db7c',
    youtube: '#ff6b6b',
    browser: '#4a9eff',
    other:   '#888',
};

async function loadActivity() {
    const container = document.getElementById('activity-container');
    if (!container) return;
    try {
        const resp = await fetch(`${API_URL}/data/activity?days=14`, {
            headers: { 'X-Key': apiKey }
        });
        if (!resp.ok) { container.innerHTML = '<span style="color:#666">failed to load</span>'; return; }
        const data = await resp.json();
        if (!data.length) { container.innerHTML = '<span style="color:#666">no data yet</span>'; return; }
        renderActivity(data);
    } catch (e) {
        console.error('Activity load error', e);
        container.innerHTML = '<span style="color:#666">error loading</span>';
    }
}

function fmtMins(m) {
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    const rem = m % 60;
    return rem ? `${h}h ${rem}m` : `${h}h`;
}

function renderActivity(data) {
    const container = document.getElementById('activity-container');
    container.innerHTML = '';

    const isDark     = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const textColor  = isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.55)';
    const dimColor   = isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)';
    const labelColor = isDark ? 'rgba(255,255,255,0.75)' : 'rgba(0,0,0,0.75)';

    // --- today summary strip ---
    const today = data[0];
    const totalToday = today.produce_mins + today.youtube_mins + today.browser_mins + today.other_mins;
    const producePct = totalToday ? Math.round(today.produce_mins / totalToday * 100) : 0;

    const summary = document.createElement('div');
    summary.className = 'activity-summary';
    summary.innerHTML =
        `<span style="color:${ACTIVITY_COLORS.produce}">▮ ${fmtMins(today.produce_mins)} producing</span>` +
        `<span class="activity-summary-sep">·</span>` +
        `<span style="color:${ACTIVITY_COLORS.youtube}">▮ ${fmtMins(today.youtube_mins)} youtube</span>` +
        `<span class="activity-summary-sep">·</span>` +
        `<span style="color:${dimColor}">${producePct}% produce today</span>`;
    container.appendChild(summary);

    // --- chart ---
    const ROW_H    = 18;
    const ROW_GAP  = 6;
    const LEFT_PAD = 56;
    const RIGHT_PAD = 60;
    const BAR_H    = 10;
    const CHART_W  = 640;
    const SVG_W    = LEFT_PAD + CHART_W + RIGHT_PAD;
    const SVG_H    = data.length * (ROW_H + ROW_GAP);

    const maxMins = Math.max(...data.map(d =>
        d.produce_mins + d.youtube_mins + d.browser_mins + d.other_mins
    ));

    const xScale = (m) => (m / maxMins) * CHART_W;

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', `0 0 ${SVG_W} ${SVG_H}`);
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', 'auto');

    data.forEach((day, i) => {
        const y = i * (ROW_H + ROW_GAP);
        const barY = y + (ROW_H - BAR_H) / 2;

        // date label
        const lbl = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        lbl.setAttribute('x', LEFT_PAD - 6);
        lbl.setAttribute('y', y + ROW_H / 2 + 3);
        lbl.setAttribute('text-anchor', 'end');
        lbl.setAttribute('font-size', '9');
        lbl.setAttribute('font-family', 'monospace');
        lbl.setAttribute('fill', i === 0 ? labelColor : textColor);
        lbl.textContent = day.date.slice(5); // MM-DD
        svg.appendChild(lbl);

        // stacked bars: produce → browser → youtube → other
        const segments = [
            { key: 'produce_mins', color: ACTIVITY_COLORS.produce },
            { key: 'browser_mins', color: ACTIVITY_COLORS.browser },
            { key: 'youtube_mins', color: ACTIVITY_COLORS.youtube },
            { key: 'other_mins',   color: ACTIVITY_COLORS.other   },
        ];

        let xOffset = LEFT_PAD;
        for (const seg of segments) {
            const w = xScale(day[seg.key]);
            if (w < 0.5) continue;
            const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            rect.setAttribute('x', xOffset);
            rect.setAttribute('y', barY);
            rect.setAttribute('width', w);
            rect.setAttribute('height', BAR_H);
            rect.setAttribute('fill', seg.color);
            rect.setAttribute('opacity', i === 0 ? '1' : '0.7');
            const label = seg.key.replace('_mins', '');
            rect.setAttribute('title', `${label}: ${fmtMins(day[seg.key])}`);
            svg.appendChild(rect);
            xOffset += w;
        }

        // youtube minutes label on right
        if (day.youtube_mins > 0) {
            const ytLbl = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            ytLbl.setAttribute('x', LEFT_PAD + CHART_W + 6);
            ytLbl.setAttribute('y', y + ROW_H / 2 + 3);
            ytLbl.setAttribute('font-size', '9');
            ytLbl.setAttribute('font-family', 'monospace');
            ytLbl.setAttribute('fill', ACTIVITY_COLORS.youtube);
            ytLbl.textContent = fmtMins(day.youtube_mins);
            svg.appendChild(ytLbl);
        }
    });

    container.appendChild(svg);

    // --- legend ---
    const legend = document.createElement('div');
    legend.className = 'activity-legend';
    const entries = [
        { color: ACTIVITY_COLORS.produce, label: 'produce' },
        { color: ACTIVITY_COLORS.browser, label: 'browser' },
        { color: ACTIVITY_COLORS.youtube, label: 'youtube' },
        { color: ACTIVITY_COLORS.other,   label: 'other'   },
    ];
    legend.innerHTML = entries.map(e =>
        `<span class="activity-legend-item">` +
        `<span class="activity-legend-swatch" style="background:${e.color}"></span>${e.label}</span>`
    ).join('');
    container.appendChild(legend);
}
