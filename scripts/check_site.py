"""Audit local URLs in the built site. Missing assets must block migration."""
import json
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parent.parent / 'dist'


class References(HTMLParser):
    def __init__(self):
        super().__init__()
        self.urls = set()
        self.ids = set()

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if attrs.get('id'):
            self.ids.add(attrs['id'])
        if attrs.get('srcset'):
            for candidate in attrs['srcset'].split(','):
                self.urls.add(candidate.strip().split()[0])
        for key in ('src', 'href', 'poster'):
            if attrs.get(key):
                self.urls.add(attrs[key])


def main():
    if not (ROOT / 'index.html').is_file():
        raise SystemExit('Build missing: run npm run build first.')
    failures = set()
    for path in ROOT.rglob('*'):
        if path.is_file() and path.suffix in ('.html', '.js', '.css'):
            text = path.read_text(encoding='utf-8')
            if any(host in text for host in ('assets.macaly-user-data.dev', '.convex.cloud', '/_next/')):
                failures.add(f'{path.relative_to(ROOT)}: legacy hosting dependency')
    checked = 0
    pages = list(ROOT.rglob('*.html'))
    for page in pages:
        parser = References()
        parser.feed(page.read_text(encoding='utf-8'))
        for url in sorted(parser.urls):
            parsed = urlsplit(url)
            if parsed.scheme or parsed.netloc:
                continue
            checked += 1
            if not parsed.path:
                if parsed.fragment and unquote(parsed.fragment) not in parser.ids:
                    failures.add(f'{page.relative_to(ROOT)}: unknown anchor {url}')
                continue
            base = ROOT if parsed.path.startswith('/') else page.parent
            target = (base / unquote(parsed.path).lstrip('/')).resolve()
            if not target.is_relative_to(ROOT.resolve()):
                failures.add(f'{page.relative_to(ROOT)}: URL escapes site: {url}')
                continue
            if target.is_dir():
                target /= 'index.html'
            if not target.is_file():
                failures.add(f'{page.relative_to(ROOT)}: missing {url}')
            elif target.suffix == '.json':
                json.loads(target.read_text(encoding='utf-8'))
    for failure in sorted(failures):
        print(f'FAIL {failure}')
    print(f'Checked {len(pages)} HTML page(s), {checked} local references; {len(failures)} error(s).')
    raise SystemExit(1 if failures else 0)


if __name__ == '__main__':
    main()
