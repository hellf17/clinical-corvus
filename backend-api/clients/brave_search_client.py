"""
Cliente HTTP para integração com Brave Search via servidor MCP existente.

Este cliente consome a funcionalidade de Brave Search já implementada no servidor MCP,
evitando duplicação de código e mantendo a arquitetura consistente.
"""

import httpx
import os
import logging
import re
from typing import List, Dict, Optional, Any, Union
from pydantic import BaseModel
from datetime import datetime

logger = logging.getLogger(__name__)

class BraveSearchResult(BaseModel):
    """Resultado individual de busca do Brave Search."""
    title: str
    url: str
    description: str
    source: str  # "web", "news", "infobox"
    published_time: Optional[str] = None

class BraveSearchResponse(BaseModel):
    """Resposta completa da busca no Brave Search."""
    query: str
    total_results: int
    results: List[BraveSearchResult]
    error: Optional[str] = None

# --- Enhanced Academic Database Search Configuration ---

ACADEMIC_DATABASES = {
    "cochrane": {
        "site": "cochranelibrary.com",
        "name": "Cochrane Library", 
        "tier": 1,
        "query_format": "site:cochranelibrary.com {query} systematic review OR meta-analysis",
        "description": "Systematic reviews and meta-analyses"
    },
    "sciencedirect": {
        "site": "sciencedirect.com",
        "name": "ScienceDirect",
        "tier": 1,
        "query_format": "site:sciencedirect.com {query} research article",
        "description": "Elsevier scientific publications"
    },
    "medrxiv": {
        "site": "medrxiv.org",
        "name": "medRxiv",
        "tier": 2,
        "query_format": "site:medrxiv.org {query} preprint",
        "description": "Medical preprints"
    },
    "science_gov": {
        "site": "science.gov",
        "name": "Science.gov",
        "tier": 2,
        "query_format": "site:science.gov {query} research",
        "description": "US government science portal"
    },
    "ncbi_bookshelf": {
        "site": "ncbi.nlm.nih.gov/books",
        "name": "NCBI Bookshelf",
        "tier": 1,
        "query_format": "site:ncbi.nlm.nih.gov/books {query} statpearls OR guidelines OR textbook",
        "description": "NCBI medical textbooks and references"
    },
    "ncbi_pmc": {
        "site": "ncbi.nlm.nih.gov/pmc",
        "name": "PubMed Central",
        "tier": 1,
        "query_format": "site:ncbi.nlm.nih.gov/pmc {query} free full text",
        "description": "Free full-text biomedical articles"
    },
    "uptodate": {
        "site": "uptodate.com",
        "name": "UpToDate",
        "tier": 1,
        "query_format": "site:uptodate.com {query} clinical OR treatment OR diagnosis",
        "description": "Clinical decision support"
    },
    "bmj": {
        "site": "bmj.com",
        "name": "BMJ",
        "tier": 1,
        "query_format": "site:bmj.com {query} research OR clinical OR review",
        "description": "British Medical Journal"
    },
    "nejm": {
        "site": "nejm.org",
        "name": "New England Journal of Medicine",
        "tier": 1,
        "query_format": "site:nejm.org {query} research OR clinical",
        "description": "NEJM articles"
    },
    "thelancet": {
        "site": "thelancet.com",
        "name": "The Lancet",
        "tier": 1,
        "query_format": "site:thelancet.com {query} research OR clinical",
        "description": "The Lancet medical journal"
    },
    "jama": {
        "site": "jamanetwork.com",
        "name": "JAMA Network", 
        "tier": 1,
        "query_format": "site:jamanetwork.com {query} research OR clinical",
        "description": "JAMA medical journals"
    },
    "bvsalud": {
        "site": "bvsalud.org",
        "name": "BVSalud",
        "tier": 1,
        "query_format": "site:bvsalud.org {query} research OR clinical",
        "description": "Biblioteca Virtual de Saúde"
    }
}

def optimize_query_for_academic_database(query: str, database_key: str, include_recent_years: bool = True) -> str:
    """
    Optimize query for specific academic database with enhanced medical context
    
    Args:
        query: Original search query
        database_key: Key from ACADEMIC_DATABASES
        include_recent_years: Whether to include recent year filters
    """
    if database_key not in ACADEMIC_DATABASES:
        return query
    
    db_config = ACADEMIC_DATABASES[database_key]
    
    # Extract key medical terms and concepts
    medical_keywords = extract_medical_keywords(query)
    
    # --- REFAC: Less restrictive queries for academic databases ---
    if database_key == "cochrane":
        enhanced_query = f"site:cochranelibrary.com {query}"
    elif database_key == "medrxiv":
        enhanced_query = f"site:medrxiv.org {query}"
    elif database_key == "ncbi_bookshelf":
        enhanced_query = f"site:ncbi.nlm.nih.gov/books {query}"
    elif database_key == "ncbi_pmc":
        enhanced_query = f"site:ncbi.nlm.nih.gov/pmc {query}"
    elif database_key == "bvsalud":
        enhanced_query = f"site:bvsalud.org {query}"
    else:
        enhanced_query = db_config["query_format"].format(
            query=query, 
            keywords=" OR ".join(medical_keywords[:4])  # Top 4 keywords
        )
    return enhanced_query

def extract_medical_keywords(query: str) -> List[str]:
    """Extract key medical terms from query for enhanced searching"""
    # Common medical terms that should be preserved/emphasized
    medical_terms = [
        "treatment", "therapy", "diagnosis", "clinical", "patient", "study", "trial",
        "medicine", "medical", "disease", "condition", "syndrome", "disorder",
        "guidelines", "protocol", "management", "intervention", "outcome",
        "systematic review", "meta-analysis", "randomized", "controlled", "evidence"
    ]
    
    query_lower = query.lower()
    found_terms = []
    
    # Extract explicit medical terms
    for term in medical_terms:
        if term in query_lower:
            found_terms.append(term)
    
    # Extract potential disease/condition names (typically nouns)
    words = re.findall(r'\b[a-zA-Z]{3,}\b', query)
    for word in words[:5]:  # Limit to first 5 words
        if word.lower() not in ["the", "and", "for", "with", "from", "that", "this"]:
            found_terms.append(word)
    
    return list(set(found_terms))  # Remove duplicates

