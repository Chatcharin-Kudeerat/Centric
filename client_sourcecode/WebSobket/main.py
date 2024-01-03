import websocket
import threading
import PyWave
import pyaudio
from pydub import AudioSegment
from pydub.utils import make_chunks
import wave
import time
import datetime
import json
import os
import sys

CHUNK = 1280
AUDIOFORMAT = "lsb8k"
REQUEST_PARAM = {
    "voiceid": "12345678901234567890@es-jpn.jp",
    "direction": "in",
    "callStartTime": "",
    "durationTime": "1970-01-01 09:00:00.0",
    "srcDNo": "09012345678",
    "dstDNo": "0312345678",
    "extDNo": "0312345678",
    "callID1": int(time.time() * 1000),
    "agentID": "1234",
    "type": "customer",
    "agentName" : "山田花子",
    "callID2": "",
    "channelNum": "",
    "protocol": "WebSocket",
    "VDN": "",
    "groupID": " ",
    "operation": "",
    "Meta1": "",
    "Meta2": "",
    "Meta3": "",
    "Meta4": "",
    "Meta5": ""
}


# convert audio file to format of wav file and rate equal 8000 (~lsb8k)
# [18122023] New update : convert audio file to 1 channels
def ConvertAudioFile(fromFile, toFile, codecs):
    # command = "ffmpeg -i {} -acodec pcm_s16le -ar 8000 -ac 1 -vn {}".format(
    #     fromFile, toFile)
    # os.system(command)
    command = "ffmpeg -i {} -acodec {} -ac 1 -vn {}".format(
        fromFile, codecs, toFile)
    os.system(command)

# connect to TCP Server
def ConnectWithTCPServer(host: str, port: int):
    global client_socket
    # websocket.enableTrace(True)
    uri = f"ws://{host}:{port}"
    client_socket = websocket.WebSocket()
    client_socket.connect(uri)

def GetAudioData(wav):
    print(wav.bitrate)
    if wav.format == 6:
        code = "pcm_alaw"
    elif wav.format == 7:
        code = "pcm_mulaw"
    elif wav.format == 1 and wav.bits_per_sample == 8:
        code = "pcm_u8"
    else:
        code = "pcm_s16" + sys.byteorder[0] + "e"
    
    return code


def SetAudioFormat(wav):
    if wav.format == 6:
        format = "alaw"
    elif wav.format == 7:
        format = "mulaw"
    elif wav.format == 1 and wav.bits_per_sample == 8:
        format = "pcm" + sys.byteorder[0] + "8b"
    else:
        format = sys.byteorder[0] + "sb"
    
    sample_rate = str(wav.frequency).replace("000", "k")
    return format + sample_rate

# send s command
def SendStartCommandToCall(file):
    global DATA_RECEIVE
    # WAVE = wave.open(file, 'rb')
    start_time = datetime.datetime.now()
    REQUEST_PARAM["callStartTime"] = start_time.strftime("%Y-%m-%d %H:%M:%S")
    REQUEST_PARAM["operation"] = "start"
    REQUEST_PARAM["callID1"] = file
    REQUEST_PARAM["durationTime"] = "1970-01-01 09:00:00"
    REQUEST_PARAM["channelNum"] = 1
    sPacket = bytes("s {} {}".format(
        AUDIOFORMAT, json.dumps(REQUEST_PARAM)), "utf-8")
    client_socket.send(sPacket, opcode=0x2)
    DATA_RECEIVE = client_socket.recv()
    # 文字列として返された場合はバイナリに変換しておく
    if type(DATA_RECEIVE) is str:
        DATA_RECEIVE = bytes(DATA_RECEIVE, 'utf-8')


# send audio use pydub
def SendData(file):
    smaller = True
    wavFile = AudioSegment.from_file(file, "wav")
    print(f"wavFile {len(wavFile)}" )
    WAVE = PyWave.open(file)
    # p = pyaudio.PyAudio()
    # WAVE = wave.open(file, 'rb')
    # stream = p.open(format=p.get_format_from_width(WAVE.samples()),
    #                  channels=WAVE.channels(),
    #                  rate=8000,
    #                  output=True)
    chunk_lenght_ms = (80//WAVE.channels)
    chunks = make_chunks(wavFile, chunk_lenght_ms)  # Make chunks of one sec
    chunks_len = len(chunks)
    for i, chunk in enumerate(chunks):
        raw_audio_data = chunk.raw_data
        print(f"send packet #{i+1}/{chunks_len}")
        dataSend = raw_audio_data
        print(len(dataSend))
        client_socket.send(dataSend, opcode=0x2)
        # stream.write(raw_audio_data) # 解析と共にストリーミング再生する場合はコメントを外す。ただし処理スピードがかなり落ちる
        time.sleep(0.05) # ストリーミング再生無しだとeコマンドの到達が速すぎて処理できなくなるためsleepを入れる eコマンド側でwaitする方法でも良い

    time.sleep(5)
    print(f"send end command... \n")
    # client_socket.close()
    client_socket.send(b'0x65')  # send stop command stream audio


# processing with TCP
def ProcessData(file):
    print("send start command... \n")
    SendStartCommandToCall(file)
    print("receive data: {}".format(DATA_RECEIVE.decode("utf-8")))
    if DATA_RECEIVE.decode("utf-8") == b's'.decode("utf-8"):
        print("send audio data... \n")
        send_data = threading.Thread(target=SendData, args=(file,))
        send_data.start()
    else:
        print("else")
        Stop(file)
    data = b""
    while True:
        try:
            while len(data) <= 0 :
                packet = client_socket.recv()
                if type(packet) is str:
                    packet = bytes(packet, 'utf-8')
                if not packet:
                    print("no packet")
                    # break
                if packet.decode("utf-8") == b'e'.decode("utf-8"):
                    print("received e command")
                    Stop(file)
                pPacket = packet.decode("utf-8")
                print(f"data receive: {pPacket}")

        except Exception as e:
            print("error in process receive")
            print(e)
            break

def Stop(file):
    os.remove(file)
    client_socket.close()
    os._exit(1)

def run():
    global AUDIOFORMAT 
    host = '122.248.205.250' #'ec2-122-248-205-250.ap-southeast-1.compute.amazonaws.com'
    fileName = './samples/2min_2ch_16000khz_8bit.wav'
    
    now = datetime.datetime.now().strftime("%Y%m%d%H%M%S%f")
    index = sys.argv[1] if len(sys.argv) > 1 else 1
    outputFile = f"{now}-{index}.wav"

    ConnectWithTCPServer(host, 8001)
    WAVE = PyWave.open(fileName, mode="r", auto_read = True)
    AUDIOFORMAT = SetAudioFormat(WAVE)
    codec = GetAudioData(WAVE)
    ConvertAudioFile(fileName, outputFile, codec)
    ProcessData(outputFile)


if __name__ == "__main__":
    run()