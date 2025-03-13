import { io } from 'socket.io-client';

// Create socket instance
const socket = io('http://localhost:5000', {
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});

// Socket event listeners
const socketService = {
  // Connect to socket
  connect: () => {
    if (!socket.connected) {
      socket.connect();
    }
  },

  // Disconnect from socket
  disconnect: () => {
    if (socket.connected) {
      socket.disconnect();
    }
  },

  // Listen for segment progress updates
  onSegmentProgress: (callback) => {
    socket.on('segmentProgress', callback);
    return () => socket.off('segmentProgress', callback);
  },

  // Listen for segment completion
  onSegmentComplete: (callback) => {
    socket.on('segmentComplete', callback);
    return () => socket.off('segmentComplete', callback);
  },

  // Listen for processing completion
  onProcessingComplete: (callback) => {
    socket.on('processingComplete', callback);
    return () => socket.off('processingComplete', callback);
  },
  
  // Listen for processing errors
  onProcessingError: (callback) => {
    socket.on('processingError', callback);
    return () => socket.off('processingError', callback);
  },
};

export default socketService; 