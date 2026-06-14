#!/usr/bin/env python3
"""
Génère un feuillet communautaire 4 pages A4 — style magazine.
Lit JSON depuis stdin, écrit PDF bytes sur stdout.
"""
import sys, json, io, re, urllib.request
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas
from reportlab.lib import colors
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.utils import ImageReader

try:
    from bidi.algorithm import get_display
    HAS_BIDI = True
except ImportError:
    HAS_BIDI = False

# Police hébraïque
HEBREW_FONT = 'Helvetica'
for path, name in [
    ('/System/Library/Fonts/SFHebrewRounded.ttf', 'SFHebrewRounded'),
    ('/System/Library/Fonts/SFHebrew.ttf', 'SFHebrew'),
    ('/System/Library/Fonts/Supplemental/Arial Unicode.ttf', 'ArialUnicode'),
]:
    try:
        pdfmetrics.registerFont(TTFont(name, path))
        HEBREW_FONT = name
        break
    except:
        continue

W, H = A4
M = 14 * mm
FULL_W = W - 2 * M


def has_hebrew(text):
    return any('א' <= ch <= 'ת' for ch in text)

def has_latin(text):
    return any('a' <= ch.lower() <= 'z' for ch in text)

def safe_he(text):
    result = []
    for ch in text:
        cp = ord(ch)
        if 0x05B0 <= cp <= 0x05EA: result.append(ch)
        elif ch.isascii() or ch.isspace(): result.append(ch)
        elif 0x00C0 <= cp <= 0x024F: result.append(ch)
    return ''.join(result)

def rtl(text, base='R'):
    if not text or not HAS_BIDI: return text
    return get_display(safe_he(text), base_dir=base)

def hex_c(h):
    h = h.lstrip('#')
    return colors.Color(int(h[0:2],16)/255, int(h[2:4],16)/255, int(h[4:6],16)/255)

def load_img(url):
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=5) as r:
            return ImageReader(io.BytesIO(r.read()))
    except:
        return None

def strip_md(text):
    return re.sub(r'\*{1,2}(.+?)\*{1,2}', r'\1', text)

def hline(c, x, y, w, color, thickness=0.5):
    c.setStrokeColor(color); c.setLineWidth(thickness)
    c.line(x, y, x + w, y)

def wrap(c, text, fname, fsize, max_w):
    result = []
    for para in text.split('\n'):
        if not para.strip():
            result.append(''); continue
        words = para.split(' ')
        cur = ''
        for word in words:
            test = (cur + ' ' + word).strip()
            plain = strip_md(test)
            fn = HEBREW_FONT if has_hebrew(plain) else fname
            if c.stringWidth(plain, fn, fsize) <= max_w:
                cur = test
            else:
                if cur: result.append(cur)
                cur = word
        if cur: result.append(cur)
    return result

