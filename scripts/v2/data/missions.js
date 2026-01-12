/**
 * @typedef {Object} MissionData
 * @property {string} id - Unique identifier ('misse-ff' | 'samara-cs')
 * @property {string} title - Display title
 * @property {string} status - Mission status
 * @property {string} description - Brief description
 * @property {Object} stats - Key-value pairs for statistics
 * @property {Object} details - MISSION, ARTIFACT, OBJECTIVE info
 * @property {Array<{label: string, url: string}>} mediaLinks - Related links
 * @property {string} visualType - 'artifact' | 'satellite'
 */

export const MISSIONS = {
    'misse-ff': {
        id: 'misse-ff',
        title: 'MISSE-FF / CRS-31 FLIGHT',
        shortTitle: 'MISSE-FF',
        status: 'RETURNED TO EARTH',
        duration: '6 MONTHS IN ORBIT',
        description: 'Materials Science in Microgravity. Investigating the durability of polymers and composites in the harsh environment of Low Earth Orbit.',
        details: {
            mission: "'Surviving the Vacuum'",
            artifact: 'Material Specimen Container (MISSE)',
            objective: 'Test materials in LEO environment'
        },
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
        shortTitle: 'SAMARA-CS',
        status: 'TRAINING COMPLETED',
        duration: 'SUMMER 2019',
        location: 'SAMARA, RUSSIA',
        description: 'Design of a 6U CubeSat for hurricane monitoring. Implementation of ADCS and power budgeting subsystems.',
        details: {
            mission: "'From Mexico to Samara'",
            artifact: '6U CubeSat Platform',
            objective: 'Hurricane Monitoring Cubesat'
        },
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
