// Usage:
// node puppeteer/flex-schedule.js --email="myemail@gmail.com" --password="password123"
require('dotenv').config();
const puppeteer = require('puppeteer');
const program = require('commander');
const path = require('path');

program.version('0.0.1');

const TEMP_DIR = path.join(__dirname, '../tmp');

program
  .option('-h, --headless', '(optional) specify to run in headless mode', false)
  .option('-e, --email <email>', '(required) specify email address')
  .option('-p, --password <password>', '(required) specify password');

program.parse(process.argv);

const MEALPAL_EMAIL = process.env['MEALPAL_EMAIL'] || program.email;
const MEALPAL_PASSWORD = process.env['MEALPAL_PASSWORD'] || program.password;

if (!MEALPAL_EMAIL || !MEALPAL_PASSWORD) {
  console.log(program.opts());
  console.log(program.help());
}

async function delay(time) {
  return new Promise(function(resolve) {
    setTimeout(resolve, time);
  });
}

function exitWithMessage(message) {
  console.error(message);
  return process.exit(1);
}

const INDEX_TO_DAY_MAP = {
  0: {
    name: 'Monday',
  },
  1: {
    name: 'Tuesday',
  },
  2: {
    name: 'Wednesday',
  },
  3: {
    name: 'Thursday',
  },
  4: {
    name: 'Friday',
  },
};

async function main() {
  const args = [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-infobars',
    '--window-position=0,0',
    '--window-size=1388,792',
    '--ignore-certifcate-errors',
    '--ignore-certifcate-errors-spki-list',
  ];

  const headlessMode = !!(program.headless || false);

  const options = {
    args,
    headless: headlessMode,
    devtools: !headlessMode,
    defaultViewport: null,
    ignoreHTTPSErrors: true,
    // userDataDir: TEMP_DIR,
  };

  const browser = await puppeteer.launch(options);

  const pages = await browser.pages();
  const page = pages[0];

  const pageUrl = 'https://secure.mealpal.com/login';

  await page.goto(pageUrl, {
    waitUntil: 'networkidle0', // 'networkidle0' is very useful for SPAs.
  });

  // const findButtonAndClick = (query) => {
  //   page.evaluate((query) => {
  //     const elements = [...document.querySelectorAll('button')];
  //     const targetElement = elements.find((e) => e.textContent.includes(query));
  //     targetElement && targetElement.click();
  //   }, query);
  // };

  // const currentlyEmptyEl = targetDayEl.querySelector('.empty-day__wrapper .animation-container');
  // `#reservation-container > div > div:nth-child(${weekdayIndex}) button .empty-day__action`;

  const clickSeeMenuForDay = async (weekdayIndex) => {
    const reservationDay = `#reservation-container > div > div:nth-child(${weekdayIndex}) button .empty-day__action`;
    const seeMenuButton = await page.$(reservationDay);
    console.log('seeMenuButton', seeMenuButton);

    if (seeMenuButton !== null) {
      await seeMenuButton.click();
    }

    // return page.evaluate(async (weekdayIndex) => {
    //   const targetDayEl = document.querySelectorAll(
    //     '.reservations-slots-container .reservation-slot'
    //   )[weekdayIndex];
    //   const seeMenuEl = targetDayEl.querySelector('.empty-day__action');

    //   console.log('targetDayEl', targetDayEl, seeMenuEl);

    //   if (seeMenuEl) {
    //     await seeMenuEl.click();
    //   }
    // }, weekdayIndex);
  };

  const emailSelector = '#user_email';
  const passwordSelector = '#user_password';

  if ((await page.$(emailSelector)) !== null) {
    await page.type(emailSelector, MEALPAL_EMAIL, { delay: 10 });
  } else {
    exitWithMessage(`Could not find: ${emailSelector}`);
  }

  if ((await page.$(passwordSelector)) !== null) {
    await page.type(passwordSelector, MEALPAL_PASSWORD, { delay: 10 });
  } else {
    exitWithMessage(`Could not find: ${passwordSelector}`);
  }

  await page.evaluate(() => {
    const loginButton = document.querySelector('#new_user > input[type="submit"]');
    loginButton && loginButton.click();
  });

  await page.waitForResponse(
    (response) =>
      response.url() === 'https://secure.mealpal.com/' && response.status() === 200
  );

  await delay(1000);
  // clickSeeMenuForDay(1);
  // await delay(2000);
  // clickSeeMenuForDay(2);
  // await delay(2000);
  await clickSeeMenuForDay(1);
  await clickSeeMenuForDay(2);
  await clickSeeMenuForDay(3);
  await clickSeeMenuForDay(4);
  await clickSeeMenuForDay(5);
  // await clickSeeMenuOnDay(1, "Luke's Lobster");

  // findButtonAndClick('Cancel');
  // findButtonAndClick('Not Now');

  // const [fileChooser] = await Promise.all([
  //   page.waitForFileChooser(),
  //   page.waitForSelector(postButtonSelector),
  //   page.click(postButtonSelector),
  // ]);

  // await fileChooser.accept([program.image]);

  // await delay(1000);
  // findButtonAndClick('Next');

  // await delay(1000);
  // console.log('HASHTAGS TO POST: ', hastagsString);
  // await page.focus(textAreaSelector);

  // await page.keyboard.type('Link in bio!');
  // await page.keyboard.press('Enter');
  // await page.keyboard.type('.');
  // await page.keyboard.press('Enter');
  // await page.keyboard.type('.');
  // await page.keyboard.press('Enter');
  // await page.keyboard.type('.');
  // await page.keyboard.press('Enter');
  // await page.keyboard.type('.');
  // await page.keyboard.press('Enter');
  // await page.keyboard.type(hastagsString);

  // await delay(2000);
  // findButtonAndClick('Share');

  // await page.waitForResponse(
  //   (response) =>
  //     response.url() === 'https://www.instagram.com/qp/batch_fetch_web/' &&
  //     response.status() === 200
  // );

  // await delay(1000);
  // findButtonAndClick('Cancel');
  // findButtonAndClick('Not Now');

  // await page.screenshot({ path: TEMP_DIR + '/screenshot.png' });
}

if (require.main === module) {
  main();
}
