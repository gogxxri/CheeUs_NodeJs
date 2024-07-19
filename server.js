require('dotenv').config();

const express = require('express');
const { MongoClient } = require('mongodb');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const port = 8888;
const uri = process.env.MONGODB_URI; // 환경변수에서 MongoDB URI 가져오기
const dbName = process.env.DB_NAME; 

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
let db;

// Middleware 설정
app.use(cors());
app.use(bodyParser.json());

// MongoDB 연결 함수
async function connectMongoDB() {
    try {
        await client.connect();
        console.log('>>>> Connected to MongoDB <<<<');
        db = client.db(dbName);
    } catch (error) {
        console.error('>>>> Failed to connect to MongoDB', error);
        process.exit(1); // MongoDB 연결 실패 시 서버 종료
    }
}
app.get('/api/messages/:roomId', async (req, res) => {
    const roomId = parseInt(req.params.roomId, 10); 
    try {
        const messages = await db.collection('ChatMessages').find({ chat_room_id: roomId }).toArray();
        res.json(messages);
    } catch (error) {
        console.error('Error fetching messages:', error);
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
});

// 채팅방 목록과 메시지 조인해서 가져오기
app.get('/api/chatRooms', async (req, res) => {
    try {
        const pipeline = [
            {
                $lookup: {
                    from: 'ChatMessages',
                    localField: 'id',
                    foreignField: 'chat_room_id',
                    as: 'messages'
                }
            },
            {
                $project: {
                    _id: 0,
                    roomId: '$id',
                    member1: 1,
                    member2: 1,
                    messages: {
                        $map: {
                            input: '$messages',
                            as: 'message',
                            in: {
                                senderId: '$$message.sender_id',
                                message: '$$message.message',
                                writeDay: '$$message.write_day',
                                read: '$$message.read'
                            }
                        }
                    }
                }
            }
        ];

        const chatRooms = await db.collection('ChatRooms').aggregate(pipeline).toArray();
        res.json(chatRooms);
    } catch (error) {
        console.error('>>>>Error fetching chat rooms:', error);
        res.status(500).json({ error: '>>>>Failed to fetch chat rooms' });
    }
});

// 메시지 전송하기
app.post('/api/messages', async (req, res) => {
    const newMessage = req.body;
    try {
        const result = await db.collection('ChatMessages').insertOne(newMessage);
        console.log('Message sent:', result.insertedId);
        res.status(201).json({ message: '>>>>Message sent successfully' });
    } catch (error) {
        console.error('>>>>Error sending message:', error);
        res.status(500).json({ error: '>>>>Failed to send message' });
    }
});

// 서버 시작 및 MongoDB 연결
async function startServer() {
    try {
        await connectMongoDB();
        app.listen(port, () => {
            console.log(`>>>>Server is running on http://localhost:${port} <<<<`);
        });
    } catch (error) {
        console.error('>>>> Failed to start server:', error);
        process.exit(1);
    }
}

startServer();