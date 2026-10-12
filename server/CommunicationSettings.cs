using System.Text.Json;

namespace ViewX.Server;

public sealed record CommunicationDevice(string Id, string Name, string Transport, bool Enabled, int UnitId, int PollIntervalMs, int TimeoutMs,
    string? Host = null, int Port = 502, string? SerialPort = null, int BaudRate = 9600, string Parity = "even", int DataBits = 8, int StopBits = 1);
public sealed record ModbusMapping(string DeviceId, string Area, int Address, string DataType, string WordOrder, double Scale, double Offset, string Access)
{
    public int Words => DataType is "uint32" or "int32" or "float32" ? 2 : 1;
    public byte Function => Area switch { "coil" => 1, "discreteInput" => 2, "holdingRegister" => 3, "inputRegister" => 4, _ => throw new ArgumentException("資料區錯誤") };
    public bool IsBit => Function <= 2;
}
public sealed record CommunicationTag(string Id, ModbusMapping Mapping);
public sealed record CommunicationConfig(string ProjectId, CommunicationDevice[] Devices, CommunicationTag[] Tags)
{
    public static CommunicationConfig Parse(JsonElement project) => new(project.GetProperty("id").GetString()!,
        project.TryGetProperty("devices", out var devices) ? devices.Deserialize<CommunicationDevice[]>(CommunicationSettings.Json)! : [],
        project.GetProperty("variables").EnumerateArray().Where(v => v.TryGetProperty("modbus", out _))
            .Select(v => new CommunicationTag(v.GetProperty("id").GetString()!, v.GetProperty("modbus").Deserialize<ModbusMapping>(CommunicationSettings.Json)!)).ToArray());
}
public static class CommunicationSettings
{
    public static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);
    private static bool Required(JsonElement e, params string[] fields) => e.ValueKind == JsonValueKind.Object && fields.All(f => e.TryGetProperty(f, out _));
    private static bool Text(string? s, int max = 200) => !string.IsNullOrWhiteSpace(s) && s.Length <= max;
    public static bool ValidDevice(CommunicationDevice d) => Text(d.Id) && Text(d.Name) && d.UnitId is >= 0 and <= 255 &&
        d.PollIntervalMs is >= 100 and <= 60000 && d.TimeoutMs is >= 100 and <= 10000 && (d.Transport switch
        {
            "tcp" => Text(d.Host, 253) && System.Text.RegularExpressions.Regex.IsMatch(d.Host!, @"\A[A-Za-z0-9.:_-]+\z") && d.Port is >= 1 and <= 65535,
            "rtu" => d.UnitId is >= 1 and <= 247 && Text(d.SerialPort) && System.Text.RegularExpressions.Regex.IsMatch(d.SerialPort!, @"\A[A-Za-z0-9_./-]+\z") &&
                new[] { 1200, 2400, 4800, 9600, 19200, 38400, 57600, 115200 }.Contains(d.BaudRate) && d.Parity is "none" or "even" or "odd" && d.DataBits == 8 && d.StopBits is 1 or 2,
            _ => false
        });
    public static bool ValidMapping(ModbusMapping m, string type) => Text(m.DeviceId) && m.Area is "coil" or "discreteInput" or "holdingRegister" or "inputRegister" &&
        (m.IsBit ? type == "boolean" && m.DataType == "bool" && m.Scale == 1 && m.Offset == 0 : type == "number" && m.DataType is "uint16" or "int16" or "uint32" or "int32" or "float32") &&
        m.Address >= 0 && m.Address + m.Words <= 65536 && m.WordOrder is "highFirst" or "lowFirst" && double.IsFinite(m.Scale) && Math.Abs(m.Scale) is >= 1e-12 and <= 1e12 &&
        double.IsFinite(m.Offset) && Math.Abs(m.Offset) <= 1e12 && m.Access is "read" or "readWrite" &&
        (!(m.Area is "discreteInput" or "inputRegister") || m.Access == "read");
    public static bool IsValid(JsonElement project)
    {
        try
        {
            if (!project.TryGetProperty("variables", out var variables) || variables.ValueKind != JsonValueKind.Array) return false;
            var ids = new HashSet<string>(); var ports = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            if (project.TryGetProperty("devices", out var devices))
            {
                if (devices.ValueKind != JsonValueKind.Array || devices.GetArrayLength() > 32) return false;
                foreach (var element in devices.EnumerateArray())
                {
                    if (!Required(element, "id", "name", "transport", "enabled", "unitId", "pollIntervalMs", "timeoutMs")) return false;
                    var d = element.Deserialize<CommunicationDevice>(Json)!;
                    if (!ValidDevice(d) || !ids.Add(d.Id) ||
                        (d.Transport == "tcp" && !Required(element, "host", "port")) ||
                        (d.Transport == "rtu" && (!Required(element, "serialPort", "baudRate", "parity", "dataBits", "stopBits") || (d.Enabled && !ports.Add(d.SerialPort!))))) return false;
                }
            }
            var count = 0;
            foreach (var v in variables.EnumerateArray())
            {
                if (v.ValueKind != JsonValueKind.Object) return false;
                if (!v.TryGetProperty("modbus", out var m)) continue;
                if (++count > 1000 || !Required(v, "id", "type") || v.GetProperty("id").GetString()!.StartsWith("$SYS.") ||
                    !Required(m, "deviceId", "area", "address", "dataType", "wordOrder", "scale", "offset", "access")) return false;
                var mapping = m.Deserialize<ModbusMapping>(Json)!;
                if (!ValidMapping(mapping, v.GetProperty("type").GetString()!) || !ids.Contains(mapping.DeviceId)) return false;
            }
            return true;
        }
        catch (Exception e) when (e is JsonException or InvalidOperationException or ArgumentException or NullReferenceException) { return false; }
    }
}
