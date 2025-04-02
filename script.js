// Configuration
const UPDATE_INTERVAL = 250; // milliseconds, matches data.py
let ARDUINO_IP = ''; // Set by user input
let radar_data = {}; // Persistent radar readings, mirrors radar_data dictionary in data.py

// --- Initialize Radar Plot ---
Plotly.newPlot('radar-plot', [
  // Persistent radar points
  { r: [], theta: [], type: 'scatterpolar', mode: 'markers', marker: { color: 'lime', size: 8 } },
  // Sweep line
  { r: [0, 100], theta: [0, 0], type: 'scatterpolar', mode: 'lines', line: { color: 'lime', width: 2 } }
], {
  polar: {
    bgcolor: 'black',
    radialaxis: {
      range: [0, 100],           // Distance from 0 to 100
      tick0: 0,
      dtick: 20,                 // Radial ticks every 20 units
      gridcolor: 'green',
      gridwidth: 1,
      gridstyle: 'dot'           // Dotted green grid lines
    },
    angularaxis: {
      range: [0, 180],           // Angles from 0 to 180 degrees
      tick0: 0,
      dtick: 22.5,               // Angular ticks every 22.5 degrees
      gridcolor: 'green',
      gridwidth: 1,
      gridstyle: 'dot',
      direction: 'clockwise',    // Matches radar sweep direction
      rotation: 0               // 0° at left (west)
    }
  },
  plot_bgcolor: 'black',         // Plot background
  paper_bgcolor: 'black',        // Surrounding area
  font: { color: 'white' },      // White text for visibility
  margin: { t: 20, b: 20, l: 20, r: 20 }
});

// --- Initialize IR Plot ---
Plotly.newPlot('ir-plot', [
  { x: [], y: [], type: 'scatter', mode: 'lines', name: 'IR Value', line: { color: 'red' } }
], {
  title: 'IR Sensor',
  xaxis: { title: 'Last 20 Readings' },
  yaxis: { title: 'IR Value' },
  margin: { t: 40, b: 40, l: 50, r: 50 }
});

// --- Initialize DHT Plot ---
Plotly.newPlot('dht-plot', [
  { x: [], y: [], type: 'scatter', mode: 'lines', name: 'Temp (F)', line: { color: 'green' }, yaxis: 'y1' },
  { x: [], y: [], type: 'scatter', mode: 'lines', name: 'Humidity (%)', line: { color: 'yellow' }, yaxis: 'y2' }
], {
  title: 'DHT Sensor',
  xaxis: { title: 'Last 20 Readings' },
  yaxis: { title: 'Temp (F)', side: 'left' },
  yaxis2: {
    title: 'Humidity (%)',
    side: 'right',
    overlaying: 'y'
  },
  margin: { t: 40, b: 40, l: 50, r: 50 }
});

// Data storage
let ir_ydata = [];         // IR sensor values
let dht_temp_data = [];    // DHT temperature values
let dht_hum_data = [];     // DHT humidity values

// --- Functions ---

// Set the Arduino IP from user input
function setIP() {
  ARDUINO_IP = document.getElementById('arduino-ip').value.trim();
  if (ARDUINO_IP) {
    console.log(`Arduino IP set to: ${ARDUINO_IP}`);
  }
}

// Fetch and update all sensor data
async function updateData() {
  if (!ARDUINO_IP) return; // Skip if IP not set
  try {
    const response = await fetch(`http://${ARDUINO_IP}/`, { timeout: 2000 });
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const data = await response.json();
    updateRadar(data.radar);
    updateIR(data.ir);
    updateDHT(data.dht);
  } catch (error) {
    console.error('Error fetching data:', error.message);
  }
}

// Update radar plot
function updateRadar(radar) {
  if (!radar || radar.angle === undefined || radar.distance === undefined) return;
  
  // Update persistent radar data
  radar_data[radar.angle] = radar.distance;
  
  // Prepare data for plotting
  const sorted_angles = Object.keys(radar_data).map(Number).sort((a, b) => a - b);
  const angles = sorted_angles;
  const distances = sorted_angles.map(angle => radar_data[angle]);
  
  // Update points
  Plotly.restyle('radar-plot', { r: [distances], theta: [angles] }, 0);
  
  // Update sweep line
  Plotly.restyle('radar-plot', { theta: [[radar.angle, radar.angle]] }, 1);
}

// Update IR plot
function updateIR(ir_value) {
  if (ir_value === undefined) return;
  
  ir_ydata.push(ir_value);
  if (ir_ydata.length > 20) ir_ydata.shift(); // Keep last 20 readings
  
  const xdata = Array.from({ length: ir_ydata.length }, (_, i) => i);
  Plotly.update('ir-plot', { x: [xdata], y: [ir_ydata] }, {}, [0]);
  
  // Adjust y-axis dynamically
  if (ir_ydata.length > 1) {
    Plotly.relayout('ir-plot', {
      'yaxis.range': [Math.min(...ir_ydata) - 1, Math.max(...ir_ydata) + 1]
    });
  }
}

// Update DHT plot
function updateDHT(dht) {
  if (!dht || dht.temperature === undefined || dht.humidity === undefined) return;
  
  dht_temp_data.push(dht.temperature);
  dht_hum_data.push(dht.humidity);
  if (dht_temp_data.length > 20) {
    dht_temp_data.shift();
    dht_hum_data.shift();
  }
  
  const xdata = Array.from({ length: dht_temp_data.length }, (_, i) => i);
  Plotly.update('dht-plot', {
    x: [xdata, xdata],
    y: [dht_temp_data, dht_hum_data]
  }, {}, [0, 1]);
  
  // Adjust y-axes dynamically
  if (dht_temp_data.length > 1) {
    Plotly.relayout('dht-plot', {
      'yaxis.range': [Math.min(...dht_temp_data) - 1, Math.max(...dht_temp_data) + 1],
      'yaxis2.range': [Math.min(...dht_hum_data) - 5, Math.max(...dht_hum_data) + 5]
    });
  }
}

// Start periodic updates
setInterval(updateData, UPDATE_INTERVAL);