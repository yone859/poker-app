// テスト用の小さな静的ファイルサーバー（本番用にビルドした dist/ を配る）。
// 使い方: node serve.mjs <フォルダ> <ポート>
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';

const [dir, port] = process.argv.slice(2);
const root = path.resolve(dir);
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.wav': 'audio/wav', '.ttf': 'font/ttf',
  '.woff2': 'font/woff2',
};

http
  .createServer((req, res) => {
    const url = decodeURIComponent(new URL(req.url ?? '/', 'http://localhost').pathname);
    let file = path.join(root, url);
    // dist/ の外は配らない
    if (!file.startsWith(root)) return void res.writeHead(403).end();
    if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(root, 'index.html');
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] ?? 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  })
  .listen(Number(port), '127.0.0.1', () => console.log(`serving ${root} on http://127.0.0.1:${port}/`));
