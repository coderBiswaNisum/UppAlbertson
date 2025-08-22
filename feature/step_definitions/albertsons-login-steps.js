const { Given, When, Then, Before, After, setDefaultTimeout } = require('@cucumber/cucumber');
const { chromium } = require('playwright');
const { expect } = require('@playwright/test');
require('ts-node').register(); // Enables TypeScript imports
const { LoginPage } = require('../../pages/LoginPage');

setDefaultTimeout(120000);

let browser, context, page, yopmailPage, loginPage;
let testEmail, yopmailInbox, extractedOTP;

Before(async function () {
  browser = await chromium.launch({ headless: false });
  context = await browser.newContext();
  page = await context.newPage();
  loginPage = new LoginPage(page);
});

After(async function () {
  if (browser) await browser.close();
});

// ===== Step Definitions =====

Given('I have a valid test email account {string}', function (email) {
  testEmail = email;
  yopmailInbox = email.split('@')[0];
});

Given('I have access to the YOPmail inbox {string}', function (inbox) {
  yopmailInbox = inbox;
});

Given('I navigate to the Albertsons Partner Portal login page', async function () {
  await loginPage.navigate();
});

When('I enter my email address for authentication', async function () {
  await loginPage.enterEmail(testEmail);
});

When('I click the Next button to proceed', async function () {
  await loginPage.clickNext();
});

Then('I should be redirected to Microsoft authentication', async function () {
  expect(page.url()).toContain('login.microsoftonline.com');
});

Then('I should receive a verification email', async function () {
  await page.waitForTimeout(5000);
});

When('I open YOPmail to check my inbox', async function () {
  yopmailPage = await context.newPage();
  await yopmailPage.goto('https://yopmail.com/en/');
  await yopmailPage.fill('#login', yopmailInbox);
  await yopmailPage.press('#login', 'Enter');
  await yopmailPage.waitForSelector('#ifinbox');
});

When('I find the verification email from Microsoft', async function () {
  const captcha = await yopmailPage.$('#recaptcha-anchor');

  if (captcha) {
    await yopmailPage.waitForFunction(() => {
      return !document.querySelector('#recaptcha-anchor');
    }, { timeout: 10000 }); 
  }
  const inboxFrame = await (await yopmailPage.$('#ifinbox')).contentFrame();
  await inboxFrame.waitForSelector('div.m');
  await inboxFrame.locator('div.m').first().click();
});



When('I extract the OTP code from the email', async function () {
  const mailFrame = await (await yopmailPage.$('#ifmail')).contentFrame();
  await yopmailPage.waitForTimeout(10000);

  let mailText = await mailFrame.evaluate(() => document.body.innerText);
  const match = mailText.match(/\d{6,8}/);
  extractedOTP = match ? match[0] : null;

  if (!extractedOTP) throw new Error('OTP not found in email.');
});

When('I return to the login page', async function () {
  await page.bringToFront();
});

When('I enter the OTP code', async function () {
  await loginPage.enterOTP(extractedOTP);
});

When('I click the verify button', async function () {
  await loginPage.clickNext();
});

Then('I should be successfully logged into the Albertsons Partner Portal', async function () {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForURL('**/memsp-ui-shell/**', { timeout: 30000 });
});

Then('I should see the portal dashboard', async function () {
  await expect(page).toHaveURL(/partner-uat\.albertsons\.com\/memsp-ui-shell/);
  await page.waitForTimeout(5000);
});
