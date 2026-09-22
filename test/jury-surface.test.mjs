import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const html = await readFile(new URL('../web/index.html', import.meta.url), 'utf8');
const appJs = await readFile(new URL('../web/app.js', import.meta.url), 'utf8');
const juryCss = await readFile(new URL('../web/jury.css', import.meta.url), 'utf8');
const serverSource = await readFile(new URL('../src/server.mjs', import.meta.url), 'utf8');

function occurrences(source, fragment) {
  return source.split(fragment).length - 1;
}

test('jury surface exposes the justification map in plain language', () => {
  assert.match(html, /MAPA DE JUSTIFICACIÓN/);
  assert.match(html, /¿La razón para actuar sigue siendo válida\?/);
  assert.match(html, /FUENTE CAUSAL/);
  assert.match(html, /EVIDENCIA/);
  assert.match(html, /ACCIÓN POSTERIOR/);
  assert.match(html, /Verifica antes de avanzar/);
  assert.match(html, /Si esperado y observado no coinciden, la evidencia ya no justifica la acción\./);
});

test('jury surface preserves every dynamic lineage binding exactly once', () => {
  for (const id of [
    'lineage-status',
    'lineage-source',
    'lineage-expected',
    'lineage-observed',
    'lineage-evidence',
    'lineage-invalidated-by'
  ]) {
    assert.equal(occurrences(html, `id="${id}"`), 1, `${id} must appear exactly once`);
  }
});

test('guided live demo freezes the four-step lineage scenario without executing anything', () => {
  assert.match(html, /Emite exactamente un plan de 4 pasos/);
  assert.match(html, /s1: WRITE_PATCH sobre config\.json hacia sha256:config-v2; depends_on vacío; needs_state vacío/);
  assert.match(html, /s2: WRITE_PATCH sobre generated\.md hacia sha256:generated-v2/);
  assert.match(html, /evidence_id=generated-evidence-v2/);
  assert.match(html, /s3: WRITE_PATCH sobre config\.json hacia sha256:config-v1; depends_on=\[s2\]; needs_state vacío/);
  assert.match(html, /s4: RUN_COMMAND con program=npm y args=\[test\]/);
  assert.match(html, /No añadas ninguna otra precondición o estado requerido\./);
});

test('jury surface serves and constrains the full-width justification layout', () => {
  assert.equal(occurrences(html, '<link rel="stylesheet" href="/jury.css">'), 1);
  assert.match(serverSource, /\['index\.html', 'app\.js', 'styles\.css', 'jury\.css'\]/);
  assert.match(juryCss, /\.plan-steps-card,\s*\.lineage-card\s*\{\s*grid-column:\s*1 \/ -1/);
  assert.match(juryCss, /grid-template-columns:\s*minmax\(0, 1fr\) 18px\s*minmax\(0, 1fr\) 18px\s*minmax\(0, 1fr\) 18px\s*minmax\(0, 1fr\)/);
  assert.match(juryCss, /\.lineage-card \.flow-node\s*\{[^}]*min-width:\s*0;[^}]*min-height:\s*118px/s);
});

test('jury surface keeps no-dispatch and existing application wiring visible', () => {
  assert.match(html, /NO DISPATCH/);
  assert.match(html, /Dispatch deshabilitado/);
  assert.equal(occurrences(html, '<script type="module" src="/app.js"></script>'), 1);
  assert.equal(occurrences(html, 'id="plan-dispatch"'), 1);
});

test('jury surface uses only the dashboard profile lock, not a second profile form', () => {
  assert.match(html, /Perfil activo de Nemotron/);
  assert.match(html, /El dashboard decide el modo exacto/);
  assert.match(html, /id="active-profile"/);
  assert.match(html, /id="active-profile-chip"/);
  assert.doesNotMatch(html, /id="profile-gate-form"/);
  assert.doesNotMatch(html, /id="profile-type"/);
  assert.doesNotMatch(html, /id="profile-message"/);
  assert.doesNotMatch(html, /id="profile-send-button"/);
  assert.doesNotMatch(html, /Enviar con perfil/);
  assert.doesNotMatch(html, /Salida real del otro GPT/);
  assert.doesNotMatch(html, /Pega aquí la respuesta real del otro GPT/);
});

test('dashboard profile lock loads backend profiles from health before routing to profile chat', () => {
  assert.match(html, /data-source="\/api\/health"/);
  assert.match(appJs, /loadBackendProfiles/);
  assert.match(appJs, /health\.profiles/);
  assert.match(appJs, /renderProfileOptions/);
  assert.match(appJs, /PROFILE_OPTIONS_UNAVAILABLE/);
  assert.match(appJs, /fetch\('\/api\/profile-chat'/);
  assert.match(appJs, /runProfileMessage\(activeProfile, message/);
});
test('dashboard forces an explicit Nemotron operating profile before main chat submission', () => {
  assert.match(html, /id="active-profile"/);
  assert.match(html, /Perfil activo de Nemotron/);
  assert.match(html, /value="ACTION_GATE"/);
  assert.doesNotMatch(html, /value="MONO_SI_NO"/);
  assert.doesNotMatch(html, /value="FERRUM_RUST"/);
  assert.doesNotMatch(html, /value="ACTION_PROPOSER"/);
  assert.doesNotMatch(html, /value="SAFE_NOOP"/);
  assert.match(html, /id="active-profile-chip"/);
  assert.match(appJs, /getDashboardProfileMode/);
  assert.match(appJs, /runProfileMessage\(activeProfile, message/);
  assert.match(appJs, /Dashboard lock: Nemotron opera exactamente/);
  assert.match(appJs, /fetch\('\/api\/profile-chat'/);
});
test('dashboard profile chip does not leak escaped newline artifacts into HTML', () => {
  assert.doesNotMatch(html, /`n\s*<span>Dispatch deshabilitado<\/span>/);
});