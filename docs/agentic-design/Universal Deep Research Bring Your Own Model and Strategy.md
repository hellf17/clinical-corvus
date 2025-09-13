> 2025-9-3

# Universal Deep Research: Bring Your Own Model and Strategy 

Peter Belcak, Pavlo Molchanov 

> NVIDIA Research

Abstract. 

Deep research tools are among the most impactful and most commonly encountered agentic systems today. We observe, however, that each deep research agent introduced so far is hard-coded to carry out a particular research strategy using a fixed choice of tools. We introduce Universal Deep Research (UDR), a generalist agentic system that wraps around any language model and enables the user to create, edit, and refine their own entirely custom deep research strategies without any need for additional training or finetuning. To showcase the generality of our system, we equip UDR with example minimal, expansive, and intensive research strategies, and provide a user interface to facilitate experimentation with the system. 

Links: Project | Code | Lab 

# 1. Introduction 

Deep research tools are a recently emerged but already popular class of instruments for carrying out search-intensive tasks in many white-collar professions. In private use, they serve as useful gadgets for continued learning and the satisfaction of personal curiosity. The function of a deep research tool (DRT) is to take a research prompt from the user, conduct an extensive search of the available resources relevant to the task specified in the prompt, and produce a research report 

that is structured and formatted according to the requirements specified in the prompt. A DRT consists of (a) a simple user interface designed to receive the research prompt, continuously update the user on the progress of the research, and to display the research report; and (b) agentic logic, implemented either through code agency as a code-orchestrated use of LLMs and tools or via LLM agency leveraging reasoning and model tool-calling [1]. This is illustrated in Figure 1. The research report produced by a DRT typically contains structural elements such as headings and tables, extensive formatting, and relevant references to the sources used in producing the report, which sets it apart from the more compact responses seen in conversational agents [2]. 

Figure 1 ⋃︀ A high-level diagram visualizing the components of a typical deep research tool. Unlike plain conversational LLMs, DRTs tend to continuously update the user on their progress before producing their report.  

> ©2025 NVIDIA. All rights reserved.
> arXiv:2509.00244v1 [cs.AI] 29 Aug 2025 Universal Deep Research: Bring Your Own Model and Strategy

General landscape. A number of DRTs exist and are under active development. Gemini, Perplexity, and OpenAI Deep Research tools [ 3 , 4, 5] transform user prompts into a research plan and analyze the web by browsing autonomously, at each step finding information and then starting new searches based on the results of previous searches. This iterative process continues until the DRT deems it has gathered sufficient data to generate a comprehensive report. Grok 3 DeepSearch [ 6] employs a two-tier crawling architecture, in which a distributed network of crawler bots continuously indexes the web. When a user submits a query, the DRT activates an on-demand agent that performs targeted searches by generating specific sub-queries, fetching relevant pages in real-time. The system additionally leverages chain-of-thought LM reasoning to process retrieved data, evaluating source credibility and cross-verifying claims across multiple sources. 

Enterprise landscape. While iterative (“intensive”) and wide-spanning (“expansive”) research strategies appear to function well where the space of acceptable sources is wide (e.g., the entirety of the web as in the case of the above tools), the enterprise-focused DRTs tailored to perform research inside the much more limited internal document databases appear to employ considerably more specialized approaches. The NVIDIA AI-Q Research Assistant [ 7] follows a structured prompt-focused five-step process: (1) creating a report plan based on the research prompt, (2) searching data sources for answers, (3) writing a report, (4) reflecting on gaps in the report for further queries if needed, and (5) finishing with a comprehensive list of document sources. SambaNova Deep Research [ 8] similarly operates through a document-oriented five-step pipeline: (I) parsing the prompt to identify the research scope, (II) generating a detailed document outline with section-level planning (cf. AI-Q with prompt-level planning), (III) gathering information using web tools and APIs across sources, (IV) delegating tasks to specialized research agents such as the financial agent for hierarchical analysis, and (V) synthesizing findings into Markdown-formatted reports with citations. Perhaps the most idiosyncratic of the tools surveyed, ERP AI Deep Research [ 9] employs a “Graph-Based AI Architecture” that represents enterprise data through knowledge graphs and accesses them using Graph Neural Networks. Being fundamentally graph-oriented, it does not follow the traditional document/page notion of sources and performs rounds of information aggregations across relevant graph elements rather than document web traversals combined with LLM text comprehension. 

Problem statement. The existing DRTs employ predominantly rigid research strategies with little room for user customization beyond the research prompt, and, in case of DRTs with LLM agency, rely on a single choice of an underlying model or of a model family with identical behavioral post-training. While this problem is not a bar to the DRTs’ wide popularity, it limits their utility in three ways: 

P1 The user ability to enforce a hierarchy of preferred resources, automate cross-validation of information against reputable sources, and take charge of the expenses associated with each search is restricted. This contributes to the reasons for the existence of the functionality gap between customer- and enterprise-oriented DRTs. 

P2 The creation of specialized document research strategies that are ultimately necessary in high-value industries is not possible within the existing DRTs. This leaves large parts of professional research workloads in these industries to be automated by costly agentic solutions made to measure. 

P3 The models used in the existing DRTs are not interchangeable – one cannot take the most recent or the most powerful model and freely combine it with a deep research agent of their choice in order to yield an even more powerful DRT. 

Problem importance and impact. To resolve Problem P1 would help to increase the quality of research reports for individual users and help to close the gap between customer and enterprise DRTs. To resolve Problem P2 would enable the automation of a large amounts of high-value labor-intensive specialized research workloads in industries such as finance, legal, healthcare, and real estate, or government and public administration. To resolve Problem P3 would allow the pairing of the most competitive models with the most competitive DRTs, and allow for unspecialized competition among models and DRTs independently of each other. 

Contribution. We introduce Universal Deep Research (UDR), a generalist agentic system that wraps around any language model, does not require additional fine-tuning to function, and enables the user to create, edit, and refine their own entirely custom deep research strategies without any need for additional training or finetuning. The key component of UDR’s research mechanism is the conversion of user-defined research queries into actionable code snippets within the bounds of the permissible control flow and available tools. Being thus equipped, UDR allows the user to define complex procedures for document research, validation, and 

> 2Universal Deep Research: Bring Your Own Model and Strategy

report structuring, assuming complete control of any aspect of the research process. 

Novelty. The novelty of our contribution resides in it presenting a general solution to resolve problems P1 –P3 .

Target audience. The end-to-end system demonstrating UDR in this work is a research prototype. Its target audience are developers working on agentic solutions in the industry and members of the research community investigating the advantages and limitations of agentic systems. 

# 2. Research Mechanism 

UDR takes both the intended research strategy and the research prompt as inputs and follows the instructions of the strategy, abstaining from using any individual agency unless explicitly instructed to do so. 

2.1. Inputs Research Strategy. The research strategy defines the behavior of the UDR research instance in its entirety. Typically, a research strategy would consist of a list of steps, preferably formatted as a numbered or bullet-point list to make it easier for the strategy compiler to process to identify and separate the individual steps. We give examples of such research strategies Appendix A. 

Research Prompt. Similarly to other DRTs, UDR accepts a research prompt that specifies what topic or question is to be researched. There are no implicit restrictions on the nature of the prompt – if a condition is to be enforced, it must be checked and reported to the user as a part of the research strategy. A typical deep research prompt consists of a query, content requirements, and formatting requirements. It is up to the research strategy to extract all information relevant to the approach it implements from the prompt. Examples of research prompts can be found in Appendix B. 

2.2. Operation 

The operation of UDR is illustrated in Figure 2. It consists of two major phases. 

