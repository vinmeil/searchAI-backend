const puppeteer = require('puppeteer');

async function scrapeGanknow(keywords) {
    const URL = `https://ganknow.com/${keywords}?tab=shop`;
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto(URL, { waitUntil: 'networkidle2' });

    const products = await page.evaluate(() => {
        const productElements = document.querySelectorAll("article");
        const allProducts = [];

        productElements.forEach((product, index) => {
            if (index < 8) {
                const nameElement = product.querySelector("a[data-test-id^='shop-card-title'] h3");
                const priceElement = product.querySelector("div[data-test-id='shop-card-local-price']");
                const imgElement = product.querySelector("a[data-test-id^='shop-card-'] img");
                const linkElement = product.querySelector("a[data-test-id^='shop-card-']");

                const name = nameElement ? nameElement.innerText.trim() : "N/A";
                const price = priceElement ? priceElement.innerText.trim() : "N/A";
                const imgLink = imgElement ? imgElement.src : "N/A";
                const productLink = linkElement ? `https://ganknow.com${linkElement.getAttribute("href")}` : "N/A";

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

const keywords = process.argv[2] || "prikachu";
scrapeGanknow(keywords).then((products) => {
    console.log(JSON.stringify(products));
}).catch((err) => {
    console.error("Error:", err);
});