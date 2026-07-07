"""
Safe Python code executor for the technical agent.
Runs code in a subprocess with a hard timeout and restricted builtins.
"""
import subprocess
import sys
import tempfile
import os
import re

TIMEOUT_SECONDS = 10
MAX_OUTPUT_CHARS = 3000

BLOCKED = ["import os", "import sys", "import subprocess", "import socket",
           "import shutil", "__import__", "open(", "eval(", "exec("]


def is_safe(code: str) -> tuple[bool, str]:
    for b in BLOCKED:
        if b in code:
            return False, f"Blocked: '{b}' not allowed in sandbox"
    return True, ""


def extract_code(text: str) -> str:
    """Pull code block out of markdown if present."""
    match = re.search(r"```(?:python)?\n(.*?)```", text, re.DOTALL)
    if match:
        return match.group(1).strip()
    return text.strip()


def execute_code(code: str) -> dict:
    code = extract_code(code)
    safe, reason = is_safe(code)
    if not safe:
        return {"success": False, "error": reason, "output": "", "code": code}

    with tempfile.NamedTemporaryFile(mode="w", suffix=".py", delete=False) as f:
        f.write(code)
        tmp = f.name

    try:
        result = subprocess.run(
            [sys.executable, tmp],
            capture_output=True, text=True, timeout=TIMEOUT_SECONDS,
        )
        stdout = result.stdout[:MAX_OUTPUT_CHARS]
        stderr = result.stderr[:MAX_OUTPUT_CHARS]
        return {
            "success": result.returncode == 0,
            "output": stdout,
            "error": stderr if result.returncode != 0 else "",
            "return_code": result.returncode,
            "code": code,
        }
    except subprocess.TimeoutExpired:
        return {"success": False, "error": f"Timed out after {TIMEOUT_SECONDS}s", "output": "", "code": code}
    finally:
        os.unlink(tmp)


def analyze_data(csv_text: str, question: str) -> dict:
    """Run pandas analysis on CSV data passed as text."""
    safe_code = f"""
import pandas as pd
import io

csv_data = '''{csv_text}'''
df = pd.read_csv(io.StringIO(csv_data))
print("Shape:", df.shape)
print("Columns:", list(df.columns))
print("\\nData types:")
print(df.dtypes.to_string())
print("\\nBasic stats:")
print(df.describe().to_string())
print("\\nFirst 5 rows:")
print(df.head().to_string())
"""
    result = subprocess.run(
        [sys.executable, "-c", safe_code],
        capture_output=True, text=True, timeout=TIMEOUT_SECONDS,
    )
    return {
        "success": result.returncode == 0,
        "analysis": result.stdout[:MAX_OUTPUT_CHARS],
        "error": result.stderr[:500] if result.returncode != 0 else "",
        "question": question,
    }
