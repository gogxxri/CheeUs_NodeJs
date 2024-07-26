require('dotenv').config();

const express = require('express');
const { MongoClient } = require('mongodb');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const port = 8889;
const uri = process.env.MONGODB_URI;
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
        process.exit(1);
    }
}

// 1:1 채팅 메시지 조회 API
app.get('/api/messages/:roomId', async (req, res) => {
    const roomId = parseInt(req.params.roomId, 10); 
    try {
        const messages = await db.collection('oneone_chat_messages').find({ chat_room_id: roomId }).toArray();
        res.json(messages);
    } catch (error) {
        console.error('Error fetching messages:', error);
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
});

// 1:1 채팅방 조회 API
app.get('/api/chatRooms', async (req, res) => {
    try {
        const pipeline = [
            {
                $lookup: {
                    from: 'oneone_chat_messages',
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

        const oneChatRooms = await db.collection('oneone_chat_rooms').aggregate(pipeline).toArray();
        res.json(oneChatRooms);
    } catch (error) {
        console.error('>>>>Error fetching chat rooms:', error);
        res.status(500).json({ error: '>>>>Failed to fetch chat rooms' });
    }
});

// 1:1 채팅 메시지 생성 API
app.post('/api/messages', async (req, res) => {
    const newMessage = req.body;
    try {
        const result = await db.collection('oneone_chat_messages').insertOne(newMessage);
        console.log('>>>>Message sent:', result.insertedId);
        res.status(201).json({ message: '>>>>Message sent successfully' });
    } catch (error) {
        console.error('>>>>Error sending message:', error);
        res.status(500).json({ error: '>>>>Failed to send message' });
    }
});

// 단체 채팅 메시지 조회 API
app.get('/api/togetherMessages/:roomId', async (req, res) => {
    const roomId = parseInt(req.params.roomId, 10);
    try {
        const messages = await db.collection('together_chat_messages').find({ room_id: roomId }).toArray();
        res.json(messages);
    } catch (error) {
        console.error('Error fetching messages:', error);
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
});

// 단체 채팅방 조회 API
app.get('/api/togetherChatRooms', async (req, res) => {
    try {
        const pipeline = [
            {
                $lookup: {
                    from: 'together_chat_messages',
                    localField: 'id',
                    foreignField: 'room_id',
                    as: 'messages'
                }
            },
            {
                $project: {
                    _id: 0,
                    roomId: '$id',
                    togetherId: '$together_id', 
                    members: 1,
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

        const togetherChatRooms = await db.collection('together_chat_rooms').aggregate(pipeline).toArray();
        res.json(togetherChatRooms);
    } catch (error) {
        console.error('Error fetching chat rooms:', error);
        res.status(500).json({ error: 'Failed to fetch chat rooms' });
    }
});

// 단체 채팅 메시지 생성 API
app.post('/api/togetherMessages', async (req, res) => {
    const newMessage = req.body;
    try {
        const result = await db.collection('together_chat_messages').insertOne(newMessage);
        console.log('>>>>Message sent:', result.insertedId);
        res.status(201).json({ message: '>>>>Message sent successfully' });
    } catch (error) {
        console.error('>>>>Error sending message:', error);
        res.status(500).json({ error: '>>>>Failed to send message' });
    }
});

// 1:1 메시지 읽음 상태 업데이트
app.put('/api/messages/:roomId/read', async (req, res) => {
    const { roomId } = req.params;
    try {
        const result = await db.collection('oneone_chat_messages').updateMany(
            { chat_room_id: parseInt(roomId, 10) },
            { $set: { read: 1 } }
        );
        if (result.matchedCount === 0) {
            return res.status(404).json({ error: '메시지를 찾을 수 없습니다' });
        }
        res.status(200).json({ message: '메시지 읽음 상태가 업데이트되었습니다' });
    } catch (error) {
        console.error('메시지 읽음 상태 업데이트 오류:', error);
        res.status(500).json({ error: '메시지 읽음 상태 업데이트 실패' });
    }
});

// 단체1:1 메시지 읽음 상태 업데이트
app.put('/api/togetherMessages/:roomId/read', async (req, res) => {
    const { roomId } = req.params;
    if (!roomId) {
        return res.status(400).json({ error: 'roomId가 필요합니다' });
    }
    try {
        const result = await db.collection('together_chat_messages').updateMany(
            { room_id: parseInt(roomId, 10) },
            { $set: { read: 1 } }
        );
        if (result.matchedCount === 0) {
            return res.status(404).json({ error: '메시지를 찾을 수 없습니다' });
        }
        res.status(200).json({ message: '메시지 읽음 상태가 업데이트되었습니다' });
    } catch (error) {
        console.error('단체 채팅 메시지 읽음 상태 업데이트 오류:', error);
        res.status(500).json({ error: '단체 채팅 메시지 읽음 상태 업데이트 실패' });
    }
});

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

module.exports = app; 