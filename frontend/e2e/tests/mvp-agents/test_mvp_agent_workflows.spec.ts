import { test, expect, Page } from '@playwright/test';

// Helper function to simulate user login
async function login(page: Page) {
  // Assuming a simple login process for e2e tests
  await page.goto('/login'); // Replace with your actual login URL
  await page.fill('input[name="email"]', 'test@example.com'); // Replace with test user email
  await page.fill('input[name="password"]', 'password123'); // Replace with test user password
  await page.click('button[type="submit"]');
  await page.waitForURL('/dashboard-doctor'); // Replace with your post-login dashboard URL
  await expect(page.locator('h1')).toHaveText(/Welcome, Doctor/); // Verify successful login
}

test.describe('MVP Agent End-to-End Workflows', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    // Navigate to the chat interface where MVP agents are integrated
    await page.goto('/dashboard-doctor/patients/test_patient_id/chat'); // Assuming a chat URL with patient context
    // Ensure the MVP agents toggle is enabled if applicable
    // await page.locator('input[data-testid="mvp-agents-toggle"]').check();
  });

  test('Clinical Research Agent Workflow: PICO question and research', async ({ page }) => {
    // 1. User inputs a query for PICO formulation and research
    const researchQuery = "Formulate a PICO question and research its effectiveness: statins for hyperlipidemia in diabetic patients.";
    await page.fill('textarea[placeholder*="Enter your clinical question"]', researchQuery);
    await page.click('button:has-text("Research")'); // Assuming a button to trigger research

    // 2. Expect loading state
    await expect(page.locator('button:has-text("Processing...")')).toBeVisible();

    // 3. Expect PICO question and research summary in response
    await expect(page.locator('.clinical-assistant .card-content')).toContainText(/PICO Question:/);
    await expect(page.locator('.clinical-assistant .card-content')).toContainText(/Executive Summary:/);
    await expect(page.locator('.clinical-assistant .card-content')).toContainText(/Relevant References:/);

    // 4. Verify structured PICO components
    await expect(page.locator('.clinical-assistant .card-content')).toContainText(/P \(Patient\/Population\):/);
    await expect(page.locator('.clinical-assistant .card-content')).toContainText(/I \(Intervention\):/);
    await expect(page.locator('.clinical-assistant .card-content')).toContainText(/C \(Comparison\):/);
    await expect(page.locator('.clinical-assistant .card-content')).toContainText(/O \(Outcome\):/);

    // 5. Verify research tabs are present and clickable
    await expect(page.locator('button[role="tab"]:has-text("Summary")')).toBeVisible();
    await expect(page.locator('button[role="tab"]:has-text("Details")')).toBeVisible();
    await expect(page.locator('button[role="tab"]:has-text("Key Findings")')).toBeVisible();
    await expect(page.locator('button[role="tab"]:has-text("References")')).toBeVisible();

    // 6. Click on 'Details' tab and verify content
    await page.click('button[role="tab"]:has-text("Details")');
    await expect(page.locator('.clinical-assistant .card-content')).toContainText(/Detailed Analysis/); // Assuming this text appears in the details tab

    // 7. Click on 'References' tab and verify content
    await page.click('button[role="tab"]:has-text("References")');
    await expect(page.locator('.clinical-assistant .card-content')).toContainText(/DOI:/); // Assuming references have DOIs
  });

  test('Clinical Discussion Agent Workflow: Case analysis with patient context', async ({ page }) => {
    // 1. User inputs a clinical case for discussion
    const caseDescription = "65-year-old male with new onset chest pain, history of hypertension. ECG shows ST depression in leads V4-V6.";
    await page.fill('textarea[placeholder*="Enter your clinical question"]', caseDescription);
    await page.click('button:has-text("Discuss")'); // Assuming a button to trigger discussion

    // 2. Expect loading state
    await expect(page.locator('button:has-text("Processing...")')).toBeVisible();

    // 3. Expect discussion analysis and patient-specific notes
    await expect(page.locator('.clinical-assistant .card-content')).toContainText(/Clinical Response/);
    await expect(page.locator('.clinical-assistant .card-content')).toContainText(/Patient-Specific Considerations/);
    await expect(page.locator('.clinical-assistant .card-content')).toContainText(/geriatric-specific dosing/); // From patient context notes

    // 4. Verify discussion points (summary, differential, management)
    await expect(page.locator('button[role="tab"]:has-text("Summary")')).toBeVisible(); // Default tab
    await expect(page.locator('.clinical-assistant .card-content')).toContainText(/Mock clinical case summary/); // From mocked BAML
  });

  test('Patient Context Workflow: Ensure patient data is used', async ({ page }) => {
    // This test assumes the beforeEach hook sets up a chat with a patient ID
    // and that the mocked backend can return patient-specific notes.

    // 1. Input a general query for discussion, expecting patient context to be applied
    const patientQuery = "Discuss my current health status based on my records.";
    await page.fill('textarea[placeholder*="Enter your clinical question"]', patientQuery);
    await page.click('button:has-text("Discuss")');

    // 2. Expect loading state
    await expect(page.locator('button:has-text("Processing...")')).toBeVisible();

    // 3. Expect patient-specific notes to be displayed
    await expect(page.locator('.clinical-assistant .card-content')).toContainText(/Patient-Specific Considerations/);
    await expect(page.locator('.clinical-assistant .card-content')).toContainText(/geriatric-specific dosing/); // This text comes from the mocked patient context
    
    // 4. Verify general discussion points are also present
    await expect(page.locator('.clinical-assistant .card-content')).toContainText(/Mock clinical case summary/);
  });

  test('Agent Switching Workflow: Verify automatic and manual transitions', async ({ page }) => {
    // This test assumes the UI has a way to display the active agent (e.g., a badge)
    // and potentially a manual switch.

    // 1. Start with a general query that should auto-route to discussion agent
    await page.fill('textarea[placeholder*="Enter your clinical question"]', "Analyze this patient's symptoms: fever, headache.");
    await page.click('button:has-text("Query")');
    await expect(page.locator('button:has-text("Processing...")')).toBeVisible();
    await expect(page.locator('.clinical-assistant .flex')).toContainText(/Agent: clinical discussion/); // Verify initial agent

    // 2. Now input a research query - should auto-route to research agent
    await page.fill('textarea[placeholder*="Enter your clinical question"]', "What is the evidence for current treatments of migraines?");
    await page.click('button:has-text("Query")');
    await expect(page.locator('button:has-text("Processing...")')).toBeVisible();
    await expect(page.locator('.clinical-assistant .flex')).toContainText(/Agent: clinical research/); // Verify switched agent

    // 3. (Optional) If you have a manual agent switch UI:
    //    Simulate clicking a manual switch to discussion agent
    // await page.click('button[data-testid="switch-to-discussion-agent"]');
    // await expect(page.locator('.clinical-assistant .flex')).toContainText(/Agent: clinical discussion/);
    // await page.fill('textarea[placeholder*="Enter your clinical question"]', "Discuss a new case manually.");
    // await page.click('button:has-text("Discuss")');
    // await expect(page.locator('.clinical-assistant .flex')).toContainText(/Agent: clinical discussion/); // Verify manual switch works
  });

  test('General Clinical Query Workflow: Automatic routing', async ({ page }) => {
    // This test assumes the UI allows switching between modes or has a general query input.
    // If not, it would need to be adapted to the specific UI flow.
    // For now, we'll use the general query input of the ClinicalAssistant component.
    
    // Test a research-oriented query
    await page.fill('textarea[placeholder*="Enter your clinical question"]', "What is the evidence for remdesivir in COVID-19?");
    await page.click('button:has-text("Query")'); // Assuming a general query button

    await expect(page.locator('button:has-text("Processing...")')).toBeVisible();
    await expect(page.locator('.clinical-assistant .card-content')).toContainText(/Research Summary/); // Should route to research agent
    await expect(page.locator('.clinical-assistant .flex')).toContainText(/Agent: clinical research/); // Verify agent type

    // Test a discussion-oriented query
    await page.fill('textarea[placeholder*="Enter your clinical question"]', "I have a patient with persistent fever and rash. What's the differential?");
    await page.click('button:has-text("Query")');

    await expect(page.locator('button:has-text("Processing...")')).toBeVisible();
    await expect(page.locator('.clinical-assistant .card-content')).toContainText(/Mock clinical case summary/); // Should route to discussion agent
    await expect(page.locator('.clinical-assistant .flex')).toContainText(/Agent: clinical discussion/); // Verify agent type
  });

  test('Error Recovery Workflow: Agent service failure', async ({ page }) => {
    // This test requires mocking at the API level or triggering a known backend error.
    // For e2e, we'll simulate a query that is known to cause a backend error (e.g., specific keyword).
    // In a real scenario, this might involve setting up a test fixture that makes the backend error.

    // Assuming a query that will trigger a backend error (e.g., "trigger_research_error")
    await page.fill('textarea[placeholder*="Enter your clinical question"]', "trigger_research_error");
    await page.click('button:has-text("Research")');

    await expect(page.locator('button:has-text("Processing...")')).toBeVisible();

    // Expect an error message displayed to the user
    await expect(page.locator('.clinical-assistant .alert-destructive')).toBeVisible();
    await expect(page.locator('.clinical-assistant .alert-destructive')).toContainText(/Request failed/); // Or more specific error message from your API

    // Verify that the UI is not stuck in a loading state
    await expect(page.locator('button:has-text("Processing...")')).not.toBeVisible();
  });
});