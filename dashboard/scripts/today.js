async function loadToday() {
    const container = document.getElementById('today-container');
    if (!container) return;
    container.innerHTML = 'loading...';
    try {
        const resp = await fetch(`${API_URL}/data/score`, { headers: { 'X-Key': apiKey } });
        if (!resp.ok) { container.innerHTML = '<span style="color:#666">failed to load</span>'; return; }
        const data = await resp.json();
        const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Denver' });
        const entry = data.find(d => d.date === today);
        renderToday(container, entry, today);
    } catch (e) {
        console.error("Today load error", e);
        container.innerHTML = '<span style="color:#666">error</span>';
    }
}

function renderToday(container, entry, today) {
    if (!entry) {
        container.innerHTML = `<span style="color:#666">no data for today yet (${today})</span>`;
        return;
    }

    const det = entry.details;
    const b = entry.bonuses;

    const hasAWData = det.produce_mins > 0 || det.youtube_mins > 0;
    const hasCGMData = det.tir_pct != null;

    function bonusState(key) {
        if (b[key]) return 'earned';
        switch (key) {
            case 'no_yt':   return (hasAWData && det.youtube_mins >= 60) ? 'failed' : 'open';
            case 'produce': return (hasAWData && det.youtube_mins > 0 && det.produce_mins <= det.youtube_mins) ? 'open' : 'open';
            case 'cardio':  return 'open';
            case 'lift_week': return 'open';
            case 'tir':     return 'open';
            case 'insulin': return (hasCGMData && !b.insulin) ? 'failed' : 'open';
            default: return 'open';
        }
    }

    const bonusDefs = [
        {
            key: 'produce',
            label: 'produce > youtube',
            detail: hasAWData
                ? `${Math.round(det.produce_mins)}m vs ${Math.round(det.youtube_mins)}m yt`
                : 'no AW data yet',
        },
        {
            key: 'no_yt',
            label: 'youtube < 60m',
            detail: hasAWData
                ? (det.youtube_mins > 0 ? `${Math.round(det.youtube_mins)}m watched` : 'none yet')
                : 'no AW data yet',
        },
        {
            key: 'cardio',
            label: 'cardio',
            detail: det.cardio_type || 'none yet',
        },
        {
            key: 'lift_week',
            label: 'lifts this week',
            detail: `${det.lifts_this_week}/3`,
        },
        {
            key: 'tir',
            label: 'TIR ≥70%',
            detail: hasCGMData ? `${det.tir_pct}%` : 'no CGM data yet',
        },
        {
            key: 'insulin',
            label: 'insulin timing',
            detail: hasCGMData
                ? (b.insulin ? 'ok' : 'spike without prior insulin')
                : 'no CGM data yet',
        },
    ];

    const stateIcon = { earned: '✓', failed: '✗', open: '○' };

    const bonusesHtml = bonusDefs.map(def => {
        const state = bonusState(def.key);
        return `<div class="today-bonus today-bonus-${state}">
            <span class="today-bonus-icon">${stateIcon[state]}</span>
            <span class="today-bonus-name">${def.label}</span>
            <span class="today-bonus-detail">${def.detail}</span>
        </div>`;
    }).join('');

    const hitCls = entry.hit ? 'today-hit-yes' : 'today-hit-no';

    container.innerHTML = `
        <div class="today-top">
            <div class="today-date-line">
                <span class="today-date-str">${today}</span>
                <span class="today-hit-badge ${hitCls}">${entry.hit ? 'HIT' : 'no hit'}</span>
                <span class="today-bonus-tally">${entry.bonus_count}/6 bonuses</span>
            </div>
            <div class="today-routines">
                <span class="today-routine ${det.morning_routine ? 'routine-done' : 'routine-open'}">morning ${det.morning_routine ? '✓' : '○'}</span>
                <span class="today-routine ${det.evening_routine ? 'routine-done' : 'routine-open'}">evening ${det.evening_routine ? '✓' : '○'}</span>
            </div>
        </div>
        <div class="today-bonuses-grid">${bonusesHtml}</div>
    `;
}