def optimize_web_query_for_guidelines(query: str, target_years: Optional[List[int]] = None) -> str:
    """
    Otimiza queries web para encontrar guidelines e consensos médicos atuais
    
    Args:
        query: Query original
        target_years: Anos específicos para buscar (default: últimos 3 anos)
    """
    if target_years is None:
        current_year = datetime.now().year
        target_years = [current_year, current_year - 1, current_year - 2]
    
    # Detectar se é uma busca por guidelines/consensos
    query_lower = query.lower()
    
    # Mapeamento expandido de sociedades médicas por especialidade
    # Incluindo organizações brasileiras, europeias e internacionais
    medical_societies = {
        "sepsis": [
            # Internacionais
            "surviving sepsis campaign", "society of critical care medicine", 
            "european society of intensive care medicine", "international sepsis forum",
            # Brasileiras
            "associação de medicina intensiva brasileira", "amib", "sociedade brasileira de infectologia",
            # Europeias
            "european society of clinical microbiology", "escmid"
        ],
        "cardiology": [
            # Internacionais
            "american heart association", "european society of cardiology", "american college of cardiology",
            "world heart federation",
            # Brasileiras
            "sociedade brasileira de cardiologia", "sbc",
            # Europeias
            "esc guidelines", "european heart rhythm association", "ehra"
        ],
        "diabetes": [
            # Internacionais
            "american diabetes association", "european association for the study of diabetes",
            "international diabetes federation",
            # Brasileiras
            "sociedade brasileira de diabetes", "sbd", "sociedade brasileira de endocrinologia",
            # Europeias
            "easd guidelines", "diabetes uk"
        ],
        "hypertension": [
            # Internacionais
            "american heart association", "european society of hypertension", "international society of hypertension",
            # Brasileiras
            "sociedade brasileira de hipertensão", "sociedade brasileira de cardiologia",
            # Europeias
            "esh guidelines", "nice guidelines hypertension"
        ],
        "stroke": [
            # Internacionais
            "american stroke association", "european stroke organisation", "world stroke organization",
            # Brasileiras
            "organização mundial do avc", "sociedade brasileira de doenças cerebrovasculares",
            # Europeias
            "eso guidelines", "european stroke initiative"
        ],
        "cancer": [
            # Internacionais
            "american cancer society", "national comprehensive cancer network", "nccn",
            "european society for medical oncology", "international agency for research on cancer",
            # Brasileiras
            "instituto nacional de câncer", "sociedade brasileira de oncologia clínica",
            # Europeias
            "esmo guidelines", "european medicines agency"
        ],
        "pneumonia": [
            # Internacionais
            "infectious diseases society of america", "american thoracic society",
            "european respiratory society",
            # Brasileiras
            "sociedade brasileira de pneumologia", "sociedade brasileira de infectologia",
            # Europeias
            "ers guidelines", "british thoracic society"
        ],
        "infectious": [
            # Internacionais
            "infectious diseases society of america", "idsa", "european society of clinical microbiology",
            # Brasileiras
            "sociedade brasileira de infectologia",
            # Europeias
            "escmid guidelines"
        ],
        "emergency": [
            # Internacionais
            "american college of emergency physicians", "european society for emergency medicine",
            # Brasileiras
            "associação brasileira de medicina de emergência", "abramede",
            # Europeias
            "eusem guidelines", "royal college of emergency medicine"
        ],
        "intensive": [
            # Internacionais
            "society of critical care medicine", "european society of intensive care medicine",
            # Brasileiras
            "associação de medicina intensiva brasileira", "amib",
            # Europeias
            "esicm guidelines"
        ],
        "pediatrics": [
            # Internacionais
            "american academy of pediatrics", "european paediatric association",
            # Brasileiras
            "sociedade brasileira de pediatria",
            # Europeias
            "espid"
        ],
        "nephrology": [
            # Internacionais
            "kidney disease improving global outcomes", "kdigo", "american society of nephrology",
            # Brasileiras
            "sociedade brasileira de nefrologia",
            # Europeias
            "european renal association"
        ],
        "gastroenterology": [
            # Internacionais
            "american gastroenterological association", "world gastroenterology organisation",
            # Brasileiras
            "federação brasileira de gastroenterologia", "sociedade brasileira de endoscopia digestiva",
            # Europeias
            "european association for the study of the liver", "easl"
        ],
        "psychiatry": [
            # Internacionais
            "american psychiatric association", "world psychiatric association",
            # Brasileiras
            "associação brasileira de psiquiatria", "abp",
            # Europeias
            "european psychiatric association", "royal college of psychiatrists"
        ],
        "anesthesia": [
            # Internacionais
            "american society of anesthesiologists", "european society of anaesthesiology",
            # Brasileiras
            "sociedade brasileira de anestesiologia", "sba",
            # Europeias
            "esa guidelines"
        ],
        "surgery": [
            # Internacionais
            "american college of surgeons", "international college of surgeons",
            # Brasileiras
            "colégio brasileiro de cirurgiões", "sociedade brasileira de cirurgia",
            # Europeias
            "european society of surgery", "royal college of surgeons"
        ],
        "obstetrics": [
            # Internacionais
            "american college of obstetricians and gynecologists", "international federation of gynecology and obstetrics",
            # Brasileiras
            "federação brasileira das associações de ginecologia e obstetrícia", "febrasgo",
            # Europeias
            "european society of gynaecology", "royal college of obstetricians"
        ],
        "orthopedics": [
            # Internacionais
            "american academy of orthopaedic surgeons", "international association of orthopaedic surgeons",
            # Brasileiras
            "sociedade brasileira de ortopedia e traumatologia",
            # Europeias
            "european federation of national associations of orthopaedics"
        ],
        "dermatology": [
            # Internacionais
            "american academy of dermatology", "international league of dermatological societies",
            # Brasileiras
            "sociedade brasileira de dermatologia",
            # Europeias
            "european academy of dermatology and venereology"
        ]
    }
    
    # Detectar especialidade médica na query
    detected_specialty = None
    for specialty, societies in medical_societies.items():
        if any(term in query_lower for term in [specialty, *[s.split()[0] for s in societies[:2]]]):
            detected_specialty = specialty
            break
    
    # Construir query otimizada
    base_terms = ["guidelines", "consensus", "recommendations", "protocol", "clinical practice"]
    year_terms = [str(year) for year in target_years]
    
    if detected_specialty and detected_specialty in medical_societies:
        # Incluir sociedades médicas específicas
        societies = medical_societies[detected_specialty][:3]  # Top 3 sociedades
        society_terms = " OR ".join([f'"{society}"' for society in societies])
        optimized_query = f'({query}) AND ({" OR ".join(base_terms)}) AND ({" OR ".join(year_terms)}) AND ({society_terms})'
    else:
        # Query genérica para guidelines
        optimized_query = f'({query}) AND ({" OR ".join(base_terms)}) AND ({" OR ".join(year_terms)})'
    
    return optimized_query

