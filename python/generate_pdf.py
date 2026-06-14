#!/usr/bin/env python3
"""
Génère un feuillet communautaire 4 pages A4.
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

# Police hébraïque — SFHebrewRounded en priorité
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
M = 12 * mm
FULL_W = W - 2 * M


def has_latin(text):
    return any('a' <= ch.lower() <= 'z' for ch in text)

def rtl(text, force_base=None):
    """Applique bidi pour affichage correct de l'hébreu dans ReportLab (LTR).
    Texte pur hébreu → base_dir='R'. Texte mixte hébreu+français → base_dir='L'.
    """
    if not text or not HAS_BIDI:
        return text
    if force_base:
        return get_display(text, base_dir=force_base)
    # Mixte = hébreu ET latin → base LTR pour garder le français dans le bon sens
    if has_hebrew(text) and has_latin(text):
        return get_display(text, base_dir='L')
    return get_display(text, base_dir='R')


def has_hebrew(text):
    return any('א' <= ch <= 'ת' for ch in text)


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


def wrap(c, text, fname, fsize, max_w):
    """Découpe le texte en lignes respectant max_w."""
    result = []
    for para in text.split('\n'):
        if not para.strip():
            result.append('')
            continue
        words = para.split(' ')
        cur = ''
        for word in words:
            test = (cur + ' ' + word).strip()
            plain = strip_md(test)
            fn = HEBREW_FONT if has_hebrew(plain) else fname
            if c.stringWidth(plain, fn, fsize) <= max_w:
                cur = test
            else:
                if cur:
                    result.append(cur)
                cur = word
        if cur:
            result.append(cur)
    return result


def safe_hebrew(text):
    """Garde seulement les caractères supportés : lettres hébraïques, nikud, ponctuation courante."""
    allowed = set(' .,;:!?()-\'"«»–—\n')
    result = []
    for ch in text:
        cp = ord(ch)
        # Lettres hébraïques (U+05D0–05EA) et nikud (U+05B0–05C7)
        if 0x05B0 <= cp <= 0x05EA:
            result.append(ch)
        # Latin et ponctuation courante
        elif ch.isascii() or ch in allowed or ch.isspace():
            result.append(ch)
        # Caractères français accentués
        elif 0x00C0 <= cp <= 0x024F:
            result.append(ch)
        # Tout le reste : ignorer (évite les carrés noirs)
    return ''.join(result)


def draw_line(c, x, y, text, fsize, color=colors.black):
    """Dessine une ligne. Hébreu via bidi mot par mot pour éviter d'inverser le français."""
    plain = strip_md(text)
    c.setFillColor(color)

    if has_hebrew(plain) and has_latin(plain):
        # MIXTE : dessiner mot par mot pour ne pas inverser le français
        words = plain.split(' ')
        cx = x
        sp_w = c.stringWidth(' ', 'Times-Roman', fsize)
        for word in words:
            if not word:
                cx += sp_w
                continue
            safe = safe_hebrew(word)
            if has_hebrew(safe):
                c.setFont(HEBREW_FONT, fsize)
                drawn = rtl(safe, force_base='R')
                c.drawString(cx, y, drawn)
                cx += c.stringWidth(drawn, HEBREW_FONT, fsize) + sp_w
            else:
                c.setFont('Times-Roman', fsize)
                c.drawString(cx, y, safe)
                cx += c.stringWidth(safe, 'Times-Roman', fsize) + sp_w
        return

    if has_hebrew(plain):
        # PUR HÉBREU : bidi R
        c.setFont(HEBREW_FONT, fsize)
        c.drawString(x, y, rtl(safe_hebrew(plain), force_base='R'))
        return

    # FRANÇAIS seul : gras / italique
    parts = re.split(r'(\*\*.*?\*\*|\*.*?\*)', text)
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


