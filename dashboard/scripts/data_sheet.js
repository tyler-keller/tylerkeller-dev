const SHEET_COL_COUNT = 14;

const AW_COLORS = {
    produce: '#69db7c',
    youtube: '#ff6b6b',
    browser: '#4a9eff',
};

async function loadSheet() {
    try {
        const response = await fetch(`${API_URL}/data/sheet`, {
            headers: { 'X-Key': apiKey }
        });
        if (response.ok) {
            const data = await response.json();
            populateSheet(data);
        }
    } catch (e) {
        console.error("Sheet load error", e);
    }
}

function fmtHoursMin(mins) {
    if (!mins) return '0m';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
}

function populateSheet(rows) {
    const tbody = document.getElementById('sheet-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        let displayDate = row.date;

        if (i > 0) {
            const current = new Date(row.date);
            const newer   = new Date(rows[i - 1].date);
            const diffDays = (newer - current) / (1000 * 60 * 60 * 24);
            if (diffDays > 1) {
                const gapEnd = new Date(newer);
                gapEnd.setDate(gapEnd.getDate() - 1);
                displayDate = `${row.date} to ${gapEnd.toISOString().split('T')[0]} (${diffDays} days)`;
                row.home_hours     = (row.home_hours     / diffDays).toFixed(2);
                row.school_hours   = (row.school_hours   / diffDays).toFixed(2);
                row.work_hours     = (row.work_hours     / diffDays).toFixed(2);
                row.untracked_hours = (row.untracked_hours / diffDays).toFixed(2);
            }
        }

        // --- no youtube cell ---
        let ytCell;
        if (!row.has_aw_data) {
            ytCell = `<td>-</td>`;
        } else if (row.youtube_mins > 0) {
            ytCell = `<td class="aw-yt-bad">${fmtHoursMin(row.youtube_mins)}</td>`;
        } else {
            ytCell = `<td class="aw-yt-good">✓</td>`;
        }

        // --- produce / consume cells ---
        const produceCell  = row.has_aw_data ? `<td>${row.produce_hours}</td>` : `<td>-</td>`;
        const consumeCell  = row.has_aw_data ? `<td>${row.consume_hours}</td>` : `<td>-</td>`;

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${displayDate}</td>
            <td class="${row.morning_routine ? 'check' : 'miss'}">${row.morning_routine ? '' : '-'}</td>
            <td class="${row.evening_routine ? 'check' : 'miss'}">${row.evening_routine ? '' : '-'}</td>
            <td class="${row.lift      ? 'check' : 'miss'}">${row.lift      ? '' : '-'}</td>
            <td class="${row.muay_thai ? 'check' : 'miss'}">${row.muay_thai ? '' : '-'}</td>
            <td class="${row.run       ? 'check' : 'miss'}">${row.run       ? '' : '-'}</td>
            <td>${row.school_hours}</td>
            <td>${row.home_hours}</td>
            <td>${row.work_hours}</td>
            <td>${row.untracked_hours ?? '-'}</td>
            ${ytCell}
            ${produceCell}
            ${consumeCell}
            <td>${row.weight != null ? row.weight : '-'}</td>
        `;
        tbody.appendChild(tr);

        // --- context timeline row (home/school/work) ---
        tbody.appendChild(makeTimelineRow(row.segments || [], {
            home:      '#4a9eff',
            school:    '#ffd43b',
            work:      '#b197fc',
            muay_thai: '#ff6b6b',
            run:       '#69db7c',
            lift:      '#ffa94d',
        }));

        // --- AW produce/consume timeline row ---
        if (row.has_aw_data) {
            tbody.appendChild(makeTimelineRow(row.aw_segments || [], AW_COLORS));
        }
    }
}

function makeTimelineRow(segments, colorMap) {
    const barRow  = document.createElement('tr');
    barRow.className = 'sheet-bar-row';
    const barCell = document.createElement('td');
    barCell.colSpan  = SHEET_COL_COUNT;
    barCell.className = 'sheet-bar-cell';

    const bar = document.createElement('div');
    bar.className = 'sheet-timeline-bar';

    // hour ticks at 6h intervals
    for (let h = 6; h < 24; h += 6) {
        const tick = document.createElement('div');
        tick.className = 'sheet-bar-tick';
        tick.style.left = `${(h / 24) * 100}%`;
        bar.appendChild(tick);
    }

    for (const seg of segments) {
        const start = seg.start ?? seg.start_min;
        const end   = seg.end   ?? seg.end_min;
        const left  = (start / 1440) * 100;
        const width = ((end - start) / 1440) * 100;
        if (width < 0.05) continue;

        const color = colorMap[seg.category ?? seg.name] || colorMap[seg.name] || '#666';
        const startStr = minsToTime(start);
        const endStr   = minsToTime(end);

        const div = document.createElement('div');
        div.className = 'sheet-bar-segment';
        div.style.cssText = `left:${left.toFixed(3)}%;width:${width.toFixed(3)}%;background:${color};`;
        div.title = `${seg.category ?? seg.name}  ${startStr}–${endStr}`;
        bar.appendChild(div);
    }

    barCell.appendChild(bar);
    barRow.appendChild(barCell);
    return barRow;
}

function minsToTime(mins) {
    const h = String(Math.floor(mins / 60)).padStart(2, '0');
    const m = String(Math.round(mins) % 60).padStart(2, '0');
    return `${h}:${m}`;
}
