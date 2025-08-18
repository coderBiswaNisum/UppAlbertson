Feature: Albertsons Partner Portal Login with Email Verification
  As a partner user
  I want to login to the Albertsons Partner Portal
  So that I can access the partner resources and tools

  Background:
    Given I have a valid test email account "gmvendorexternaleditordiv27@yopmail.com"
    And I have access to the YOPmail inbox "gmvendorexternaleditordiv27"

  @login @smoke1
  Scenario: Successful login to Albertsons Partner Portal with email verification
    Given I navigate to the Albertsons Partner Portal login page
    When I enter my email address for authentication
    And I click the Next button to proceed
    Then I should be redirected to Microsoft authentication
    And I should receive a verification email
    When I open YOPmail to check my inbox
    And I find the verification email from Microsoft
    And I extract the OTP code from the email
    And I return to the login page
    And I enter the OTP code
    And I click the verify button
    Then I should be successfully logged into the Albertsons Partner Portal
      And I should see the portal dashboard

  

 
