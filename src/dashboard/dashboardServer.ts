import express, { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { Client } from 'discord.js';
import { config } from '../config/environment';
import { MessageTracker } from '../services/messageTracker';
import { LoggingService } from '../services/loggingService';
import { prisma } from '../database/prisma';

export function startDashboardServer(client: Client, messageTracker: MessageTracker) {
  const app = express();
  app.use(express.json());

  // Enable CORS headers
  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (_req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  // Active auth tokens
  const activeTokens = new Set<string>();

  const createToken = () => `st_auth_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  // Auth Middleware
  const requireAuth = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    const queryToken = req.query.token as string;
    const token = authHeader ? authHeader.replace('Bearer ', '') : queryToken;

    if (token && activeTokens.has(token)) {
      return next();
    }

    return res.status(401).json({ error: 'Unauthorized: Invalid or expired password session' });
  };

  // Login Endpoint
  app.post('/api/login', (req: Request, res: Response) => {
    const { password } = req.body;
    if (password === config.adminPassword) {
      const token = createToken();
      activeTokens.add(token);
      return res.json({ success: true, token });
    }
    return res.status(401).json({ success: false, error: 'Incorrect Admin Password' });
  });

  // Check Auth Token
  app.get('/api/auth/check', requireAuth, (_req: Request, res: Response) => {
    res.json({ valid: true });
  });

  // Statistics Endpoint
  app.get('/api/stats', requireAuth, async (_req: Request, res: Response) => {
    try {
      const mem = process.memoryUsage();
      const dbGuildCount = await prisma.guildConfig.count().catch(() => 0);

      const stats = {
        botStatus: client.user ? 'Online' : 'Offline',
        botTag: client.user ? client.user.tag : 'Not Connected',
        botAvatar: client.user ? client.user.displayAvatarURL() : '',
        guildCount: client.guilds.cache.size,
        dbGuildCount,
        uptimeSeconds: process.uptime(),
        memoryUsageMB: (mem.heapUsed / 1024 / 1024).toFixed(2),
        totalMemoryMB: (mem.heapTotal / 1024 / 1024).toFixed(2),
        dashboardPort: config.dashboardPort,
        nodeVersion: process.version,
      };

      res.json(stats);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Connected Guilds Directory Endpoint
  app.get('/api/guilds', requireAuth, async (_req: Request, res: Response) => {
    try {
      const dbConfigs = await prisma.guildConfig.findMany().catch(() => []);
      const dbConfigMap = new Map(dbConfigs.map(c => [c.guildId, c]));

      const guilds = client.guilds.cache.map(g => {
        const dbConf = dbConfigMap.get(g.id);
        return {
          id: g.id,
          name: g.name,
          memberCount: g.memberCount,
          icon: g.iconURL(),
          joinedAt: g.joinedAt,
          protectedChannelId: dbConf?.protectedChannelId || null,
          enabled: dbConf?.enabled ?? true,
        };
      });

      res.json(guilds);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Logs Reader Endpoint
  app.get('/api/logs', requireAuth, (_req: Request, res: Response) => {
    const logPaths = [
      '/root/.pm2/logs/spam-tracker-out.log',
      '/root/.pm2/logs/spam-tracker-error.log',
      path.join(process.cwd(), 'bot.log')
    ];

    let combinedLogs: string[] = [];

    for (const logPath of logPaths) {
      if (fs.existsSync(logPath)) {
        try {
          const content = fs.readFileSync(logPath, 'utf-8');
          const lines = content.split('\n').filter(Boolean);
          combinedLogs.push(...lines.slice(-100));
        } catch (e) {
          // Ignore read errors
        }
      }
    }

    if (combinedLogs.length === 0) {
      combinedLogs.push(`[INFO] ${new Date().toISOString()} | Dashboard | System active. Listening on port ${config.dashboardPort}`);
    }

    res.json({ logs: combinedLogs.slice(-200) });
  });

  // Bot Controls Endpoint
  app.post('/api/control', requireAuth, (req: Request, res: Response) => {
    const { action } = req.body;

    if (action === 'restart') {
      res.json({ success: true, message: 'Restart command issued via PM2...' });
      setTimeout(() => {
        exec('pm2 restart spam-tracker', () => {});
      }, 500);
      return;
    }

    if (action === 'stop') {
      res.json({ success: true, message: 'Stop command issued via PM2...' });
      setTimeout(() => {
        exec('pm2 stop spam-tracker', () => {});
      }, 500);
      return;
    }

    if (action === 'deploy-commands') {
      exec('npm run deploy-commands', (error, stdout, stderr) => {
        if (error) {
          return res.status(500).json({ success: false, error: stderr || error.message });
        }
        return res.json({ success: true, output: stdout });
      });
      return;
    }

    if (action === 'clear-cache') {
      messageTracker.cleanup();
      return res.json({ success: true, message: 'Message cache cleaned up successfully.' });
    }

    return res.status(400).json({ error: 'Invalid control action' });
  });

  // File Tree Explorer Endpoint
  app.get('/api/files/tree', requireAuth, (_req: Request, res: Response) => {
    const rootDir = process.cwd();

    function getFiles(dir: string, baseDir: string): any[] {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      const results: any[] = [];

      for (const entry of entries) {
        if (['node_modules', 'dist', '.git', '.next'].includes(entry.name)) continue;

        const fullPath = path.join(dir, entry.name);
        const relPath = path.relative(baseDir, fullPath);

        if (entry.isDirectory()) {
          results.push({
            name: entry.name,
            path: relPath,
            isDir: true,
            children: getFiles(fullPath, baseDir)
          });
        } else {
          results.push({
            name: entry.name,
            path: relPath,
            isDir: false
          });
        }
      }
      return results;
    }

    try {
      const tree = getFiles(rootDir, rootDir);
      res.json(tree);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // File Read Endpoint
  app.post('/api/files/read', requireAuth, (req: Request, res: Response) => {
    const { filePath } = req.body;
    if (!filePath) return res.status(400).json({ error: 'File path required' });

    const safePath = path.normalize(path.join(process.cwd(), filePath));
    if (!safePath.startsWith(process.cwd())) {
      return res.status(403).json({ error: 'Forbidden path access' });
    }

    try {
      if (!fs.existsSync(safePath)) {
        return res.status(404).json({ error: 'File not found' });
      }
      const content = fs.readFileSync(safePath, 'utf-8');
      res.json({ filePath, content });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // File Save Endpoint
  app.post('/api/files/save', requireAuth, (req: Request, res: Response) => {
    const { filePath, content } = req.body;
    if (!filePath || content === undefined) return res.status(400).json({ error: 'File path and content required' });

    const safePath = path.normalize(path.join(process.cwd(), filePath));
    if (!safePath.startsWith(process.cwd())) {
      return res.status(403).json({ error: 'Forbidden path access' });
    }

    try {
      fs.writeFileSync(safePath, content, 'utf-8');
      res.json({ success: true, message: `File ${filePath} saved successfully.` });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Serve Main Web Dashboard UI
  app.get('/', (_req: Request, res: Response) => {
    res.setHeader('Content-Type', 'text/html');
    res.send(getDashboardHTML());
  });

  const server = app.listen(config.dashboardPort, () => {
    LoggingService.logInfo('DashboardServer', `Web Admin Console active at http://0.0.0.0:${config.dashboardPort}`);
  });

  return server;
}

