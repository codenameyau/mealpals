require('dotenv').config();
const puppeteer = require('puppeteer');
const program = require('commander');

program.version('0.0.1');

program
  .option('-h, --headless', '(optional) specify to run in headless mode', false)
  .option('-r, --refresh', '(optional) refresh when kitchen is closed', false)
  .option('-e, --email <email>', '(required) specify email address')
  .option('-p, --password <password>', '(required) specify password');

program.parse(process.argv);

const MEALPAL_EMAIL = process.env['MEALPAL_EMAIL'] || program.email;
const MEALPAL_PASSWORD = process.env['MEALPAL_PASSWORD'] || program.password;

if (!MEALPAL_EMAIL || !MEALPAL_PASSWORD) {
  console.log(program.opts());
  console.log(program.help());
}

const args = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-infobars',
  '--window-position=0,0',
  '--window-size=1388,900',
  '--ignore-certifcate-errors',
  '--ignore-certifcate-errors-spki-list',
];

const headlessMode = !!(program.headless || false);

const options = {
  args,
  headless: headlessMode,
  devtools: false,
  defaultViewport: null,
  ignoreHTTPSErrors: true,
  slowMo: 25,
  // userDataDir: require('path').join(__dirname, '../tmp'),
};

function getCurrentTime() {
  return new Date().toLocaleString();
}

const logger = {
  logTime: (text) => {
    console.log(`(${getCurrentTime()}) - ${text}`);
  },
};

async function main() {
  const browser = await puppeteer.launch(options);

  const pages = await browser.pages();
  const page = pages[0];
  page.setViewport({ width: 1280, height: 800 });

  await page.goto('https://secure.mealpal.com/login', {
    waitUntil: 'networkidle2', // 'networkidle0' is very useful for SPAs.
  });

  const logIn = async () => {
    const emailSelector = '#user_email';
    await page.waitForSelector(emailSelector);
    await page.focus(emailSelector);
    await page.type(emailSelector, MEALPAL_EMAIL, { delay: 10 });

    const passwordSelector = '#user_password';
    await page.waitForSelector(passwordSelector);
    await page.focus(passwordSelector);
    await page.type(passwordSelector, MEALPAL_PASSWORD, { delay: 10 });

    const loginBtnSelector = '#new_user > input[type="submit"]';
    await page.click(loginBtnSelector);
    await page.waitForNavigation({ waitUntil: 'networkidle2' });
  };

  const handleKitchenClosed = async () => {
    const closedKitchenSelector = '.kitchen-closed';
    let closedKitchenEl = await page.$(closedKitchenSelector);

    if (closedKitchenEl !== null && program.refresh) {
      let continueRefreshing = true;

      while (continueRefreshing) {
        await page.reload({
          waitUntil: 'networkidle0',
        });

        let closedKitchenEl = await page.$(closedKitchenSelector);
        if (closedKitchenEl === null) {
          logger.logTime('Kitchen is now opened.');
          continueRefreshing = false;
        }
      }
    } else if (closedKitchenEl !== null) {
      logger.logTime('Kitchen is now closed.');
      await browser.close();
      process.exit(0);
    }
  };

  const rateMeal = async () => {
    const rateMealDialogSelector = '#dialog-rate-meal';
    const rateMealDialogEl = await page.$(rateMealDialogSelector);

    if (!rateMealDialogEl) {
      return;
    }

    const fiveStarSelector = '#dialog-rate-meal .rate-meal__group-rating span:last-of-type';
    const fiveStarEl = await page.$(fiveStarSelector);
    await fiveStarEl.click();

    const bigMealSelector = '#dialog-rate-meal .rate-meal__group-portion span:last-of-type';
    const bigMealEl = await page.$(bigMealSelector);
    await bigMealEl.click();

    const mealReadyButtonSelector =
      '#dialog-rate-meal .rate-meal__group-wait-time button:first-of-type';
    const mealReadyButtonEl = await page.$(mealReadyButtonSelector);
    await mealReadyButtonEl.click();

    const rateMealSubmitButtonSelector = '#dialog-rate-meal button.mp-red-button-full';
    const rateMealSubmitButtonEl = await page.$(rateMealSubmitButtonSelector);
    await rateMealSubmitButtonEl.click();
  };

  const cancelMeals = async () => {
    const cancelLinkSelector = 'a.flex-reservation__action-bar__cancel';
    const cancelModalBtnSelector = '.dialog button.mp-cancel-order';
    const cancelOrderBtnSelector = '#dialog-reservation-cancelled .close-button';

    const cancelLinks = await page.$$(cancelLinkSelector);
    for (let link of cancelLinks) {
      await link.click();
      await page.waitForSelector(cancelModalBtnSelector);
      await page.click(cancelModalBtnSelector);
      await page.waitForSelector(cancelOrderBtnSelector);
      await page.click(cancelOrderBtnSelector);
    }

    logger.logTime('Meals succesfully cancelled.');
  }

  await logIn();
  await rateMeal();
  await handleKitchenClosed();
  await cancelMeals();

  headlessMode && browser.close();
}

if (require.main === module) {
  main();
}