Phase 1 – Strategy processing. The core of the UDR functionality is in its conversion of user-specified natural language research strategies into executable code built with regard to the tool use and communication mechanisms of the UDR. Once the research strategy has been received from the user, it is passed to a language model together with constraints on the available functions and permitted code structures. The strategy is converted to a single callable function that accepts the research prompt as the input and continuously returns output notifications. In our implementation, we enforced this behavior by insisting that the generated function returns a generator and that every notification sent to the user that updates them on the progress of the research is a yield statement returning a dictionary with the notification payload. We found that regardless of the choice of the language model, giving it a completely free hand at generating the code implementation of the research strategy often resulted in the model taking shortcuts, skipping strategy steps, and taking liberties at imposing constraints where none were stipulated by the user. To all but eradicate this behavior, we prompted the model to generate code that corresponded to the strategy step by step, explicitly prepending every segment of the generated code by comments laying out the strategy step it corresponds to. The available tools, namely the search function, was described in a docstring contained in the user message to the code-generating model. 

Figure 2 ⋃︀ A high-level diagram visualizing the components of the UDR. Unlike specialized DRT, UDR receives both the research strategy and the research prompt from the user, allowing for a greater level of customization. 

> 3Universal Deep Research: Bring Your Own Model and Strategy

Phase 2 – Strategy execution. Once the research strategy has been converted to code and its conformance with execution requirements has been confirmed, it is invoked in an isolated code execution environment. We note a number of crucial operational details below. 

• State modifications. Rather than maintaining a single growing context window, UDR stores all intermediate information and text fragments as named variables in the code execution state. This approach enables the system to operate entirely within a small context window. In our experiments, a context length of 8k tokens was sufficient to carry out full research workflows, regardless of their complexity. 

• Tool use. All tools are accessed via synchronous function calls, ensuring transparent and deterministic behavior. Because the state is maintained outside the LM context—in persistent code variables—the system can accurately refer to and reuse information gathered in earlier steps, even if that information was processed well before the current point in execution. The architecture also allows for a future upgrade to asynchronous tool use for improved performance. 

• LM reasoning. Language model reasoning is treated as a callable utility rather than a controlling entity. UDR uses the language model for localized reasoning tasks such as summarization, ranking, or extraction, in line with specific steps in the user-defined research strategy. This contrasts with typical DRTs, where the LM often orchestrates the full research process. 

• Notifications. Throughout the execution of a research strategy, the user is kept informed via structured notifications, which are explicitly defined by the strategy author. These progress updates are emitted using yield statements in the generated code, allowing the user interface to display real-time updates without revealing raw intermediate outputs or internal state unless explicitly requested. 

Reliability. We found that generating code to follow the user-defined research strategy in a single end-to-end pass yielded significantly more reliable outcomes than earlier approaches. Initial attempts—such as embedding the strategy directly within the prompt to a reasoning-oriented language model, or decomposing the strategy into individual steps and generating isolated code fragments for each—proved fragile and error-prone. In contrast, the current approach ensures coherence across steps, minimizes synchronization overhead, and avoids the cascade of failures often seen in fragmented orchestration. The resulting code is fully interpretable and auditable by the user, and it rarely exhibits the failure modes encountered in our earlier prototypes, such as skipping strategy steps, misapplying search instructions, invoking the language model out of sequence, or introducing spurious checks and constraints not present in the original strategy. These improvements are attributable to the disciplined structure enforced during code generation and the contextual clarity of handling the entire strategy holistically. 

Efficiency. UDR achieves high computational efficiency by separating control logic from language model reasoning. The orchestration of the deep research process is handled entirely by generated code, which executes on the CPU without requiring orders-of-magnitude more expensive language model inference. Language model calls are invoked only where explicitly instructed by the user-defined research strategy, and these calls operate on compact, well-scoped textual fragments stored in the code’s variable state. This dual-level efficiency — delegating orchestration to CPU-executable logic and limiting LLM use to focused, context-efficient invocations — not only reduces GPU usage but also minimizes the overall latency and cost of executing deep research tasks. 

Security. Because UDR generates and executes user-defined code, it is essential to account for the risks associated with prompt injection and code-based exploits. To ensure robust isolation, each generated strategy can be, by our design, executed within a sandboxed environment that prevents access to the host system. This isolation is enforced by default and is designed to eliminate the possibility of side effects beyond the execution context. Ready-to-use solutions such as Piston [ 10 ] provide a foundation for such execution environments. We emphasize that isolating the execution layer is a strict requirement for any deployment of UDR beyond that to a fully trusted audience. 

2.3. Outputs Notifications. Throughout the execution of a user-defined research strategy, UDR emits structured progress updates via yield statements in the generated code. Each yielded notification is a dictionary object containing a loosely pre-specified schema with fields such as type , timestamp , and description . These notifications are intended to be parsed and displayed in real time by the user interface, providing an interpretable, low-latency view into the ongoing execution of the research strategy. Because each notification is explicitly authored as 

> 4Universal Deep Research: Bring Your Own Model and Strategy

part of the strategy, the user retains full control over the granularity and content of progress updates. This mechanism replaces the implicit, often opaque progress tracking found in typical DRTs with a deterministic, user-auditable stream of events. 

Research Report. The final output of a UDR execution is a complete research report constructed by the strategy in accordance with the user’s prompt and preferences. The report is returned as the final yielded notification, marked by a distinctive type (e.g., "final_report" ) to signal termination of the research procedure. The report may include structured text, markdown formatting, tables, references, and any other components dictated by the strategy logic. Because the report is built entirely from the accumulated variable states, it reflects the full traceability of the research process and can be verified against the inputs and tools invoked. This explicit, user-controlled (through the specification of the strategy) final-stage construction allows UDR to deliver reproducible, format-consistent outputs wherever desired by the user. Examples of research reports (and the corresponding research prompts) can be found in Appendix B. 

# 3. User Interface 

UDR is, in principle and in broad terms, compatible with any existing user interface designed to perform deep research. This is because the research strategy, despite being an additional input parameter to the system when compared to other tools, can be extracted from a research prompt with the help of a language model. However, to demonstrate the flexibility of UDR, we also developed out own demonstration user interface, pictured in Figures 3 and 4. 

• Search bar. This allows the user to input their research prompt, specifying the topic, questions, and desired output format for their deep research. This is the primary input mechanism for initiating a research task. 

• Strategy selection list. This displays a list of pre-existing research strategies that the user has previously created or saved. Users can select a strategy from this list, enabling them to quickly apply a predefined research methodology to their current prompt without needing to recreate it. 

• Edit strategy button. Clicking this button activates the strategy editing interface. It enables users to modify the currently selected research strategy, providing granular control over the research process. 

• Strategy editing text area. When the “edit strategy” button is clicked, this text area appears, pre-populated with the details of the currently selected research strategy. Users can directly write, edit, and refine their custom research strategies here using natural language, which UDR then converts into executable code. 

• Research progress notifications. This section presents a real-time, chronological list of updates and notifications from the UDR system as it executes the research strategy. Each notification includes an icon for quick visual identification, a descriptive message outlining the current status or action, and a timestamp for traceability. This feature provides transparency into the research process, allowing users to monitor progress and understand the steps being taken. 

• Stop research button. This allows the user to interrupt an ongoing research process at any point. This is crucial for controlling resource usage or for stopping research that is not yielding desired results. 

• Generate report button. This button becomes visible and active only if the research process has been stopped manually by the user, and if at least one research result has been processed (i.e., after the initial notification of the first result and before a final report candidate is generated). This provides the user with the flexibility to generate a preliminary research report based on the information gathered up to the point of interruption, even if the full strategy has not been completed. 

