import express from 'express';
import { Server } from 'socket.io';
import http from 'http';



const app = express();


const serverHttp = http.createServer(app);

const io = new Server(serverHttp);


export { serverHttp, io}