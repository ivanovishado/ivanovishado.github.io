/**
 * @typedef {Object} MissionData
 * @property {string} id - Unique identifier ('misse-ff' | 'samara-cs')
 * @property {string} title - Display title
 * @property {string} status - Mission status
 * @property {string} description - Brief description
 * @property {Object} stats - Key-value pairs for statistics
 * @property {Array<{label: string, url: string}>} mediaLinks - Related links
 * @property {string} visualType - 'artifact' | 'satellite'
 */

export const MISSIONS = {
    'misse-ff': {
        id: 'misse-ff',
        title: 'MISSE-FF / CRS-31',
        status: 'RETURNED TO EARTH',
        description: 'Materials Science in Microgravity. Investigating the durability of polymers and composites in the harsh environment of Low Earth Orbit.',
        stats: {
            'DURATION': '6 MONTHS',
            'ORBIT': 'LEO (ISS)',
            'PAYLOAD': 'MATERIALS SAMPLE'
        },
        mediaLinks: [
            { label: 'FORBES', url: '#' },
            { label: 'EL PAIS', url: '#' }
        ],
        visualType: 'artifact'
    },
    'samara-cs': {
        id: 'samara-cs',
        title: 'SAMARA CUBESAT',
        status: 'TRAINING COMPLETED',
        description: 'Design of a 6U CubeSat for hurricane monitoring. Implementation of ADCS and power budgeting subsystems.',
        stats: {
            'LOCATION': 'SAMARA, RUSSIA',
            'COORDS': '53.2° N, 50.1° E',
            'STACK': 'C / ADCS'
        },
        mediaLinks: [
            { label: 'FIELD REPORT', url: 'https://matxspace.com' }
        ],
        visualType: 'satellite'
    }
};