function getDashboardHTML(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Spam Tracker — Web Control Panel & Console</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #0b0c10;
      --card-bg: rgba(22, 27, 38, 0.7);
      --card-border: rgba(255, 255, 255, 0.08);
      --accent: #7c3aed;
      --accent-pink: #d946ef;
      --text: #f3f4f6;
      --text-muted: #9ca3af;
      --success: #10b981;
      --danger: #ef4444;
      --warning: #f59e0b;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Inter', sans-serif;
      background: var(--bg);
      color: var(--text);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      overflow-x: hidden;
    }
    .glow-bg {
      position: fixed;
      top: -20%; left: 30%;
      width: 600px; height: 600px;
      background: radial-gradient(circle, rgba(124, 58, 237, 0.15) 0%, rgba(217, 70, 239, 0.08) 50%, transparent 70%);
      filter: blur(80px);
      pointer-events: none;
      z-index: 0;
    }
    header {
      position: relative; z-index: 10;
      padding: 1.25rem 2rem;
      background: rgba(11, 12, 16, 0.8);
      backdrop-filter: blur(16px);
      border-bottom: 1px solid var(--card-border);
      display: flex; justify-content: space-between; align-items: center;
    }
    .logo { display: flex; align-items: center; gap: 0.75rem; font-size: 1.25rem; font-weight: 800; text-decoration: none; color: white; }
    .logo-icon { width: 36px; height: 36px; border-radius: 10px; background: linear-gradient(135deg, var(--accent), var(--accent-pink)); display: flex; align-items: center; justify-content: center; font-size: 1.2rem; }
    .nav-tabs { display: flex; gap: 0.5rem; background: rgba(255,255,255,0.04); padding: 0.25rem; border-radius: 12px; border: 1px solid var(--card-border); }
    .nav-tab { padding: 0.5rem 1rem; font-size: 0.85rem; font-weight: 600; color: var(--text-muted); border: none; background: none; border-radius: 8px; cursor: pointer; transition: all 0.2s; }
    .nav-tab.active { color: white; background: var(--accent); box-shadow: 0 4px 12px rgba(124, 58, 237, 0.3); }

    main { position: relative; z-index: 10; flex: 1; padding: 2rem; max-width: 1400px; margin: 0 auto; width: 100%; }

    /* Login Modal */
    .login-overlay {
      position: fixed; inset: 0; z-index: 100;
      background: rgba(11, 12, 16, 0.95);
      backdrop-filter: blur(20px);
      display: flex; justify-content: center; align-items: center;
    }
    .login-card {
      background: var(--card-bg); border: 1px solid var(--card-border);
      padding: 2.5rem; border-radius: 24px; width: 100%; max-width: 400px; text-center;
      box-shadow: 0 20px 50px rgba(0,0,0,0.5);
    }
    .input-field {
      width: 100%; padding: 0.85rem 1rem; margin: 1.25rem 0;
      background: rgba(255,255,255,0.05); border: 1px solid var(--card-border);
      border-radius: 12px; color: white; font-size: 0.95rem; outline: none; transition: border 0.2s;
    }
    .input-field:focus { border-color: var(--accent); }
    .btn {
      width: 100%; padding: 0.85rem; font-size: 0.95rem; font-weight: 700;
      border: none; border-radius: 12px; cursor: pointer;
      background: linear-gradient(135deg, var(--accent), var(--accent-pink));
      color: white; transition: transform 0.15s, opacity 0.2s;
    }
    .btn:hover { opacity: 0.95; transform: translateY(-1px); }
    .btn-secondary { background: rgba(255,255,255,0.08); border: 1px solid var(--card-border); color: white; }
    .btn-danger { background: var(--danger); }

    /* Cards & Layout */
    .grid-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1.25rem; margin-bottom: 2rem; }
    .card {
      background: var(--card-bg); border: 1px solid var(--card-border);
      border-radius: 20px; padding: 1.5rem; backdrop-filter: blur(12px);
    }
    .stat-val { font-size: 2rem; font-weight: 800; font-family: 'JetBrains Mono', monospace; color: white; margin: 0.5rem 0 0.25rem 0; }
    .stat-lbl { font-size: 0.8rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); }
    
    /* Console Terminal */
    .terminal-window {
      background: #060709; border: 1px solid var(--card-border);
      border-radius: 16px; overflow: hidden; display: flex; flex-direction: column; height: 550px;
    }
    .terminal-header {
      padding: 0.75rem 1.25rem; background: rgba(255,255,255,0.03); border-bottom: 1px solid var(--card-border);
      display: flex; justify-content: space-between; align-items: center; font-family: 'JetBrains Mono', monospace; font-size: 0.8rem; color: var(--text-muted);
    }
    .terminal-body {
      flex: 1; padding: 1.25rem; overflow-y: auto; font-family: 'JetBrains Mono', monospace; font-size: 0.85rem; line-height: 1.6; color: #d1d5db;
    }
    .log-line { margin-bottom: 0.35rem; word-break: break-all; }
    .log-info { color: #60a5fa; }
    .log-error { color: #f87171; }
    .log-warn { color: #fbbf24; }
    .log-protection { color: #c084fc; font-weight: bold; }

    /* Control Panel Buttons */
    .controls-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-top: 1rem; }
    
    /* File Manager */
    .editor-layout { display: grid; grid-template-columns: 280px 1fr; gap: 1.25rem; height: 600px; }
    .file-tree { background: rgba(255,255,255,0.02); border: 1px solid var(--card-border); border-radius: 16px; padding: 1rem; overflow-y: auto; font-family: 'JetBrains Mono', monospace; font-size: 0.85rem; }
    .file-item { padding: 0.4rem 0.6rem; border-radius: 6px; cursor: pointer; color: var(--text-muted); }
    .file-item:hover { background: rgba(255,255,255,0.06); color: white; }
    .file-item.active { background: var(--accent); color: white; }
    .code-editor {
      width: 100%; height: 100%; background: #060709; border: 1px solid var(--card-border); border-radius: 16px;
      padding: 1.25rem; color: #e5e7eb; font-family: 'JetBrains Mono', monospace; font-size: 0.85rem; outline: none; resize: none; line-height: 1.5;
    }

    .status-badge { display: inline-flex; align-items: center; gap: 0.4rem; padding: 0.3rem 0.75rem; border-radius: 20px; font-size: 0.75rem; font-weight: 700; }
    .status-online { background: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.3); }
    
    .tab-content { display: none; }
    .tab-content.active { display: block; }
  </style>
</head>
<body>
  <div class="glow-bg"></div>

  <!-- Login Modal -->
  <div id="loginModal" class="login-overlay">
    <div class="login-card">
      <div class="logo-icon" style="margin: 0 auto 1rem auto;">🛡️</div>
      <h2 style="font-size: 1.5rem; font-weight: 800;">Spam Tracker Console</h2>
      <p style="color: var(--text-muted); font-size: 0.85rem; margin-top: 0.4rem;">Enter admin password to access control panel</p>
      <input type="password" id="adminPasswordInput" class="input-field" placeholder="Admin Password" onkeypress="if(event.key==='Enter') login()">
      <button class="btn" onclick="login()">Authenticate</button>
      <div id="loginError" style="color: var(--danger); font-size: 0.8rem; margin-top: 1rem;"></div>
    </div>
  </div>

  <!-- Header -->
  <header>
    <a href="#" class="logo">
      <div class="logo-icon">🛡️</div>
      <span>Spam Tracker <span style="color: var(--accent-pink); font-family: monospace;">Admin</span></span>
    </a>

    <div class="nav-tabs">
      <button class="nav-tab active" onclick="switchTab('overview', this)">📊 Overview</button>
      <button class="nav-tab" onclick="switchTab('console', this)">💻 Live Console</button>
      <button class="nav-tab" onclick="switchTab('controls', this)">🎮 Bot Controls</button>
      <button class="nav-tab" onclick="switchTab('files', this)">📁 File Manager</button>
      <button class="nav-tab" onclick="switchTab('guilds', this)">📜 Guilds</button>
    </div>

    <div>
      <span id="botStatusBadge" class="status-badge status-online">● Bot Online</span>
    </div>
  </header>

  <main>
    <!-- TAB 1: OVERVIEW -->
    <div id="tab-overview" class="tab-content active">
      <div class="grid-stats">
        <div class="card">
          <div class="stat-lbl">Connected Guilds</div>
          <div class="stat-val" id="statGuilds">0</div>
          <div style="font-size: 0.75rem; color: var(--text-muted);" id="statDbGuilds">Database configs: 0</div>
        </div>
        <div class="card">
          <div class="stat-lbl">Process Uptime</div>
          <div class="stat-val" id="statUptime">0m</div>
          <div style="font-size: 0.75rem; color: var(--text-muted);" id="statNodeVer">Node v22</div>
        </div>
        <div class="card">
          <div class="stat-lbl">Memory Heap</div>
          <div class="stat-val" id="statMemory">0 MB</div>
          <div style="font-size: 0.75rem; color: var(--text-muted);" id="statTotalMem">Allocated: 0 MB</div>
        </div>
        <div class="card">
          <div class="stat-lbl">Bot Tag</div>
          <div class="stat-val" style="font-size: 1.25rem; margin-top: 0.8rem;" id="statBotTag">Loading...</div>
          <div style="font-size: 0.75rem; color: var(--success);" id="statBotStatus">Status: Active</div>
        </div>
      </div>

      <div class="card" style="margin-top: 1rem;">
        <h3 style="font-size: 1.1rem; font-weight: 700; margin-bottom: 1rem;">System Overview</h3>
        <p style="color: var(--text-muted); font-size: 0.9rem; line-height: 1.6;">
          Spam Tracker is running on process ID <code>spam-tracker</code> via PM2. The live system automatically monitors protected honeypot channels across all servers and purges recent spam activity. Use the Live Console tab to view real-time log outputs or Bot Controls to restart services.
        </p>
      </div>
    </div>

    <!-- TAB 2: LIVE CONSOLE -->
    <div id="tab-console" class="tab-content">
      <div class="terminal-window">
        <div class="terminal-header">
          <span>CONSOLE LOG STREAM — /root/.pm2/logs/spam-tracker-out.log</span>
          <div>
            <button onclick="fetchLogs()" style="background: none; border: none; color: var(--accent-pink); cursor: pointer; font-size: 0.8rem; margin-right: 1rem;">🔄 Refresh Logs</button>
            <button onclick="clearTerminal()" style="background: none; border: none; color: var(--text-muted); cursor: pointer; font-size: 0.8rem;">🧹 Clear Screen</button>
          </div>
        </div>
        <div class="terminal-body" id="terminalBody">
          <div class="log-line log-info">[SYSTEM] Initializing console stream connection...</div>
        </div>
      </div>
    </div>

    <!-- TAB 3: CONTROLS -->
    <div id="tab-controls" class="tab-content">
      <div class="card">
        <h3 style="font-size: 1.2rem; font-weight: 700; margin-bottom: 0.5rem;">Bot Process Management</h3>
        <p style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: 1.5rem;">Execute process control commands directly on VPS PM2 process engine.</p>
        
        <div class="controls-grid">
          <button class="btn" onclick="executeControl('restart')">🔄 Restart Bot</button>
          <button class="btn btn-secondary" onclick="executeControl('deploy-commands')">🚀 Deploy Slash Commands</button>
          <button class="btn btn-secondary" onclick="executeControl('clear-cache')">🧹 Clear Message Cache</button>
          <button class="btn btn-danger" onclick="executeControl('stop')">⏹ Stop Bot Process</button>
        </div>

        <div id="controlOutput" style="margin-top: 1.5rem; font-family: monospace; font-size: 0.85rem; background: rgba(0,0,0,0.4); padding: 1rem; border-radius: 12px; border: 1px solid var(--card-border); display: none;"></div>
      </div>
    </div>

    <!-- TAB 4: FILE MANAGER -->
    <div id="tab-files" class="tab-content">
      <div class="editor-layout">
        <div class="file-tree" id="fileTree">Loading file directory...</div>
        <div style="display: flex; flex-direction: column; gap: 0.75rem;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span id="activeFilePath" style="font-family: monospace; font-size: 0.85rem; color: var(--accent-pink);">Select a file to edit</span>
            <button class="btn" style="width: auto; padding: 0.4rem 1.25rem; font-size: 0.8rem;" onclick="saveCurrentFile()">💾 Save File Changes</button>
          </div>
          <textarea id="codeEditor" class="code-editor" placeholder="File contents will appear here..."></textarea>
        </div>
      </div>
    </div>

    <!-- TAB 5: GUILDS -->
    <div id="tab-guilds" class="tab-content">
      <div class="card">
        <h3 style="font-size: 1.2rem; font-weight: 700; margin-bottom: 1rem;">Active Connected Guilds</h3>
        <div id="guildsList" style="display: flex; flex-direction: column; gap: 0.75rem;">Loading guilds...</div>
      </div>
    </div>
  </main>

  <script>
    let authToken = localStorage.getItem('st_admin_token') || '';
    let currentEditingPath = '';

    async function login() {
      const passwordInput = document.getElementById('adminPasswordInput');
      const password = passwordInput ? passwordInput.value.trim() : '';
      const errDiv = document.getElementById('loginError');
      if (errDiv) errDiv.innerText = '';

      if (!password) {
        if (errDiv) errDiv.innerText = 'Please enter admin password';
        return;
      }

      try {
        const res = await fetch('/api/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password })
        });
        const data = await res.json();
        if (data.success && data.token) {
          authToken = data.token;
          localStorage.setItem('st_admin_token', authToken);
          document.getElementById('loginModal').style.display = 'none';
          loadDashboardData();
        } else {
          if (errDiv) errDiv.innerText = data.error || 'Incorrect Password';
        }
      } catch (e) {
        if (errDiv) errDiv.innerText = 'Connection error: ' + e.message;
      }
    }

    async function checkAuth() {
      if (!authToken) return false;
      try {
        const res = await fetch('/api/auth/check', {
          headers: { 'Authorization': 'Bearer ' + authToken }
        });
        return res.ok;
      } catch (e) {
        return false;
      }
    }

    async function initDashboard() {
      if (authToken) {
        const authed = await checkAuth();
        if (authed) {
          document.getElementById('loginModal').style.display = 'none';
          loadDashboardData();
          return;
        }
      }
      document.getElementById('loginModal').style.display = 'flex';
    }

    function loadDashboardData() {
      fetchStats();
      fetchLogs();
      fetchFileTree();
      fetchGuilds();

      if (!window.statsInterval) {
        window.statsInterval = setInterval(fetchStats, 4000);
        window.logsInterval = setInterval(fetchLogs, 3000);
      }
    }

    function switchTab(tabId, btnEl) {
      document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      
      if (btnEl) btnEl.classList.add('active');
      const target = document.getElementById('tab-' + tabId);
      if (target) target.classList.add('active');
    }

    async function fetchStats() {
      try {
        const res = await fetch('/api/stats', { headers: { 'Authorization': 'Bearer ' + authToken } });
        if (!res.ok) return;
        const data = await res.json();
        document.getElementById('statGuilds').innerText = data.guildCount;
        document.getElementById('statDbGuilds').innerText = 'Database configs: ' + data.dbGuildCount;
        document.getElementById('statUptime').innerText = Math.floor(data.uptimeSeconds / 60) + 'm ' + Math.floor(data.uptimeSeconds % 60) + 's';
        document.getElementById('statMemory').innerText = data.memoryUsageMB + ' MB';
        document.getElementById('statTotalMem').innerText = 'Allocated: ' + data.totalMemoryMB + ' MB';
        document.getElementById('statBotTag').innerText = data.botTag;
      } catch (e) {}
    }

    async function fetchLogs() {
      try {
        const res = await fetch('/api/logs', { headers: { 'Authorization': 'Bearer ' + authToken } });
        if (!res.ok) return;
        const data = await res.json();
        const body = document.getElementById('terminalBody');
        body.innerHTML = '';
        data.logs.forEach(line => {
          const div = document.createElement('div');
          div.className = 'log-line';
          if (line.includes('[ERROR]')) div.className += ' log-error';
          else if (line.includes('[WARNING]')) div.className += ' log-warn';
          else if (line.includes('[PROTECTION]')) div.className += ' log-protection';
          else if (line.includes('[INFO]')) div.className += ' log-info';
          div.innerText = line;
          body.appendChild(div);
        });
        body.scrollTop = body.scrollHeight;
      } catch (e) {}
    }

    function clearTerminal() {
      document.getElementById('terminalBody').innerHTML = '';
    }

    async function executeControl(action) {
      const outDiv = document.getElementById('controlOutput');
      outDiv.style.display = 'block';
      outDiv.innerText = 'Executing action: ' + action + '...';

      try {
        const res = await fetch('/api/control', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + authToken
          },
          body: JSON.stringify({ action })
        });
        const data = await res.json();
        outDiv.innerText = JSON.stringify(data, null, 2);
      } catch (e) {
        outDiv.innerText = 'Error executing control action: ' + e.message;
      }
    }

    async function fetchFileTree() {
      try {
        const res = await fetch('/api/files/tree', { headers: { 'Authorization': 'Bearer ' + authToken } });
        if (!res.ok) return;
        const tree = await res.json();
        const treeDiv = document.getElementById('fileTree');
        treeDiv.innerHTML = renderTree(tree);
      } catch (e) {}
    }

    function renderTree(nodes) {
      let html = '<ul style="list-style: none; padding-left: 0.5rem;">';
      nodes.forEach(node => {
        if (node.isDir) {
          html += '<li style="margin: 0.2rem 0;">📁 <strong>' + node.name + '</strong>' + renderTree(node.children) + '</li>';
        } else {
          const safePath = encodeURIComponent(node.path);
          html += '<li class="file-item" data-path="' + safePath + '" onclick="onFileClick(this)">📄 ' + node.name + '</li>';
        }
      });
      html += '</ul>';
      return html;
    }

    function onFileClick(el) {
      const path = decodeURIComponent(el.getAttribute('data-path'));
      openFile(path);
    }

    async function openFile(filePath) {
      currentEditingPath = filePath;
      document.getElementById('activeFilePath').innerText = 'Editing: ' + filePath;
      try {
        const res = await fetch('/api/files/read', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + authToken
          },
          body: JSON.stringify({ filePath })
        });
        const data = await res.json();
        document.getElementById('codeEditor').value = data.content || '';
      } catch (e) {
        alert('Failed to read file');
      }
    }

    async function saveCurrentFile() {
      if (!currentEditingPath) return alert('No file selected');
      const content = document.getElementById('codeEditor').value;
      try {
        const res = await fetch('/api/files/save', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + authToken
          },
          body: JSON.stringify({ filePath: currentEditingPath, content })
        });
        const data = await res.json();
        alert(data.message || 'Saved!');
      } catch (e) {
        alert('Error saving file');
      }
    }

    async function fetchGuilds() {
      try {
        const res = await fetch('/api/guilds', { headers: { 'Authorization': 'Bearer ' + authToken } });
        if (!res.ok) return;
        const guilds = await res.json();
        const div = document.getElementById('guildsList');
        div.innerHTML = '';
        guilds.forEach(g => {
          const item = document.createElement('div');
          item.style.cssText = 'background: rgba(255,255,255,0.03); border: 1px solid var(--card-border); padding: 1rem; border-radius: 12px; display: flex; justify-content: space-between; align-items: center;';
          item.innerHTML = '<div><strong style="font-size: 1rem;">' + g.name + '</strong> <span style="font-size: 0.8rem; color: var(--text-muted);">(' + g.id + ')</span><div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.2rem;">Members: ' + g.memberCount + ' | Channel: ' + (g.protectedChannelId ? g.protectedChannelId : 'Not Configured') + '</div></div><span class="status-badge status-online">Protected</span>';
          div.appendChild(item);
        });
      } catch (e) {}
    }

    initDashboard();
  </script>
</body>
</html>`;
}