• Report viewer. This dedicated area is designed to render the final research report in a user-friendly, Markdown-formatted display. It ensures that all structural elements like headings, tables, and formatting are correctly visualized, making the comprehensive research output easily digestible and reviewable by the user. 

# 4. Limitations 

Reliance on language model code generation. The faithfulness of UDR’s behavior to the given research strategy depends on the quality of code generated by the underlying language model. While we mitigate 

> 5Universal Deep Research: Bring Your Own Model and Strategy

Figure 3 ⋃︀ A screenshot of the user interface developed for the purpose of demonstrating UDR showing the search bar ( top ), strategy selection list ( middle ), and the strategy editing text area ( bottom ). inconsistency through enforced comment-code structure, occasional semantic drift or hallucinated logic may still occur, particularly with ambiguous or underspecified strategies. 

Trust in user-defined strategies. UDR assumes that the research strategy authored by the user is logically sound, safe, and fit for purpose. The system does not currently validate whether the specified steps produce a coherent or meaningful workflow beyond basic syntactic and execution checks. As a result, poorly designed strategies will yield ineffective or incomplete reports, or may not return reports at all. 

Limited real-time interactivity. Although UDR provides live progress notifications via structured yields, the current implementation does not support mid-execution user intervention (beyond user stopping the workflow) or dynamic branching based on real-time user feedback. All decision logic must be encoded upfront in the research strategy, limiting adaptability in long or exploratory research workflows. 

# 5. Conclusions & Recommendations 

UDR demonstrates that it is feasible to attach a well-functioning deep research tool on top of virtually any general-enough generative language model, that it is simultaneously possible to give the end user easily understandable agency over the strategy of the deep research process. However, devising a research strategy sufficiently sophisticated to contend with the complexities of all user queries and topics has proven to be a rather tedious process for the end users of the applications – even those who appreciate the level of control this approach lends them. Furthermore, UDR shows not only that it is feasible but that it might also sometimes be desirable to allow the user to implement (“program”) agentic behavior in natural language. We see a great level of potential utility in giving the user direct control over the agency of their language model. Noting the above, we recommend that 

R1 a system similar to UDR, if deployed to the end consumer, be equipped with a library of research strategies for modification and customization rather than the requirement that the user bring their own strategy; 

R2 it be further explored how to give users control over the otherwise free reasoning (sometimes also referred to as “thinking”) of language models; and 

R3 it be further explored how potentially a large set of user prompts could be automatically turned into deterministically controlled agents performing complex series of actions on their behalf. 

> 6Universal Deep Research: Bring Your Own Model and Strategy

Figure 4 ⋃︀ A screenshot of the UDR demonstration UI showing a completed research workflow, featuring the search bar ( top ), strategy selection list ( top-middle ), research progress notification visualizer ( bottom-middle ), and the report viewer ( bottom ). 

> 7Universal Deep Research: Bring Your Own Model and Strategy

# References 

[1] Peter Belcak, Greg Heinrich, Shizhe Diao, Yonggan Fu, Xin Dong, Saurav Muralidharan, Yingyan Celine Lin, and Pavlo Molchanov. Small language models are the future of agentic ai, 2025. [2] Tula Masterman, Sandi Besen, Mason Sawtell, and Alex Chao. The landscape of emerging ai agent architectures for reasoning, planning, and tool calling: A survey. arXiv preprint arXiv:2404.11584 , 2024. [3] Dave Citron. Try deep research and our new experimental model in gemini, your ai assistant. Google Blog (Products: Gemini) , December 2024. Accessed: 2025-06-09. [4] Perplexity Team. Introducing perplexity deep research. Perplexity Blog , February 2025. Accessed: 2025-06-09. [5] OpenAI. Introducing deep research. OpenAI Blog , February 2025. Accessed: 2025-06-09. [6] Charles Zhou. Understanding grok: A comprehensive guide to grok websearch, grok deepsearch. Profound Blog ,February 2025. Accessed: 2025-06-09. [7] NVIDIA - AI - Blueprints. AI - Q Research Assistant Blueprint (aiq -research - assistant). GitHub repository, June 2025. Latest release: v1.0.0 (Jun 6, 2025); Accessed: 2025-06-09. [8] SambaNova Systems. Open source deep research agents, 2025. Accessed: 2025-06-09. [9] ERP.AI. Deep research. ERP.AI website, 2025. Accessed: 2025-06-09. [10] engineer man. Piston: A high performance general purpose code execution engine. https://github .com/engineer-man/piston , February 2025. Accessed: 2025-06-09; MIT License. 

> 8Universal Deep Research: Bring Your Own Model and Strategy

# A. Example Research Strategies 

A.1. Minimal Research Strategy 

1 . Send a n o t i f i c a t i o n o f type " prompt_received " with d e s c r i p t i o n s a y i n g what PROMPT has been r e c e i v e d , e . g . " Re c e iv e d r e s e a r c h r e q u e s t : {PROMPT} " 2 . Send a n o t i f i c a t i o n o f type " p r o m p t _ a n a l y s i s _ s t a r t e d " , with d e s c r i p t i o n i n d i c a t i n g t h a t we a r e now a n a l y z i n g t he r e s e a r c h r e q u e s t . 3 . Take t he PROMPT and ask a l a n g u a g e model t o produce 3 s e a r c h p h r a s e s t h a t c o u l d h e l p with r e t r i e v i n g r e s u l t s from s e a r c h e n g i n e f o r t h e purpose o f c o m p i l i n g a r e p o r t t h e u s e r a s k s f o r i n th e PROMPT. The s e a r c h p h r a s e s s h o u l d be s i m p l e and o b j e c t i v e , e . g . " important e v e n t s 1 9 7 2 " o r " e n e r g y consumption c o m p o s i t i o n i n I n d i a today " . Use a l o n g prompt f o r t h e model t h a t d e s c r i b e s i n d e t a i l what i s supposed t o be performed and t he e x p e c t e d output format . I n s t r u c t th e model t o r e t u r n t he s e a r c h p h r a s e s on one l i n e each . T e l l t h e model not t o output any o t h e r t e x t −− j u s t t h e ne wl in e −

s e p a r a t e d p h r a s e s . Then , p a r s e t h e output o f t he l a n g u a g e model l i n e by l i n e and s a v e t h e r e s u l t i n g s e a r c h p h r a s e s as " p h r a s e s " f o r f u r t h e r r e s e a r c h , s k i p p i n g o v e r empty l i n e s . 4 . Send a n o t i f i c a t i o n o f type " prompt_analysis_completed " , with a d e s c r i p t i o n s a y i n g as much . 4 . 1 Send a n o t i f i c a t i o n o f type " t a s k _ a n a l y s i s _ c o m p l e t e d " , i n f o r m i n g t h e u s e r t h a t t h e s e a r c h plan has been completed and i n f o r m i n g them how many s e a r c h p h r a s e s w i l l be invoked , e . g . " Search p l a n n i n g completed . W i l l be s e a r c h i n g through { l e n ( t o p i c s )}+ terms . " 5 . For each p h r a s e i n p h r a s e s output by s t e p 3 . , perform t h e f o l l o w i n g : 

− Send a n o t i f i c a t i o n o f type " s e a r c h _ s t a r t e d " , with t h e d e s c r i p t i o n i n d i c a t i n g what s e a r c h p h r a s e we a r e u s i n g f o r t h e s e a r c h , e . g . "S e a r c h i n g f o r p h r a s e ’ { p h r a s e } ’ " 

− Perform s e a r c h with th e p h r a s e . 

− Once t he s e a r c h r e t u r n s some r e s u l t s , append t h e i r c o n t e n t s t o CONTEXT one by one , s e p a r a t i n g them by double n e w l i n e s from what i s a l r e a d y p r e s e n t i n t h e CONTEXT. 

