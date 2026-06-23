import { spawn } from 'node:child_process';
import { createServer, request as requestHttp } from 'node:http';
import net from 'node:net';
import { join } from 'node:path';

const publicPort = parsePort(process.env.PORT, 8001);
const expoPort = parsePort(
	process.env.EXPO_INTERNAL_PORT,
	publicPort >= 65000 ? publicPort - 1 : publicPort + 1,
);
const expoHost = process.env.EXPO_HOST_TYPE ?? 'lan';
const expoDeepLinkPattern = /\b(?:exp|exps|expo):\/\/[^\s"'<>`]+/i;
const maxExpoOpenResponseBytes = 1024 * 1024;

const expoBinary = process.platform === 'win32'
	? join('node_modules', '.bin', 'expo.cmd')
	: join('node_modules', '.bin', 'expo');

let expoProcessStatus = 'starting';
let expoProcessMessage = 'Expo dev server is starting.';

const expo = spawn(
	expoBinary,
	['start', '--web', '--go', '--host', expoHost, '--port', String(expoPort)],
	{
		env: {
			...process.env,
			BROWSER: process.env.BROWSER ?? 'none',
			PORT: String(expoPort),
		},
		stdio: 'inherit',
	},
);

const server = createServer((req, res) => {
	if (!req.url) {
		res.writeHead(400);
		res.end('Missing request URL');
		return;
	}

	const url = new URL(req.url, `http://${req.headers.host ?? `localhost:${publicPort}`}`);
	if (url.pathname === '/_expo/open') {
		proxyExpoOpenRequest(req, res);
		return;
	}

	if (url.pathname === '/__vibesdk/expo-status') {
		writeExpoStatusResponse(res);
		return;
	}

	proxyHttpRequest(req, res);
});

server.on('upgrade', (req, socket, head) => {
	const upstream = net.connect(expoPort, '127.0.0.1', () => {
		upstream.write(`${req.method} ${req.url} HTTP/${req.httpVersion}\r\n`);
		for (const [name, value] of Object.entries(getExpoProxyHeaders(req))) {
			if (Array.isArray(value)) {
				for (const item of value) upstream.write(`${name}: ${item}\r\n`);
			} else if (value !== undefined) {
				upstream.write(`${name}: ${value}\r\n`);
			}
		}
		upstream.write('\r\n');
		if (head.length > 0) upstream.write(head);
		socket.pipe(upstream).pipe(socket);
	});

	upstream.on('error', () => socket.destroy());
	socket.on('error', () => upstream.destroy());
});

server.on('error', (error) => {
	console.error(error);
	expo.kill('SIGTERM');
	process.exit(1);
});

server.listen(publicPort, '0.0.0.0', () => {
	if (expoProcessStatus === 'starting') {
		expoProcessStatus = 'running';
		expoProcessMessage = 'Expo dev server process is running.';
	}
	const localWebUrl = `http://localhost:${publicPort}`;
	console.log(`Andromo AI builder Expo preview proxy listening on ${localWebUrl}`);
	console.log(`Expo Go link is available from /_expo/open?runtime=expo`);
	console.log(`Expo web server is proxied from http://127.0.0.1:${expoPort}`);
});

expo.on('error', (error) => {
	console.error(error);
	expoProcessStatus = 'error';
	expoProcessMessage = error instanceof Error ? error.message : String(error);
});

expo.on('exit', (code, signal) => {
	expoProcessStatus = 'exited';
	expoProcessMessage = signal
		? `Expo dev server exited with signal ${signal}.`
		: `Expo dev server exited with code ${code ?? 1}.`;
	console.error(expoProcessMessage);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
	process.on(signal, () => {
		server.close(() => process.exit(0));
		expo.kill(signal);
	});
}

function parsePort(value, fallback) {
	const parsed = Number(value);
	if (Number.isInteger(parsed) && parsed > 0 && parsed < 65536) {
		return parsed;
	}
	return fallback;
}

function proxyExpoOpenRequest(req, res) {
	const upstream = requestHttp({
		hostname: '127.0.0.1',
		port: expoPort,
		path: req.url,
		method: req.method,
		headers: getExpoProxyHeaders(req),
	}, (upstreamRes) => {
		const chunks = [];
		let byteLength = 0;
		let tooLarge = false;

		upstreamRes.on('data', (chunk) => {
			byteLength += chunk.byteLength;
			if (byteLength > maxExpoOpenResponseBytes) {
				tooLarge = true;
				upstreamRes.destroy();
				return;
			}
			chunks.push(chunk);
		});

		upstreamRes.on('end', () => {
			if (tooLarge) {
				writeFallbackExpoOpenResponse(req, res);
				return;
			}

			const body = Buffer.concat(chunks).toString('utf8');
			if (isUsableExpoOpenResponse(upstreamRes, body)) {
				res.writeHead(upstreamRes.statusCode ?? 200, upstreamRes.headers);
				res.end(body);
				return;
			}

			writeFallbackExpoOpenResponse(req, res);
		});
	});

	upstream.on('error', () => {
		writeFallbackExpoOpenResponse(req, res);
	});

	upstream.end();
}

function isUsableExpoOpenResponse(upstreamRes, body) {
	const statusCode = upstreamRes.statusCode ?? 502;
	return statusCode >= 200 && statusCode < 300 && expoDeepLinkPattern.test(body);
}

function getExternalBaseUrl(req) {
	const forwardedProto = getForwardedProto(req.headers['x-forwarded-proto']);
	const forwardedHost = getForwardedHeaderValue(req.headers['x-forwarded-host']);
	const proto = forwardedProto ?? 'http';
	const host = forwardedHost ?? getForwardedHeaderValue(req.headers.host) ?? `localhost:${publicPort}`;

	try {
		return new URL(`${proto}://${host}`).origin;
	} catch {
		return `http://localhost:${publicPort}`;
	}
}

function writeFallbackExpoOpenResponse(req, res) {
	const webUrl = getExternalBaseUrl(req);
	const host = new URL(webUrl).host;
	const expoGoUrl = `exp://${host}`;
	const payload = JSON.stringify({
		status: expoProcessStatus,
		expoGoUrl,
		message: expoProcessMessage,
		urls: {
			ios: { deepLink: expoGoUrl },
			android: { deepLink: expoGoUrl },
			web: webUrl,
		},
	});

	res.writeHead(200, {
		'access-control-allow-origin': '*',
		'cache-control': 'no-store',
		'content-type': 'application/json',
	});
	res.end(payload);
}

function writeExpoStatusResponse(res) {
	const payload = JSON.stringify({
		status: expoProcessStatus,
		message: expoProcessMessage,
		publicPort,
		expoPort,
		expoHost,
	});

	res.writeHead(expoProcessStatus === 'starting' ? 202 : 200, {
		'access-control-allow-origin': '*',
		'cache-control': 'no-store',
		'content-type': 'application/json',
	});
	res.end(payload);
}

function proxyHttpRequest(req, res) {
	const upstream = requestHttp({
		hostname: '127.0.0.1',
		port: expoPort,
		path: req.url,
		method: req.method,
		headers: getExpoProxyHeaders(req),
	}, (upstreamRes) => {
		res.writeHead(upstreamRes.statusCode ?? 502, upstreamRes.headers);
		upstreamRes.pipe(res);
	});

	upstream.on('error', () => {
		res.writeHead(503, {
			'content-type': 'text/plain; charset=utf-8',
			'retry-after': '1',
		});
		res.end(`${expoProcessMessage}\n\nThe Andromo AI builder Expo preview proxy is still listening on port ${publicPort}.`);
	});

	req.pipe(upstream);
}

function getHeaderValue(value) {
	if (Array.isArray(value)) return value[0];
	return value;
}

function getForwardedHeaderValue(value) {
	const header = getHeaderValue(value);
	return header?.split(',')[0]?.trim() || undefined;
}

function getForwardedProto(value) {
	const proto = getForwardedHeaderValue(value)?.toLowerCase();
	if (proto === 'http' || proto === 'https') return proto;
	return undefined;
}

function getExpoProxyHeaders(req) {
	const headers = { ...req.headers };
	for (const name of Object.keys(headers)) {
		if (name.toLowerCase().startsWith('x-forwarded-')) {
			delete headers[name];
		}
	}
	headers.host = `127.0.0.1:${expoPort}`;
	headers['accept-encoding'] = 'identity';
	return headers;
}
