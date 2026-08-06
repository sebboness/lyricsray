import { UAParser } from 'ua-parser-js';

export type UaType = 'bot' | 'searchEngine' | 'aiCrawler' | 'person';

export interface ParsedUserAgent {
    uaType: UaType;
    browser: string;
    os: string;
}

const AI_CRAWLER_PATTERN = /GPTBot|ChatGPT-User|OAI-SearchBot|ClaudeBot|Claude-Web|anthropic-ai|PerplexityBot|YouBot|Amazonbot|Applebot-Extended|Google-Extended|Googlebot-Extended|Meta-ExternalAgent|Meta-ExternalFetcher|Bytespider/i;

const SEARCH_ENGINE_PATTERN = /Googlebot|Bingbot|Slurp|DuckDuckBot|Baiduspider|YandexBot|Sogou|Exabot|facebot|ia_archiver/i;

const BOT_PATTERN = /bot|crawl|spider|slurp|mediapartners|adsbot|facebookexternalhit|LinkedInBot|Twitterbot|WhatsApp|TelegramBot|Discordbot/i;

const BROWSER_MAP: [RegExp, string][] = [
    [/Edg\//i, 'Edge'],
    [/OPR\//i, 'Opera'],
    [/Chrome\//i, 'Chrome'],
    [/Safari\//i, 'Safari'],
    [/Firefox\//i, 'Firefox'],
];

const OS_MAP: [RegExp, string][] = [
    [/Android/i, 'Android'],
    [/iPhone|iPad|iPod/i, 'iOS'],
    [/Windows/i, 'Windows'],
    [/Mac OS/i, 'macOS'],
    [/Linux/i, 'Linux'],
];

export function parseUserAgent(ua: string): ParsedUserAgent {
    if (!ua) return { uaType: 'person', browser: 'Other', os: 'Other' };

    let uaType: UaType = 'person';
    if (AI_CRAWLER_PATTERN.test(ua)) {
        uaType = 'aiCrawler';
    } else if (SEARCH_ENGINE_PATTERN.test(ua)) {
        uaType = 'searchEngine';
    } else if (BOT_PATTERN.test(ua)) {
        uaType = 'bot';
    }

    const parser = new UAParser(ua);
    const browserName = parser.getBrowser().name;
    const osName = parser.getOS().name;

    const browser = BROWSER_MAP.find(([re]) => re.test(ua))?.[1]
        ?? (browserName || 'Other');
    const os = OS_MAP.find(([re]) => re.test(ua))?.[1]
        ?? (osName || 'Other');

    return { uaType, browser, os };
}
