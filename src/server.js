// Plain Node.js server, no Express
const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

// --- API Key Management ---
const apiKeys = new Map(); // key: apiKey, value: {used: boolean}

const mimeTypes = {
    '.ico': 'image/x-icon',
    '.html': 'text/html',
    '.ttf': 'font/ttf',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.txt': 'text/plain',
};

// --- Security: allowed static roots ---
const STATIC_ROOTS = [
    path.resolve(__dirname, '../public'),
    path.resolve(__dirname, '../'), // for index.html
];

function isPathAllowed(resolvedPath) {
    return STATIC_ROOTS.some(root => resolvedPath.startsWith(root));
}

function sendSecurityHeaders(res) {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Content-Security-Policy', "default-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data:");
}

// --- CORS Helper ---
function setCORSHeaders(res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'X-API-Key, Content-Type');
}

// --- Static File Serving ---
function serveStaticFile(res, filePath) {
    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.writeHead(404, {'Content-Type': 'text/plain'});
            res.end('404 Not Found');
        } else {
            const ext = path.extname(filePath);
            const mimeType = mimeTypes[ext] || 'application/octet-stream';
            res.writeHead(200, {
                'Content-Type': mimeType,
                'Cache-Control': 'public, max-age=31536000, immutable'
            });
            res.end(data);
        }
    });
}

// --- Dynamic Client Script Serving ---
function serveClientScript(res) {
    const apiKey = [...Array(32)].map(() => Math.floor(Math.random() * 16).toString(16)).join('');
    apiKeys.set(apiKey, {used: false});
    fs.readFile(path.join(__dirname, '../public/client.js'), 'utf8', (err, content) => {
        if (err) {
            res.writeHead(404, {'Content-Type': 'text/plain'});
            res.end('404 Not Found');
        } else {
            res.writeHead(200, {'Content-Type': 'application/javascript'});
            res.end(`window.__API_KEY__ = '${apiKey}';\n` + content);
        }
    });
}

// --- API Request Handling ---
function serveApiRequest(apiKey, ip, res) {
    // Wrap each character of the IP in <i> tags (no class)
    if (!apiKey || !apiKeys.has(apiKey) || apiKeys.get(apiKey).used) {
        res.writeHead(403, {'Content-Type': 'text/plain'});
        res.end('Forbidden: Invalid or used API key');
    } else {
        const ipHtml = String(ip).split('').map(char => `<i>${char}</i>`).join('');
        res.writeHead(200, {'Content-Type': 'text/html'});
        res.end(ipHtml);
    }
    apiKeys.delete(apiKey)
}

// --- Main Server Logic ---
const PORT = process.env.PORT || 80;

const server = http.createServer((req, res) => {
    try {
        const parsedUrl = url.parse(req.url);
        sendSecurityHeaders(res);
        setCORSHeaders(res);

        // --- Security: Robust IP extraction ---
        let ipList = req.headers['x-forwarded-for']?.split(',').map(ip => ip.trim()) || [];
        ipList.push(req.socket.remoteAddress);
        const ipv4 = ipList.find(ip =>
            /^\d{1,3}(?:\.\d{1,3}){3}$/.test(ip) ||
            /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/.test(ip)
        );
        const ip = ipv4 || ipList[0] || '';

        // --- Serve dynamic client.js with an injected API key ---
        if (parsedUrl.pathname === '/public/client.js') {
            serveClientScript(res);
            return;
        }

        // --- Handle API requests ---
        if (parsedUrl.pathname === '/api/ip') {
            serveApiRequest(req.headers['x-api-key'], ip, res);
            return;
        }
        // --- Security: Path traversal protection ---
        let filePath = '.' + parsedUrl.pathname;
        if (filePath === './') filePath = './index.html';

        // Serve from public/ and assets/ if a path starts with /public or /assets
        if (filePath.startsWith('./public/')) {
            filePath = path.join(__dirname, '../public', filePath.replace('./public/', ''));
        } else if (filePath.startsWith('./assets/')) {
            filePath = path.join(__dirname, '../assets', filePath.replace('./assets/', ''));
        } else if (filePath === './index.html') {
            filePath = path.join(__dirname, '../index.html');
        } else if (filePath === './robots.txt') {
            filePath = path.join(__dirname, '../robots.txt');
        }
        // Normalize and resolve a path
        const resolvedPath = path.resolve(filePath);
        if (!isPathAllowed(resolvedPath)) {
            res.writeHead(403, {'Content-Type': 'text/plain'});
            res.end('Forbidden');
            return;
        }
        serveStaticFile(res, resolvedPath);
    } catch {
        res.writeHead(500, {'Content-Type': 'text/plain'});
        res.end('Internal Server Error');
    }
});

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
