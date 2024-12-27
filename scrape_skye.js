const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

const BASE_URL = 'https://www.skye1204gaming.com';

// Generate acronyms from full keywords
function generateAcronym(text) {
    return text
        .split(/\s+/) // Split by spaces
        .map(word => word.charAt(0)) // Take the first letter
        .join('').toLowerCase(); // Combine and lowercase
}

// Calculate acronym alignment score
function acronymScore(keywordAcronym, nameAcronym) {
    let score = 0;
    for (let i = 0; i < Math.min(keywordAcronym.length, nameAcronym.length); i++) {
        if (keywordAcronym[i] === nameAcronym[i]) {
            score += 10; // Reward exact match
        } else {
            score -= 5; // Penalize mismatch
        }
    }
    return score;
}

// Match and score menu items based on input
function matchMenuItems(keywords, menus) {
    const keywordLower = keywords.toLowerCase().replace(/[^a-z0-9]/g, ''); // Normalize input
    const keywordAcronym = keywords.toLowerCase(); // Use full input directly as acronym

    const scoredMenus = menus.map(item => {
        const nameLower = item.name.toLowerCase().replace(/[^a-z0-9]/g, '');
        const nameAcronym = generateAcronym(item.name); // Generate acronym for menu name

        let scores = {
            acronymExact: 0,
            acronymPartial: 0,
            keywordExact: 0,
            substringMatch: 0,
        };

        // Acronym scoring
        if (keywordAcronym === nameAcronym) {
            scores.acronymExact = 200; // Exact acronym match
        } else {
            scores.acronymPartial = acronymScore(keywordAcronym, nameAcronym); // Partial acronym match
        }

        // Exact match
        if (nameLower === keywordLower) scores.keywordExact = 100;

        // Substring match
        if (nameLower.includes(keywordLower)) scores.substringMatch = 50;

        // Total score
        const totalScore = Object.values(scores).reduce((sum, val) => sum + val, 0);
        return { item, scores, totalScore };
    });

    // Sort by score and return top 8 matches
    scoredMenus.sort((a, b) => b.totalScore - a.totalScore);

    return scoredMenus.slice(0, 5);
}

// Scrape Skye with the updated scoring system
async function scrapeSkye(keywords) {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    try {
        // Go to the homepage
        await page.goto(BASE_URL, { waitUntil: 'networkidle2' });

        // Extract menu items
        const menus = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('.list-menu__item'))
                .map(item => ({
                    name: item.innerText.trim(),
                    link: item.getAttribute('href') || null // Handle null links
                }));
        });

        // Handle dropdown substitutions
        menus.forEach(item => {
            // Substitute for "Fate/Grand Order"
            if (item.name.toLowerCase() === 'fate/grand order') {
                item.link = '/collections/fgo-jp'; // Default link for FGO JP
            }

            // Substitute for "Genshin Impact"
            if (item.name.toLowerCase() === 'genshin impact') {
                item.link = '/collections/genshin-impact'; // Default to "View All"
            }
        });

        // Match input keywords to the best menu links
        const topMatches = matchMenuItems(keywords, menus);

        // Pick the best match
        const bestMatch = topMatches[0].item;

        // Handle null links with fallback
        const targetURL = `${BASE_URL}${bestMatch.link || '/collections/genshin-impact'}`; // Fallback if null
        await page.goto(targetURL, { waitUntil: 'networkidle2' });

        // Extract products
        const products = await page.evaluate((baseURL) => {
            const productElements = document.querySelectorAll('.card-wrapper.product-card-wrapper');
            return Array.from(productElements).map(element => {
                const imgElement = element.querySelector('.card__media img');
                const imgLink = imgElement
                    ? (imgElement.getAttribute('src').startsWith('//')
                        ? `https:${imgElement.getAttribute('src')}`
                        : `${baseURL}${imgElement.getAttribute('src')}`)
                    : '';
                const nameElement = element.querySelector('.card__heading a');
                const name = nameElement ? nameElement.textContent.trim() : '';
                const linkElement = element.querySelector('.card__heading a');
                const productLink = linkElement
                    ? `${baseURL}${linkElement.getAttribute('href')}`
                    : '';
                const priceElement = element.querySelector('.price__sale .money') ||
                                     element.querySelector('.price__regular .money');
                const price = priceElement ? priceElement.textContent.trim() : '';
                return {
                    name,
                    price,
                    img_link: imgLink,
                    product_link: productLink,
                };
            });
        }, BASE_URL);

        // Return only top 8 products
        return products.slice(0, 8);

    } catch (error) {
        return [];
    } finally {
        await browser.close();
    }
}

// Keywords from arguments or default
let keywords = process.argv[2] || 'fate grand order';

// Substitute for dropdown options
if (keywords.toLowerCase() === 'fate grand order') {
    keywords = 'fgo jp'; // Substitute "Fate/Grand Order"
} else if (keywords.toLowerCase() === 'genshin impact') {
    keywords = 'genshin-impact'; // Default to "View All" for Genshin Impact
}

scrapeSkye(keywords)
    .then(products => {
        console.log(JSON.stringify(products, null, 2)); // Output valid JSON only
    })
    .catch(error => {
        console.error(JSON.stringify({ error: "Scraping failed", details: error.toString() }));
    });