def detect_source_quality_type(url: str, title: str, description: str) -> tuple[str, float]:
    """
    Detecta o tipo e qualidade da fonte baseado em URL, título e descrição
    PRIORIZA SEMPRE QUALIDADE CIENTÍFICA SOBRE IDIOMA
    
    Returns:
        tuple: (source_type, quality_score)
        source_type: "primary_research", "guidelines", "medical_news", "blog", "discussion", "other"
        quality_score: 0.0-1.0 (higher is better)
    """
    url_lower = url.lower()
    title_lower = title.lower()
    desc_lower = description.lower()
    
    # TIER 1: FONTES CIENTÍFICAS DE ELITE (Score: 0.95-1.0)
    elite_scientific_sources = [
        "pubmed.ncbi.nlm.nih.gov", "pmc.ncbi.nlm.nih.gov", "ncbi.nlm.nih.gov",
        "nejm.org", "thelancet.com", "jamanetwork.com", "nature.com", "bmj.com",
        "science.org", "cell.com", "pnas.org", "jci.org"
    ]
    
    # TIER 2: JOURNALS DE ALTO IMPACTO (Score: 0.85-0.95)
    high_impact_journals = [
        "annals.org", "sciencedirect.com", "springer.com", "wiley.com", 
        "academic.oup.com", "cambridge.org", "journals.lww.com", "karger.com",
        "ccforum.biomedcentral.com", "intensive-care-medicine.com",
        "criticalcaremedicine.com", "chestjournal.org", "atsjournals.org",
        "cid.oxfordjournals.org", "jid.oxfordjournals.org"
    ]
    
    # TIER 3: BASES CIENTÍFICAS REGIONAIS DE QUALIDADE (Score: 0.75-0.85)
    regional_scientific_sources = [
        "scielo.br", "scielo.org", "rbcp.org.br", "ramb.org.br",
        "rbti.org.br", "arquivosonline.com.br",
        "eurheartj.oxfordjournals.org", "erj.ersjournals.com"
    ]
    
    # TIER 1: ORGANIZAÇÕES OFICIAIS INTERNACIONAIS (Score: 0.90-0.95)
    elite_guidelines_sources = [
        "who.int", "cdc.gov", "nih.gov", "nice.org.uk", "cochrane.org",
        "survivingsepsis.org", "sccm.org", "esicm.org", "idsa.org",
        "acc.org", "heart.org", "nccn.org", "kdigo.org"
    ]
    
    # TIER 2: ORGANIZAÇÕES NACIONAIS OFICIAIS (Score: 0.80-0.90)
    national_guidelines_sources = [
        "saude.gov.br", "anvisa.gov.br", "inca.gov.br", "cfm.org.br",
        "amib.org.br", "cardiol.br", "sbc.org.br", "ema.europa.eu", "ecdc.europa.eu"
    ]
    
    # EXCLUSÃO TOTAL: BLOGS E DISCUSSÕES (Score: 0.0-0.2)
    excluded_sources = [
        "webmd.com", "minhavida.com.br",
        "tuasaude.com", "drauziovarella.uol.com.br", "sanarmed.com",
        "blog.", "wordpress.", "blogspot.", "medium.com", "reddit.com",
        "quora.com", "facebook.com", "twitter.com", "linkedin.com",
        "researchgate.net/post", "academia.edu/post", "afya.com.br"
    ]
    
    # NOTÍCIAS MÉDICAS (Score: 0.4-0.6) - QUALIDADE LIMITADA
    medical_news_sources = [
        "medicalnewstoday.com", "healthline.com", "verywellhealth.com",
        "pebmed.com.br", "medscape.com", "medscape.org",
        "healio.com", "mdedge.com", "medpagetoday.com"
    ]
    
    # Indicadores de artigos científicos no conteúdo
    research_article_patterns = [
        "systematic review", "meta-analysis", "randomized controlled trial",
        "clinical trial", "cohort study", "case-control", "prospective study",
        "retrospective study", "cross-sectional", "peer-reviewed",
        "doi:", "pmid:", "published in", "journal"
    ]
    
    # ANÁLISE HIERÁRQUICA POR QUALIDADE CIENTÍFICA
    
    # TIER 1: Elite Scientific Sources
    if any(source in url_lower for source in elite_scientific_sources):
        if any(pattern in title_lower or pattern in desc_lower for pattern in research_article_patterns):
            return ("primary_research", 1.0)
        elif "pubmed" in url_lower or "doi:" in desc_lower or "pmid:" in desc_lower:
            return ("primary_research", 0.98)
        else:
            return ("primary_research", 0.95)
    
    # TIER 2: High Impact Journals
    elif any(source in url_lower for source in high_impact_journals):
        if any(pattern in title_lower or pattern in desc_lower for pattern in research_article_patterns):
            return ("primary_research", 0.92)
        else:
            return ("primary_research", 0.88)
    
    # TIER 3: Regional Scientific Sources (apenas se realmente científicos)
    elif any(source in url_lower for source in regional_scientific_sources):
        if any(pattern in title_lower or pattern in desc_lower for pattern in research_article_patterns):
            return ("primary_research", 0.82)
        else:
            return ("primary_research", 0.78)
    
    # TIER 1: Elite Guidelines
    elif any(source in url_lower for source in elite_guidelines_sources):
        return ("guidelines", 0.92)
    
    # TIER 2: National Guidelines
    elif any(source in url_lower for source in national_guidelines_sources):
        return ("guidelines", 0.85)
    
    # EXCLUSÃO TOTAL: Blogs e discussões
    elif any(source in url_lower for source in excluded_sources):
        return ("blog", 0.1)
    
    # QUALIDADE LIMITADA: Notícias médicas
    elif any(source in url_lower for source in medical_news_sources):
        return ("medical_news", 0.5)
    
    # ANÁLISE DE CONTEÚDO para fontes não categorizadas
    else:
        # Verificar padrões científicos no conteúdo
        if any(pattern in title_lower or pattern in desc_lower for pattern in research_article_patterns):
            return ("primary_research", 0.75)  # Fonte desconhecida mas com padrões científicos
        
        # Verificar padrões de guidelines
        elif any(term in title_lower or term in desc_lower for term in [
            "guideline", "guidelines", "consensus", "recommendation", "protocol"
        ]):
            return ("guidelines", 0.65)
        
        # Verificar padrões de blog/discussão
        elif any(term in title_lower or term in desc_lower for term in [
            "blog", "post", "discussion", "forum", "comment", "opinion",
            "what i think", "my experience", "personal", "story"
        ]):
            return ("blog", 0.2)
        
        # Verificar se é notícia médica
        elif any(term in title_lower for term in [
            "news", "breaking", "latest", "update", "report", "announces"
        ]):
            return ("medical_news", 0.4)
        
        else:
            return ("other", 0.3)  # Fonte desconhecida, qualidade incerta

