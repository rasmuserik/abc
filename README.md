# Web Overlay Network

Dependencies:

- simplepeer
- ws
- msgpack-lite
- node-forge

Test: instantiate 100 nodes, and check that they connect ok

- subsystem
    - kademlie-fns
- internal
    - local api
        - `connect(websocket server url)`
        - `connect(address)`
        - `onDisconnected(address, fn)`
    - rpc
        - `publicKey()`
        - `relay(address, endpoint, data)`
        - `onPeerConnect(address)`
        - `onPeerDisconnect(address)`
- external
    - local api
        - `connect(websocket server urls)`
        - `disconnect()`
        - `connected()`
        - `rpc(address, name, args)`
        - `method(name, fn(peer, args))`
        - `sign(data)`
        - `decrypt(data)`
        - `encrypt(address, data)`
        - `verify(address, data)`
    - rpc
        - `address()`
        - `peers()`

---

Later:
- compress connections with lz4
- network DHT + algorithms

