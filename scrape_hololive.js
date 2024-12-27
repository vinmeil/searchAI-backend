const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

async function scrapeHololivePro(keywords) {
    const URL = `https://shop.hololivepro.com/en/search?q=${encodeURIComponent(keywords)}&options%5Bprefix%5D=last&sort_by=created-descending`;

    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto(URL, { waitUntil: 'networkidle2' });

    const products = await page.evaluate(() => {
        const productElements = document.querySelectorAll(".grid__item");
        const allProducts = [];

        productElements.forEach((product, index) => {
            if (index < 8) {
                const nameElement = product.querySelector(".Item_body p");
                const priceElement = product.querySelector(".Item_info_price .price1");
                const imgElement = product.querySelector(".primary-image");
                const linkElement = product.querySelector(".Item_inner");

                const name = nameElement ? nameElement.innerText.trim() : "N/A";
                const price = priceElement ? priceElement.innerText.trim() : "N/A";
                const imgLink = imgElement ? imgElement.src : "N/A";
                const productLink = linkElement ? `https://shop.hololivepro.com${linkElement.getAttribute("href")}` : "N/A";

                allProducts.push({
                    name: name,
                    price: price,
                    img_link: imgLink,
                    product_link: productLink,
                });
            }
        });

        return allProducts //.filter(product => product.name !== "N/A" && product.price !== "N/A" && product.img_link !== "N/A" && product.product_link !== "N/A");
    });

    await browser.close();
    return products;
}

const keywords = process.argv[2];
scrapeHololivePro(keywords).then(products => {
    console.log(JSON.stringify(products, null, 2));
}).catch(err => {
    console.error("Error:", err);
});