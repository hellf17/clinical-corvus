class ClinicalQueryAnalysis {
  query_type string
}

function AnalyzeClinicalQuery(query: string) -> ClinicalQueryAnalysis {
  client DrCorvusLLM
  prompt #"
    Analyze the user's query and determine the primary intent.
    The query is: {{ query }}

    Possible intents are: "research", "discussion", "general".
    - "research": The user is asking for studies, articles, or other forms of medical research.
    - "discussion": The user is asking to discuss a patient's case, symptoms, or other clinical information.
    - "general": The user is asking a general question that does not fall into the other categories.

    Respond with only one of the possible intents.
  "#
}