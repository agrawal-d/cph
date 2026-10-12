const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { env } = require('process');

const DEFAULT_PORT = 8090;
const DEFAULT_FEEDBACK_FILE = 'feedback.csv';
const DEFAULT_VIEWER_FILE = 'feedback-viewer.html';
const DEFAULT_EXPECTED_TOKEN = 'iiYNOEs4z1P2y3aGciErN8VAZZUWg4UuIz1pwCWK2n8=';
const DEFAULT_MAX_BODY_BYTES = 64 * 1024;
const DEFAULT_RATE_LIMIT_WINDOW_MS = 60 * 1000;
const DEFAULT_RATE_LIMIT_MAX_REQUESTS = 5;
const DEFAULT_MAX_STORED_IPS = 10000;

const assertReadPasswordConfigured = (password) => {
    if (
        !password ||
        typeof password !== 'string' ||
        password.trim().length === 0
    ) {
        throw new Error(
            'READ_PASSWORD environment variable must be set and non-empty',
        );
    }
    return password;
};

const CONFIG = {
    port: parseInt(env.PORT, 10) || DEFAULT_PORT,
    feedbackFile:
        env.FEEDBACK_FILE || path.join(__dirname, DEFAULT_FEEDBACK_FILE),
    viewerFile: env.VIEWER_FILE || path.join(__dirname, DEFAULT_VIEWER_FILE),
    expectedToken: env.FEEDBACK_TOKEN || DEFAULT_EXPECTED_TOKEN,
    readPassword: assertReadPasswordConfigured(env.READ_PASSWORD),
    maxBodyBytes: parseInt(env.MAX_BODY_BYTES, 10) || DEFAULT_MAX_BODY_BYTES,
    rateLimitWindowMs:
        parseInt(env.RATE_LIMIT_WINDOW_MS, 10) || DEFAULT_RATE_LIMIT_WINDOW_MS,
    rateLimitMaxRequests:
        parseInt(env.RATE_LIMIT_MAX_REQUESTS, 10) ||
        DEFAULT_RATE_LIMIT_MAX_REQUESTS,
    maxStoredIps: parseInt(env.MAX_STORED_IPS, 10) || DEFAULT_MAX_STORED_IPS,
};

