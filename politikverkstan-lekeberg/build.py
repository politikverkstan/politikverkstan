"""Build the public portal and the authenticated workroom.

Use "python build.py --check" in CI to fail when committed artifacts are stale.
No private documents or case data are embedded in the public HTML.
"""
from pathlib import Path
import json
import sys

ROOT = Path(__file__).resolve().parent
SRC = ROOT / "src"
DIST = ROOT / "dist"
CHECK = sys.argv[1:] == ["--check"]
if sys.argv[1:] not in ([], ["--check"]):
    raise SystemExit("Usage: python build.py [--check]")


def read(relative: str) -> str:
    return (ROOT / relative).read_text(encoding="utf-8")


def replace_once(template: str, marker: str, value: str, label: str) -> str:
    count = template.count(marker)
    if count != 1:
        raise RuntimeError(f"{label}: expected exactly one {marker}, found {count}")
    return template.replace(marker, value, 1)


def no_markers(value: str, markers: list[str], label: str) -> None:
    remaining = [marker for marker in markers if marker in value]
    if remaining:
        raise RuntimeError(f"{label}: unresolved build markers: {', '.join(remaining)}")


def build_public() -> str:
    replacements = {
        "/*CSS*/": read("src/style.css"),
        "/*DATA*/": read("src/organizations.json").replace("</", "<\\/"),
        "/*ENGINE*/": read("src/engine.js").replace("</script", r"<\/script"),
        "/*CANDIDATES*/": read("src/candidate-engine.js").replace("</script", r"<\/script"),
        "/*APP*/": read("src/app.js").replace("</script", r"<\/script"),
    }
    result = read("src/index.template.html")
    for key, value in replacements.items():
        result = replace_once(result, key, value, "Public portal")
    no_markers(result, list(replacements), "Public portal")
    # A protected endpoint can only be reached through the Worker, never exposed
    # as a named API or a workroom module in the public static HTML bundle.
    forbidden = ("/api/private/cases", "/api/private/meetings", "function casesPage(){",
                 "function meetingsPage(){", "/api/private/motions")
    exposed = [word for word in forbidden if word in result]
    if exposed:
        raise RuntimeError(f"Public portal references private workroom features: {exposed}")
    return result


def build_workroom() -> str:
    work = replace_once(read("src/workroom.template.html"), "/*WORKCSS*/",
                        read("src/workroom.css").replace("</style", r"<\/style"), "Workroom")
    work_js = read("src/workroom.js")
    addons = "\n".join(read("src/" + name) for name in
                       ("meetings-ui.js", "meetings-page.js", "meetings-actions.js"))
    work_js = replace_once(work_js, "function casesPage(){",
                           addons + "\nfunction casesPage(){", "Workroom functions")
    scripts = (read("src/workroom-pdf.js") + "\n" + work_js).replace("</script", r"<\/script")
    work = replace_once(work, "/*WORKJS*/", scripts, "Workroom")
    no_markers(work, ["/*WORKCSS*/", "/*WORKJS*/"], "Workroom")
    if work.count("__CSP_NONCE__") != 2:
        raise RuntimeError("Workroom: expected two CSP nonce placeholders")
    return "export const WORKROOM_HTML = " + json.dumps(work, ensure_ascii=False) + ";\n"


def match_bytes(path: Path, content: bytes) -> None:
    if not path.is_file() or path.read_bytes() != content:
        raise RuntimeError(f"Stale or missing generated file: {path.relative_to(ROOT)}")


public = build_public().encode("utf-8")
workroom = build_workroom().encode("utf-8")
outputs = {
    DIST / "index.html": public,
    ROOT / "index.html": public,
    DIST / "favicon.ico": (ROOT / "favicon.ico").read_bytes(),
    DIST / "lekeberg-landskap.svg": (ROOT / "lekeberg-landskap.svg").read_bytes(),
    ROOT / "worker" / "workroom-page.mjs": workroom,
}
obsolete = DIST / "Mandatportal-Lekeberg.html"
if obsolete.exists():
    raise RuntimeError("Obsolete public HTML alias must not be shipped")

if CHECK:
    for path, content in outputs.items():
        match_bytes(path, content)
    print("Build verification passed: all five generated artifacts are current.")
else:
    DIST.mkdir(exist_ok=True)
    for path, content in outputs.items():
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(content)
    print(f"Built public portal ({len(public)} bytes) and protected workroom ({len(workroom)} bytes).")
