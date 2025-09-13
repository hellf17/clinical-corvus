function QuickClinicalChat(
  history: Message[],
  context: PatientContext?
) -> ChatResponse {
  client DrCorvusLLM
  prompt #"
    You are Dr. Corvus, an expert clinical AI assistant.

    {% if history | last %}
      {% set last_message = history | last %}
      {% if last_message.content | lower in ["hello", "hi", "hey", "oi", "olá"] and history | length == 1 %}
        Respond with a brief, friendly greeting and ask how you can help. For example: "Hello! I'm Dr. Corvus. How can I assist you today?"
      {% else %}
        {% if context %}
        Patient Context:
        - Diagnosis: {{ context.diagnosis }}
        - Laboratory Results: {{ context.labs }}
        - Clinical Notes: {{ context.notes }}
        - Medications: {{ context.medications }}
        
        Use this context to provide personalized clinical guidance.
        {% else %}
        Act as a general medical AI assistant, providing broad medical knowledge and guidance.
        {% endif %}

        Here is the conversation history:
        {% for message in history %}
          {{ message.role }}: {{ message.content }}
        {% endfor %}

        Based on the full conversation history, provide a concise and relevant response to the last user message.
        Follow evidence-based guidelines and maintain a clinical tone.
      {% endif %}
    {% else %}
      Please start the conversation.
    {% endif %}
  "#
}

class Message {
  role "user" | "assistant"
  content string
}

class PatientContext {
  diagnosis string
  labs string
  notes string
  medications string
}

class ChatResponse {
  role string
  message string
  citations string[]?
}