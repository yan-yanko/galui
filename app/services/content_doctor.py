"""
Content Doctor — AI-powered content optimization for GEO.

Sprint 2: Authority Architect

Two analysis modes:
  1. Authority Gap Scanner    — find claims lacking empirical backing, suggest citations/data
  2. Structural Optimizer     — suggest converting dense paragraphs → tables, add Key Takeaways,
                                improve entity definitions for AI grounding

Uses Claude (fast model) for lightweight structured analysis.
Input: raw page text / markdown scraped by the existing crawler.
"""
import logging
import json
import re
from typing import Optional, Dict, Any, List

logger = logging.getLogger(__name__)


# ── Prompts ────────────────────────────────────────────────────────────────────

AUTHORITY_GAP_PROMPT = """You are an AI readability expert analyzing web content for Generative Engine Optimization (GEO) and AI citation optimization.

Your job: identify "authority gaps" and "information gain deficits" — claims that AI systems will skip because they lack empirical backing, AND content that adds no new information beyond what AI already knows.

Key insight from GEO research: Adding statistics and citations improves AI citation probability by 30-40% (Princeton GEO-bench study). AI engines prefer content that provides UNIQUE VALUE they cannot get elsewhere.

Content to analyze:
---
{content}
---

Return a JSON object with this exact structure:
{{
  "authority_score": <integer 0-100, where 100 = fully cited with unique insights, 0 = all bare claims>,
  "information_gain_score": <integer 0-100, where 100 = highly unique data/insights AI cannot find elsewhere, 0 = generic content AI already knows>,
  "gaps": [
    {{
      "claim": "<exact quote or paraphrase of the unsupported claim>",
      "type": "<one of: statistic | comparison | benefit_claim | historical_fact | technical_claim | no_information_gain>",
      "severity": "<high | medium | low>",
      "suggestion": "<specific suggestion: what data/citation would strengthen this claim>",
      "example_fix": "<a concrete rewrite of the sentence with citation placeholder, e.g., 'According to [Source], X% of...'>",
      "ai_risk": "<why AI systems might not cite this: e.g. 'unverifiable claim', 'too vague', 'no unique insight', 'contradicts known data'>"
    }}
  ],
  "information_gain_issues": [
    {{
      "issue": "<description of generic/low-value content section>",
      "fix": "<how to add unique data, primary research, or proprietary insight to this section>"
    }}
  ],
  "strengths": [
    "<string: things the content does well — e.g., 'Named specific tool versions', 'Referenced published study', 'Proprietary benchmark data'>"
  ],
  "top_priority": "<the single most important gap to fix first and why>",
  "quick_wins": ["<2-3 fast fixes that take <30 min each>"]
}}

Rules:
- Return ONLY valid JSON, no markdown code fences
- Identify 3-8 gaps maximum (focus on highest-impact)
- Be specific in suggestions — name real data sources (Gartner, McKinsey, Forrester, IDC, etc.) or suggest primary research
- Flag content as 'no_information_gain' if it states commonly known facts without adding new value
- information_gain_score: penalize generic how-to content, generic benefit lists, boilerplate descriptions
- severity=high means fixing this would meaningfully increase AI citation probability
- If content is well-cited and unique, still return the structure with gaps: [] and information_gain_issues: []"""


