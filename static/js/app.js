document.addEventListener('DOMContentLoaded', () => {
    console.log("IoT Sensor CRC Monitor Full Initialization.");

    // Globals & State
    let simulationTimer = null;
    let packetsData = [];
    let charts = {};
    
    // Check Health
    fetch('/api/health')
        .then(r => r.json())
        .then(data => {
            if (data.status !== 'healthy') throw new Error("Unhealthy");
            document.getElementById('server-status').innerHTML = '<span class="status-dot"></span> Backend Connected';
            document.getElementById('server-status').style.color = 'var(--success-color)';
            initialLoad();
        })
        .catch(err => {
            document.getElementById('server-status').innerHTML = '<span class="status-dot" style="background:var(--danger-color)"></span> Disconnected';
            document.getElementById('server-status').style.color = 'var(--danger-color)';
        });

    function initialLoad() {
        initCharts();
        fetchHistory();
    }

    // --- BUTTON HANDLERS ---
    document.getElementById('btn-valid').addEventListener('click', () => simulatePacket('none'));
    document.getElementById('btn-corrupt-temp').addEventListener('click', () => simulatePacket('temperature'));
    document.getElementById('btn-corrupt-hum').addEventListener('click', () => simulatePacket('humidity'));
    document.getElementById('btn-corrupt-pres').addEventListener('click', () => simulatePacket('pressure'));
    document.getElementById('btn-corrupt-rand').addEventListener('click', () => simulatePacket('random'));

    // Simulation Controls
    const btnStart = document.getElementById('btn-start-sim');
    const btnStop = document.getElementById('btn-stop-sim');
    
    btnStart.addEventListener('click', () => {
        const interval = parseInt(document.getElementById('sim-interval').value);
        if (simulationTimer) clearInterval(simulationTimer);
        
        simulationTimer = setInterval(() => {
            const prob = document.getElementById('sim-probability').value;
            simulatePacket('random', prob); // Uses random corruption, backend respects prob
        }, interval);
        
        btnStart.disabled = true;
        btnStop.disabled = false;
    });

    btnStop.addEventListener('click', () => {
        clearInterval(simulationTimer);
        simulationTimer = null;
        btnStart.disabled = false;
        btnStop.disabled = true;
    });

    // --- API CALLS ---
    function simulatePacket(corruptionType, probability = 100) {
        fetch('/api/simulate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ corruption: corruptionType, probability: probability })
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                updateDashboardWithPacket(data.packet);
                fetchHistory(); // Refresh table & charts
            }
        });
    }

    function fetchHistory() {
        fetch('/api/packets')
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    packetsData = data.packets;
                    renderTable();
                    updateCharts();
                }
            });
            
        fetch('/api/statistics')
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    updateStatistics(data.statistics, data.corruptions);
                }
            });
    }

    // --- DOM UPDATES ---
    function updateDashboardWithPacket(p) {
        // Live Cards
        document.getElementById('current-temp').textContent = p.temperature_received.toFixed(2) + ' °C';
        document.getElementById('current-hum').textContent = p.humidity_received.toFixed(2) + ' %';
        document.getElementById('current-pres').textContent = p.pressure_received.toFixed(2) + ' hPa';
        
        // CRC Panel
        document.getElementById('original-crc').textContent = p.original_crc;
        document.getElementById('calculated-crc').textContent = p.calculated_crc;
        
        const resEl = document.getElementById('crc-result');
        const statEl = document.getElementById('packet-status');
        
        if (p.status === 'VALID') {
            resEl.textContent = 'CRC MATCH';
            resEl.className = 'value font-bold text-success';
            statEl.textContent = 'VALID';
            statEl.className = 'status-indicator VALID';
        } else {
            resEl.textContent = 'CRC MISMATCH';
            resEl.className = 'value font-bold text-danger';
            statEl.textContent = 'CORRUPTED';
            statEl.className = 'status-indicator CORRUPTED';
        }
        
        document.getElementById('corrupted-sensor').textContent = p.corrupted_sensor ? p.corrupted_sensor.toUpperCase() : 'NONE';
    }

    function updateStatistics(stats, corruptions) {
        document.getElementById('stat-total').textContent = stats.total_packets || 0;
        document.getElementById('stat-valid').textContent = stats.valid_packets || 0;
        document.getElementById('stat-corrupted').textContent = stats.corrupted_packets || 0;
        document.getElementById('stat-rate').textContent = (stats.corruption_rate || 0).toFixed(2) + '%';

        // Analytics Summary
        document.getElementById('avg-temp').textContent = (stats.avg_temp||0).toFixed(2);
        document.getElementById('min-temp').textContent = (stats.min_temp||0).toFixed(2);
        document.getElementById('max-temp').textContent = (stats.max_temp||0).toFixed(2);
        
        document.getElementById('avg-hum').textContent = (stats.avg_hum||0).toFixed(2);
        document.getElementById('min-hum').textContent = (stats.min_hum||0).toFixed(2);
        document.getElementById('max-hum').textContent = (stats.max_hum||0).toFixed(2);
        
        document.getElementById('avg-pres').textContent = (stats.avg_pres||0).toFixed(2);
        document.getElementById('min-pres').textContent = (stats.min_pres||0).toFixed(2);
        document.getElementById('max-pres').textContent = (stats.max_pres||0).toFixed(2);
        
        const list = document.getElementById('corruption-breakdown');
        list.innerHTML = '';
        let maxC = 0, mostC = 'None';
        
        corruptions.forEach(c => {
            if (c.count > maxC) { maxC = c.count; mostC = c.corrupted_sensor; }
            list.innerHTML += `<li>${c.corrupted_sensor}: ${c.count}</li>`;
        });
        document.getElementById('most-corrupted').textContent = mostC.toUpperCase();
    }

    // --- TABLE AND FILTERS ---
    const searchInput = document.getElementById('search-id');
    const filterSelect = document.getElementById('filter-status');
    searchInput.addEventListener('input', renderTable);
    filterSelect.addEventListener('change', renderTable);

    function renderTable() {
        const tbody = document.getElementById('packets-body');
        tbody.innerHTML = '';
        
        let filtered = packetsData;
        const q = searchInput.value.trim();
        const f = filterSelect.value;
        
        if (q) filtered = filtered.filter(p => p.packet_id.toString().includes(q));
        if (f !== 'ALL') filtered = filtered.filter(p => p.status === f);
        
        if (filtered.length === 0) {
            tbody.innerHTML = '<tr><td colspan="9" class="text-center">No packets found.</td></tr>';
            return;
        }
        
        filtered.slice(0, 100).forEach(p => {
            const tr = document.createElement('tr');
            tr.onclick = () => showModal(p);
            
            const tempStr = p.status === 'CORRUPTED' && p.corrupted_sensor === 'temperature' 
                ? `<span class="diff-highlight">${p.temperature_received.toFixed(2)}</span>` : p.temperature_received.toFixed(2);
            
            const humStr = p.status === 'CORRUPTED' && p.corrupted_sensor === 'humidity' 
                ? `<span class="diff-highlight">${p.humidity_received.toFixed(2)}</span>` : p.humidity_received.toFixed(2);
                
            const presStr = p.status === 'CORRUPTED' && p.corrupted_sensor === 'pressure' 
                ? `<span class="diff-highlight">${p.pressure_received.toFixed(2)}</span>` : p.pressure_received.toFixed(2);

            tr.innerHTML = `
                <td>${p.packet_id}</td>
                <td>${new Date(p.timestamp).toLocaleTimeString()}</td>
                <td>${tempStr}</td>
                <td>${humStr}</td>
                <td>${presStr}</td>
                <td class="font-mono">${p.original_crc}</td>
                <td class="font-mono">${p.calculated_crc}</td>
                <td><span class="status-badge ${p.status}">${p.status}</span></td>
                <td>${p.corrupted_sensor ? p.corrupted_sensor : '-'}</td>
            `;
            tbody.appendChild(tr);
        });
    }

    // --- MODAL ---
    const modal = document.getElementById('packet-modal');
    document.querySelector('.close-btn').onclick = () => modal.style.display = "none";
    window.onclick = e => { if (e.target == modal) modal.style.display = "none"; }

    function showModal(p) {
        document.getElementById('modal-packet-id').textContent = `#${p.packet_id}`;
        document.getElementById('m-orig-temp').textContent = p.temperature_original;
        document.getElementById('m-orig-hum').textContent = p.humidity_original;
        document.getElementById('m-orig-pres').textContent = p.pressure_original;
        document.getElementById('m-orig-crc').textContent = p.original_crc;
        
        document.getElementById('m-recv-temp').textContent = p.temperature_received;
        document.getElementById('m-recv-hum').textContent = p.humidity_received;
        document.getElementById('m-recv-pres').textContent = p.pressure_received;
        document.getElementById('m-calc-crc').textContent = p.calculated_crc;
        
        const box = document.getElementById('m-status-box');
        box.className = `modal-status mt-2 text-center p-1 rounded ${p.status}`;
        document.getElementById('m-status').textContent = p.status;
        document.getElementById('m-corrupted-sensor').textContent = p.corrupted_sensor ? `Corrupted: ${p.corrupted_sensor}` : 'Valid Packet';
        
        modal.style.display = "block";
    }

    // --- CHARTS ---
    document.getElementById('chart-filter').addEventListener('change', updateCharts);

    function initCharts() {
        const commonOpts = { responsive: true, maintainAspectRatio: false };
        charts.temp = new Chart(document.getElementById('tempChart'), { type: 'line', data: { labels: [], datasets: [{ label: 'Temperature (°C)', borderColor: '#3498db', data: [] }] }, options: commonOpts });
        charts.hum = new Chart(document.getElementById('humChart'), { type: 'line', data: { labels: [], datasets: [{ label: 'Humidity (%)', borderColor: '#2ecc71', data: [] }] }, options: commonOpts });
        charts.pres = new Chart(document.getElementById('presChart'), { type: 'line', data: { labels: [], datasets: [{ label: 'Pressure (hPa)', borderColor: '#9b59b6', data: [] }] }, options: commonOpts });
        charts.status = new Chart(document.getElementById('statusChart'), { type: 'doughnut', data: { labels: ['Valid', 'Corrupted'], datasets: [{ data: [0,0], backgroundColor: ['#2ecc71', '#e74c3c'] }] }, options: commonOpts });
    }

    function updateCharts() {
        if (!packetsData.length) return;
        const limit = parseInt(document.getElementById('chart-filter').value);
        // Packets are descending, so we slice the first N and reverse for chronological
        const slice = packetsData.slice(0, limit).reverse();
        
        const labels = slice.map(p => new Date(p.timestamp).toLocaleTimeString());
        
        charts.temp.data.labels = labels;
        charts.temp.data.datasets[0].data = slice.map(p => p.temperature_received);
        charts.temp.update();
        
        charts.hum.data.labels = labels;
        charts.hum.data.datasets[0].data = slice.map(p => p.humidity_received);
        charts.hum.update();
        
        charts.pres.data.labels = labels;
        charts.pres.data.datasets[0].data = slice.map(p => p.pressure_received);
        charts.pres.update();
        
        const v = slice.filter(p => p.status === 'VALID').length;
        const c = slice.length - v;
        charts.status.data.datasets[0].data = [v, c];
        charts.status.update();
    }

    // --- CSV EXPORT ---
    document.getElementById('export-csv-btn').addEventListener('click', () => {
        if (!packetsData.length) return alert("No data to export");
        
        const headers = ["Packet ID", "Timestamp", "Orig Temp", "Recv Temp", "Orig Hum", "Recv Hum", "Orig Pres", "Recv Pres", "Orig CRC", "Calc CRC", "Status", "Corrupted Sensor"];
        const rows = packetsData.map(p => [
            p.packet_id, p.timestamp, 
            p.temperature_original, p.temperature_received,
            p.humidity_original, p.humidity_received,
            p.pressure_original, p.pressure_received,
            p.original_crc, p.calculated_crc,
            p.status, p.corrupted_sensor || "none"
        ]);
        
        const csvContent = "data:text/csv;charset=utf-8," 
            + headers.join(",") + "\n"
            + rows.map(e => e.join(",")).join("\n");
            
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "iot_sensor_packets.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });
});
