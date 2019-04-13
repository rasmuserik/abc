const { createNode } = require("./index");
const WebSocket = require("ws");

createNode({ port: 1337, url: "ws://localhost:1337" });
