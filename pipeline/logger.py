import sys
import json
import time
from datetime import datetime
from typing import Any, Optional

class StructuredLogger:
    def __init__(self, job_id: str = "default"):
        self.job_id = job_id
        self.start_times = {}

    def start_timer(self, step: str):
        self.start_times[step] = time.time()

    def get_duration_ms(self, step: str) -> Optional[int]:
        if step in self.start_times:
            return int((time.time() - self.start_times[step]) * 1000)
        return None

    def log(self, level: str, step: str, message: str, progress: Optional[int] = None, details: Any = None):
        duration_ms = self.get_duration_ms(step)
        record = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "level": level.upper(),
            "job_id": self.job_id,
            "step": step,
            "message": message,
        }
        if progress is not None:
            record["progress"] = progress
        if duration_ms is not None:
            record["duration_ms"] = duration_ms
        if details is not None:
            record["details"] = details

        # Emit standard machine-parsable JSON line to stdout
        json_line = json.dumps(record)
        # Also print status flag for legacy stream parsers
        if progress is not None:
            print(f"[STATUS] {progress}% - {message}", flush=True)
        print(f"[LOG_JSON] {json_line}", flush=True)

    def info(self, step: str, message: str, progress: Optional[int] = None, details: Any = None):
        self.log("INFO", step, message, progress, details)

    def warn(self, step: str, message: str, progress: Optional[int] = None, details: Any = None):
        self.log("WARN", step, message, progress, details)

    def error(self, step: str, message: str, details: Any = None):
        self.log("ERROR", step, message, None, details)

    def done(self, step: str, message: str, details: Any = None):
        self.log("INFO", step, message, 100, details)

def emit_log(level: str, message: str, job_id: str = "default", step: str = "pipeline", progress: Optional[int] = None, details: Any = None):
    StructuredLogger(job_id=job_id).log(level, step, message, progress, details)
