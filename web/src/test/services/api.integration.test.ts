
import { describe, it, expect, beforeAll } from 'vitest'
import { Api } from '@/services/api'

// Integration tests (these would run against a real server in a test environment)
describe('Api Integration Tests', () => {
    let api: Api
    
    beforeAll(() => {
        api = new Api('https://jsonplaceholder.typicode.com', 'IntegrationTestApi')
    })

    // Note: These tests are commented out as they require a live server
    // Uncomment and modify the baseUrl in the Api constructor if you have a test server
  
    it.skip('should perform real GET request', async () => {
        const result = await api.get<{ id: number; title: string }>('/posts/1')
        
        expect(result).toHaveProperty('id')
        expect(result).toHaveProperty('title')
        expect(typeof result.id).toBe('number')
        expect(typeof result.title).toBe('string')
    })

    it.skip('should perform real POST request', async () => {
        const payload = {
        title: 'Test Post',
        body: 'This is a test post',
        userId: 1
        }
        
        const result = await api.post<{ id: number; title: string; body: string; userId: number }>('/posts', { payload })
        
        expect(result).toHaveProperty('id')
        expect(result.title).toBe(payload.title)
        expect(result.body).toBe(payload.body)
        expect(result.userId).toBe(payload.userId)
    })
});
