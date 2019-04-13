const forge = require('node-forge')
const {promisify} = require('util')
const SimplePeer = require('simple-peer');
const msgpack = require('msgpack-lite');
const WebSocket = typeof window === 'undefined' ? require('ws') : window.WebSocket;

const rsaBits = 2048

// Util
function stringToUint8Array(s) {
  const result = new Uint8Array(s.length);
  for(let i = 0; i < s.length; ++i) {
    result[i] = s.charCodeAt(i);
  }
  return result;
}
function Uint8ArrayToString(u) {
  return String.fromCharCode.apply(String, u)
}
function name(address) {
  return (address[0] / 256 + address[1] /65536 + address[2]/56/256/256 + address[3]/256/256/256/256).toString(2).slice(2, 11);
}


// Node-class
class Node {
  constructor({doLog, privateKey}) {
    const publicKey = forge.asn1.toDer(forge.pki.publicKeyToAsn1(privateKey.publicKey))
    const address = forge.md.sha256.create().update(publicKey.data).digest()
    this._privateKey = privateKey;
    this.doLog = doLog;
    this.publicKey = stringToUint8Array(publicKey.data);
    this.address = stringToUint8Array(address.data);
    this.peers = [];
  }
  async addConnection(peer) {
    const encoded = msgpack.encode({address: this.address});
    peer.send(this.publicKey)
    const remotePublicKey = await new Promise(resolve => peer.onmessage = resolve);
    this.log(remotePublicKey);
    let remoteAddress = stringToUint8Array(forge.md.sha256.create().update(Uint8ArrayToString(remotePublicKey)).digest().data)
    this.log('remoteAddress:', name(remoteAddress));
  }
  log() {
    if(this.doLog) {
      const args = Array.from(arguments);
      args.unshift(name(this.address) + ':');
      console.log.apply(console, args)
    }
  }
}
async function createNode({port, url, servers, doLog= true}) {
  const t0 = Date.now();
  const node = new Node({doLog, privateKey: await promisify(forge.pki.rsa.generateKeyPair)({bits: rsaBits})});
  node.log(`initialised in ${Date.now() - t0}ms`);

  if(url || port) {
    const wss = new WebSocket.Server({port});
    wss.on('connection', (ws) =>  {
      const peer = {
        send: o => ws.send(o),
        onclose: () => {},
        onmessage: () => {},
        close: () => ws.close()
      }
      ws.on('message', msg => peer.onmessage(msg));
      ws.on('close', ()=> peer.onclose());
      node.addConnection(peer);
    });
    console.log('started server', port, url)
  } else {
    const ws = new WebSocket('ws://localhost:1337/');
    ws.binaryType= 'arraybuffer'
    ws.onopen = () => {
      const peer = {
        send: o => ws.send(o),
        onclose: () => {},
        onmessage: () => {},
        close: () => ws.close()
      }
      ws.onmessage = o => peer.onmessage(new Uint8Array(o.data))
      ws.onclose = () => peer.onclose()
      node.addConnection(peer);
    }
  }
  return node
}


// Browser main
if(typeof window !== 'undefined') {
  async function main() {
    await createNode({servers: ['ws://localhost:1337']});
    await createNode({servers: ['ws://localhost:1337'], doLog:false});
    await createNode({servers: ['ws://localhost:1337'], doLog:false});
    await createNode({servers: ['ws://localhost:1337'], doLog:false});
    await createNode({servers: ['ws://localhost:1337'], doLog:false});
    await createNode({servers: ['ws://localhost:1337'], doLog:false});
    await createNode({servers: ['ws://localhost:1337'], doLog:false});
    await createNode({servers: ['ws://localhost:1337'], doLog:false});
  }
  main();
}

// Connections

module.exports = {Node, createNode}
