import sys, os, logging, time, threading
import random, string, re 
import subprocess 
import requests
import socket
import pyshark
import PyWave
import soundfile as sf
import numpy as np
from datetime import datetime
from rtp import RTP, PayloadType, Extension
from random import randint


SVR_HOST = "ec2-122-248-205-250.ap-southeast-1.compute.amazonaws.com"
SVR_HTTP_PORT = 80 
SVR_HTTP_URL = "http://{}:{}".format(SVR_HOST, SVR_HTTP_PORT)
URL_CALLOPERATION = "{}/CallOperation".format(SVR_HTTP_URL)
PROT_NAME = "RTP"

HEADER_SIZE = 12
X_RTP_DELAY = 0.001       # delay send packet each loop in seconds
X_RAW_FILE = True         # write raw audio file
X_RTP_STREAM = True       # enable RTP stream
X_RTP_FEQ = "8kHz"        # default, sampling frequency of audio data
X_AGENTNAME = "TestOpr"
X_AGENTID = "1234567"
RTP_PAYLOAD_SIZE = 800    # stream chunk size / RTP size max=1280
PCAP_FEXTS = [".pcap"]    # telephone pcap files
AUDIO_FEXTS = [".wav"]    # voice files 


pcap_files = []
audio_files = []


class RTPSender: 
  def __init__(self, host, port):
    self.host = host 
    self.port = port 
    self.client = ""
    self.server_address = (self.host, self.port)
    self.client_address = (self.client, self.port)
    self.sock = None
  
  def connect(self):
    try:
      logging.info(f"rtp connect to {self.host}:{self.port}")
      self.sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
      logging.info("rtp connected")
    except Exception as e:
      logging.error("can't create rtp connection %s", e)
      self.sock = None 
  
  def connected(self):
    return self.sock != None 

  def send(self, data):
    try:
      self.sock.sendto(data, self.server_address)
    except Exception as e:
      logging.error("can't send rtp data %s", e)

  def disconnect(self):
    try:
      logging.info("disconnect rtp connection")
      self.sock.close()
      logging.info("rtp disconnected")
    except Exception as e:
      logging.error("can't close rtp connection %s", e)


class AudioFileReader: 
  def __init__(self, fpath):
    self.fpath = fpath 
    self.get_info()
    self.loaded = False 

  def get_info(self):
    self.fsize = os.path.getsize(self.fpath)
    logging.info("reading wav header")
    try:
      pw = PyWave.open(self.fpath, mode="r")
      self.channels = pw.channels 
      self.bits = pw.bits_per_sample
      self.sample_rate = pw.frequency
      self.fmt_code = pw.format
      pw.close()
    except Exception as e:
      logging.error("error read wav %s", e)
      self.channels = -1 
  
  def is_stereo(self):
    return self.channels == 2

  def valid_file(self):
    return self.is_stereo()
  
  def show_fileinfo(self):
    logging.info("size: %s, channels: %s, bits: %s, fmt: %s, samplerate: %s", self.fsize, self.channels, self.bits, self.fmt_code, self.sample_rate)

  def load_audio_data(self):
    self.audio_data, self.sample_rate2 = sf.read(self.fpath)
    self.loaded = True 
  
  def gen_callid(self):
    rndstr = ''.join(random.choices(string.ascii_uppercase + string.digits, k=5))
    fname = os.path.basename(self.fpath)
    fname = os.path.splitext(fname)[0]
    return "{}.{}".format(fname, rndstr)
  
  def params(self):
    return {
      "call_id": self.gen_callid(), 
      "channels": self.channels,
      "ani": "9999",
      "dnis": "021634990",
      "ext": "9999",
      "wavformat": self.fmt_code,
      "samplerate": self.sample_rate,
      "bits": self.bits
    }

  def channel_data(self, chn):
    if self.loaded == False:
      self.load_audio_data()
    chunk = self.audio_data[:, chn]
    dtype = np.int16 
    rint = 32767
    if self.bits == 8:
      dtype = np.int8
      rint = 127
    return (chunk * rint).astype(dtype).tobytes()


