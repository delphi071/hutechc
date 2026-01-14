import http from 'http';
import { readFileSync } from 'fs';
import { join } from 'path';

// api/analyze.js 핸들러를 동적으로 로드 (배포 시에는 Vercel이 처리)
import handler from './api/analyze.js';

const PORT = 3001;

const server = http.createServer(async (req, res) => {
    // CORS 처리
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    // Vercel 핸들러 환경 모사
    if (req.url === '/api/analyze' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', async () => {
            try {
                const mockReq = {
                    method: 'POST',
                    body: JSON.parse(body)
                };
                const mockRes = {
                    status: (code) => ({
                        json: (data) => {
                            res.writeHead(code, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify(data));
                        }
                    })
                };
                await handler(mockReq, mockRes);
            } catch (err) {
                res.writeHead(500);
                res.end(JSON.stringify({ success: false, error: err.message }));
            }
        });
    } else {
        res.writeHead(404);
        res.end(JSON.stringify({ error: 'Not Found' }));
    }
});

server.listen(PORT, () => {
    console.log(`🚀 로컬 API 서버가 http://localhost:${PORT} 에서 실행 중입니다.`);
});
