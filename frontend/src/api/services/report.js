import client from '../client';
const p = params => Object.fromEntries(
    Object.entries(params || {}).filter(([, v]) => v != null && v !== '' && v !== 'ALL')
);

const UI_EMPTY_VALUE = '-';
const HEAT_TREATMENT_DURATION_KEY = 'Heat_Treatment_Duration';

const isEmptyReportValue = (value) => {
    if (value === null || value === undefined) return true;
    return typeof value === 'string' && value.trim() === '';
};

const padDurationPart = (value) => String(value).padStart(2, '0');

const getHeatTreatmentDuration = (inTime, outTime) => {
    if (isEmptyReportValue(inTime) || isEmptyReportValue(outTime)) return UI_EMPTY_VALUE;

    const inDate = new Date(inTime);
    const outDate = new Date(outTime);
    if (Number.isNaN(inDate.getTime()) || Number.isNaN(outDate.getTime())) return UI_EMPTY_VALUE;

    const durationMs = outDate.getTime() - inDate.getTime();
    if (durationMs < 0) return UI_EMPTY_VALUE;

    const totalSeconds = Math.floor(durationMs / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return `${padDurationPart(hours)}:${padDurationPart(minutes)}:${padDurationPart(seconds)}`;
};

const normalizeReportRecord = (record = {}) => {
    const normalizedRecord = Object.fromEntries(
        Object.entries(record).map(([key, value]) => [key, isEmptyReportValue(value) ? UI_EMPTY_VALUE : value])
    );

    return {
        ...normalizedRecord,
        [HEAT_TREATMENT_DURATION_KEY]: getHeatTreatmentDuration(record.In_Time, record.Out_Time),
    };
};

const normalizeReportResponse = (payload = {}) => ({
    ...payload,
    records: Array.isArray(payload.records) ? payload.records.map(normalizeReportRecord) : [],
    displayRecords: Array.isArray(payload.displayRecords) ? payload.displayRecords.map(normalizeReportRecord) : [],
});

export const getDateRange = () => client.get('/report/date-range').then(r => r.data);
export const getSummary = (params) => client.get('/report/summary', { params: p(params) }).then(r => r.data);
export const getShiftWise = (params) => client.get('/report/shift-wise', { params: p(params) }).then(r => r.data);
export const getStationWise = (params) => client.get('/report/station-wise', { params: p(params) }).then(r => r.data);
export const getHourly = (params) => client.get('/report/hourly', { params: p(params) }).then(r => r.data);
export const getRecords = (params) => client.get('/report/records', { params: p(params) }).then(r => normalizeReportResponse(r.data));
export const getOee = (params) => client.get('/report/oee', { params: p(params) }).then(r => r.data);
export const exportRecords = (params) => client.get('/report/records', { params: { ...p(params), export: 'true' } }).then(r => normalizeReportResponse(r.data));
export const getJourney = (params) => client.get('/report/journey', { params: p(params) }).then(r => r.data);
export const resetJourneyStation = (payload) => client.post('/report/journey/reset', payload).then(r => r.data);