def enhance_query_with_medical_context(query: str, search_type: str = "general") -> str:
    """
    Melhora queries com contexto médico específico, SEMPRE EM INGLÊS para maximizar qualidade científica
    
    Args:
        query: Query original (pode ser em qualquer idioma)
        search_type: Tipo de busca ("guidelines", "research", "general")
    """
    
    # TRADUÇÃO AUTOMÁTICA DE TERMOS MÉDICOS PORTUGUESES PARA INGLÊS
    portuguese_to_english_medical_terms = {
        # Condições médicas
        "sepse": "sepsis",
        "choque séptico": "septic shock",
        "infecção": "infection",
        "antibióticos": "antibiotics",
        "hipertensão": "hypertension",
        "diabetes": "diabetes",
        "pneumonia": "pneumonia",
        "insuficiência cardíaca": "heart failure",
        "infarto": "myocardial infarction",
        "avc": "stroke",
        "câncer": "cancer",
        "tumor": "tumor",
        "cirurgia": "surgery",
        "anestesia": "anesthesia",
        
        # Termos de pesquisa
        "tratamento": "treatment",
        "diagnóstico": "diagnosis",
        "terapia": "therapy",
        "medicamento": "medication",
        "dose": "dose",
        "tempo": "time",
        "duração": "duration",
        "eficácia": "efficacy",
        "segurança": "safety",
        "efeitos colaterais": "side effects",
        "mortalidade": "mortality",
        "sobrevida": "survival",
        "prognóstico": "prognosis",
        
        # Tipos de estudo
        "estudo": "study",
        "ensaio clínico": "clinical trial",
        "revisão sistemática": "systematic review",
        "meta-análise": "meta-analysis",
        "estudo de coorte": "cohort study",
        "caso-controle": "case-control",
        "randomizado": "randomized",
        
        # Termos de guidelines
        "diretriz": "guideline",
        "diretrizes": "guidelines",
        "consenso": "consensus",
        "recomendação": "recommendation",
        "protocolo": "protocol",
        "sociedade": "society",
        "associação": "association"
    }
    
    # Converter query para inglês se necessário
    english_query = query.lower()
    for pt_term, en_term in portuguese_to_english_medical_terms.items():
        english_query = english_query.replace(pt_term, en_term)
    
    query_enhancements = {
        "research": {
            "terms": [
                "systematic review", "meta-analysis", "randomized controlled trial", 
                "clinical trial", "cohort study", "prospective study",
                "pubmed", "journal", "research article", "peer-reviewed",
                "evidence-based medicine", "clinical evidence"
            ],
            "sources": [
                "site:pubmed.ncbi.nlm.nih.gov", "site:nejm.org", "site:thelancet.com",
                "site:jamanetwork.com", "site:bmj.com", "site:nature.com",
                "site:science.org", "site:cell.com", "site:pnas.org"
            ],
            "exclusions": [
                "-site:pebmed.com.br", "-site:medscape.com", "-site:webmd.com",
                "-site:blog", "-site:wordpress", "-site:blogspot",
                "-site:minhavida.com.br", "-site:tuasaude.com", "-site:afya.com.br",
                "-site:sanarmed.com", "-site:drauziovarella"
            ]
        },
        "guidelines": {
            "terms": [
                "clinical practice guidelines", "evidence-based recommendations", 
                "treatment protocols", "consensus statement", "society guidelines",
                "clinical consensus", "practice recommendations", "treatment guidelines"
            ],
            "sources": [
                "site:who.int", "site:cdc.gov", "site:nih.gov", "site:nice.org.uk",
                "site:survivingsepsis.org", "site:sccm.org", "site:esicm.org",
                "site:idsa.org", "site:acc.org", "site:heart.org"
            ],
            "exclusions": [
                "-site:pebmed.com.br", "-site:blog", "-site:wordpress",
                "-site:medscape.com", "-site:afya.com.br"
            ]
        },
        "general": {
            "terms": [
                "medical research", "clinical evidence", "healthcare guidelines",
                "evidence-based medicine", "clinical practice"
            ],
            "sources": [
                "site:who.int", "site:cdc.gov", "site:nih.gov",
                "site:pubmed.ncbi.nlm.nih.gov", "site:cochrane.org"
            ],
            "exclusions": [
                "-site:blog", "-site:wordpress", "-site:pebmed.com.br",
                "-site:afya.com.br", "-site:medscape.com"
            ]
        }
    }
    
    enhancements = query_enhancements.get(search_type, query_enhancements["general"])
    
    # Construir query otimizada SEMPRE EM INGLÊS
    enhanced_parts = [english_query]
    
    # Adicionar contexto médico científico em inglês
    query_lower = english_query.lower()
    medical_terms = ["medical", "clinical", "health", "treatment", "diagnosis", "therapy"]
    
    if not any(term in query_lower for term in medical_terms):
        enhanced_parts.append(f"({enhancements['terms'][0]})")
    
    # Para research, adicionar termos específicos de estudos científicos
    if search_type == "research":
        study_terms = " OR ".join(enhancements['terms'][:4])  # Primeiros 4 termos
        enhanced_parts.append(f"({study_terms})")
        
        # Adicionar restrições de site para fontes primárias de elite
        site_restrictions = " OR ".join(enhancements['sources'][:4])  # Top 4 sources
        enhanced_parts.append(f"({site_restrictions})")
    
    # Para guidelines, focar em organizações oficiais internacionais
    elif search_type == "guidelines":
        guideline_terms = " OR ".join(enhancements['terms'][:3])
        enhanced_parts.append(f"({guideline_terms})")
        
        # Priorizar organizações internacionais
        international_sources = " OR ".join(enhancements['sources'][:3])
        enhanced_parts.append(f"({international_sources})")
    
    # Adicionar exclusões rigorosas para evitar blogs e conteúdo de baixa qualidade
    exclusions = " ".join(enhancements['exclusions'])
    if exclusions:
        enhanced_parts.append(exclusions)
    
    # Adicionar filtro adicional para priorizar inglês em fontes científicas
    if search_type == "research":
        enhanced_parts.append('(english OR "english language" OR "peer reviewed")')
    
    final_query = " ".join(enhanced_parts)
    logger.info(f"Enhanced ENGLISH query for {search_type}: {final_query}")
    return final_query