STRUCTURAL_OPTIMIZER_PROMPT = """You are an AI readability expert specializing in Generative Engine Optimization (GEO).

Your job: analyze page structure and suggest concrete improvements that make content more AI-readable.

AI systems prefer:
- Bullet lists and tables over dense paragraphs
- Clear entity definitions (who/what/when)
- "Key Takeaways" or "TL;DR" sections (cited more often)
- Headers that match how users phrase questions
- FAQ sections
- Numbered steps for processes

Content to analyze:
---
{content}
---

Return a JSON object with this exact structure:
{{
  "structure_score": <integer 0-100, where 100 = perfectly structured for AI>,
  "issues": [
    {{
      "type": "<one of: dense_paragraph | missing_summary | poor_headers | missing_table | missing_faq | missing_entity_def | missing_steps>",
      "location": "<describe where in the content this issue occurs>",
      "severity": "<high | medium | low>",
      "description": "<what the problem is and why it hurts AI readability>",
      "fix": "<concrete action to fix it>",
      "example": "<optional: show what the improved version would look like>"
    }}
  ],
  "key_entities": [
    {{
      "entity": "<name of person, company, product, concept>",
      "defined": <true|false>,
      "suggestion": "<how to add/improve its definition for AI grounding>"
    }}
  ],
  "suggested_sections": [
    "<section name + brief description of what to add, e.g., 'Key Takeaways — 3-5 bullet summary at the top'>"
  ],
  "rewrite_candidates": [
    {{
      "original": "<dense paragraph excerpt>",
      "format": "<table | bullets | numbered_steps | definition_list>",
      "reason": "<why this format would improve AI citation>"
    }}
  ],
  "top_priority": "<single most impactful structural change and why>"
}}

Rules:
- Return ONLY valid JSON, no markdown code fences
- Focus on actionable, specific suggestions
- Identify 3-6 structural issues maximum
- Key entities should include the main subject of the page"""


# ── Service ────────────────────────────────────────────────────────────────────

