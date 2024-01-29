/*

    This example demonstrates real-time analysis (streaming) API.
    On a real-world situation, that audio will come from switchboard.
    On this example we read a file and stream is as it was an audio comming from the switchboard.

    The analysis algoritm uses 11025 samples per second, and 16 bits per sample, PCM, therefore this is the recommencded audio format.

    In case a different sample-rate streamed, the docker convert the original format to 11025, and this process slows the analysis process by about 9 times.
*/

const wavefile = require("wavefile");
const fs = require("fs");
const io = require("socket.io-client");

//const FILE_PATH = "somsom_6sec_11025Hz_16bit_2ch.wav"
//const ANALYSIS_SERVER_URL = "ws://18.183.235.112:2259";

//const FILE_PATH = "/home/parallels/Develop/AudioFiles/clinton/clinton_16000.wav"
//const ANALYSIS_SERVER_URL = "ws://localhost:2259";


const FILE_PATH = "/Users/chatcharin/Desktop/Centric/drive-download-20230810T040023Z-001/somsom_10sec.wav"
const ANALYSIS_SERVER_URL = "ws://122.248.205.250:8001";
const AUDIO_PACKET_SIZE_MS = 300;

streamFile(FILE_PATH, "json");

async function streamFile(filePath, count = 1, outputType) {
    try {
        await sendFile(ANALYSIS_SERVER_URL, filePath, outputType);
    } catch (err) {
        console.error(err);
    }
}

async function sendFile(analysisServerUrl, inputFilePath, outputType = "json") {
    const wav = new wavefile.WaveFile();
    const buffer = await fs.promises.readFile(inputFilePath)
    wav.fromBuffer(buffer);
    if (wav.fmt.bitsPerSample % 8 !== 0) {
        throw new Error("invalid bitsPerSample");
    }
    let socket = null;
    try {
        socket = await connect(analysisServerUrl)
        socket = io.connect(':2259');
        // socket = await _connect(socket)
        socket.on("audio-analysis-error", (err) => {
            console.log("Received audio-analysis-error:", err);
            throw err;
        });
    await handshake(socket, wav, outputType);
	await sendSamples(socket, wav);
    } catch (err) {
        throw err;
    } finally {
        socket?.disconnect();
    }
}

// function _connect(socket){
//     return new Promise((resolve,reject) => {
//         const url = "ws://122.248.205.250:2259"
//         const socket = io.connect(url, {
//             transports: ["websocket"]
//         });
//         socket.on("connect", () => {
//             console.log("Connected to server with port 2259:", url);
//             resolve(socket)
//         });
//         socket.on("connect_error", (err) => {
//             console.log("Connection error to server with port 2259:", url, "Error:", err);
//             reject(err);
//         });
//     });
// }

function connect(url) {
    return new Promise((resolve,reject) => {
        const socket = io.connect(url, {
            transports: ["websocket"],
            reconnection: false,
            path: '/socket'
        });
        socket.on("connect", () => {
            console.log("Connected to server:", url);
            resolve(socket)
        });
        socket.on("connect_error", (err) => {
            console.log("Connection error to server:", url, "Error:", err);
            reject(err);
        });
    });

}

function handshake(socket, wav, outputType) {
    return new Promise((resolve, reject) => {
        const onHandshakeDone = r => {

            console.log("RECEIVED: handshake-done")

            socket.off("handshake-done", onHandshakeDone);
            if (r.success) {
                resolve(r.data);
            } else {
                reject(new Error(r?.error || "Unexpected error occurred on handshake"));
            }
        };

        console.log("SENT: handshale")
        socket.on("handshake-done", onHandshakeDone);
        socket.emit("handshake", {
            isPCM: wav.fmt.audioFormat === 1,
            channels: wav.fmt.numChannels,
            backgroundNoise: 1000,
            bitRate: wav.fmt.bitsPerSample,
            sampleRate: wav.fmt.sampleRate,
            outputType,
        });
    });
}


function fetchAnalysisReport(socket) {
    return new Promise((resolve, reject) => {
        const analysisReportReady = r => {

		socket.off("analysis-report-ready", analysisReportReady);
            if (r.success) {
		        console.log("RECEIVED: analysis-report-ready");
                resolve(r.data);
            } else {
                reject(new Error(r?.error || "Unexpected error occurred on finalize"));
            }
	        socket.disconnect();
        };

        socket.on("analysis-report-ready", analysisReportReady);

        console.log("SEND: fetch-analysis-report");

        socket.emit("fetch-analysis-report", {
            // return report on json format
            outputFormat: "json",
            // true -> return on the report all the segments in the call.
            // in that case, the result will be similar to an offline analysis
	        fetchSegments: true,
        });
    });
}

function calcPacketSizeBytes(wav, audioLengthMS){
    // this function assumes bitsPerSample = 16 or 8 ==> the 2 supported values by the docker
    const singleSampleTimeMS = 1000 / wav.fmt.sampleRate;
    const singleSampleSizeBytes = wav.fmt.bitsPerSample / 8 * wav.fmt.numChannels;

    // Need to round to integer, as audioLengthMS / singleSAmpleTimeMS most likely will not be an integer
    const requiredSamplesCount = Math.round(audioLengthMS / singleSampleTimeMS);
    const packetSizeBytes = requiredSamplesCount * singleSampleSizeBytes;

    return packetSizeBytes;
}

async function sendSamples(socket, wav) {
    let packetSize = calcPacketSizeBytes(wav, AUDIO_PACKET_SIZE_MS);
    let offset = 0;

    return new Promise((resolve, reject) => {
        socket.on("audio-analysis-error", err => {
            // The docker will send this in case of an error.
            // The err param will hold the error details
            socket.disconnect();
            reject(err);
        });
        socket.on('audio-analysis', async (r) => {

            if (r.success) {
                if (r.data.done) {
		            console.log("RECEIVED: audio-analysis data");
                }
            }
            if (!r.success) {
                socket.disconnect();
                reject(new Error(r.error));
            }
        });
        socket.on('audio-analysis-completed', async (r) => {
            console.log("RECEIVED: audio-analysis-completed");
            if (r.success) {
                await fetchAnalysisReport(socket);
            }
        });

        function send() {
            let arraySize = (wav.data.samples.byteLength - offset < packetSize)? wav.data.samples.byteLength - offset:packetSize;
            const array = wav.data.samples.slice(offset, offset + arraySize);

            offset += arraySize;
            socket.emit("audio-stream", array);
            console.log("SEND: audio stream packet to server, size:", array.length);

            if (offset < wav.data.samples.length && socket.connected) {
                setTimeout(send, AUDIO_PACKET_SIZE_MS);
            } else if(socket.connected){

                console.log("SEND: audio stream packet to server, size: ZERO");

                socket.emit("audio-stream", Buffer.alloc(0));
            } else {
                resolve();
            }
        }
        send();
    });

}