class BraveSearchClient:
    """Cliente para busca web usando Brave Search via servidor MCP."""
    
    def __init__(self):
        self.base_url = os.getenv("MCP_SERVER_URL", "http://localhost:8765")
        if not self.base_url.startswith(('http://', 'https://')):
            self.base_url = f"http://{self.base_url}"
            
        logger.info(f"Brave Search Client inicializado com URL: {self.base_url}")
        self.client = httpx.AsyncClient(base_url=self.base_url, timeout=30.0)
    
    async def search_brave(
        self, 
        query: str, 
        count: int = 15,  # Aumentado de 10 para 15
        offset: int = 0,
        search_type: str = "general",
        optimize_for_guidelines: bool = False,
        skip_internal_optimization: bool = False # New parameter
    ) -> BraveSearchResponse:
        """
        Realiza busca web usando Brave Search via servidor MCP com otimizações.
        
        Args:
            query: Termo de busca
            count: Número de resultados (máximo 20, padrão 15)
            offset: Offset para paginação (máximo 9)
            search_type: Tipo de busca ("guidelines", "research", "general")
            optimize_for_guidelines: Se deve otimizar especificamente para guidelines
            skip_internal_optimization: If True, use the query as-is without further internal optimization.
            
        Returns:
            BraveSearchResponse com os resultados formatados
        """
        try:
            optimized_query = query
            if not skip_internal_optimization:
                if optimize_for_guidelines:
                    optimized_query = optimize_web_query_for_guidelines(query)
                    logger.info(f"Internally optimized query for guidelines: {optimized_query}")
                else:
                    optimized_query = enhance_query_with_medical_context(query, search_type)
                    logger.info(f"Internally enhanced query with medical context: {optimized_query}")
            else:
                logger.info(f"Skipping internal query optimization, using provided query: {query}")
            
            # Preparar parâmetros para busca web direta
            params = {
                "query": optimized_query,
                "count": min(count, 20),  # Máximo 20
                "offset": min(offset, 9)
            }
            
            logger.info(f"Enviando busca web otimizada para MCP server: '{optimized_query}' (count: {count}, offset: {offset})")
            
            # Fazer requisição direta para endpoint de busca web
            response = await self.client.get("/brave-search", params=params)
            response.raise_for_status()
            
            search_data = response.json()
            
            # Verificar se houve erro na busca
            if search_data.get("error") and not search_data.get("results"):
                logger.error(f"Erro na busca Brave: {search_data['error']}")
                return BraveSearchResponse(
                    query=optimized_query,
                    total_results=0,
                    results=[],
                    error=search_data["error"]
                )
            
            # Converter resultados para o formato esperado
            brave_results = []
            for item in search_data.get("results", []):
                brave_results.append(BraveSearchResult(
                    title=item.get("title", ""),
                    url=item.get("url", ""),
                    description=item.get("description", ""),
                    source=item.get("source", "web"),
                    published_time=item.get("published_time")
                ))
            
            # Filtrar resultados por relevância e recência
            filtered_results = self._filter_results_by_quality(brave_results, query, search_type)
            
            logger.info(f"Busca Brave retornou {len(filtered_results)} resultados filtrados de {len(brave_results)} totais")
            
            return BraveSearchResponse(
                query=search_data.get("query", optimized_query),
                total_results=search_data.get("total_results", len(filtered_results)),
                results=filtered_results
            )
            
        except httpx.RequestError as e:
            logger.error(f"Erro de conexão com servidor MCP: {e}")
            return BraveSearchResponse(
                query=query,
                total_results=0,
                results=[],
                error=f"Erro de conexão: {str(e)}"
            )
        except httpx.HTTPStatusError as e:
            logger.error(f"Servidor MCP retornou erro {e.response.status_code}: {e.response.text}")
            return BraveSearchResponse(
                query=query,
                total_results=0,
                results=[],
                error=f"Erro do servidor: {e.response.status_code}"
            )
        except Exception as e:
            logger.error(f"Erro inesperado na busca Brave: {e}", exc_info=True)
            return BraveSearchResponse(
                query=query,
                total_results=0,
                results=[],
                error=f"Erro inesperado: {str(e)}"
            )
    
    def _filter_results_by_quality(self, results: List[BraveSearchResult], original_query: str, search_type: str) -> List[BraveSearchResult]:
        """
        Filtra resultados por qualidade e relevância, PRIORIZANDO SEMPRE FONTES CIENTÍFICAS DE ELITE
        """
        filtered_results = []
        
        # Traduzir query para inglês para melhor matching
        portuguese_to_english = {
            "sepse": "sepsis", "antibióticos": "antibiotics", "tempo": "time",
            "tratamento": "treatment", "diagnóstico": "diagnosis", "terapia": "therapy",
            "estudo": "study", "ensaio": "trial", "revisão": "review"
        }
        
        english_query = original_query.lower()
        for pt_term, en_term in portuguese_to_english.items():
            english_query = english_query.replace(pt_term, en_term)
        
        query_terms = english_query.split()
        
        for result in results:
            score = 0
            url_lower = result.url.lower()
            title_lower = result.title.lower()
            desc_lower = result.description.lower()
            
            # NOVA DETECÇÃO DE QUALIDADE DA FONTE
            source_type, quality_score = detect_source_quality_type(result.url, result.title, result.description)
            
            # EXCLUSÃO IMEDIATA: Blogs e discussões de baixa qualidade
            if source_type == "blog" and quality_score < 0.3:
                logger.debug(f"Excluindo blog/discussão: {result.title[:50]}... - URL: {result.url}")
                continue
            
            # PONTUAÇÃO BASE pela qualidade da fonte (peso aumentado)
            score += quality_score * 15  # Aumentado de 10 para 15 para dar mais peso à qualidade
            
            # BONUS ESPECÍFICO por tipo de fonte (aumentados)
            if source_type == "primary_research":
                score += 20  # Aumentado de 15 para 20 - MÁXIMA PRIORIDADE para pesquisa primária
                logger.debug(f"ELITE RESEARCH detectado: {result.title[:50]}... (score base: {score})")
                
            elif source_type == "guidelines":
                score += 15  # Aumentado de 10 para 15 - ALTA PRIORIDADE para guidelines
                logger.debug(f"OFFICIAL GUIDELINE detectado: {result.title[:50]}... (score base: {score})")
                
            elif source_type == "medical_news":
                # Penalizar notícias médicas mais severamente
                if search_type == "research":
                    score -= 5  # Penalidade para notícias em busca de research
                else:
                    score += 1  # Bonus mínimo apenas para guidelines
                
            # EXCLUSÃO: Fontes de baixa qualidade em buscas de research
            elif search_type == "research" and source_type in ["blog", "medical_news"] and quality_score < 0.7:
                logger.debug(f"Excluindo fonte de baixa qualidade para research: {result.title[:50]}...")
                continue
            
            # Score baseado na relevância do título (peso aumentado para termos em inglês)
            title_matches = sum(1 for term in query_terms if term in title_lower)
            score += title_matches * 4  # Aumentado de 3 para 4
            
            # Score baseado na descrição
            desc_matches = sum(1 for term in query_terms if term in desc_lower)
            score += desc_matches * 2  # Aumentado de 1 para 2
            
            # Bonus para termos específicos por tipo de busca (em inglês)
            if search_type == "guidelines":
                guideline_terms = [
                    "guideline", "guidelines", "consensus", "recommendation", "protocol",
                    "clinical practice", "evidence-based", "society statement"
                ]
                if any(term in title_lower or term in desc_lower for term in guideline_terms):
                    score += 6  # Aumentado de 4 para 6
            
            elif search_type == "research":
                research_terms = [
                    "systematic review", "meta-analysis", "randomized controlled trial",
                    "clinical trial", "cohort study", "case-control", "prospective",
                    "retrospective", "peer-reviewed", "evidence-based"
                ]
                if any(term in title_lower or term in desc_lower for term in research_terms):
                    score += 8  # Aumentado de 5 para 8
            
            # Bonus MÁXIMO para fontes científicas de elite
            elite_indicators = [
                "pubmed", "nejm", "lancet", "jama", "nature", "bmj", "science",
                "cell", "pnas", "cochrane", "who", "cdc", "nih"
            ]
            if any(indicator in url_lower for indicator in elite_indicators):
                score += 10  # BONUS MÁXIMO para fontes de elite
            
            # Bonus para organizações oficiais internacionais
            international_orgs = [
                "who.int", "cdc.gov", "nih.gov", "nice.org.uk", "cochrane.org",
                "survivingsepsis.org", "sccm.org", "esicm.org", "idsa.org"
            ]
            if any(org in url_lower for org in international_orgs):
                score += 8  # Bonus alto para organizações internacionais
            
            # REMOÇÃO DO BONUS PORTUGUÊS - Não mais priorizar conteúdo em português
            # O foco agora é 100% na qualidade científica independente do idioma
            
            # FILTRO FINAL: Score mínimo MUITO MAIS RIGOROSO
            if search_type == "research":
                min_score = 25 if source_type == "primary_research" else 35  # Muito mais rigoroso
            elif search_type == "guidelines":
                min_score = 20 if source_type in ["guidelines", "primary_research"] else 30
            else:
                min_score = 15  # Menos rigoroso apenas para busca geral
            
            if score >= min_score:
                filtered_results.append(result)
                logger.debug(f"✅ INCLUÍDO ({source_type}, score={score:.1f}): {result.title[:50]}...")
            else:
                logger.debug(f"❌ EXCLUÍDO por score baixo ({source_type}, score={score:.1f}): {result.title[:50]}...")
        
        # Ordenar por relevância e qualidade científica
        def calculate_sort_score(result):
            title_matches = sum(1 for term in query_terms if term in result.title.lower())
            source_type, quality_score = detect_source_quality_type(result.url, result.title, result.description)
            
            # Prioridade MÁXIMA: qualidade científica + relevância
            elite_bonus = 0
            if any(elite in result.url.lower() for elite in ["pubmed", "nejm", "lancet", "jama", "nature", "bmj"]):
                elite_bonus = 20
            
            return (quality_score * 15) + (title_matches * 3) + elite_bonus
        
        filtered_results.sort(key=calculate_sort_score, reverse=True)
        
        logger.info(f"Filtrados {len(filtered_results)} resultados de ALTA QUALIDADE CIENTÍFICA de {len(results)} totais")
        return filtered_results
    
    async def search_for_guidelines(self, condition: str, count: int = 15, skip_internal_optimization: bool = False) -> BraveSearchResponse:
        """
        Busca específica para guidelines clínicos
        """
        query = f"clinical guidelines {condition} treatment recommendations"
        return await self.search_brave(
            query=query,
            count=count,
            search_type="guidelines",
            optimize_for_guidelines=True,
            skip_internal_optimization=skip_internal_optimization
        )
    
    async def search_for_medical_societies(self, topic: str, count: int = 10, skip_internal_optimization: bool = False) -> BraveSearchResponse:
        """
        Busca específica em sites de sociedades médicas
        """
        query = f"{topic} medical society guidelines recommendations consensus"
        return await self.search_brave(
            query=query,
            count=count,
            search_type="guidelines",
            optimize_for_guidelines=True,
            skip_internal_optimization=skip_internal_optimization
            )
    
    async def close(self):
        """Fecha o cliente HTTP."""
        await self.client.aclose()
        logger.info("Brave Search Client fechado")

# Instância global do cliente (singleton pattern)
_brave_client = None

