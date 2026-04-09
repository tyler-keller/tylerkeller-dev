const API_URL = "https://api.tylerkeller.dev";
const LOCAL_STORAGE_KEY = 't4k.dev-secret-key'
let apiKey = null;

// check for stored key on load
document.addEventListener('DOMContentLoaded', () => {
    const storedKey = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (storedKey) {
        verifyAndLoad(storedKey);
    }
});

// handle input
const input = document.getElementById('api-key-input');
input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        verifyAndLoad(input.value);
    }
});

// verification & switch
async function verifyAndLoad(key) {
    try {
        // hit login endpoint
        const response = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'X-Key': key }
        });

        if (response.ok) {
            // success: store key and unlock
            apiKey = key;
            localStorage.setItem(LOCAL_STORAGE_KEY, key);
            document.getElementById('login-overlay').style.display = 'none';
            document.getElementById('dashboard-content').style.display = 'block';
            loadStatus();
            loadSheet();
            loadJournals();
            initProgressViewer();
        } else {
            input.value = '';
            input.placeholder = "whoops...";
            localStorage.removeItem(LOCAL_STORAGE_KEY);
        }
    } catch (e) {
        console.error("Connection error", e);
    }
}

async function loadStatus() {
    try {
        const response = await fetch(`${API_URL}/status`, {
            headers: { 'X-Key': apiKey }
        });
        if (response.ok) {
            const data = await response.json();
            populateDashboard(data);
        }
    } catch (e) {
        console.error("Status load error", e);
    }
}

function populateDashboard(data) {
    // Update current context
    const contextEl = document.getElementById('current-context');
    if (contextEl) {
        contextEl.textContent = data.current_context || 'unknown';
    }
    
    // Update activity minutes
    const activityEl = document.getElementById('activity-minutes');
    if (activityEl) {
        activityEl.textContent = data.activity_minutes_today || 0;
    }
    
    // Update workouts this week
    const workoutsEl = document.getElementById('workouts-week');
    if (workoutsEl) {
        workoutsEl.textContent = data.workouts_this_week || 0;
    }
    
    // Update last insulin time
    if (data.last_insulin) {
        const insulinEl = document.getElementById('last-insulin');
        if (insulinEl) {
            const insulinTime = new Date(data.last_insulin);
            const now = new Date();
            const diffMs = now - insulinTime;
            const diffMins = Math.floor(diffMs / 60000);
            const diffHours = Math.floor(diffMins / 60);
            
            if (diffMins < 60) {
                insulinEl.textContent = `${diffMins}m ago`;
            } else {
                insulinEl.textContent = `${diffHours}h ago`;
            }
        }
    }
    
    // Update today's timeline
    const timelineEl = document.getElementById('today-timeline');
    if (timelineEl && data.today_events && data.today_events.length > 0) {
        timelineEl.innerHTML = '';
        data.today_events.forEach(event => {
            const div = document.createElement('div');
            div.className = 'timeline-event';
            const time = new Date(event.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            div.innerHTML = `<span class="timeline-time">${time}</span> <span class="timeline-name">${event.event_name}</span>`;
            timelineEl.appendChild(div);
        });
    }
}

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
            <td>${row.away_hours}</td>
        `;
        tbody.appendChild(tr);
    });
}

let progressPhotos = [];
let progressIndex = 0;
let progressTimer = null;
let progressSpeed = 2;

function initProgressViewer() {
    const viewer = document.getElementById('progress-viewer');
    if (viewer) viewer.style.display = 'block';

    const toggle = document.getElementById('show-progress-toggle');
    const slider = document.getElementById('speed-slider');
    const speedVal = document.getElementById('speed-value');
    const rangeSelect = document.getElementById('range-select');
    const resetBtn = document.getElementById('reset-btn');

    toggle.addEventListener('change', () => {
        if (toggle.checked) {
            startProgressSlideshow();
        } else {
            stopProgressSlideshow();
        }
    });

    slider.addEventListener('input', () => {
        progressSpeed = parseFloat(slider.value);
        speedVal.textContent = `${progressSpeed}s`;
        if (toggle.checked) {
            stopProgressSlideshow();
            startProgressSlideshow();
        }
    });

    rangeSelect.addEventListener('change', () => {
        progressIndex = 0;
        stopProgressSlideshow();
        if (toggle.checked) {
            loadProgressPhotos(rangeSelect.value, () => {
                startProgressSlideshow();
            });
        } else {
            loadProgressPhotos(rangeSelect.value);
        }
    });

    resetBtn.addEventListener('click', () => {
        progressIndex = 0;
        stopProgressSlideshow();
        if (toggle.checked) {
            startProgressSlideshow();
        } else {
            showPlaceholder();
        }
    });

    loadProgressPhotos(rangeSelect.value);
}

async function loadProgressPhotos(range, callback) {
    try {
        const response = await fetch(`${API_URL}/data/progress_photos?range=${range}`, {
            headers: { 'X-Key': apiKey }
        });
        if (response.ok) {
            progressPhotos = await response.json();
            if (callback) callback();
        }
    } catch (e) {
        console.error("Progress photos load error", e);
    }
}

function startProgressSlideshow() {
    if (progressPhotos.length === 0) return;
    showCurrentPhoto();
    progressTimer = setInterval(() => {
        progressIndex = (progressIndex + 1) % progressPhotos.length;
        showCurrentPhoto();
    }, progressSpeed * 1000);
}

function stopProgressSlideshow() {
    if (progressTimer) {
        clearInterval(progressTimer);
        progressTimer = null;
    }
    showPlaceholder();
}

async function showCurrentPhoto() {
    if (progressPhotos.length === 0) return;
    const container = document.getElementById('progress-image-container');
    const img = document.getElementById('progress-image');
    const overlay = document.getElementById('progress-date-overlay');
    const photo = progressPhotos[progressIndex];

    try {
        const response = await fetch(`${API_URL}${photo.url}`, {
            headers: { 'X-Key': apiKey },
            mode: 'cors'
        });

        if (response.ok) {
            const blob = await response.blob();
            // clean up the old object url to prevent memory leaks
            if (img.src.startsWith('blob:')) {
                URL.revokeObjectURL(img.src);
            }
            img.src = URL.createObjectURL(blob);
            
            overlay.textContent = photo.date;
            container.style.display = 'block';
            document.querySelector('.progress-placeholder').style.display = 'none';
        } else {
            console.error("Failed to load image:", response.status);
        }
    } catch (e) {
        console.error("Image fetch error", e);
    }
}

function showPlaceholder() {
    const container = document.getElementById('progress-image-container');
    container.style.display = 'none';
    document.querySelector('.progress-placeholder').style.display = 'block';
    document.querySelector('.progress-placeholder').textContent = 'click SHOW? to start';
}