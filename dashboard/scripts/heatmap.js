let heatmapData = null;
let heatmapYear = new Date().getFullYear();
let heatmapControlsInit = false;

const DAY_LABELS   = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MAX_BONUSES  = 6;

async function loadHeatmap() {
    try {
        const response = await fetch(`${API_URL}/data/score`, {
            headers: { 'X-Key': apiKey }
        });
        if (!response.ok) return;
        heatmapData = await response.json();
        if (!heatmapControlsInit) setupHeatmapControls();
        renderHeatmap();
    } catch (e) {
        console.error("Heatmap load error", e);
    }
}

function setupHeatmapControls() {
    document.getElementById('heatmap-prev').addEventListener('click', () => { heatmapYear--; renderHeatmap(); });
    document.getElementById('heatmap-next').addEventListener('click', () => { heatmapYear++; renderHeatmap(); });
    heatmapControlsInit = true;
}

function renderHeatmap() {
    const gridEl = document.getElementById('heatmap-grid');
    const yearEl = document.getElementById('heatmap-year');
    const currentYear = new Date().getFullYear();

    yearEl.textContent = heatmapYear;
    document.getElementById('heatmap-next').disabled = heatmapYear >= currentYear;

    // Build lookup: date → score entry
    const dayData = {};
    if (heatmapData) {
        heatmapData.forEach(d => { dayData[d.date] = d; });
    }

    const startDate  = new Date(heatmapYear, 0, 1);
    const startDay   = startDate.getDay();
    const isLeap     = (heatmapYear % 4 === 0 && heatmapYear % 100 !== 0) || heatmapYear % 400 === 0;
    const daysInYear = isLeap ? 366 : 365;

    const cellSize  = 10;
    const cellGap   = 2;
    const cellTotal = cellSize + cellGap;
    const leftPad   = 28;
    const topPad    = 16;
    const totalCells  = startDay + daysInYear;
    const weeksNeeded = Math.ceil(totalCells / 7);
    const width  = leftPad + weeksNeeded * cellTotal;
    const height = topPad + 7 * cellTotal;

    const isDark     = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const emptyColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
    const labelColor = isDark ? 'rgba(255,255,255,0.4)'  : 'rgba(0,0,0,0.4)';

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', width);
    svg.setAttribute('height', height);

    // Day labels
    for (let d = 0; d < 7; d++) {
        if (d % 2 === 1) {
            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.setAttribute('x', 0);
            text.setAttribute('y', topPad + d * cellTotal + cellSize - 1);
            text.setAttribute('font-size', '9');
            text.setAttribute('fill', labelColor);
            text.setAttribute('font-family', 'monospace');
            text.textContent = DAY_LABELS[d];
            svg.appendChild(text);
        }
    }

    // Month labels (first pass)
    let lastMonth = -1;
    let dateIdx   = 0;
    for (let week = 0; week < weeksNeeded; week++) {
        for (let day = 0; day < 7; day++) {
            if (week * 7 + day < startDay) continue;
            if (dateIdx >= daysInYear) break;
            const d = new Date(heatmapYear, 0, 1 + dateIdx);
            if (d.getMonth() !== lastMonth) {
                const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                text.setAttribute('x', leftPad + week * cellTotal);
                text.setAttribute('y', topPad - 4);
                text.setAttribute('font-size', '9');
                text.setAttribute('fill', labelColor);
                text.setAttribute('font-family', 'monospace');
                text.textContent = MONTH_LABELS[d.getMonth()];
                svg.appendChild(text);
                lastMonth = d.getMonth();
            }
            break;
        }
        for (let day = 0; day < 7; day++) {
            if (week * 7 + day < startDay) continue;
            if (dateIdx >= daysInYear) break;
            dateIdx++;
        }
    }

    // Cells
    dateIdx = 0;
    for (let week = 0; week < weeksNeeded; week++) {
        for (let day = 0; day < 7; day++) {
            if (week * 7 + day < startDay) continue;
            if (dateIdx >= daysInYear) break;

            const d       = new Date(heatmapYear, 0, 1 + dateIdx);
            const dateStr = `${heatmapYear}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            const info    = dayData[dateStr];

            const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            rect.setAttribute('x',      leftPad + week * cellTotal);
            rect.setAttribute('y',      topPad  + day  * cellTotal);
            rect.setAttribute('width',  cellSize);
            rect.setAttribute('height', cellSize);
            rect.setAttribute('rx', 2);
            rect.setAttribute('data-date', dateStr);

            if (info && info.hit) {
                // green, brighter with each bonus
                const opacity = 0.2 + (info.bonus_count / MAX_BONUSES) * 0.8;
                rect.setAttribute('fill', `rgba(30,255,0,${opacity.toFixed(2)})`);
            } else if (info && info.has_data) {
                // known miss: faint red
                rect.setAttribute('fill', 'rgba(255,107,107,0.25)');
            } else {
                rect.setAttribute('fill', emptyColor);
            }

            svg.appendChild(rect);
            dateIdx++;
        }
    }

    gridEl.innerHTML = '';
    gridEl.appendChild(svg);

    // Tooltip
    let tooltip = document.getElementById('heatmap-tooltip');
    if (!tooltip) {
        tooltip = document.createElement('div');
        tooltip.id        = 'heatmap-tooltip';
        tooltip.className = 'heatmap-tooltip';
        document.body.appendChild(tooltip);
    }

    svg.addEventListener('mousemove', (e) => {
        const target = e.target;
        if (target.tagName !== 'rect' || !target.dataset.date) {
            tooltip.style.display = 'none';
            return;
        }

        const dateStr = target.dataset.date;
        const info    = dayData[dateStr];
        const [y, m, d2] = dateStr.split('-');
        const prettyDate = new Date(+y, +m - 1, +d2)
            .toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

        let html = `<div class="heatmap-tooltip-date">${prettyDate}</div>`;

        if (info && info.has_data) {
            const det = info.details;
            const b   = info.bonuses;

            // Routines
            const mr = info.details.morning_routine;
            const er = info.details.evening_routine;
            html += `<div class="heatmap-tooltip-routines">` +
                `<span class="${mr ? 'heatmap-tooltip-done' : 'heatmap-tooltip-miss'}">morning</span>` +
                `<span class="${er ? 'heatmap-tooltip-done' : 'heatmap-tooltip-miss'}">evening</span>` +
                `</div>`;

            if (info.hit) {
                html += `<div class="heatmap-tooltip-score">${info.bonus_count}/${MAX_BONUSES} bonuses</div>`;
            }

            const bonusRows = [
                { key: 'produce',   label: `produce`,
                  detail: det.produce_mins ? `${det.produce_mins}m vs ${det.youtube_mins}m yt` : null },
                { key: 'no_yt',     label: 'no youtube',
                  detail: `${det.youtube_mins}m` },
                { key: 'cardio',    label: 'cardio',
                  detail: det.cardio_type },
                { key: 'lift_week', label: 'lift 3×/wk',
                  detail: `${det.lifts_this_week} this week` },
                { key: 'tir',       label: 'TIR ≥70%',
                  detail: det.tir_pct != null ? `${det.tir_pct}%` : null },
                { key: 'insulin',   label: 'insulin timing',
                  detail: null },
            ];

            for (const row of bonusRows) {
                const on = b[row.key];
                const detail = row.detail ? ` <span style="opacity:0.55">(${row.detail})</span>` : '';
                html += `<div class="${on ? 'heatmap-tooltip-done' : 'heatmap-tooltip-miss'}">` +
                        `${on ? '✓' : '✗'} ${row.label}${detail}</div>`;
            }
        } else {
            html += `<div class="heatmap-tooltip-miss">no data</div>`;
        }

        tooltip.innerHTML      = html;
        tooltip.style.display  = 'block';
        const rect = tooltip.getBoundingClientRect();
        let left = e.pageX + 12;
        let top  = e.pageY - rect.height / 2;
        if (left + rect.width > window.innerWidth) left = e.pageX - rect.width - 12;
        if (top < 0) top = 4;
        tooltip.style.left = left + 'px';
        tooltip.style.top  = top  + 'px';
    });

    svg.addEventListener('mouseleave', () => { tooltip.style.display = 'none'; });
}
