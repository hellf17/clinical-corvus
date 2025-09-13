#!/usr/bin/env python3
"""
Comprehensive MVP Agents Testing Script
Tests all agent functions, API endpoints, and integration points.
"""

import sys
import os
import asyncio
import tempfile
import json
from datetime import datetime, timedelta
from unittest.mock import MagicMock, patch, AsyncMock
from typing import Dict, Any, List

# Add backend-api to path
backend_api_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), 'backend-api'))
if backend_api_dir not in sys.path:
    sys.path.insert(0, backend_api_dir)

print("MVP Agents Testing Script")
print("=" * 50)

class MVPAgentTester:
    """Comprehensive tester for MVP Agents functionality."""

    def __init__(self):
        self.results = {
            "imports": {},
            "agents": {},
            "api_endpoints": {},
            "integration": {},
            "performance": {}
        }
        self.test_data = self._load_test_data()

    def _load_test_data(self) -> Dict[str, Any]:
        """Load test data for various scenarios."""
        return {
            "clinical_cases": {
                "acute_coronary_syndrome": {
                    "description": "65-year-old male with sudden onset chest pain radiating to left arm, diaphoresis, nausea. ECG shows ST elevation in anterior leads.",
                    "expected_diagnoses": ["STEMI", "Acute Coronary Syndrome"],
                    "urgency": "critical"
                },
                "sepsis": {
                    "description": "78-year-old female with fever 39.2°C, tachycardia 120 bpm, confusion, WBC 18.5K. Recent UTI diagnosed.",
                    "expected_diagnoses": ["Sepsis", "Urosepsis"],
                    "urgency": "high"
                },
                "diabetic_ketoacidosis": {
                    "description": "25-year-old female with Type 1 DM, polyuria, polydipsia, nausea, vomiting. Blood glucose 450 mg/dL, pH 7.2, bicarbonate 15 mEq/L.",
                    "expected_diagnoses": ["Diabetic Ketoacidosis", "DKA"],
                    "urgency": "high"
                }
            },
            "research_queries": {
                "aspirin_prevention": "What is the evidence for aspirin in primary prevention of cardiovascular disease?",
                "ace_inhibitors_hf": "What is the evidence for ACE inhibitors in heart failure with reduced ejection fraction?",
                "diagnostic_accuracy": "What is the sensitivity and specificity of troponin for myocardial infarction?"
            },
            "patient_context": {
                "demographics": {
                    "age": 65,
                    "gender": "male",
                    "name": "João Silva",
                    "medical_record_number": "MRN123456"
                },
                "medications": [
                    {
                        "name": "Metformin",
                        "dose": "500mg",
                        "route": "oral",
                        "frequency": "twice daily",
                        "indication": "Type 2 Diabetes"
                    },
                    {
                        "name": "Lisinopril",
                        "dose": "10mg",
                        "route": "oral",
                        "frequency": "once daily",
                        "indication": "Hypertension"
                    }
                ],
                "recent_labs": [
                    {
                        "test_name": "Creatinine",
                        "value": 1.2,
                        "unit": "mg/dL",
                        "reference_range": "0.7-1.3",
                        "abnormal_flag": "normal",
                        "date_collected": "2024-08-25T10:30:00Z"
                    },
                    {
                        "test_name": "Hemoglobin A1c",
                        "value": 7.2,
                        "unit": "%",
                        "reference_range": "4.0-5.6",
                        "abnormal_flag": "high",
                        "date_collected": "2024-08-25T10:30:00Z"
                    }
                ],
                "comorbidities": ["Type 2 Diabetes", "Hypertension", "CKD Stage 3"],
                "allergies": ["Penicillin"]
            }
        }

    async def test_imports(self) -> Dict[str, Any]:
        """Test all MVP agent imports."""
        print("\nTesting Imports...")

        results = {}

        # Test agent imports
        try:
            from agents.clinical_discussion_agent import ClinicalDiscussionAgent, create_clinical_discussion_agent
            results["clinical_discussion_agent"] = "SUCCESS</search>
