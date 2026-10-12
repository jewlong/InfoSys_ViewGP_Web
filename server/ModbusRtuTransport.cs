using System.Diagnostics;
using System.IO.Ports;

namespace ViewX.Server;

// The serial adapter exchanges the same PDUs as TCP. One session owns a port;
// the device worker serializes polls and writes. Broadcast writes are disabled.
public sealed class ModbusRtuTransport(CommunicationDevice device) : IModbusTransport
{
    private SerialPort? port;
    public Task<byte[]> ExchangeAsync(byte unitId, byte[] pdu, CancellationToken cancellationToken) => Task.Run(() =>
    {
        cancellationToken.ThrowIfCancellationRequested();
        try
        {
            if (port is null)
            {
                port = new SerialPort(device.SerialPort!, device.BaudRate, device.Parity switch { "odd" => Parity.Odd, "even" => Parity.Even, _ => Parity.None }, 8, device.StopBits == 2 ? StopBits.Two : StopBits.One)
                { ReadTimeout = device.TimeoutMs, WriteTimeout = device.TimeoutMs, Handshake = Handshake.None };
                port.Open();
            }
            var serial = port;
            using var cancelled = cancellationToken.Register(() => { try { serial.Close(); } catch (IOException) { } });
            // At least 3.5 character times (1.75 ms minimum above 19200 baud).
            Thread.Sleep(Math.Max(2, (int)Math.Ceiling(3.5 * 11 * 1000 / device.BaudRate)));
            cancellationToken.ThrowIfCancellationRequested();
            serial.DiscardInBuffer();
            var frame = new byte[pdu.Length + 3]; frame[0] = unitId; pdu.CopyTo(frame, 1);
            var crc = ModbusCodec.Crc(frame.AsSpan(0, frame.Length - 2)); frame[^2] = (byte)crc; frame[^1] = (byte)(crc >> 8);
            var watch = Stopwatch.StartNew();
            serial.Write(frame, 0, frame.Length);
            byte[] Read(int count)
            {
                var data = new byte[count]; var offset = 0;
                while (offset < count)
                {
                    cancellationToken.ThrowIfCancellationRequested();
                    var remaining = device.TimeoutMs - (int)watch.ElapsedMilliseconds;
                    if (remaining <= 0) throw new TimeoutException("串列通訊逾時");
                    serial.ReadTimeout = remaining; offset += serial.Read(data, offset, count - offset);
                }
                return data;
            }
            var header = Read(3);
            var tailLength = (header[1] & 0x80) != 0 ? 2 : pdu[0] <= 4 ? header[2] + 2 : 5;
            if (tailLength > 252) throw new ModbusProtocolException("Modbus RTU 回應長度不符");
            var tail = Read(tailLength); var reply = header.Concat(tail).ToArray();
            var expected = ModbusCodec.Crc(reply.AsSpan(0, reply.Length - 2));
            if (reply[0] != unitId || reply[^2] != (byte)expected || reply[^1] != (byte)(expected >> 8)) throw new ModbusProtocolException("Modbus RTU 站號或 CRC 不符");
            var response = reply[1..^2]; ModbusCodec.ValidateFunction(response, pdu[0]); return response;
        }
        catch { Dispose(); throw; }
    }, cancellationToken);
    public void Dispose() { port?.Dispose(); port = null; }
}
