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


## Scheduling Task

```sh
node puppeteer/flex-schedule.js --headless >> flex-schedule.log 2>&1
```

## Notes

- Mealpal kitchen opens Friday at 8pm?
- Meals are back on Sunday such as sophies.