− Send a n o t i f i c a t i o n o f type " s e a r c h _ r e s u l t _ p r o c e s s i n g _ c o m p l e t e d " , i n d i c a t i n g i n i t s d e s c r i p t i o n t h a t t h e s e a r c h r e s u l t s f o r term { term } have been p r o c e s s e d . 6 . Send a n o t i f i c a t i o n t o t he u s e r with type " r e s e a r c h _ c o m p l e t e d " , i n d i c a t i n g t h a t t h e " Research phase i s now completed . " . 7 . Send a n o t i f i c a t i o n with type " r e p o r t _ b u i l d i n g " , with th e d e s c r i p t i o n i n d i c a t i n g t h a t t h e r e p o r t i s b e i n g b u i l t . 8 . Take CONTEXT. C a l l t h e l a n g u a g e model , i n s t r u c t i n g i t t o t a k e CONTEXT ( t o be appended i n t o t he LM c a l l ) and produce a deep r e s e a r c h r e p o r t on th e t o p i c r e q u e s t e d i n PROMPT. The r e s u l t i n g r e p o r t s h o u l d go i n t o d e t a i l wherever p o s s i b l e , r e l y o n l y on t h e i n f o r m a t i o n a v a i l a b l e i n CONTEXT, a d d r e s s t he i n s t r u c t i o n g i v e n i n t h e PROMPT, and be f o r m a t t e d i n Markdown . This i s t o be communicated i n th e prompt . Do not shy away from u s i n g long , d e t a i l e d and d e s c r i p t i v e prompts ! T e l l th e model not t o output any o t h e r t e x t , j u s t t h e r e p o r t . The r e s u l t produced by t h e l a n g u a g e model i s t o be c a l l e d REPORT. 9 . Send a n o t i f i c a t i o n with type " report_done " , i n d i c a t i n g t h a t t h e r e p o r t has been completed . Add " r e p o r t " as a f i e l d c o n t a i n i n g th e REPORT t o be an a d d i t i o n a l payload t o th e n o t i f i c a t i o n . 1 0 . Output t h e REPORT. 

A.2. Expansive Research Strategy 

> 9Universal Deep Research: Bring Your Own Model and Strategy

1 . Send a n o t i f i c a t i o n o f type " prompt_received " with d e s c r i p t i o n s a y i n g what PROMPT has been r e c e i v e d , e . g . " Re c e iv e d r e s e a r c h r e q u e s t : {PROMPT} " 2 . Send a n o t i f i c a t i o n o f type " p r o m p t _ a n a l y s i s _ s t a r t e d " , with d e s c r i p t i o n i n d i c a t i n g t h a t we a r e now a n a l y z i n g t he r e s e a r c h r e q u e s t . 3 . Take t he PROMPT and ask a l a n g u a g e model t o produce 2 t o p i c s t h a t c o u l d be u s e f u l t o i n v e s t i g a t e i n o r d e r t o produce th e r e p o r t r e q u e s t e d i n t h e PROMPT. The t o p i c s s h o u l d be s i m p l e and s u f f i c i e n t l y d i f f e r e n t from each o t he r , e . g . " important e v e n t s o f 1 9 7 2 " o r " e n e r g y consumption c o m p o s i t i o n i n I n d i a today " . I n s t r u c t th e model t o r e t u r n th e t o p i c s on one l i n e each . T e l l t he model not t o output any o t h e r t e x t . Then , p a r s e t h e output o f t h e l a n g u a g e model l i n e by l i n e and s a v e t h e r e s u l t i n g t o p i c s as " t o p i c s " f o r f u r t h e r r e s e a r c h . 4 . Send a n o t i f i c a t i o n o f type " prompt_analysis_completed " , with d e s c r i p t i o n s a y i n g as much . 5 . Throughout t h e s e a r c h and r e p o r t g e n e r a t i o n p r o c e s s , we s h a l l r e l y on as i n g l e s t o r a g e o f c o n t e x t . L e t s r e f e r t o i t j u s t as t o " c o n t e x t " from now on . I n i t i a l l y , t h e r e i s no c o n t e x t . 6 . For each t o p i c i n t o p i c s , perform t he f o l l o w i n g 6 . 1 . Take t he PROMPT and t he t o p i c , and ask a l a n g u a g e model t o produce up t o 2 s e a r c h p h r a s e s t h a t c o u l d be u s e f u l t o c o l l e c t i n f o r m a t i o n on t h e p a r t i c u l a r t o p i c . Each s e a r c h p h r a s e s h o u l d be s i m p l e and d i r e c t l y r e l a t e t o t h e t o p i c e . g . , f o r t o p i c " important e v e n t s o f 1 9 7 2 " , t h e s e a r c h p h r a s e s c o u l d be " what happened i n 1 9 7 2 " , " 1 9 7 2 e v e n t s worldwide " , "important e v e n t s 1971 −1973". For t o p i c " e n e r g y consumption c o m p o s i t i o n i n I n d i a today " , t he s e a r c h p h r a s e s c o u l d be " r e n e w a b l e e n e r g y p r o d u c t i o n i n I n d i a today " , " f o s s i l f u e l e n e r g y r e l i a n c e I n d i a " , " e n e r g y s e c u r i t y I n d i a " . C a l l t h e r e t u r n e d p h r a s e s s i m p l y " p h r a s e s " from now on . 6 . 2 . For each p h r a s e i n p h r a s e s output by s t e p 6 . 1 . , perform th e f o l l o w i n g : 

− Send a n o t i f i c a t i o n o f type " s e a r c h _ s t a r t e d " , with t h e d e s c r i p t i o n i n d i c a t i n g what s e a r c h p h r a s e we a r e u s i n g f o r t h e s e a r c h , e . g . "S e a r c h i n g f o r p h r a s e ’ { p h r a s e } ’ " 

− Perform s e a r c h with th e p h r a s e . Once th e s e a r c h r e t u r n s some r e s u l t s , append t h e i r c o n t e n t s t o c o n t e x t one by one , s e p a r a t i n g them by double n e w l i n e s from what i s a l r e a d y p r e s e n t i n th e c o n t e x t . 

− Send a n o t i f i c a t i o n o f type " s e a r c h _ r e s u l t _ p r o c e s s i n g _ c o m p l e t e d " , i n d i c a t i n g i n i t s d e s c r i p t i o n t h a t t h e s e a r c h r e s u l t s f o r term { term } have been p r o c e s s e d . 7 . Send a n o t i f i c a t i o n with type " r e p o r t _ b u i l d i n g " , with th e d e s c r i p t i o n i n d i c a t i n g t h a t t h e r e p o r t i s b e i n g b u i l t . 8 . Take CONTEXT. C a l l t h e l a n g u a g e model , i n s t r u c t i n g i t t o t a k e c o n t e x t ( t o be appended i n t o t he LM c a l l ) and produce a deep r e s e a r c h r e p o r t on th e t o p i c r e q u e s t e d i n PROMPT. The r e s u l t i n g r e p o r t s h o u l d go i n t o d e t a i l wherever p o s s i b l e , r e l y o n l y on t h e i n f o r m a t i o n a v a i l a b l e i n c o n t e x t , a d d r e s s t he i n s t r u c t i o n g i v e n i n t h e PROMPT, and be f o r m a t t e d i n Markdown . This i s t o be communicated i n th e prompt . Do not shy away from u s i n g long , d e t a i l e d and d e s c r i p t i v e prompts ! T e l l th e model not t o output any o t h e r t e x t , j u s t t h e r e p o r t . The r e s u l t produced by t h e l a n g u a g e model i s t o be c a l l e d REPORT. 9 . Send a n o t i f i c a t i o n with type " report_done " , i n d i c a t i n g t h a t t h e r e p o r t has been completed . Add " r e p o r t " as a f i e l d c o n t a i n i n g th e REPORT t o be an a d d i t i o n a l payload t o th e n o t i f i c a t i o n . 1 0 . Output t h e REPORT. 

