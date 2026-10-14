"""One-time import of public HOMEolka assets and the queries used by its public page.

TLS verification and the environment HTTPS proxy stay enabled. No authentication,
admin APIs, mutations or private records are used. Run manually, not during build.
"""
import argparse
import hashlib
import json
import shutil
import subprocess
import tempfile
from pathlib import Path
from urllib.parse import urlsplit
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parent.parent
API = 'https://wooden-oyster-645.eu-west-1.convex.cloud/api/query'


def query(name):
    request = Request(API, data=json.dumps({'path': name, 'args': {}, 'format': 'json'}).encode(),
                      headers={'Content-Type': 'application/json'})
    with urlopen(request, timeout=30) as response:
        result = json.load(response)
    if result.get('status') != 'success':
        raise RuntimeError(f'Public query {name} did not succeed')
    return result['value']


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--refresh', action='store_true', help='Explicitly replace an existing content snapshot')
    args = parser.parse_args()
    target = ROOT / 'content/site.json'
    if target.exists() and not args.refresh:
        raise SystemExit('Snapshot exists. Use --refresh only to replace it with the current public site.')
    settings = query('settings:getAll')
    data = {
        'settings': {k: v for k, v in settings.items() if k in {
            'aboutText', 'openingHours', 'openingNote', 'contactEmail', 'instagramUrl', 'facebookUrl'}},
        'upcomingEvents': query('events:getUpcoming'),
        'pastEvents': query('events:getPast'),
        'gallery': query('gallery:getVisible'),
    }
    # Keep only fields needed to display the public content.
    event_keys = {'title', 'date', 'time', 'location', 'description', 'imageUrl', 'externalLink'}
    gallery_keys = {'imageUrl', 'altText', 'instagramUrl'}
    for name in ('upcomingEvents', 'pastEvents', 'gallery'):
        keys = gallery_keys if name == 'gallery' else event_keys
        data[name] = [{k: v for k, v in item.items() if k in keys} for item in data[name]]
    sources = json.loads((ROOT / 'content/asset-sources.json').read_text())
    sources['https://www.homeolka.cz/favicon.ico'] = './assets/media/favicon.ico'
    sources['https://www.homeolka.cz/apple-icon.png'] = './assets/media/apple-icon.png'
    for item in data['upcomingEvents'] + data['gallery']:
        if not item.get('imageUrl'):
            continue
        url = item['imageUrl']
        if not url.startswith('https://'):
            raise RuntimeError('Expected an HTTPS public image URL')
        suffix = Path(urlsplit(url).path).suffix
        if suffix.lower() not in ('.png', '.jpg', '.jpeg', '.webp', '.svg', '.avif', '.gif'):
            suffix = '.jpg'
        local = './assets/media/' + hashlib.sha256(url.encode()).hexdigest()[:16] + suffix
        sources[url] = local
        item['imageUrl'] = local
    for item in data['upcomingEvents'] + data['pastEvents']:
        url = item.get('externalLink', '')
        if url.startswith('https://assets.macaly-user-data.dev/'):
            local = './assets/media/' + Path(urlsplit(url).path).name
            sources[url] = local
            item['externalLink'] = local
    with tempfile.TemporaryDirectory(prefix='homeolka-import-') as temp:
        staged = Path(temp)
        for url, local in sources.items():
            path = Path(local)
            if path.is_absolute() or '..' in path.parts or path.parts[:2] != ('assets', 'media'):
                raise RuntimeError('Invalid local media path')
            destination = staged / path
            destination.parent.mkdir(parents=True, exist_ok=True)
            # The asset CDN rejects Python's urllib client (Cloudflare 1010).
            # curl is accepted and uses normal certificate verification.
            subprocess.run(['curl', '--fail', '--location', '--silent', '--show-error',
                            '--max-time', '40', url, '--output', str(destination)], check=True)
            body = destination.read_bytes()
            if not body or body.lstrip().lower().startswith((b'<!doctype html', b'<html')):
                raise RuntimeError(f'Unexpected asset response for {url}')
            print('Downloaded', path.name, len(body), 'bytes')
        (ROOT / 'assets/media').mkdir(exist_ok=True)
        shutil.copytree(staged / 'assets/media', ROOT / 'assets/media', dirs_exist_ok=True)
        target.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')
        (ROOT / 'content/asset-sources.json').write_text(json.dumps(sources, indent=2) + '\n')
    print(f'Imported {len(sources)} assets, {len(data["upcomingEvents"])} upcoming events, '
          f'{len(data["pastEvents"])} past events and {len(data["gallery"])} gallery images.')


if __name__ == '__main__':
    main()