def draw_line(c, x, y, text, fsize, color=colors.black, align='left', max_w=None):
    plain = strip_md(text)
    c.setFillColor(color)

    if has_hebrew(plain) and has_latin(plain):
        # Mixte : mot par mot
        words = plain.split(' ')
        cx = x
        sp = c.stringWidth(' ', 'Times-Roman', fsize)
        for word in words:
            if not word: cx += sp; continue
            if has_hebrew(word):
                c.setFont(HEBREW_FONT, fsize)
                drawn = rtl(word, 'R')
                c.drawString(cx, y, drawn)
                cx += c.stringWidth(drawn, HEBREW_FONT, fsize) + sp
            else:
                c.setFont('Times-Roman', fsize)
                c.drawString(cx, y, word)
                cx += c.stringWidth(word, 'Times-Roman', fsize) + sp
        return

    if has_hebrew(plain):
        c.setFont(HEBREW_FONT, fsize)
        drawn = rtl(plain, 'R')
        if align == 'center' and max_w:
            c.drawCentredString(x + max_w/2, y, drawn)
        else:
            c.drawString(x, y, drawn)
        return

    # Français avec gras/italique
    parts = re.split(r'(\*\*.*?\*\*|\*.*?\*)', text)
    if align == 'center' and max_w:
        total = sum(c.stringWidth(
            p[2:-2] if p.startswith('**') and len(p)>4 else
            p[1:-1] if p.startswith('*') and len(p)>2 else p,
            'Times-Bold' if p.startswith('**') and len(p)>4 else
            'Times-Italic' if p.startswith('*') and len(p)>2 else 'Times-Roman', fsize
        ) for p in parts)
        cx = x + (max_w - total) / 2
    elif align == 'right' and max_w:
        total = sum(c.stringWidth(strip_md(p), 'Times-Roman', fsize) for p in parts)
        cx = x + max_w - total
    else:
        cx = x
    for p in parts:
        if p.startswith('**') and p.endswith('**') and len(p) > 4:
            word, f = p[2:-2], 'Times-Bold'
        elif p.startswith('*') and p.endswith('*') and len(p) > 2:
            word, f = p[1:-1], 'Times-Italic'
        else:
            word, f = p, 'Times-Roman'
        c.setFont(f, fsize)
        c.drawString(cx, y, word)
        cx += c.stringWidth(word, f, fsize)

def draw_block(c, x, y, w, text, fsize=10, bottom=None, color=colors.black,
               spacing=1.45, align='left'):
    if bottom is None: bottom = M
    lines = wrap(c, text, 'Times-Roman', fsize, w)
    rest = []
    for i, line in enumerate(lines):
        if y < bottom:
            rest = lines[i:]; break
        if line == '':
            y -= fsize * 0.5
        else:
            draw_line(c, x, y, line, fsize, color=color, align=align, max_w=w)
            y -= fsize * spacing
    return y, rest

# ── Titre de section style magazine ──────────────────────────────────────────
def section_title(c, x, y, w, titre, cp_c, cs_c, icon='', fsize=10.5):
    """Titre avec ✦ décoratifs et ligne."""
    full = f'{icon}  {titre.upper()}' if icon else f'✦  {titre.upper()}  ✦'
    c.setFont('Times-Bold', fsize)
    tw = c.stringWidth(full, 'Times-Bold', fsize)
    # Lignes latérales
    pad = 4*mm
    lw = (w - tw - 2*pad) / 2
    if lw > 0:
        hline(c, x, y - 1, lw, cp_c, 0.6)
        hline(c, x + lw + tw + 2*pad, y - 1, lw, cp_c, 0.6)
    c.setFillColor(cp_c)
    c.drawString(x + lw + pad, y, full)
    return y - 6*mm

def verset_box(c, x, y, w, verset, traduction, cp_c, cs_c):
    """Encadré doré pour verset hébreu — style pensée de la semaine."""
    v_lines = wrap(c, verset, HEBREW_FONT, 13, w - 10*mm)
    t_lines = wrap(c, traduction, 'Times-Italic', 9, w - 10*mm) if traduction else []
    h = 4*mm + len(v_lines)*13*1.4 + (3*mm if t_lines else 0) + len(t_lines)*9*1.35 + 4*mm

    # Fond doré très clair
    c.setFillColor(hex_c('fffbea'))
    c.setStrokeColor(cs_c); c.setLineWidth(1)
    c.roundRect(x, y - h, w, h, 6, fill=1, stroke=1)

    # Étoiles décoratives
    c.setFont('Times-Bold', 9); c.setFillColor(cs_c)
    c.drawCentredString(x + w/2, y - 3.5*mm, '✦  ✦  ✦')

    vy = y - 7*mm
    for vl in v_lines:
        c.setFont(HEBREW_FONT, 13); c.setFillColor(hex_c('2c1a00'))
        plain_v = strip_md(vl)
        c.drawCentredString(x + w/2, vy, rtl(plain_v, 'R'))
        vy -= 13 * 1.4

    if t_lines:
        vy -= 2*mm
        for tl in t_lines:
            c.setFont('Times-Italic', 9); c.setFillColor(hex_c('555555'))
            c.drawCentredString(x + w/2, vy, strip_md(tl))
            vy -= 9 * 1.35

    return h


