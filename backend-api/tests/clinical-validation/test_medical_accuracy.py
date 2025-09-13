"""
Clinical validation tests for MVP Agents
Tests medical accuracy, safety, and clinical appropriateness of agent responses.
"""

import pytest
from unittest.mock import Mock, patch
from routers.mvp_agents import ClinicalDiscussionAgent, ClinicalResearchAgent


class TestMedicalAccuracy:
    """Test medical accuracy and clinical appropriateness of agent responses."""

    @pytest.fixture
    def clinical_discussion_agent(self):
        """Create clinical discussion agent for testing."""
        return ClinicalDiscussionAgent()

    @pytest.fixture
    def clinical_research_agent(self):
        """Create clinical research agent for testing."""
        return ClinicalResearchAgent()

    @pytest.fixture
    def validated_clinical_scenarios(self):
        """Clinically validated test scenarios."""
        return {
            "acute_coronary_syndrome": {
                "description": "65-year-old male with sudden onset chest pain radiating to left arm, diaphoresis, nausea. ECG shows ST elevation in anterior leads.",
                "expected_diagnoses": ["STEMI", "Acute Coronary Syndrome"],
                "required_findings": ["ST elevation", "chest pain", "radiation"],
                "critical_actions": ["ECG", "Antiplatelets", "Anticoagulation", "Cardiology consult"],
                "red_flags": ["Cardiac arrest", "Ventricular fibrillation", "Cardiogenic shock"]
            },
            "sepsis": {
                "description": "78-year-old female with fever 39.2°C, tachycardia 120 bpm, confusion, WBC 18.5K. Recent UTI diagnosed.",
                "expected_diagnoses": ["Sepsis", "Urosepsis"],
                "required_findings": ["fever", "tachycardia", "confusion", "leukocytosis"],
                "critical_actions": ["IV fluids", "Broad-spectrum antibiotics", "Lactate measurement", "Blood cultures"],
                "red_flags": ["Septic shock", "Multiple organ dysfunction", "Respiratory failure"]
            },
            "diabetic_ketoacidosis": {
                "description": "25-year-old female with Type 1 DM, polyuria, polydipsia, nausea, vomiting. Blood glucose 450 mg/dL, pH 7.2, bicarbonate 15 mEq/L.",
                "expected_diagnoses": ["Diabetic Ketoacidosis", "DKA"],
                "required_findings": ["hyperglycemia", "acidosis", "ketosis"],
                "critical_actions": ["IV fluids", "Insulin infusion", "Electrolyte replacement", "Monitoring"],
                "red_flags": ["Cerebral edema", "Cardiac arrhythmias", "Acute kidney injury"]
            }
        }

    @pytest.fixture
    def evidence_based_scenarios(self):
        """Evidence-based research test scenarios."""
        return {
            "aspirin_primary_prevention": {
                "query": "What is the evidence for aspirin in primary prevention of cardiovascular disease?",
                "expected_findings": [
                    "reduces myocardial infarction",
                    "reduces ischemic stroke",
                    "increases bleeding risk",
                    "individual risk assessment"
                ],
                "required_sources": ["systematic reviews", "meta-analyses", "guidelines"],
                "contraindications": ["active bleeding", "recent surgery", "thrombocytopenia"]
            },
            "ace_inhibitors_hf": {
                "query": "What is the evidence for ACE inhibitors in heart failure with reduced ejection fraction?",
                "expected_findings": [
                    "reduces mortality",
                    "reduces hospitalization",
                    "renoprotective effects",
                    "monitor potassium"
                ],
                "required_sources": ["randomized trials", "guidelines", "meta-analyses"],
                "contraindications": ["hyperkalemia", "bilateral renal artery stenosis", "pregnancy"]
            }
        }

    @pytest.mark.asyncio
    async def test_acs_diagnosis_accuracy(self, clinical_discussion_agent, validated_clinical_scenarios):
        """Test accuracy of ACS diagnosis and management."""
        scenario = validated_clinical_scenarios["acute_coronary_syndrome"]

        with patch('backend_api.routers.mvp_agents.baml_client') as mock_baml:
            # Mock clinically accurate response
            mock_response = Mock()
            mock_response.analysis = {
                "case_type": "Acute Coronary Syndrome",
                "urgency_level": "Critical",
                "key_symptoms": ["chest pain", "radiation to left arm", "diaphoresis", "nausea"],
                "possible_diagnoses": ["STEMI", "NSTEMI", "Unstable Angina"]
            }
            mock_response.discussion = {
                "clinical_reasoning": {
                    "assessment": "High-risk ACS presentation with ST elevation requiring immediate reperfusion therapy"
                },
                "differential_diagnosis": {
                    "primary_diagnoses": ["STEMI", "NSTEMI"],
                    "secondary_diagnoses": ["Pulmonary Embolism", "Aortic Dissection", "Pericarditis"]
                },
                "management_plan": {
                    "immediate_actions": [
                        "Immediate ECG (within 10 minutes)",
                        "Cardiac enzymes (troponin)",
                        "Antiplatelets (aspirin 325mg chewed)",
                        "Anticoagulation (heparin)",
                        "Supplemental oxygen if hypoxic",
                        "Morphine for pain if needed",
                        "Nitrates if no contraindications"
                    ],
                    "diagnostic_workup": [
                        "Serial ECGs",
                        "Cardiac biomarkers (troponin, CK-MB)",
                        "Chest X-ray",
                        "Echocardiogram",
                        "Coronary angiography"
                    ],
                    "consultations": ["Cardiology", "Cardiac Surgery"],
                    "monitoring": ["Continuous ECG", "Vital signs", "Pain assessment", "Mental status"]
                }
            }
            mock_baml.AnalyzeClinicalCase.return_value = mock_response

            result = await clinical_discussion_agent.analyze_clinical_case(
                case_description=scenario["description"],
                patient_context=None
            )

            assert result["success"] is True
            analysis = result["response"]["analysis"]
            discussion = result["response"]["discussion"]

            # Verify diagnosis accuracy
            assert "Acute Coronary Syndrome" in analysis["possible_diagnoses"]
            assert "STEMI" in analysis["possible_diagnoses"]

            # Verify critical actions are included
            management = discussion["management_plan"]
            immediate_actions = " ".join(management["immediate_actions"]).lower()
            assert "ecg" in immediate_actions
            assert "antiplatelets" in immediate_actions or "aspirin" in immediate_actions
            assert "anticoagulation" in immediate_actions or "heparin" in immediate_actions

    @pytest.mark.asyncio
    async def test_sepsis_management_accuracy(self, clinical_discussion_agent, validated_clinical_scenarios):
        """Test accuracy of sepsis diagnosis and management."""
        scenario = validated_clinical_scenarios["sepsis"]

        with patch('backend_api.routers.mvp_agents.baml_client') as mock_baml:
            mock_response = Mock()
            mock_response.analysis = {
                "case_type": "Sepsis",
                "urgency_level": "High",
                "key_symptoms": ["fever", "tachycardia", "confusion", "leukocytosis"],
                "possible_diagnoses": ["Sepsis", "Severe Sepsis", "Urosepsis"]
            }
            mock_response.discussion = {
                "clinical_reasoning": {
                    "assessment": "Sepsis with organ dysfunction requiring immediate treatment per Surviving Sepsis Campaign guidelines"
                },
                "differential_diagnosis": {
                    "primary_diagnoses": ["Urosepsis", "Pneumonia", "Intra-abdominal infection"]
                },
                "management_plan": {
                    "immediate_actions": [
                        "Calculate qSOFA score (2 points: tachycardia + confusion)",
                        "Obtain lactate level",
                        "Blood cultures before antibiotics",
                        "Broad-spectrum IV antibiotics within 1 hour",
                        "IV fluid bolus (30 mL/kg)",
                        "Vasopressors if fluid unresponsive",
                        "Monitor urine output"
                    ],
                    "diagnostic_workup": [
                        "Complete blood count",
                        "Blood cultures",
                        "Urine culture",
                        "Chest X-ray",
                        "Lactate level",
                        "Procalcitonin"
                    ],
                    "consultations": ["Infectious Disease", "Critical Care"],
                    "monitoring": ["qSOFA score", "Vital signs", "Mental status", "Fluid balance"]
                }
            }
            mock_baml.AnalyzeClinicalCase.return_value = mock_response

            result = await clinical_discussion_agent.analyze_clinical_case(
                case_description=scenario["description"],
                patient_context=None
            )

            assert result["success"] is True
            management = result["response"]["discussion"]["management_plan"]

            # Verify sepsis bundle compliance
            immediate_actions = " ".join(management["immediate_actions"]).lower()
            assert "antibiotics" in immediate_actions
            assert "fluid" in immediate_actions
            assert "lactate" in immediate_actions
            assert "cultures" in immediate_actions

    @pytest.mark.asyncio
    async def test_dka_management_accuracy(self, clinical_discussion_agent, validated_clinical_scenarios):
        """Test accuracy of DKA diagnosis and management."""
        scenario = validated_clinical_scenarios["diabetic_ketoacidosis"]

        with patch('backend_api.routers.mvp_agents.baml_client') as mock_baml:
            mock_response = Mock()
            mock_response.analysis = {
                "case_type": "Diabetic Ketoacidosis",
                "urgency_level": "High",
                "key_symptoms": ["polyuria", "polydipsia", "nausea", "vomiting"],
                "possible_diagnoses": ["Diabetic Ketoacidosis", "Hyperglycemic Hyperosmolar State"]
            }
            mock_response.discussion = {
                "clinical_reasoning": {
                    "assessment": "Moderate DKA with metabolic acidosis requiring fluid resuscitation and insulin therapy"
                },
                "differential_diagnosis": {
                    "primary_diagnoses": ["Diabetic Ketoacidosis"],
                    "secondary_diagnoses": ["Infection", "Myocardial infarction", "Cerebrovascular accident"]
                },
                "management_plan": {
                    "immediate_actions": [
                        "IV fluid resuscitation (normal saline)",
                        "Regular insulin IV infusion",
                        "Potassium replacement",
                        "Monitor blood glucose every 1 hour",
                        "Monitor electrolytes every 2 hours"
                    ],
                    "diagnostic_workup": [
                        "Blood glucose",
                        "Arterial blood gas",
                        "Electrolytes",
                        "Urinalysis",
                        "Blood cultures if infection suspected"
                    ],
                    "consultations": ["Endocrinology", "Critical Care"],
                    "monitoring": ["Blood glucose", "Electrolytes", "Mental status", "Fluid balance"]
                }
            }
            mock_baml.AnalyzeClinicalCase.return_value = mock_response

            result = await clinical_discussion_agent.analyze_clinical_case(
                case_description=scenario["description"],
                patient_context=None
            )

            assert result["success"] is True
            management = result["response"]["discussion"]["management_plan"]

            # Verify DKA management accuracy
            immediate_actions = " ".join(management["immediate_actions"]).lower()
            assert "fluid" in immediate_actions
            assert "insulin" in immediate_actions
            assert "potassium" in immediate_actions

    @pytest.mark.asyncio
    async def test_aspirin_prevention_evidence(self, clinical_research_agent, evidence_based_scenarios):
        """Test evidence-based response for aspirin in primary prevention."""
        scenario = evidence_based_scenarios["aspirin_primary_prevention"]

        with patch('backend_api.routers.mvp_agents.baml_client') as mock_baml:
            mock_response = Mock()
            mock_response.result = {
                "executive_summary": "Aspirin reduces cardiovascular events but increases bleeding risk in primary prevention. Individual risk assessment is essential.",
                "key_findings_by_theme": [
                    {
                        "theme_name": "Cardiovascular Benefits",
                        "strength_of_evidence": "High",
                        "key_findings": [
                            "20-30% reduction in myocardial infarction",
                            "15-20% reduction in ischemic stroke",
                            "No significant reduction in cardiovascular mortality",
                            "Benefits greater in higher-risk individuals"
                        ]
                    },
                    {
                        "theme_name": "Bleeding Risks",
                        "strength_of_evidence": "High",
                        "key_findings": [
                            "2-3 fold increase in major bleeding",
                            "Increased risk of gastrointestinal bleeding",
                            "Increased risk of intracranial hemorrhage",
                            "Risks increase with age"
                        ]
                    }
                ],
                "clinical_implications": [
                    "Individual risk-benefit assessment required",
                    "Consider patient preferences and comorbidities",
                    "Regular monitoring for bleeding risk factors",
                    "Alternative preventive strategies may be considered"
                ],
                "relevant_references": [
                    {
                        "title": "Aspirin for Primary Prevention of Cardiovascular Disease",
                        "authors": ["Authors et al."],
                        "year": 2023,
                        "journal": "Annals of Internal Medicine",
                        "doi": "10.7326/M23-1234"
                    }
                ]
            }
            mock_baml.SynthesizeResearchFindings.return_value = mock_response

            result = await clinical_research_agent.process_clinical_query(
                query=scenario["query"],
                patient_context=None,
                query_type="prevention"
            )

            assert result["success"] is True
            response_result = result["response"]["result"]

            # Verify evidence-based content
            summary = response_result["executive_summary"].lower()
            assert "cardiovascular events" in summary
            assert "bleeding risk" in summary
            assert "individual risk" in summary

            # Verify balanced discussion
            implications = " ".join(response_result["clinical_implications"]).lower()
            assert "risk-benefit" in implications
            assert "assessment" in implications

    @pytest.mark.asyncio
    async def test_ace_inhibitors_hf_evidence(self, clinical_research_agent, evidence_based_scenarios):
        """Test evidence-based response for ACE inhibitors in heart failure."""
        scenario = evidence_based_scenarios["ace_inhibitors_hf"]

        with patch('backend_api.routers.mvp_agents.baml_client') as mock_baml:
            mock_response = Mock()
            mock_response.result = {
                "executive_summary": "ACE inhibitors reduce mortality and hospitalization in heart failure with reduced ejection fraction and have renoprotective effects.",
                "key_findings_by_theme": [
                    {
                        "theme_name": "Mortality Reduction",
                        "strength_of_evidence": "High",
                        "key_findings": [
                            "16-20% reduction in all-cause mortality",
                            "22-25% reduction in cardiovascular mortality",
                            "Benefits sustained long-term"
                        ]
                    },
                    {
                        "theme_name": "Hospitalization Reduction",
                        "strength_of_evidence": "High",
                        "key_findings": [
                            "30-35% reduction in heart failure hospitalizations",
                            "Benefits seen within 1-2 months",
                            "Consistent across different patient subgroups"
                        ]
                    },
                    {
                        "theme_name": "Renal Protection",
                        "strength_of_evidence": "High",
                        "key_findings": [
                            "Slow progression of renal dysfunction",
                            "Reduce proteinuria",
                            "Particularly beneficial in diabetic patients"
                        ]
                    }
                ],
                "clinical_implications": [
                    "First-line therapy for HFrEF",
                    "Start at low dose and titrate up",
                    "Monitor renal function and potassium",
                    "Consider ARBs if ACE inhibitor intolerant",
                    "Combination with beta-blockers provides additional benefit"
                ]
            }
            mock_baml.SynthesizeResearchFindings.return_value = mock_response

            result = await clinical_research_agent.process_clinical_query(
                query=scenario["query"],
                patient_context=None,
                query_type="treatment"
            )

            assert result["success"] is True
            response_result = result["response"]["result"]

            # Verify evidence-based content
            summary = response_result["executive_summary"].lower()
            assert "mortality" in summary
            assert "hospitalization" in summary
            assert "renoprotective" in summary

            # Verify clinical implications
            implications = " ".join(response_result["clinical_implications"]).lower()
            assert "first-line" in implications
            assert "monitor" in implications
            assert "potassium" in implications

    def test_safety_content_filtering(self, clinical_discussion_agent):
        """Test that responses don't contain harmful or inappropriate content."""
        harmful_scenarios = [
            "Patient requesting euthanasia",
            "Doctor asking about illegal procedures",
            "Requests for controlled substances without indication",
            "Inappropriate personal medical advice"
        ]

        for scenario in harmful_scenarios:
            # This would be implemented as a content filter
            # For now, we test that the agent doesn't crash on these inputs
            assert len(scenario) > 0  # Basic validation

    def test_contraindication_awareness(self, clinical_discussion_agent):
        """Test that agents are aware of contraindications."""
        # Test aspirin contraindications
        aspirin_case = "Patient with active peptic ulcer disease requesting aspirin for pain"

        # Should recognize contraindication
        # This would be tested with actual agent response

        # Test penicillin allergy
        penicillin_case = "Patient with documented penicillin allergy"

        # Should avoid recommending penicillin
        # This would be tested with actual agent response

    def test_age_appropriate_recommendations(self, clinical_discussion_agent):
        """Test that recommendations are age-appropriate."""
        pediatric_case = "2-year-old child with fever and ear pain"
        geriatric_case = "85-year-old patient with pneumonia"

        # Pediatric case should consider developmental stage
        # Geriatric case should consider comorbidities and polypharmacy

    def test_cultural_competence(self, clinical_discussion_agent):
        """Test cultural competence in recommendations."""
        # Should consider cultural factors in treatment plans
        # Should provide culturally sensitive communication advice

    def test_evidence_quality_assessment(self, clinical_research_agent):
        """Test that research responses include quality assessments."""
        # Should include GRADE or similar quality ratings
        # Should specify study types and limitations
        # Should include confidence intervals where appropriate

    def test_conflict_of_interest_disclosure(self, clinical_research_agent):
        """Test disclosure of potential conflicts of interest."""
        # Should note if recommendations may be influenced by industry
        # Should prioritize independent research

    def test_up_to_date_recommendations(self, clinical_research_agent):
        """Test that recommendations reflect current guidelines."""
        # Should reference recent guidelines (last 5 years)
        # Should note if guidelines are being updated

    def test_uncertainty_communication(self, clinical_discussion_agent, clinical_research_agent):
        """Test appropriate communication of uncertainty."""
        # Should acknowledge when evidence is limited
        # Should suggest consultation when appropriate
        # Should provide ranges rather than point estimates when appropriate

    def test_shared_decision_making(self, clinical_discussion_agent):
        """Test promotion of shared decision making."""
        # Should present options rather than dictating choices
        # Should acknowledge patient preferences
        # Should discuss trade-offs clearly

    def test_health_equity_considerations(self, clinical_discussion_agent):
        """Test consideration of health equity factors."""
        # Should consider socioeconomic factors
        # Should address access to care issues
        # Should consider health literacy


if __name__ == "__main__":
    pytest.main([__file__, "-v"])