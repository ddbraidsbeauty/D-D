#!/usr/bin/env python3
"""Build D&D's deployable JS/CSS from maintainable ordered sources.

The classic JS bundle deliberately retains ONE closure: the original modules
share private lexical bindings. Splitting runtime <script> tags would break
that invariant and the existing GitHub Pages deployment.
No npm packages or bundler required.
"""
from pathlib import Path
import argparse

ROOT=Path(__file__).resolve().parent.parent
JS_SOURCES=tuple(sorted((ROOT/'src').glob('*.js')))
CSS_SOURCES=tuple(sorted((ROOT/'styles').glob('*.css')))
assert len(JS_SOURCES)==9, 'Expected all nine ordered JS source modules'
assert len(CSS_SOURCES)==6, 'Expected all six ordered CSS source modules'

def build_js():
    parts=["/* D&D Braids Beauty — generated bundle. Edit src/*.js; run python tools/build.py. */\n(() => {\n'use strict';\n"]
    for src in JS_SOURCES:
        parts.append(f'\n/* === {src.name}: begin === */\n')
        parts.append(src.read_text(encoding='utf-8').rstrip()+'\n')
        parts.append(f'/* === {src.name}: end === */\n')
    return ''.join(parts)+'\n})();\n'

def build_css():
    parts=['/* D&D Braids Beauty — generated stylesheet. Edit styles/*.css; run python tools/build.py. */\n']
    for src in CSS_SOURCES:
        parts.append(f'\n/* === {src.name} === */\n')
        parts.append(src.read_text(encoding='utf-8').rstrip()+'\n')
    return ''.join(parts)

if __name__=='__main__':
    p=argparse.ArgumentParser()
    p.add_argument('--check',action='store_true',help='Check if generated assets are current')
    a=p.parse_args()
    outputs={'app.js':build_js(),'styles.css':build_css()}
    if a.check:
        outdated=[name for name,source in outputs.items() if not (ROOT/name).exists() or (ROOT/name).read_text(encoding='utf-8')!=source]
        if outdated:raise SystemExit('Generated files outdated: '+', '.join(outdated)+'. Run python tools/build.py')
        print('Build current: '+', '.join(outputs))
    else:
        for name,source in outputs.items():
            (ROOT/name).write_text(source,encoding='utf-8')
            print(f'Wrote {name}: {len(source):,} characters')
