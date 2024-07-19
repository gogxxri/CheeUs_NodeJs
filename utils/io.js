const socketIo = require('socket.io');

module.exports = function (io) {
    io.on('connection', (socket) => {
        console.log('클라이언트가 연결되었습니다:', socket.id);

        socket.on('sendMessage', (message) => {
            console.log('클라이언트로부터 수신된 메시지:', message);
            io.emit('receiveMessage', message);
        });

        socket.on('disconnect', () => {
            console.log('클라이언트가 연결을 끊었습니다:', socket.id);
        });
    });
};
