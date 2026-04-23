import { STATION_MAP, VISIBLE_STATION_KEYS } from './stationMap';

export const MACHINE_OPERATION_CARDS = [
  { id: 'Station_30_Result', title: STATION_MAP.Station_30_Result, sources: ['Station_30_Result'] },
  { id: 'Station_31_Result', title: STATION_MAP.Station_31_Result, sources: ['Station_31_Result'] },
  { id: 'Station_32_Result', title: STATION_MAP.Station_32_Result, sources: ['Station_32_Result'] },
  { id: 'Station_100_1_Result', title: 'OP60A', sources: ['Station_100_1_Result', 'Station_100_ST_1_Result'] },
  { id: 'Station_100_2_Result', title: 'OP60B', sources: ['Station_100_2_Result', 'Station_100_ST_2_Result'] },
  { id: 'Station_200_3_Result', title: 'OP70A', sources: ['Station_200_3_Result', 'Station_200_ST_3_Result'] },
  { id: 'Station_200_4_Result', title: 'OP70B', sources: ['Station_200_4_Result', 'Station_200_ST_4_Result'] },
  { id: 'Station_200_5_Result', title: 'OP70C', sources: ['Station_200_5_Result', 'Station_200_ST_5_Result'] },
  { id: 'Station_300_6_Result', title: 'OP80A / OP90A', sources: ['Station_300_6_Result', 'Station_300_ST_6_Result'] },
  { id: 'Station_300_7_Result', title: 'OP80B / OP90B', sources: ['Station_300_7_Result', 'Station_300_ST_7_Result'] },
  { id: 'Station_300_8_Result', title: 'OP80C / OP90C', sources: ['Station_300_8_Result', 'Station_300_ST_8_Result'] },
  ...VISIBLE_STATION_KEYS
    .filter((key) => !['Station_30_Result', 'Station_31_Result', 'Station_32_Result', 'Station_100_Result', 'Station_200_Result', 'Station_300_Result'].includes(key))
    .map((key) => ({ id: key, title: STATION_MAP[key] || key, sources: [key] })),
];

export const MACHINE_FILTER_OPTIONS = [
  { value: 'ALL', label: 'All Machines' },
  ...MACHINE_OPERATION_CARDS.map((operation) => ({ value: operation.id, label: operation.title })),
];

export const getMachineOperation = (machineId) => (
  MACHINE_OPERATION_CARDS.find((operation) => operation.id === machineId) || null
);

export const normalizeMachineResultValue = (value) => {
  const text = String(value || '').trim().toUpperCase();
  if (text === 'OK' || text === 'PASS') return 'OK';
  if (['NG', 'NOK', 'FAIL'].includes(text)) return 'NG';
  return 'IN PROGRESS';
};

export const getMachineOperationValue = (record, operation) => {
  if (!operation) return '';

  const raw = record || {};
  const sourceKey = operation.sources.find((key) => {
    const value = raw[key];
    return value !== null && value !== undefined && String(value).trim() !== '';
  });

  return sourceKey ? raw[sourceKey] : '';
};