class ContentDoctorService:
    """
    Analyzes page content for GEO improvements.

    Uses the fast Claude model to minimize latency + cost.
    Each analysis is stateless — no caching at service level
    (caching can be added at route level if needed).
    """

    def __init__(self):
        from app.config import settings
        self.api_key = settings.anthropic_api_key
        self.fast_model = settings.fast_model

    def _call_claude(self, prompt: str, content: str, max_tokens: int = 2000) -> Dict:
        """
        Call Claude with a content analysis prompt.
        Returns parsed JSON dict or raises on failure.
        """
        import anthropic

        client = anthropic.Anthropic(api_key=self.api_key)

        # Truncate very long content to stay within token budget
        MAX_CONTENT_CHARS = 8000
        if len(content) > MAX_CONTENT_CHARS:
            content = content[:MAX_CONTENT_CHARS] + "\n\n[Content truncated for analysis]"

        full_prompt = prompt.format(content=content)

        message = client.messages.create(
            model=self.fast_model,
            max_tokens=max_tokens,
            messages=[{"role": "user", "content": full_prompt}],
        )

        raw = message.content[0].text.strip()

        # Strip markdown code fences if model adds them despite instructions
        raw = re.sub(r"^```(?:json)?\s*", "", raw)
        raw = re.sub(r"\s*```$", "", raw)

        return json.loads(raw)

    def analyze_authority_gaps(self, content: str, url: str = "") -> Dict[str, Any]:
        """
        Run Authority Gap Scanner on page content.

        Args:
            content: Raw text or markdown of the page
            url:     Source URL (for context, not analyzed)

        Returns:
            Dict with authority_score, gaps, strengths, quick_wins
        """
        if not content or len(content.strip()) < 100:
            return {
                "url": url,
                "error": "Content too short for meaningful analysis (minimum 100 chars)",
                "authority_score": 0,
                "gaps": [],
                "strengths": [],
                "quick_wins": [],
            }

        try:
            result = self._call_claude(AUTHORITY_GAP_PROMPT, content)
            result["url"] = url
            return result
        except json.JSONDecodeError as e:
            logger.error(f"Authority gap JSON parse error: {e}")
            return {"url": url, "error": "Analysis failed — could not parse AI response", "authority_score": 0, "gaps": []}
        except Exception as e:
            logger.error(f"Authority gap analysis failed: {e}")
            return {"url": url, "error": str(e), "authority_score": 0, "gaps": []}

    def analyze_structure(self, content: str, url: str = "") -> Dict[str, Any]:
        """
        Run Structural Optimizer on page content.

        Args:
            content: Raw text or markdown of the page
            url:     Source URL (for context)

        Returns:
            Dict with structure_score, issues, suggested_sections, rewrite_candidates
        """
        if not content or len(content.strip()) < 100:
            return {
                "url": url,
                "error": "Content too short for meaningful analysis (minimum 100 chars)",
                "structure_score": 0,
                "issues": [],
                "suggested_sections": [],
                "rewrite_candidates": [],
            }

        try:
            result = self._call_claude(STRUCTURAL_OPTIMIZER_PROMPT, content)
            result["url"] = url
            return result
        except json.JSONDecodeError as e:
            logger.error(f"Structure analysis JSON parse error: {e}")
            return {"url": url, "error": "Analysis failed — could not parse AI response", "structure_score": 0, "issues": []}
        except Exception as e:
            logger.error(f"Structure analysis failed: {e}")
            return {"url": url, "error": str(e), "structure_score": 0, "issues": []}

    def full_diagnosis(self, content: str, url: str = "") -> Dict[str, Any]:
        """
        Run both Authority Gap + Structural analysis in sequence.
        Returns combined report.
        """
        authority = self.analyze_authority_gaps(content, url)
        structure = self.analyze_structure(content, url)

        # Combined content health score (weighted average)
        a_score = authority.get("authority_score", 0)
        ig_score = authority.get("information_gain_score", a_score)  # fallback if old analysis
        s_score = structure.get("structure_score", 0)
        # Weight: authority 35%, information gain 35%, structure 30%
        combined = round((a_score * 0.35) + (ig_score * 0.35) + (s_score * 0.30))

        # Grade
        if combined >= 85:
            grade = "A"
        elif combined >= 70:
            grade = "B"
        elif combined >= 55:
            grade = "C"
        elif combined >= 40:
            grade = "D"
        else:
            grade = "F"

        # Top priority across both analyses
        priorities = []
        if authority.get("top_priority"):
            priorities.append(f"[Authority] {authority['top_priority']}")
        if structure.get("top_priority"):
            priorities.append(f"[Structure] {structure['top_priority']}")

        return {
            "url": url,
            "content_health_score": combined,
            "grade": grade,
            "authority_score": a_score,
            "information_gain_score": ig_score,
            "structure_score": s_score,
            "authority": authority,
            "structure": structure,
            "top_priorities": priorities,
            "quick_wins": authority.get("quick_wins", []),
            "information_gain_issues": authority.get("information_gain_issues", []),
        }

    def analyze_from_registry(self, domain: str) -> Dict[str, Any]:
        """
        Pull page content from the existing registry (already crawled)
        and run Content Doctor on the top pages.

        Returns a domain-level report with per-page diagnoses.
        """
        from app.services.storage import StorageService
        storage = StorageService()
        registry = storage.get_registry(domain)

        if not registry:
            return {
                "domain": domain,
                "error": f"No registry found for {domain}. Run an ingest job first.",
                "pages": [],
            }

        pages_analyzed = []

        # Analyze up to 5 pages from the registry (cost/latency budget)
        capabilities = getattr(registry, "capabilities", [])
        pages_to_analyze = capabilities[:5] if capabilities else []

        for cap in pages_to_analyze:
            url = getattr(cap, "url", "") or getattr(cap, "page_url", "")
            # Build content from registry fields available
            content_parts = []
            if getattr(cap, "name", ""):
                content_parts.append(f"# {cap.name}")
            if getattr(cap, "description", ""):
                content_parts.append(cap.description)
            if getattr(cap, "content", ""):
                content_parts.append(cap.content)

            content = "\n\n".join(content_parts)

            if content.strip():
                diagnosis = self.full_diagnosis(content, url)
                pages_analyzed.append(diagnosis)

        if not pages_analyzed:
            return {
                "domain": domain,
                "error": "No page content available in registry for analysis.",
                "pages": [],
            }

        # Domain-level summary
        avg_health = round(sum(p.get("content_health_score", 0) for p in pages_analyzed) / len(pages_analyzed))
        avg_authority = round(sum(p.get("authority", {}).get("authority_score", 0) for p in pages_analyzed) / len(pages_analyzed))
        avg_structure = round(sum(p.get("structure", {}).get("structure_score", 0) for p in pages_analyzed) / len(pages_analyzed))

        return {
            "domain": domain,
            "pages_analyzed": len(pages_analyzed),
            "domain_health_score": avg_health,
            "domain_authority_score": avg_authority,
            "domain_structure_score": avg_structure,
            "pages": pages_analyzed,
        }
