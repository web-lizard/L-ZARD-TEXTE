import {aiEntitiesToRanges, buildSegments, removeFormat, toggleFormat} from '../src/services/formatter';
import {toClipboardHtml, toMarkdownV2, toTelegramHtml, escapeMarkdownV2} from '../src/services/telegramExport';
import type {AiEntity} from '../src/types';

let failed = 0;

function assert(cond: boolean, name: string) {
  if (cond) {
    console.log(`  OK  ${name}`);
  } else {
    failed++;
    console.error(`FAIL  ${name}`);
  }
}

// Длинный текст: суммарный лимит 30% не мешает проверке occurrence.
const text =
  'Это очень важное заявление. Это очень важное заявление.\n' +
  'Обычный текст.\n' +
  'Дополнительный контент для объёма, чтобы суммарный лимит покрытия не сработал раньше времени. '.repeat(3);

const o1 = text.indexOf('очень важное');
const o2 = text.indexOf('очень важное', o1 + 1);
const ot = text.indexOf('Обычный текст');
const otLineEnd = text.indexOf('\n', ot);

const ai: AiEntity[] = [
  {type: 'bold', text: 'очень важное', occurrence: 1},
  {type: 'italic', text: 'очень важное', occurrence: 2},
  {type: 'bold', text: 'несуществующий фрагмент'},
  {type: 'underline', text: 'Обычный текст'},
  {type: 'strikethrough', text: 'п'},
  {type: 'blockquote', text: 'Обычный текст'},
];
const ranges = aiEntitiesToRanges(text, ai);
assert(ranges.length === 4, '4 valid entities (unknown + too-short skipped)');
assert(ranges[0].type === 'bold' && ranges[0].start === o1 && ranges[0].end === o1 + 12, 'first occurrence offset');
assert(ranges[1].type === 'italic' && ranges[1].start === o2 && ranges[1].end === o2 + 12, 'second occurrence offset');
assert(
  ranges.some(r => r.type === 'blockquote' && r.start === ot && r.end === otLineEnd),
  'blockquote snapped to whole line',
);

// Лимит суммарного покрытия 30% обрезает лишнее.
const shortText = 'ааа ббб ввв ггг ддд ежж жзз';
const capped = aiEntitiesToRanges(shortText, [
  {type: 'bold', text: 'ааа'},
  {type: 'bold', text: 'ббб'},
  {type: 'bold', text: 'ввв'},
  {type: 'bold', text: 'ггг'},
  {type: 'bold', text: 'ддд'},
]);
const covered = capped.reduce((sum, e) => sum + (e.end - e.start), 0);
assert(covered <= shortText.length * 0.3 + 1, '30% coverage cap enforced');
assert(capped.length < 5, 'cap reduces entity count');

// 2. segments with overlap
const segs = buildSegments(text, ranges);
assert(segs.length > 0, 'segments produced');
assert(segs[0].start === 0, 'first segment starts at 0');
assert(segs.some(s => s.styles.includes('italic')), 'italic segment present');

// 3. toggle / remove
let ents = toggleFormat([], 0, 4, 'bold');
assert(ents.length === 1, 'toggle adds bold');
ents = toggleFormat(ents, 0, 4, 'bold');
assert(ents.length === 0, 'toggle removes bold when fully covered');
ents = removeFormat(ents, 0, 10);
assert(ents.length === 0, 'remove on empty ok');

// 4. markdown escape
assert(escapeMarkdownV2('a_b*c') === 'a\\_b\\*c', 'markdown escape');
assert(escapeMarkdownV2('normal') === 'normal', 'no escape when not needed');

// 5. html export
const doc = [{text: 'Bold text', entities: [{id: '1', type: 'bold' as const, start: 0, end: 4}]}];
const html = toClipboardHtml('Bold text', doc[0].entities);
assert(html === '<b>Bold</b> text', `clipboard html: got "${html}"`);
const tgHtml = toTelegramHtml('Bold text', doc[0].entities);
assert(tgHtml === '<b>Bold</b> text', 'telegram html same for bold');

// 6. markdown with blockquote line
const qText = 'line1\nquote me\nline3';
const qEntities = [{id: '2', type: 'blockquote' as const, start: 6, end: 14}];
const md = toMarkdownV2(qText, qEntities);
assert(md === 'line1\n> quote me\nline3', `markdown quote: got "${md}"`);

// 7. spoiler in markdown
const sText = 'secret info';
const sEnts = [{id: '3', type: 'spoiler' as const, start: 0, end: 6}];
assert(toMarkdownV2(sText, sEnts) === '||secret|| info', 'spoiler markdown');

// 8. nested bold+italic in html
const nText = 'xBIy';
const nEnts = [
  {id: 'a', type: 'bold' as const, start: 1, end: 3},
  {id: 'b', type: 'italic' as const, start: 2, end: 3},
];
const nHtml = toClipboardHtml(nText, nEnts);
assert(nHtml === 'x<b>B</b><i><b>I</b></i>y', `nested html: got "${nHtml}"`);

// 9. quotes in html escape
const escText = 'a < b & c > d';
assert(toClipboardHtml(escText, []) === 'a &lt; b &amp; c &gt; d', 'html escaping');

// 10. cyrillic + emoji offsets (unicode handling)
const uniText = 'Привет 👁 мир';
const uniEnts = [{id: 'u', type: 'bold' as const, start: 7, end: 9}];
const uniHtml = toClipboardHtml(uniText, uniEnts);
assert(uniHtml === 'Привет <b>👁</b> мир', `emoji offset html: got "${uniHtml}"`);

console.log(failed === 0 ? '\nALL PASSED' : `\n${failed} FAILED`);
process.exit(failed === 0 ? 0 : 1);
