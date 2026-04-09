async function loadJournals() {
    const loadingEl = document.getElementById('journals-loading');
    const listEl = document.getElementById('journals-list');

    try {
        const response = await fetch(`${API_URL}/data/journals`, {
            headers: { 'X-Key': apiKey }
        });

        if (!response.ok) {
            loadingEl.textContent = 'failed to load journals';
            return;
        }

        const journals = await response.json();
        loadingEl.style.display = 'none';
        listEl.style.display = 'block';

        if (journals.length === 0) {
            listEl.innerHTML = '<span class="journal-no-meta">no journal entries yet.</span>';
            return;
        }

        listEl.innerHTML = '';
        journals.forEach(entry => {
            listEl.appendChild(createJournalEntry(entry));
        });
    } catch (e) {
        console.error("Journals load error", e);
        loadingEl.textContent = 'error loading journals';
    }
}

function createJournalEntry(entry) {
    const container = document.createElement('div');
    container.className = 'journal-entry';

    const date = entry.start_time
        ? new Date(entry.start_time).toLocaleDateString('en-US', {
            weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'
        })
        : 'unknown date';

    const time = entry.start_time
        ? new Date(entry.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : '';

    const meta = entry.metadata || {};
    const hasMeta = meta.summary || meta.transcription || (meta.tags && meta.tags.length > 0);

    const header = document.createElement('div');
    header.className = 'journal-header';
    header.innerHTML = `
        <span><span class="journal-date">${date}</span> ${time}</span>
        <span class="journal-toggle">${hasMeta ? '+' : ''}</span>
    `;

    const body = document.createElement('div');
    body.className = 'journal-body';

    let bodyHtml = '';

    if (meta.tags && meta.tags.length > 0) {
        bodyHtml += `<div class="journal-tags">${meta.tags.map(t => `<span class="journal-tag">${t}</span>`).join('')}</div>`;
    }

    if (meta.summary) {
        bodyHtml += `<div class="journal-summary">${meta.summary}</div>`;
    }

    if (meta.transcription) {
        bodyHtml += `<div class="journal-transcription">${meta.transcription}</div>`;
    }

    if (!hasMeta && !entry.media_path) {
        bodyHtml = '<span class="journal-no-meta">processing...</span>';
    }

    body.innerHTML = bodyHtml;

    if (entry.media_path) {
        const filename = entry.media_path.split('/').pop();
        const audioUrl = `${API_URL}/data/media/audio/journal/${filename}`;
        const audioDiv = document.createElement('div');
        audioDiv.className = 'journal-audio';

        const playBtn = document.createElement('button');
        playBtn.textContent = '> play recording';
        playBtn.style.cssText = 'background:transparent;border:1px solid var(--text-color);color:var(--text-color);font-family:monospace;font-size:inherit;padding:4px 10px;cursor:pointer;margin:8px 0;';

        playBtn.addEventListener('click', async () => {
            playBtn.textContent = 'loading...';
            playBtn.disabled = true;
            try {
                const resp = await fetch(audioUrl, {
                    headers: { 'X-Key': apiKey }
                });
                if (!resp.ok) {
                    playBtn.textContent = 'failed to load';
                    return;
                }
                const blob = await resp.blob();
                const audio = document.createElement('audio');
                audio.controls = true;
                audio.autoplay = true;
                audio.src = URL.createObjectURL(blob);
                audioDiv.replaceChild(audio, playBtn);
            } catch (e) {
                console.error("Audio load error", e);
                playBtn.textContent = 'error';
            }
        }, { once: true });

        audioDiv.appendChild(playBtn);
        body.appendChild(audioDiv);
    }

    header.addEventListener('click', () => {
        body.classList.toggle('open');
        const toggle = header.querySelector('.journal-toggle');
        toggle.textContent = body.classList.contains('open') ? '-' : '+';
    });

    container.appendChild(header);
    container.appendChild(body);
    return container;
}
