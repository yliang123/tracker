const { collector } = require("@themarkup/blacklight-collector");
const { join } = require("path");
const fs = require("fs");
const puppeteer = require("puppeteer");
const mkdirp = require('mkdirp');
const path = require("path");
// const file = "./cookies.json";
// async function exportCookies(url) {
//   const browser = await puppeteer.launch({ headless: false });
//   const page = await browser.newPage();
//   await page.goto(url, { waitUntil: "networkidle2" });
//   await page.waitFor(waitForElement);
//   const cookies = await page.cookies();
//   await fs
//     .appendFile(url + "cookies.json", JSON.stringify(cookies, null, 2))
//     .then(() => console.log("Cookies exported!"))
//     .catch(err => console.log(err));
//   await browser.close();
// }
let Urls = ["http://mays.com", "http://www.cnn.com"];
(async () => {


  // navigate to target website
  for (let i = 0; i < Urls.length; i++) {
    const browser = await puppeteer.launch({ 
      headless: false, numPages: 2});
    const page = await browser.newPage();
  
    // log console to console
    page.on('console', (...args) => {
      console.log('PAGE LOG: ', ...args);
    });
    await page.goto(Urls[i]);
    // get all links on the page
    const links = await page.evaluate(() => {
      const anchors = Array.from(document.querySelectorAll('a'));
      return anchors.map(anchor => anchor.href).filter(href => href.startsWith('http'));
    });
    // log links to console
    console.log(links)
    //filter links to only include the domain of the target website
    const filteredLinks = links.filter(link => link.includes(Urls[i].split("//")[1]));
    // log filtered links to console
    console.log(filteredLinks);
    // visit each link 
    let cookies = [];

    for (let j = 0; j < Math.min(5, filteredLinks.length); j++) {
      await page.goto(filteredLinks[j]);
      await page.waitFor(1000);
      const cookie = await page.cookies();
      cookies.push(cookie);
      //check session recording
      
      
    }
    //export cookies to file
    let outDir = links[0].split("//")[1];
    fileName = "cookies.json";
    try {
      mkdirp.sync(outDir);
      fs.writeFileSync(
        join(outDir, fileName),
        JSON.stringify(cookies , null, 2),
      );
      console.log("Cookies exported!");
    }
    catch (err) {
      console.log(err);
    }


    browser.close();
  }
 
})();



