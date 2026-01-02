async function loadHeatmaps() {
  try {
    const response = await fetch('data.yaml');
    const yamlText = await response.text();
    const data = jsyaml.load(yamlText);
    
    const year = data.year;
    const heatmaps = data.heatmaps;
    
    ['MR', 'ER', 'EX'].forEach(category => {
      const dates = heatmaps[category]?.dates || [];
      const dateSet = new Set(dates.map(d => `${year}-${d}`));
      renderHeatmap(category, year, dateSet);
    });
  } catch (error) {
    console.error('Error loading heatmaps:', error);
  }
}

function renderHeatmap(category, year, dateSet) {
  const container = document.getElementById(`heatmap-${category}`);
  if (!container) return;
  
  const startDate = new Date(year, 0, 1);
  const startDay = startDate.getDay(); 
  const isLeapYear = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
  const daysInYear = isLeapYear ? 366 : 365;
  
  // grid configuration
  const cellSize = 10;
  const cellGap = 2;
  const cellTotal = cellSize + cellGap;
  
  const totalCells = startDay + daysInYear;
  const weeksNeeded = Math.ceil(totalCells / 7);
  
  const width = weeksNeeded * cellTotal;
  const height = 7 * cellTotal;
  
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', width);
  svg.setAttribute('height', height);
  
  // get colors based on theme
  const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const emptyColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
  const fillColor = '#1eff00ff';
  
  // grid
  let dateCounter = 0;
  for (let week = 0; week < weeksNeeded; week++) {
    for (let day = 0; day < 7; day++) {
      const cellIndex = week * 7 + day;
      
      // skipping cells before year starts
      if (cellIndex < startDay) continue;
      
      // stop after year ends
      if (dateCounter >= daysInYear) break;
      
      // calculate current date
      const currentDate = new Date(year, 0, 1 + dateCounter);
      const dateString = `${year}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
      
      // rect
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', week * cellTotal);
      rect.setAttribute('y', day * cellTotal);
      rect.setAttribute('width', cellSize);
      rect.setAttribute('height', cellSize);
      rect.setAttribute('rx', 2);
      
      const hasActivity = dateSet.has(dateString);
      rect.setAttribute('fill', hasActivity ? fillColor : emptyColor);
      
      svg.appendChild(rect);
      dateCounter++;
    }
  }
  
  container.appendChild(svg);
}

// load 
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadHeatmaps);
} else {
  loadHeatmaps();
}