async def get_brave_client() -> BraveSearchClient:
    """Obtém instância singleton do cliente Brave Search."""
    global _brave_client
    if _brave_client is None:
        _brave_client = BraveSearchClient()
    return _brave_client

async def search_brave_web(
    query: str, 
    count: int = 15,  # Aumentado de 10 para 15
    offset: int = 0,
    search_type: str = "general",
    optimize_for_guidelines: bool = False,
    skip_internal_optimization: bool = False # New parameter
) -> BraveSearchResponse:
    """
    Função de conveniência para busca web otimizada.
    
    Args:
        query: Termo de busca
        count: Número de resultados (padrão 15)
        offset: Offset para paginação
        search_type: Tipo de busca ("guidelines", "research", "general")
        optimize_for_guidelines: Se deve otimizar para guidelines
        skip_internal_optimization: If True, use the query as-is.
        
    Returns:
        BraveSearchResponse com resultados
    """
    client = await get_brave_client()
    return await client.search_brave(query, count, offset, search_type, optimize_for_guidelines, skip_internal_optimization)

async def search_medical_guidelines(condition: str, count: int = 15, skip_internal_optimization: bool = False) -> BraveSearchResponse: # Added skip
    """
    Função específica para buscar guidelines médicos
    """
    client = await get_brave_client()
    # optimize_for_guidelines is True by default here in the client.search_brave call
    return await client.search_for_guidelines(condition, count, skip_internal_optimization=skip_internal_optimization) # Pass skip

# Sistema de avaliação de qualidade de fontes web para pesquisa médica
# Baseado em autoridade, confiabilidade e impacto científico

WEB_SOURCE_QUALITY_METRICS = {
    # TIER 1: Fontes de Elite Científica (Score: 0.95-1.0)
    "pubmed.ncbi.nlm.nih.gov": {"quality_score": 1.0, "tier": 1, "authority": "government", "type": "primary_research"},
    "nejm.org": {"quality_score": 0.98, "tier": 1, "authority": "journal", "type": "primary_research"},
    "thelancet.com": {"quality_score": 0.98, "tier": 1, "authority": "journal", "type": "primary_research"},
    "jamanetwork.com": {"quality_score": 0.97, "tier": 1, "authority": "journal", "type": "primary_research"},
    "nature.com": {"quality_score": 0.97, "tier": 1, "authority": "journal", "type": "primary_research"},
    "science.org": {"quality_score": 0.96, "tier": 1, "authority": "journal", "type": "primary_research"},
    "bmj.com": {"quality_score": 0.96, "tier": 1, "authority": "journal", "type": "primary_research"},
    "cell.com": {"quality_score": 0.95, "tier": 1, "authority": "journal", "type": "primary_research"},
    
    # TIER 2: Organizações Oficiais e Guidelines (Score: 0.8-0.9)
    "who.int": {"quality_score": 0.9, "tier": 2, "authority": "international_org", "type": "guidelines"},
    "cdc.gov": {"quality_score": 0.9, "tier": 2, "authority": "government", "type": "guidelines"},
    "nih.gov": {"quality_score": 0.9, "tier": 2, "authority": "government", "type": "guidelines"},
    "nice.org.uk": {"quality_score": 0.88, "tier": 2, "authority": "government", "type": "guidelines"},
    "uptodate.com": {"quality_score": 0.85, "tier": 2, "authority": "clinical_resource", "type": "guidelines"},
    "cochranelibrary.com": {"quality_score": 0.9, "tier": 2, "authority": "journal", "type": "systematic_reviews"},
    "survivingsepsis.org": {"quality_score": 0.85, "tier": 2, "authority": "medical_society", "type": "guidelines"},
    "acc.org": {"quality_score": 0.83, "tier": 2, "authority": "medical_society", "type": "guidelines"},
    "heart.org": {"quality_score": 0.83, "tier": 2, "authority": "medical_society", "type": "guidelines"},
    "diabetes.org": {"quality_score": 0.82, "tier": 2, "authority": "medical_society", "type": "guidelines"},
    
    # Organizações Brasileiras Oficiais
    "gov.br": {"quality_score": 0.8, "tier": 2, "authority": "government", "type": "guidelines"},
    "anvisa.gov.br": {"quality_score": 0.82, "tier": 2, "authority": "government", "type": "guidelines"},
    "inca.gov.br": {"quality_score": 0.8, "tier": 2, "authority": "government", "type": "guidelines"},
    "cardiol.br": {"quality_score": 0.75, "tier": 3, "authority": "medical_society", "type": "guidelines"},
    "diabetes.org.br": {"quality_score": 0.75, "tier": 3, "authority": "medical_society", "type": "guidelines"},
    "amib.org.br": {"quality_score": 0.75, "tier": 3, "authority": "medical_society", "type": "guidelines"},
    
    # TIER 3: Journals Científicos Respeitáveis (Score: 0.6-0.8)
    "sciencedirect.com": {"quality_score": 0.75, "tier": 3, "authority": "publisher", "type": "primary_research"},
    "springer.com": {"quality_score": 0.75, "tier": 3, "authority": "publisher", "type": "primary_research"},
    "wiley.com": {"quality_score": 0.75, "tier": 3, "authority": "publisher", "type": "primary_research"},
    "journals.lww.com": {"quality_score": 0.7, "tier": 3, "authority": "publisher", "type": "primary_research"},
    "plos.org": {"quality_score": 0.7, "tier": 3, "authority": "journal", "type": "primary_research"},
    "scielo.br": {"quality_score": 0.65, "tier": 3, "authority": "regional_database", "type": "primary_research"},
    
    # TIER 4: Fontes Médicas Secundárias (Score: 0.4-0.6) - Limitado
    "medscape.com": {"quality_score": 0.5, "tier": 4, "authority": "medical_news", "type": "medical_news"},
    "mayoclinic.org": {"quality_score": 0.6, "tier": 4, "authority": "hospital", "type": "patient_education"},
    "clevelandclinic.org": {"quality_score": 0.6, "tier": 4, "authority": "hospital", "type": "patient_education"},
    "hopkinsmedicine.org": {"quality_score": 0.6, "tier": 4, "authority": "hospital", "type": "patient_education"},
    
    # TIER 5: Fontes Excluídas (Score: 0.1-0.2) - BLOQUEADAS
    "pebmed.com.br": {"quality_score": 0.2, "tier": 5, "authority": "blog", "type": "blog"},
    "webmd.com": {"quality_score": 0.2, "tier": 5, "authority": "commercial", "type": "patient_education"},
    "healthline.com": {"quality_score": 0.2, "tier": 5, "authority": "commercial", "type": "patient_education"},
    "wikipedia.org": {"quality_score": 0.1, "tier": 5, "authority": "wiki", "type": "encyclopedia"},
}

