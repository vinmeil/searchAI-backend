const puppeteer = require('puppeteer');

async function scrapeShirotoys(keywords) {
    const URL = `https://www.shirotoys.com/search?q=${keywords}`;
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto(URL, { waitUntil: 'networkidle2' });

    await autoScroll(page);
    
    const products = await page.evaluate(() => {
        const productElements = document.querySelectorAll(".grid"); // Select all product grid containers
        const allProducts = [];

        productElements.forEach((product, index) => {
            if (index < 8) { // Limit to 8 products
                // Extract the name
                const nameElement = product.querySelector(".grid__item.three-fifths h3 a");
                const name = nameElement ? nameElement.innerText.trim() : "N/A";

                // Extract the price
                const priceElement = product.querySelector(".grid__item.three-fifths .money");
                const price = priceElement ? priceElement.getAttribute("data-currency-myr").trim() : "N/A";

                // Extract the image link
                const imgElement = product.querySelector(".grid__item.two-fifths img");
                const imgLink = imgElement ? imgElement.src : "N/A";

                // Extract the product link
                const linkElement = product.querySelector(".grid__item.three-fifths h3 a");
                const productLink = linkElement ? `https://www.shirotoys.com${linkElement.getAttribute("href")}` : "N/A";

                allProducts.push({
                    name: name,
                    price: price,
                    img_link: imgLink,
                    product_link: productLink,
                });
            }
        });

        // TODO: Dont include this in the final version
        return allProducts.filter(product => product.name !== "N/A" && product.price !== "N/A" && product.img_link !== "N/A" && product.product_link !== "N/A");
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
                const scrollHeight = document.body.scrollHeight;
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

const keywords = process.argv[2] || "hololive"; // Default to 'hololive' if no keywords are provided
scrapeShirotoys(keywords).then(products => {
    console.log(JSON.stringify(products, null, 2));
}).catch(err => {
    console.error("Error:", err);
});