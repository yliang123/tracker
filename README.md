const { collector } = require("@themarkup/blacklight-collector");
const { join } = require("path");
const fs = require("fs");
const puppeteer = require("puppeteer");
const mkdirp = require('mkdirp');
const path = require("path");
const { harFromMessages } = require('chrome-har');
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
let Urls = ["http://mays.com"];
// list of events for converting to HAR
const events = [];

// event types to observe
const observe = [
  'Page.loadEventFired',
  'Page.domContentEventFired',
  'Page.frameStartedLoading',
  'Page.frameAttached',
  'Network.requestWillBeSent',
  'Network.requestServedFromCache',
  'Network.dataReceived',
  'Network.responseReceived',
  'Network.resourceChangedPriority',
  'Network.loadingFinished',
  'Network.loadingFailed',
];
(async () => {

  // navigate to target website
  for (let i = 0; i < Urls.length; i++) {
    let outDir = Urls[i].split("//")[1];
    const browser = await puppeteer.launch({ 
    headless: false, numPages: 2});
    const page = await browser.newPage();
    // try{
    //   await har.start({ path: outDir + '.har' });
    // } catch (e) {
    //   console.log(e);
    // }
    // log console to console
      // register events listeners
  const client =  page.target().createCDPSession();
   client.send('Page.enable');
   client.send('Network.enable');
  observe.forEach(method => {
    client.on(method, params => {
      events.push({ method, params });
    });
  });
    page.on('console', (...args) => {
      console.log('PAGE LOG: ', ...args);
    });
    await page.goto(Urls[i]);
    // get all links on the page
    // try {
    //   await har.stop();
    // } catch (e) {
    //   console.log(e);
    // }
    const links = await page.evaluate(() => {
      const anchors = Array.from(document.querySelectorAll('a'));
      return anchors.map(anchor => anchor.href).filter(href => href.startsWith('http'));
    });
    // log links to console
    console.log(links)
    //filter links to only include the domain of the target website
    const filteredLinks = links.filter(link => link.includes(Urls[i].split("//")[1]));

    // get all requests on the page
    const requests = await page.evaluate(() => {
      return window.performance.getEntriesByType("resource").map(r => r.name);
    });
    // console.log(requests);
    // // log filtered links to console
    // console.log(filteredLinks);
    // visit each link 
    let cookies = [];
    let browserHistory = [];
    browserHistory.push(Urls[i]);
    for (let j = 0; j < Math.min(5, filteredLinks.length); j++) {
      browserHistory.push(filteredLinks[j]);
      await page.goto(filteredLinks[j]);
      const cookie = await page.cookies();
      cookies.push(cookie);
      //check session recording
      const tempLinks = await page.evaluate(() => {
        const anchors = Array.from(document.querySelectorAll('a'));
        return anchors.map(anchor => anchor.href).filter(href => href.startsWith('http'));
      });
      const tempRequests = await page.evaluate(() => {
        return window.performance.getEntriesByType("resource").map(r => r.name);
      });
      requests.push(...tempRequests);
      links.push(...tempLinks);
      await page.waitFor(1000);
    }
    //export cookies to file
    // let outDir = links[0].split("//")[1];
    fileName = "cookies.json";
    try {
      mkdirp.sync(outDir);
      fs.writeFileSync(
        join(outDir, fileName),
        JSON.stringify(cookies , null, 2),
      );
      console.log("Cookies exported!");
      //export requests to file
      fileName = "requests.json";
      fs.writeFileSync(
        join(outDir, fileName),
        JSON.stringify(requests, null, 2),
      );
      console.log("Requests exported!");
      //export browser history to file
      fileName = "browserHistory.json";
      fs.writeFileSync(
        join(outDir, fileName),
        JSON.stringify(browserHistory, null, 2),
      );
    }
    catch (err) {
      console.log(err);
    }
    console.log(requests);
    console.log(links);

    browser.close();
    // convert events to HAR file
  const har = harFromMessages(events);
  await promisify(fs.writeFile)('en.wikipedia.org.har', JSON.stringify(har));
  }
 
})();
