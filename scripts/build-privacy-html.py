#!/usr/bin/env python3
"""Generates public/privacy.html from PRIVACY_POLICY.md (run after editing the policy)."""
import html
import re
from pathlib import Path

root = Path(__file__).resolve().parent.parent
md = (root / 'PRIVACY_POLICY.md').read_text(encoding='utf-8').splitlines()


def inline(t):
    t = html.escape(t)
    t = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', t)
    t = re.sub(r'`(.+?)`', r'<code>\1</code>', t)
    return re.sub(r'(https?://[^\s<)]+[^\s<).,])', r'<a href="\1">\1</a>', t)


out, para, in_list = [], [], False


def flush():
    if para:
        out.append('<p>' + '<br>'.join(inline(x) for x in para) + '</p>')
        para.clear()


for line in md:
    m = re.match(r'^(#{1,3}) (.*)', line)
    if m or line.startswith('- ') or not line.strip():
        flush()
    if in_list and not line.startswith('- '):
        out.append('</ul>')
        in_list = False
    if m:
        n = len(m.group(1))
        out.append(f'<h{n}>{inline(m.group(2))}</h{n}>')
    elif line.startswith('- '):
        if not in_list:
            out.append('<ul>')
            in_list = True
        out.append('<li>' + inline(line[2:]) + '</li>')
    elif line.strip():
        para.append(line)
flush()
if in_list:
    out.append('</ul>')

body = '\n'.join(out)
(root / 'public' / 'privacy.html').write_text(f'''<!doctype html>
<html lang="pl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Polityka prywatności – PetCare</title>
<style>
body{{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:760px;margin:0 auto;padding:24px 18px 64px;line-height:1.6;color:#1f2937;background:#fff}}
h1{{color:#0f766e;font-size:1.7rem}}h2{{margin-top:2rem;font-size:1.25rem;color:#115e59}}h3{{font-size:1.05rem;margin-top:1.4rem}}
code{{background:#f1f5f9;padding:1px 5px;border-radius:4px}}a{{color:#0f766e}}
@media (prefers-color-scheme:dark){{body{{background:#0f172a;color:#e2e8f0}}h1,h2,a{{color:#5eead4}}code{{background:#1e293b}}}}
</style>
</head>
<body>
{body}
</body>
</html>
''', encoding='utf-8')
