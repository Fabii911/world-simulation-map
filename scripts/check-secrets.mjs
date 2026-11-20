// Sucht in allen Dateien, die committet würden, nach Geheimnissen (Schlüssel, Tokens, private Keys).
import { execSync } from 'node:child_process';
import { readFileSync, statSync } from 'node:fs';

const files = execSync('git ls-files --cached --others --exclude-standard', { encoding: 'utf8' }).split('\n').filter(Boolean);
const FORBIDDEN_NAMES = [/(^|\/)\.env(\..*)?$/, /\.pem$/, /\.key$/, /id_rsa/, /credentials\.json$/, /\.p12$/, /settings\.local\.json$/];
const PATTERNS = [
  ['Private Key', /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
  ['AWS Access Key', /AKIA[0-9A-Z]{16}/],
  ['GitHub Token', /gh[pousr]_[A-Za-z0-9]{36,}/],
  ['GitHub Fine-grained Token', /github_pat_[A-Za-z0-9_]{50,}/],
  ['OpenAI/Anthropic Key', /sk-(ant-)?[A-Za-z0-9_-]{20,}/],
  ['Google API Key', /AIza[0-9A-Za-z_-]{35}/],
  ['Slack Token', /xox[baprs]-[A-Za-z0-9-]{10,}/],
  ['Generische Zuweisung', /(api[_-]?key|secret|password|passwd|token)\s*[:=]\s*["'][^"'\s]{12,}["']/i],
];
const SKIP = [/^assets\/vendor\//];
const hits = [];
for (const f of files) {
  if (FORBIDDEN_NAMES.some((r) => r.test(f))) { hits.push(`${f}: verbotener Dateiname`); continue; }
  if (SKIP.some((r) => r.test(f))) continue;
  let st; try { st = statSync(f); } catch { continue; }
  if (st.size > 2_000_000) continue;
  const text = readFileSync(f, 'utf8');
  for (const [name, re] of PATTERNS) if (re.test(text)) hits.push(`${f}: ${name}`);
}
if (hits.length) { console.error(`✗ Mögliche Geheimnisse gefunden:\n- ${hits.join('\n- ')}`); process.exit(1); }
console.log(`✓ Keine Geheimnisse gefunden (${files.length} Dateien geprüft)`);
