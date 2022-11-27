const fs = require('fs');
const { promisify } = require('util');

const puppeteer = require('puppeteer');
const { harFromMessages } = require('chrome-har');

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
process.on('unhandledRejection', error => {
    console.log('我帮你处理了', error.message);
   });
   
(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  // register events listeners
  const client = await page.target().createCDPSession();
  await client.send('Page.enable');
  await client.send('Network.enable');
  observe.forEach(method => {
    client.on(method, params => {
      events.push({ method, params });
    });
  });

  // perform tests
  await page.goto('https://en.wikipedia.org');
  page.click('#n-help > a');
  await page.waitForNavigation({ waitUntil: 'networkidle2' });
  await browser.close();

  // convert events to HAR file
  const har = harFromMessages(events);
  await promisify(fs.writeFile)('en.wikipedia.org.har', JSON.stringify(har));
})();