class CallTask: 
  def __init__(self, params={}):
    self.params = params 
    self.audiobuffer = [None, None]
    self.audiofile = [None, None]
    self.rtpsenders = [None, None]
    self.send_delay = X_RTP_DELAY
    self.startok = False  
    self.rtpok = False 
    self.svrconnect = False  
    self.enableRTP = True 
    self.st = time.time()
  
  def call_params(self):
    return {
      "voiceid": self.call_id,
      "direction": self.get_direction(),
      "callStartTime": self.call_time,
      "durationTime": "1970-01-01 09:00:00.0",
      "srcDNo": self.from_dsp,
      "dstDNo": self.to_dsp,
      "extDNo": self.ext_no,
      "callID1": self.callid1,
      "agentID": X_AGENTID,
      "agentName" : X_AGENTNAME,
      "callID2": "",
      "channelNum": self.file_chn,
      "protocol": PROT_NAME,
      "VDN": "",
      "groupID": " ",
      "Meta1": "",
      "Meta2": "",
      "Meta3": "",
      "Meta4": "",
      "Meta5": "",
      "Fs": self.file_fq
    }

  def make_callid(self):
    now = datetime.now()
    return now.strftime("%Y%m%d%H%M%S%f")

  def make_calltime(self):
    now = datetime.now()
    return now.strftime("%Y-%m-%d %H:%M:%S")
  
  def get_direction(self):
    return "out"

  def set_audio_format(self):
    use_default = False
    if self.params["wavformat"] == 6:
      fmt_code = "alaw"
    elif self.params["wavformat"] == 7:
      fmt_code = "mulaw" 
    elif self.params["wavformat"] == 1 and self.params["bits"] == 8:
      fmt_code = "pcml8b"
    else:
      fmt_code = ""
      use_default = True

    if use_default:
      sample_rate = str(self.params["samplerate"]).replace("000", "k") + "Hz"
    else:
      sample_rate = str(self.params["samplerate"]).replace("000", "k")

    return fmt_code + sample_rate

  def prepare(self):
    self.callid1 = self.make_callid()
    self.call_time = self.make_calltime()
    self.file_fq = self.set_audio_format() #X_RTP_FEQ
    self.file_chn = self.params["channels"]
    self.call_id = self.params["call_id"]
    try:
      self.from_dsp = self.params["from_display_info"]
      self.to_dsp = self.params["to_display_info"]
      self.ext_no = self.params["sdp_owner_username"]
    except:
      self.from_dsp = self.params["ani"]
      self.to_dsp = self.params["dnis"]
      self.ext_no = self.params["ext"]
    logging.info("task.params: %s", self.call_params())
    logging.info("channels: %s", self.file_chn)
    logging.info("samplerate: %s", self.params["samplerate"])
  
  def start(self):
    logging.info("task: starting")
    if self.enableRTP: 
      resp = req_call_start(self.call_params())
      if resp['ResultCode'] == 0:
        logging.info("task: start ok")
        self.rtp_host = SVR_HOST
        self.rtp_ports = [resp["Port0"],resp["Port1"]]
        self.rtp_chunksize = resp["RTPSize"]
        self.svrconnect = True 
        self.connect_rtp()
        self.startok = True 
      else:
        logging.info("task: start failed")
    else:
      logging.info("rtp is disabled")
      self.startok = True
    self.prepare_buffers()

  def start_success(self):
    return self.startok
  
  def connect_rtp(self):
    for i in range(self.file_chn):
      self.rtpsenders[i] = RTPSender(self.rtp_host, self.rtp_ports[i])
      self.rtpsenders[i].connect()
      logging.info("channel %s: set port %s", i, self.rtp_ports[i])
    self.rtpok = True 
    
  def prepare_buffers(self):
    for i in range(self.file_chn):
      inf = {
        "number": i,
        "data": bytearray(),
        "size": 0, "recv_cnt": 0, "chunk_cnt": 0, "seq": 0, "sendsize": 0,
        "rndnbr": randint(0, (2**16)-1), "pos": 0
      }
      self.audiobuffer[i] = inf
      self.audiofile[i] = self.create_audiofile(i)
      logging.info("channel %s: %s", i, inf)

  def make_rtppkt(self, chn, data, frame_no):
    seqnum = frame_no
    ssrc = self.audiobuffer[chn]["rndnbr"]
    #pt = PayloadType.UNASSIGNED_95 # UNASSIGN - 95
    pt = PayloadType.PCMU # PCM MULAW - 0
    #pt = PayloadType.PCMA # PCM ALAW - 8
    #ts = int(time.time())
    ts = frame_no * 160
    baseRTP = RTP(
      payloadType=pt,
      sequenceNumber=seqnum,
      timestamp=ts,
      extension=None,
      payload=data,
      ssrc=ssrc
    )
    return baseRTP.toBytearray()

  def send_audiodata(self, data, chn):
    #paclen = self.rtp_chunksize - HEADER_SIZE
    paclen = RTP_PAYLOAD_SIZE - HEADER_SIZE
    if data != None:
      self.audiobuffer[chn]["data"].extend(data)
      self.audiobuffer[chn]["size"] += len(data)
    buflen = len(self.audiobuffer[chn]["data"])
    pos = self.audiobuffer[chn]["pos"]
    while buflen - pos >= paclen and pos <= buflen - 1:
      senddata = bytearray()
      outlen = len(senddata)
      while outlen < paclen and pos <= buflen - 1:
        senddata.append(self.audiobuffer[chn]["data"][pos])
        pos += 1
        outlen = len(senddata)
      if outlen > 0:
        self.audiobuffer[chn]["pos"] = pos 
        self.audiobuffer[chn]["sendsize"] += outlen
        if self.rtpok and self.startok:
          self.rtpsenders[chn].send(self.make_rtppkt(chn, senddata, self.audiobuffer[chn]["seq"]))
        self.audiofile[chn].write(senddata)
        self.audiobuffer[chn]["chunk_cnt"] += 1
        self.audiobuffer[chn]["seq"] += 1
        if self.svrconnect and self.send_delay > 0:
          time.sleep(self.send_delay)
        if self.audiobuffer[chn]["seq"] % 2000 == 0:
          logging.info("sent/write ch=%s seq=%s size=%s", chn, self.audiobuffer[chn]["seq"], self.audiobuffer[chn]["size"])

  def before_end(self):
    for i in range(self.file_chn):
      self.send_audiodata(None, i)
  
  def create_audiofile(self, chn):
    raw_fname = "./output/{}-{}.raw".format(self.callid1, chn)
    logging.info("raw-file: %s", raw_fname)
    return open(raw_fname,'wb')

  def end(self):
    self.before_end()

    if self.svrconnect == True:
      resp = req_call_end(self.call_params())
      if resp['ResultCode'] == 0:
        logging.info("task: terminate ok")
      else:
        logging.info("task: terminate failed")
    
    for rtps in self.rtpsenders:
      if rtps != None:
        rtps.disconnect()
    
    for auf in self.audiofile:
      if auf != None:
        auf.close()

    self.result()

  def processing_time(self):
    et = time.time()
    return et - self.st 

  def result(self):
    if self.start_success():
      for c in self.audiobuffer:
        logging.info("channel %s: size=%s, send-size=%s seqcnt=%s", c["number"], c["size"], c["sendsize"], c["seq"])
    else: 
      logging.info("no result to show")
    logging.info("task completed in %s seconds", self.processing_time())


