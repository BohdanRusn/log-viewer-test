import express from 'express';
import {WebSocketServer} from 'ws';
import fs from 'fs';

const app = express();
const server = app.listen(3005, () => {
	console.log('Server started on port 3005');
});
const maxChunkSize = 64 * 1024; // 64KB chunks

const wss = new WebSocketServer({ server });

const logFilePath = 'build.log';
wss.on('connection', (ws, req) => {
	const socketId = req.socket.remoteAddress + ':' + req.socket.remotePort;
	console.log(`Client connected: ${socketId}`);

	let readStream;
	let startPosition = 0;
	let leftoverLine = '';

	const sendChunk = async () => {
		if (readStream) {
			readStream.destroy();
		}

		readStream = fs.createReadStream(logFilePath, {
			start: startPosition,
			highWaterMark: maxChunkSize,
			encoding: 'utf-8'
		});

		readStream.on('data', (chunk) => {
			if (chunk) {
				ws.send(chunk, {binary: true}, (err) => {
					if (err) {
						console.error(`Error sending data to client ${socketId}:`, err);
						ws.terminate();
					}
				});
				startPosition += chunk.length;
				readStream.destroy();
			}
		});

		readStream.on('end', () => {
			if (leftoverLine.length > 0) {
				ws.send(leftoverLine, { binary: true }, (err) => {
					if (err) {
						console.error(`Error sending data to client ${socketId}:`, err);
						ws.terminate();
					}
				});
			}
			readStream.destroy();
		});

		readStream.on('error', (err) => {
			console.error('Error reading log file:', err);
			ws.terminate();
		});
	};

	ws.on('message', (message) => {
		const messageString = Buffer.from(message).toString();
		if (messageString === 'next') {
			sendChunk();
		}
	});

	ws.on('close', () => {
		console.log(`Client disconnected: ${socketId}`);
		if (readStream) {
			readStream.destroy();
		}
	});

	sendChunk();
});
