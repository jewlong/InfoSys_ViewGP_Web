"""Linux pseudo-terminal Modbus RTU peer, no hardware or dependencies required."""
import os, pty, tty, sys, json, select
master, slave = pty.openpty()
tty.setraw(master); tty.setraw(slave)
print(json.dumps({"port":os.ttyname(slave)}),flush=True)
holding = [0]*65536
holding[0]=42
coils = [0]*65536
mode = "good"
buf = b""
def crc(data):
    value=0xffff
    for b in data:
        value ^= b
        for _ in range(8):
            value=(value>>1)^0xa001 if value&1 else value>>1
    return value.to_bytes(2,"little")
while True:
    ready,_,_=select.select([master,sys.stdin],[],[])
    if sys.stdin in ready:
        command=sys.stdin.readline()
        if not command: break
        mode=json.loads(command)["mode"]
        print(json.dumps({"mode":mode}),flush=True)
    if master not in ready: continue
    buf += os.read(master,4096)
    while len(buf)>=8:
        length=9+buf[6] if buf[1]==16 else 8
        if len(buf)<length: break
        frame,buf=buf[:length],buf[length:]
        if crc(frame[:-2])!=frame[-2:]: continue
        unit,fc=frame[:2]; address=int.from_bytes(frame[2:4],"big"); count=int.from_bytes(frame[4:6],"big")
        if mode=="silent": continue
        if fc in (1,2):
            data=bytearray((count+7)//8)
            for i in range(count):
                if coils[address+i]: data[i//8]|=1<<(i%8)
            pdu=bytes([fc,len(data)])+data
        elif fc in (3,4):
            data=b"".join(holding[address+i].to_bytes(2,"big") for i in range(count))
            pdu=bytes([fc,len(data)])+data
        elif fc in (5,6):
            if fc==5: coils[address]=int(count==0xff00)
            else: holding[address]=count
            pdu=frame[1:6]
        elif fc==16:
            for i in range(count): holding[address+i]=int.from_bytes(frame[7+i*2:9+i*2],"big")
            pdu=frame[1:6]
        else: pdu=bytes([fc|128,1])
        reply=bytes([unit])+pdu
        checksum=crc(reply)
        if mode=="badCrc": checksum=bytes([checksum[0]^255,checksum[1]])
        os.write(master,reply+checksum)
os.close(master);os.close(slave)
