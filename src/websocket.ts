import {io} from "./http.js"

io.on("connection", socket => {
    console.log(`Connected: ${socket.id}`);
})