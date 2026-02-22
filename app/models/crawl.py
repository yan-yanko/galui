from pydantic import BaseModel
from typing import List, Optional


class PageContent(BaseModel):
    url: str
    title: Optional[str] = None
    text: str
    html: Optional[str] = None
    status_code: int = 200
    is_error: bool = False


class CrawlResult(BaseModel):
    domain: str
    seed_url: str
    pages: List[PageContent]
    total_pages: int
    crawl_duration_ms: int
    used_playwright: bool = False
