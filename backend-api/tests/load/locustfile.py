import random
from locust import HttpUser, task, between

class MvpAgentUser(HttpUser):
    wait_time = between(1, 5)  # Wait time between tasks

    def on_start(self):
        """
        Simulate user login and get an auth token.
        For a real test, this would involve a proper login flow.
        """
        # In a real scenario, you would perform a login and store the token.
        # For this example, we'll assume a static token for a test user.
        self.headers = {"Authorization": "Bearer test_token"}

    @task(1)
    def clinical_research(self):
        queries = [
            "What is the evidence for aspirin in primary prevention?",
            "Latest treatments for Alzheimer's disease",
            "ACE inhibitors vs ARBs in heart failure"
        ]
        self.client.post(
            "/api/mvp-agents/clinical-research",
            headers=self.headers,
            json={"query": random.choice(queries), "patient_id": "patient123"}
        )

    @task(2)
    def clinical_discussion(self):
        case_descriptions = [
            "65-year-old male with new onset chest pain.",
            "Patient with fever and cough, suspect pneumonia.",
            "Discuss differential diagnosis for a patient with abdominal pain."
        ]
        self.client.post(
            "/api/mvp-agents/clinical-discussion",
            headers=self.headers,
            json={"case_description": random.choice(case_descriptions), "patient_id": "patient456"}
        )

    @task(3)
    def clinical_query(self):
        queries = [
            "Tell me about hypertension.",
            "What are the symptoms of a heart attack?",
            "How to manage diabetes type 2?"
        ]
        self.client.post(
            "/api/mvp-agents/clinical-query",
            headers=self.headers,
            json={"query": random.choice(queries)}
        )

    @task(1)
    def health_check(self):
        self.client.get("/api/mvp-agents/health", headers=self.headers)