const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const AdblockerPlugin = require('puppeteer-extra-plugin-adblocker');
puppeteer.use(StealthPlugin());
puppeteer.use(AdblockerPlugin({ blockTrackers: true }));

async function scrapeEpicNpc(keyword) {
    const firstLetter = keyword.charAt(0).toUpperCase();
    console.log("First letter is:", firstLetter);

    const URL = `https://www.epicnpc.com/forumslist/${firstLetter}/`;

    const browser = await puppeteer.launch({
        headless: false, // Change to false for debugging
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await browser.newPage();

    await page.setViewport({ width: 1280, height: 800 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Safari/537.36');

    try {
        await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await page.waitForSelector('.forumitem a.subNodeLink', { timeout: 10000 });

        const closestMatch = await page.evaluate((keyword) => {
            const forumItems = document.querySelectorAll(".forumitem a.subNodeLink");
            let closestName = null;
            let closestLink = null;
            let shortestDistance = Infinity;

            forumItems.forEach((item) => {
                const name = item.innerText.trim();
                const link = item.getAttribute("href");

                const distance = getEditDistance(keyword.toLowerCase(), name.toLowerCase());
                if (distance < shortestDistance) {
                    shortestDistance = distance;
                    closestName = name;
                    closestLink = link;
                }
            });

            return { closestName, closestLink };

            function getEditDistance(a, b) {
                const matrix = Array.from({ length: a.length + 1 }, () => []);

                for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
                for (let j = 0; j <= b.length; j++) matrix[0][j] = j;

                for (let i = 1; i <= a.length; i++) {
                    for (let j = 1; j <= b.length; j++) {
                        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
                        matrix[i][j] = Math.min(
                            matrix[i - 1][j] + 1,
                            matrix[i][j - 1] + 1,
                            matrix[i - 1][j - 1] + cost
                        );
                    }
                }

                return matrix[a.length][b.length];
            }
        }, keyword);

        if (closestMatch.closestName && closestMatch.closestLink) {
            console.log(`Closest match: ${closestMatch.closestName}`);
            console.log(`Link: https://www.epicnpc.com${closestMatch.closestLink}`);
        } else {
            console.log("No close match found.");
        }
    } catch (error) {
        console.error("Error occurred:", error);
    } finally {
        await browser.close();
    }
}

const keyword = process.argv[2] || "A3";
scrapeEpicNpc(keyword).catch((err) => console.error("Critical error:", err));