def req_call_start(params):
  logging.info("make req.callstart")
  params["operation"] = "start"
  return make_request(params) 


def req_call_end(params):
  logging.info("make req.callend")
  params["operation"] = "terminate"
  params.pop("Fs")
  return make_request(params) 


def make_request(params):
  logging.info("sending request")
  try:
    logging.info("with params: %s", params)
    req = requests.post(URL_CALLOPERATION, json=params, timeout=15)
    resp = req.json()
    logging.info("response is %s", resp)
    return resp 
  except Exception as e:
    logging.error("send request failed %s", e)
    return {
      "ResultCode": -1,
      "Error": "Client request failed"
    }


def analyze_rtpstreams(pcap_fpath):
  logging.info("reading pcap: %s", pcap_fpath)
  output_list = []
  matched_list = []
  cmd = "-r {} -qz rtp,streams".format(pcap_fpath)
  ps = subprocess.run(["/usr/bin/tshark", "-r", pcap_fpath, "-qz", "rtp,streams"], text=True, capture_output=True)
  for l in str(ps.stdout).splitlines():
    l = l.lstrip().rstrip()
    if re.match("^[0-9]", l):
      s = re.split("\s+", l)
      a = {
        "start_time": s[0],
        "end_time": s[1],
        "src_ip": s[2],
        "src_port": s[3],
        "from": "{}:{}".format(s[2],s[3]),
        "dest_ip": s[4],
        "dest_port": s[5],
        "to": "{}:{}".format(s[4],s[5])
      }
      output_list.append(a)
  while len(output_list) > 0:
    a = output_list.pop(0)
    for b in output_list: 
      if a["from"] == b["to"] and b["from"] == a["to"]:
        matched_list.append([a,b])
        break 
  logging.info("found %s records", len(matched_list))
  return matched_list


