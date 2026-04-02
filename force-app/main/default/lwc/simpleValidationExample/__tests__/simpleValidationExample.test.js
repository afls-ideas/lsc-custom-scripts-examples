/**
 * Jest tests for simpleValidationExample
 *
 * Tests the IIFE custom script by loading it with fs.readFileSync
 * and executing it with mocked global variables (record, user, db, env).
 */
const fs = require('fs');
const path = require('path');

describe('simpleValidationExample', () => {
    let scriptContent;
    let mockRecord;
    let mockEnv;

    beforeAll(() => {
        scriptContent = fs.readFileSync(
            path.resolve(__dirname, '../simpleValidationExample.js'),
            'utf8'
        );
    });

    beforeEach(() => {
        jest.clearAllMocks();

        mockRecord = {
            stringValue: jest.fn()
        };

        mockEnv = {
            log: jest.fn(),
            getOption: jest.fn()
        };
    });

    function executeScript() {
        const scriptFn = new Function(
            'record', 'user', 'db', 'env',
            scriptContent
        );
        return scriptFn(mockRecord, {}, {}, mockEnv);
    }

    describe('returns success when Status is populated', () => {
        it('validates successfully when Status has a value', () => {
            mockRecord.stringValue.mockReturnValue('In Progress');

            const results = executeScript();

            expect(results).toHaveLength(1);
            expect(results[0]).toEqual({
                title: 'Status is set to: In Progress',
                status: 'success'
            });
            expect(mockRecord.stringValue).toHaveBeenCalledWith('Status');
        });

        it('handles different status values', () => {
            mockRecord.stringValue.mockReturnValue('Completed');

            const results = executeScript();

            expect(results).toHaveLength(1);
            expect(results[0]).toEqual({
                title: 'Status is set to: Completed',
                status: 'success'
            });
        });

        it('trims whitespace and validates status', () => {
            mockRecord.stringValue.mockReturnValue('  Active  ');

            const results = executeScript();

            expect(results).toHaveLength(1);
            expect(results[0].status).toBe('success');
            expect(results[0].title).toContain('Active');
        });
    });

    describe('returns warning when Status is empty', () => {
        it('returns warning when Status is empty string', () => {
            mockRecord.stringValue.mockReturnValue('');

            const results = executeScript();

            expect(results).toHaveLength(1);
            expect(results[0]).toEqual({
                title: 'Status field is empty - please set a status value',
                status: 'warning'
            });
        });

        it('returns warning when Status is null', () => {
            mockRecord.stringValue.mockReturnValue(null);

            const results = executeScript();

            expect(results).toHaveLength(1);
            expect(results[0]).toEqual({
                title: 'Status field is empty - please set a status value',
                status: 'warning'
            });
        });

        it('returns warning when Status is undefined', () => {
            mockRecord.stringValue.mockReturnValue(undefined);

            const results = executeScript();

            expect(results).toHaveLength(1);
            expect(results[0]).toEqual({
                title: 'Status field is empty - please set a status value',
                status: 'warning'
            });
        });

        it('returns warning when Status is only whitespace', () => {
            mockRecord.stringValue.mockReturnValue('   ');

            const results = executeScript();

            expect(results).toHaveLength(1);
            expect(results[0]).toEqual({
                title: 'Status field is empty - please set a status value',
                status: 'warning'
            });
        });
    });

    describe('handles errors gracefully', () => {
        it('returns error when stringValue throws', () => {
            mockRecord.stringValue.mockImplementation(() => {
                throw new Error('Field access denied');
            });

            const results = executeScript();

            expect(results).toHaveLength(1);
            expect(results[0].status).toBe('error');
            expect(results[0].title).toContain('Error checking status');
            expect(results[0].title).toContain('Field access denied');
        });
    });

    describe('return value format', () => {
        it('always returns an array', () => {
            mockRecord.stringValue.mockReturnValue('Active');

            const results = executeScript();

            expect(Array.isArray(results)).toBe(true);
        });

        it('each result has required properties', () => {
            mockRecord.stringValue.mockReturnValue('Active');

            const results = executeScript();

            expect(results[0]).toHaveProperty('title');
            expect(results[0]).toHaveProperty('status');
            expect(typeof results[0].title).toBe('string');
            expect(typeof results[0].status).toBe('string');
        });

        it('status values are valid', () => {
            mockRecord.stringValue.mockReturnValue('Active');

            const results = executeScript();

            const validStatuses = ['success', 'warning', 'error'];
            expect(validStatuses).toContain(results[0].status);
        });
    });
});
