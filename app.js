require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const { exec } = require("child_process");
const { performance } = require("perf_hooks"); // Import performance module
const { ChatOllama } = require("@langchain/ollama");
const { ChatPromptTemplate } = require("@langchain/core/prompts");

// Initialize Express App
const app = express();
const cache = {}; // Cache for storing product results

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "static"))); // Static files (CSS/JS)
app.use(express.json());
app.set("view engine", "ejs"); // Set EJS as template engine
app.set("views", path.join(__dirname, "templates")); // Point views to 'templates'

// ---------- Utility for Timestamps ----------
function logWithTimestamp(message) {
  console.log(`[${new Date().toISOString()}] ${message}`);
}

// ---------- Ollama Keyword Extractor ----------
const llm = new ChatOllama({
  model: "llama3.1:latest", // Ensure exact model name
  temperature: 0.0,
  basePath: "http://127.0.0.1:11434", // Force IPv4 instead of localhost (::1)
});

async function keywordExtractor(query) {
  const prompt = ChatPromptTemplate.fromMessages([
    {
      role: "system",
      content: `
                You are a keyword extractor that, given a user sentence or question, will extract a searchable product on an e-commerce site.
                Make sure to follow the guidelines below:
                1. Do not ask questions.
                2. Do not output a list.
                3. Output only a few words (keywords).
                4. If there are multiple keywords, only get the first one spaced correctly.
                5. If user query does not include any product reply with the query itself.
                6. If user searches for a product directly, use that as the keyword.
            `,
    },
    { role: "human", content: query },
  ]);

  const chain = prompt.pipe(llm);
  const result = await chain.invoke({ query });
  return result.content.trim();
}

// ---------- Helper Function for Puppeteer Scripts ----------
function runPuppeteerScript(script, keywords) {
  return new Promise((resolve, reject) => {
    const scriptPath = path.resolve(__dirname, `./${script}`);
    console.log("Script path:", scriptPath);

    exec(
      `node ${scriptPath} "${keywords}"`,
      // `node app/api/products/${script} "${keywords}"`,
      (error, stdout, stderr) => {
        // exec(`node ./${script} "${keywords}"`, (error, stdout, stderr) => {
        if (error) {
          logWithTimestamp(`Error running ${script}: ${stderr}`);
          resolve([]); // Return empty array on error
          return;
        }
        try {
          resolve(JSON.parse(stdout)); // Parse JSON output
        } catch (err) {
          logWithTimestamp(`JSONDecodeError: ${err}`);
          logWithTimestamp(`Output was: ${stdout}`);
          resolve([]); // Return empty array if JSON fails
        }
      }
    );
  });
}

// ---------- Scraping Functions ----------
async function scrapeSite(siteName, script, keywords) {
  const start = performance.now(); // Start time
  console.log(`Scraping ${siteName}...`);
  const result = await runPuppeteerScript(script, keywords);
  const end = performance.now(); // End time
  console.log(
    `Finished scraping ${siteName} in ${(end - start).toFixed(2)} ms`
  );
  return result;
}

// const { scrapeCarousell } = require(path.resolve(
//   __dirname,
//   "./backend/scrape_carousell.js"
// ));
// async function scrapeCarousellProducts(keywords) {
//   // return await scrapeSite("/Carousell", "scrape_carousell.js", keywords);
//   return await scrapeCarousell(keywords);
// }

const { scrapeZalora } = require(path.resolve(__dirname, "./scrape_zalora.js"));
async function scrapeZaloraProducts(keywords) {
  // return await scrapeSite("Zalora", "scrape_zalora.js", keywords);
  return await scrapeZalora(keywords);
}

// const { scrapePGMall } = require(path.resolve(
//   __dirname,
//   "./backend/scrape_pgmall.js"
// ));
// async function scrapePgmallProducts(keywords) {
//   // return await scrapeSite("PGMall", "scrape_pgmall.js", keywords);
//   return await scrapePGMall(keywords);
// }

async function scrapeOhgatchaProducts(keywords) {
  return await scrapeSite("Ohgatcha", "scrape_ohgatcha.js", keywords);
}

async function scrapeGoodSmileProducts(keywords) {
  return await scrapeSite("Goodsmile", "scrape_goodsmile.js", keywords);
}

async function scrapeAnimateProducts(keywords) {
  return await scrapeSite("Animate", "scrape_animate.js", keywords);
}