def get_rtpinfo(pac):
  paci = {}
  for k in pac.field_names:
    paci[k] = pac.get(k)
  return paci 


def get_sipinfo(pac, rtpstreams):
  logging.info("checking sip-info")
  sipi = { 
    "rtpx": [],
    "channels": 0
  }
  for k in pac.field_names:
    sipi[k] = pac.get(k)
  for rx in rtpstreams:
    for r in rx:
      if sipi["sdp_owner_address"] == r["src_ip"] and sipi["sdp_media_port"]:
        sipi["rtpx"] = rx 
        break 
  sipi["channels"] = len(sipi["rtpx"])
  return sipi 


def process_pcap():
  rtpstreams = []
  for pcap_fpath in pcap_files:
    rtpstreams.extend(analyze_rtpstreams(pcap_fpath))
  
    siplist = []
    cap = pyshark.FileCapture(pcap_fpath, display_filter='sip')
    for i in cap: 
      pac = i[3]
      if "status_code" in pac.field_names:
        if pac.cseq == "1 INVITE" and pac.status_line == "SIP/2.0 200 OK":
          sipi = get_sipinfo(pac, rtpstreams)
          siplist.append(sipi)

    for sipi in siplist:
      if sipi["channels"] > 0:
        t = CallTask(sipi)
        t.prepare()
        t.enableRTP = X_RTP_STREAM 
        t.start()
        
        if t.start_success():
          pcnt = 0
          rtpx = sipi["rtpx"]
          dsp_filter = f"(ip.src=={rtpx[0]['src_ip']} && udp.srcport=={rtpx[0]['src_port']}) || (ip.src=={rtpx[1]['src_ip']} && udp.srcport=={rtpx[1]['src_port']})"
          dsp_filter = f"rtp && ({ dsp_filter })"
          logging.info("filter packet: %s", dsp_filter)
          cap = pyshark.FileCapture(pcap_fpath, display_filter=dsp_filter)
          for i in cap:
            pa1 = i[1]
            pa2 = i[2]
            pac = i[3]
            #print(get_rtpinfo(pac))
            chn = -1
            if pa1.src_host == rtpx[0]["src_ip"]:
              chn = 0 
            elif pa1.src_host == rtpx[1]["src_ip"]:
              chn = 1 
            if pac.payload and chn >= 0:
              payl = pac.payload.split(":")
              packet = " ".join(payl)
              audio = bytearray.fromhex(packet)
              t.send_audiodata(audio, chn)
            pcnt += 1

        t.end()


def process_audio_files():
  for fpath in audio_files:
    logging.info("--> audio file: %s", fpath)
    auf = AudioFileReader(fpath)
    if auf.valid_file():
      auf.show_fileinfo()
      aufi = auf.params()
      t = CallTask(aufi)
      t.prepare()
      t.enableRTP = X_RTP_STREAM 
      t.start()
      logging.info("sending/writing data")
      thread_ch0 = threading.Thread(target=t.send_audiodata, args=(auf.channel_data(0), 0))
      thread_ch1 = threading.Thread(target=t.send_audiodata, args=(auf.channel_data(1), 1))
      thread_ch0.start()
      thread_ch1.start()
      thread_ch0.join()
      thread_ch1.join()
      t.end()
    else: 
      logging.error("invalid audio file")
    logging.info("")


def main():
  logging.info("script started")
  if len(pcap_files) > 0:
    process_pcap()
  if len(audio_files) > 0:
    process_audio_files()


def get_input_files():
  l = len(sys.argv)
  i = 1
  while i <= l - 1:
    fpath = sys.argv[i]
    if os.path.exists(fpath) and os.path.isfile(fpath):
      fname, fext = os.path.splitext(fpath)
      if fext in PCAP_FEXTS:
        pcap_files.append(fpath)
      elif fext in AUDIO_FEXTS:
        audio_files.append(fpath)
    i += 1


def run():
  logging.basicConfig(stream=sys.stdout, level=logging.DEBUG)
  get_input_files()
  main()
  logging.info("script ended")


if __name__ == "__main__":
  run()
