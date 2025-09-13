// A mock for @clerk/nextjs, reusing the logic from doctor-dashboard-api.test.tsx
module.exports = {
  useUser: () => ({
    user: {
      id: 'test-user-id',
      firstName: 'Test',
      lastName: 'Doctor',
      emailAddresses: [{ emailAddress: 'test@doctor.com' }],
    },
    isLoaded: true,
    isSignedIn: true,
  }),
  useAuth: () => ({
    getToken: jest.fn().mockResolvedValue('mock-token'),
  }),
  // Add other Clerk exports if needed by other tests
};