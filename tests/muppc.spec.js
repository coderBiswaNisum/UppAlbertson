// muppc.spec.js
const { test, expect } = require('@playwright/test');

test('login to Albertsons and read YOPmail', async ({ page, context }) => {
  // Increase test timeout
  test.setTimeout(120000); // 2 minutes

  const email = 'gmvendorexternaleditordiv27@yopmail.com';
  const yopmailInbox = 'gmvendorexternaleditordiv27';

  try {
    // Go to Albertsons login page
    await page.goto('https://partner-uat.albertsons.com/memsp-ui-shell/meupp/', { timeout: 30000 });

    // Wait for page to load and check if we're redirected to Microsoft login
    await page.waitForLoadState('domcontentloaded');

    // Debug: Log current URL
    console.log("Current URL:", page.url());

    // Fill email field (Microsoft login uses 'loginfmt' name)
    await page.waitForSelector('input[name="loginfmt"], input[type="email"]', { timeout: 15000 });
    await page.fill('input[name="loginfmt"], input[type="email"]', email);

    // Click the Next button (Microsoft login specific)
    await page.waitForSelector('#idSIButton9', { timeout: 15000 });
    await page.click('#idSIButton9');

    // Wait for navigation after clicking Next
    await page.waitForLoadState('domcontentloaded');
    console.log("After clicking Next, URL:", page.url());

    console.log("Waiting for email to arrive...");

    // Open new tab for YOPmail
    const yopmailPage = await context.newPage();
    console.log("Opening YOPmail...");
    await yopmailPage.goto('https://yopmail.com/en/', { timeout: 30000 });

    // Fill the inbox name and submit
    await yopmailPage.waitForSelector('#login', { timeout: 20000 });
    await yopmailPage.fill('#login', yopmailInbox);

    // Press Enter to submit (most reliable method)
    await yopmailPage.press('#login', 'Enter');
    console.log("Submitted inbox name, waiting for inbox to load...");

    // Wait for inbox to be ready
    await yopmailPage.waitForSelector('#ifinbox', { timeout: 20000 });

    // Wait for inbox frame and click first email
    let mailText = '';
    console.log("Looking for emails...");

    const inboxFrame = await (await yopmailPage.waitForSelector('#ifinbox', { timeout: 20000 })).contentFrame();

    // Wait for emails to load and click the first one
    await inboxFrame.waitForSelector('div.m', { timeout: 30000 });

    // Debug: Count emails and show their subjects
    const emailCount = await inboxFrame.locator('div.m').count();
    console.log(`Found ${emailCount} emails`);

    for (let i = 0; i < Math.min(emailCount, 3); i++) {
      try {
        const emailSubject = await inboxFrame.locator('div.m').nth(i).textContent();
        console.log(`Email ${i + 1}: ${emailSubject}`);
      } catch (error) {
        console.log(`Could not read email ${i + 1} subject`);
      }
    }

    console.log("Clicking first email...");
    await inboxFrame.locator('div.m').first().click();

    // Read email content
    const mailFrame = await (await yopmailPage.waitForSelector('#ifmail', { timeout: 20000 })).contentFrame();

    // Wait longer for email content to load
    await yopmailPage.waitForTimeout(3000);

    // Try multiple ways to get email content
    try {
      // First try to wait for any content in the frame
      await mailFrame.waitForSelector('*', { timeout: 10000 });

      mailText = await mailFrame.textContent('body');
      if (!mailText || mailText.trim().length === 0) {
        console.log("Body text empty, trying innerHTML...");
        mailText = await mailFrame.innerHTML('body');
      }
      if (!mailText || mailText.trim().length === 0) {
        console.log("Body innerHTML empty, trying entire page...");
        mailText = await mailFrame.textContent('html');
      }
      if (!mailText || mailText.trim().length === 0) {
        console.log("HTML text empty, trying all elements...");
        const allText = await mailFrame.evaluate(() => document.documentElement.innerText);
        mailText = allText || '';
      }
    } catch (error) {
      console.log("Error reading email content:", error.message);
      mailText = '';
    }

    console.log("Email content:", mailText);
    console.log("Email content length:", mailText.length);

    // Example OTP extraction (try multiple patterns)
    let otp = null;
    const patterns = [
      /code:\s*(\d{6,8})/i,
      /verification code:\s*(\d{6,8})/i,
      /code\s+is\s+(\d{6,8})/i,
      /(\d{6,8})/g
    ];

    for (const pattern of patterns) {
      const match = mailText.match(pattern);
      if (match) {
        otp = match[1] || match[0];
        if (otp && otp.length >= 6 && otp.length <= 8) {
          break;
        }
      }
    }

    console.log("Extracted OTP:", otp);
    console.log("Email content length:", mailText.length);

    if (otp) {
      console.log("Switching back to login page...");
      await page.bringToFront();
      await page.waitForLoadState('domcontentloaded');

      // Wait for OTP input field and fill it (try multiple selectors)
      try {
        await page.waitForSelector('input[name="otc"]', { timeout: 10000 });
        await page.fill('input[name="otc"]', otp);
      } catch (error) {
        try {
          await page.waitForSelector('input[type="text"]', { timeout: 5000 });
          await page.fill('input[type="text"]', otp);
        } catch (error2) {
          await page.waitForSelector('input[placeholder*="code"], input[placeholder*="Code"]', { timeout: 5000 });
          await page.fill('input[placeholder*="code"], input[placeholder*="Code"]', otp);
        }
      }

      // Click verify button (Microsoft login specific)
      await page.waitForSelector('#idSIButton9', { timeout: 10000 });
      await page.click('#idSIButton9');

      console.log("OTP submitted successfully");

      // Wait for redirect back to Albertsons portal after successful authentication
      await page.waitForLoadState('domcontentloaded');
      console.log("After OTP verification, URL:", page.url());

      // Wait for successful login redirect to the portal
      await page.waitForURL('**/memsp-ui-shell/**', { timeout: 30000 });
      console.log("Successfully redirected to Albertsons portal:", page.url());

      // Verify we're logged into the Albertsons Partner Portal
      await expect(page).toHaveURL(/partner-uat\.albertsons\.com\/memsp-ui-shell/);
      console.log("✅ Successfully logged into Albertsons Partner Portal!");

      // Additional verification - wait for page to fully load and check for common portal elements
      try {
        // Wait for any of these common elements that might appear on the portal dashboard
        await page.waitForSelector('nav, .navbar, .header, .dashboard, .menu, [role="navigation"]', { timeout: 15000 });
        console.log("✅ Portal dashboard elements loaded successfully!");
      } catch (error) {
        console.log("⚠️ Portal loaded but dashboard elements not found - this might be expected");
      }

      // Take a screenshot for verification
      await page.screenshot({ path: 'successful-login.png', fullPage: true });
      console.log("📸 Screenshot saved as 'successful-login.png'");

    } else {
      console.log("OTP not found in email.");
      throw new Error("Could not extract OTP from email - login cannot be completed");
    }

  } catch (error) {
    console.log("Test failed with error:", error.message);
    throw error;
  }
});