A.3. Intensive Research Strategy 

> 10 Universal Deep Research: Bring Your Own Model and Strategy

1 . Send a n o t i f i c a t i o n o f type " prompt_received " with d e s c r i p t i o n s a y i n g what PROMPT has been r e c e i v e d , e . g . " Re c e iv e d r e s e a r c h r e q u e s t : {PROMPT} " 2 . Send a n o t i f i c a t i o n o f type " p r o m p t _ a n a l y s i s _ s t a r t e d " , with d e s c r i p t i o n i n d i c a t i n g t h a t we a r e now a n a l y z i n g t he r e s e a r c h r e q u e s t . 3 . Throughout t h e s e a r c h and r e p o r t g e n e r a t i o n p r o c e s s , we s h a l l r e l y on two s t o r a g e s o f c o n t e x t . One s h a l l be c a l l e d " s u p e r c o n t e x t " and c o n t a i n a l l c o n t e x t s o f a l l r e s o u r c e s read throughout th e s e a r c h phase . The o t h e r one s h a l l be c a l l e d " s u b c o n t e x t " and p e r t a i n t o o n l y one i n t e r a t i o n o f t h e s e a r c h p r o c e s s . At t he b e g i n n i n g , both th e s u p e r c o n t e x t and s u b c o n t e x t a r e empty . 4 . Take t he PROMPT and ask a l a n g u a g e model t o produce 2 s e a r c h p h r a s e s t h a t c o u l d h e l p with r e t r i e v i n g r e s u l t s from s e a r c h e n g i n e f o r t h e purpose o f c o m p i l i n g a r e p o r t t h e u s e r a s k s f o r i n th e PROMPT. The s e a r c h p h r a s e s s h o u l d be s i m p l e and o b j e c t i v e , e . g . " important e v e n t s 1 9 7 2 " o r " e n e r g y consumption c o m p o s i t i o n i n I n d i a today " . Use a l o n g prompt f o r t h e model t h a t d e s c r i b e s i n d e t a i l what i s supposed t o be performed and t he e x p e c t e d output format . I n s t r u c t th e model t o r e t u r n t he s e a r c h p h r a s e s on one l i n e each . T e l l t h e model not t o output any o t h e r t e x t −− j u s t t h e ne wl in e −

s e p a r a t e d p h r a s e s . Then , p a r s e t h e output o f t he l a n g u a g e model l i n e by l i n e and s a v e t h e r e s u l t i n g s e a r c h p h r a s e s as " p h r a s e s " f o r f u r t h e r r e s e a r c h , s k i p p i n g o v e r empty l i n e s . 4 . 1 . Send a n o t i f i c a t i o n o f type " prompt_analysis_completed " , with ad e s c r i p t i o n s a y i n g as much . 5 . Perform t he f o l l o w i n g 2 t i m e s : 

− C l e a r t h e s u b c o n t e x t . 

− For each p h r a s e i n p h r a s e s , perform t h e f o l l o w i n g : 

∗ Send a n o t i f i c a t i o n o f type " s e a r c h _ s t a r t e d " , with t h e d e s c r i p t i o n i n d i c a t i n g what s e a r c h p h r a s e we a r e u s i n g f o r t he s e a r c h , e . g . "S e a r c h i n g f o r p h r a s e ’ { p h r a s e } ’ " 

∗ Perform s e a r c h with th e p h r a s e . Once th e s e a r c h r e t u r n s some r e s u l t s , append t h e i r c o n t e n t s t o s u b c o n t e x t one by one , s e p a r a t i n g them by double n e w l i n e s from what i s a l r e a d y p r e s e n t i n t h e s u b c o n t e x t . 

∗ Send a n o t i f i c a t i o n o f type " s e a r c h _ r e s u l t _ p r o c e s s i n g _ c o m p l e t e d " , i n d i c a t i n g i n i t s d e s c r i p t i o n t h a t t h e s e a r c h r e s u l t s f o r term { term } have been p r o c e s s e d . 

− Once t he s u b c o n t e x t has been put t o g e t h e r by a g g r e g a t i n g t h e c o n t r i b u t i o n s due t o a l l s e a r c h p h r a s e s , ask a l a n g u a g e model , g i v e n t h e s u b c o n t e x t and t h e PROMPT g i v e n by t h e user , t o come up with 2 more p h r a s e s ( d i s t i n c t t o p h r a s e s t h a t a r e a l r e a d y i n p h r a s e s ) on t he b a s i s o f t h e new s u b c o n t e x t b e i n g a v a i l a b l e . Again , t h e s e a r c h p h r a s e s s h o u l d be s i m p l e and o b j e c t i v e , e . g . " important e v e n t s 1 9 7 2 " o r " e n e r g y consumption c o m p o s i t i o n i n I n d i a today " . Use a l o n g prompt f o r t h e model t h a t d e s c r i b e s i n d e t a i l what i s supposed t o be performed and th e e x p e c t e d output format . I n s t r u c t t h e model t o r e t u r n t he s e a r c h p h r a s e s on one l i n e each . T e l l t h e model not t o output any o t h e r t e x t −− j u s t t h e ne wl in e −s e p a r a t e d p h r a s e s . Then , p a r s e t h e output o f t he l a n g u a g e model l i n e by l i n e and s a v e t he r e s u l t i n g s e a r c h p h r a s e s as " p h r a s e s " f o r f u r t h e r r e s e a r c h , s k i p p i n g o v e r empty l i n e s . C l e a r a l l t h e o l d p h r a s e s and l e t t h e newly r e t u r n e d p h r a s e s by th e p h r a s e s f o r th e next i t e r a t i o n o f t h i s l o o p . 6 . Send a n o t i f i c a t i o n with type " r e p o r t _ b u i l d i n g " , with th e d e s c r i p t i o n i n d i c a t i n g t h a t t h e r e p o r t i s b e i n g b u i l t . 7 . Take CONTEXT. C a l l t h e l a n g u a g e model , i n s t r u c t i n g i t t o t a k e CONTEXT ( t o be appended i n t o t he LM c a l l ) and produce a deep r e s e a r c h r e p o r t on th e t o p i c r e q u e s t e d i n PROMPT. The r e s u l t i n g r e p o r t s h o u l d go i n t o d e t a i l wherever p o s s i b l e , r e l y o n l y on t h e i n f o r m a t i o n a v a i l a b l e i n CONTEXT, a d d r e s s t he i n s t r u c t i o n g i v e n i n t h e PROMPT, and be f o r m a t t e d i n Markdown . 

> 11 Universal Deep Research: Bring Your Own Model and Strategy

This i s t o be communicated i n th e prompt . Do not shy away from u s i n g long , d e t a i l e d and d e s c r i p t i v e prompts ! T e l l th e model not t o output any o t h e r t e x t , j u s t t h e r e p o r t . The r e s u l t produced by t h e l a n g u a g e model i s t o be c a l l e d REPORT. 8 . Send a n o t i f i c a t i o n with type " report_done " , i n d i c a t i n g t h a t t h e r e p o r t has been completed . Add " r e p o r t " as a f i e l d c o n t a i n i n g th e REPORT t o be an a d d i t i o n a l payload t o th e n o t i f i c a t i o n . 9 . Output t he REPORT. 

# B. Example Inputs and Outputs 

