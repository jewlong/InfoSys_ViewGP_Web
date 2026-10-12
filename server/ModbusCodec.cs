using System.Buffers.Binary;
using System.Text.Json;

namespace ViewX.Server;

public sealed class ModbusProtocolException(string message) : IOException(message);
public sealed record ModbusReadBlock(byte Function, int Address, int Count, CommunicationTag[] Tags);
public static class ModbusCodec
{
    public static IReadOnlyList<ModbusReadBlock> Plan(IEnumerable<CommunicationTag> tags)
    {
        var result = new List<ModbusReadBlock>();
        foreach (var group in tags.GroupBy(t => t.Mapping.Function))
        {
            var current = new List<CommunicationTag>(); var start = 0; var end = 0;
            foreach (var tag in group.OrderBy(t => t.Mapping.Address))
            {
                var m = tag.Mapping; var nextEnd = m.Address + m.Words;
                var max = group.Key <= 2 ? 2000 : 125;
                // Combine only overlapping/adjacent mapped addresses: never read undocumented gaps.
                if (current.Count > 0 && (m.Address > end || Math.Max(end, nextEnd) - start > max))
                { result.Add(new(group.Key, start, end - start, current.ToArray())); current.Clear(); }
                if (current.Count == 0) start = m.Address;
                end = current.Count == 0 ? nextEnd : Math.Max(end, nextEnd); current.Add(tag);
            }
            if (current.Count > 0) result.Add(new(group.Key, start, end - start, current.ToArray()));
        }
        return result;
    }
    public static byte[] ReadRequest(byte function, int address, int count)
    {
        var pdu = new byte[5]; pdu[0] = function;
        BinaryPrimitives.WriteUInt16BigEndian(pdu.AsSpan(1), checked((ushort)address));
        BinaryPrimitives.WriteUInt16BigEndian(pdu.AsSpan(3), checked((ushort)count)); return pdu;
    }
    public static void ValidateFunction(byte[] response, byte expected)
    {
        if (response.Length == 2 && response[0] == (expected | 0x80)) throw new ModbusProtocolException($"Modbus 例外碼 {response[1]}（功能碼 {expected}）");
        if (response.Length == 0 || response[0] != expected) throw new ModbusProtocolException("Modbus 回應功能碼不符");
    }
    public static Dictionary<string, object> Decode(ModbusReadBlock block, byte[] response)
    {
        ValidateFunction(response, block.Function);
        var bytes = block.Function <= 2 ? (block.Count + 7) / 8 : block.Count * 2;
        if (response.Length != bytes + 2 || response[1] != bytes) throw new ModbusProtocolException("Modbus 回應資料長度不符");
        var result = new Dictionary<string, object>();
        foreach (var t in block.Tags)
        {
            var m = t.Mapping; var index = m.Address - block.Address;
            if (m.IsBit) { result[t.Id] = (response[2 + index / 8] & (1 << (index % 8))) != 0; continue; }
            var first = BinaryPrimitives.ReadUInt16BigEndian(response.AsSpan(2 + index * 2));
            var second = m.Words == 2 ? BinaryPrimitives.ReadUInt16BigEndian(response.AsSpan(4 + index * 2)) : 0;
            var bits = m.WordOrder == "lowFirst" ? ((uint)second << 16) | first : ((uint)first << 16) | (uint)second;
            double raw = m.DataType switch
            {
                "uint16" => first, "int16" => unchecked((short)first), "uint32" => bits,
                "int32" => unchecked((int)bits), "float32" => (double)BitConverter.UInt32BitsToSingle(bits),
                _ => throw new ArgumentException("資料型別錯誤")
            };
            var value = raw * m.Scale + m.Offset;
            if (!double.IsFinite(value)) throw new ModbusProtocolException("設備回傳非有限數值");
            result[t.Id] = value;
        }
        return result;
    }
    public static byte[] WriteRequest(ModbusMapping m, JsonElement value)
    {
        if (m.Access != "readWrite" || m.Area is not ("coil" or "holdingRegister")) throw new ArgumentException("設備標籤為唯讀");
        if (m.IsBit)
        {
            if (value.ValueKind is not (JsonValueKind.True or JsonValueKind.False)) throw new ArgumentException("接點需寫入布林值");
            return ReadRequest(5, m.Address, value.GetBoolean() ? 0xFF00 : 0);
        }
        if (value.ValueKind != JsonValueKind.Number || !value.TryGetDouble(out var n) || !double.IsFinite(n)) throw new ArgumentException("需寫入有限數值");
        var raw = (n - m.Offset) / m.Scale;
        var (min, max) = m.DataType switch { "uint16" => (0d, 65535d), "int16" => (-32768d, 32767d), "uint32" => (0d, 4294967295d), "int32" => (-2147483648d, 2147483647d), "float32" => (-(double)float.MaxValue, (double)float.MaxValue), _ => throw new ArgumentException("資料型別錯誤") };
        if (!double.IsFinite(raw) || raw < min || raw > max || (m.DataType != "float32" && Math.Abs(raw - Math.Round(raw)) > 1e-7)) throw new ArgumentException("寫入值超出資料型別範圍，或倍率換算後不是整數");
        if (m.Words == 1) return ReadRequest(6, m.Address, unchecked((ushort)(int)Math.Round(raw)));
        uint bits = m.DataType switch { "float32" => BitConverter.SingleToUInt32Bits((float)raw), "int32" => unchecked((uint)(int)Math.Round(raw)), _ => (uint)Math.Round(raw) };
        var first = (ushort)(bits >> 16); var second = (ushort)bits;
        if (m.WordOrder == "lowFirst") (first, second) = (second, first);
        var request = new byte[10]; ReadRequest(16, m.Address, 2).CopyTo(request, 0); request[5] = 4;
        BinaryPrimitives.WriteUInt16BigEndian(request.AsSpan(6), first); BinaryPrimitives.WriteUInt16BigEndian(request.AsSpan(8), second); return request;
    }
    public static void ValidateWrite(byte[] request, byte[] response)
    {
        ValidateFunction(response, request[0]);
        if (response.Length != 5 || !response.AsSpan().SequenceEqual(request.AsSpan(0,5))) throw new ModbusProtocolException("Modbus 寫入回應不符；請檢查設備實際值");
    }
    public static ushort Crc(ReadOnlySpan<byte> data)
    {
        ushort crc = 0xFFFF;
        foreach (var b in data) { crc ^= b; for (var i = 0; i < 8; i++) crc = (ushort)((crc & 1) != 0 ? (crc >> 1) ^ 0xA001 : crc >> 1); }
        return crc;
    }
}
