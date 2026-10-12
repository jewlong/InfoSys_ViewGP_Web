using System.Net;
using System.Net.Sockets;
using System.Text.Json;
using ViewX.Server;
using Xunit;

namespace ViewX.Server.Tests;
public class ModbusTests
{
    private static ModbusMapping Mapping(string type = "uint16", string order = "highFirst", double scale = 1, double offset = 0) => new("plc", "holdingRegister", 0, type, order, scale, offset, "readWrite");
    [Theory]
    [InlineData("uint16", "highFirst", 65535)]
    [InlineData("int16", "highFirst", -32768)]
    [InlineData("uint32", "highFirst", 4294967295)]
    [InlineData("uint32", "lowFirst", 123456789)]
    [InlineData("int32", "highFirst", -2147483648)]
    [InlineData("int32", "lowFirst", -1234567)]
    [InlineData("float32", "highFirst", 12.5)]
    [InlineData("float32", "lowFirst", -3.25)]
    public void EncodesAndDecodesRegisters(string type, string order, double value)
    {
        var m = Mapping(type,order); var request = ModbusCodec.WriteRequest(m, JsonSerializer.SerializeToElement(value));
        byte[] response = m.Words == 1 ? [3,2,request[3],request[4]] : [3,4,..request[6..]];
        var decoded = ModbusCodec.Decode(new(3,0,m.Words,[new("tag",m)]),response);
        Assert.Equal(value, (double)decoded["tag"]);
        ModbusCodec.ValidateWrite(request, request[..5]);
    }
    [Fact]
    public void AppliesScaleAndRejectsInvalidWrites()
    {
        var m = Mapping(scale: .1, offset: 2);
        Assert.Equal(new byte[] { 6,0,0,0,123 }, ModbusCodec.WriteRequest(m,JsonSerializer.SerializeToElement(14.3)));
        Assert.Equal(14.3, (double)ModbusCodec.Decode(new(3,0,1,[new("v",m)]),[3,2,0,123])["v"], 10);
        Assert.Throws<ArgumentException>(() => ModbusCodec.WriteRequest(m,JsonSerializer.SerializeToElement(2.05)));
        Assert.Throws<ArgumentException>(() => ModbusCodec.WriteRequest(m with { Access="read" },JsonSerializer.SerializeToElement(2)));
        Assert.Throws<ArgumentException>(() => ModbusCodec.WriteRequest(Mapping(),JsonSerializer.SerializeToElement(65536)));
        Assert.Throws<ArgumentException>(() => ModbusCodec.WriteRequest(Mapping("int32"),JsonSerializer.SerializeToElement(-2147483649)));
    }
    [Fact]
    public void BitPackingAndExceptionFrames()
    {
        var m = Mapping("bool") with { Area="coil", Address=8 };
        Assert.True((bool)ModbusCodec.Decode(new(1,0,9,[new("v",m)]),[1,2,0,1])["v"]);
        var request = ModbusCodec.WriteRequest(m,JsonSerializer.SerializeToElement(true));
        Assert.Equal(new byte[] { 5,0,8,255,0 }, request);
        Assert.Throws<ModbusProtocolException>(() => ModbusCodec.Decode(new(1,0,9,[new("v",m)]),[1,1,0]));
        Assert.Throws<ModbusProtocolException>(() => ModbusCodec.ValidateFunction([0x83,2],3));
        Assert.Throws<ModbusProtocolException>(() => ModbusCodec.ValidateWrite(request,[5,0,8,0,0]));
        Assert.Equal((ushort)0xCDC5, ModbusCodec.Crc([1,3,0,0,0,10]));
    }
    [Fact]
    public void PlannerCombinesAdjacentAddressesWithoutGapsAndBoundsQuantity()
    {
        var tags = Enumerable.Range(0,130).Select(i => new CommunicationTag(i.ToString(),Mapping() with { Address=i })).ToList();
        tags.Add(new("gap",Mapping() with { Address=200 }));
        tags.Add(new("overlap",Mapping("uint32") with { Address=0 }));
        var plan = ModbusCodec.Plan(tags);
        Assert.Equal(3,plan.Count); Assert.Equal(125,plan[0].Count); Assert.Equal(5,plan[1].Count); Assert.Equal(200,plan[2].Address);
        var bits = ModbusCodec.Plan(Enumerable.Range(0,2001).Select(i => new CommunicationTag(i.ToString(),Mapping("bool") with { Area="coil",Address=i })));
        Assert.Equal(new[]{2000,1},bits.Select(b => b.Count));
    }
    [Fact]
    public async Task TcpRejectsMismatchedTransactionAndReadsFragmentedReply()
    {
        var listener = new TcpListener(IPAddress.Loopback,0); listener.Start();
        try
        {
            var port = ((IPEndPoint)listener.LocalEndpoint).Port;
            var simulator = Task.Run(async () =>
            {
                using var socket = await listener.AcceptTcpClientAsync(); var stream = socket.GetStream();
                var input = new byte[12]; await stream.ReadExactlyAsync(input);
                var response = new byte[]{input[0],input[1],0,0,0,5,1,3,2,0,42};
                await stream.WriteAsync(response.AsMemory(0,4)); await stream.WriteAsync(response.AsMemory(4));
                await stream.ReadExactlyAsync(input); response[0] = 99; await stream.WriteAsync(response);
            });
            using var transport = new ModbusTcpTransport("127.0.0.1",port);
            using var timeout = new CancellationTokenSource(5000);
            Assert.Equal(new byte[]{3,2,0,42}, await transport.ExchangeAsync(1,[3,0,0,0,1],timeout.Token));
            await Assert.ThrowsAsync<ModbusProtocolException>(() => transport.ExchangeAsync(1,[3,0,0,0,1],timeout.Token));
            await simulator;
        }
        finally { listener.Stop(); }
    }
}
