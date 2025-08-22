import { Page } from "@playwright/test";

export class LoginPage {
  constructor(private page: Page) {}

  // Locators 
  get emailField() {
    return this.page.locator('input[name="loginfmt"], input[type="email"]');
  }

  get nextButton() {
    return this.page.locator("#idSIButton9");
  }

  get otpField() {
    return this.page.locator(
      'input[name="otc"], input[type="text"], input[placeholder*="code"], input[placeholder*="Code"]'
    );
  }

  // Navigate to Login Page
  async navigate() {
    await this.page.goto(
      "https://partner-uat.albertsons.com/memsp-ui-shell/meupp/",
      { waitUntil: "networkidle" }
    );
  }

  // Enter Email
  async enterEmail(email: string) {
    await this.emailField.waitFor({ state: "visible" });
    await this.emailField.fill(email);
  }

  // Click Next
  async clickNext() {
    await this.nextButton.waitFor({ state: "attached" });
    await this.nextButton.click();
  }

  async enterOTP(otp: string) {
    await this.otpField.first().waitFor({ state: "visible" });

    const inputs = await this.page.locator('input[type="text"]').all();
    if (inputs.length === otp.length) {
      // Case: OTP fields are split into multiple boxes
      for (let i = 0; i < otp.length; i++) {
        await inputs[i].fill(otp[i]);
      }
    } else {
      // Case: Single input field for OTP
      await this.otpField.fill(otp);
    }
  }
}
