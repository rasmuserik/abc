const {createNode} = require('./index');
const WebSocket = require('ws');

createNode({port: 1337, url: 'ws://localhost:1337'})
  /*
async function main() {
  console.time('init')
  const node = await createNode();
  const wss = new WebSocket.Server({port: 1337});
  console.timeEnd('init')
  wss.on('connection', (ws) =>  {
    ws.on('message', msg => {
      console.log('incoming message');
    });
    ws.send('hello');

  });
}
main();
*/
