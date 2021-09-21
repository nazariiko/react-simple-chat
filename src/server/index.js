import express from 'express'
import { createServer } from "http";
import { Server } from "socket.io";
import * as path from 'path';

const app = express();
const __dirname = path.resolve();
app.use(express.static(path.join(__dirname, '../../build')));
const httpServer = createServer(app);
const io = new Server(httpServer);

const port = process.env.PORT || 8080;

const rooms = new Map([]);

app.get('/', (req, res, next) => res.sendFile(__dirname + './index.html'));

app.get('/rooms/:id', (req, res) => {
  const roomID = req.params.id;
  const obj = rooms.has(roomID) ? {
    users: [...rooms.get(roomID).get('users').values()],
    messages: [...rooms.get(roomID).get('messages')],
  } : { users: [], messages: [] }
  res.json(obj)
})

app.post('/rooms', (req, res) => {
  const { roomID } = req.body;
  if (!rooms.has(roomID)) {
    rooms.set(roomID, new Map([
      ['users', new Map()],
      ['messages', []],
    ]));
  }
  res.send()
})

io.on('connection', (socket) => {
  socket.on('ROOM:JOIN', ({ roomID, userName }) => {
    socket.join(roomID);
    rooms.get(roomID).get('users').set(socket.id, userName);
    const users = [...rooms.get(roomID).get('users').values()];
    socket.broadcast.to(roomID).emit('ROOM:JOINED', users);
  })

  socket.on('ROOM:NEW_MESSAGE', ({ roomID, userName, text }) => {
    const obj = {
      userName,
      text,
    }
    rooms.get(roomID).get('messages').push(obj)
    socket.broadcast.to(roomID).emit('ROOM:NEW_MESSAGE', obj)
  })

  socket.on('disconnect', () => {
    rooms.forEach((value, roomID) => {
      if (value.get('users').delete(socket.id)) {
        const users = [...value.get('users').values()];
        socket.broadcast.to(roomID).emit('ROOM:LEAVE', users);
      }
    })
  })
})

httpServer.listen(port, (err) => {
  if (err) {
    throw new Error(err)
  }
  console.log('Server is working');
})