def assess_web_source_quality(url: str, title: str = "", snippet: str = "") -> Dict[str, Union[float, int, str]]:
    """
    Avalia a qualidade científica de uma fonte web baseada em métricas de autoridade
    
    Args:
        url: URL da fonte
        title: Título do artigo/página
        snippet: Snippet/resumo do conteúdo
        
    Returns:
        Dict com quality_score, tier, authority, type
    """
    if not url:
        return {"quality_score": 0.1, "tier": 5, "authority": "unknown", "type": "unknown"}
    
    url_lower = url.lower()
    
    # Busca exata por domínio
    for domain, metrics in WEB_SOURCE_QUALITY_METRICS.items():
        if domain in url_lower:
            return metrics
    
    # Análise por padrões de URL para fontes não mapeadas
    
    # Padrões de alta qualidade
    high_quality_patterns = [
        "doi.org", "dx.doi.org",  # DOIs sempre indicam artigos científicos
        "ncbi.nlm.nih.gov",      # Qualquer coisa do NCBI
        "cochrane",              # Cochrane reviews
        "systematic-review",     # Revisões sistemáticas
        "meta-analysis"          # Meta-análises
    ]
    
    # Padrões de organizações governamentais/oficiais
    government_patterns = [
        ".gov", ".gov.br", ".nhs.uk", ".europa.eu",
        "ministry", "ministerio", "health-department"
    ]
    
    # Padrões de journals científicos
    journal_patterns = [
        "journal", "review", "research", "clinical",
        "medicine", "medical", "science", "nature"
    ]
    
    # Padrões de blogs/fontes não confiáveis (EXCLUIR)
    excluded_patterns = [
        "blog", "wordpress", "medium.com", "facebook", "twitter",
        "instagram", "youtube", "tiktok", "reddit", "quora",
        "answers.com", "ask.com", "ehow", "wikihow"
    ]
    
    # Verificar padrões de exclusão primeiro
    if any(pattern in url_lower for pattern in excluded_patterns):
        return {"quality_score": 0.1, "tier": 5, "authority": "blog", "type": "excluded"}
    
    # Verificar padrões de alta qualidade
    if any(pattern in url_lower for pattern in high_quality_patterns):
        return {"quality_score": 0.8, "tier": 2, "authority": "scientific", "type": "primary_research"}
    
    # Verificar padrões governamentais
    if any(pattern in url_lower for pattern in government_patterns):
        return {"quality_score": 0.75, "tier": 2, "authority": "government", "type": "guidelines"}
    
    # Verificar padrões de journals
    if any(pattern in url_lower for pattern in journal_patterns):
        return {"quality_score": 0.6, "tier": 3, "authority": "journal", "type": "primary_research"}
    
    # Análise adicional baseada no título e snippet
    if title or snippet:
        content = f"{title} {snippet}".lower()
        
        # Indicadores de alta qualidade científica
        scientific_indicators = [
            "systematic review", "meta-analysis", "randomized controlled trial",
            "clinical trial", "cohort study", "case-control", "guidelines",
            "consensus", "evidence-based", "peer-reviewed"
        ]
        
        if any(indicator in content for indicator in scientific_indicators):
            return {"quality_score": 0.7, "tier": 3, "authority": "scientific", "type": "research"}
    
    # Default para fontes desconhecidas (score baixo)
    return {"quality_score": 0.3, "tier": 4, "authority": "unknown", "type": "unknown"}

def calculate_web_source_impact_score(result_item: dict, original_query: str) -> float:
    """
    Calcula score de impacto para resultados de busca web baseado em qualidade da fonte
    
    Args:
        result_item: Item de resultado da busca web
        original_query: Query original
        
    Returns:
        Score de 0.0 a 1.0 (maior = melhor qualidade/impacto)
    """
    url = result_item.get("url", "")
    title = result_item.get("title", "")
    snippet = result_item.get("snippet", "")
    
    # Avaliar qualidade da fonte
    source_metrics = assess_web_source_quality(url, title, snippet)
    
    # Score base da qualidade da fonte (peso 50%)
    base_score = source_metrics["quality_score"] * 0.5
    
    # Relevância do título (peso 25%)
    title_relevance = calculate_text_relevance(title, original_query) * 0.25
    
    # Relevância do snippet (peso 20%)
    snippet_relevance = calculate_text_relevance(snippet, original_query) * 0.20
    
    # Bonus por tipo de conteúdo (peso 5%)
    content_type = source_metrics["type"]
    type_bonus = {
        "primary_research": 0.05,
        "systematic_reviews": 0.05,
        "guidelines": 0.04,
        "clinical_resource": 0.03,
        "medical_news": 0.01,
        "patient_education": 0.01,
        "blog": 0.0,
        "excluded": 0.0
    }.get(content_type, 0.02) * 0.05
    
    total_score = base_score + title_relevance + snippet_relevance + type_bonus
    
    # Penalty severa para fontes de baixa qualidade (TIER 5)
    if source_metrics["tier"] == 5:
        total_score *= 0.1  # Reduzir drasticamente o score
    
    # Bonus para fontes de elite (TIER 1)
    elif source_metrics["tier"] == 1:
        total_score = min(total_score + 0.1, 1.0)
    
    return min(total_score, 1.0)

def calculate_text_relevance(text: str, query: str) -> float:
    """
    Calcula relevância entre texto e query (função auxiliar)
    
    Args:
        text: Texto para avaliar
        query: Query de referência
        
    Returns:
        Score de 0.0 a 1.0
    """
    if not text or not query:
        return 0.0
    
    text_lower = text.lower()
    query_lower = query.lower()
    
    # Palavras da query
    query_words = set(query_lower.split())
    text_words = set(text_lower.split())
    
    # Interseção de palavras
    common_words = query_words.intersection(text_words)
    
    if not query_words:
        return 0.0
    
    # Score baseado na proporção de palavras em comum
    word_overlap_score = len(common_words) / len(query_words)
    
    # Bonus para correspondências exatas de frases
    phrase_bonus = 0.0
    if query_lower in text_lower:
        phrase_bonus = 0.3
    
    return min(word_overlap_score + phrase_bonus, 1.0)

# --- Enhanced Academic Database Search Functions ---

async def search_academic_databases(
    query: str, 
    databases: Optional[List[str]] = None,
    count_per_database: int = 5,
    prioritize_high_impact: bool = True
) -> Dict[str, BraveSearchResponse]:
    """
    Search multiple academic databases with optimized queries
    
    Args:
        query: Original search query
        databases: List of database keys to search (default: all tier 1)
        count_per_database: Results per database
        prioritize_high_impact: Whether to prioritize tier 1 databases
        
    Returns:
        Dict mapping database names to search responses
    """
    if databases is None:
        if prioritize_high_impact:
            # Default to tier 1 databases
            databases = [key for key, config in ACADEMIC_DATABASES.items() if config["tier"] == 1]
        else:
            databases = list(ACADEMIC_DATABASES.keys())
    
    results = {}
    client = await get_brave_client()
    
    try:
        for db_key in databases:
            if db_key not in ACADEMIC_DATABASES:
                logger.warning(f"Unknown database key: {db_key}")
                continue
                
            db_config = ACADEMIC_DATABASES[db_key]
            optimized_query = optimize_query_for_academic_database(query, db_key)
            
            logger.info(f"Searching {db_config['name']} with query: {optimized_query}")
            
            response = await client.search_brave(
                query=optimized_query,
                count=count_per_database,
                search_type="academic"
            )
            
            # Tag results with database source
            for result in response.results:
                result.source = f"academic_{db_key}"
            
            results[db_key] = response
            
    except Exception as e:
        logger.error(f"Error in academic database search: {e}")
    
    finally:
        await client.close()
    
    return results

async def search_cochrane_library(query: str, count: int = 10, client: Optional[BraveSearchClient] = None, skip_internal_optimization: bool = True) -> BraveSearchResponse: # Default to skip
    """
    Search Cochrane Library for systematic reviews and meta-analyses
    """
    optimized_query = optimize_query_for_academic_database(query, "cochrane")
    
    # Manage client lifecycle
    local_client = False
    if client is None:
        client = await get_brave_client()
        local_client = True
        
    try:
        response = await client.search_brave(
            query=optimized_query,
            count=count,
            search_type="systematic_reviews",
            skip_internal_optimization=skip_internal_optimization # Pass through
        )
        
        # Tag results as Cochrane
        for result in response.results:
            result.source = "cochrane"
            
        return response
        
    finally:
        if local_client and client: # Only close if created locally
            await client.close()

