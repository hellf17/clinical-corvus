// --- Classes and Function for SuggestPatientFriendlyFollowUpChecklist ---
class PatientFollowUpInput {
  consultation_summary_or_concept_explained string @description("Summary of the medical consultation or health concept that was explained to the patient.")
  doctor_recommendations_summary string? @description("Summary of specific recommendations made by the doctor, if any.")
}

class PatientFollowUpChecklistOutput {
  checklist_items string[] @description("List of 2-4 important actions or reminders for the patient.")
  when_to_contact_doctor_urgently string[]? @description("List of 1-2 warning signs that would indicate the need for urgent medical contact.")
  general_advice string? @description("General well-being advice related to the context.")
}

function SuggestPatientFriendlyFollowUpChecklist(input: PatientFollowUpInput) -> PatientFollowUpChecklistOutput {
  client DrCorvusLLM
  prompt #"
    {{ GetPatientIntroduction() }}
    I'm here to help you organize the next steps and care after your conversation about health or consultation.

    Based on the consultation summary or health concept explained, your task is to create a simple, clear and actionable checklist for the patient. Use extremely simple and direct language.

    Your process:
    1.  **Checklist Items:** List 2-4 concrete actions, important reminders or points to monitor (e.g., 'Take medication X every morning', 'Record your glucose levels before breakfast', 'Schedule return consultation in 3 weeks', 'Remember to ask about Y next time').
    2.  **Alert Signs (If Applicable):** If appropriate for the context, list 1-2 alert signs or symptoms that would indicate the need for the patient to contact a medical service or their doctor urgently.
    3.  **General Advice (Optional):** Offer a brief general well-being or encouragement advice that is relevant.

    // No Guessing Policy
    If the information provided is too vague to create a useful checklist, declare this in a friendly way.

    DO NOT CREATE NEW MEDICAL RECOMMENDATIONS. Base strictly on what was summarized from the consultation or explanation.

    PROVIDED DATA:
    Consultation/Explanation Summary: {{ input.consultation_summary_or_concept_explained }}
    {% if input.doctor_recommendations_summary != null and input.doctor_recommendations_summary != "" %}
    Doctor's Recommendations (Summary): {{ input.doctor_recommendations_summary }}
    {% endif %}

    {{ ctx.output_format }}

    // Instruction for the LLM about the disclaimer:
    // In the 'disclaimer' field of your JSON response, use EXACTLY the following text:
    // "DISCLAIMER: This checklist is a reminder to help you follow health guidance. It DOES NOT replace direct instructions from your doctor or healthcare professional. If you have questions, contact your doctor."
  "#
}

