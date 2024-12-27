const puppeteer = require('puppeteer');

async function scrapeHobility(keywords) {
    const URL = `https://hobility.com/?ywcas=1&post_type=product&lang=en_US&s=${keywords}`;
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto(URL, { waitUntil: 'networkidle2' });

    await autoScroll(page);
    
    const products = await page.evaluate(() => {
        const productElements = document.querySelectorAll("li.product"); // Select all product list items
        const allProducts = [];

        productElements.forEach((product, index) => {
            if (index < 8) { // Limit to 8 products
                const nameElement = product.querySelector(".woocommerce-loop-product__title");
                const priceElement = product.querySelector(".woocommerce-Price-amount");
                const imgElement = product.querySelector("img");
                const linkElement = product.querySelector("a.woocommerce-LoopProduct-link");

                const name = nameElement ? nameElement.innerText.trim() : "N/A";
                const price = priceElement ? priceElement.innerText.trim().replace(",", "") : "0";
                const imgLink = imgElement ? imgElement.src : "N/A";
                const productLink = linkElement ? linkElement.href : "N/A";

                allProducts.push({
                    name: name,
                    price: price,
                    img_link: imgLink,
                    product_link: productLink,
                });
            }
        });
        return allProducts;
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
scrapeHobility(keywords).then(products => {
    console.log(JSON.stringify(products, null, 2));
}).catch(err => {
    console.error("Error:", err);
});