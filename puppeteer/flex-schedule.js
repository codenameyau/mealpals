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

function delay(time) {
  return new Promise(function(resolve) {
    setTimeout(resolve, time);
  });
}

function exitWithMessage(message) {
  console.error(message);
  return process.exit(1);
}

async function main() {
  const args = [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-infobars',
    '--window-position=0,0',
    '--window-size=1280,792',
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

  const emailSelector = '#user_email';
  const passwordSelector = '#user_password';
  const loginButtonSelector = '#new_user > input[type="submit"]';

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
    console.log(loginButtonSelector);
    const loginButton = document.querySelector(loginButtonSelector);
    loginButton && loginButton.click();
  });

  // findButtonAndClick('Log In');

  // await page.waitForResponse(
  //   (response) =>
  //     response.url() === 'https://www.instagram.com/accounts/login/ajax/' &&
  //     response.status() === 200
  // );

  // await delay(1000);
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
