# mealpals
Mealpal bot for flex plan

Puppeteer documentation:
https://pptr.dev/#?product=Puppeteer&version=v1.19.0&show=outline

## Setup

Install dependencies
```sh
yarn install
```

Copy dotenv and update file with your mealpal credentials
```
cp .env-template .env
vim .env
```

Alternatively you can enter your username and password via the commandline.
```sh
node puppeteer/flex-schedule.js --email=email --password=password
```

## Scheduling Task
You can change the meals inside the `flex-meals.json` file.

```sh
node puppeteer/flex-schedule.js --headless --refresh >> flex-schedule.log 2>&1
```

```sh
# Edit cronfile
crontab -e

# Run on friday at 8:15
15 8 * * 5 $(cd /home/yau/Workspace/github/mealpals; node puppeteer/flex-schedule.js --refresh)
```

## Notes

- Download amphetamine to keep computer running 24/7.
- Mealpal flex kitchen opens on Friday between 8pm and 9pm.
- Set slowMo >= 25 to give js enough time to evaluate actions.
