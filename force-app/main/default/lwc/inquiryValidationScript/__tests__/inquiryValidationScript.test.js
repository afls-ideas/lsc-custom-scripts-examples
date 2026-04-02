/**
 * Jest tests for inquiryValidationScript
 *
 * This script validates inquiry records by checking:
 * 1. Inquiry questions exist in the database
 * 2. Inquiry type field is populated
 * 3. Required fields (Subject, Priority, AccountId) are present
 */

import InquiryValidationScript from '../inquiryValidationScript';

// Mock the CustomScript base class
jest.mock('c/customScriptImports', () => ({
    CustomScript: class CustomScript {}
}));

describe('inquiryValidationScript', () => {
    let script;
    let mockRecord;
    let mockDb;
    let mockLog;
    let mockEnv;
    let mockApi;
    let mockMoment;

    // Mock ConditionBuilder and FieldCondition globally
    global.ConditionBuilder = jest.fn();
    global.FieldCondition = jest.fn();

    beforeEach(() => {
        // Clear all mocks before each test
        jest.clearAllMocks();

        // Create script instance
        script = new InquiryValidationScript();

        // Mock record object
        mockRecord = {
            stringValue: jest.fn()
        };

        // Mock database query method
        mockDb = {
            query: jest.fn()
        };

        // Mock log object
        mockLog = {
            error: jest.fn()
        };

        // Mock other dependencies
        mockEnv = {};
        mockApi = {};
        mockMoment = jest.fn();

        // Setup default ConditionBuilder mock behavior
        global.ConditionBuilder.mockImplementation(() => ({
            build: jest.fn().mockResolvedValue({})
        }));
    });

    describe('should return success when inquiry questions exist', () => {
        it('validates all fields successfully when inquiry questions are present', async () => {
            // Setup: Mock record with valid values
            mockRecord.stringValue.mockImplementation((field) => {
                const values = {
                    'Id': 'inquiry-123',
                    'uid': 'inquiry-123',
                    'Type': 'Medical Inquiry',
                    'Subject': 'Test Subject',
                    'Priority': 'High',
                    'AccountId': 'acc-456'
                };
                return values[field];
            });

            // Mock database query to return inquiry questions
            mockDb.query.mockResolvedValue([
                { Id: 'q1', Name: 'Question 1' },
                { Id: 'q2', Name: 'Question 2' }
            ]);

            // Execute script
            const promiseArray = script.onExecute({
                api: mockApi,
                record: mockRecord,
                env: mockEnv,
                db: mockDb,
                moment: mockMoment,
                log: mockLog
            });

            // Wait for all promises to resolve
            const results = await Promise.all(promiseArray);
            const flatResults = results.flat();

            // Assertions
            expect(flatResults).toHaveLength(3);

            // Check inquiry questions validation
            expect(flatResults[0]).toEqual({
                title: 'Inquiry Questions Added',
                status: 'success'
            });

            // Check inquiry type validation
            expect(flatResults[1]).toEqual({
                title: 'Inquiry Type: Medical Inquiry',
                status: 'success'
            });

            // Check required fields validation
            expect(flatResults[2]).toEqual({
                title: 'All required fields are present',
                status: 'success'
            });

            // Verify database was queried correctly
            expect(mockDb.query).toHaveBeenCalledWith(
                'InquiryQuestion',
                expect.anything(),
                ['Id', 'Name']
            );
        });
    });

    describe('should return error when no inquiry questions found', () => {
        it('returns error status when database returns empty array', async () => {
            // Setup: Mock record with ID
            mockRecord.stringValue.mockImplementation((field) => {
                const values = {
                    'Id': 'inquiry-123',
                    'uid': 'inquiry-123',
                    'Type': 'Medical Inquiry',
                    'Subject': 'Test Subject',
                    'Priority': 'High',
                    'AccountId': 'acc-456'
                };
                return values[field];
            });

            // Mock database query to return empty array
            mockDb.query.mockResolvedValue([]);

            // Execute script
            const promiseArray = script.onExecute({
                api: mockApi,
                record: mockRecord,
                env: mockEnv,
                db: mockDb,
                moment: mockMoment,
                log: mockLog
            });

            // Wait for all promises to resolve
            const results = await Promise.all(promiseArray);
            const flatResults = results.flat();

            // Assertions
            expect(flatResults.length).toBeGreaterThanOrEqual(3);

            // First result should be error about no inquiry questions
            expect(flatResults[0]).toEqual({
                title: 'No Inquiry Questions Found',
                status: 'error'
            });
        });

        it('returns error status when database returns null', async () => {
            // Setup
            mockRecord.stringValue.mockImplementation((field) => {
                const values = {
                    'Id': 'inquiry-123',
                    'Type': 'Medical Inquiry',
                    'Subject': 'Test Subject',
                    'Priority': 'High',
                    'AccountId': 'acc-456'
                };
                return values[field];
            });

            // Mock database query to return null
            mockDb.query.mockResolvedValue(null);

            // Execute script
            const promiseArray = script.onExecute({
                api: mockApi,
                record: mockRecord,
                env: mockEnv,
                db: mockDb,
                moment: mockMoment,
                log: mockLog
            });

            // Wait for all promises to resolve
            const results = await Promise.all(promiseArray);
            const flatResults = results.flat();

            // Assertions
            expect(flatResults[0]).toEqual({
                title: 'No Inquiry Questions Found',
                status: 'error'
            });
        });
    });

    describe('should return error when inquiry type is missing', () => {
        it('returns error status when Type field is empty', async () => {
            // Setup: Mock record with empty Type
            mockRecord.stringValue.mockImplementation((field) => {
                const values = {
                    'Id': 'inquiry-123',
                    'Type': '', // Empty type
                    'Subject': 'Test Subject',
                    'Priority': 'High',
                    'AccountId': 'acc-456'
                };
                return values[field];
            });

            mockDb.query.mockResolvedValue([{ Id: 'q1', Name: 'Q1' }]);

            // Execute script
            const promiseArray = script.onExecute({
                api: mockApi,
                record: mockRecord,
                env: mockEnv,
                db: mockDb,
                moment: mockMoment,
                log: mockLog
            });

            // Wait for all promises to resolve
            const results = await Promise.all(promiseArray);
            const flatResults = results.flat();

            // Find the type validation result
            const typeResult = flatResults[1];
            expect(typeResult).toEqual({
                title: 'Inquiry Type must be specified before proceeding.',
                status: 'error'
            });
        });

        it('returns error status when Type field is null', async () => {
            // Setup: Mock record with null Type
            mockRecord.stringValue.mockImplementation((field) => {
                const values = {
                    'Id': 'inquiry-123',
                    'Type': null, // Null type
                    'Subject': 'Test Subject',
                    'Priority': 'High',
                    'AccountId': 'acc-456'
                };
                return values[field];
            });

            mockDb.query.mockResolvedValue([{ Id: 'q1', Name: 'Q1' }]);

            // Execute script
            const promiseArray = script.onExecute({
                api: mockApi,
                record: mockRecord,
                env: mockEnv,
                db: mockDb,
                moment: mockMoment,
                log: mockLog
            });

            // Wait for all promises to resolve
            const results = await Promise.all(promiseArray);
            const flatResults = results.flat();

            // Find the type validation result
            const typeResult = flatResults[1];
            expect(typeResult).toEqual({
                title: 'Inquiry Type must be specified before proceeding.',
                status: 'error'
            });
        });
    });

    describe('should return error when required fields are missing', () => {
        it('returns error when Subject is missing', async () => {
            // Setup: Mock record with missing Subject
            mockRecord.stringValue.mockImplementation((field) => {
                const values = {
                    'Id': 'inquiry-123',
                    'Type': 'Medical Inquiry',
                    'Subject': '', // Empty subject
                    'Priority': 'High',
                    'AccountId': 'acc-456'
                };
                return values[field];
            });

            mockDb.query.mockResolvedValue([{ Id: 'q1', Name: 'Q1' }]);

            // Execute script
            const promiseArray = script.onExecute({
                api: mockApi,
                record: mockRecord,
                env: mockEnv,
                db: mockDb,
                moment: mockMoment,
                log: mockLog
            });

            // Wait for all promises to resolve
            const results = await Promise.all(promiseArray);
            const flatResults = results.flat();

            // Check that Subject error is present
            expect(flatResults).toContainEqual({
                title: 'Subject is required',
                status: 'error'
            });
        });

        it('returns error when Priority is missing', async () => {
            // Setup: Mock record with missing Priority
            mockRecord.stringValue.mockImplementation((field) => {
                const values = {
                    'Id': 'inquiry-123',
                    'Type': 'Medical Inquiry',
                    'Subject': 'Test Subject',
                    'Priority': '', // Empty priority
                    'AccountId': 'acc-456'
                };
                return values[field];
            });

            mockDb.query.mockResolvedValue([{ Id: 'q1', Name: 'Q1' }]);

            // Execute script
            const promiseArray = script.onExecute({
                api: mockApi,
                record: mockRecord,
                env: mockEnv,
                db: mockDb,
                moment: mockMoment,
                log: mockLog
            });

            // Wait for all promises to resolve
            const results = await Promise.all(promiseArray);
            const flatResults = results.flat();

            // Check that Priority error is present
            expect(flatResults).toContainEqual({
                title: 'Priority is required',
                status: 'error'
            });
        });

        it('returns error when AccountId is missing', async () => {
            // Setup: Mock record with missing AccountId
            mockRecord.stringValue.mockImplementation((field) => {
                const values = {
                    'Id': 'inquiry-123',
                    'Type': 'Medical Inquiry',
                    'Subject': 'Test Subject',
                    'Priority': 'High',
                    'AccountId': '' // Empty account
                };
                return values[field];
            });

            mockDb.query.mockResolvedValue([{ Id: 'q1', Name: 'Q1' }]);

            // Execute script
            const promiseArray = script.onExecute({
                api: mockApi,
                record: mockRecord,
                env: mockEnv,
                db: mockDb,
                moment: mockMoment,
                log: mockLog
            });

            // Wait for all promises to resolve
            const results = await Promise.all(promiseArray);
            const flatResults = results.flat();

            // Check that AccountId error is present
            expect(flatResults).toContainEqual({
                title: 'Account is required',
                status: 'error'
            });
        });

        it('returns multiple errors when multiple fields are missing', async () => {
            // Setup: Mock record with all required fields missing
            mockRecord.stringValue.mockImplementation((field) => {
                const values = {
                    'Id': 'inquiry-123',
                    'Type': 'Medical Inquiry',
                    'Subject': '',
                    'Priority': '',
                    'AccountId': ''
                };
                return values[field];
            });

            mockDb.query.mockResolvedValue([{ Id: 'q1', Name: 'Q1' }]);

            // Execute script
            const promiseArray = script.onExecute({
                api: mockApi,
                record: mockRecord,
                env: mockEnv,
                db: mockDb,
                moment: mockMoment,
                log: mockLog
            });

            // Wait for all promises to resolve
            const results = await Promise.all(promiseArray);
            const flatResults = results.flat();

            // Should have 5 results: 1 success (questions), 1 success (type), 3 errors (fields)
            expect(flatResults.length).toBe(5);

            // Check all three error messages are present
            expect(flatResults).toContainEqual({
                title: 'Subject is required',
                status: 'error'
            });
            expect(flatResults).toContainEqual({
                title: 'Priority is required',
                status: 'error'
            });
            expect(flatResults).toContainEqual({
                title: 'Account is required',
                status: 'error'
            });
        });
    });

    describe('should handle database errors gracefully', () => {
        it('returns error when database query throws exception', async () => {
            // Setup
            mockRecord.stringValue.mockImplementation((field) => {
                const values = {
                    'Id': 'inquiry-123',
                    'Type': 'Medical Inquiry',
                    'Subject': 'Test Subject',
                    'Priority': 'High',
                    'AccountId': 'acc-456'
                };
                return values[field];
            });

            // Mock database to throw error
            mockDb.query.mockRejectedValue(new Error('Database connection failed'));

            // Execute script
            const promiseArray = script.onExecute({
                api: mockApi,
                record: mockRecord,
                env: mockEnv,
                db: mockDb,
                moment: mockMoment,
                log: mockLog
            });

            // Wait for all promises to resolve
            const results = await Promise.all(promiseArray);
            const flatResults = results.flat();

            // Check that error is logged
            expect(mockLog.error).toHaveBeenCalledWith(
                'Error validating inquiry questions',
                expect.any(Error)
            );

            // Check that error result is returned
            expect(flatResults[0]).toEqual({
                title: 'Error validating inquiry questions',
                status: 'error'
            });
        });

        it('handles network timeout errors', async () => {
            // Setup
            mockRecord.stringValue.mockImplementation((field) => {
                const values = {
                    'Id': 'inquiry-123',
                    'Type': 'Medical Inquiry',
                    'Subject': 'Test Subject',
                    'Priority': 'High',
                    'AccountId': 'acc-456'
                };
                return values[field];
            });

            // Mock database to throw timeout error
            mockDb.query.mockRejectedValue(new Error('Query timeout'));

            // Execute script
            const promiseArray = script.onExecute({
                api: mockApi,
                record: mockRecord,
                env: mockEnv,
                db: mockDb,
                moment: mockMoment,
                log: mockLog
            });

            // Wait for all promises to resolve
            const results = await Promise.all(promiseArray);
            const flatResults = results.flat();

            // Verify error handling
            expect(mockLog.error).toHaveBeenCalled();
            expect(flatResults[0].status).toBe('error');
        });
    });
});