The following prompts were used to produce example outputs. The model used was Llama 3.3 70B, and the research strategy employed was the minimal strategy given in Appendix A.1. 

B.1. African or European swallow? 

B.1.1. Input 

What i s th e a i r s p e e d v e l o c i t y o f an unladen swallow ? Produce a d e t a i l e d r e p o r t on t h e s u b j e c t , i n c l u d i n g t h e o c c u r e n c e s o f th e i n f o r m a t i o n i n t h e p o p u l a r c u l t u r e . Condense your output i n t o t h r e e s e c t i o n s . 

B.1.2. Raw markdown output 

# The A i r s p e e d V e l o c i t y o f an Unladen Swallow : A C u l t u r a l and T e c h n i c a l E x p l o r a t i o n ## O r i g i n s and Popular C u l t u r e S i g n i f i c a n c e The q u e s t i o n o f t he a i r s p e e d v e l o c i t y o f an unladen swallow o r i g i n a t e s from t h e 1975 f i l m ∗Monty Python and th e Holy G r a i l ∗ [ [ 0 , 1 ] ] . In t h e f i l m , King Arthur e n g a g e s i n a humorous debate with a c a s t l e guard and l a t e r a t r o l l , d i s c u s s i n g t h e f e a s i b i l i t y o f coconut t r a n s p o r t a t i o n by s w a l l o w s and t h e s p e c i f i c s o f swallow a i r s p e e d [ [ 0 ] ] . The d i a l o g u e ’ s a b s u r d i t y , p a r t i c u l a r l y t h e d i s t i n c t i o n between A f r i c a n and European swallows , has become ac u l t u r a l r e f e r e n c e p o i n t f o r o v e r l y t r i v i a l o r t e c h n i c a l i n q u i r i e s [ [ 0 , 1 ] ] . This r e f e r e n c e has permeated v a r i o u s media , i n c l u d i n g t e c h n o l o g y , with v i r t u a l a s s i s t a n t s l i k e S i r i and c o m p u t a t i o n a l e n g i n e s such as Wolfram Alpha p r o v i d i n g humorous and s c i e n t i f i c r e s p o n s e s , r e s p e c t i v e l y [ [ 0 ] ] . ## T e c h n i c a l A n a l y s i s and Accuracy From a t e c h n i c a l s t a n d p o i n t , t h e a i r s p e e d v e l o c i t y o f an unladen swallow has been s u b j e c t t o a n a l y s i s and myth −b u s t i n g [ [ 1 ] ] . Contrary t o th e f i l m ’ s s u g g e s t i o n s , t he a v e r a g e European swallow weighs l e s s than an ounce and f l a p s i t s wings a p p r o x i m a t e l y 12 t i m e s per second [ [ 1 ] ] . A study c i t e d i n ∗

I n t e r e s t i n g E n g i n e e r i n g ∗ e s t i m a t e s th e a i r s p e e d v e l o c i t y t o be around 2 0 . 1 m i l e s p er hour [ [ 1 ] ] , w h i l e a n o t h e r a n a l y s i s by Jonathan Corum i n 2003 s u g g e s t s an a v e r a g e c r u i s i n g a i r s p e e d o f r o u g h l y 11 meters per second or 24 m i l e s per hour [ [ 0 ] ] . These f i n d i n g s h i g h l i g h t t h e d i s c r e p a n c y between t h e f i l m ’ s comedic p o r t r a y a l and r e a l −world o r n i t h o l o g i c a l data . ## Enduring C u l t u r a l Impact The r e f e r e n c e t o t h e a i r s p e e d v e l o c i t y o f an unladen swallow has e v o l v e d i n t o a l a s t i n g symbol o f a b s u r d i t y and i n t e l l e c t u a l c u r i o s i t y i n p o p u l a r c u l t u r e [ [ 0 , 1 ] ] . I t i s f r e q u e n t l y used i n memes , v i d e o s , and o n l i n e d i s c u s s i o n s t o humorously c r i t i q u e t r i v i a l d e b a t e s or p o i n t l e s s i n q u i r i e s [ [ 0 ] ] . The 

> 12 Universal Deep Research: Bring Your Own Model and Strategy

phrase ’ s e n d u r i n g p o p u l a r i t y a c r o s s d i f f e r e n t p l a t f o r m s and communities , from computing t o s o c i a l media , u n d e r s c o r e s i t s s t a t u s as a c u l t u r a l t o u c h s t o n e , b l e n d i n g humor with a touch o f i n t e l l e c t u a l i s m c h a r a c t e r i s t i c o f Monty Python ’ s i n f l u e n c e [ [ 0 , 1 ] ] . 

−−− − [ [ 0 ] ] [ What I s th e A i r s p e e d V e l o c i t y o f an Unladen Swallow ? ] [ 0 ] 

− [ [ 1 ] ] [ Monty Python and t he Holy G r a i l ’ s b i g g e s t q u e s t i o n s , answered − SYFY ] [ 1 ] [ 0 ] : h t t p s : / / knowyourmeme . com/memes/what −i s −the −a i r s p e e d −v e l o c i t y −of −an −

unladen −swallow [ 1 ] : h t t p s : / /www. s y f y . com/ s y f y −w i r e /monty −python −and −the −holy −g r a i l −swallows −

coconuts −r a b b i t s −black −k n i g h t 

B.2. Significant events on a chosen day 

B.2.1. Input 

Produce a r e p o r t on t he most s i g n i f i c a n t e v e n t s t h a t o c c u r r e d on th e 1 s t o f May 2 0 2 5 . Write 3 s e c t i o n s . 

B.2.2. Raw markdown output 

# Report on t he Most S i g n i f i c a n t Events o f May 1 s t , 2025 ## 1 . I n t e r n a t i o n a l Labour Day (May Day ) May 1 s t , 2 0 2 5 , marks t h e g l o b a l o b s e r v a n c e o f ∗∗ I n t e r n a t i o n a l Labour Day ∗ ∗ , a l s o known as 

## 2 . Maharashtra Day and Gujarat Day In I n d i a , May 1 s t a l s o c o i n c i d e s with ∗∗ Maharashtra Day ∗∗ and ∗∗ Gujarat Day ∗ ∗ , commemorat 

## 3 . Global S i g n i f i c a n c e and R e f l e c t i o n The s i g n i f i c a n c e o f May 1 s t , 2 0 2 5 , l i e s i n i t s d ual r o l e as a day o f g l o b a l s o l i d a r i t y f o r 

−−− − [ [ 0 ] ] [ Important Days i n May 2 0 2 5 , L i s t o f N a t i o n a l and I n t e r n a t i o n a l Events ] [ 0 ] 

− [ [ 1 ] ] [ Important Dates i n May 2 0 2 5 : Global Events , H o l i d a y s ] [ 1 ] 

− [ [ 2 ] ] [ Important N a t i o n a l and I n t e r n a t i o n a l Days i n May 2 0 2 5 : Themes . . . ] [ 2 ] 

− [ [ 3 ] ] [ Important Days i n May 2 0 2 5 : N a t i o n a l and I n t e r n a t i o n a l Dates L i s t i n May ] [ 3 ] 

− [ [ 4 ] ] [ May 2025 Calendar : F u l l L i s t o f Important N a t i o n a l & I n t e r n a t i o n a l Days . . . ] [ 4 ] [ 0 ] : h t t p s : / / c u r r e n t a f f a i r s . adda247 . com/ important −days −in −may/ [ 1 ] : h t t p s : / / importantdayshub . com/ important −da tes −in −may −2025/ [ 2 ] : h t t p s : / /www. s o c i a l w o r k i n . com/2025/04/ important −n a t i o n a l −i n t e r n a t i o n a l −days −may −2025. h [ 3 ] : h t t p s : / /www. j a g r a n j o s h . com/ g e n e r a l −knowledge / important −days −in −may −1557143140 −1[ 4 ] : h t t p s : / / d a i l y s c h o o l a s s e m b l y . com/may −important −days / 

