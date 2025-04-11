const axios = require("axios");
const { CookieJar } = require("tough-cookie");
const { wrapper } = require("axios-cookiejar-support");

const jar = new CookieJar();
const client = wrapper(axios.create({ jar }));

module.exports.getNSEStockPrice = async (req, res) => {
    const symbol = req.query.symbol;

    if (!symbol) {
        return res.status(400).json({ error: "Symbol parameter is required" });
    }

    try {
        // 🔹 Step 1: Establish Session (Load Homepage)
        await client.get("https://www.nseindia.com", {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
                "Accept": "text/html",
                "Referer": "https://www.nseindia.com/"
            }
        });

        // 🔹 Step 2: Wait for 2 seconds (NSE blocks rapid requests)
        await new Promise(resolve => setTimeout(resolve, 2000));

        // 🔹 Step 3: Fetch Stock Data
        const url = `https://www.nseindia.com/api/quote-equity?symbol=${symbol}`;
        const response = await client.get(url, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
                "Referer": "https://www.nseindia.com/",
                "Accept": "application/json",
            }
        });

        res.json(response.data);
    } catch (error) {
        console.error("NSE Fetch Error:", error.message);
        res.status(500).json({ error: "Failed to fetch NSE data" });
    }
};


module.exports.getNSEOptionPrice = async (req, res) => {
    const symbol = req.query.symbol;

    if (!symbol) {
        return res.status(400).json({ error: "Symbol parameter is required" });
    }

    try {
        // 🔹 Step 1: Establish Session (Load Homepage)
        await client.get("https://www.nseindia.com", {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
                "Accept": "text/html",
                "Referer": "https://www.nseindia.com/"
            }
        });

        // 🔹 Step 2: Wait for 2 seconds (NSE blocks rapid requests)
        await new Promise(resolve => setTimeout(resolve, 2000));

        // 🔹 Step 3: Fetch Stock Data
        const url = `https://www.nseindia.com/api/option-chain-equities?symbol=${symbol}`;
        const response = await client.get(url, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
                "Referer": "https://www.nseindia.com/",
                "Accept": "application/json",
            }
        });

        res.json(response.data);
    } catch (error) {
        console.error("NSE Fetch Error:", error.message);
        res.status(500).json({ error: "Failed to fetch NSE data" });
    }
};




// const puppeteer = require("puppeteer");

// module.exports.getNSEStockPrice = async (req, res) => {
//     const symbol = req.query.symbol;

//     if (!symbol) {
//         return res.status(400).json({ error: "Symbol parameter is required" });
//     }

//     const url = `https://www.nseindia.com/get-quotes/equity?symbol=${symbol}`;

//     const browser = await puppeteer.launch({ headless: true });
//     const page = await browser.newPage();

//     // Set User-Agent to mimic real user
//     await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64)");

//     // Visit NSE page
//     await page.goto(url, { waitUntil: "networkidle2" });

//     // Wait for page data to load
//     await page.waitForSelector(".symbol");

//     // Extract JSON data from script
//     const data = await page.evaluate(() => {
//         console.log(JSON.parse(document.querySelector("#responseDiv").innerText))
//         return res.status(200).json(JSON.parse(document.querySelector("#responseDiv").innerText));
//     });

//     console.log(data);
//     await browser.close();
//     res.status(200).json(data);
// }