"""Run all browser regressions, report every failure, and exit nonzero if any fail.

Optional: python tests/run-browser-suite.py test-guide-ui.py test-meetings-ui.py
This script is deliberately independent of Cloudflare production.
"""
from pathlib import Path
import subprocess
import sys

root = Path(__file__).resolve().parents[1]
tests = [
    "test-ui.py",
    "test-candidate-ui.py",
    "test-v4-ui.py",
    "test-workroom-ui.py",
    "test-collaboration-ui.py",
    "test-layout-052.py",
    "test-theme-ui.py",
    "test-landing-056.py",
    "test-guide-ui.py",
    "test-stage2-ui.py",
    "test-shared-cases-ui.py",
    "test-meetings-ui.py",
    "test-dashboard-ui.py",
    "test-navigation-history.py",
    "test-navigation-ui.py",
]
requested = sys.argv[1:]
if requested:
    invalid = [name for name in requested if name not in tests]
    if invalid:
        raise SystemExit("Unknown browser tests: " + ", ".join(invalid))
    tests = requested

failures = []
for name in tests:
    print(f"\n=== Browser regression: {name} ===", flush=True)
    try:
        result = subprocess.run(
            [sys.executable, str(root / "tests" / name)],
            cwd=root, capture_output=True, text=True,
            timeout=180,
        )
        if result.stdout:
            print(result.stdout.rstrip(), flush=True)
        if result.returncode:
            failures.append(name)
            print(result.stderr.rstrip(), file=sys.stderr, flush=True)
        else:
            print(f"PASS {name}", flush=True)
    except subprocess.TimeoutExpired:
        failures.append(name)
        print(f"TIMEOUT {name}: exceeded 180 seconds", file=sys.stderr, flush=True)

print(f"\nBrowser suite: {len(tests) - len(failures)}/{len(tests)} passed", flush=True)
if failures:
    print("Failed: " + ", ".join(failures), file=sys.stderr, flush=True)
    raise SystemExit(1)
