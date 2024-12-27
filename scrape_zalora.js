const puppeteer = require("puppeteer");

async function scrapeZalora(keywords) {
  const URL = `https://www.zalora.com.my/search?q=${keywords}`;
  const browser = await puppeteer.launch({
    args: ["--no-sandbox", "--disable-setuid-sandbox"], // FIXME: dangerous. remove in future maybe
  });
  const page = await browser.newPage();
  await page.goto(URL, { waitUntil: "networkidle2" });

  const products = await page.evaluate(() => {
    const productElements = document.querySelectorAll(
      "a[data-test-id='productLink']"
    );
    const all_products = [];
    productElements.forEach((product, index) => {
      if (index < 8) {
        const nameElement = product.querySelector(
          "div[data-test-id='productTitle']"
        );
        const priceElement = product.querySelector(
          "div[data-test-id='originalPrice']"
        );
        const imgElement = product.querySelector("img");
        const linkElement = product;

        const name = nameElement ? nameElement.innerText.trim() : "N/A";
        let price = priceElement ? priceElement.innerText.trim() : "N/A";
        price = price.replace(/Â/g, "").replace(/\u00A0/g, " "); // regex HAHAHAH
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
    return all_products.filter(
      (product) =>
        product.name !== "N/A" &&
        product.price !== "N/A" &&
        product.img_link !== "N/A" &&
        product.product_link !== "N/A"
    );
  });

  await browser.close();
  return products;
}

const keywords = process.argv[2];
scrapeZalora(keywords).then((products) => {
  console.log(JSON.stringify(products));
});

module.exports = { scrapeZalora };
