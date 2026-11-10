/**
 * ==========================================================================
 * 로컬 개발용 경량 Node.js 서버 (server.js)
 * ==========================================================================
 * [특징]
 * - 외부 npm 패키지 설치 필요 없음 (Node.js 순수 내장 http, fs, path 모듈만 사용)
 * - .env.local 파일을 자동으로 읽어 process.env에 환경변수 주입
 * - 정적 파일 (index.html, style.css, script.js, manifest.json 등) 정확한 MIME 타입 매핑 서빙
 * - Vercel 서버리스 함수 규격(api/*.js)을 로컬에서 동일하게 라우팅 및 실행
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

// 1. .env.local 파일 파싱 및 process.env 로드
function loadEnvLocal() {
  const envPath = path.join(__dirname, '.env.local');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    content.split(/\r?\n/).forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const eqIndex = trimmed.indexOf('=');
      if (eqIndex > 0) {
        const key = trimmed.slice(0, eqIndex).trim();
        const value = trimmed.slice(eqIndex + 1).trim();
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    });
    console.log('✅ [.env.local] 환경 변수가 성공적으로 로드되었습니다.');
  } else {
    console.warn('⚠️ [.env.local] 파일이 존재하지 않습니다.');
  }
}

loadEnvLocal();

const PORT = process.env.PORT || 3000;

// 정적 파일 MIME 타입 매핑
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

// 안전한 파일 경로 탐색 유틸리티
function resolveStaticFilePath(pathname) {
  const cleanPath = (pathname === '/' || !pathname) ? 'index.html' : pathname.replace(/^\/+/, '');
  
  // 1순위: __dirname 기준
  const path1 = path.join(__dirname, cleanPath);
  if (fs.existsSync(path1) && fs.statSync(path1).isFile()) {
    return path1;
  }

  // 2순위: process.cwd() 기준
  const path2 = path.join(process.cwd(), cleanPath);
  if (fs.existsSync(path2) && fs.statSync(path2).isFile()) {
    return path2;
  }

  // 기본 반환
  return path1;
}

// 2. HTTP 서버 생성
const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = decodeURIComponent(parsedUrl.pathname);

  // ------------------------------------------------------------------------
  // A. Vercel 서버리스 함수 라우팅 (/api/*)
  // ------------------------------------------------------------------------
  if (pathname.startsWith('/api/')) {
    const apiName = pathname.replace('/api/', '').split('?')[0];
    const apiFilePath = path.join(__dirname, 'api', `${apiName}.js`);

    if (fs.existsSync(apiFilePath)) {
      let bodyData = '';
      req.on('data', (chunk) => {
        bodyData += chunk;
      });

      req.on('end', async () => {
        try {
          if (bodyData && req.headers['content-type']?.includes('application/json')) {
            req.body = JSON.parse(bodyData);
          } else {
            req.body = {};
          }
        } catch (e) {
          req.body = {};
        }

        res.status = function (statusCode) {
          res.statusCode = statusCode;
          return res;
        };

        res.json = function (data) {
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(JSON.stringify(data));
          return res;
        };

        try {
          delete require.cache[require.resolve(apiFilePath)];
          const handler = require(apiFilePath);
          await handler(req, res);
        } catch (handlerErr) {
          console.error('[API Error in Server]', handlerErr);
          res.status(500).json({
            success: false,
            message: '서버 내부 오류: ' + handlerErr.message
          });
        }
      });
      return;
    } else {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ success: false, message: 'API 엔드포인트를 찾을 수 없습니다.' }));
      return;
    }
  }

  // ------------------------------------------------------------------------
  // B. 정적 파일 서빙 (Windows & Linux 경로 완벽 호환)
  // ------------------------------------------------------------------------
  const filePath = resolveStaticFilePath(pathname);

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      console.warn(`[404 Not Found] ${pathname} -> ${filePath}`);
      res.statusCode = 404;
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.end('404 Not Found - 요청한 파일을 찾을 수 없습니다: ' + pathname);
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.statusCode = 200;
    res.setHeader('Content-Type', contentType);

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });
});

// 서버 구동
server.listen(PORT, '0.0.0.0', () => {
  console.log(`====================================================`);
  console.log(`🥗 냉장고 파먹기 AI 로컬 서버가 시작되었습니다!`);
  console.log(`👉 브라우저 접속 주소: http://localhost:${PORT}`);
  console.log(`====================================================`);
});
