const puppeteer = require('puppeteer');

async function scrapeMercari(keywords) {
    const URL = `https://jp.mercari.com/en/search?keyword=${encodeURIComponent(keywords)}`;

    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto(URL, { waitUntil: 'networkidle2' });

    await autoScroll(page);

    const products = await page.evaluate(() => {
        const productElements = document.querySelectorAll('li[data-testid="item-cell"]');
        const all_products = [];
        productElements.forEach((product, index) => {
            if (index < 8) {
                const nameElement = product.querySelector('div.merItemThumbnail');
                const priceElement = product.querySelector('.priceContainer__a6f874a2 .number__6b270ca7');
                const imgElement = product.querySelector('img');
                const linkElement = product.querySelector('a[data-testid="thumbnail-link"]');

                let name = "N/A";
                if (nameElement) {
                    const ariaLabel = nameElement.getAttribute('aria-label');
                    if (ariaLabel && ariaLabel.includes("Image of ")) {
                        const nameMatch = ariaLabel.match(/Image of (.+?) (\d{1,3}(?:,\d{3})*(?:\.\d{2})?yen|RM)/);
                        if (nameMatch) {
                            name = nameMatch[1].trim();
                        }
                    }
                }
                                
                const price = priceElement ? `¥${priceElement.innerText.trim()}` : "N/A";
                const imgLink = imgElement ? imgElement.src : "N/A";
                const productLink = linkElement ? `https://jp.mercari.com${linkElement.getAttribute('href')}` : "N/A";

                all_products.push({
                    name: name,
                    price: price,
                    img_link: imgLink,
                    product_link: productLink
                });
            }
        });
        return all_products;
    });
    await browser.close();
    return products;   
}

async function autoScroll(page) {
    await page.evaluate(async () => {
        await new Promise((resolve) => {
            let totalHeight = 0;
            const distance = 100;
            const timer = setInterval(() => {
                const scrollHeight = document.body.scrollHeight; // TODO: check
                window.scrollBy(0, distance);
                totalHeight += distance;

                if (totalHeight >= scrollHeight) {
                    clearInterval(timer);
                    resolve();
                }
            }, 100);
        });
    });
}

const keywords = process.argv[2];
scrapeMercari(keywords).then(products => {
    console.log(JSON.stringify(products));
});