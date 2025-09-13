import io
import logging
from typing import Any, Dict, List, Optional, Tuple

import requests
from lxml import etree

from config import get_settings


logger = logging.getLogger(__name__)
settings = get_settings()


class GROBIDService:
    def __init__(self, base_url: Optional[str] = None):
        self.base_url = (base_url or getattr(settings, "grobid_url", "http://grobid:8070")).rstrip("/")

    def process_pdf_to_tei(self, content: bytes) -> Optional[str]:
        try:
            url = f"{self.base_url}/api/processFulltextDocument"
            files = {"input": ("document.pdf", content, "application/pdf")}
            data = {"consolidateHeader": 1, "consolidateCitations": 0}
            resp = requests.post(url, files=files, data=data, timeout=60)
            resp.raise_for_status()
            return resp.text
        except Exception as e:
            logger.warning(f"GROBID process failed: {e}")
            return None

    def tei_to_sections_chunks(self, tei_xml: str, target_tokens: int = 512, overlap_tokens: int = 64) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        """
        Convert TEI XML to our (sections, chunks) format.
        Extract heads (section titles) and paragraphs; treat tables as atomic text where possible.
        """
        from .text_chunking import chunk_by_tokens

        parser = etree.XMLParser(recover=True)
        root = etree.fromstring(tei_xml.encode("utf-8"), parser=parser)
        ns = {"tei": "http://www.tei-c.org/ns/1.0"}

        def text_content(node):
            return " ".join(node.itertext()).strip()

        # Find body divs
        body = root.find(".//tei:text/tei:body", namespaces=ns)
        if body is None:
            full_text = text_content(root)
            sections = [{
                "section_key": "ROOT",
                "text": (full_text[:300] if full_text else ""),
                "role": "section_summary",
                "section_path": ["ROOT"],
                "page_from": None,
                "page_to": None,
            }]
            chunks = [{"text": ch, "role": "narrative", "section_key": "ROOT", "page": None} for ch in chunk_by_tokens(full_text, target_tokens, overlap_tokens)]
            return sections, chunks

        sections: List[Dict[str, Any]] = []
        chunks: List[Dict[str, Any]] = []

        # Iterate over top-level divs (sections)
        for div in body.findall(".//tei:div", namespaces=ns):
            head_el = div.find("tei:head", namespaces=ns)
            title = text_content(head_el) if head_el is not None else ""
            paras = div.findall("tei:p", namespaces=ns)
            tables = div.findall(".//tei:table", namespaces=ns)

            # Build section text for gist
            para_text = "\n\n".join(text_content(p) for p in paras)
            section_key = title or "Untitled Section"
            sections.append({
                "section_key": section_key,
                "text": (para_text[:300] if para_text else title),
                "role": "section_summary",
                "section_path": [section_key],
                "page_from": None,
                "page_to": None,
            })

            # Narrative chunks
            for ch in chunk_by_tokens(para_text, target_tokens, overlap_tokens):
                chunks.append({"text": ch, "role": "narrative", "section_key": section_key, "page": None})

            # Table chunks (atomic)
            for tb in tables:
                ttext = text_content(tb)
                if ttext:
                    chunks.append({"text": ttext, "role": "table", "section_key": section_key, "page": None})

        # If no sections found, fallback to full text
        if not sections and not chunks:
            full_text = text_content(body)
            sections = [{
                "section_key": "ROOT",
                "text": (full_text[:300] if full_text else ""),
                "role": "section_summary",
                "section_path": ["ROOT"],
                "page_from": None,
                "page_to": None,
            }]
            chunks = [{"text": ch, "role": "narrative", "section_key": "ROOT", "page": None} for ch in chunk_by_tokens(full_text, target_tokens, overlap_tokens)]

        return sections, chunks

    def parse(self, content: bytes, target_tokens: int = 512, overlap_tokens: int = 64) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        tei = self.process_pdf_to_tei(content)
        if not tei:
            return [], []
        return self.tei_to_sections_chunks(tei, target_tokens, overlap_tokens)

