// Side-effect module: enable the Socket.io layer before config is first loaded.
// Imported at the very top of socket.test.js so config.socket.enabled === true.
process.env.ENABLE_SOCKET = 'true';
