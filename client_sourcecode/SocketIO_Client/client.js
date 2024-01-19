const { argv } = require('node:process');
const {delay} = require('./lib/lib.js');
const src = require('./lib/index.js');
const os = require('os');
const _ = src.util["lodash"]
const fs = require('fs');
const config = {"url": "ws://ec2-122-248-205-250.ap-southeast-1.compute.amazonaws.com"} // sever url //
const esasClientV2 = new src.v2(config); // EsasClientV2 //

let delayTime = 50
let package_size = 1280
let wavName = argv[2] ? argv[2] : '20sec.wav';
let wavPath = `${__dirname}/samples/${wavName}`
let wav = new src.util["WaveFile"](fs.readFileSync(wavPath))
let context = set_context()

start_process()

async function start_process(){
  try{
    print_info(context)
    let chunks = make_chunk(wav.toBuffer())
    let socketSession = esasClientV2.startSocketIoSession()
    await socketSession.init(context)
    let i = 1
    for (const chunk of chunks) {
      await delay(delayTime)
      console.log(`send package : ${i}/${chunks.length}`)
      socketSession.send(chunk)
      i++
    }
    console.log("send term event");
    await socketSession.term()
  }catch (e){
    console.log(e)
  }
}

function set_context(){
  let context = {"channels": wav.fmt["numChannels"], "bitRate": (wav.fmt["bitsPerSample"]), "sampleRate": wav.fmt["sampleRate"], "bigendian": false, "audioCodec": ''}
  switch (wav.fmt['audioFormat']){
    case 6:
      context['audioCodec'] = "alaw";
      break;
    case 7:
      context['audioCodec'] = "mulaw";
      break;
  }
  context['bigendian'] = os.endianness() == "BE" ? true : false;
  return context
}

function make_chunk(wav) {
  let chunks = []
  let chunks_length = package_size * context["channels"]
  let chunk_time = Math.ceil(wav.length/chunks_length)
  for (let i = 0; i < chunk_time; i++) {
    let start = chunks_length*i
    let end = start+chunks_length
    let buff = wav.subarray(start, end)
    chunks.push(buff)
  }
  return chunks
}

function print_info(context) {
  console.log("=== Wav file context data ===")
  console.log(`filename: ${wavName}`)
  for (const key in context) {
    console.log(`${key}: ${context[key]}`)
  }
  // console.log(wav)
  console.log("=============================")
}