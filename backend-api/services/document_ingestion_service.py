import io
import json
import logging
import re
import inspect
from typing import Any, Dict, List, Optional, Tuple

import requests
import trafilatura

from config import get_settings
from services.text_chunking import structured_chunk, chunk_by_tokens


logger = logging.getLogger(__name__)
settings = get_settings()


class DocumentIngestionService:
    """
    Parses documents into structure-aware chunks for RAG indexing.
    Prefers LlamaParse JSON if available; falls back to HTML/TXT + heuristic chunking.
    """

    def __init__(self):
        self.use_llamaparse = bool(getattr(settings, "llama_cloud_api_key", None))
        self.use_docling = bool(getattr(settings, "docling_enable", False))
        self.llamaparse_strict = bool(getattr(settings, "llamaparse_strict", False))
        self.ingest_url_direct = bool(getattr(settings, "ingest_url_direct", False))
        self.thepipe_api_url = getattr(settings, "thepipe_api_url", None)
        self.thepipe_api_key = getattr(settings, "thepipe_api_key", None)
        # Maintain separate clients for JSON and Markdown modes when possible
        self._lp_json = None
        self._lp_md = None
        if self.use_llamaparse:
            try:
                from llama_parse import LlamaParse  # type: ignore
                try:
                    # Prefer enums when available
                    from llama_parse.base import ResultType, Language  # type: ignore
                except Exception:
                    ResultType = None
                    Language = None
                lp_sig = inspect.signature(LlamaParse)
                allowed = set(lp_sig.parameters.keys())

                def make_kwargs(result_type: str) -> Dict[str, Any]:
                    kw: Dict[str, Any] = {"api_key": settings.llama_cloud_api_key}
                    if "result_type" in allowed:
                        if ResultType is not None:
                            rt_map = {
                                "json": getattr(ResultType, "JSON", result_type),
                                "markdown": getattr(ResultType, "MD", result_type),
                                "md": getattr(ResultType, "MD", result_type),
                                "text": getattr(ResultType, "TXT", result_type),
                            }
                            kw["result_type"] = rt_map.get(result_type.lower(), getattr(ResultType, "MD", result_type))
                        else:
                            kw["result_type"] = result_type
                    if "num_workers" in allowed:
                        kw["num_workers"] = getattr(settings, "llamaparse_num_workers", 2)
                    # Preset/advanced toggles if supported by the installed client
                    preset = getattr(settings, "llamaparse_preset", None)
                    if preset and "preset" in allowed:
                        kw["preset"] = preset
                    if getattr(settings, "llamaparse_enable_ocr", False) and "use_ocr" in allowed:
                        kw["use_ocr"] = True
                    if getattr(settings, "llamaparse_ocr_strict", False) and "ocr_strict" in allowed:
                        kw["ocr_strict"] = True
                    # Language if supported (service expects ISO codes like 'en','pt')
                    lang_raw = (getattr(settings, "llamaparse_language", "AUTO") or "AUTO")
                    if "language" in allowed and str(lang_raw).upper() != "AUTO":
                        lr = str(lang_raw).strip().lower()
                        # common mappings
                        map_lang = {
                            "en": "en", "english": "en", "en-us": "en", "en_gb": "en",
                            "pt": "pt", "pt-br": "pt", "portuguese": "pt",
                            "es": "es", "spanish": "es",
                            "fr": "fr", "french": "fr",
                        }
                        kw["language"] = map_lang.get(lr, lr)
                    return kw

                # Prefer advanced JSON client if requested (default), with Markdown fallback
                try:
                    self._lp_json = LlamaParse(**make_kwargs(getattr(settings, "llamaparse_result_type", "json")))
                    logger.info("Ingestion: LlamaParse enabled (result_type=%s)", getattr(settings, "llamaparse_result_type", "json"))
                except Exception as e:
                    logger.warning(f"Ingestion: Could not init LlamaParse JSON client: {e}")
                    self._lp_json = None

                try:
                    self._lp_md = LlamaParse(**make_kwargs("markdown"))
                except Exception as e:
                    logger.warning(f"Ingestion: Could not init LlamaParse Markdown client: {e}")
                    self._lp_md = None

            except Exception as e:
                logger.warning(f"Ingestion: LlamaParse import failed, falling back. Error: {e}")
                self.use_llamaparse = False

    # -------- Docling processing --------
    def _parse_with_docling(self, content: bytes, filename: Optional[str]) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]], Dict[str, Any]]:
        """Try Docling (if installed) to parse PDF bytes into sections/chunks. Returns (sections, chunks, stats).
        Stats includes simple quality signals like text_len, table_count, ocr_ratio when available.
        """
        stats: Dict[str, Any] = {}
        try:
            import tempfile, os
            # Attempt import; Docling APIs may vary, so guard in try/catch
            try:
                from docling.document_converter import DocumentConverter  # type: ignore
                converter = DocumentConverter()
                docling_mode = "converter"
            except Exception:
                converter = None
                docling_mode = None
            if converter is None:
                return [], [], {"reason": "docling_not_installed"}
            # Write to temp file for parsers that expect a path
            with tempfile.NamedTemporaryFile(delete=True, suffix=".pdf") as tf:
                tf.write(content)
                tf.flush()
                # Minimal Docling pipeline
                try:
                    # Common API: convert(file_path)
                    dl_result = None
                    try:
                        dl_result = converter.convert(tf.name)  # type: ignore
                    except Exception:
                        pass
                    if dl_result is None and hasattr(converter, "convert_file"):
                        try:
                            dl_result = converter.convert_file(tf.name)  # type: ignore
                        except Exception:
                            dl_result = None
                except Exception:
                    dl_result = None

                if dl_result is None:
                    return [], [], {"reason": "docling_parse_failed"}

                # Extract markdown/text from result
                total_text = ""
                tables: List[str] = []
                try:
                    # Newer docling exposes result.document with exporters
                    doc = getattr(dl_result, "document", None)
                    if doc is not None:
                        if hasattr(doc, "export_to_markdown"):
                            total_text = doc.export_to_markdown() or ""
                        elif hasattr(doc, "export_to_text"):
                            total_text = doc.export_to_text() or ""
                except Exception:
                    pass
                if not total_text:
                    # Fallback: attempt generic attributes
                    for attr in ("markdown", "md", "text"):
                        val = getattr(dl_result, attr, None)
                        if isinstance(val, str) and val.strip():
                            total_text = val
                            break

                total_text = (total_text or "").strip()
                stats["text_len"] = len(total_text)
                stats["tables"] = 0

                sections: List[Dict[str, Any]] = [{
                    "section_key": "ROOT",
                    "text": total_text[:300] if total_text else "",
                    "role": "section_summary",
                    "section_path": ["ROOT"],
                    "page_from": None,
                    "page_to": None,
                }]
                chunks: List[Dict[str, Any]] = []
                for ch in chunk_by_tokens(total_text, target_tokens=512, overlap_tokens=64):
                    chunks.append({"text": ch, "role": "narrative", "section_key": "ROOT", "page": None})
                for t in tables:
                    chunks.append({"text": t, "role": "table", "section_key": "ROOT", "page": None})

                return sections, chunks, stats
        except Exception as e:
            logger.warning(f"Docling parser failed for {filename or 'bytes'}: {e}")
        return [], [], {"reason": "docling_exception"}

    def _should_quarantine(self, stats: Dict[str, Any]) -> bool:
        """Heuristics: quarantine for low text or table-heavy without serialization."""
        if not stats:
            return True
        text_len = stats.get("text_len", 0)
        tables = stats.get("tables", 0)
        # Tune thresholds as needed
        if text_len < 500:
            return True
        # If many tables present, prefer JSON-capable fallback
        if tables >= 5:
            return True
        return False

    def _call_thepipe(self, content: bytes, filename: Optional[str]) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        """Optional: call thepi.pe extraction service if configured. Returns (sections, chunks) or empty on failure."""
        if not (self.thepipe_api_url and self.thepipe_api_key):
            return [], []
        try:
            import requests as _rq
            headers = {"Authorization": f"Bearer {self.thepipe_api_key}"}
            files = {"file": (filename or "upload.pdf", content, "application/pdf")}
            resp = _rq.post(self.thepipe_api_url.rstrip("/") + "/extract", headers=headers, files=files, timeout=60)
            resp.raise_for_status()
            data = resp.json()
            # Convert a generic schema to our chunks; assume 'markdown' field
            md = data.get("markdown") or data.get("text") or ""
            chunks = [{"text": t, "role": "narrative", "section_key": "ROOT", "page": None} for t in chunk_by_tokens(md, 512, 64)]
            sections = [{"section_key": "ROOT", "text": md[:300], "role": "section_summary", "section_path": ["ROOT"], "page_from": None, "page_to": None}]
            return sections, chunks
        except Exception as e:
            logger.warning(f"thepi.pe extraction failed for {filename or 'bytes'}: {e}")
            return [], []

    def _parse_with_unstructured(self, content: bytes, filename: Optional[str], target_tokens: int, overlap_tokens: int) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]], Dict[str, Any]]:
        """Optional Unstructured fallback. Returns (sections, chunks, stats)."""
        stats: Dict[str, Any] = {}
        try:
            try:
                from unstructured.partition.pdf import partition_pdf  # type: ignore
            except Exception:
                return [], [], {"reason": "unstructured_not_installed"}
            import tempfile, os
            with tempfile.NamedTemporaryFile(delete=True, suffix=".pdf") as tf:
                tf.write(content)
                tf.flush()
                try:
                    elements = partition_pdf(filename=tf.name, infer_table_structure=True, strategy="hi_res")
                except TypeError:
                    elements = partition_pdf(filename=tf.name)
            texts: List[str] = []
            tables: List[str] = []
            roles: List[str] = []
            for el in elements:
                t = getattr(el, "text", None) or ""
                cat = getattr(el, "category", "") or ""
                if not t.strip():
                    continue
                if "Table" in cat or cat.lower() == "table":
                    tables.append(t)
                    roles.append("table")
                else:
                    texts.append(t)
                    roles.append("narrative")
            total_text = "\n\n".join(texts).strip()
            stats["text_len"] = len(total_text)
            stats["tables"] = len(tables)
            sections = [{"section_key": "ROOT", "text": total_text[:300] if total_text else "", "role": "section_summary", "section_path": ["ROOT"], "page_from": None, "page_to": None}]
            from .text_chunking import chunk_by_tokens
            chunks: List[Dict[str, Any]] = []
            for ch in chunk_by_tokens(total_text, target_tokens, overlap_tokens):
                chunks.append({"text": ch, "role": "narrative", "section_key": "ROOT", "page": None})
            for t in tables:
                chunks.append({"text": t, "role": "table", "section_key": "ROOT", "page": None})
            return sections, chunks, stats
        except Exception as e:
            logger.warning(f"Unstructured parse failed for {filename or 'bytes'}: {e}")
            return [], [], {"reason": "unstructured_exception"}

    def _parse_with_nougat(self, content: bytes, filename: Optional[str], target_tokens: int, overlap_tokens: int) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]], Dict[str, Any]]:
        """Optional Nougat OCR fallback (very heavy). Returns (sections, chunks, stats)."""
        # Placeholder: attempt import and return empty if unavailable
        try:
            import importlib
            if importlib.util.find_spec("nougat") is None:
                return [], [], {"reason": "nougat_not_installed"}
        except Exception:
            return [], [], {"reason": "nougat_not_installed"}
        # Implementing full Nougat flow is heavy; return empty to avoid blocking
        return [], [], {"reason": "nougat_stub"}

    # -------- LlamaParse JSON processing --------
    def _doc_to_dict(self, d: Any) -> Optional[Dict[str, Any]]:
        for attr in ("to_dict", "dict", "model_dump"):
            if hasattr(d, attr):
                try:
                    return getattr(d, attr)()
                except Exception:
                    pass
        # Sometimes LlamaParse returns a pydantic-like object with .json()
        if hasattr(d, "json"):
            try:
                return json.loads(d.json())
            except Exception:
                return None
        # LlamaParse often returns a Document with JSON content in .text
        t = getattr(d, "text", None)
        if isinstance(t, str) and t.strip().startswith(('{', '[')):
            try:
                return json.loads(t)
            except Exception:
                pass
        # If already a dict
        if isinstance(d, dict):
            # Some LlamaParse responses wrap JSON under 'json'
            inner = d.get("json") if isinstance(d, dict) else None
            if isinstance(inner, str) and inner.strip().startswith(('{', '[')):
                try:
                    return json.loads(inner)
                except Exception:
                    pass
            if isinstance(inner, dict):
                return inner
            return d
        return None

    def _extract_blocks(self, doc: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Extracts layout blocks with role, text, page, and optional heading level.
        Tries to be resilient to schema differences.
        """
        blocks: List[Dict[str, Any]] = []

        def add_block(role: str, text: str, page: Optional[int], level: Optional[int] = None, caption: Optional[str] = None):
            text = (text or "").strip()
            if not text:
                return
            blocks.append({
                "role": role,
                "text": text,
                "page": page,
                "level": level,
                "caption": caption,
            })

        # Common patterns: doc["pages"][i]["blocks"] with types/lines, or doc["elements"]
        pages = doc.get("pages") or []
        if isinstance(pages, list) and pages:
            for p in pages:
                page_no = p.get("page") or p.get("page_number")
                for b in p.get("blocks", []) or []:
                    btype = (b.get("type") or b.get("category") or "").lower()
                    level = b.get("level") or b.get("heading_level")
                    caption = b.get("caption")
                    # text may be directly in block or in lines/spans
                    text = b.get("text")
                    if not text:
                        # compose from lines/spans
                        lines = b.get("lines") or []
                        accum: List[str] = []
                        for ln in lines:
                            t = ln.get("text") or ""
                            if not t and ln.get("spans"):
                                t = "".join([s.get("text", "") for s in ln.get("spans")])
                            if t:
                                accum.append(t)
                        text = " ".join(accum).strip()
                    # Map roles
                    if btype in ("title", "heading", "section_heading", "header1", "header2"):
                        add_block("heading", text, page_no, level=level)
                    elif btype in ("paragraph", "text", "list_item"):
                        add_block("paragraph", text, page_no)
                    elif btype == "table":
                        # table text fallback
                        add_block("table", text or caption or "[TABLE]", page_no)
                    elif btype in ("figure", "image"):
                        add_block("figure", caption or text or "[FIGURE]", page_no)
                    elif btype in ("header", "footer"):
                        # ignore
                        continue
        elif isinstance(doc.get("elements"), list):
            for el in doc["elements"]:
                r = (el.get("type") or el.get("category") or "").lower()
                text = el.get("text") or ""
                page_no = el.get("page") or el.get("page_number")
                level = el.get("level") or el.get("heading_level")
                caption = el.get("caption")
                if r in ("title", "heading"):
                    add_block("heading", text, page_no, level=level)
                elif r in ("paragraph", "text", "list_item"):
                    add_block("paragraph", text, page_no)
                elif r == "table":
                    add_block("table", text or caption or "[TABLE]", page_no)
                elif r in ("figure", "image"):
                    add_block("figure", caption or text or "[FIGURE]", page_no)
                elif r in ("header", "footer"):
                    continue

        return blocks

    def _build_sectioned_chunks(
        self,
        blocks: List[Dict[str, Any]],
        target_tokens: int = 512,
        overlap_tokens: int = 64,
    ) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        """
        Returns (section_summaries, chunk_docs) where each item has text and rich metadata.
        section_summaries: { section_key, text, section_path, page_from, page_to, role='section_summary' }
        chunk_docs: { text, role, section_key, page_from, page_to }
        """
        # Build section paths via heading levels
        section_stack: List[Tuple[str, int]] = []  # (title, level)
        sections: Dict[str, Dict[str, Any]] = {}
        current_key: Optional[str] = None
        current_level: int = 1

        def current_path() -> List[str]:
            return [t for t, _ in section_stack]

        def make_key() -> str:
            path = current_path()
            return " > ".join([p.strip("# ") for p in path]) if path else "ROOT"

        def ensure_section(key: str):
            if key not in sections:
                sections[key] = {
                    "section_key": key,
                    "texts": [],
                    "page_from": None,
                    "page_to": None,
                    "section_path": current_path(),
                }

        chunk_docs: List[Dict[str, Any]] = []

        for b in blocks:
            role = b.get("role")
            text = b.get("text", "")
            page = b.get("page")
            level = b.get("level")

            if role == "heading":
                lvl = int(level) if isinstance(level, int) else current_level + 1
                # pop deeper/equal levels
                while section_stack and section_stack[-1][1] >= lvl:
                    section_stack.pop()
                section_stack.append((text, lvl))
                current_level = lvl
                current_key = make_key()
                ensure_section(current_key)
                # include heading text in section texts minimally
                sections[current_key]["texts"].append(text)
                if page is not None:
                    pf = sections[current_key]["page_from"]
                    sections[current_key]["page_from"] = min(pf, page) if pf is not None else page
                    pt = sections[current_key]["page_to"]
                    sections[current_key]["page_to"] = max(pt, page) if pt is not None else page
                continue

            # paragraph/table/figure -> assign to current section
            if current_key is None:
                current_key = "ROOT"
                ensure_section(current_key)

            # update page span
            if page is not None:
                pf = sections[current_key]["page_from"]
                sections[current_key]["page_from"] = min(pf, page) if pf is not None else page
                pt = sections[current_key]["page_to"]
                sections[current_key]["page_to"] = max(pt, page) if pt is not None else page

            role_norm = role
            # simple heuristic for guideline blocks
            if role == "paragraph" and any(k in text.lower() for k in ["recommendation", "guideline", "strong recommendation", "weak recommendation"]):
                role_norm = "guideline"

            chunk_docs.append({
                "text": text,
                "role": role_norm,
                "section_key": current_key,
                "page": page,
            })
            sections[current_key]["texts"].append(text)

        # Build section summaries (gist)
        section_summaries: List[Dict[str, Any]] = []
        for key, info in sections.items():
            full_text = " ".join(info["texts"]).strip()
            # gist: heading (+ first sentence if available)
            sentences = re.split(r"(?<=[.!?])\s+", full_text)
            gist = sentences[0] if sentences else full_text[:300]
            section_summaries.append({
                "section_key": key,
                "text": gist,
                "section_path": info.get("section_path", []),
                "page_from": info.get("page_from"),
                "page_to": info.get("page_to"),
                "role": "section_summary",
            })

        # Token chunking within sections for narrative paragraphs; keep tables/figures as-is
        token_chunked_docs: List[Dict[str, Any]] = []
        for key in sections.keys():
            # gather narrative text for this section
            narratives = [c["text"] for c in chunk_docs if c["section_key"] == key and c["role"] in ("paragraph", "guideline")]
            body = " \n".join(narratives)
            if body:
                for ch in chunk_by_tokens(body, target_tokens=512, overlap_tokens=64):
                    token_chunked_docs.append({
                        "text": ch,
                        "role": "narrative",
                        "section_key": key,
                        "page": None,
                    })
            # include tables/figures as their own small chunks
            for c in [c for c in chunk_docs if c["section_key"] == key and c["role"] in ("table", "figure")]:
                token_chunked_docs.append(c)

        return section_summaries, token_chunked_docs

    # -------- Public ingestion helpers --------
    def ingest_bytes(self, content: bytes, filename: Optional[str] = None,
                     target_tokens: int = 512, overlap_tokens: int = 64) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        """Return (section_docs, chunk_docs) with rich metadata; falls back when needed."""
        if not content:
            return [], []

        # 0) Docling first (local fast path)
        if self.use_docling:
            secs, chs, stats = self._parse_with_docling(content, filename)
            if secs or chs:
                if self._should_quarantine(stats):
                    logger.info("Docling result quarantined (low-quality or table-heavy), trying LlamaParse/thepi.pe")
                else:
                    return secs, chs

        # 1) GROBID for scholarly articles (if enabled) or when Docling quality failed
        if getattr(settings, "grobid_enable", False):
            try:
                from .grobid_service import GROBIDService
                grobid = GROBIDService()
                g_secs, g_chs = grobid.parse(content, target_tokens=target_tokens, overlap_tokens=overlap_tokens)
                if g_secs or g_chs:
                    logger.info("GROBID parsed scholarly PDF successfully")
                    return g_secs, g_chs
            except Exception as e:
                logger.warning(f"GROBID parse exception: {e}")

        # 2) Unstructured fallback (if enabled)
        if getattr(settings, "unstructured_enable", False):
            u_secs, u_chs, u_stats = self._parse_with_unstructured(content, filename, target_tokens, overlap_tokens)
            if u_secs or u_chs:
                logger.info("Unstructured parsed PDF successfully")
                return u_secs, u_chs

        # 3) Nougat OCR fallback (if enabled)
        if getattr(settings, "nougat_enable", False):
            n_secs, n_chs, n_stats = self._parse_with_nougat(content, filename, target_tokens, overlap_tokens)
            if n_secs or n_chs:
                logger.info("Nougat parsed PDF successfully")
                return n_secs, n_chs

        # Quick PDF fallback if LlamaParse not available
        if not (self.use_llamaparse and (self._lp_json or self._lp_md)):
            if content[:4] == b"%PDF":
                try:
                    from pypdf import PdfReader  # type: ignore
                    import io as _io
                    reader = PdfReader(_io.BytesIO(content))
                    texts: List[str] = []
                    for page in reader.pages:
                        try:
                            t = page.extract_text() or ""
                        except Exception:
                            t = ""
                        if t:
                            texts.append(t)
                    raw = "\n\n".join(texts)
                    if raw.strip():
                        chunks = structured_chunk(raw, target_tokens=target_tokens, overlap_tokens=overlap_tokens)
                        sections = [{"section_key": "ROOT", "text": chunks[0]["text"] if chunks else "", "role": "section_summary", "section_path": ["ROOT"], "page_from": 1, "page_to": len(reader.pages) if hasattr(reader, 'pages') else None}]
                        chunk_docs = [{"text": c["text"], "role": "narrative", "section_key": "ROOT", "page": None} for c in chunks]
                        return sections, chunk_docs
                except Exception as e:
                    logger.warning(f"PDF fallback parse failed for {filename or 'bytes'}: {e}")

        if self.use_llamaparse and (self._lp_json or self._lp_md):
            try:
                # Prefer passing file path if available; else pass bytes with extra_info file_name
                def load_with(client):
                    if client is None:
                        return None
                    # Try writing to a temporary file to avoid cloud 'could not load file' issues
                    import tempfile, os as _os
                    base = None
                    if filename and isinstance(filename, str):
                        base = _os.path.basename(filename)
                        # Strip query/fragment
                        qpos = base.find('?')
                        if qpos != -1:
                            base = base[:qpos]
                        hpos = base.find('#')
                        if hpos != -1:
                            base = base[:hpos]
                    safe_name = (base or "upload.pdf").encode('ascii', 'ignore').decode() or "upload.pdf"
                    with tempfile.TemporaryDirectory() as td:
                        tmp_path = _os.path.join(td, safe_name if safe_name.lower().endswith('.pdf') else safe_name + '.pdf')
                        with open(tmp_path, 'wb') as f:
                            f.write(content)
                        # Prefer single string path instead of list to match client expectations
                        return client.load_data(tmp_path)  # type: ignore

                docs = None
                # Try JSON-mode client first
                if self._lp_json is not None:
                    try:
                        docs = load_with(self._lp_json)
                    except Exception as e:
                        logger.warning(f"LlamaParse JSON load failed: {e}")
                        docs = None
                # Fallback to Markdown client
                if (docs is None or not docs) and self._lp_md is not None:
                    try:
                        docs = load_with(self._lp_md)
                    except Exception as e:
                        logger.warning(f"LlamaParse Markdown load failed: {e}")
                        docs = None
                all_sections: List[Dict[str, Any]] = []
                all_chunks: List[Dict[str, Any]] = []
                for d in docs or []:
                    # Try JSON layout first
                    dd = self._doc_to_dict(d)
                    if isinstance(dd, dict):
                        blocks = self._extract_blocks(dd)
                        secs, chs = self._build_sectioned_chunks(blocks, target_tokens, overlap_tokens)
                        all_sections.extend(secs)
                        all_chunks.extend(chs)
                    else:
                        # Treat as markdown text
                        t = getattr(d, "text", None)
                        if isinstance(t, str) and t.strip():
                            chunks = structured_chunk(t, target_tokens=target_tokens, overlap_tokens=overlap_tokens)
                            # Synthesize sections from headings is handled by structured_chunk titles
                            section_text = chunks[0]["text"] if chunks else t[:300]
                            all_sections.append({
                                "section_key": "ROOT",
                                "text": section_text,
                                "role": "section_summary",
                                "section_path": ["ROOT"],
                                "page_from": None,
                                "page_to": None,
                            })
                            all_chunks.extend([{ "text": c["text"], "role": "narrative", "section_key": c.get("title") or "ROOT", "page": None } for c in chunks])
                if all_sections or all_chunks:
                    return all_sections, all_chunks
                # else, fall through to PDF fallback
            except Exception as e:
                logger.warning(f"LlamaParse JSON flow failed for {filename or 'bytes'}: {e}")
                # Try PDF fallback immediately
                try:
                    if content[:4] == b"%PDF":
                        from pypdf import PdfReader  # type: ignore
                        import io as _io
                        reader = PdfReader(_io.BytesIO(content))
                        texts: List[str] = []
                        for page in reader.pages:
                            try:
                                t = page.extract_text() or ""
                            except Exception:
                                t = ""
                            if t:
                                texts.append(t)
                        raw = "\n\n".join(texts)
                        if raw.strip():
                            chunks = structured_chunk(raw, target_tokens=target_tokens, overlap_tokens=overlap_tokens)
                            sections = [{"section_key": "ROOT", "text": chunks[0]["text"] if chunks else "", "role": "section_summary", "section_path": ["ROOT"], "page_from": 1, "page_to": len(reader.pages) if hasattr(reader, 'pages') else None}]
                            chunk_docs = [{"text": c["text"], "role": "narrative", "section_key": "ROOT", "page": None} for c in chunks]
                            return sections, chunk_docs
                except Exception as e2:
                    logger.warning(f"PDF fallback parse failed for {filename or 'bytes'}: {e2}")

                # Optional: table/image heavy fallback via thepi.pe
                if self.thepipe_api_url and self.thepipe_api_key:
                    tp_secs, tp_chs = self._call_thepipe(content, filename)
                    if tp_secs or tp_chs:
                        return tp_secs, tp_chs

        # Fallbacks: HTML/TXT -> heuristic structured chunks (no section index)
        # Detect HTML
        head = content[:1024].lower()
        if b"<html" in head or b"<!doctype html" in head:
            try:
                txt = trafilatura.extract(content.decode(errors="ignore"))
                if txt:
                    chunks = structured_chunk(txt, target_tokens=target_tokens, overlap_tokens=overlap_tokens)
                    # no real sections; synthesize a single ROOT summary
                    sections = [{"section_key": "ROOT", "text": chunks[0]["text"] if chunks else "", "role": "section_summary", "section_path": ["ROOT"], "page_from": None, "page_to": None}]
                    chunk_docs = [{"text": c["text"], "role": "narrative", "section_key": "ROOT", "page": None} for c in chunks]
                    return sections, chunk_docs
            except Exception:
                pass

        # Plain text
        try:
            decoded = content.decode("utf-8")
            if len(decoded.splitlines()) > 1:
                chunks = structured_chunk(decoded, target_tokens=target_tokens, overlap_tokens=overlap_tokens)
                sections = [{"section_key": "ROOT", "text": chunks[0]["text"] if chunks else "", "role": "section_summary", "section_path": ["ROOT"], "page_from": None, "page_to": None}]
                chunk_docs = [{"text": c["text"], "role": "narrative", "section_key": "ROOT", "page": None} for c in chunks]
                return sections, chunk_docs
        except Exception:
            pass

        logger.warning("Ingestion: Unsupported format for fallback parser; consider enabling LlamaParse for PDFs.")
        return [], []

    def ingest_url(self, url: str, target_tokens: int = 512, overlap_tokens: int = 64) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        # If configured, try LlamaParse direct URL ingestion first (no bytes upload)
        if self.ingest_url_direct and (self._lp_json or self._lp_md):
            try:
                client = self._lp_json or self._lp_md
                docs = client.load_data([url])  # type: ignore
                all_sections: List[Dict[str, Any]] = []
                all_chunks: List[Dict[str, Any]] = []
                for d in docs or []:
                    dd = self._doc_to_dict(d)
                    if isinstance(dd, dict):
                        blocks = self._extract_blocks(dd)
                        secs, chs = self._build_sectioned_chunks(blocks, target_tokens, overlap_tokens)
                        all_sections.extend(secs)
                        all_chunks.extend(chs)
                    else:
                        t = getattr(d, "text", None)
                        if isinstance(t, str) and t.strip():
                            chunks = structured_chunk(t, target_tokens=target_tokens, overlap_tokens=overlap_tokens)
                            section_text = chunks[0]["text"] if chunks else t[:300]
                            all_sections.append({
                                "section_key": "ROOT",
                                "text": section_text,
                                "role": "section_summary",
                                "section_path": ["ROOT"],
                                "page_from": None,
                                "page_to": None,
                            })
                            all_chunks.extend([{ "text": c["text"], "role": "narrative", "section_key": c.get("title") or "ROOT", "page": None } for c in chunks])
                if all_sections or all_chunks:
                    return all_sections, all_chunks
            except Exception as e:
                logger.warning(f"LlamaParse URL ingest failed for {url}: {e}")

        # Otherwise fetch content and run normal byte ingest flow
        try:
            headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"}
            resp = requests.get(url, headers=headers, timeout=30, allow_redirects=True)
            resp.raise_for_status()
            return self.ingest_bytes(resp.content, filename=url, target_tokens=target_tokens, overlap_tokens=overlap_tokens)
        except Exception as e:
            logger.error(f"Failed to fetch URL {url}: {e}")
            return [], []
