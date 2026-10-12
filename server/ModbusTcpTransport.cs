using System.Buffers.Binary;
using System.Net.Sockets;

namespace ViewX.Server;

public interface IModbusTransport : IDisposable
{
    Task<byte[]> ExchangeAsync(byte unitId, byte[] pdu, CancellationToken cancellationToken);
}
public sealed class ModbusTcpTransport(string host, int port) : IModbusTransport
{
    private TcpClient? client;
    private ushort transaction;
    public async Task<byte[]> ExchangeAsync(byte unitId, byte[] pdu, CancellationToken cancellationToken)
    {
        try
        {
            if (client is null) { client = new TcpClient { NoDelay = true }; await client.ConnectAsync(host, port, cancellationToken); }
            var stream = client.GetStream(); var id = unchecked(++transaction);
            var frame = new byte[7 + pdu.Length];
            BinaryPrimitives.WriteUInt16BigEndian(frame, id); BinaryPrimitives.WriteUInt16BigEndian(frame.AsSpan(4), (ushort)(pdu.Length + 1)); frame[6] = unitId; pdu.CopyTo(frame, 7);
            await stream.WriteAsync(frame, cancellationToken);
            var header = new byte[7]; await stream.ReadExactlyAsync(header, cancellationToken);
            var length = BinaryPrimitives.ReadUInt16BigEndian(header.AsSpan(4));
            if (BinaryPrimitives.ReadUInt16BigEndian(header) != id || header[2] != 0 || header[3] != 0 || header[6] != unitId || length is < 2 or > 254)
                throw new ModbusProtocolException("Modbus TCP MBAP 標頭不符");
            var response = new byte[length - 1]; await stream.ReadExactlyAsync(response, cancellationToken);
            ModbusCodec.ValidateFunction(response, pdu[0]); return response;
        }
        catch { Dispose(); throw; }
    }
    public void Dispose() { client?.Dispose(); client = null; }
}
