require("dotenv").config();

const createServer = require("./createServer");

const server = createServer();

server.start(() => console.log("Server is running on localhost:4000"));