class PDF:
    def __init__(self, data):
        self.org = data.get('organisation', {})
        self.f = data.get('feuillet', {})
        self.cp = self.org.get('couleur_principale', '#1F4D78')
        self.cs = self.org.get('couleur_secondaire', '#c9a84c')
        self.cf = self.org.get('couleur_fond', '#fffdf8')
        self.buf = io.BytesIO()
        self._rest = []

    def cp_c(self): return hex_c(self.cp)
    def cs_c(self): return hex_c(self.cs)
    def cf_c(self): return hex_c(self.cf)

    def run(self):
        c = canvas.Canvas(self.buf, pagesize=A4)
        self._p1(c); c.showPage()
        self._p2(c); c.showPage()
        self._p3(c); c.showPage()
        self._p4(c); c.showPage()
        c.save()
        self.buf.seek(0)
        return self.buf.read()

    # ── Entête de page ────────────────────────────────────────────────────────
    def _header(self, c, full=True):
        f = self.f
        cp_c, cs_c = self.cp_c(), self.cs_c()

        if full:
            # Fond pleine largeur
            BH = 42*mm
            c.setFillColor(cp_c)
            c.rect(0, H - BH, W, BH, fill=1, stroke=0)

            # Logo
            logo_url = self.org.get('logo_url')
            if logo_url:
                img = load_img(logo_url)
                if img:
                    try:
                        c.drawImage(img, M, H-BH+3*mm, width=30*mm, height=36*mm,
                                   preserveAspectRatio=True, mask='auto')
                    except: pass

            # ✦ FEUILLET DE PARACHA ✦
            nom = self.org.get('nom_feuillet', 'Feuillet')
            c.setFillColor(cs_c); c.setFont('Times-Bold', 9)
            c.drawCentredString(W/2, H - 8*mm, f'✦  {nom.upper()}  ✦')

            # Nom paracha français
            c.setFillColor(colors.white); c.setFont('Times-Bold', 18)
            paracha_fr = f.get('paracha_fr', '')
            c.drawCentredString(W/2, H - 17*mm, paracha_fr)

            # Hébreu
            he = rtl(f.get('paracha_he', ''), 'R')
            c.setFont(HEBREW_FONT, 22); c.setFillColor(cs_c)
            c.drawCentredString(W/2, H - 27*mm, he)

            # Infos date + horaires sur une ligne
            date_str = f.get('date_shabbat', '')
            try:
                from datetime import datetime
                date_fr = datetime.strptime(date_str, '%Y-%m-%d').strftime('%d/%m/%Y')
            except:
                date_fr = date_str
            entree = f.get('heure_entree', '')
            sortie = f.get('heure_sortie', '')
            parts = []
            if date_fr: parts.append(f'Chabbat {date_fr}')
            if entree: parts.append(f'Entrée {entree}')
            if sortie: parts.append(f'Sortie {sortie}')
            if f.get('numero'): parts.append(f'N°{f["numero"]}')
            info = '  ·  '.join(parts)
            c.setFillColor(hex_c('cce0f5')); c.setFont('Times-Roman', 8)
            c.drawCentredString(W/2, H - BH + 4*mm, info)

            # Ligne dorée
            c.setStrokeColor(cs_c); c.setLineWidth(2)
            c.line(0, H - BH, W, H - BH)
            return BH

        else:
            # Entête compact pages 2-4
            BH = 16*mm
            c.setFillColor(cp_c)
            c.rect(0, H - BH, W, BH, fill=1, stroke=0)
            nom = self.org.get('nom_feuillet', 'Feuillet')
            c.setFillColor(cs_c); c.setFont('Times-Bold', 8)
            c.drawString(M, H - 7*mm, f'✦ {nom.upper()} ✦')
            c.setFillColor(colors.white); c.setFont('Times-Bold', 11)
            c.drawCentredString(W/2, H - 11*mm, f.get('paracha_fr', ''))
            he = rtl(f.get('paracha_he', ''), 'R')
            c.setFont(HEBREW_FONT, 12); c.setFillColor(cs_c)
            c.drawRightString(W - M, H - 10*mm, he)
            c.setStrokeColor(cs_c); c.setLineWidth(1.5)
            c.line(0, H - BH, W, H - BH)
            return BH

    def _footer(self, c, texte=''):
        cp_c, cs_c = self.cp_c(), self.cs_c()
        hline(c, M + 15*mm, M + 8*mm, FULL_W - 30*mm, cs_c, 0.7)
        c.setFont('Times-Italic', 8.5); c.setFillColor(cp_c)
        c.drawCentredString(W/2, M + 3*mm, texte or '✦  Chabbat Chalom  ✦')

    # ── PAGE 1 ────────────────────────────────────────────────────────────────
    def _p1(self, c):
        c.setFillColor(self.cf_c()); c.rect(0, 0, W, H, fill=1, stroke=0)
        BH = self._header(c, full=True)
        f = self.f
        cp_c, cs_c = self.cp_c(), self.cs_c()
        y = H - BH - 7*mm

        # Roch Hodech
        rh = f.get('roch_hodech', {})
        if rh.get('actif'):
            c.setFillColor(cs_c)
            c.roundRect(M, y - 6*mm, FULL_W, 6*mm, 3, fill=1, stroke=0)
            c.setFillColor(colors.white); c.setFont('Times-Bold', 8.5)
            txt = f"🌙 Roch Hodech {rh.get('nom_mois','')} · {rh.get('jours','')} · Nolad : {rh.get('nolad','')}"
            c.drawCentredString(W/2, y - 4.3*mm, txt)
            y -= 9*mm

        y -= 2*mm

        # Rubriques page 1
        rubriques = [r for r in f.get('rubriques_p1', []) if r.get('actif')]
        for r in rubriques:
            if y < M + 15*mm: break
            titre = r.get('titre', '')
            contenu = r.get('contenu', '')
            fsize = 10

            y = section_title(c, M, y, FULL_W, titre, cp_c, cs_c)

            lines = wrap(c, contenu, 'Times-Roman', fsize, FULL_W)
            for line in lines:
                if y < M + 12*mm: break
                if line == '':
                    y -= fsize * 0.5
                else:
                    draw_line(c, M, y, line, fsize)
                    y -= fsize * 1.45
            y -= 6*mm

        # Dédicace
        ded = f.get('dedicace', {})
        if ded.get('actif') and ded.get('placement') == 'page1':
            self._footer(c, f'✦  {ded["texte"]}  ✦')
        else:
            self._footer(c)

    # ── PAGE 2 ────────────────────────────────────────────────────────────────
    def _p2(self, c):
        c.setFillColor(self.cf_c()); c.rect(0, 0, W, H, fill=1, stroke=0)
        BH = self._header(c, full=False)
        f = self.f
        dt = f.get('dvar_torah', {})
        cp_c, cs_c = self.cp_c(), self.cs_c()
        y = H - BH - 8*mm
        bottom = M + 12*mm

        # Titre Dvar Torah
        y = section_title(c, M, y, FULL_W, 'Dvar Torah', cp_c, cs_c, icon='📖')
        y -= 2*mm

        # Verset dans encadré doré
        verset = dt.get('verset_hebreu', '')
        traduction = dt.get('traduction', '')
        if verset:
            vh = verset_box(c, M + 8*mm, y, FULL_W - 16*mm, verset, traduction, cp_c, cs_c)
            y -= vh + 6*mm
        elif traduction:
            c.setFont('Times-Italic', 10); c.setFillColor(cp_c)
            t_lines = wrap(c, traduction, 'Times-Italic', 10, FULL_W)
            for tl in t_lines:
                c.drawCentredString(W/2, y, tl); y -= 13
            y -= 4*mm

        # Développement
        dev = dt.get('developpement', '')
        y, self._rest = draw_block(c, M, y, FULL_W, dev, fsize=10.5, bottom=bottom)

        self._footer(c)

    # ── PAGE 3 ────────────────────────────────────────────────────────────────
    def _p3(self, c):
        c.setFillColor(self.cf_c()); c.rect(0, 0, W, H, fill=1, stroke=0)
        BH = self._header(c, full=False)
        f = self.f
        dt = f.get('dvar_torah', {})
        cp_c, cs_c = self.cp_c(), self.cs_c()
        y = H - BH - 8*mm
        bottom = M + 12*mm

        # Suite du développement
        rest = self._rest
        if not rest:
            dev = dt.get('developpement', '')
            all_lines = wrap(c, dev, 'Times-Roman', 10.5, FULL_W)
            skip = int((H - 20*mm - 50*mm) / (10.5 * 1.45))
            rest = all_lines[max(0, skip):]

        for line in rest:
            if y < bottom: break
            if line == '':
                y -= 10.5 * 0.5
            else:
                draw_line(c, M, y, line, 10.5)
                y -= 10.5 * 1.45

        y -= 6*mm

        # Signature élégante
        signe = dt.get('signataire', '')
        if signe and y > bottom + 15*mm:
            c.setFont('Times-Italic', 9); c.setFillColor(cs_c)
            c.drawCentredString(W/2, y, f'✦  Chabbat Chalom  ·  {signe}  ✦')

        self._footer(c)

    # ── PAGE 4 ────────────────────────────────────────────────────────────────
    def _p4(self, c):
        c.setFillColor(self.cf_c()); c.rect(0, 0, W, H, fill=1, stroke=0)
        BH = self._header(c, full=False)
        f = self.f
        cp_c, cs_c = self.cp_c(), self.cs_c()
        y = H - BH - 8*mm
        bottom = M + 12*mm

        # Titre page famille
        c.setFont('Times-Bold', 9); c.setFillColor(cs_c)
        c.drawCentredString(W/2, y, '✦  PAGE FAMILLE  ✦')
        y -= 7*mm

        encadres = f.get('encadres_p4', [])
        n = len(encadres)
        if n == 0:
            self._footer(c)
            return

        gutter = 5*mm
        col_w = (FULL_W - gutter) / 2

        for i, enc in enumerate(encadres):
            titre = enc.get('titre', '')
            contenu = enc.get('contenu', '')
            if y < bottom + 30*mm: break

            # En colonne si 2+ encadrés
            if n >= 2:
                col = i % 2
                x = M + col * (col_w + gutter)
                w = col_w
                # Nouvelle rangée ?
                if col == 0 and i > 0:
                    y -= 6*mm
            else:
                x = M; w = FULL_W

            y_before = y
            y2 = section_title(c, x, y, w, titre, cp_c, cs_c, fsize=9.5)
            lines = wrap(c, contenu, 'Times-Roman', 9.5, w)
            for line in lines:
                if y2 < bottom: break
                if line == '':
                    y2 -= 9.5 * 0.5
                else:
                    draw_line(c, x, y2, line, 9.5)
                    y2 -= 9.5 * 1.4

            # Si 2 colonnes, on ne baisse y qu'après chaque paire
            if n < 2 or col == 1 or i == n-1:
                y = y2
                y -= 4*mm
            elif col == 0:
                y = y_before  # garde le y pour la colonne droite

        # Dédicace
        ded = f.get('dedicace', {})
        if ded.get('actif') and ded.get('placement') == 'page4':
            self._footer(c, f'✦  {ded["texte"]}  ✦')
        else:
            self._footer(c)


if __name__ == '__main__':
    data = json.load(sys.stdin)
    sys.stdout.buffer.write(PDF(data).run())
