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

function populateSheet(rows) {
    const tbody = document.getElementById('sheet-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        let displayDate = row.date;

        // look at the row above it (the newer date)
        if (i > 0) {
            const current = new Date(row.date);
            const newer = new Date(rows[i-1].date);
            const diffDays = (newer - current) / (1000 * 60 * 60 * 24);

            if (diffDays > 1) {
                const gapEnd = new Date(newer);
                gapEnd.setDate(gapEnd.getDate() - 1);
                const gapEndStr = gapEnd.toISOString().split('T')[0];

                displayDate = `${row.date} to ${gapEndStr} (${diffDays} days)`;

                // normalize pooled hours across the gap on the older row
                row.home_hours = (row.home_hours / diffDays).toFixed(2);
                row.school_hours = (row.school_hours / diffDays).toFixed(2);
                row.work_hours = (row.work_hours / diffDays).toFixed(2);
                row.untracked_hours = (row.untracked_hours / diffDays).toFixed(2);
            }
        }

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${displayDate}</td>
            <td class="${row.morning_routine ? 'check' : 'miss'}">${row.morning_routine ? '' : '-'}</td>
            <td class="${row.evening_routine ? 'check' : 'miss'}">${row.evening_routine ? '' : '-'}</td>
            <td class="${row.lift ? 'check' : 'miss'}">${row.lift ? '' : '-'}</td>
            <td class="${row.muay_thai ? 'check' : 'miss'}">${row.muay_thai ? '' : '-'}</td>
            <td class="${row.run ? 'check' : 'miss'}">${row.run ? '' : '-'}</td>
            <td>${row.school_hours}</td>
            <td>${row.home_hours}</td>
            <td>${row.work_hours}</td>
            <td>${row.untracked_hours ?? '-'}</td>
            <td>${row.weight != null ? row.weight : '-'}</td>
        `;
        tbody.appendChild(tr);

        // bar chart sub-row
        const barRow = document.createElement('tr');
        barRow.className = 'sheet-bar-row';
        const barCell = document.createElement('td');
        barCell.colSpan = 11;
        barCell.className = 'sheet-bar-cell';

        const bar = document.createElement('div');
        bar.className = 'sheet-timeline-bar';

        // hour tick marks at 6h intervals
        for (let h = 6; h < 24; h += 6) {
            const tick = document.createElement('div');
            tick.className = 'sheet-bar-tick';
            tick.style.left = `${(h / 24) * 100}%`;
            bar.appendChild(tick);
        }

        // colored segments
        const segColors = { home: '#4a9eff', school: '#ffd43b', work: '#b197fc', muay_thai: '#ff6b6b', run: '#69db7c', lift: '#ffa94d' };
        for (const seg of (row.segments || [])) {
            const left = (seg.start / 1440) * 100;
            const width = ((seg.end - seg.start) / 1440) * 100;
            const color = segColors[seg.name] || '#666';
            const startStr = `${String(Math.floor(seg.start / 60)).padStart(2, '0')}:${String(seg.start % 60).padStart(2, '0')}`;
            const endStr = `${String(Math.floor(seg.end / 60)).padStart(2, '0')}:${String(seg.end % 60).padStart(2, '0')}`;
            const div = document.createElement('div');
            div.className = 'sheet-bar-segment';
            div.style.cssText = `left:${left.toFixed(3)}%;width:${width.toFixed(3)}%;background:${color};`;
            div.title = `${seg.name}  ${startStr}–${endStr}`;
            bar.appendChild(div);
        }

        barCell.appendChild(bar);
        barRow.appendChild(barCell);
        tbody.appendChild(barRow);
    }
}
