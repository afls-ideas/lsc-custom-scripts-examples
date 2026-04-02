/**
 * Jest tests for inquiryValidationScript
 *
 * Tests the IIFE custom script by loading it with fs.readFileSync
 * and executing it with mocked global variables (record, user, db, env).
 */
const fs = require('fs');
const path = require('path');

describe('inquiryValidationScript', () => {
    let scriptContent;
    let mockRecord;
    let mockDb;
    let mockEnv;
    let mockUser;

    beforeAll(() => {
        scriptContent = fs.readFileSync(
            path.resolve(__dirname, '../inquiryValidationScript.js'),
            'utf8'
        );
    });

    beforeEach(() => {
        jest.clearAllMocks();

        mockRecord = {
            stringValue: jest.fn()
        };

        mockDb = {
            query: jest.fn()
        };

        mockEnv = {
            log: jest.fn(),
            getOption: jest.fn()
        };

        mockUser = {
            stringValue: jest.fn()
        };
    });

    function executeScript() {
        const scriptFn = new Function(
            'record', 'user', 'db', 'env',
            'ConditionBuilder', 'FieldCondition', 'SetCondition',
            'AndCondition', 'OrCondition',
            scriptContent
        );

        const MockConditionBuilder = jest.fn().mockImplementation(() => ({
            build: jest.fn().mockResolvedValue({})
        }));
        const MockFieldCondition = jest.fn();

        return scriptFn(
            mockRecord, mockUser, mockDb, mockEnv,
            MockConditionBuilder, MockFieldCondition, jest.fn(),
            jest.fn(), jest.fn()
        );
    }

    describe('validates all fields successfully', () => {
        it('returns success for all checks when data is valid', async () => {
            mockRecord.stringValue.mockImplementation((field) => ({
                'Id': 'inquiry-123',
                'Type': 'Medical Inquiry',
                'Subject': 'Test Subject',
                'Priority': 'High',
                'AccountId': 'acc-456'
            })[field]);

            mockDb.query.mockResolvedValue([
                { Id: 'q1', Name: 'Question 1' },
                { Id: 'q2', Name: 'Question 2' }
            ]);

            const promiseArray = executeScript();
            const results = await Promise.all(promiseArray);
            const flatResults = results.flat();

            expect(flatResults).toHaveLength(3);
            expect(flatResults[0]).toEqual({
                title: 'Inquiry Questions Added (2)',
                status: 'success'
            });
            expect(flatResults[1]).toEqual({
                title: 'Inquiry Type: Medical Inquiry',
                status: 'success'
            });
            expect(flatResults[2]).toEqual({
                title: 'All required fields are present',
                status: 'success'
            });

            expect(mockDb.query).toHaveBeenCalledWith(
                'InquiryQuestion',
                expect.anything(),
                ['Id', 'Name']
            );
        });
    });

    describe('validates inquiry questions', () => {
        it('returns error when no inquiry questions found', async () => {
            mockRecord.stringValue.mockImplementation((field) => ({
                'Id': 'inquiry-123',
                'Type': 'Medical Inquiry',
                'Subject': 'Test Subject',
                'Priority': 'High',
                'AccountId': 'acc-456'
            })[field]);

            mockDb.query.mockResolvedValue([]);

            const promiseArray = executeScript();
            const results = await Promise.all(promiseArray);
            const flatResults = results.flat();

            expect(flatResults[0]).toEqual({
                title: 'No Inquiry Questions Found',
                status: 'error'
            });
        });

        it('returns error when database returns null', async () => {
            mockRecord.stringValue.mockImplementation((field) => ({
                'Id': 'inquiry-123',
                'Type': 'Medical Inquiry',
                'Subject': 'Test Subject',
                'Priority': 'High',
                'AccountId': 'acc-456'
            })[field]);

            mockDb.query.mockResolvedValue(null);

            const promiseArray = executeScript();
            const results = await Promise.all(promiseArray);
            const flatResults = results.flat();

            expect(flatResults[0]).toEqual({
                title: 'No Inquiry Questions Found',
                status: 'error'
            });
        });
    });

    describe('validates inquiry type', () => {
        it('returns error when Type is empty', async () => {
            mockRecord.stringValue.mockImplementation((field) => ({
                'Id': 'inquiry-123',
                'Type': '',
                'Subject': 'Test Subject',
                'Priority': 'High',
                'AccountId': 'acc-456'
            })[field]);

            mockDb.query.mockResolvedValue([{ Id: 'q1', Name: 'Q1' }]);

            const promiseArray = executeScript();
            const results = await Promise.all(promiseArray);
            const flatResults = results.flat();

            expect(flatResults[1]).toEqual({
                title: 'Inquiry Type must be specified before proceeding.',
                status: 'error'
            });
        });

        it('returns error when Type is null', async () => {
            mockRecord.stringValue.mockImplementation((field) => ({
                'Id': 'inquiry-123',
                'Type': null,
                'Subject': 'Test Subject',
                'Priority': 'High',
                'AccountId': 'acc-456'
            })[field]);

            mockDb.query.mockResolvedValue([{ Id: 'q1', Name: 'Q1' }]);

            const promiseArray = executeScript();
            const results = await Promise.all(promiseArray);
            const flatResults = results.flat();

            expect(flatResults[1]).toEqual({
                title: 'Inquiry Type must be specified before proceeding.',
                status: 'error'
            });
        });
    });

    describe('validates required fields', () => {
        it('returns error when Subject is missing', async () => {
            mockRecord.stringValue.mockImplementation((field) => ({
                'Id': 'inquiry-123',
                'Type': 'Medical Inquiry',
                'Subject': '',
                'Priority': 'High',
                'AccountId': 'acc-456'
            })[field]);

            mockDb.query.mockResolvedValue([{ Id: 'q1', Name: 'Q1' }]);

            const promiseArray = executeScript();
            const results = await Promise.all(promiseArray);
            const flatResults = results.flat();

            expect(flatResults).toContainEqual({
                title: 'Subject is required',
                status: 'error'
            });
        });

        it('returns multiple errors when multiple fields missing', async () => {
            mockRecord.stringValue.mockImplementation((field) => ({
                'Id': 'inquiry-123',
                'Type': 'Medical Inquiry',
                'Subject': '',
                'Priority': '',
                'AccountId': ''
            })[field]);

            mockDb.query.mockResolvedValue([{ Id: 'q1', Name: 'Q1' }]);

            const promiseArray = executeScript();
            const results = await Promise.all(promiseArray);
            const flatResults = results.flat();

            expect(flatResults).toHaveLength(5);
            expect(flatResults).toContainEqual({ title: 'Subject is required', status: 'error' });
            expect(flatResults).toContainEqual({ title: 'Priority is required', status: 'error' });
            expect(flatResults).toContainEqual({ title: 'Account is required', status: 'error' });
        });
    });

    describe('handles errors gracefully', () => {
        it('returns error when database query fails', async () => {
            mockRecord.stringValue.mockImplementation((field) => ({
                'Id': 'inquiry-123',
                'Type': 'Medical Inquiry',
                'Subject': 'Test Subject',
                'Priority': 'High',
                'AccountId': 'acc-456'
            })[field]);

            mockDb.query.mockRejectedValue(new Error('Database connection failed'));

            const promiseArray = executeScript();
            const results = await Promise.all(promiseArray);
            const flatResults = results.flat();

            expect(flatResults[0]).toEqual({
                title: 'Error validating inquiry questions',
                status: 'error'
            });
        });
    });
});
