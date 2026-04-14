const BIRTH_DATE = new Date(2003, 1, 17); 
const LIFE_YEARS = 100;
const WEEKS_PER_YEAR = 52;

// Add notes here. year = age (0 = birth year, 23 = current age, etc.)
// text will appear to the right of that year's row.
const LIFE_NOTES = [
    { year: 0,  text: 'born in Del Rio, TX' },
    { year: 1,  text: 'moved to Colorado' },
    { year: 2,  text: 'moved to Hawaii' },
    { year: 6,  text: 'moved to California' },
    { year: 10,  text: 'moved to New Jersey' },
    { year: 11,  text: 'diagnosed w/ T1D' },
    { year: 12,  text: 'moved to Virginia' },
    { year: 14,  text: 'moved to Germany' },
    { year: 16,  text: 'moved back to Virginia' },
    { year: 18,  text: 'graduated high school and moved to Colorado' },
    { year: 22,  text: 'graduated college' },
];

function renderLife() {
    const container = document.getElementById('life-grid');
    if (!container) return;

    const now = new Date();
    const msPerWeek = 7 * 24 * 60 * 60 * 1000;
    const totalWeeksLived = Math.floor((now - BIRTH_DATE) / msPerWeek);

    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const filledColor  = isDark ? 'rgba(255,255,255,0.88)' : 'rgba(0,0,0,0.88)';
    const emptyStroke  = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)';
    const labelColor   = isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)';
    const currentColor = '#6b6bff';
    const noteColor    = isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)';

    const r        = 4;
    const gap      = 3;
    const cellSize = r * 2 + gap; // 11px per cell
    const leftPad  = 38;
    const noteGap  = 14;

    // Build notes lookup
    const notesMap = {};
    LIFE_NOTES.forEach(n => { notesMap[n.year] = n.text; });

    // Estimate SVG width: enough for grid + longest note
    const gridWidth  = WEEKS_PER_YEAR * cellSize; // 572px
    const svgWidth   = leftPad + gridWidth + noteGap + 300;
    const svgHeight  = LIFE_YEARS * cellSize;

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', svgWidth);
    svg.setAttribute('height', svgHeight);
    svg.setAttribute('shape-rendering', 'geometricPrecision');

    for (let year = 0; year < LIFE_YEARS; year++) {
        // Year label on the left (every 5 years, plus 0)
        if (year % 5 === 0) {
            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.setAttribute('x', leftPad - 6);
            text.setAttribute('y', year * cellSize + r + 3);
            text.setAttribute('font-size', '8');
            text.setAttribute('fill', labelColor);
            text.setAttribute('font-family', 'monospace');
            text.setAttribute('text-anchor', 'end');
            text.setAttribute('dominant-baseline', 'middle');
            text.textContent = year;
            svg.appendChild(text);
        }

        for (let week = 0; week < WEEKS_PER_YEAR; week++) {
            const weekIndex = year * WEEKS_PER_YEAR + week;
            const cx = leftPad + week * cellSize + r;
            const cy = year * cellSize + r;

            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circle.setAttribute('cx', cx);
            circle.setAttribute('cy', cy);
            circle.setAttribute('r', r - 0.5);

            if (weekIndex === totalWeeksLived) {
                // current week: outlined ring in accent color
                circle.setAttribute('fill', 'none');
                circle.setAttribute('stroke', currentColor);
                circle.setAttribute('stroke-width', '1.5');
            } else if (weekIndex < totalWeeksLived) {
                // past week: filled
                circle.setAttribute('fill', filledColor);
                circle.setAttribute('stroke', 'none');
            } else {
                // future week: faint outline
                circle.setAttribute('fill', 'none');
                circle.setAttribute('stroke', emptyStroke);
                circle.setAttribute('stroke-width', '1');
            }

            svg.appendChild(circle);
        }

        // Note to the right of this year's row
        if (notesMap[year] !== undefined) {
            const noteX = leftPad + gridWidth + noteGap;
            const noteY = year * cellSize + r;
            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.setAttribute('x', noteX);
            text.setAttribute('y', noteY);
            text.setAttribute('font-size', '8');
            text.setAttribute('fill', noteColor);
            text.setAttribute('font-family', 'monospace');
            text.setAttribute('dominant-baseline', 'middle');
            text.textContent = '<- ' + notesMap[year];
            svg.appendChild(text);
        }
    }

    container.innerHTML = '';
    container.appendChild(svg);
}
