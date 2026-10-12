"""Regression checks for the refactored classic-script deployment."""
from pathlib import Path
import re
import subprocess

ROOT = Path(__file__).resolve().parent.parent
src = ROOT / 'src'
files = list(sorted(src.glob('*.js')))
assert len(files) == 9, 'Expected nine ordered source modules'
source = '\n'.join(f.read_text(encoding='utf-8') for f in files)
assert 'pro_karol' not in source, 'Unapproved demo operator still present'
assert 'adminPassword' not in source, 'Unused password storage field still present'
assert 'p_consent_accepted:booking.consentAccepted===true' in source, 'Consent not passed to backend'
assert source.count('function submitRequest(') == 1, 'Conflicting submission implementation'
assert source.count('function renderAccount(') == 1, 'Conflicting customer-portal implementation'
assert source.count('function renderSpecificConsent(') == 1, 'Conflicting consent implementation'
assert 'data-restore-demo' not in source and 'data-clear-data' not in source, 'Inert demo actions still presented'
assert 'BOOKING_DRAFT_FIELDS' in source and 'cleanBookingDraft(d.booking)' in source, 'Draft whitelist absent'
assert 'data:image/jpeg;base64' not in source, 'Large demo assets embedded in JS'
# Reused demo media must be packaged as real assets.
media = (src/'00-media.js').read_text(encoding='utf-8')
for path in re.findall(r'"(assets/demo/[^\"]+)"', media):
    assert (ROOT/path).is_file(), f'Image missing: {path}'
for path in (ROOT/'assets/demo').rglob('*'):
    if path.is_file(): assert path.relative_to(ROOT).as_posix() in media, f'Unused bundled image: {path}'
subprocess.run(['python', 'tools/build.py', '--check'], cwd=ROOT, check=True)
print('✓ Contrato de código, duplicações, fontes e imagens: aprovado')
