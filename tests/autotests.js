const MQTT = require('async-mqtt');
const MoleClient = require('mole-rpc/MoleClient');
const MoleClientProxified = require('mole-rpc/MoleClientProxified');
const MoleServer = require('mole-rpc/MoleServer');
const X = require('mole-rpc/X');
const AutoTester = require('mole-rpc-autotester');

const TransportClient = require('../TransportClient');
const TransportServer = require('../TransportServer');

const MQTT_ENDPOINT = 'tcp://test.mosquitto.org:1883'; // "tcp://localhost:1883" for local testing

async function main() {
    await runAutoTests({ protocolVersion: 4 });
    await runAutoTests({ protocolVersion: 5 });
}

async function runAutoTests(settings) {
    const server = await prepareServer(settings);
    const clients = await prepareClients(settings);

    const autoTester = new AutoTester({
        X,
        server,
        simpleClient: clients.simpleClient,
        proxifiedClient: clients.proxifiedClient
    });

    await autoTester.runAllTests();
}

async function prepareServer({ protocolVersion }) {
    const mqttClient = MQTT.connect(MQTT_ENDPOINT, { protocolVersion });

    return new MoleServer({
        transports: [
            new TransportServer({
                mqttClient,
                inTopic: 'fromClient/+',
                outTopic: ({ inTopic }) => inTopic.replace('fromClient', 'toClient')
            })
        ]
    });
}

async function prepareClients({ protocolVersion }) {
    const mqttClient = MQTT.connect(MQTT_ENDPOINT, { protocolVersion });

    const simpleClient = new MoleClient({
        requestTimeout: 1000, // autotester expects this value
        transport: new TransportClient({
            mqttClient,
            inTopic: 'toClient/1',
            outTopic: 'fromClient/1'
        })
    });

    const proxifiedClient = new MoleClientProxified({
        requestTimeout: 1000, // autotester expects this value
        transport: new TransportClient({
            mqttClient,
            inTopic: 'toClient/2',
            outTopic: 'fromClient/2'
        })
    });

    return { simpleClient, proxifiedClient };
}

main().then(() => {
    process.exit();
}, console.error);
