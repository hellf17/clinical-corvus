"""
Integration tests for the full evidence analysis pipeline.
"""

import pytest
import sys
import os
from fastapi.testclient import TestClient

# Add parent directory to sys.path
if os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))) not in sys.path:
    sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from database import models
from security import create_access_token
from tests.test_settings import get_test_settings

test_settings = get_test_settings()

def create_test_token(user_id, email, name):
    """Create a test JWT token for a specific user."""
    from datetime import timedelta
    access_token_expires = timedelta(minutes=30)
    access_token = create_access_token(
        data={
            "sub": email,
            "user_id": user_id,
            "name": name
        },
        expires_delta=access_token_expires
    )
    return {"Authorization": f"Bearer {access_token}"}

@pytest.mark.integration
def test_unified_evidence_analysis_pipeline(pg_client: TestClient, pg_session):
    """
    Test the full unified_evidence_analysis endpoint to ensure it returns a complete
    and valid GradeEvidenceAppraisalOutput without validation errors.
    """
    # Create a test user
    user = models.User(
        email="evidence_pipeline_test@example.com",
        name="Evidence Pipeline Test User",
        role="doctor"
    )
    pg_session.add(user)
    pg_session.commit()
    pg_session.refresh(user)

    # Create auth token for this specific user
    auth_headers = create_test_token(user.user_id, user.email, user.name)

    # Sample medical paper abstract
    paper_text = ("""
    Background: Sepsis is a life-threatening condition. Early goal-directed therapy (EGDT) has been a cornerstone of sepsis management.
    Objective: This randomized controlled trial (RCT) aimed to evaluate the efficacy of a modified EGDT protocol compared to standard care in patients with septic shock.
    Methods: We enrolled 200 adult patients diagnosed with septic shock in the emergency department. Patients were randomized to either the EGDT group (n=100) or the standard care group (n=100). The primary outcome was 28-day mortality. The study was conducted at a single tertiary care center.
    Results: The 28-day mortality was 25% in the EGDT group and 30% in the standard care group (p=0.45). There were no significant differences in secondary outcomes, including length of hospital stay and duration of vasopressor use. The sample size was calculated to provide 80% power to detect a 15% absolute risk reduction.
    Conclusion: In this single-center RCT, a modified EGDT protocol did not result in a significant reduction in 28-day mortality compared to standard care for patients with septic shock.
    Limitations: The study's single-center design and the lower-than-expected mortality rate in the standard care arm may limit the generalizability of the findings.
    """)

    request_data = {
        "paper_full_text": paper_text,
        "clinical_question_PICO": "In adult patients with septic shock (P), is a modified EGDT protocol (I) more effective than standard care (C) in reducing 28-day mortality (O)?"
    }

    # Make the API call to the pipeline endpoint
    # Note: The router is mounted under /api/clinical, so the full path is /api/clinical/unified-evidence-analysis
    response = pg_client.post(
        "/api/clinical/unified-evidence-analysis",
        json=request_data,
        headers=auth_headers
    )

    # Verify the response
    assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"

    response_json = response.json()

    # Assert that the final output structure is complete and has the expected fields
    assert "overall_quality" in response_json
    assert "quality_reasoning" in response_json
    assert "recommendation_strength" in response_json
    assert "strength_reasoning" in response_json
    assert "quality_factors" in response_json and isinstance(response_json["quality_factors"], list)
    assert "bias_analysis" in response_json and isinstance(response_json["bias_analysis"], dict)
    assert "practice_recommendations" in response_json and isinstance(response_json["practice_recommendations"], list)

    # Assert nested structures are not empty
    assert len(response_json["quality_factors"]) > 0
    assert "selection_bias" in response_json["bias_analysis"]
    assert len(response_json["practice_recommendations"]) > 0

    print("\n✅ Unified evidence analysis pipeline test passed successfully.")
    print(f"Overall Quality: {response_json.get('overall_quality')}")
    print(f"Recommendation Strength: {response_json.get('recommendation_strength')}")
