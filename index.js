const {createServer} = require("http");
const app = require("./server");
const {Server} = require("socket.io"); // 웹 소켓

require('dotenv').config();

const httpServer = createServer(app);// app에 있는 DB 연결 부분을 올린다.

const io = new Server(httpServer,{ // 웹 소켓 서버 생성
    cors:{ // 웹 소켓도 app.js 처럼 cors 설정을 해줘야 한다. 허락한 대상만 통신할 수 있도록  
        origin: "http://localhost:3000" // 프론트엔드 주소
    },
});

require("./utils/io")(io); //io 매개변수를 io.js에서 가져옴

httpServer.listen(process.env.SERVER_PORT, ()=>{ // 앱 서버
    console.log(">>>>소켓 Server listening on port:", process.env.SERVER_PORT)
});

