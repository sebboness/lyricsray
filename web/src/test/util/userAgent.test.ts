import { describe, it, expect } from 'vitest';
import { parseUserAgent } from '@/util/userAgent';

const CHROME_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const SAFARI_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1';
const FIREFOX_UA = 'Mozilla/5.0 (X11; Linux x86_64; rv:124.0) Gecko/20100101 Firefox/124.0';
const EDGE_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0.0.0';

describe('parseUserAgent', () => {
    describe('AI crawler detection', () => {
        it.each([
            ['GPTBot', 'Mozilla/5.0 AppleWebKit/537.36 (compatible; GPTBot/1.0; +https://openai.com/gptbot)'],
            ['ClaudeBot', 'claudebot'],
            ['PerplexityBot', 'Mozilla/5.0 AppleWebKit/537.36 (compatible; PerplexityBot/1.0)'],
            ['Amazonbot', 'Mozilla/5.0 (compatible; Amazonbot/0.1)'],
            ['Bytespider', 'Mozilla/5.0 (Linux; Android 5.0) Bytespider/1.0'],
        ])('classifies %s as aiCrawler', (_name, ua) => {
            expect(parseUserAgent(ua).uaType).toBe('aiCrawler');
        });
    });

    describe('search engine detection', () => {
        it.each([
            ['Googlebot', 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'],
            ['Bingbot', 'Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)'],
            ['DuckDuckBot', 'DuckDuckBot/1.0; (+http://duckduckgo.com/duckduckbot.html)'],
        ])('classifies %s as searchEngine', (_name, ua) => {
            expect(parseUserAgent(ua).uaType).toBe('searchEngine');
        });
    });

    describe('generic bot detection', () => {
        it('classifies a generic crawler as bot', () => {
            expect(parseUserAgent('SomeGenericCrawler/1.0').uaType).toBe('bot');
        });

        it('classifies Discordbot as bot', () => {
            expect(parseUserAgent('Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)').uaType).toBe('bot');
        });
    });

    describe('person detection', () => {
        it('classifies a Chrome browser as person', () => {
            expect(parseUserAgent(CHROME_UA).uaType).toBe('person');
        });

        it('classifies an iPhone Safari as person', () => {
            expect(parseUserAgent(SAFARI_UA).uaType).toBe('person');
        });

        it('returns person for empty UA', () => {
            expect(parseUserAgent('').uaType).toBe('person');
        });
    });

    describe('browser bucketing', () => {
        it('returns Chrome for a Chrome UA', () => {
            expect(parseUserAgent(CHROME_UA).browser).toBe('Chrome');
        });

        it('returns Safari for an iPhone UA', () => {
            expect(parseUserAgent(SAFARI_UA).browser).toBe('Safari');
        });

        it('returns Firefox for a Firefox UA', () => {
            expect(parseUserAgent(FIREFOX_UA).browser).toBe('Firefox');
        });

        it('returns Edge for an Edge UA (takes priority over Chrome)', () => {
            expect(parseUserAgent(EDGE_UA).browser).toBe('Edge');
        });

        it('returns Other for empty UA', () => {
            expect(parseUserAgent('').browser).toBe('Other');
        });
    });

    describe('OS bucketing', () => {
        it('returns Windows for a Windows UA', () => {
            expect(parseUserAgent(CHROME_UA).os).toBe('Windows');
        });

        it('returns iOS for an iPhone UA', () => {
            expect(parseUserAgent(SAFARI_UA).os).toBe('iOS');
        });

        it('returns Linux for a Linux UA', () => {
            expect(parseUserAgent(FIREFOX_UA).os).toBe('Linux');
        });

        it('returns Other for empty UA', () => {
            expect(parseUserAgent('').os).toBe('Other');
        });
    });

    describe('priority ordering', () => {
        // A UA that matches both AI crawler and search engine patterns
        it('aiCrawler takes priority over searchEngine', () => {
            const ua = 'Mozilla/5.0 (compatible; Google-Extended; Googlebot/2.1)';
            expect(parseUserAgent(ua).uaType).toBe('aiCrawler');
        });

        it('searchEngine takes priority over generic bot', () => {
            // Bingbot matches both SEARCH_ENGINE_PATTERN and BOT_PATTERN (contains "bot")
            const ua = 'Mozilla/5.0 (compatible; bingbot/2.0)';
            expect(parseUserAgent(ua).uaType).toBe('searchEngine');
        });
    });
});
