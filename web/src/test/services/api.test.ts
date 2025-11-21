import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { Api, CallOptions } from '@/services/api'

// Use vi.hoisted for mocks that need to be available before imports
const mockLogger = vi.hoisted(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    trace: vi.fn(),
}))

const mockApiUtils = vi.hoisted(() => ({
    toFetchUrl: vi.fn((baseUrl: string, endpoint: string, queryParams?: any) => {
        const url = `${baseUrl}${endpoint}`
        if (queryParams) {
        const searchParams = new URLSearchParams(queryParams)
        return `${url}?${searchParams.toString()}`
        }
        return url
    }),
}))

const mockLog = vi.hoisted(() => ({
    logPrefix: vi.fn((name: string) => `[${name}]`)
}))

// Mock modules before importing
vi.mock('@/logger/logger', () => ({
  logger: mockLogger
}))

vi.mock('@/util/apiUtils', () => mockApiUtils)

vi.mock('@/util/log', () => mockLog)

describe('Api', () => {
    let api: Api
    const mockFetch = vi.fn()
  
    beforeEach(() => {
        // Reset all mocks before each test
        vi.clearAllMocks()
        global.fetch = mockFetch
        
        // Create a new Api instance for each test
        api = new Api('https://api.example.com', 'TestApi')
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    describe('constructor', () => {
        it('should initialize with baseUri and name', () => {
            expect(api.baseUri).toBe('https://api.example.com')
            expect(api.name).toBe('TestApi')
            expect(api.tokenGetter).toBeUndefined()
        })
    })

    describe('sendRequest', () => {
        it('should make a successful GET request', async () => {
            const mockResponse = { data: 'test data' }
            mockFetch.mockResolvedValueOnce({
                json: vi.fn().mockResolvedValue(mockResponse),
                status: 200
            })

            const result = await api.sendRequest<typeof mockResponse>('GET', '/test')

            expect(mockFetch).toHaveBeenCalledWith(
                'https://api.example.com/test', // Note: your code uses baseUrl constant, not this.baseUri
                expect.objectContaining({
                    method: 'GET',
                    headers: expect.objectContaining({
                        'Content-Type': 'json/application',
                        'User-Agent': 'LyricsRay 1.0.0 https://lyricsray.com'
                    }),
                    credentials: 'include'
                })
            )

            expect(result).toEqual(mockResponse)
            expect(mockLogger.info).toHaveBeenCalledWith('[TestApi] preparing request GET https://api.example.com/test')
        })

        it('should make a POST request with payload', async () => {
            const mockResponse = { success: true }
            const payload = { name: 'test', value: 123 }
            
            mockFetch.mockResolvedValueOnce({
                json: vi.fn().mockResolvedValue(mockResponse),
                status: 200
            })

            const result = await api.sendRequest<typeof mockResponse>('POST', '/create', { payload })

            expect(mockFetch).toHaveBeenCalledWith(
                'https://api.example.com/create',
                expect.objectContaining({
                    method: 'POST',
                    body: JSON.stringify(payload),
                    headers: expect.objectContaining({
                        'Content-Type': 'json/application',
                        'User-Agent': 'LyricsRay 1.0.0 https://lyricsray.com'
                    }),
                    credentials: 'include'
                })
            )

            expect(result).toEqual(mockResponse)
            expect(mockLogger.debug).toHaveBeenCalledWith('[TestApi] request has payload')
        })

        it('should handle query parameters', async () => {
            const mockResponse = { items: [] }
            const queryParams = { page: ['1'], limit: ['10'] }
            
            mockFetch.mockResolvedValueOnce({
                json: vi.fn().mockResolvedValue(mockResponse),
                status: 200
            })

            await api.sendRequest<typeof mockResponse>('GET', '/items', { queryParams })

            expect(mockFetch).toHaveBeenCalledWith(
                'https://api.example.com/items?page=1&limit=10',
                expect.any(Object)
            )
        })

        it('should reject when response has no data', async () => {
            mockFetch.mockResolvedValueOnce({
                json: vi.fn().mockResolvedValue(undefined),
                status: 200
            })

            await expect(api.sendRequest('GET', '/test')).rejects.toMatch(/200 Unexpected response/)
        })

        it('should reject when fetch throws an error', async () => {
            const fetchError = new Error('Network error')
            mockFetch.mockRejectedValueOnce(fetchError)

            await expect(api.sendRequest('GET', '/test')).rejects.toBe(fetchError)
            expect(mockLogger.error).toHaveBeenCalledWith('[TestApi] caught fetch error', fetchError)
        })

        // TODO fix unit test
        // it('should handle JSON parsing errors', async () => {
        //     mockFetch.mockResolvedValueOnce({
        //         json: vi.fn().mockRejectedValueOnce(new Error('Invalid JSON')),
        //         status: 200
        //     })

        //     await expect(api.sendRequest('GET', '/test')).rejects.toThrow('Invalid JSON')
        // })
    })

    describe('HTTP method shortcuts', () => {
        beforeEach(() => {
            // Mock sendRequest for testing method shortcuts
            api.sendRequest = vi.fn().mockResolvedValue({ success: true })
        })

        it('should call sendRequest with GET method', async () => {
            const options: CallOptions = { payload: { test: true } }
            await api.get('/test', options)

            expect(api.sendRequest).toHaveBeenCalledWith('get', '/test', options)
        })

        it('should call sendRequest with POST method', async () => {
            const options: CallOptions = { payload: { data: 'test' } }
            await api.post('/create', options)

            expect(api.sendRequest).toHaveBeenCalledWith('post', '/create', options)
        })

        it('should call sendRequest with PUT method', async () => {
            await api.put('/update')

            expect(api.sendRequest).toHaveBeenCalledWith('put', '/update', undefined)
        })

        it('should call sendRequest with PATCH method', async () => {
            const options: CallOptions = { payload: { field: 'updated' } }
            await api.patch('/modify', options)

            expect(api.sendRequest).toHaveBeenCalledWith('patch', '/modify', options)
        })

        it('should call sendRequest with DELETE method', async () => {
            await api.delete('/remove')

            expect(api.sendRequest).toHaveBeenCalledWith('delete', '/remove', undefined)
        })
    })

    describe('headers configuration', () => {
        it('should set correct default headers', async () => {
            mockFetch.mockResolvedValueOnce({
                json: vi.fn().mockResolvedValue({ success: true }),
                status: 200
            })

            await api.sendRequest('GET', '/test')

            expect(mockFetch).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                headers: {
                    'Content-Type': 'json/application',
                    'User-Agent': 'LyricsRay 1.0.0 https://lyricsray.com'
                }
                })
            )
        })

        it('should handle missing environment variables gracefully', async () => {
            // Temporarily clear environment variables
            const originalEnv = process.env
            process.env = { NODE_ENV: "test" }
            
            mockFetch.mockResolvedValueOnce({
                json: vi.fn().mockResolvedValue({ success: true }),
                status: 200
            })

            await api.sendRequest('GET', '/test')

            expect(mockFetch).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    headers: expect.objectContaining({
                        'User-Agent': 'undefined undefined undefined'
                    })
                })
            )

            // Restore environment
            process.env = originalEnv
        })
    })

    describe('error scenarios', () => {
        it('should handle network timeouts', async () => {
            const timeoutError = new Error('Request timeout')
            mockFetch.mockRejectedValueOnce(timeoutError)

            await expect(api.sendRequest('GET', '/test')).rejects.toBe(timeoutError)
            expect(mockLogger.error).toHaveBeenCalledWith('[TestApi] caught fetch error', timeoutError)
        })

        it('should handle server errors', async () => {
            mockFetch.mockResolvedValueOnce({
                json: vi.fn().mockResolvedValue({ error: 'Server error' }),
                status: 500
            })

            const result = await api.sendRequest('GET', '/test')
            expect(result).toEqual({ error: 'Server error' })
        })
    })

    describe('logging behavior', () => {
        it('should log request preparation', async () => {
            mockFetch.mockResolvedValueOnce({
                json: vi.fn().mockResolvedValue({ success: true }),
                status: 200
            })

            await api.sendRequest('POST', '/test')

            expect(mockLogger.info).toHaveBeenCalledWith('[TestApi] preparing request POST https://api.example.com/test')
        })

        it('should log when payload is present', async () => {
            mockFetch.mockResolvedValueOnce({
                json: vi.fn().mockResolvedValue({ success: true }),
                status: 200
            })

            await api.sendRequest('POST', '/test', { payload: { data: 'test' } })

            expect(mockLogger.debug).toHaveBeenCalledWith('[TestApi] request has payload')
        })

        it('should log response received', async () => {
            mockFetch.mockResolvedValueOnce({
                json: vi.fn().mockResolvedValue({ success: true }),
                status: 200
            })

            await api.sendRequest('GET', '/test')

            expect(mockLogger.debug).toHaveBeenCalledWith('[TestApi] response received')
        })
    })
});