def draw_block(c, x, y, w, text, fsize=10, bottom=None, color=colors.black, spacing=1.38):
    """Dessine un bloc de texte wrappé, retourne (y_final, lignes_non_affichées)."""
    if bottom is None:
        bottom = M
    lines = wrap(c, text, 'Times-Roman', fsize, w)
    for i, line in enumerate(lines):
        if y < bottom:
            return y, lines[i:]
        if line == '':
            y -= fsize * 0.5
        else:
            draw_line(c, x, y, line, fsize, color=color)
            y -= fsize * spacing
    return y, []


def hline(c, x, y, w, color, thickness=0.5):
    c.setStrokeColor(color)
    c.setLineWidth(thickness)
    c.line(x, y, x + w, y)


def encadre(c, x, y, w, titre, contenu, cp, cs, cf, fsize=10):
    """Encadré avec bandeau titre. Hauteur calculée sur le contenu."""
    cp_c, cs_c, cf_c = hex_c(cp), hex_c(cs), hex_c(cf)
    lines = wrap(c, contenu, 'Times-Roman', fsize - 0.5, w - 6*mm)
    # Hauteur = bandeau + lignes + padding
    n_lines = len([l for l in lines if l]) + lines.count('') * 0.5
    h = 8*mm + n_lines * (fsize - 0.5) * 1.4 + 5*mm

    # Fond + bordure
    c.setFillColor(cf_c)
    c.setStrokeColor(cp_c)
    c.setLineWidth(0.8)
    c.roundRect(x, y - h, w, h, 5, fill=1, stroke=1)

    # Bandeau titre
    c.setFillColor(cp_c)
    c.roundRect(x, y - 8*mm, w, 8*mm, 4, fill=1, stroke=0)
    c.setFillColor(colors.white)
    c.setFont('Times-Bold', fsize + 0.5)
    c.drawString(x + 3*mm, y - 5.5*mm, titre[:60])

    # Contenu
    ty = y - 11*mm
    for line in lines:
        if ty < y - h + 2*mm:
            break
        if line == '':
            ty -= (fsize - 0.5) * 0.5
        else:
            draw_line(c, x + 3*mm, ty, line, fsize - 0.5)
            ty -= (fsize - 0.5) * 1.4

    return h  # retourne la hauteur utilisée


