const puppeteer = require("puppeteer");
const puppeteerCore = require("puppeteer-core");
const chromium = require("@sparticuz/chromium-min");

chromium.setHeadlessMode = true;
chromium.setGraphicsMode = false;

async function scrapeZalora(keywords) {
  const URL = `https://www.zalora.com.my/search?q=${keywords}`;
  let browser;
  const maxDuration = 60 * 1000; // 60 seconds
  if (
    process.env.NODE_ENV === "production" ||
    process.env.VERCEL_ENV === "production"
  ) {
    // Use puppeteer-core with chromium-min in production (Vercel)
    // const executablePath = await chromium.executablePath(
    //   "https://github.com/Sparticuz/chromium/releases/download/v131.0.1/chromium-v131.0.1-pack.tar"
    // );
    // // console.log("Path: ", path.resolve(__dirname, '../chromium'));
    // // const executablePath = await chromium.executablePath(path.resolve(__dirname, '../chromium'));
    // browser = await puppeteerCore.launch({
    //   executablePath,
    //   args: chromium.args,
    //   headless: chromium.headless,
    //   defaultViewport: chromium.defaultViewport,
    //   ignoreHTTPSErrors: true,
    //   timeout: maxDuration,
    // });

    // using puppeteer and docker
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
    // Use puppeteer locally
    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
  }

  const page = await browser.newPage();
  await page.goto(URL, { waitUntil: "networkidle2" });
  await page.setViewport({ width: 1080, height: 1024 });

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

module.exports = { scrapeZalora };

const keywords = process.argv[2];
scrapeZalora(keywords)
  .then((products) => {
    console.log(JSON.stringify(products));
  })
  .catch((error) => {
    console.error("Error:", error);
  });
