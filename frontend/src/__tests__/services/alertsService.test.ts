import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { alertsService } from '@/services/alertsService';
import { Alert, AlertListResponse } from '@/types/alerts';
import { mockAlerts } from '../mocks/fixtures';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://backend-api:8000';
const MOCK_PATIENT_ID = 1;
const MOCK_ALERT_ID = 1;
const token = 'fake-jwt-token';

const mockAlertListResponse: AlertListResponse = {
    items: mockAlerts,
    total: mockAlerts.length,
};

const server = setupServer(
    http.get(`${API_URL}/alerts/patient/${MOCK_PATIENT_ID}`, () => {
        return HttpResponse.json(mockAlertListResponse);
    }),

    http.patch(`${API_URL}/alerts/${MOCK_ALERT_ID}`, async ({ request }) => {
        const updateData = await request.json() as { status?: 'read' | 'unread' };
        const originalAlert = mockAlerts.find(a => a.alert_id === MOCK_ALERT_ID);
        if (!originalAlert) return new HttpResponse(null, { status: 404 });

        const updatedAlert: Alert = { ...originalAlert, ...updateData };
        return HttpResponse.json(updatedAlert);
    })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('alertsService', () => {
    describe('getPatientAlerts', () => {
        it('fetches all alerts for a patient', async () => {
            const result = await alertsService.getPatientAlerts(MOCK_PATIENT_ID, token);

            expect(result).toEqual(mockAlertListResponse);
            expect(result.items.length).toBe(mockAlerts.length);
            expect(result.total).toBe(mockAlerts.length);
        });

        it('handles API errors gracefully', async () => {
            server.use(
                http.get(`${API_URL}/alerts/patient/${MOCK_PATIENT_ID}`, () => {
                    return new HttpResponse(null, { status: 500, statusText: 'Internal Server Error' });
                })
            );

            await expect(alertsService.getPatientAlerts(MOCK_PATIENT_ID, token)).rejects.toThrow('Internal Server Error');
        });
    });

    describe('updateAlertStatus', () => {
        it('updates an alert status successfully', async () => {
            const updateData = { status: 'read' as const };
            const result = await alertsService.updateAlertStatus(MOCK_ALERT_ID, updateData, token);

            expect(result).toHaveProperty('alert_id', MOCK_ALERT_ID);
            expect(result).toHaveProperty('status', 'read');
        });

        it('handles errors when updating an alert', async () => {
            server.use(
                http.patch(`${API_URL}/alerts/${MOCK_ALERT_ID}`, () => {
                    return new HttpResponse(null, { status: 404, statusText: 'Not Found' });
                })
            );

            await expect(alertsService.updateAlertStatus(MOCK_ALERT_ID, { status: 'read' }, token)).rejects.toThrow('Not Found');
        });
    });
});