async function scrapeHobilityProducts(keywords) {
  return await scrapeSite("Hobility", "scrape_hobility.js", keywords);
}

async function scrapeHololiveProducts(keywords) {
  return await scrapeSite("Hololive", "scrape_hololive.js", keywords);
}

async function scrapeNijisanjiProducts(keywords) {
  return await scrapeSite("Nijisanji", "scrape_nijisanji.js", keywords);
}

async function scrapeShirotoysProducts(keywords) {
  return await scrapeSite("Shirotoys", "scrape_shirotoys.js", keywords);
}

async function scrapeSkyeProducts(keywords) {
  return await scrapeSite("Skye", "scrape_skye.js", keywords);
}

async function scrapeMalboroProducts(keywords) {
  return await scrapeSite("Malboro", "scrape_malboro.js", keywords);
}

async function scrapeGanknowProducts(keywords) {
  return await scrapeSite("Ganknow", "scrape_ganknow.js", keywords);
}

async function scrapeMercariProducts(keywords) {
  return await scrapeSite("Mercari", "scrape_mercari.js", keywords);
}

async function scrapeEpicnpcProducts(keywords) {
  return await scrapeSite("EpicNPC", "scrape_epicnpc.js", keywords);
}

async function scrapeAllProducts(keywords) {
  logWithTimestamp(`Starting scraping for keywords: ${keywords}`);

  // Check cache first
  if (cache[keywords]) {
    logWithTimestamp(`Fetching cached results for: ${keywords}`);
    return cache[keywords];
  }

  // Start scraping tasks for all sites
  const tasks = [
    // scrapeCarousellProducts(keywords),
    scrapeZaloraProducts(keywords),
    // scrapePgmallProducts(keywords),
    // scrapeOhgatchaProducts(keywords),
    // scrapeGoodSmileProducts(keywords),
    // scrapeAnimateProducts(keywords),
    // scrapeHobilityProducts(keywords),
    // scrapeHololiveProducts(keywords),
    // scrapeNijisanjiProducts(keywords),
    // scrapeShirotoysProducts(keywords),
    // scrapeSkyeProducts(keywords),
    // scrapeMalboroProducts(keywords),
    // scrapeMercariProducts(keywords),
    // scrapeGanknowProducts(keywords),
    // scrapeEpicnpcProducts(keywords),
  ];

  // Wait for all scraping tasks to complete
  const results = await Promise.all(tasks);

  // Combine results into a structured object
  const allProducts = {
    // Carousell: results[0],
    Zalora: results[0],
    // PGMall: results[2],
    // Ohgatcha: results[3],
    // GoodSmile: results[4],
    // Animate: results[5],
    // Hobility: results[6],
    // Hololive: results[7],
    // Nijisanji: results[8],
    // Shirotoys: results[9],
    // Skye: results[10],
    // Malboro: results[11],
    // Mercari: results[12],
    // Ganknow: results[13],
    // EpicNPC: results[14],
  };

  Object.keys(allProducts).forEach((site) => {
    const productCount = allProducts[site].length;
    console.log(`Products from ${site}: ${productCount}/8`);
  });

  // Cache the results
  cache[keywords] = allProducts;
  return allProducts;
}

// export async function getProducts(query) {
//   // With llama
//   // const keywords = await keywordExtractor(query);
//   // const products = await scrapeAllProducts(keywords);
//   // return products;

//   // Without llama
//   const products = await scrapeAllProducts(query);
//   return products;
// }

// ---------- Routes ----------
// app.get("/", (req, res) => res.render("index"));

app.post("/search", async (req, res) => {
  // console.log("Received POST request:", req);
  const query = req.body.query;
  logWithTimestamp(`Query received: ${query}`);

  const keywords = query;
  // const keywords = await keywordExtractor(query);
  logWithTimestamp(`Extracted keywords: ${keywords}`);

  const products = await scrapeAllProducts(keywords);
  // res.render("products", { products });
  logWithTimestamp(`Rendering products for keywords: ${keywords}`);
  res.json(products);
});

app.get("/test", async (req, res) => {
  // return a simple "hello world" response
  res.send("Hello, world!");
});

// ---------- Start Server ----------
const PORT = process.env.PORT || 4000;
app.listen(PORT, () =>
  logWithTimestamp(`Server running on http://localhost:${PORT}`)
);
