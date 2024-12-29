const puppeteer = require("puppeteer");

async function scrapeGoodSmile(keywords) {
  const URL = `https://www.goodsmile.com/en/search?search_keyword=${keywords}`;
  let browser;
  const maxDuration = 60 * 1000; // 60 seconds
  if (
    process.env.NODE_ENV === "production" ||
    process.env.VERCEL_ENV === "production"
  ) {
    browser = await puppeteer.launch({
      args: [
        "--disable-setuid-sandbox",
        "--no-sandbox",
        "--single-process",
        "--no-zygote",
      ],
      executablePath:
        process.env.NODE_ENV === "production"
          ? process.env.PUPPETEER_EXECUTABLE_PATH
          : puppeteer.executablePath(),
      timeout: maxDuration,
    });
  } else {
    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
  }

  const page = await browser.newPage();
  await page.setDefaultNavigationTimeout(0);
  await page.goto(URL, { waitUntil: "networkidle2" });

  const products = await page.evaluate(() => {
    const productElements = document.querySelectorAll(".p-product-list__item");
    const all_products = [];
    productElements.forEach((product, index) => {
      if (index < 8) {
        const nameElement = product.querySelector(".b-product-item__title h2");
        const priceElement = product.querySelector(".c-price__main");
        const imgElement = product.querySelector(".b-product-item__image img");
        const linkElement = product.querySelector("a.p-product-list__link");

        const name = nameElement ? nameElement.innerText.trim() : "N/A";
        let price = priceElement ? priceElement.innerText.trim() : "N/A";
        price = price.replace(/[^\d¥,]/g, "");
        price = price.replace(/Â/g, "").replace(/\u00A0/g, " ");
        const imgLink = imgElement ? imgElement.src : "N/A";
        const productLink = linkElement ? linkElement.href : "N/A";

        const priceNumber = parseFloat(price.replace(/,/g, ""));
        const malaysianPrice = isNaN(priceNumber)
          ? "N/A"
          : (priceNumber * 0.029).toFixed(2);

        all_products.push({
          name: name,
          // TODO: use API to convert currency
          price: `¥${price} (RM${malaysianPrice})`,
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

const keywords = process.argv[2];
scrapeGoodSmile(keywords).then((products) => {
  console.log(JSON.stringify(products));
});

module.exports = { scrapeGoodSmile };
