from enum import Enum
from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class JobStatus(str, Enum):
    PENDING = "pending"
    CRAWLING = "crawling"
    COMPREHENDING = "comprehending"
    STORING = "storing"
    COMPLETE = "complete"
    FAILED = "failed"


class IngestJob(BaseModel):
    job_id: str
    domain: str
    url: str
    status: JobStatus = JobStatus.PENDING
    created_at: datetime
    completed_at: Optional[datetime] = None
    error: Optional[str] = None
    pages_crawled: int = 0
    confidence_score: float = 0.0
