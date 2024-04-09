export const createWebSocketConnection = (onMessage: (data: string[]) => void) => {
	const socket = new WebSocket('ws://localhost:3005');
	
	socket.onopen = () => {
		console.log('WebSocket connection established');
	};
	
	socket.onmessage = (event) => {
		if (event.data instanceof Blob) {
			// If the received data is a binary blob
			const reader = new FileReader();
			
			reader.onload = () => {
				const arrayBuffer = reader.result as ArrayBuffer;
				const uint8Array = new Uint8Array(arrayBuffer);
				const decoder = new TextDecoder('utf-8'); // or other encoding
				const decodedString = decoder.decode(uint8Array);
				onMessage(decodedString.split(/\r?\n/));
			};
			
			reader.onerror = (error) => {
				console.error('Error reading binary data:', error);
			};
			
			reader.readAsArrayBuffer(event.data);
		} else {
			// If the received data is a string
			onMessage(event.data);
		}
	};
	
	socket.onclose = () => {
		console.log('WebSocket connection closed');
	};
	
	return socket;
};
