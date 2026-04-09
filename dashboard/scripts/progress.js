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