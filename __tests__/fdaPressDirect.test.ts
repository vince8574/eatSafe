// Récupération directe du flux de communiqués FDA depuis l'appareil : parsing
// RSS et extraction des dates d'identification ("Best if Used By") de la page.
import { parsePressRss, extractCodeInfo } from '../src/services/fdaPressDirect';

describe('parsePressRss', () => {
  const xml = `<?xml version="1.0" encoding="utf-8"?>
<rss version="2.0"><channel>
  <item>
    <title>Taylor Fresh Foods Recalls Iceberg Lettuce &amp; Blends</title>
    <description><![CDATA[<p>Because of possible health risk from <b>Cyclospora</b>.</p>]]></description>
    <link>https://www.fda.gov/safety/recalls-market-withdrawals-safety-alerts/taylor-fresh-foods</link>
    <pubDate>Wed, 05 Aug 2026 17:42:00 EDT</pubDate>
  </item>
  <item>
    <title>Sun Noodle Issues Voluntary Recall</title>
    <link>https://www.fda.gov/safety/recalls-market-withdrawals-safety-alerts/sun-noodle</link>
    <pubDate>Wed, 05 Aug 2026 08:15:00 EDT</pubDate>
  </item>
</channel></rss>`;

  test('extrait titre, lien et date de chaque item', () => {
    const items = parsePressRss(xml);
    expect(items).toHaveLength(2);
    expect(items[0].title).toBe('Taylor Fresh Foods Recalls Iceberg Lettuce & Blends'); // &amp; décodé
    expect(items[0].link).toContain('taylor-fresh-foods');
    expect(items[0].pubDate).toBe('Wed, 05 Aug 2026 17:42:00 EDT');
  });

  test('nettoie le HTML/CDATA de la description', () => {
    const items = parsePressRss(xml);
    expect(items[0].description).toBe('Because of possible health risk from Cyclospora.');
  });

  test('promeut les liens http:// en https:// (bloqués en clair sur mobile)', () => {
    // Le flux FDA publie ses <link> en http:// ; ATS (iOS) et le blocage du
    // cleartext (Android) les refusent → la lecture de l'article échouait
    // silencieusement et aucune date "Best if Used By" n'était extraite.
    const httpXml = `<?xml version="1.0"?><rss><channel><item>
      <title>Blank Slate Creamery Issues Allergy Alert</title>
      <link>http://www.fda.gov/safety/recalls-market-withdrawals-safety-alerts/blank-slate</link>
    </item></channel></rss>`;
    const [item] = parsePressRss(httpXml);
    expect(item.link).toBe(
      'https://www.fda.gov/safety/recalls-market-withdrawals-safety-alerts/blank-slate'
    );
  });

  test('flux vide ou non-RSS → aucun item', () => {
    expect(parsePressRss('<?xml version="1.0"?><rss><channel></channel></rss>')).toEqual([]);
    expect(parsePressRss('')).toEqual([]);
  });
});

describe('extractCodeInfo', () => {
  test('lit les lignes du tableau d’identification (cas Taylor Farms)', () => {
    const html = `<html><body>
      <p>Best if Used By dates are listed below.</p>
      <table>
        <tr><th>Brand</th><th>Description</th><th>Best if Used By</th></tr>
        <tr><td>CV</td><td>LETTUCE SHRED</td><td>7/16/2026</td></tr>
        <tr><td>JB</td><td>BLEND LETT/ROM</td><td>8/3/2026</td></tr>
      </table></body></html>`;
    const out = extractCodeInfo(html);
    // DEUX produits, chacun avec SA date : ce n'est pas un intervalle. La version
    // précédente résumait « 7/16 - 8/3 », ce qui aurait déclaré rappelée une
    // salade datée du 25/07 alors qu'aucun des deux produits ne porte cette date.
    expect(out).toContain('Best if Used By 7/16/2026, 8/3/2026');
    expect(out).toContain('LETTUCE SHRED');
  });

  test('un VRAI intervalle reste un intervalle', () => {
    const html = `<html><body><p>Best if Used By 7/16/2026 through 8/3/2026.</p></body></html>`;
    expect(extractCodeInfo(html)).toContain('Best if Used By 7/16/2026 - 8/3/2026');
  });

  test('repli en PROSE quand il n’y a pas de tableau', () => {
    const html = `<html><body><p>The product was sold with Lot 12345 and a Best By date of 8/1/2026.</p></body></html>`;
    const out = extractCodeInfo(html);
    expect(out).toMatch(/Lot 12345/);
  });

  test('ignore les scripts et styles', () => {
    const html = `<html><head><style>td{color:red}</style><script>var d="9/9/2029";</script></head>
      <body><p>Use by 5/5/2026.</p></body></html>`;
    const out = extractCodeInfo(html) ?? '';
    expect(out).not.toContain('9/9/2029');
    expect(out).toContain('5/5/2026');
  });

  test('page sans info d’identification → undefined', () => {
    expect(extractCodeInfo('<html><body><p>General news, nothing to identify.</p></body></html>')).toBeUndefined();
  });
});
