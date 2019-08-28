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

const WEEKDAY_INDEX_TO_DAY = {
  1: {
    name: 'Monday',
  },
  2: {
    name: 'Tuesday',
  },
  3: {
    name: 'Wednesday',
  },
  4: {
    name: 'Thursday',
  },
  5: {
    name: 'Friday',
  },
};

async function main() {
  const args = [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-infobars',
    '--window-position=0,0',
    '--window-size=1388,800',
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
    slowMo: (!headlessMode && 50) || 0,
    // userDataDir: TEMP_DIR,
  };

  const browser = await puppeteer.launch(options);

  const pages = await browser.pages();
  const page = pages[0];
  page.setViewport({ width: 1280, height: 800 });

  await page.goto('https://secure.mealpal.com/login', {
    waitUntil: 'networkidle2', // 'networkidle0' is very useful for SPAs.
  });

  const clickSeeMenuForDay = (weekdayIndex) => {
    const seeMenuBtnSelector = `#reservation-container > div > div:nth-child(${weekdayIndex}) button.empty-day__action`;
    return page.click(seeMenuBtnSelector);
  };

  const waitForDayOfWeek = (weekdayIndex) => {
    const extraOptions = {};
    const dayOfWeek = WEEKDAY_INDEX_TO_DAY[weekdayIndex].name;

    return page.waitFor(
      (dayOfWeek) => {
        const dayTextSelector = '#main > mp-weekday-carousel > div > span';
        return document.querySelector(dayTextSelector).textContent === dayOfWeek;
      },
      extraOptions,
      dayOfWeek
    );
  };

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

    const mealReadyButton = '#dialog-rate-meal .rate-meal__group-wait-time button:first-of-type';
    const mealReadyButtonEl = await page.$(mealReadyButtonSelector);
    await mealReadyButtonEl.click();
  };

  const reserveMeal = async ({ day, meal, location, favorited = true }) => {
    await clickSeeMenuForDay(day);
    await waitForDayOfWeek(5);

    const filterMealSelector = '.filters-wrapper .filter-text input';
    await page.waitForSelector(filterMealSelector);
    await page.focus(filterMealSelector);
    await page.type(meal);
  };

  // Login
  await logIn();

  // Handle modals.
  await rateMeal();

  // Select meals for days
  await reserveMeal({ day: 4, meal: 'Sophie' });
}

if (require.main === module) {
  main();
}
