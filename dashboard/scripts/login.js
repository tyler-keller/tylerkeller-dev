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
            loadStock();
            loadHeatmap();
            loadTimeline();
            loadRadar();
            initProgressViewer();
            loadWeightChart();
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

