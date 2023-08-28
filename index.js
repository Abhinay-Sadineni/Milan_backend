import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import notificationJob from './features/notification.js';
import startServer from './features/block_race.js';


// Start the notification job
//notificationJob.start();

// Initialize socket server and pass the io instance
const app = express();
const server = http.createServer(app);
const io = new Server(server);
startServer(io);

// Add more routes or middleware if needed
app.get('/', (req, res) => {
  res.send('Hello World!');
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});


