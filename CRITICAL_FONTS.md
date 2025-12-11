# CRITICAL: Vision Board Configuration

## DO NOT CHANGE THESE SETTINGS - THEY HAVE BEEN LOST 4+ TIMES

---

## RULE #1: NO PEOPLE IN IMAGES

Vision board photos must NEVER show people, faces, hands, or bodies.

### Photo Prompts Must Avoid:
- "couple" → use "two wine glasses", "pair of wedding rings"
- "person silhouette" → use "sunrise over mountains"
- "yoga pose" → use "yoga mat with candles"
- "hands holding" → use "intertwined roses"
- "hiking couple" → use "hiking trail with mountain view"

### Negative Prompt (Always Include):
```
"people, person, human, man, woman, child, baby, face, faces, portrait, hands, fingers, arms, legs, feet, body, figure, silhouette, crowd, group"
```

### Why No People:
1. AI-generated people look uncanny/weird
2. Customers want to imagine THEMSELVES
3. Objects are more versatile and professional-looking

---

## RULE #2: CORRECT FONTS

This document preserves the critical font configuration for vision boards.
The user has explicitly specified these fonts and they keep getting lost
between sessions.

### Title Case Rules:
- **Snell Roundhand (Script/Feminine)**: Title Case only - "My Healing Journey"
- **Bodoni 72 Smallcaps (Masculine)**: UPPERCASE - "LEVEL UP 2025"

### Subtitle Size:
- Minimum 14px (was 11px, too small)
- Letter-spacing: 0.12em

---

## Required Fonts

### Feminine/Soft Themes (Script)
**Font: `Snell Roundhand`**
- Use for: healing, self-love, relationship, feminine themes
- Style: Elegant cursive script
- Case: Natural case (Title Case)
- Weight: 400 (normal)

### Masculine/Dark Themes (Serif Caps)
**Font: `Bodoni 72 Smallcaps`**
- Use for: goals, discipline, career, masculine themes
- Style: Clean serif with small caps
- Case: UPPERCASE
- Weight: 400 (normal)
- Letter-spacing: 0.15em

---

## Font Selection Logic (in visionBoardEngineV12.js)

```javascript
const FONTS = {
  script: "Snell Roundhand",  // For feminine boards
  serifCaps: "Bodoni 72 Smallcaps",  // For masculine/neutral boards
  serifQuote: "Cormorant Garamond, Playfair Display, Georgia, serif",
  sans: "Helvetica Neue, Arial, sans-serif"
};

function selectFonts(style) {
  const mood = (style?.mood || '').toLowerCase();
  const isMasculine = mood.includes('masculine') || mood.includes('dark') || mood.includes('discipline');

  return {
    title: isMasculine ? FONTS.serifCaps : FONTS.script,
    titleTransform: isMasculine ? 'uppercase' : 'none',
    titleLetterSpacing: isMasculine ? '0.15em' : '0.02em',
    quote: FONTS.serifQuote,
    text: FONTS.serifCaps
  };
}
```

---

## Theme to Font Mapping

| Theme Type | Examples | Font | Transform |
|------------|----------|------|-----------|
| Feminine | healing, self-love, relationship, soft | Snell Roundhand | Title Case |
| Masculine | goals, discipline, career, dark, achievement | Bodoni 72 Smallcaps | UPPERCASE |
| Romantic | love story, couples, anniversary | Snell Roundhand | Title Case |
| Ambitious | level up, built different, success | Bodoni 72 Smallcaps | UPPERCASE |

---

## System Requirements

These fonts must be installed on the system for Sharp to render them:

### macOS
Both fonts are included by default:
- `/System/Library/Fonts/Supplemental/Snell Roundhand.ttc`
- `/Library/Fonts/Bodoni 72 Smallcaps.ttc`

### Verification Command
```bash
# Check if fonts exist
ls -la "/System/Library/Fonts/Supplemental/Snell Roundhand.ttc"
ls -la "/Library/Fonts/Bodoni 72 Smallcaps.ttc"

# List all Snell fonts
fc-list | grep -i snell

# List all Bodoni fonts
fc-list | grep -i bodoni
```

---

## Common Issues & Fixes

### Issue: Fonts render as fallback (Georgia/Arial)
**Cause**: Font name in SVG doesn't match system font exactly
**Fix**: Use exact names: `"Snell Roundhand"` and `"Bodoni 72 Smallcaps"`

### Issue: Bodoni 72 Oldstyle appears instead of Smallcaps
**Cause**: Wrong font variant specified
**Fix**: Must use `"Bodoni 72 Smallcaps"` NOT `"Bodoni 72"` or `"Bodoni 72 Oldstyle"`

### Issue: Script font appears broken/jagged
**Cause**: Font size too small for script rendering
**Fix**: Minimum font size 24px for Snell Roundhand

---

## Files That Use These Fonts

- `src/lib/visionBoardEngineV12.js` - Main production engine
- `src/lib/visionBoardEngineV11.js` - Previous version
- `src/lib/visionBoardEngineV10.js` - Previous version
- `src/lib/visionBoardEngineV9.js` - Previous version
- `src/lib/visionBoardEngineV8.js` - Previous version
- `src/lib/premiumScrapbookV3.js` - Scrapbook compositor
- `src/lib/premiumScrapbookV4.js` - Scrapbook compositor
- `src/lib/bannerCompositor.js` - Banner rendering

---

## NEVER DO THIS

- Do NOT change font names to generic families (serif, sans-serif, cursive)
- Do NOT remove font fallbacks without testing
- Do NOT use "Bodoni 72" without "Smallcaps" suffix
- Do NOT mix up masculine/feminine font assignments

---

## History of Font Issues

1. **Issue 1**: Fonts defaulting to Georgia
2. **Issue 2**: Bodoni Oldstyle used instead of Smallcaps
3. **Issue 3**: Font configuration lost after session
4. **Issue 4**: December 2024 - Fonts not rendering correctly (this document created)

---

*Last Updated: December 10, 2024*
*This document must be preserved across all sessions*
