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
// let Urls = ["http://mays.com","https://www.nytimes.com/","https://www.huffpost.com/", "https://www.huffpost.com/", "https://www.foxnews.com/","https://www.usatoday.com/","https://www.politico.com/","https://news.yahoo.com/", "https://www.npr.org/","https://www.latimes.com/california"];
// let Urls = ["https://www.usatoday.com/","https://www.politico.com/","https://news.yahoo.com/", "https://www.npr.org/","https://www.latimes.com/california"];

// let Urls = ["https://www.autoblog.com/", "https://jalopnik.com/", "http://www.speedhunters.com/", "https://www.motorauthority.com/", "https://paultan.org/", "https://www.greencarreports.com/", "https://www.carexpert.com.au/", "https://www.carscoops.com","https://www.caranddriver.com/","https://www.carfax.com/"]

// let Urls = ["https://www.jihadwatch.org"]
// let Urls =["https://cupofjo.com/", "https://www.theblondeabroad.com/travel-blog/", "https://onbetterliving.com/", "https://goop.com/", "https://camillestyles.com/", "https://witanddelight.com/", "https://blog.justinablakeney.com", "https://heleneinbetween.com/", "https://abeautifulmess.com/", "https://www.primermagazine.com/"]
// list of events for converting to HAR
const events = [];
let Urls = ["https://www.webmd.com/news", "https://www.health.harvard.edu/blog", "https://www.mercola.com/", "https://wellnessmama.com/blog/", "https://www.precisionnutrition.com/blog", "https://psychcentral.com/blog", "https://www.marksdailyapple.com/blog/", "https://healthphreaks.com/", "https://mobihealthnews.com", "https://khn.org/"]
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
process.on('unhandledRejection', error => {
  console.log('我帮你处理了', error.message);
});
(async () => {

  // navigate to target website
  for (let i = 0; i < Urls.length; i++) {
    let outDir = Urls[i].split("//")[1];
    const browser = await puppeteer.launch({
      headless: false, numPages: 2
    });
    const page = await browser.newPage();
    const client = await page.target().createCDPSession();
    await client.send('Page.enable');
    await client.send('Network.enable');
    observe.forEach(method => {
      client.on(method, params => {
        events.push({ method, params });
      });
    });
    // try{
    //   await har.start({ path: outDir + '.har' });
    // } catch (e) {
    //   console.log(e);
    // }
    // log console to console
    // register events listeners
    page.on('console', (...args) => {
      console.log('PAGE LOG: ', ...args);
    });
    await page.goto(Urls[i]);
    // set timeout to allow page to load
    await page.setDefaultNavigationTimeout(3000)
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
      try {
        await page.goto(filteredLinks[j]);
        await page.waitForNavigation({
          waitUntil: 'networkidle2',
        });
      }
      catch (e) {
        console.log(e);
      }
      // wait for 1 to 3 seconds

      const cookie = (await client.send('Network.getAllCookies')).cookies;
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

    }
    //export cookies to file
    // let outDir = links[0].split("//")[1];
    fileName = "cookies.json";
    try {
      mkdirp.sync(outDir);
      fs.writeFileSync(
        join(outDir, fileName),
        JSON.stringify(cookies, null, 2),
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
    const har = harFromMessages(events);
    //export har file
    fileName = "har.json";
    try {
      mkdirp.sync(outDir);
      fs.writeFileSync(
        join(outDir, fileName),
        JSON.stringify(har, null, 2),
      );
      console.log("HAR exported!");
    }
    catch (err) {
      console.log(err);
    }

    // convert events to HAR file
  }

})();
