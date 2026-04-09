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
    rows.forEach(row => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${row.date}</td>
            <td class="${row.morning_routine ? 'check' : 'miss'}">${row.morning_routine ? 'Y' : '-'}</td>
            <td class="${row.evening_routine ? 'check' : 'miss'}">${row.evening_routine ? 'Y' : '-'}</td>
            <td class="${row.lift ? 'check' : 'miss'}">${row.lift ? 'Y' : '-'}</td>
            <td class="${row.muay_thai ? 'check' : 'miss'}">${row.muay_thai ? 'Y' : '-'}</td>
            <td class="${row.run ? 'check' : 'miss'}">${row.run ? 'Y' : '-'}</td>
            <td>${row.school_hours}</td>
            <td>${row.home_hours}</td>
            <td>${row.work_hours}</td>
        `;
            // <td>${row.away_hours}</td>
        tbody.appendChild(tr);
    });
}