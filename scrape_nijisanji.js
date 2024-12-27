const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

async function scrapeNijisanjiStore(keywords) {
    const URL = `https://nijisanji-store.com/search?q=${encodeURIComponent(keywords)}*&type=product`;

    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto(URL, { waitUntil: 'networkidle2' });

    try {
        // Wait for the product grid or a known selector
        await page.waitForSelector('.ProductItem');

        // Extract product information
        const products = await page.evaluate(() => {
            const productElements = document.querySelectorAll('.ProductItem');
            const limitedProducts = [];
            productElements.forEach((product, index) => {
                if (index < 8) {
                    // Selectors for various elements
                    const imgElement =
                        product.querySelector('.ProductItem__Image') ||
                        product.querySelector('.ProductItem__Image--alternate') ||
                        product.querySelector('img') ||
                        product.querySelector('[data-src]') ||
                        product.querySelector('[data-srcset]') ||
                        product.querySelector('noscript img');

                    const nameElement = product.querySelector('.ProductItem__Title a') ||
                        product.querySelector('h2 a') ||
                        product.querySelector('.ProductItem__Title');

                    const priceElement = product.querySelector('.ProductItem__Price .money') ||
                        product.querySelector('.money') ||
                        product.querySelector('.ProductItem__Price');

                    const linkElement = product.querySelector('.ProductItem__Title a') ||
                        product.querySelector('a');

                    let imgLink = "N/A";

                    // Extract image link
                    if (imgElement) {
                        imgLink = imgElement.getAttribute('src') || 
                                  imgElement.getAttribute('data-src') || 
                                  imgElement.getAttribute('srcset')?.split(',')[0].split(' ')[0].trim() || 
                                  imgElement.getAttribute('data-srcset')?.split(',')[0].split(' ')[0].trim() || 
                                  "N/A";
                    }

                    // Ensure HTTPS prefix for the URL
                    if (imgLink.startsWith('//')) {
                        imgLink = 'https:' + imgLink;
                    }

                    // Enforce a size of 600 in the URL
                    if (imgLink.includes('{width}x')) {
                        imgLink = imgLink.replace('{width}', '600');
                    } else if (imgLink.includes('_')) {
                        imgLink = imgLink.replace(/_\d+x/, '_600x');
                    }

                    // Extract other details
                    const name = nameElement ? nameElement.textContent.trim() : "N/A";
                    const price = priceElement ? priceElement.textContent.trim() : "N/A";
                    const productLink = linkElement
                        ? `https://nijisanji-store.com${linkElement.getAttribute('href')}`
                        : "N/A";

                    // Push data to the products array
                    limitedProducts.push({
                        name: name,
                        price: price,
                        img_link: imgLink,
                        product_link: productLink,
                    });
                }
            });
            return limitedProducts;
        });

        return products;
    } catch (error) {
        console.error("Error scraping Nijisanji Store:", error);
        return [];
    } finally {
        await browser.close();
    }
}

const keywords = process.argv[2] || 'inui toko';
scrapeNijisanjiStore(keywords).then(products => {
    console.log(JSON.stringify(products, null, 2));
}).catch(error => {
    console.error("Error:", error);
});