class PDF:
    def __init__(self, data):
        self.org = data.get('organisation', {})
        self.f = data.get('feuillet', {})
        self.cp = self.org.get('couleur_principale', '#2e6da4')
        self.cs = self.org.get('couleur_secondaire', '#c9a84c')
        self.cf = self.org.get('couleur_fond', '#fffdf8')
        self.buf = io.BytesIO()
        self._rest = []  # lignes Dvar Torah non affichées page 2

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

    # ── Bandeau ────────────────────────────────────────────────────────────────
    def _bandeau(self, c, full=True):
        f = self.f
        BH = 38*mm if full else 20*mm
        cp_c, cs_c = self.cp_c(), self.cs_c()

        c.setFillColor(cp_c)
        c.rect(0, H - BH, W, BH, fill=1, stroke=0)

        if not full:
            # Bandeau compact pages 2-4
            nom = self.org.get('nom_feuillet', 'Feuillet')
            c.setFillColor(colors.white)
            c.setFont('Times-Bold', 13)
            c.drawString(M, H - 13*mm, nom.upper())
            c.setFont('Times-Italic', 9)
            c.setFillColor(cs_c)
            c.drawString(M, H - 18*mm, f.get('paracha_fr', ''))
            # Hébreu à droite
            he = rtl(safe_hebrew(f.get('paracha_he', '')), force_base='R')
            c.setFont(HEBREW_FONT, 15)
            c.setFillColor(colors.white)
            c.drawRightString(W - M, H - 15*mm, he)
            c.setStrokeColor(cs_c); c.setLineWidth(1.5)
            c.line(0, H - BH, W, H - BH)
            return BH

        # Logo
        logo_url = self.org.get('logo_url')
        if logo_url:
            img = load_img(logo_url)
            if img:
                try:
                    c.drawImage(img, M, H - BH + 3*mm, width=28*mm, height=32*mm,
                               preserveAspectRatio=True, mask='auto')
                except: pass

        # Nom + paracha
        nom = self.org.get('nom_feuillet', 'Feuillet')
        c.setFillColor(colors.white)
        c.setFont('Times-Bold', 16)
        c.drawString(M + 31*mm, H - 11*mm, nom.upper())
        c.setFont('Times-Roman', 9)
        c.setFillColor(hex_c('cce0f5'))
        c.drawString(M + 31*mm, H - 17*mm, f.get('paracha_fr', ''))
        c.setFont('Times-Roman', 8)
        c.setFillColor(hex_c('aaccee'))
        c.drawString(M + 31*mm, H - BH + 4*mm, f"N° {f.get('numero', '')}")

        # Grand hébreu centré
        he = rtl(safe_hebrew(f.get('paracha_he', '')), force_base='R')
        c.setFont(HEBREW_FONT, 28)
        c.setFillColor(cs_c)
        c.drawCentredString(W/2 + 5*mm, H - 25*mm, he)

        # Boîte horaires
        bx = W - 50*mm; by = H - BH + 3*mm; bw = 46*mm; bh2 = BH - 6*mm
        c.setFillColor(colors.white)
        c.roundRect(bx, by, bw, bh2, 5, fill=1, stroke=0)
        c.setFillColor(cp_c)
        c.setFont('Times-Bold', 8.5)
        c.drawCentredString(bx + bw/2, H - 10*mm, 'Horaire Shabbat')
        hline(c, bx + 3*mm, H - 12.5*mm, bw - 6*mm, cp_c, 0.5)

        date_str = f.get('date_shabbat', '')
        try:
            from datetime import datetime
            date_fr = datetime.strptime(date_str, '%Y-%m-%d').strftime('%d/%m/%Y')
        except:
            date_fr = date_str

        c.setFont('Times-Italic', 8); c.setFillColor(hex_c('555555'))
        c.drawCentredString(bx + bw/2, H - 16*mm, date_fr)
        c.setFont('Times-Bold', 9); c.setFillColor(cp_c)
        if f.get('heure_entree'):
            c.drawCentredString(bx + bw/2, H - 21*mm, f"Entrée : {f['heure_entree']}")
        if f.get('heure_sortie'):
            c.drawCentredString(bx + bw/2, H - 26*mm, f"Sortie : {f['heure_sortie']}")

        # Ligne dorée
        c.setStrokeColor(cs_c); c.setLineWidth(2)
        c.line(0, H - BH, W, H - BH)
        return BH

    # ── Page 1 ─────────────────────────────────────────────────────────────────
    def _p1(self, c):
        c.setFillColor(self.cf_c()); c.rect(0, 0, W, H, fill=1, stroke=0)
        BH = self._bandeau(c, full=True)
        f = self.f
        y = H - BH - 5*mm

        # Roch Hodech
        rh = f.get('roch_hodech', {})
        if rh.get('actif'):
            c.setFillColor(self.cs_c())
            c.roundRect(M, y - 7*mm, FULL_W, 7*mm, 3, fill=1, stroke=0)
            c.setFillColor(colors.white); c.setFont('Times-Bold', 9)
            txt = f"Roch Hodech {rh.get('nom_mois','')}  •  {rh.get('jours','')}  •  Nolad : {rh.get('nolad','')}"
            c.drawCentredString(W/2, y - 5*mm, txt)
            y -= 10*mm

        y -= 3*mm

        # Rubriques
        rubriques = [r for r in f.get('rubriques_p1', []) if r.get('actif')]
        for r in rubriques:
            if y < M + 10*mm:
                break
            h = encadre(c, M, y, FULL_W, r.get('titre',''), r.get('contenu',''),
                        self.cp, self.cs, self.cf, fsize=10)
            y -= h + 5*mm

        # Dédicace
        ded = f.get('dedicace', {})
        if ded.get('actif') and ded.get('placement') == 'page1':
            c.setFont('Times-Italic', 9.5); c.setFillColor(self.cs_c())
            c.drawCentredString(W/2, M + 3*mm, ded.get('texte',''))

    # ── Page 2 ─────────────────────────────────────────────────────────────────
    def _p2(self, c):
        c.setFillColor(self.cf_c()); c.rect(0, 0, W, H, fill=1, stroke=0)
        BH = self._bandeau(c, full=False)
        f = self.f
        dt = f.get('dvar_torah', {})
        cp_c, cs_c = self.cp_c(), self.cs_c()
        y = H - BH - 6*mm

        # ── Titre Dvar Torah ──
        c.setFillColor(cp_c)
        c.roundRect(M, y - 9*mm, FULL_W, 9*mm, 4, fill=1, stroke=0)
        c.setFillColor(colors.white); c.setFont('Times-Bold', 13)
        c.drawString(M + 4*mm, y - 6.5*mm, 'DVAR TORAH')
        he_titre = rtl('דבר תורה')
        c.setFont(HEBREW_FONT, 15); c.setFillColor(cs_c)
        c.drawRightString(W - M - 4*mm, y - 7*mm, he_titre)
        y -= 12*mm

        # ── Verset hébreu dans encadré doré ──
        verset = dt.get('verset_hebreu', '')
        if verset:
            v_lines = wrap(c, verset, HEBREW_FONT, 12, FULL_W - 8*mm)
            vh = 5*mm + len(v_lines) * 12 * 1.35 + 4*mm
            c.setFillColor(hex_c('fffbea'))
            c.setStrokeColor(cs_c); c.setLineWidth(1.2)
            c.roundRect(M + 10*mm, y - vh, FULL_W - 20*mm, vh, 5, fill=1, stroke=1)
            vy = y - 7*mm
            for vl in v_lines:
                plain_v = strip_md(vl)
                c.setFont(HEBREW_FONT, 12); c.setFillColor(hex_c('2c1a00'))
                c.drawCentredString(W/2, vy, rtl(safe_hebrew(plain_v), force_base='R'))
                vy -= 12 * 1.35
            y -= vh + 3*mm

        # ── Traduction ──
        traduction = dt.get('traduction', '')
        if traduction:
            c.setFont('Times-Italic', 10); c.setFillColor(cp_c)
            t_lines = wrap(c, traduction, 'Times-Italic', 10, FULL_W - 20*mm)
            for tl in t_lines:
                c.drawCentredString(W/2, y, tl)
                y -= 13
            y -= 3*mm
            hline(c, M + 20*mm, y, FULL_W - 40*mm, cs_c, 0.5)
            y -= 4*mm

        # ── Développement ──
        dev = dt.get('developpement', '')
        fsize = 10.5
        all_lines = wrap(c, dev, 'Times-Roman', fsize, FULL_W)
        y, self._rest = draw_block(c, M, y, FULL_W, dev, fsize=fsize,
                                    bottom=M + 4*mm)

    # ── Page 3 ─────────────────────────────────────────────────────────────────
    def _p3(self, c):
        c.setFillColor(self.cf_c()); c.rect(0, 0, W, H, fill=1, stroke=0)
        BH = self._bandeau(c, full=False)
        f = self.f
        dt = f.get('dvar_torah', {})
        y = H - BH - 6*mm
        fsize = 10.5
        bottom = M + 16*mm

        # Suite du développement
        rest = self._rest
        if not rest:
            # Fallback : recalculer les lignes restantes
            dev = dt.get('developpement', '')
            all_lines = wrap(c, dev, 'Times-Roman', fsize, FULL_W)
            # Estimer combien tiennent sur p2
            bh2 = 20*mm
            avail_p2 = H - bh2 - 12*mm - M - 4*mm
            lines_p2 = int(avail_p2 / (fsize * 1.38))
            rest = all_lines[lines_p2:]

        for i, line in enumerate(rest):
            if y < bottom:
                break
            if line == '':
                y -= fsize * 0.5
            else:
                draw_line(c, M, y, line, fsize)
                y -= fsize * 1.38

        # Signature
        signe = dt.get('signataire', '')
        if signe:
            hline(c, M + 25*mm, M + 10*mm, FULL_W - 50*mm, self.cs_c(), 0.8)
            c.setFont('Times-Italic', 10); c.setFillColor(self.cp_c())
            c.drawCentredString(W/2, M + 4*mm, f'Chabbat Chalom  ·  {signe}')

        # Dédicace
        ded = f.get('dedicace', {})
        if ded.get('actif') and ded.get('placement') in ('page3', 'page2'):
            c.setFont('Times-Italic', 9.5); c.setFillColor(self.cs_c())
            c.drawCentredString(W/2, M + 14*mm, ded.get('texte',''))

    # ── Page 4 ─────────────────────────────────────────────────────────────────
    def _p4(self, c):
        c.setFillColor(self.cf_c()); c.rect(0, 0, W, H, fill=1, stroke=0)
        cp_c, cs_c = self.cp_c(), self.cs_c()

        # Bandeau doré page 4
        BH4 = 18*mm
        c.setFillColor(cs_c)
        c.rect(0, H - BH4, W, BH4, fill=1, stroke=0)
        nom = self.org.get('nom_feuillet', 'Feuillet')
        c.setFillColor(cp_c); c.setFont('Times-Bold', 15)
        c.drawCentredString(W/2, H - 12*mm, nom.upper())
        c.setFont('Times-Italic', 8); c.setFillColor(colors.white)
        c.drawCentredString(W/2, H - 16.5*mm, '— Page famille —')
        c.setStrokeColor(cp_c); c.setLineWidth(2)
        c.line(0, H - BH4, W, H - BH4)

        f = self.f
        encadres = f.get('encadres_p4', [])
        n = len(encadres)
        if n == 0:
            return

        # Dédicace en bas
        ded = f.get('dedicace', {})
        bot = M
        if ded.get('actif') and ded.get('placement') == 'page4':
            c.setFont('Times-Italic', 9.5); c.setFillColor(cs_c)
            c.drawCentredString(W/2, bot, ded.get('texte',''))
            bot += 9*mm

        y = H - BH4 - 5*mm
        avail = y - bot - 2*mm

        if n <= 2:
            # Colonnes côte à côte ou pleine largeur
            gutter = 4*mm
            col_w = (FULL_W - (n-1)*gutter) / n
            for i, enc in enumerate(encadres):
                cx = M + i * (col_w + gutter)
                # Hauteur = espace dispo
                lines_enc = wrap(c, enc.get('contenu',''), 'Times-Roman', 9, col_w - 6*mm)
                h_enc = min(8*mm + len(lines_enc) * 9 * 1.4 + 5*mm, avail)
                encadre(c, cx, y, col_w, enc.get('titre',''), enc.get('contenu',''),
                        self.cp, self.cs, self.cf, fsize=9.5)
        else:
            # Grille 2 colonnes
            gutter = 4*mm
            col_w = (FULL_W - gutter) / 2
            rows = -(-n // 2)
            row_h = (avail - (rows - 1) * 5*mm) / rows
            for i, enc in enumerate(encadres):
                row = i // 2; col = i % 2
                ey = y - row * (row_h + 5*mm)
                cx = M + col * (col_w + gutter)
                encadre(c, cx, ey, col_w, enc.get('titre',''), enc.get('contenu',''),
                        self.cp, self.cs, self.cf, fsize=9.5)


if __name__ == '__main__':
    data = json.load(sys.stdin)
    sys.stdout.buffer.write(PDF(data).run())
