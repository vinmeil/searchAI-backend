const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
puppeteer.use(StealthPlugin());

async function scrapePGMall(keywords) {
  const URL = `https://pgmall.my/search?search=${keywords}`;
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(URL, { waitUntil: "networkidle2" });

  await autoScroll(page);

  const products = await page.evaluate(() => {
    const productElements = document.querySelectorAll(
      ".category_product_col_new"
    );
    const all_products = [];
    productElements.forEach((product, index) => {
      if (index < 8) {
        const nameElement = product.querySelector(".p-name p");
        const priceElement = product.querySelector(".p-price-red span");
        const imgElement = product.querySelector(".product-img-wrapper img");
        const linkElement = product.querySelector(".product-img-wrapper");

        const name = nameElement ? nameElement.innerText.trim() : "N/A";
        const price = priceElement ? priceElement.innerText.trim() : "N/A";
        const imgLink = imgElement ? imgElement.src : "N/A";
        const productLink = linkElement ? linkElement.href : "N/A";

        all_products.push({
          name: name,
          price: price,
          img_link: imgLink,
          product_link: productLink,
        });
      }
    });
    return all_products;
  });

  await browser.close();
  return products;
}

// PG Mall: special case to avoid lazy loading
// Function to auto-scroll the page
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
scrapePGMall(keywords).then((products) => {
  console.log(JSON.stringify(products));
});

module.exports = { scrapePGMall };
