'use strict';
const crypto = require('crypto');
const { EventEmitter } = require('events');

class Socket extends EventEmitter {
  constructor(stream) {
    super();
    this.stream = stream;
    this.open = true;
    this.buffer = Buffer.alloc(0);
    stream.on('data', data => this.receive(data));
    stream.on('close', () => this.close());
    stream.on('error', () => this.close());
    stream.setTimeout(0);
  }
  send(data) {
    if (!this.open || !this.stream.writable) return;
    const payload = Buffer.from(JSON.stringify(data));
    if (payload.length > 1024 * 1024) return;
    this.frame(1, payload);
  }
  frame(opcode, payload) {
    if (!this.open || !this.stream.writable) return;
    let head;
    if (payload.length < 126) head = Buffer.from([0x80 | opcode, payload.length]);
    else if (payload.length < 65536) { head = Buffer.alloc(4); head[0] = 0x80 | opcode; head[1] = 126; head.writeUInt16BE(payload.length, 2); }
    else { head = Buffer.alloc(10); head[0] = 0x80 | opcode; head[1] = 127; head.writeBigUInt64BE(BigInt(payload.length), 2); }
    if (this.stream.writableLength < 2 * 1024 * 1024) this.stream.write(Buffer.concat([head, payload]));
  }
  receive(data) {
    if (!this.open) return;
    this.buffer = Buffer.concat([this.buffer, data]);
    if (this.buffer.length > 2 * 1024 * 1024) return this.disconnect();
    while (this.buffer.length >= 2) {
      const first = this.buffer[0], second = this.buffer[1];
      if (!(second & 0x80)) return this.disconnect(); // client frames must be masked
      let length = second & 127, offset = 2;
      if (length === 126) { if (this.buffer.length < 4) return; length = this.buffer.readUInt16BE(2); offset = 4; }
      else if (length === 127) {
        if (this.buffer.length < 10) return;
        const large = this.buffer.readBigUInt64BE(2);
        if (large > 1048576n) return this.disconnect();
        length = Number(large); offset = 10;
      }
      if (length > 1048576) return this.disconnect();
      if (this.buffer.length < offset + 4 + length) return;
      const mask = this.buffer.subarray(offset, offset + 4);
      const payload = Buffer.from(this.buffer.subarray(offset + 4, offset + 4 + length));
      this.buffer = this.buffer.subarray(offset + 4 + length);
      for (let i = 0; i < payload.length; i++) payload[i] ^= mask[i % 4];
      const opcode = first & 15;
      if (opcode === 8) return this.disconnect();
      if (opcode === 9) { this.frame(10, payload); continue; }
      if (opcode === 10) continue;
      if (opcode !== 1 || (first & 0x80) === 0) return this.disconnect();
      try { this.emit('message', JSON.parse(payload.toString('utf8'))); }
      catch { this.send({ type: 'error', message: '잘못된 메시지입니다.' }); }
    }
  }
  disconnect() { if (this.open) { this.open = false; this.stream.end(); this.emit('close'); } }
  close() { if (this.open) { this.open = false; this.emit('close'); } }
}
function upgrade(req, stream, head, onConnect) {
  if (req.url?.split('?')[0] !== '/ws' || req.headers.upgrade?.toLowerCase() !== 'websocket') { stream.destroy(); return; }
  const key = req.headers['sec-websocket-key'];
  if (typeof key !== 'string' || !/^[A-Za-z0-9+/]{22}==$/.test(key)) { stream.destroy(); return; }
  const accept = crypto.createHash('sha1').update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');
  stream.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ' + accept + '\r\n\r\n');
  const ws = new Socket(stream);
  onConnect(ws, req);
  if (head?.length) ws.receive(head);
}
module.exports = { upgrade };