B.3. Stock Movements on a Chosen Day 

B.3.1. Input 

> 13 Universal Deep Research: Bring Your Own Model and Strategy

Produce a d e t a i l e d r e p o r t on t h e US s t o c k movements on t h e Thursday 24 th o f A p r i l 2 0 2 5 . Note t h e opening and c l o s i n g p r i c e s . In terms o f f o r m a t t i n g , make t h r e e s e c t i o n s : one f o c u s i n g on t he c o n d i t i o n s a t which s t o c k s opened , one f o c u s i n g on th e c o n d i t i o n s under which t he s t o c k c l o s e d , and one p u t t i n g t h e d a i l y movements i n t o a wider p e r s p e c t i v e . 

B.3.2. Raw markdown output 

Any hallucinations are not due to incorrect search results but to the incorrect comprehension of the search results by the language model. # US Stock Movements Report − A p r i l 2 4 , 2025 ## Opening C o n d i t i o n s The US s t o c k market opened with mixed s i g n a l s a c r o s s key i n d i c e s . The S&P 500 opened a t 5 3 9 5 . 9 2 [ [ 0 ] ] , w h i l e t he Dow Jones I n d u s t r i a l Average ( DJIA ) s t a r t e d t he day a t 3 9 8 1 5 . 0 1 [ [ 0 ] ] . The NASDAQ Composite began t r a d i n g a t 1 6 , 8 8 0 . 2 9 [ [ 0 ] ] . These opening p r i c e s s e t t h e s t a g e f o r a day t h a t would s e e s i g n i f i c a n t movement , i n f l u e n c e d by ongoing t a r i f f n e g o t i a t i o n s and r a t e cu t e x p e c t a t i o n s [ [ 1 ] ] . Notably , th e SPY opened a t $540 . 4 3 , r e f l e c t i n g t h e b r o a d e r market s e n t i m e n t [ [ 1 ] ] . ## C l o s i n g C o n d i t i o n s By t he c l o s e o f t r a d i n g , th e S&P 500 had r i s e n t o 5 3 7 5 . 8 6 , marking a 1.67% i n c r e a s e from t h e p r e v i o u s c l o s e [ [ 0 ] ] . The DJIA c l o s e d a t 3 9 6 0 6 . 5 7 , up 1.07% from i t s p r e v i o u s c l o s e [ [ 0 ] ] , with a p o i n t s change o f 4 1 9 . 5 8 [ [ 2 ] ] . The NASDAQ Composite ended t h e day a t 1 6 , 7 0 8 . 0 5 , a c h i e v i n g a 2.5% g a i n [ [ 0 ] ] . The SPY c l o s e d s t r o n g l y a t $546 . 4 8 , b r e a k i n g through key r e s i s t a n c e l e v e l s and s i g n a l i n g c o n t i n u e d momentum [ [ 1 ] ] . The S&P 5 0 0 ’ s c l o s e a t 5 , 3 7 5 . 8 6 r e p r e s e n t e d i t s h i g h e s t l e v e l s i n c e A p r i l 15 [ [ 2 ] ] . ## Wider P e r s p e c t i v e The day ’ s movements were p a r t o f a b r o a d e r t h r e e −day r a l l y , with t he NASDAQ, S&P 5 0 0 , and DJIA g a i n i n g more than 8%, 6%, and 5%, r e s p e c t i v e l y , o v e r t h i s p e r i o d [ [ 1 ] ] . Optimism around t a r i f f n e g o t i a t i o n s with I n d i a and South Korea , c o u p l e d with d o v i s h comments from th e C l e v e l a n d Fed P r e s i d e n t , c o n t r i b u t e d t o t he b u l l i s h s e n t i m e n t [ [ 1 ] ] . The market a l s o responded p o s i t i v e l y t o s t r o n g e a r n i n g s r e p o r t s , such as Alphabet ’ s b e t t e r −than −

e x p e c t e d r e s u l t s and i t s announcement o f a s t o c k buyback and d i v i d e n d h i k e [ [ 1 ] ] . T e c h n i c a l i n d i c a t o r s p r e s e n t e d a mixed o u t l o o k , with t h e RSI s u g g e s t i n g n e u t r a l momentum f o r t h e S&P 500 and t h e MACD i n d i c a t i n g b e a r i s h t r e n d s f o r th e DJIA and NASDAQ [ [ 0 ] ] . The S&P 5 0 0 ’ s e x i t from c o r r e c t i o n t e r r i t o r y f u r t h e r h i g h l i g h t e d th e market ’ s r e s i l i e n c e , with t he i n d e x r i s i n g above t he 5 4 8 1 . 0 5 l e v e l needed t o mark a 10% r e c o v e r y from i t s r e c e n t low [ [ 3 ] ] . However , some s o u r c e s noted a l a c k o f s p e c i f i c data f o r A p r i l 2 4 , 2 0 2 5 , i n h i s t o r i c a l r e c o r d s [ [ 4 ] ] . 

−−− − [ [ 0 ] ] [ Global s t o c k market i n d i c e s : How th e world markets performed today −

24 . . . ] [ 0 ] 

− [ [ 1 ] ] [ Market I n s i g h t s : Thursday , A p r i l 24 th , 2 0 2 5 ] [ 1 ] 

− [ [ 2 ] ] [ Stock Market News f o r Apr 2 4 , 2025 − Yahoo Finance ] [ 2 ] 

− [ [ 3 ] ] [ Stock Market News From A p r i l 2 4 , 2 0 2 5 : Dow, S&P 5 0 0 , Nasdaq . . . −

Barron ’ s ] [ 3 ] 

− [ [ 4 ] ] [ S&P 500 H i s t o r i c a l Data (SPX) − I n v e s t i n g . com ] [ 4 ] 

> 14 Universal Deep Research: Bring Your Own Model and Strategy

[ 0 ] : h t t p s : / /www. e d i t o r j i . com/ b u s i n e s s −news / markets / g l o b a l −s t o c k −market −

i n d i c e s −performed −today −a p r i l −24 −2025 −1745491687078 [ 1 ] : h t t p s : / /www. m o n e t a r i t r a d i n g . com/ b l o g / market −i n s i g h t s −thursday −a p r i l −24th 

−2025 [ 2 ] : h t t p s : / / f i n a n c e . yahoo . com/ news / s t o c k −market −news −apr −24 −135000428. html [ 3 ] : h t t p s : / /www. b a r r o n s . com/ l i v e c o v e r a g e / s t o c k −market −today −042425 [ 4 ] : h t t p s : / /www. i n v e s t i n g . com/ i n d i c e s / us −spx −500 − h i s t o r i c a l −data 

B.4. Ulysses Grant 

B.4.1. Input 

Produce a r e s e a r c h r e p o r t on General U l y s s e s S . Grant , f o c u s i n g on h i s C i v i l War m i l i t a r y l e a d e r s h i p , key b a t t l e s , s t r a t e g i c approach , and h i s i n f l u e n c e d u r i n g R e c o n s t r u c t i o n as p r e s i d e n t . The r e p o r t s h o u l d be s t r u c t u r e d i n t o f i v e s e c t i o n s : i n t r o d u c t i o n , m i l i t a r y c a r e e r , l e a d e r s h i p s t y l e , p o l i t i c a l l e g a c y , and c o n c l u s i o n . Use a t l e a s t t h r e e s c h o l a r l y s o u r c e s , i n c l u d e c i t a t i o n s , and format t h e r e p o r t with c l e a r s e c t i o n h e a d i n g s . 

