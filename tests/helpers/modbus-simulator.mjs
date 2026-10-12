import net from "node:net";
// A real TCP peer with deliberately fragmented packets and controllable faults.
export async function startModbusSimulator() {
  const holding = new Uint16Array(65536),
    input = new Uint16Array(65536),
    coils = new Uint8Array(65536),
    discrete = new Uint8Array(65536);
  holding[0] = 265;
  holding[10] = 1;
  input[0] = 77;
  discrete[0] = 1;
  const sockets = new Set(),
    requests = [];
  let mode = "good";
  const server = net.createServer((socket) => {
    sockets.add(socket);
    socket.on("close", () => sockets.delete(socket));
    socket.on("error", () => {});
    let buffer = Buffer.alloc(0);
    socket.on("data", (chunk) => {
      buffer = Buffer.concat([buffer, chunk]);
      while (
        buffer.length >= 7 &&
        buffer.length >= 6 + buffer.readUInt16BE(4)
      ) {
        const length = 6 + buffer.readUInt16BE(4),
          frame = buffer.subarray(0, length);
        buffer = buffer.subarray(length);
        const pdu = frame.subarray(7),
          fc = pdu[0],
          address = pdu.readUInt16BE(1),
          count = pdu.readUInt16BE(3);
        requests.push({ fc, address, count, unitId: frame[6] });
        if (mode === "silent" || (mode === "silentWrite" && fc >= 5)) continue;
        if (mode === "disconnect") {
          socket.destroy();
          continue;
        }
        let reply;
        if (mode === "exception") reply = Buffer.from([fc | 128, 2]);
        else if (fc <= 2) {
          const area = fc === 1 ? coils : discrete;
          reply = Buffer.alloc(2 + Math.ceil(count / 8));
          reply[0] = fc;
          reply[1] = reply.length - 2;
          for (let i = 0; i < count; i++)
            if (area[address + i]) reply[2 + (i >> 3)] |= 1 << (i % 8);
        } else if (fc <= 4) {
          const area = fc === 3 ? holding : input;
          reply = Buffer.alloc(2 + count * 2);
          reply[0] = fc;
          reply[1] = count * 2;
          for (let i = 0; i < count; i++)
            reply.writeUInt16BE(area[address + i], 2 + i * 2);
        } else if (fc === 5 || fc === 6) {
          if (fc === 5) coils[address] = count === 0xff00 ? 1 : 0;
          else holding[address] = count;
          reply = pdu.subarray(0, 5);
        } else if (fc === 16) {
          for (let i = 0; i < count; i++)
            holding[address + i] = pdu.readUInt16BE(6 + i * 2);
          reply = pdu.subarray(0, 5);
        } else reply = Buffer.from([fc | 128, 1]);
        const response = Buffer.alloc(7 + reply.length);
        frame.copy(response, 0, 0, 7);
        response.writeUInt16BE(1 + reply.length, 4);
        reply.copy(response, 7);
        if (mode === "wrongTransaction") response[0] ^= 255;
        // Verify the client's ReadExactly behavior across MBAP and PDU boundaries.
        socket.write(response.subarray(0, 4));
        setTimeout(() => {
          if (!socket.destroyed) socket.write(response.subarray(4));
        }, 2);
      }
    });
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  return {
    port: server.address().port,
    holding,
    input,
    coils,
    discrete,
    requests,
    setMode(value) {
      mode = value;
    },
    disconnect() {
      for (const s of sockets) s.destroy();
    },
    async close() {
      for (const s of sockets) s.destroy();
      await new Promise((r) => server.close(r));
    },
  };
}
