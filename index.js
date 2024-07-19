const { createServer } = require('http');
const expressApp = require('./server'); // Express 앱 가져오기
const { Server } = require('socket.io');
require('dotenv').config();

const httpServer = createServer(expressApp); // Express 서버를 HTTP 서버로 래핑

const io = new Server(httpServer, {
    cors: {
        origin: "http://localhost:3000",
        methods: ["GET", "POST"]
    }
});

require('./utils/io')(io); // 소켓 설정 파일에 io 객체를 전달

httpServer.listen(process.env.SERVER_PORT || 8888, () => {
    console.log(`>>>> Server is running on http://localhost:${process.env.SERVER_PORT || 8888} <<<<`);
});
