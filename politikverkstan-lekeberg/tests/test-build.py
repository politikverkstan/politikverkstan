"""0.9.1 build hardening regression tests; never change the live working tree."""
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile

root = Path(__file__).resolve().parents[1]
with tempfile.TemporaryDirectory(prefix="politikverkstan-build-") as tmp:
    work = Path(tmp)
    shutil.copy(root / "build.py", work / "build.py")
    shutil.copytree(root / "src", work / "src")
    shutil.copytree(root / "worker", work / "worker")
    for name in ("favicon.ico", "lekeberg-landskap.svg"):
        shutil.copy(root / name, work / name)

    def run(*args):
        return subprocess.run(
            [sys.executable, str(work / "build.py"), *args],
            cwd=work, capture_output=True, text=True,
        )

    first = run()
    assert first.returncode == 0, first.stderr
    assert (work / "dist/index.html").is_file()
    assert (work / "worker/workroom-page.mjs").is_file()
    clean = run("--check")
    assert clean.returncode == 0, clean.stderr

    # The check command must not silently rebuild stale deployed content.
    old = (work / "dist/index.html").read_bytes()
    (work / "dist/index.html").write_bytes(old + b"\nCORRUPTION")
    stale = run("--check")
    assert stale.returncode != 0, "Stale public build must be rejected"
    assert (work / "dist/index.html").read_bytes() != old, "--check must not modify files"
    assert run().returncode == 0
    assert run("--check").returncode == 0

    # Missing template tokens were silently accepted before 0.9.1.
    template = work / "src/index.template.html"
    original = template.read_text(encoding="utf-8")
    assert "/*APP*/" in original
    template.write_text(original.replace("/*APP*/", "missing app"), encoding="utf-8")
    result = run()
    assert result.returncode != 0, "Missing /*APP*/ must fail the build"
    assert "/*APP*/" in result.stderr, result.stderr
    template.write_text(original, encoding="utf-8")

    # The guard must stop accidental publication of protected API paths.
    app = work / "src/app.js"
    app_original = app.read_text(encoding="utf-8")
    app.write_text(app_original + "\n// /api/private/cases", encoding="utf-8")
    result = run()
    assert result.returncode != 0, "Private API references in public build must fail"
    assert "private workroom" in result.stderr, result.stderr

print("PASS: build artifacts, read-only verification, missing markers and public/private separation")
