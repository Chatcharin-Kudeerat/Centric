(function() {
  global.esas = global.esas || {};
  global.esas.client = require('../src/index.js');
})();

const fs = require('fs');
const config = {"url": "ws://ec2-122-248-205-250.ap-southeast-1.compute.amazonaws.com"} // sever url //
const esasClientV2 = new global.esas.client.v2(config); // EsasClientV2 //

let wavPath = `${__dirname}/../../samples/pcm_file/49sec_8k_16bit.wav`
// let wavPath = `${__dirname}/../../samples/30sec.wav`
let wav = new global.esas.client.util["WaveFile"](fs.readFileSync(wavPath))
let context = {"channels": wav.fmt["numChannels"], "bitRate": (wav.fmt["bitsPerSample"]), "sampleRate": wav.fmt["sampleRate"], "bigendian": false}
let delayTime = 50
let package_size = wav.fmt["byteRate"]

let socketSession = esasClientV2.startSocketIoSession()
print_info(context)
// test_start()
start_process()

let arr_result = []
// const { spawn } = require('child_process');
// const child = spawn(
//   'ffmpeg',
//   [
//     // '-f', 'alaw',
//     // '-ar', '8000',
//     '-i', 'pipe:0',
//     '-ar', '11025',
//     '-ac', '1',
//     '-f', 's16le',
//     // 'pipe:1'
//   ],
// );

// child.stdout.on('data', (data) => {
//   console.log('Out put :'+data.length);
// });

// child.stderr.on('data', (data) => {
//   console.log(data.toString());
// });

// child.on('close', (code) => {
//   console.log(`Process exited with code: ${code}`);
//   if (code === 0) {
//       console.log("FFmpeg finished successfully");
//   } else {
//       console.log("FFmpeg encountered an error, check the console output");
//   }
// });

// async function test_start(){
//   let chunks = make_chunk(wav)
//   for (const chunk of chunks) {
//     await delay(delayTime)
//     child.stdin.write(chunk);
//   }
// }

async function start_process(){
  // let chunks = _.chunk(wav.data["samples"], package_size)
  let chunks = make_chunk(wav)
  await socketSession.init(context)
  let i = 1
  for (const chunk of chunks) {
    await delay(delayTime)
    console.log(`send package : ${i}/${chunks.length}`)
    socketSession.send(chunk)
    i++
  }
  await socketSession.term()
}

socketSession.socket.on("analyzed", (data) => {
  console.log(data)
});

function start_process2(){
  socketSession.init(context).then(() => {
    console.log("success init :");
    for (const chunk of chunks) {
      socketSession.send(chunk);
    }
    socketSession.term().then(()=>{
      console.log("success term : "+err);
    }).catch((err) => {
      console.log("error term : "+err);
    });
  })
  .catch((err) => {
    console.log("error init : "+err);
  });
}

function delay(delay) {
  return new Promise((resolve, reject) => {
      setTimeout(() => {
          resolve();
      }, delay);
  });
}

function print_info(context) {
  console.log("=== Wav file context data ===")
  for (const key in context) {  
    console.log(`${key}: ${context[key]}`)
  }
  console.log("=============================")
}

function make_chunk(wav) {
  let chunks = []
  let chunks_length = 1280
  let chunk_time = wav.data["chunkSize"]/chunks_length
  for (let i = 0; i < chunk_time; i++) {
    let start = chunks_length*i
    let end = start+chunks_length
    let buff = wav.data["samples"].subarray(start, end)
    chunks.push(buff)
  }
  return chunks
}
