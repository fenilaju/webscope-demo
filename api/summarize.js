import * as cheerio from 'cheerio';

const json = (res, status, body) => res.status(status).json(body);
function isPublicHost(hostname) {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host === '::1') return false;
  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(host)) {
    const [a, b] = host.split('.').map(Number);
    if (a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 192 && b === 168) || (a === 172 && b >= 16 && b <= 31)) return false;
  }
  return true;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Use POST.' });
  const { url } = req.body ?? {};
  let parsed;
  try { parsed = new URL(url); } catch { return json(res, 400, { error: 'Enter a valid website address.' }); }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return json(res, 400, { error: 'Use an http or https website address.' });
  if (!isPublicHost(parsed.hostname)) return json(res, 400, { error: 'That address is not supported.' });

  let timeout;
  try {
    const controller = new AbortController();
    timeout = setTimeout(() => controller.abort(), 12000);
    const response = await fetch(parsed.href, {
      redirect: 'follow',
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; WebscopeDemo/1.0)', Accept: 'text/html,application/xhtml+xml' },
    });
    clearTimeout(timeout);
    if (!response.ok) return json(res, 422, { error: `The website returned status ${response.status}.` });
    const finalUrl = new URL(response.url);
    if (!isPublicHost(finalUrl.hostname)) return json(res, 400, { error: 'The website redirected to an unsupported address.' });
    const type = response.headers.get('content-type') ?? '';
    if (!type.includes('text/html') && !type.includes('application/xhtml+xml')) return json(res, 422, { error: 'That address did not return an HTML page.' });
    const html = (await response.text()).slice(0, 1_000_000);
    const $ = cheerio.load(html);
    $('script, style, noscript, svg, nav, footer, header, iframe, form').remove();
    const title = $('title').first().text().trim() || parsed.hostname;
    const text = $('main').text() || $('article').text() || $('body').text();
    const cleaned = text.replace(/\s+/g, ' ').trim().slice(0, 12000);
    if (cleaned.length < 80) return json(res, 422, { error: 'I could not find enough readable text. Some sites block this kind of request.' });
    return json(res, 200, { title, sourceUrl: parsed.href, text: cleaned });
  } catch (error) {
    clearTimeout(timeout);
    console.error('Website fetch failed:', error.message, error.cause?.code ?? '', error.cause?.message ?? '');
    return json(res, 422, { error: 'Could not read that website. It may block automated requests or take too long.' });
  }
}
