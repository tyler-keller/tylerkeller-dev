let heatmapData = null;
let heatmapYear = new Date().getFullYear();
let heatmapControlsInit = false;

const TRACKABLE_ITEMS = ['morning_routine', 'evening_routine'];
const PHYSICAL_ITEMS = ['lift', 'muay_thai', 'run'];
const ITEM_LABELS = {
    morning_routine: 'morning',
    evening_routine: 'evening',
    lift: 'lift',
    muay_thai: 'muay thai',
    run: 'run'
};
const DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const TOTAL_ITEMS = TRACKABLE_ITEMS.length + 1; // routines + 1 physical

async function loadHeatmap() {
    try {
        const response = await fetch(`${API_URL}/data/sheet`, {
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
    const prevBtn = document.getElementById('heatmap-prev');
    const nextBtn = document.getElementById('heatmap-next');

    prevBtn.addEventListener('click', () => {
        heatmapYear--;
        renderHeatmap();
    });

    nextBtn.addEventListener('click', () => {
        heatmapYear++;
        renderHeatmap();
    });

    heatmapControlsInit = true;
}

function renderHeatmap() {
    const gridEl = document.getElementById('heatmap-grid');
    const yearEl = document.getElementById('heatmap-year');
    const prevBtn = document.getElementById('heatmap-prev');
    const nextBtn = document.getElementById('heatmap-next');
    const currentYear = new Date().getFullYear();

    yearEl.textContent = heatmapYear;
    nextBtn.disabled = heatmapYear >= currentYear;

    const dayData = {};
    if (heatmapData) {
        heatmapData.forEach(day => {
            const done = [];
            const missed = [];
            TRACKABLE_ITEMS.forEach(item => {
                if (day[item]) {
                    done.push(ITEM_LABELS[item]);
                } else {
                    missed.push(ITEM_LABELS[item]);
                }
            });

            const physicalDone = PHYSICAL_ITEMS.filter(item => day[item]);
            if (physicalDone.length > 0) {
                done.push('physical (' + physicalDone.map(i => ITEM_LABELS[i]).join(', ') + ')');
            } else {
                missed.push('physical');
            }

            dayData[day.date] = {
                score: done.length / TOTAL_ITEMS,
                done,
                missed
            };
        });
    }

    const startDate = new Date(heatmapYear, 0, 1);
    const startDay = startDate.getDay();
    const isLeapYear = (heatmapYear % 4 === 0 && heatmapYear % 100 !== 0) || (heatmapYear % 400 === 0);
    const daysInYear = isLeapYear ? 366 : 365;

    const cellSize = 10;
    const cellGap = 2;
    const cellTotal = cellSize + cellGap;

    const leftPad = 28;
    const topPad = 16;

    const totalCells = startDay + daysInYear;
    const weeksNeeded = Math.ceil(totalCells / 7);

    const width = leftPad + weeksNeeded * cellTotal;
    const height = topPad + 7 * cellTotal;

    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const emptyColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
    const labelColor = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)';

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', width);
    svg.setAttribute('height', height);

    // day labels on the left
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

    // month labels above the grid
    let lastMonthDrawn = -1;
    let dateCounter = 0;
    for (let week = 0; week < weeksNeeded; week++) {
        for (let day = 0; day < 7; day++) {
            const cellIndex = week * 7 + day;
            if (cellIndex < startDay) continue;
            if (dateCounter >= daysInYear) break;

            const currentDate = new Date(heatmapYear, 0, 1 + dateCounter);
            const month = currentDate.getMonth();
            if (month !== lastMonthDrawn) {
                const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                text.setAttribute('x', leftPad + week * cellTotal);
                text.setAttribute('y', topPad - 4);
                text.setAttribute('font-size', '9');
                text.setAttribute('fill', labelColor);
                text.setAttribute('font-family', 'monospace');
                text.textContent = MONTH_LABELS[month];
                svg.appendChild(text);
                lastMonthDrawn = month;
            }
            break;
        }
        // advance dateCounter for this week
        for (let day = 0; day < 7; day++) {
            const cellIndex = week * 7 + day;
            if (cellIndex < startDay) continue;
            if (dateCounter >= daysInYear) break;
            dateCounter++;
        }
    }

    // cells
    dateCounter = 0;
    for (let week = 0; week < weeksNeeded; week++) {
        for (let day = 0; day < 7; day++) {
            const cellIndex = week * 7 + day;
            if (cellIndex < startDay) continue;
            if (dateCounter >= daysInYear) break;

            const currentDate = new Date(heatmapYear, 0, 1 + dateCounter);
            const dateStr = `${heatmapYear}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;

            const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            rect.setAttribute('x', leftPad + week * cellTotal);
            rect.setAttribute('y', topPad + day * cellTotal);
            rect.setAttribute('width', cellSize);
            rect.setAttribute('height', cellSize);
            rect.setAttribute('rx', 2);
            rect.setAttribute('data-date', dateStr);

            const info = dayData[dateStr];
            const score = info ? info.score : 0;
            if (score > 0) {
                rect.setAttribute('fill', `rgba(30, 255, 0, ${score})`);
            } else {
                rect.setAttribute('fill', emptyColor);
            }

            svg.appendChild(rect);
            dateCounter++;
        }
    }

    gridEl.innerHTML = '';
    gridEl.appendChild(svg);

    // tooltip
    let tooltip = document.getElementById('heatmap-tooltip');
    if (!tooltip) {
        tooltip = document.createElement('div');
        tooltip.id = 'heatmap-tooltip';
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
        const info = dayData[dateStr];
        const [y, m, d] = dateStr.split('-');
        const dateObj = new Date(+y, +m - 1, +d);
        const prettyDate = dateObj.toLocaleDateString('en-US', {
            weekday: 'short', month: 'short', day: 'numeric'
        });

        let html = `<div class="heatmap-tooltip-date">${prettyDate}</div>`;
        if (info && info.score > 0) {
            html += `<div class="heatmap-tooltip-score">${info.done.length}/${TOTAL_ITEMS}</div>`;
            html += info.done.map(i => `<div class="heatmap-tooltip-done">${i}</div>`).join('');
            if (info.missed.length > 0) {
                html += info.missed.map(i => `<div class="heatmap-tooltip-miss">${i}</div>`).join('');
            }
        } else {
            html += `<div class="heatmap-tooltip-miss">no data</div>`;
        }

        tooltip.innerHTML = html;
        tooltip.style.display = 'block';

        const rect = tooltip.getBoundingClientRect();
        let left = e.pageX + 12;
        let top = e.pageY - rect.height / 2;
        if (left + rect.width > window.innerWidth) left = e.pageX - rect.width - 12;
        if (top < 0) top = 4;
        tooltip.style.left = left + 'px';
        tooltip.style.top = top + 'px';
    });

    svg.addEventListener('mouseleave', () => {
        tooltip.style.display = 'none';
    });
}
