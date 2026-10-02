let io;

const setSocketServer = (server) => { io = server };
const getSocketServer = () => io;

module.exports = { setSocketServer, getSocketServer };