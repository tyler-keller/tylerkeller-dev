async function loadNutrition() {
    const container = document.getElementById('nutrition-container');
    if (!container) return;
    container.innerHTML = 'loading...';
    try {
        const resp = await fetch(`${API_URL}/data/nutrition?days=30`, { headers: { 'X-Key': apiKey } });
        if (!resp.ok) { container.innerHTML = '<span style="color:#666">failed to load</span>'; return; }
        const data = await resp.json();
        if (data.length === 0) { container.innerHTML = '<span style="color:#666">no meal data yet</span>'; return; }
        renderNutrition(container, data);
    } catch (e) {
        console.error("Nutrition load error", e);
        container.innerHTML = '<span style="color:#666">error</span>';
    }
}

function renderNutrition(container, data) {
    container.innerHTML = '';

    const sorted = [...data].sort((a, b) => a.date.localeCompare(b.date));

    const recent = sorted.slice(-7);
    const avgCals    = Math.round(recent.reduce((s, d) => s + (d.total_calories  || 0), 0) / recent.length);
    const avgProtein = Math.round(recent.reduce((s, d) => s + (d.total_protein_g || 0), 0) / recent.length);
    const avgCarbs   = Math.round(recent.reduce((s, d) => s + (d.total_carbs_g   || 0), 0) / recent.length);
    const avgFat     = Math.round(recent.reduce((s, d) => s + (d.total_fat_g     || 0), 0) / recent.length);

    const summary = document.createElement('div');
    summary.className = 'nutrition-summary';
    summary.innerHTML = `
        <span class="nutrition-stat"><span class="nutrition-stat-label">7d avg kcal</span> <span class="nutrition-stat-val">${avgCals}</span></span>
        <span class="nutrition-stat"><span class="nutrition-stat-label">protein</span> <span class="nutrition-stat-val">${avgProtein}g</span></span>
        <span class="nutrition-stat"><span class="nutrition-stat-label">carbs</span> <span class="nutrition-stat-val">${avgCarbs}g</span></span>
        <span class="nutrition-stat"><span class="nutrition-stat-label">fat</span> <span class="nutrition-stat-val">${avgFat}g</span></span>
    `;
    container.appendChild(summary);

    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const axisColor = isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)';
    const textColor = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)';

    const PROTEIN_COLOR = '#4a9eff';
    const CARBS_COLOR   = '#ffd43b';
    const FAT_COLOR     = '#ff9f43';

    const padding = { top: 10, right: 16, bottom: 28, left: 44 };
    const chartW  = 740;
    const chartH  = 130;
    const svgW    = chartW + padding.left + padding.right;
    const svgH    = chartH + padding.top + padding.bottom;

    const maxCals = Math.max(...sorted.map(d => d.total_calories || 0), 500);
    const yMax    = Math.ceil(maxCals / 500) * 500;

    const yScale  = (cal) => padding.top + chartH - (cal / yMax) * chartH;
    const barSlot = chartW / sorted.length;

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', `0 0 ${svgW} ${svgH}`);
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', 'auto');
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');

    for (let cal = 500; cal <= yMax; cal += 500) {
        const y = yScale(cal);
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', padding.left); line.setAttribute('y1', y);
        line.setAttribute('x2', padding.left + chartW); line.setAttribute('y2', y);
        line.setAttribute('stroke', axisColor); line.setAttribute('stroke-width', '1');
        svg.appendChild(line);

        const lbl = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        lbl.setAttribute('x', padding.left - 4); lbl.setAttribute('y', y + 3);
        lbl.setAttribute('text-anchor', 'end'); lbl.setAttribute('font-size', '8');
        lbl.setAttribute('fill', textColor); lbl.setAttribute('font-family', 'monospace');
        lbl.textContent = cal >= 1000 ? `${cal / 1000}k` : cal;
        svg.appendChild(lbl);
    }

    sorted.forEach((d, i) => {
        const totalCals  = d.total_calories  || 0;
        if (!totalCals) return;

        const x  = padding.left + i * barSlot;
        const bw = Math.max(2, barSlot - 2);

        const proteinCals = (d.total_protein_g || 0) * 4;
        const carbsCals   = (d.total_carbs_g   || 0) * 4;
        const fatCals     = (d.total_fat_g     || 0) * 9;
        const trackedCals = proteinCals + carbsCals + fatCals;

        if (trackedCals > 0) {
            const scale  = totalCals / trackedCals;
            let   stackY = padding.top + chartH;

            for (const [cals, color] of [
                [proteinCals * scale, PROTEIN_COLOR],
                [carbsCals   * scale, CARBS_COLOR],
                [fatCals     * scale, FAT_COLOR],
            ]) {
                const h = (cals / yMax) * chartH;
                stackY -= h;
                const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                rect.setAttribute('x', x + 1); rect.setAttribute('y', stackY);
                rect.setAttribute('width', bw); rect.setAttribute('height', Math.max(0, h));
                rect.setAttribute('fill', color); rect.setAttribute('opacity', '0.8');
                svg.appendChild(rect);
            }
        } else {
            const dimColor = isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)';
            const y = yScale(totalCals);
            const h = chartH - (y - padding.top);
            const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            rect.setAttribute('x', x + 1); rect.setAttribute('y', y);
            rect.setAttribute('width', bw); rect.setAttribute('height', Math.max(1, h));
            rect.setAttribute('fill', dimColor); rect.setAttribute('opacity', '0.6');
            svg.appendChild(rect);
        }
    });

    const interval = Math.max(1, Math.floor(sorted.length / 8));
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
    legend.className = 'nutrition-legend';
    legend.innerHTML = `
        <span class="nutrition-legend-item"><span class="nutrition-legend-swatch" style="background:${PROTEIN_COLOR}"></span>protein</span>
        <span class="nutrition-legend-item"><span class="nutrition-legend-swatch" style="background:${CARBS_COLOR}"></span>carbs</span>
        <span class="nutrition-legend-item"><span class="nutrition-legend-swatch" style="background:${FAT_COLOR}"></span>fat</span>
        <span class="nutrition-legend-note">(calories from macros stacked; bare bar = calories only)</span>
    `;
    container.appendChild(legend);
}
