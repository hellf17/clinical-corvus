import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

VALID_PAYLOAD = {
    "case_summary_by_user": "Paciente de 60 anos com dor torácica e dispneia.",
    "reasoning_steps": [
        "Paciente apresenta fatores de risco cardiovascular.",
        "Dor torácica sugere possível síndrome coronariana."
    ],
    "user_identified_biases": ["ANCHORING", "AVAILABILITY"]
}

INVALID_PAYLOAD = {
    # Missing required fields
    "case_summary_by_user": "Paciente de 60 anos com dor torácica e dispneia."
}

@pytest.mark.parametrize("endpoint, valid_payload, invalid_payload, required_fields", [
    ("/api/clinical/provide-self-reflection-feedback", VALID_PAYLOAD, INVALID_PAYLOAD, [
        "identified_reasoning_pattern",
        "bias_reflection_points",
        "devils_advocate_challenge",
        "suggested_next_reflective_action"
    ]),
    ("/api/clinical/analyze-cognitive-bias", VALID_PAYLOAD, INVALID_PAYLOAD, [
        "potential_biases_to_consider"
    ]),
])
def test_reflection_endpoints_always_return_valid_json(endpoint, valid_payload, invalid_payload, required_fields):
    # Test valid payload
    response = client.post(endpoint, json=valid_payload)
    assert response.headers["content-type"].startswith("application/json"), f"Expected JSON, got {response.headers['content-type']}"
    assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    data = response.json()
    for field in required_fields:
        assert field in data, f"Missing required field: {field}"

    # Test invalid payload (should return JSON error, not HTML)
    response = client.post(endpoint, json=invalid_payload)
    assert response.headers["content-type"].startswith("application/json"), f"Expected JSON error, got {response.headers['content-type']}"
    assert response.status_code in [400, 422, 500], f"Expected error status, got {response.status_code}"
    # Should not be HTML
    assert not response.text.strip().startswith("<"), f"Error response should not be HTML: {response.text[:100]}"
    # Should be valid JSON or contain a JSON error message
    try:
        err_data = response.json()
        assert "detail" in err_data or isinstance(err_data, dict), "Error JSON should have 'detail' or be a dict"
    except Exception:
        pytest.fail(f"Error response is not valid JSON: {response.text}")
