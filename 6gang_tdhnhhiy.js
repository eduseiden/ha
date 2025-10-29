const fz = require('zigbee-herdsman-converters/converters/fromZigbee');
const tz = require('zigbee-herdsman-converters/converters/toZigbee');
const exposes = require('zigbee-herdsman-converters/lib/exposes');
const reporting = require('zigbee-herdsman-converters/lib/reporting');
const e = exposes.presets;
const ea = exposes.access;
const tuya = require('zigbee-herdsman-converters/lib/tuya');

// Conversor fromZigbee personalizado para DP 16 (backlight)
const fzBacklight = {
    cluster: 'manuSpecificTuya',
    type: ['commandDataResponse', 'commandDataReport'],
    convert: (model, msg, publish, options, meta) => {
        const dp = msg.data.dp;
        const data = msg.data.data;
        const result = {};

        // Backlight (DP 16) - funciona com 4-gang apenas
        if (dp === 16) {
            const value = data[0];
            result.backlight = value === 1 ? 'ON' : 'OFF';
        }

        return result;
    }
};

// Conversor toZigbee personalizado para DP 16 (backlight)
const tzBacklight = {
    key: ['backlight'],
    convertSet: async (entity, key, value, meta) => {
        if (key === 'backlight') {
            const state = value.toUpperCase() === 'ON' ? 1 : 0;
            await tuya.sendDataPointBool(entity, 16, state === 1);
            return {backlight: value.toUpperCase()};
        }
    },
};

const definition = {
    fingerprint: [
        {
            modelID: 'TS0601',
            manufacturerName: '_TZE204_tdhnhhiy',
        },
    ],
    zigbeeModel: ['TS0601'],
    model: 'TS0601',
    vendor: '_TZE204_tdhnhhiy',
    description: '6 gang wall touch switch board',
    fromZigbee: [fzBacklight, tuya.fz.datapoints],
    toZigbee: [tzBacklight, tuya.tz.datapoints],
    onEvent: tuya.onEventSetTime,
    configure: async (device, coordinatorEndpoint, logger) => {
        await tuya.configureMagicPacket(device, coordinatorEndpoint, logger);
        device.powerSource = 'Mains (single phase)';
        device.save();
    },
    exposes: [
        ...Array.from({length: 6}, (_, i) => 
            tuya.exposes.switch()
                .withEndpoint(`l${i + 1}`)
                .withDescription(`Switch ${i + 1}`)
        ),
        exposes.binary('backlight', ea.STATE_SET, 'ON', 'OFF')
            .withDescription('Control the backlight'),
    ],
    endpoint: (device) => {
        return Object.fromEntries(
            Array.from({length: 6}, (_, i) => [`l${i + 1}`, 1])
        );
    },
    meta: {
        multiEndpoint: true,
        tuyaDatapoints: [
            [1, 'state_l1', tuya.valueConverter.onOff],
            [2, 'state_l2', tuya.valueConverter.onOff],
            [3, 'state_l3', tuya.valueConverter.onOff],
            [4, 'state_l4', tuya.valueConverter.onOff],
            [5, 'state_l5', tuya.valueConverter.onOff],
            [6, 'state_l6', tuya.valueConverter.onOff],
            [16, 'backlight', tuya.valueConverter.onOff],
        ],
    },
};

module.exports = definition;
