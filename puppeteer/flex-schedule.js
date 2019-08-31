// Usage:
// node puppeteer/flex-schedule.js --email="myemail@gmail.com" --password="password123"
require('dotenv').config();
const puppeteer = require('puppeteer');
const program = require('commander');
const path = require('path');

program.version('0.0.1');

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

const INDEX_TO_DAY = {
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
  devtools: !headlessMode,
  defaultViewport: null,
  ignoreHTTPSErrors: true,
  slowMo: (!headlessMode && 25) || 0,
  // userDataDir: path.join(__dirname, '../tmp'),
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

  const getCurrentDay = async () => {
    const dayTextSelector = '#main > mp-weekday-carousel > div > span';
    await page.waitForSelector(dayTextSelector);

    const dayTextEl = await page.$(dayTextSelector);
    return dayTextEl.textContent;
  };

  const waitForDayUpdated = async (day) => {
    const waitForOptions = {};
    const dayName = INDEX_TO_DAY[day].name;

    return page.waitFor(
      (dayName) => {
        const dayTextSelector = '#main > mp-weekday-carousel > div > span';
        return document.querySelector(dayTextSelector).textContent === dayName;
      },
      waitForOptions,
      dayName
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

  const exitIfKitchenClosed = async () => {
    const closedKitchenSelector = '.kitchen-closed';
    const closedKitchenEl = await page.$(closedKitchenSelector);

    if (closedKitchenEl !== null) {
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

  // Check for these states for selected day:
  // - Meal is already reserved.
  // - Meal is in the past but not reserved (.empty-day but no see menu button).
  // - Meal is in the future but reserved (don't reserve again).
  // - Meal is in the future but not reserved (continue with logic).
  const reserveMeal = async ({ day, meal, location, timeSlot = 3 }) => {
    const currentDaySelector = `#reservation-container > div > div:nth-child(${day})`;

    const mealReservedSelector = `${currentDaySelector} .flex-reservation__meal-info`;
    const mealReservedEl = await page.$(mealReservedSelector);
    if (mealReservedEl !== null) {
      return logger.logTime(`Meal for ${INDEX_TO_DAY[day].name} is already reserved.`);
    }

    const seeMenuBtnSelector = `${currentDaySelector} button.empty-day__action`;
    const seeMenuBtnEl = await page.$(seeMenuBtnSelector);
    if (seeMenuBtnEl !== null) {
      await page.click(seeMenuBtnSelector);
      await waitForDayUpdated(day);
    }

    const filterMealSelector = '.filters-wrapper .filter-text input';
    await page.waitForSelector(filterMealSelector);
    await page.focus(filterMealSelector);
    await page.$eval(filterMealSelector, (el) => (el.value = ''));
    await page.type(filterMealSelector, meal);

    // Might want to return the actual node rather than the index.
    const mealBoxIndex = await page.$$eval(
      '.meal-listing .meal-box',
      (nodes, location) => {
        return nodes.findIndex((node) => {
          return node.querySelector('.address').innerText.indexOf(location) > -1;
        });
      },
      location
    );

    const mealBoxSelector = `.meal-listing .meal-box:nth-child(${mealBoxIndex + 1})`;
    const soldOutMessageEl = await page.$(`${mealBoxSelector} .sold-out-message`);

    if (mealBoxIndex === -1) {
      return logger.logTime(
        `Meal "${meal}" at ${location} for ${INDEX_TO_DAY[day].name} is not available.`
      );
    }

    if (soldOutMessageEl !== null) {
      return logger.logTime(
        `Meal "${meal}" at ${location} for ${INDEX_TO_DAY[day].name} is sold out.`
      );
    }

    const confirmMeal = async () => {
      const mealSelector = `${mealBoxSelector} .meal`;
      const mealEl = await page.$(mealSelector);
      await mealEl.hover();

      await page.evaluate(
        (mealBoxSelector, timeSlot) => {
          const dropdownTimeSelector = `${mealBoxSelector} ul > li:nth-child(${timeSlot})`;
          document.querySelector(dropdownTimeSelector).click();

          const reserveBtnSelector = `${mealBoxSelector} .mp-reserve-button`;
          document.querySelector(reserveBtnSelector).click();
        },
        mealBoxSelector,
        timeSlot
      );

      logger.logTime(
        `Meal "${meal}" at ${location} for ${INDEX_TO_DAY[day].name} successfully reserved.`
      );
    };

    const closePickupInfoModal = async () => {
      const modalSelector = '.header-modal__body-wrapper--pickup-info';
      await page.waitForSelector(modalSelector);

      const modalEl = await page.$(modalSelector);
      if (modalEl !== null) {
        const closeBtnSelector = `${modalSelector} button.modal__button`;
        await page.click(closeBtnSelector);
      }
    };

    await confirmMeal();
    await closePickupInfoModal();
  };

  // Login
  await logIn();

  // Handle modals.
  await rateMeal();

  // Handle kitchen closed.
  await exitIfKitchenClosed();

  // Select meals for days
  await reserveMeal({ day: 2, meal: 'go go curry', location: '273 W 38th St', timeSlot: 3 });
  await reserveMeal({ day: 3, meal: 'sophie', location: '1015 6th Ave', timeSlot: 3 });
  await reserveMeal({ day: 3, meal: 'wok to walk', location: '570 8th Ave', timeSlot: 3 });
  await reserveMeal({ day: 4, meal: 'luke', location: '1407 Broadway', timeSlot: 3 });
  browser.close();
}

if (require.main === module) {
  main();
}
