const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs/promises');

puppeteer.use(StealthPlugin());

const BASE_URL = 'https://malboro18games.com';

// Generate acronyms from full keywords (e.g., "fgo" remains "fgo")
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
    // Preserve full keyword acronym (e.g., "fgo")
    const keywordLower = keywords.toLowerCase().replace(/[^a-z0-9]/g, ''); // Normalize input
    const keywordAcronym = keywords.toLowerCase(); // Use the full input directly for acronym
    // console.log(`Keyword Acronym: ${keywordAcronym}`); // Debug: Show the generated acronym

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

    // // Debug: Print top 5 matches with score breakdown
    // console.log("\nTop 5 Matches with Score Breakdown:");
    // scoredMenus.slice(0, 5).forEach((match, index) => {
    //     console.log(`\n#${index + 1}: ${match.item.name}`);
    //     console.log(`  Acronym Exact: ${match.scores.acronymExact}`);
    //     console.log(`  Acronym Partial: ${match.scores.acronymPartial}`);
    //     console.log(`  Keyword Exact: ${match.scores.keywordExact}`);
    //     console.log(`  Substring Match: ${match.scores.substringMatch}`);
    //     console.log(`  Total Score: ${match.totalScore}`);
    // });

    return scoredMenus.slice(0, 8); // Top 8 matches
}

// Scrape the Malboro page
async function scrapeMalboro(keywords) {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    try {
        // Go to home page and fetch menu links
        await page.goto(BASE_URL, { waitUntil: 'networkidle2' });

        // Extract menu items
        const menus = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('.list-menu__item'))
                .map(item => ({
                    name: item.innerText.trim(),
                    link: item.getAttribute('href')
                }));
        });

        // Match input keywords to the best menu links
        const topMatches = matchMenuItems(keywords, menus);

        // Pick the best match
        const bestMatch = topMatches[0].item;
        const targetURL = `${BASE_URL}${bestMatch.link}`;
        // console.log(`Navigating to: ${targetURL}`);
        await page.goto(targetURL, { waitUntil: 'networkidle2' });

        // Extract products
        const products = await page.evaluate(() => {
            const baseURL = 'https://malboro18games.com';
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
        });

        // Return only top 8 products
        // console.log("\nExtracted Products:");
        console.log(JSON.stringify(products.slice(0, 8), null, 2)); // Debug final products
    } catch (error) {
        console.error("Error scraping Malboro18Games:", error);
    } finally {
        await browser.close();
    }
}

// Input keywords or default value
const keywords = process.argv[2] || 'fgo'; // Use "fgo" explicitly
scrapeMalboro(keywords).catch(error => console.error("Error:", error));
