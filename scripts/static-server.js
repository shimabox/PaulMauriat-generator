'use strict';

const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');

const rootDirectory = path.resolve(__dirname, '..');
const contentTypes = {
    '.css': 'text/css; charset=utf-8',
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.svg': 'image/svg+xml'
};

const server = http.createServer((request, response) => {
    const url = new URL(request.url, 'http://127.0.0.1');
    const relativePath = url.pathname === '/'
        ? 'index.html'
        : decodeURIComponent(url.pathname).replace(/^\/+/, '');
    const filePath = path.resolve(rootDirectory, relativePath);

    // テスト対象ディレクトリより外側のファイルは公開しない。
    if (!filePath.startsWith(rootDirectory + path.sep)) {
        response.writeHead(403);
        response.end('Forbidden');
        return;
    }

    fs.readFile(filePath, (error, content) => {
        if (error) {
            response.writeHead(error.code === 'ENOENT' ? 404 : 500);
            response.end(error.code === 'ENOENT' ? 'Not Found' : 'Internal Server Error');
            return;
        }

        const contentType = contentTypes[path.extname(filePath)] || 'application/octet-stream';
        response.writeHead(200, { 'Content-Type': contentType });
        response.end(content);
    });
});

server.listen(41739, '127.0.0.1');
