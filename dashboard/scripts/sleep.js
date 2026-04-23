async function loadSleep() {
    const container = document.getElementById('sleep-container');
    if (!container) return;
    container.innerHTML = 'loading...';
    try {
        const resp = await fetch(`${API_URL}/data/sleep?days=30`, { headers: { 'X-Key': apiKey } });
        if (!resp.ok) { container.innerHTML = '<span style="color:#666">failed to load</span>'; return; }
        const data = await resp.json();
        if (data.length === 0) { container.innerHTML = '<span style="color:#666">no sleep data yet</span>'; return; }
        renderSleep(container, data);
    } catch (e) {
        console.error("Sleep load error", e);
        container.innerHTML = '<span style="color:#666">error</span>';
    }
}

function renderSleep(container, data) {
    container.innerHTML = '';

    const sorted = [...data].sort((a, b) => a.date.localeCompare(b.date));

    const recent = sorted.slice(-7);
    const avgMins = recent.reduce((s, d) => s + (d.minutes_asleep || 0), 0) / recent.length;
    const effDays = recent.filter(d => d.efficiency);
    const avgEff = effDays.length > 0
        ? effDays.reduce((s, d) => s + d.efficiency, 0) / effDays.length
        : 0;

    const summary = document.createElement('div');
    summary.className = 'sleep-summary';
    summary.innerHTML = `
        <span class="sleep-stat"><span class="sleep-stat-label">7d avg</span> <span class="sleep-stat-val">${(avgMins / 60).toFixed(1)}h</span></span>
        <span class="sleep-stat"><span class="sleep-stat-label">efficiency</span> <span class="sleep-stat-val">${Math.round(avgEff)}%</span></span>
    `;
    container.appendChild(summary);

    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const axisColor = isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)';
    const textColor = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)';

    const padding = { top: 10, right: 16, bottom: 28, left: 36 };
    const chartW = 740;
    const chartH = 110;
    const svgW = chartW + padding.left + padding.right;
    const svgH = chartH + padding.top + padding.bottom;

    const maxMins = Math.max(...sorted.map(d => d.minutes_asleep || 0), 480);
    const yMax = Math.ceil(maxMins / 60) * 60;

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', `0 0 ${svgW} ${svgH}`);
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', 'auto');
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');

    const yScale = (mins) => padding.top + chartH - (mins / yMax) * chartH;

    for (const h of [6, 7, 8, 9]) {
        const mins = h * 60;
        if (mins > yMax) continue;
        const y = yScale(mins);
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', padding.left); line.setAttribute('y1', y);
        line.setAttribute('x2', padding.left + chartW); line.setAttribute('y2', y);
        line.setAttribute('stroke', axisColor);
        line.setAttribute('stroke-width', h === 8 ? '1.5' : '1');
        svg.appendChild(line);

        const lbl = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        lbl.setAttribute('x', padding.left - 4); lbl.setAttribute('y', y + 3);
        lbl.setAttribute('text-anchor', 'end'); lbl.setAttribute('font-size', '8');
        lbl.setAttribute('fill', textColor); lbl.setAttribute('font-family', 'monospace');
        lbl.textContent = `${h}h`;
        svg.appendChild(lbl);
    }

    const barSlot = chartW / sorted.length;

    sorted.forEach((d, i) => {
        const mins = d.minutes_asleep || 0;
        if (!mins) return;
        const eff = d.efficiency || 0;
        const color = eff >= 85 ? '#1eff00' : eff >= 70 ? '#ffd43b' : '#ff6b6b';

        const x = padding.left + i * barSlot;
        const y = yScale(mins);
        const barH = chartH - (y - padding.top);

        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('x', x + 1);
        rect.setAttribute('y', y);
        rect.setAttribute('width', Math.max(2, barSlot - 2));
        rect.setAttribute('height', Math.max(1, barH));
        rect.setAttribute('fill', color);
        rect.setAttribute('opacity', '0.75');
        svg.appendChild(rect);
    });

    const interval = Math.max(1, Math.floor(sorted.length / 6));
    for (let i = 0; i < sorted.length; i += interval) {
        const x = padding.left + i * barSlot + barSlot / 2;
        const parts = sorted[i].date.split('-');
        const lbl = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        lbl.setAttribute('x', x); lbl.setAttribute('y', padding.top + chartH + 18);
        lbl.setAttribute('text-anchor', 'middle'); lbl.setAttribute('font-size', '8');
        lbl.setAttribute('fill', textColor); lbl.setAttribute('font-family', 'monospace');
        lbl.textContent = `${parts[1]}/${parts[2]}`;
        svg.appendChild(lbl);
    }

    container.appendChild(svg);

    const legend = document.createElement('div');
    legend.className = 'sleep-legend';
    legend.innerHTML = `
        <span class="sleep-legend-item"><span class="sleep-legend-swatch" style="background:#1eff00"></span>eff ≥85%</span>
        <span class="sleep-legend-item"><span class="sleep-legend-swatch" style="background:#ffd43b"></span>eff 70–85%</span>
        <span class="sleep-legend-item"><span class="sleep-legend-swatch" style="background:#ff6b6b"></span>eff &lt;70%</span>
    `;
    container.appendChild(legend);

    const latest = sorted[sorted.length - 1];
    if (latest.stages && typeof latest.stages === 'object') {
        const stages = latest.stages;
        const total = (stages.deep || 0) + (stages.light || 0) + (stages.rem || 0) + (stages.wake || 0);
        if (total > 0) {
            const stageColors = { deep: '#4a9eff', rem: '#b197fc', light: '#74c0fc', wake: '#ff6b6b' };
            const stageLabels = { deep: 'deep', rem: 'REM', light: 'light', wake: 'awake' };
            const stagesDiv = document.createElement('div');
            stagesDiv.className = 'sleep-stages';
            stagesDiv.innerHTML =
                `<div class="sleep-stages-label">${latest.date} · ${(latest.minutes_asleep / 60).toFixed(1)}h · eff ${latest.efficiency}%</div>` +
                `<div class="sleep-stages-bar">` +
                ['deep', 'rem', 'light', 'wake'].map(s => {
                    const mins = stages[s] || 0;
                    const pct = mins / total * 100;
                    return pct > 0
                        ? `<div class="sleep-stage-seg" style="width:${pct.toFixed(1)}%;background:${stageColors[s]}"></div>`
                        : '';
                }).join('') +
                `</div>` +
                `<div class="sleep-stages-legend">` +
                ['deep', 'rem', 'light', 'wake'].filter(s => stages[s]).map(s =>
                    `<span><span class="sleep-stage-dot" style="background:${stageColors[s]}"></span>${stageLabels[s]} ${stages[s]}m</span>`
                ).join('') +
                `</div>`;
            container.appendChild(stagesDiv);
        }
    }
}