const LIMITS = {
    name: { min: 1, max: 100 },
    email: { min: 0, max: 254 },
    comment: { min: 1, max: 2000 },
    token: { min: 1, max: 256 },
    password: { min: 1, max: 256 },
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CSV_FORMULA_REGEX = /^[=+\-@\t\r]/;

const rateLimitStore = new Map();

const constantTimeCompare = (a, b) => {
    if (typeof a !== 'string' || typeof b !== 'string') {
        return false;
    }
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    if (bufA.length !== bufB.length) {
        return false;
    }
    return crypto.timingSafeEqual(bufA, bufB);
};

const getClientIp = (req) => {
    return req.socket.remoteAddress || 'unknown';
};

const isRateLimited = (ip, now = Date.now()) => {
    const entry = rateLimitStore.get(ip);
    if (!entry || now > entry.resetTime) {
        if (rateLimitStore.size >= CONFIG.maxStoredIps) {
            rateLimitStore.clear();
        }
        rateLimitStore.set(ip, {
            count: 1,
            resetTime: now + CONFIG.rateLimitWindowMs,
        });
        return false;
    }
    if (entry.count >= CONFIG.rateLimitMaxRequests) {
        return true;
    }
    entry.count += 1;
    return false;
};

const logRequest = (req, statusCode) => {
    const ip = getClientIp(req);
    console.log(
        `[${new Date().toISOString()}] ${req.method} ${
            req.url
        } ${statusCode} - ${ip}`,
    );
};

const sendResponse = (
    res,
    statusCode,
    body,
    contentType = 'application/json',
    req = null,
) => {
    res.writeHead(statusCode, {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
    });
    res.end(typeof body === 'string' ? body : JSON.stringify(body));
    if (req) {
        logRequest(req, statusCode);
    }
};

const readRequestBody = (req, maxBytes) => {
    return new Promise((resolve, reject) => {
        let body = '';
        let totalBytes = 0;
        req.on('data', (chunk) => {
            totalBytes += chunk.length;
            if (totalBytes > maxBytes) {
                reject(new Error('PAYLOAD_TOO_LARGE'));
                req.destroy();
                return;
            }
            body += chunk;
        });
        req.on('end', () => resolve(body));
        req.on('error', reject);
    });
};

const parseJson = (text) => {
    try {
        const parsed = JSON.parse(text);
        return typeof parsed === 'object' && parsed !== null ? parsed : null;
    } catch {
        return null;
    }
};

const sanitizeInputString = (value) => {
    if (typeof value !== 'string') {
        return '';
    }
    return value.replace(/[\0\x08\x0B\x0C]/g, '').trim();
};

const escapeCsvField = (raw) => {
    let str = raw;
    if (CSV_FORMULA_REGEX.test(str)) {
        str = `'${str}`;
    }
    return `"${str.replace(/"/g, '""')}"`;
};

const validatePayload = (payload) => {
    const name = sanitizeInputString(payload.name);
    const email = sanitizeInputString(payload.email);
    const comment = sanitizeInputString(payload.comment);
    const token = sanitizeInputString(payload.token);

    if (name.length < LIMITS.name.min || name.length > LIMITS.name.max) {
        return { valid: false, error: 'Invalid name' };
    }
    if (email.length > LIMITS.email.max) {
        return { valid: false, error: 'Email too long' };
    }
    if (email.length > 0 && !EMAIL_REGEX.test(email)) {
        return { valid: false, error: 'Invalid email' };
    }
    if (
        comment.length < LIMITS.comment.min ||
        comment.length > LIMITS.comment.max
    ) {
        return { valid: false, error: 'Invalid comment' };
    }
    if (!constantTimeCompare(token, CONFIG.expectedToken)) {
        return { valid: false, error: 'Invalid token' };
    }
    return { valid: true, data: { name, email, comment, token } };
};

const formatCsvRecord = (record) => {
    return (
        [
            escapeCsvField(record.timestamp),
            escapeCsvField(record.name),
            escapeCsvField(record.email),
            escapeCsvField(record.comment),
            escapeCsvField(record.token),
        ].join(',') + '\n'
    );
};

const appendFeedbackToFile = async (filePath, record) => {
    const csvLine = formatCsvRecord(record);
    await fs.promises.appendFile(filePath, csvLine, 'utf8');
};

const parseCsvRows = (text) => {
    const rows = [];
    let currentRow = [];
    let currentField = '';
    let insideQuotes = false;

    for (let i = 0; i < text.length; i++) {
        const char = text[i];

        if (insideQuotes) {
            if (char === '"') {
                if (i + 1 < text.length && text[i + 1] === '"') {
                    currentField += '"';
                    i++;
                } else {
                    insideQuotes = false;
                }
            } else {
                currentField += char;
            }
        } else {
            if (char === '"') {
                insideQuotes = true;
            } else if (char === ',') {
                currentRow.push(currentField);
                currentField = '';
            } else if (char === '\n') {
                currentRow.push(currentField);
                rows.push(currentRow);
                currentRow = [];
                currentField = '';
            } else if (char !== '\r') {
                currentField += char;
            }
        }
    }

    if (currentField.length > 0 || currentRow.length > 0) {
        currentRow.push(currentField);
        rows.push(currentRow);
    }

    return rows;
};

const unescapeCsvPrefix = (val) => {
    if (
        typeof val === 'string' &&
        val.startsWith("'") &&
        CSV_FORMULA_REGEX.test(val.slice(1))
    ) {
        return val.slice(1);
    }
    return val;
};

const parseFeedbackRecord = (row) => {
    if (!Array.isArray(row) || row.length < 5) {
        return null;
    }
    return {
        timestamp: unescapeCsvPrefix(row[0]),
        name: unescapeCsvPrefix(row[1]),
        email: unescapeCsvPrefix(row[2]),
        comment: unescapeCsvPrefix(row[3]),
        token: unescapeCsvPrefix(row[4]),
    };
};

const readAllFeedback = async (filePath) => {
    try {
        const content = await fs.promises.readFile(filePath, 'utf8');
        const rows = parseCsvRows(content);
        const records = [];
        for (const row of rows) {
            const record = parseFeedbackRecord(row);
            if (record) {
                records.push(record);
            }
        }
        return records.reverse();
    } catch (err) {
        if (err.code === 'ENOENT') {
            return [];
        }
        throw err;
    }
};

const handleFeedbackSubmission = async (req, res) => {
    const ip = getClientIp(req);
    if (isRateLimited(ip)) {
        sendResponse(
            res,
            429,
            { error: 'Too many requests' },
            'application/json',
            req,
        );
        return;
    }

    let bodyText;
    try {
        bodyText = await readRequestBody(req, CONFIG.maxBodyBytes);
    } catch {
        sendResponse(
            res,
            413,
            { error: 'Payload too large' },
            'application/json',
            req,
        );
        return;
    }

    const payload = parseJson(bodyText);
    if (!payload) {
        sendResponse(
            res,
            400,
            { error: 'Invalid JSON payload' },
            'application/json',
            req,
        );
        return;
    }

    const validation = validatePayload(payload);
    if (!validation.valid) {
        const statusCode = validation.error === 'Invalid token' ? 403 : 400;
        sendResponse(
            res,
            statusCode,
            { error: validation.error },
            'application/json',
            req,
        );
        return;
    }

    const record = {
        timestamp: new Date().toISOString(),
        ...validation.data,
    };

    try {
        await appendFeedbackToFile(CONFIG.feedbackFile, record);
        sendResponse(res, 200, { success: true }, 'application/json', req);
    } catch {
        sendResponse(
            res,
            500,
            { error: 'Failed to save feedback' },
            'application/json',
            req,
        );
    }
};

const handleFetchFeedback = async (req, res) => {
    const ip = getClientIp(req);
    if (isRateLimited(ip)) {
        sendResponse(
            res,
            429,
            { error: 'Too many requests' },
            'application/json',
            req,
        );
        return;
    }

    let bodyText;
    try {
        bodyText = await readRequestBody(req, CONFIG.maxBodyBytes);
    } catch {
        sendResponse(
            res,
            413,
            { error: 'Payload too large' },
            'application/json',
            req,
        );
        return;
    }

    const payload = parseJson(bodyText);
    if (!payload || typeof payload.password !== 'string') {
        sendResponse(
            res,
            400,
            { error: 'Password is required' },
            'application/json',
            req,
        );
        return;
    }

    if (!constantTimeCompare(payload.password, CONFIG.readPassword)) {
        sendResponse(
            res,
            401,
            { error: 'Invalid password' },
            'application/json',
            req,
        );
        return;
    }

    try {
        const feedbackList = await readAllFeedback(CONFIG.feedbackFile);
        sendResponse(res, 200, feedbackList, 'application/json', req);
    } catch {
        sendResponse(
            res,
            500,
            { error: 'Failed to read feedback' },
            'application/json',
            req,
        );
    }
};

const handleServeViewer = async (req, res) => {
    try {
        const content = await fs.promises.readFile(CONFIG.viewerFile, 'utf8');
        sendResponse(res, 200, content, 'text/html; charset=utf-8', req);
    } catch {
        sendResponse(res, 404, 'Viewer not found', 'text/plain', req);
    }
};

const handleRequest = async (req, res) => {
    if (req.method === 'OPTIONS') {
        sendResponse(res, 204, '', 'application/json', req);
        return;
    }

    const requestUrl = new URL(
        req.url,
        `http://${req.headers.host || 'localhost'}`,
    );
    if (req.method === 'POST' && requestUrl.pathname === '/submit-feedback') {
        await handleFeedbackSubmission(req, res);
        return;
    }

    if (req.method === 'POST' && requestUrl.pathname === '/fetch-feedback') {
        await handleFetchFeedback(req, res);
        return;
    }

    if (
        req.method === 'GET' &&
        (requestUrl.pathname === '/feedback-viewer.html' ||
            requestUrl.pathname === '/')
    ) {
        await handleServeViewer(req, res);
        return;
    }

    sendResponse(res, 404, { error: 'Not found' }, 'application/json', req);
};

const logStartupConfig = () => {
    console.log('Starting Feedback Collector');
    console.log(`Port: ${CONFIG.port}`);
    console.log(`Feedback File: ${CONFIG.feedbackFile}`);
    console.log(`Viewer File: ${CONFIG.viewerFile}`);
    console.log(`Max Body Size: ${CONFIG.maxBodyBytes} bytes`);
    console.log(
        `Rate Limit: ${CONFIG.rateLimitMaxRequests} requests per ${
            CONFIG.rateLimitWindowMs / 1000
        }s`,
    );
    console.log(`Read Password: configured`);
};

const startServer = () => {
    logStartupConfig();
    const server = http.createServer(handleRequest);
    server.listen(CONFIG.port, () => {
        console.log(
            `Feedback Collector listening on http://localhost:${CONFIG.port}`,
        );
    });
    return server;
};

if (require.main === module) {
    startServer();
}

module.exports = {
    CONFIG,
    LIMITS,
    assertReadPasswordConfigured,
    constantTimeCompare,
    isRateLimited,
    rateLimitStore,
    parseJson,
    sanitizeInputString,
    escapeCsvField,
    validatePayload,
    formatCsvRecord,
    appendFeedbackToFile,
    parseCsvRows,
    unescapeCsvPrefix,
    parseFeedbackRecord,
    readAllFeedback,
    handleFeedbackSubmission,
    handleFetchFeedback,
    handleServeViewer,
    handleRequest,
    startServer,
};
