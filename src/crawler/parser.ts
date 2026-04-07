import * as cheerio from 'cheerio';

export interface ExtractedData {
    url: string;
    titles: string[];
    points: string[];
    cards: Array<{ title: string; description: string; link: string }>;
    partnerships: string[];
}

export const extractStructuredData = (html: string, pageUrl: string): ExtractedData => {
    const $ = cheerio.load(html);

    // 1. DOM CLEANUP (Remove noise)
    // Strip out navigational, script, styling, and footer elements entirely
    $('script, style, nav, footer, aside, header, iframe, noscript').remove();
    $('[style*="display: none"], [style*="display:none"], [hidden]').remove();

    // Remove common ad, tracking, and popup classes/IDs
    $('[class*="ad-"], [id*="ad-"], [class*="banner"], [class*="popup"], [class*="cookie"]').remove();

    // Focus on the primary content area to minimize false positives
    let $main = $('main, article');
    if ($main.length === 0) {
        $main = $('body'); // Fallback if semantic HTML5 isn't used
    }

    const data: ExtractedData = {
        url: pageUrl,
        titles: [],
        points: [],
        cards: [],
        partnerships: []
    };

    // 2. EXTRACT TITLES (h1, h2, h3)
    $main.find('h1, h2, h3').each((_, el) => {
        const text = $(el).text().replace(/\s+/g, ' ').trim();
        if (text) data.titles.push(text);
    });

    // 3. EXTRACT KEY POINTS (ul li, ol li)
    $main.find('ul li, ol li').each((_, el) => {
        const text = $(el).text().replace(/\s+/g, ' ').trim();
        // Ignore empty points or excessively long paragraphs formatted as lists
        if (text && text.length > 2 && text.length < 300) {
            data.points.push(text);
        }
    });

    // 4. EXTRACT CARDS (Sections with repeating UI patterns)
    // Heuristic: We look for containers (div, article) that look like a "card" 
    // (contains a heading, a paragraph, and optionally a link).
    $main.find('article, div[class*="card"], div[class*="item"], div[class*="grid"], div[class*="feature"]').each((_, el) => {
        const $el = $(el);

        const $title = $el.find('h2, h3, h4, h5, h6').first();
        const $desc = $el.find('p').first();
        const $link = $el.find('a').first();

        if ($title.length > 0 && $desc.length > 0) {
            const title = $title.text().replace(/\s+/g, ' ').trim();
            const description = $desc.text().replace(/\s+/g, ' ').trim();
            let link = $link.attr('href') || '';

            // Normalize relative URLs
            if (link.startsWith('/')) {
                try {
                    link = new URL(link, pageUrl).toString();
                } catch { /* ignore bad urls */ }
            }

            // Avoid duplicates and ensure it's not grabbing giant container sections
            if (title && description.length < 500 && !data.cards.find(c => c.title === title)) {
                data.cards.push({ title, description, link });
            }
        }
    });

    // 5. EXTRACT PARTNERSHIPS / CLIENTS
    // Heuristic: Look for section headings related to partners/clients, 
    // then grab image alt texts (logos) or list items inside that specific section.
    $main.find('h1, h2, h3, h4, h5').each((_, el) => {
        const headingText = $(el).text().toLowerCase();
        const isPartnerSection = headingText.includes('client') ||
            headingText.includes('partner') ||
            headingText.includes('trusted by');

        if (isPartnerSection) {
            // Find the closest wrapper/section that encompasses this heading and its content
            const $container = $(el).closest('section').length ? $(el).closest('section') : $(el).parent();

            // Extract Logos (img alt tags)
            $container.find('img').each((_, img) => {
                const altText = $(img).attr('alt');
                if (altText && altText.trim().length > 1) {
                    data.partnerships.push(altText.trim());
                }
            });

            // Extract text list if they don't use images
            $container.find('li').each((_, li) => {
                const text = $(li).text().replace(/\s+/g, ' ').trim();
                if (text && text.length < 50) {
                    data.partnerships.push(text);
                }
            });
        }
    });

    // Deduplicate partnerships array
    data.partnerships = [...new Set(data.partnerships)];

    return data;
};