async def search_ncbi_sources(query: str, count: int = 15, include_books: bool = True, include_pmc: bool = True, client: Optional[BraveSearchClient] = None, skip_internal_optimization: bool = True) -> BraveSearchResponse: # Default to skip
    """
    Search NCBI sources including Bookshelf and PMC
    """
    all_results = []
    
    local_client = False
    if client is None:
        client = await get_brave_client()
        local_client = True
        
    try:
        # Search NCBI Bookshelf (StatPearls, etc.)
        if include_books:
            bookshelf_query = optimize_query_for_academic_database(query, "ncbi_bookshelf")
            bookshelf_response = await client.search_brave(
                query=bookshelf_query,
                count=count // 2 if include_pmc else count,
                search_type="clinical_resource",
                skip_internal_optimization=skip_internal_optimization # Pass through
            )
            
            for result in bookshelf_response.results:
                result.source = "ncbi_bookshelf"
                all_results.append(result)
        
        # Search PMC (free full-text articles)
        if include_pmc:
            pmc_query = optimize_query_for_academic_database(query, "ncbi_pmc")
            pmc_response = await client.search_brave(
                query=pmc_query,
                count=count // 2 if include_books else count,
                search_type="primary_research",
                skip_internal_optimization=skip_internal_optimization # Pass through
            )
            
            for result in pmc_response.results:
                result.source = "ncbi_pmc"
                all_results.append(result)
    
    finally:
        if local_client and client:
            await client.close()
    
    return BraveSearchResponse(
        query=query,
        total_results=len(all_results),
        results=all_results
    )

async def search_elite_journals(query: str, count: int = 15, client: Optional[BraveSearchClient] = None, skip_internal_optimization: bool = True) -> BraveSearchResponse: # Default to skip
    """
    Search high-impact medical journals (NEJM, Lancet, JAMA, BMJ)
    """
    elite_databases = ["nejm", "thelancet", "jama", "bmj"]
    all_results = []
    
    local_client = False
    if client is None:
        client = await get_brave_client()
        local_client = True
        
    try:
        count_per_journal = max(1, count // len(elite_databases))
        
        for db_key in elite_databases:
            optimized_query = optimize_query_for_academic_database(query, db_key)
            
            response = await client.search_brave(
                query=optimized_query,
                count=count_per_journal,
                search_type="primary_research",
                skip_internal_optimization=skip_internal_optimization # Pass through
            )
            
            for result in response.results:
                result.source = f"elite_journal_{db_key}"
                all_results.append(result)
    
    finally:
        if local_client and client:
            await client.close()
    
    return BraveSearchResponse(
        query=query,
        total_results=len(all_results),
        results=all_results
    )

async def search_comprehensive_academic(
    query: str, 
    max_total_results: int = 30,
    prioritize_quality: bool = True
    # No skip_internal_optimization here, as it controls its sub-searches
) -> BraveSearchResponse:
    """
    Comprehensive academic search across multiple high-quality sources
    
    Args:
        query: Search query
        max_total_results: Maximum total results to return
        prioritize_quality: Whether to prioritize tier 1 sources
        
    Returns:
        Combined results from multiple academic sources
    """
    all_results = []
    
    # Define search distribution
    if prioritize_quality:
        search_plan = {
            "cochrane": max_total_results // 3.333,             
            "ncbi_sources": max_total_results // 3.333,         
            "elite_journals": max_total_results // 5,
            "sciencedirect": max_total_results // 10,
            "medrxiv": max_total_results // 10,             
        }
    else:
        search_plan = {
            "cochrane": max_total_results // 5,            
            "ncbi_sources": max_total_results // 4,         
            "elite_journals": max_total_results // 4,       
            "sciencedirect": max_total_results // 5,        
            "medrxiv": max_total_results // 10,             
        }
    
    # Instantiate client for the entire comprehensive search
    main_client = await get_brave_client()
    
    try:
        # Execute searches in parallel could be added here
        # For now, sequential searches
        # Cochrane Library
        if "cochrane" in search_plan:
            cochrane_results = await search_cochrane_library(query, search_plan["cochrane"], client=main_client)
            all_results.extend(cochrane_results.results)
        
        # NCBI Sources
        if "ncbi_sources" in search_plan:
            ncbi_results = await search_ncbi_sources(query, search_plan["ncbi_sources"], client=main_client)
            all_results.extend(ncbi_results.results)
        
        # Elite Journals
        if "elite_journals" in search_plan:
            elite_results = await search_elite_journals(query, search_plan["elite_journals"], client=main_client)
            all_results.extend(elite_results.results)
        
        # Additional sources if not prioritizing quality
        if not prioritize_quality:
            if "sciencedirect" in search_plan:
                sd_query = optimize_query_for_academic_database(query, "sciencedirect")
                # Use main_client here directly
                sd_response = await main_client.search_brave(sd_query, search_plan["sciencedirect"], search_type="academic", skip_internal_optimization=True) # Skip for pre-optimized
                for result in sd_response.results:
                    result.source = "sciencedirect"
                    all_results.append(result)
                    
            if "medrxiv" in search_plan:
                mr_query = optimize_query_for_academic_database(query, "medrxiv")
                # Use main_client here directly
                mr_response = await main_client.search_brave(mr_query, search_plan["medrxiv"], search_type="academic", skip_internal_optimization=True) # Skip for pre-optimized
                for result in mr_response.results:
                    result.source = "medrxiv"
                    all_results.append(result)
    
    except Exception as e:
        logger.error(f"Error in comprehensive academic search: {e}")
    finally:
        if main_client:
            await main_client.close() # Close the main client
            # Reset the global client so it can be re-initialized by other functions
            global _brave_client
            _brave_client = None
    
    # Remove duplicates based on URL
    seen_urls = set()
    unique_results = []
    for result in all_results:
        if result.url not in seen_urls:
            seen_urls.add(result.url)
            unique_results.append(result)
    
    # Sort by source quality (tier 1 sources first)
    def get_source_priority(result):
        source = result.source
        if any(tier1 in source for tier1 in ["cochrane", "ncbi", "nejm", "lancet", "jama", "bmj"]):
            return 1
        elif "sciencedirect" in source:
            return 2
        elif "medrxiv" in source:
            return 3
        else:
            return 4
    
    unique_results.sort(key=get_source_priority)
    
    # Limit to max_total_results
    final_results = unique_results[:max_total_results]
    
    logger.info(f"Comprehensive academic search returned {len(final_results)} unique results from {len(set(r.source for r in final_results))} sources")
    
    return BraveSearchResponse(
        query=query,
        total_results=len(final_results),
        results=final_results
    )

# --- General Purpose Web Search --- 
async def search_brave_web(
    query: str, 
    count: int = 15,  # Aumentado de 10 para 15
    offset: int = 0,
    search_type: str = "general",
    optimize_for_guidelines: bool = False,
    skip_internal_optimization: bool = False # New parameter
) -> BraveSearchResponse:
    """
    Função de conveniência para busca web otimizada.
    
    Args:
        query: Termo de busca
        count: Número de resultados (padrão 15)
        offset: Offset para paginação
        search_type: Tipo de busca ("guidelines", "research", "general")
        optimize_for_guidelines: Se deve otimizar para guidelines
        skip_internal_optimization: If True, use the query as-is.
        
    Returns:
        BraveSearchResponse com resultados
    """
    client = await get_brave_client()
    return await client.search_brave(query, count, offset, search_type, optimize_for_guidelines, skip_internal_optimization)