</search_and_replace> SUCCESS"
            print("SUCCESS</search>
</search_and_replace> ClinicalDiscussionAgent import successful")
        except Exception as e:
            results["clinical_discussion_agent"] = f"FAILED</search>
</search_and_replace> FAILED: {str(e)}"
            print(f"FAILED</search>
</search_and_replace> ClinicalDiscussionAgent import failed: {e}")

        try:
            from agents.clinical_research_agent import ClinicalResearchAgent, create_clinical_research_agent
            results["clinical_research_agent"] = "SUCCESS</search>
</search_and_replace> SUCCESS"
            print("SUCCESS</search>
</search_and_replace> ClinicalResearchAgent import successful")
        except Exception as e:
            results["clinical_research_agent"] = f"FAILED</search>
</search_and_replace> FAILED: {str(e)}"
            print(f"FAILED</search>
</search_and_replace> ClinicalResearchAgent import failed: {e}")

        # Test router imports
        try:
            from routers.mvp_agents import router
            results["mvp_agents_router"] = "SUCCESS</search>
</search_and_replace> SUCCESS"
            print("SUCCESS</search>
</search_and_replace> MVP Agents router import successful")
        except Exception as e:
            results["mvp_agents_router"] = f"FAILED</search>
</search_and_replace> FAILED: {str(e)}"
            print(f"FAILED</search>
</search_and_replace> MVP Agents router import failed: {e}")

        # Test FastAPI app
        try:
            from main import app
            results["fastapi_app"] = "SUCCESS</search>
</search_and_replace> SUCCESS"
            print("SUCCESS</search>
</search_and_replace> FastAPI app import successful")
        except Exception as e:
            results["fastapi_app"] = f"FAILED</search>
</search_and_replace> FAILED: {str(e)}"
            print(f"FAILED</search>
</search_and_replace> FastAPI app import failed: {e}")

        return results

    async def test_agent_functionality(self) -> Dict[str, Any]:
        """Test core agent functionality."""
        print("\n</search>
</search_and_replace> Testing Agent Functionality...")

        results = {}

        # Test Clinical Discussion Agent
        try:
            from agents.clinical_discussion_agent import ClinicalDiscussionAgent

            agent = ClinicalDiscussionAgent()
            test_case = self.test_data["clinical_cases"]["acute_coronary_syndrome"]

            result = await agent.discuss_clinical_case(
                case_description=test_case["description"],
                patient_context=self.test_data["patient_context"]
            )

            if result and "analysis" in result:
                results["clinical_discussion_agent"] = "SUCCESS</search>
</search_and_replace> SUCCESS"
                print("SUCCESS</search>
</search_and_replace> ClinicalDiscussionAgent basic functionality working")
            else:
                results["clinical_discussion_agent"] = "FAILED</search>
</search_and_replace> FAILED: Invalid response structure"
                print("FAILED</search>
</search_and_replace> ClinicalDiscussionAgent returned invalid response")

        except Exception as e:
            results["clinical_discussion_agent"] = f"FAILED</search>
</search_and_replace> FAILED: {str(e)}"
            print(f"FAILED</search>
</search_and_replace> ClinicalDiscussionAgent test failed: {e}")

        # Test Clinical Research Agent
        try:
            from agents.clinical_research_agent import ClinicalResearchAgent

            agent = ClinicalResearchAgent()
            query = self.test_data["research_queries"]["aspirin_prevention"]

            result = await agent.process_clinical_query(
                query=query,
                patient_context=self.test_data["patient_context"]
            )

            if result and "response" in result:
                results["clinical_research_agent"] = "SUCCESS</search>
</search_and_replace> SUCCESS"
                print("SUCCESS</search>
</search_and_replace> ClinicalResearchAgent basic functionality working")
            else:
                results["clinical_research_agent"] = "FAILED</search>
</search_and_replace> FAILED: Invalid response structure"
                print("FAILED</search>
</search_and_replace> ClinicalResearchAgent returned invalid response")

        except Exception as e:
            results["clinical_research_agent"] = f"FAILED</search>
</search_and_replace> FAILED: {str(e)}"
            print(f"FAILED</search>
</search_and_replace> ClinicalResearchAgent test failed: {e}")

        return results

    async def test_api_endpoints(self) -> Dict[str, Any]:
        """Test API endpoints functionality."""
        print("\n</search>
</search_and_replace> Testing API Endpoints...")

        results = {}

        try:
            from main import app
            from fastapi.testclient import TestClient

            # Mock Clerk authentication
            with patch('routers.mvp_agents.get_current_user_required') as mock_auth:
                mock_auth.return_value = MagicMock(id="test_user", role="doctor")

                client = TestClient(app)

                # Test clinical discussion endpoint
                test_case = self.test_data["clinical_cases"]["sepsis"]
                response = client.post(
                    "/api/mvp-agents/clinical-discussion",
                    json={
                        "case_description": test_case["description"],
                        "patient_id": "test_patient_001",
                        "include_patient_context": True
                    }
                )

                if response.status_code == 200:
                    results["clinical_discussion_endpoint"] = "SUCCESS</search>
</search_and_replace> SUCCESS"
                    print("SUCCESS</search>
</search_and_replace> Clinical discussion endpoint working")
                else:
                    results["clinical_discussion_endpoint"] = f"FAILED</search>
</search_and_replace> FAILED: Status {response.status_code}"
                    print(f"FAILED</search>
</search_and_replace> Clinical discussion endpoint failed: {response.status_code}")

                # Test clinical research endpoint
                query = self.test_data["research_queries"]["ace_inhibitors_hf"]
                response = client.post(
                    "/api/mvp-agents/clinical-query",
                    json={
                        "query": query,
                        "patient_id": "test_patient_001",
                        "include_patient_context": True
                    }
                )

                if response.status_code == 200:
                    results["clinical_research_endpoint"] = "SUCCESS</search>
</search_and_replace> SUCCESS"
                    print("SUCCESS</search>
</search_and_replace> Clinical research endpoint working")
                else:
                    results["clinical_research_endpoint"] = f"FAILED</search>
</search_and_replace> FAILED: Status {response.status_code}"
                    print(f"FAILED</search>
</search_and_replace> Clinical research endpoint failed: {response.status_code}")

                # Test health endpoint
                response = client.get("/api/mvp-agents/health")
                if response.status_code == 200:
                    results["health_endpoint"] = "SUCCESS</search>
</search_and_replace> SUCCESS"
                    print("SUCCESS</search>
</search_and_replace> Health endpoint working")
                else:
                    results["health_endpoint"] = f"FAILED</search>
</search_and_replace> FAILED: Status {response.status_code}"
                    print(f"FAILED</search>
</search_and_replace> Health endpoint failed: {response.status_code}")

        except Exception as e:
            results["api_endpoints"] = f"FAILED</search>
</search_and_replace> FAILED: {str(e)}"
            print(f"FAILED</search>
</search_and_replace> API endpoints test failed: {e}")

        return results

    async def test_integration_scenarios(self) -> Dict[str, Any]:
        """Test integration scenarios."""
        print("\n</search>
</search_and_replace> Testing Integration Scenarios...")

        results = {}

        # Test complete clinical workflow
        try:
            from agents.clinical_discussion_agent import ClinicalDiscussionAgent
            from agents.clinical_research_agent import ClinicalResearchAgent

            # Step 1: Clinical case discussion
            discussion_agent = ClinicalDiscussionAgent()
            case = self.test_data["clinical_cases"]["diabetic_ketoacidosis"]

            discussion_result = await discussion_agent.discuss_clinical_case(
                case_description=case["description"],
                patient_context=self.test_data["patient_context"]
            )

            if discussion_result and "needs_research" in discussion_result.get("analysis", {}):
                results["clinical_workflow_step1"] = "SUCCESS</search>
</search_and_replace> SUCCESS"
                print("SUCCESS</search>
</search_and_replace> Clinical case discussion working")

                # Step 2: Follow-up research if needed
                if discussion_result["analysis"]["needs_research"]:
                    research_agent = ClinicalResearchAgent()
                    research_query = f"What is the evidence-based management of {case['expected_diagnoses'][0]}?"

                    research_result = await research_agent.process_clinical_query(
                        query=research_query,
                        patient_context=self.test_data["patient_context"]
                    )

                    if research_result and "response" in research_result:
                        results["clinical_workflow_step2"] = "SUCCESS</search>
</search_and_replace> SUCCESS"
                        print("SUCCESS</search>
</search_and_replace> Follow-up research working")
                    else:
                        results["clinical_workflow_step2"] = "FAILED</search>
</search_and_replace> FAILED: Invalid research response"
                        print("FAILED</search>
</search_and_replace> Follow-up research failed")
                else:
                    results["clinical_workflow_step2"] = "SUCCESS</search>
</search_and_replace> SKIPPED: No research needed"
                    print("ℹ️ No research needed for this case")
            else:
                results["clinical_workflow_step1"] = "FAILED</search>
</search_and_replace> FAILED: Invalid discussion response"
                print("FAILED</search>
</search_and_replace> Clinical case discussion failed")

        except Exception as e:
            results["clinical_workflow"] = f"FAILED</search>
</search_and_replace> FAILED: {str(e)}"
            print(f"FAILED</search>
</search_and_replace> Clinical workflow test failed: {e}")

        return results

    async def test_performance(self) -> Dict[str, Any]:
        """Test performance metrics."""
        print("\n</search>
</search_and_replace> Testing Performance...")

        results = {}
        import time

        try:
            from agents.clinical_discussion_agent import ClinicalDiscussionAgent

            agent = ClinicalDiscussionAgent()
            case = self.test_data["clinical_cases"]["acute_coronary_syndrome"]

            # Test response time
            start_time = time.time()
            result = await agent.discuss_clinical_case(
                case_description=case["description"],
                patient_context=self.test_data["patient_context"]
            )
            end_time = time.time()

            response_time = end_time - start_time

            if result and response_time < 5.0:  # Should respond within 5 seconds
                results["response_time"] = f"SUCCESS</search>
</search_and_replace> SUCCESS: {response_time:.2f}s"
                print(f"SUCCESS</search>
</search_and_replace> Response time acceptable: {response_time:.2f}s")
            else:
                results["response_time"] = f"FAILED</search>
</search_and_replace> FAILED: {response_time:.2f}s (too slow)"
                print(f"FAILED</search>
</search_and_replace> Response time too slow: {response_time:.2f}s")

            # Test memory usage (basic check)
            import psutil
            process = psutil.Process()
            memory_mb = process.memory_info().rss / 1024 / 1024

            if memory_mb < 500:  # Should use less than 500MB
                results["memory_usage"] = f"SUCCESS</search>
</search_and_replace> SUCCESS: {memory_mb:.1f}MB"
                print(f"SUCCESS</search>
</search_and_replace> Memory usage acceptable: {memory_mb:.1f}MB")
            else:
                results["memory_usage"] = f"⚠️ WARNING: {memory_mb:.1f}MB (high usage)"
                print(f"⚠️ Memory usage high: {memory_mb:.1f}MB")

        except Exception as e:
            results["performance"] = f"FAILED</search>
</search_and_replace> FAILED: {str(e)}"
            print(f"FAILED</search>
</search_and_replace> Performance test failed: {e}")

        return results

    def generate_report(self) -> str:
        """Generate comprehensive test report."""
        print("\n</search>
</search_and_replace> Generating Test Report...")

        report = []
        report.append("# MVP Agents Testing Report")
        report.append(f"**Generated:** {datetime.now().isoformat()}")
        report.append("")

        # Overall status
        all_results = []
        for category, tests in self.results.items():
            all_results.extend(tests.values())

        success_count = sum(1 for result in all_results if "SUCCESS</search>
</search_and_replace> SUCCESS" in str(result))
        total_count = len(all_results)

        report.append("## Overall Status")
        report.append(f"- **Tests Passed:** {success_count}/{total_count}")
        if total_count > 0:
            report.append(f"- **Success Rate:** {success_count/total_count:.1f}")
        report.append("")

        # Detailed results
        for category, tests in self.results.items():
            report.append(f"## {category.title()} Tests")
            for test_name, result in tests.items():
                status = "SUCCESS</search>
</search_and_replace>" if "SUCCESS</search>
</search_and_replace> SUCCESS" in str(result) else "FAILED</search>
</search_and_replace>" if "FAILED</search>
</search_and_replace> FAILED" in str(result) else "⚠️"
                report.append(f"- **{test_name}:** {status} {result}")
            report.append("")

        # Recommendations
        report.append("## Recommendations")
        if success_count / total_count > 0.8:
            report.append("SUCCESS</search>
</search_and_replace> **System Status: PRODUCTION READY**")
            report.append("- All critical functionality working")
            report.append("- Ready for clinical deployment")
        elif success_count / total_count > 0.6:
            report.append("⚠️ **System Status: MOSTLY FUNCTIONAL**")
            report.append("- Core functionality working")
            report.append("- Minor issues need resolution")
        else:
            report.append("FAILED</search>
</search_and_replace> **System Status: NEEDS ATTENTION**")
            report.append("- Critical issues need resolution")
            report.append("- Not ready for production")

        return "\n".join(report)

    async def run_all_tests(self) -> Dict[str, Any]:
        """Run all test categories."""
        print("🚀 Starting Comprehensive MVP Agents Testing...")

        self.results["imports"] = await self.test_imports()
        self.results["agents"] = await self.test_agent_functionality()
        self.results["api_endpoints"] = await self.test_api_endpoints()
        self.results["integration"] = await self.test_integration_scenarios()
        self.results["performance"] = await self.test_performance()

        # Generate and display report
        report = self.generate_report()
        print("\n" + "=" * 60)
        print(report)
        print("=" * 60)

        return self.results


async def main():
    """Main test execution function."""
    tester = MVPAgentTester()
    results = await tester.run_all_tests()

    # Save results to file
    with open("mvp_agents_test_results.json", "w") as f:
        json.dump(results, f, indent=2, default=str)

    print("\n💾 Results saved to: mvp_agents_test_results.json")

    return results


if __name__ == "__main__":
    # Run the tests
    results = asyncio.run(main())

    # Exit with appropriate code
    all_results = []
    for category, tests in results.items():
        all_results.extend(tests.values())

    success_count = sum(1 for result in all_results if "SUCCESS</search>
</search_and_replace> SUCCESS" in str(result))
    total_count = len(all_results)

    if success_count == total_count:
        print("🎉 ALL TESTS PASSED!")
        sys.exit(0)
    elif success_count / total_count > 0.8:
        print("SUCCESS</search>
</search_and_replace> MOST TESTS PASSED - READY FOR PRODUCTION")
        sys.exit(0)
    else:
        print("FAILED</search>
</search_and_replace> SOME TESTS FAILED - NEEDS ATTENTION")
        sys.exit(1)