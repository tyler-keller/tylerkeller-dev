async function loadWeightChart() {
    const container = document.getElementById('weight-chart');
    if (!container) return;

    try {
        const resp = await fetch(`${API_URL}/data/weights`, {
            headers: { 'X-Key': apiKey }
        });
        if (!resp.ok) {
            container.innerHTML = '<span style="color:#666">failed to load</span>';
            return;
        }
        const data = await resp.json();
        if (data.length === 0) {
            container.innerHTML = '<span style="color:#666">no weight data yet</span>';
            return;
        }
        renderWeightChart(data);
    } catch (e) {
        console.error("Weight chart load error", e);
        container.innerHTML = '<span style="color:#666">error loading</span>';
    }
}

function renderWeightChart(data) {
    const container = document.getElementById('weight-chart');
    container.innerHTML = '';

    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const axisColor = isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)';
    const textColor = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)';
    const lineColor = '#1eff00';

    const padding = { top: 10, right: 16, bottom: 24, left: 50 };
    const chartWidth = 740;
    const chartHeight = 140;
    const svgWidth = chartWidth + padding.left + padding.right;
    const svgHeight = chartHeight + padding.top + padding.bottom;

    const weights = data.map(d => d.weight);
    const minW = Math.min(...weights);
    const maxW = Math.max(...weights);
    const wRange = maxW - minW || 1;
    const padded = wRange * 0.1;
    const yMin = minW - padded;
    const yMax = maxW + padded;
    const yRange = yMax - yMin;

    const xScale = (i) => padding.left + (i / Math.max(data.length - 1, 1)) * chartWidth;
    const yScale = (v) => padding.top + chartHeight - ((v - yMin) / yRange) * chartHeight;

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', `0 0 ${svgWidth} ${svgHeight}`);
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', 'auto');
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');

    // horizontal grid lines
    const gridSteps = 4;
    for (let i = 0; i <= gridSteps; i++) {
        const y = padding.top + (i / gridSteps) * chartHeight;
        const val = yMax - (i / gridSteps) * yRange;
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
        text.textContent = val.toFixed(1);
        svg.appendChild(text);
    }

    // area fill
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    const grad = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
    grad.setAttribute('id', 'weight-gradient');
    grad.setAttribute('x1', '0');
    grad.setAttribute('y1', '0');
    grad.setAttribute('x2', '0');
    grad.setAttribute('y2', '1');
    const stop1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    stop1.setAttribute('offset', '0%');
    stop1.setAttribute('stop-color', lineColor);
    stop1.setAttribute('stop-opacity', '0.2');
    const stop2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    stop2.setAttribute('offset', '100%');
    stop2.setAttribute('stop-color', lineColor);
    stop2.setAttribute('stop-opacity', '0');
    grad.appendChild(stop1);
    grad.appendChild(stop2);
    defs.appendChild(grad);
    svg.appendChild(defs);

    const areaPoints = [];
    areaPoints.push(`${xScale(0)},${padding.top + chartHeight}`);
    for (let i = 0; i < data.length; i++) {
        areaPoints.push(`${xScale(i)},${yScale(data[i].weight)}`);
    }
    areaPoints.push(`${xScale(data.length - 1)},${padding.top + chartHeight}`);

    const areaPoly = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    areaPoly.setAttribute('points', areaPoints.join(' '));
    areaPoly.setAttribute('fill', 'url(#weight-gradient)');
    svg.appendChild(areaPoly);

    // line segments
    for (let i = 1; i < data.length; i++) {
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', xScale(i - 1));
        line.setAttribute('y1', yScale(data[i - 1].weight));
        line.setAttribute('x2', xScale(i));
        line.setAttribute('y2', yScale(data[i].weight));
        line.setAttribute('stroke', lineColor);
        line.setAttribute('stroke-width', '1.5');
        svg.appendChild(line);
    }

    // x-axis date labels
    const labelInterval = Math.max(1, Math.floor(data.length / 6));
    for (let i = 0; i < data.length; i += labelInterval) {
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', xScale(i));
        text.setAttribute('y', padding.top + chartHeight + 16);
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('font-size', '8');
        text.setAttribute('fill', textColor);
        text.setAttribute('font-family', 'monospace');
        const parts = data[i].date.split('-');
        text.textContent = `${parts[1]}/${parts[2]}`;
        svg.appendChild(text);
    }

    // current weight dot + label
    const lastIdx = data.length - 1;
    const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    dot.setAttribute('cx', xScale(lastIdx));
    dot.setAttribute('cy', yScale(data[lastIdx].weight));
    dot.setAttribute('r', '3');
    dot.setAttribute('fill', lineColor);
    svg.appendChild(dot);

    const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    label.setAttribute('x', xScale(lastIdx) - 6);
    label.setAttribute('y', yScale(data[lastIdx].weight) - 6);
    label.setAttribute('text-anchor', 'end');
    label.setAttribute('font-size', '9');
    label.setAttribute('fill', lineColor);
    label.setAttribute('font-family', 'monospace');
    label.textContent = `${data[lastIdx].weight} lbs`;
    svg.appendChild(label);

    container.appendChild(svg);
}
