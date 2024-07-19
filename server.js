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

app.post('/api/messages', async (req, res) => {
    const newMessage = req.body;
    try {
        const result = await db.collection('ChatMessages').insertOne(newMessage);
        console.log('>>>>Message sent:', result.insertedId);
        res.status(201).json({ message: '>>>>Message sent successfully' });
    } catch (error) {
        console.error('>>>>Error sending message:', error);
        res.status(500).json({ error: '>>>>Failed to send message' });
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

startServer()

module.exports = app; // Express 앱을 모듈로 내보냅니다.