B.4.2. Raw markdown output 

# U l y s s e s S . Grant : A Study i n M i l i t a r y L e a d e r s h i p and P o l i t i c a l Legacy ## I n t r o d u c t i o n U l y s s e s S . Grant , born Hiram U l y s s e s Grant , r o s e from a mediocre m i l i t a r y c a r e e r t o become one o f th e most renowned g e n e r a l s i n U. S . h i s t o r y , c r e d i t e d with winning th e C i v i l War and p r e s e r v i n g t h e Union [ [ 4 ] ] . His l e a d e r s h i p d u r i n g t h e war and s u b s e q u e n t p r e s i d e n c y shaped th e na t i on ’ s t r a j e c t o r y d u r i n g R e c o n s t r u c t i o n . This r e p o r t examines Grant ’ s m i l i t a r y l e a d e r s h i p , key b a t t l e s , s t r a t e g i c approach , and h i s i n f l u e n c e d u r i n g R e c o n s t r u c t i o n as p r e s i d e n t . ## M i l i t a r y Career Grant ’ s m i l i t a r y c a r e e r began with h i s appointment as c o l o n e l o f t he 21 s t I l l i n o i s I n f a n t r y i n 1 8 6 1 , q u i c k l y r i s i n g t o b r i g a d i e r g e n e r a l [ [ 4 ] ] . His e a r l y v i c t o r i e s a t Fort Donelson and Fort Henry i n 1862 earned him th e nickname " U n c o n d i t i o n a l S u r r e n d e r " Grant [ [ 4 ] ] . D e s p i t e f a c i n g c r i t i c i s m and c a l l s f o r h i s removal a f t e r t h e B a t t l e o f S h i l o h , L i n c o l n s u p p o r t e d Grant , r e c o g n i z i n g h i s t e n a c i t y [ [ 4 ] ] . Grant ’ s s t r a t e g i c m a s t e r p i e c e a t Vicksburg i n 1863 s p l i t t h e Confederacy and marked a t u r n i n g p o i n t i n t h e war [ [ 2 ] , [ 3 ] , [ 4 ] ] . His s u b s e q u e n t s u c c e s s e s a t Chattanooga and h i s appointment as g e n e r a l −in −c h i e f o f a l l Union a r m i e s i n 1864 s o l i d i f i e d h i s p o s i t i o n as a n a t i o n a l hero [ [ 2 ] , [ 3 ] , [ 4 ] ] . ## L e a d e r s h i p S t y l e Grant ’ s l e a d e r s h i p s t y l e was c h a r a c t e r i z e d by h i s d e t e r m i n a t i o n and w i l l i n g n e s s t o t a k e r i s k s . He emphasized t h e importance o f r e l e n t l e s s p r e s s u r e on C o n f e d e r a t e f o r c e s , s t a t i n g , " The a r t o f war i s s i m p l e enough . Find out where your enemy i s . Get a t him as soon as you can . S t r i k e him as hard as you can , and keep moving on " [ [ 1 ] ] . This approach was e v i d e n t i n h i s Overland Campaign , where he s u f f e r e d heavy c a s u a l t i e s but u l t i m a t e l y wore down Lee ’ s army [ [ 2 ] , [ 3 ] ] . Grant ’ s a b i l i t y t o adapt and h i s s t r a t e g i c acumen , l e a r n e d from mentors l i k e Zachary Taylor and W i n f i e l d S c o t t , were c r u c i a l t o h i s s u c c e s s [ [ 3 ] ] . His d e c i s i o n t o c ut s u p p l y l i n e s d u r i n g th e Vicksburg campaign demonstrated h i s w i l l i n g n e s s t o c h a l l e n g e c o n v e n t i o n a l m i l i t a r y t a c t i c s [ [ 3 ] ] . 

> 15 Universal Deep Research: Bring Your Own Model and Strategy

## P o l i t i c a l Legacy Grant ’ s p r e s i d e n c y , from 1869 t o 1 8 7 7 , f o c u s e d on p r e s e r v i n g t h e Union and e n f o r c i n g R e c o n s t r u c t i o n p o l i c i e s [ [ 2 ] ] . He s u p p o r t e d t h e F i f t e e n t h Amendment , p r o t e c t i n g A f r i c a n American v o t i n g r i g h t s , and d e p l o y e d f e d e r a l t r o o p s t o combat t he Ku Klux Klan [ [ 2 ] ] . D e s p i t e s c a n d a l s t a r n i s h i n g h i s a d m i n i s t r a t i o n , Grant ’ s commitment t o R e c o n s t r u c t i o n and c i v i l r i g h t s u n d e r s c o r e d h i s d e d i c a t i o n t o a u n i f i e d n a t i o n [ [ 2 ] , [ 4 ] ] . His memoirs , w r i t t e n a f t e r l e a v i n g o f f i c e , p r o v i d e d v a l u a b l e i n s i g h t s i n t o h i s m i l i t a r y s t r a t e g i e s and p e r s o n a l e x p e r i e n c e s [ [ 4 ] ] . ## C o n c l u s i o n U l y s s e s S . Grant ’ s m i l i t a r y l e a d e r s h i p and s t r a t e g i c b r i l l i a n c e were i n s t r u m e n t a l i n t h e Union ’ s v i c t o r y i n t h e C i v i l War [ [ 2 ] , [ 3 ] , [ 4 ] ] . His p r e s i d e n c y , though marred by c o n t r o v e r s y , p l a y e d a c r u c i a l r o l e i n s h a p i n g R e c o n s t r u c t i o n and p r o t e c t i n g th e r i g h t s o f f o r m e r l y e n s l a v e d i n d i v i d u a l s [ [ 2 ] , [ 4 ] ] . As a n a t i o n a l hero and a symbol o f Union p r e s e r v a t i o n , Grant ’ s l e g a c y e n d u r e s as a t e s t a m e n t t o h i s unwavering r e s o l v e and m i l i t a r y acumen [ [ 1 ] , [ 2 ] , [ 3 ] , [ 4 ] ] . 

−−− − [ [ 0 ] ] [ L i s t o f th e B a t t l e s U l y s s e s S . Grant Fought In − Ranker ] [ 0 ] 

− [ [ 1 ] ] [ U l y s s e s S . Grant : A Map o f Key C i v i l War B a t t l e s | HISTORY ] [ 1 ] 

− [ [ 2 ] ] [ U l y s s e s S . Grant and t h e American C i v i l War − Wikipedia ] [ 2 ] 

− [ [ 3 ] ] [ Grant ’ s G r e a t e s t B a t t l e s | American E x p e r i e n c e | PBS ] [ 3 ] 

− [ [ 4 ] ] [ U l y s s e s S . Grant − American B a t t l e f i e l d Trust ] [ 4 ] [ 0 ] : h t t p s : / /www. r a n k e r . com/ l i s t / l i s t −of −a l l −u l y s s e s −s−grant −b a t t l e s / r e f e r e n c e [ 1 ] : h t t p s : / /www. h i s t o r y . com/ shows / g r a n t / i n t e r a c t i v e s / u l y s s e s −s−grant −b a t t l e −

map [ 2 ] : h t t p s : / / en . w i k i p e d i a . o rg / w i k i / Ulysses_S . _Grant_and_the_American_Civil_War [ 3 ] : h t t p s : / /www. pbs . org /wgbh/ a m e r i c a n e x p e r i e n c e / f e a t u r e s / g r a n t s −g r e a t e s t −

b a t t l e s / [ 4 ] : h t t p s : / /www. b a t t l e f i e l d s . org / l e a r n / b i o g r a p h i e s / u l y s s e s −s−g r a n t