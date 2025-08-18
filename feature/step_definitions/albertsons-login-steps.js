const { Given, When, Then, Before, After, setDefaultTimeout } = require('@cucumber/cucumber');
const { chromium } = require('playwright');
const { expect } = require('@playwright/test');

setDefaultTimeout(120000); // Set step timeout to 2 minutes

let browser, context, page, yopmailPage;
let testEmail, yopmailInbox, extractedOTP;

// === Setup and Teardown ===

Before(async function () {
  browser = await chromium.launch({ headless: false }); // Show browser
  context = await browser.newContext();
  page = await context.newPage();
});

After(async function () {
  if (browser) await browser.close(); // Close browser after each test
});

// === Step Definitions ===

// 1. Store test email address
Given('I have a valid test email account {string}', function (email) {
  testEmail = email;
  yopmailInbox = email.split('@')[0]; // Get part before '@'
});

// 2. Confirm YOPmail inbox
Given('I have access to the YOPmail inbox {string}', function (inbox) {
  yopmailInbox = inbox;
});

// 3. Navigate to the login page
Given('I navigate to the Albertsons Partner Portal login page', async function () {
  await page.goto('https://partner-uat.albertsons.com/memsp-ui-shell/meupp/');
  await page.waitForLoadState('domcontentloaded');
});

// 4. Enter email and click "Next"
When('I enter my email address for authentication', async function () {
  await page.waitForSelector('input[name="loginfmt"], input[type="email"]');
  await page.fill('input[name="loginfmt"], input[type="email"]', testEmail);
});

When('I click the Next button to proceed', async function () {
  await page.click('#idSIButton9');
});

// 5. Ensure redirect to Microsoft login
Then('I should be redirected to Microsoft authentication', async function () {
  expect(page.url()).toContain('login.microsoftonline.com');
});

// 6. Wait for email to be sent
Then('I should receive a verification email', async function () {
  await page.waitForTimeout(5000); // Wait for email to arrive
});

// 7. Open YOPmail and check inbox
When('I open YOPmail to check my inbox', async function () {
  yopmailPage = await context.newPage();
  await yopmailPage.goto('https://yopmail.com/en/');
  await yopmailPage.fill('#login', yopmailInbox);
  await yopmailPage.press('#login', 'Enter');
  await yopmailPage.waitForSelector('#ifinbox');
});

// 8. Find the latest email
When('I find the verification email from Microsoft', async function () {
  const inboxFrame = await (await yopmailPage.$('#ifinbox')).contentFrame();
  await inboxFrame.waitForSelector('div.m'); // Wait for email list
  await inboxFrame.locator('div.m').first().click(); // Open first email
});

// 9. Extract OTP from email content
When('I extract the OTP code from the email', async function () {
  const mailFrame = await (await yopmailPage.$('#ifmail')).contentFrame();
  await yopmailPage.waitForTimeout(3000); // Wait for content to load

  let mailText = await mailFrame.evaluate(() => document.body.innerText);

  // Try to extract a 6–8 digit code (OTP)
  const match = mailText.match(/\d{6,8}/);
  extractedOTP = match ? match[0] : null;

  if (!extractedOTP) throw new Error('OTP not found in email.');
});

// 10. Go back to login page
When('I return to the login page', async function () {
  await page.bringToFront();
});

// 11. Enter the OTP code
When('I enter the OTP code', async function () {
  console.log(`Entering OTP: ${extractedOTP}`);

  // Wait for OTP input field and fill it (try multiple selectors)
  try {
    await page.waitForSelector('input[name="otc"]', { timeout: 10000 });
    await page.fill('input[name="otc"]', extractedOTP);
    console.log('Successfully filled OTP using input[name="otc"]');
  } catch (error) {
    try {
      await page.waitForSelector('input[type="text"]', { timeout: 5000 });
      await page.fill('input[type="text"]', extractedOTP);
      console.log('Successfully filled OTP using input[type="text"]');
    } catch (error2) {
      try {
        await page.waitForSelector('input[placeholder*="code"], input[placeholder*="Code"]', { timeout: 5000 });
        await page.fill('input[placeholder*="code"], input[placeholder*="Code"]', extractedOTP);
        console.log('Successfully filled OTP using placeholder selector');
      } catch (error3) {
        console.log('Could not find OTP input field with any selector');
        throw new Error('OTP input field not found');
      }
    }
  }
});

// 12. Click the verify button
When('I click the verify button', async function () {
  console.log('Clicking verify button...');
  await page.waitForSelector('#idSIButton9', { timeout: 10000 });
  await page.click('#idSIButton9');
  console.log('Verify button clicked successfully');
});

// 13. Confirm successful login
Then('I should be successfully logged into the Albertsons Partner Portal', async function () {
  console.log('Verifying successful login...');

  // Wait for redirect back to Albertsons portal after successful authentication
  await page.waitForLoadState('domcontentloaded');
  console.log('After OTP verification, URL:', page.url());

  // Wait for successful login redirect to the portal
  await page.waitForURL('**/memsp-ui-shell/**', { timeout: 30000 });
  console.log('Successfully redirected to Albertsons portal:', page.url());
});

Then('I should see the portal dashboard', async function () {
  // Verify we're logged into the Albertsons Partner Portal
  await expect(page).toHaveURL(/partner-uat\.albertsons\.com\/memsp-ui-shell/);
  console.log('✅ Successfully logged into Albertsons Partner Portal!');

  await page.waitForTimeout(5000);

 
  
});





