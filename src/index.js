const forge = require("node-forge");
const { promisify } = require("util");
const SimplePeer = require("simple-peer");
const msgpack = require("msgpack-lite");
const WebSocket =
  typeof window === "undefined" ? require("ws") : window.WebSocket;

const rsaBits = 4096;

// Util
function stringToUint8Array(s) {
  const result = new Uint8Array(s.length);
  for (let i = 0; i < s.length; ++i) {
    result[i] = s.charCodeAt(i);
  }
  return result;
}
function uint8ArrayToString(u) {
  return String.fromCharCode.apply(String, u);
}
function name(address) {
  return (
    (
      address[0] / 256 +
      address[1] / 65536 +
      address[2] / 56 / 256 / 256 +
      address[3] / 256 / 256 / 256 / 256
    )
      .toString(2)
      .slice(2, 11) + "..."
  );
}
function sameData(a, b) {
  if (a.length !== b.length) {
    return false;
  }
  for (let i = 0; i < a.length; ++i) {
    if (a[i] !== b[i]) {
      return false;
    }
  }
  return true;
}

async function ping() {
  return Date.now();
}
const methods = { ping };

class Peer {
  constructor({ connection, address, node }) {
    this.node = node;
    this.address = address;
    this.connection = connection;
    this.seq = 0;
    this.requests = {};
    this.connection.onmessage = msg => this.handleMessage(msg);
    console.log("new peer", connection);
  }
  async handleMessage(msg) {
    msg = msgpack.decode(msg);
    if (msg.method && methods[msg.method]) {
      let result;
      try {
        result = await methods[msg.method].apply(this, msg.params);
        result = { result };
      } catch (error) {
        result = { error };
      }
      result.id = msg.id;
      this.connection.send(msgpack.encode(result));
      return;
    }
    if (msg.hasOwnProperty("result")) {
      this.requests[msg.id].resolve(msg.result);
      delete this.requests[msg.id];
      return;
    }
    if (msg.hasOwnProperty("error")) {
      this.requests[msg.id].reject(msg.error);
      delete this.requests[msg.id];
      return;
    }
  }
  hasAddress(address) {
    return sameData(this.address, address);
  }
  rpc() {
    const params = Array.from(arguments);
    const method = params.shift();
    const id = ++this.seq;
    this.connection.send(msgpack.encode({ method, params, id }));
    const result = new Promise((resolve, reject) => {
      this.requests[id] = { resolve, reject };
    });
    return result;
  }
}
class Node {
  constructor({ doLog, key }) {
    let publicKey = key.publicKey;
    publicKey = forge.pki.publicKeyToAsn1(publicKey);
    publicKey = forge.asn1.toDer(publicKey);
    const address = forge.md.sha256
      .create()
      .update(publicKey.data)
      .digest();
    this.key = key;
    this.doLog = doLog;
    this.publicKey = stringToUint8Array(publicKey.data);
    this.address = stringToUint8Array(address.data);
    this.peers = [];
  }
  peer(address) {
    for (let i = 0; i < this.peers.length; ++i) {
      if (this.peers[i].hasAddress(address)) {
        return this.peers[i];
      }
    }
  }
  async addConnection(connection) {
    const encoded = msgpack.encode({ address: this.address });
    connection.send(this.publicKey);
    const remotePublicKey = await new Promise(
      resolve => (connection.onmessage = resolve)
    );
    let address = stringToUint8Array(
      forge.md.sha256
        .create()
        .update(uint8ArrayToString(remotePublicKey))
        .digest().data
    );

    this.peers.push(new Peer({ connection, address, node: this }));
    this.log("added peer:", name(address), "... ping...");
    const t = await this.peer(address).rpc("ping");
    this.log("pong", t);

    /* Experiments public/private encryption
    const getHello = new Promise(resolve => connection.onmessage = resolve);

    this.log(remotePublicKey);
    this.log('remoteAddress:', name(address));
    let b = forge.util.createBuffer(uint8ArrayToString(remotePublicKey), 'raw')
    b = forge.asn1.fromDer(b);
    b = forge.pki.publicKeyFromAsn1(b)
    let encrypted = this.key.publicKey.encrypt('hello ' + name(address));
    encrypted = b.encrypt('hello ' + name(address));
    encrypted = stringToUint8Array(encrypted)

    connection.send(encrypted);
    let hello = await getHello;
    //hello = encrypted
    hello = uint8ArrayToString(hello)
    const decrypted = this.key.privateKey.decrypt(hello);
    //*/
  }
  log() {
    if (this.doLog) {
      const args = Array.from(arguments);
      args.unshift(name(this.address) + ":");
      console.log.apply(console, args);
    }
  }
}
async function createNode({ port, url, servers, doLog = true }) {
  const t0 = Date.now();
  const node = new Node({
    doLog,
    key: await promisify(forge.pki.rsa.generateKeyPair)({ bits: rsaBits })
  });
  node.log(`initialised in ${Date.now() - t0}ms`);

  if (url || port) {
    const wss = new WebSocket.Server({ port });
    wss.on("connection", ws => {
      const connection = {
        send: o => ws.send(o),
        onclose: () => {},
        onmessage: () => {},
        close: () => ws.close()
      };
      ws.on("message", msg => connection.onmessage(msg));
      ws.on("close", () => connection.onclose());
      node.addConnection(connection);
    });
    console.log("started server", port, url);
  } else {
    const ws = new WebSocket("ws://localhost:1337/");
    ws.binaryType = "arraybuffer";
    ws.onopen = () => {
      const connection = {
        send: o => ws.send(o),
        onclose: () => {},
        onmessage: () => {},
        close: () => ws.close()
      };
      ws.onmessage = o => connection.onmessage(new Uint8Array(o.data));
      ws.onclose = () => connection.onclose();
      node.addConnection(connection);
    };
  }
  return node;
}

// Browser main
if (typeof window !== "undefined") {
  async function main() {
    window.node = await createNode({ servers: ["ws://localhost:1337"] });
    /*
    await createNode({servers: ['ws://localhost:1337'], doLog:false});
    await createNode({servers: ['ws://localhost:1337'], doLog:false});
    await createNode({servers: ['ws://localhost:1337'], doLog:false});
    await createNode({servers: ['ws://localhost:1337'], doLog:false});
    await createNode({servers: ['ws://localhost:1337'], doLog:false});
    await createNode({servers: ['ws://localhost:1337'], doLog:false});
    await createNode({servers: ['ws://localhost:1337'], doLog:false});
    */
  }
  main();
}

// Connections

module.exports = { Node, createNode };
