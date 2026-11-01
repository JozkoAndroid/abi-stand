/* abi-rules.js — the DIA (Deutsches Internationales Abitur) rules for the Deutsche Schule
   Bratislava, Abitur 2028. Pure functions, no browser code. Used by the app page and by
   the tests (node abi-rules.test.js).

   Sources: "Informationen zur Qualifikationsphase der Oberstufe" (A. Bockholt) and the
   summary PDF (Sept 2026). School-specific addition told by the owner on 2026-11-01:
   Wirtschaft can be an exam subject, but only oral (slot 4 or 5).
*/
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.AbiRules = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const TERMS = ['11.I', '11.II', '12.I', '12.II'];

  // group: de, ma, fs (foreign language), nw (science), gw (social science), ku (music/art), sp
  // field: the Aufgabenfeld I / II / III
  const SUBJECTS = [
    { key: 'de', de: 'Deutsch', en: 'German', group: 'de', field: 'I', edupage: ['Nemecký jazyk', 'Deutsch', 'Nemecký jazyk a literatúra'] },
    { key: 'ma', de: 'Mathematik', en: 'Maths', group: 'ma', field: 'III', edupage: ['Mathematik', 'Matematika'] },
    { key: 'en', de: 'Englisch', en: 'English', group: 'fs', field: 'I', edupage: ['Anglický jazyk', 'Englisch', 'English'] },
    { key: 'sk', de: 'Slowakisch', en: 'Slovak', group: 'fs', field: 'I', noExam: true, scale: 'sk5',
      edupage: ['Slowakische Sprache und Literatur', 'Slovenský jazyk a literatúra', 'Slowakisch'] },
    { key: 'bi', de: 'Biologie', en: 'Biology', group: 'nw', field: 'III', edupage: ['Biologie', 'Biológia'] },
    { key: 'ph', de: 'Physik', en: 'Physics', group: 'nw', field: 'III', edupage: ['Physik', 'Fyzika'] },
    { key: 'ge', de: 'Geschichte', en: 'History', group: 'gw', field: 'II', edupage: ['Geschichte', 'Dejepis'] },
    { key: 'wi', de: 'Wirtschaft', en: 'Economics', group: 'gw', field: 'II', oralOnly: true, edupage: ['Wirtschaft', 'Ekonomika'] },
    { key: 'et', de: 'Ethik', en: 'Ethics', group: 'gw', field: 'II', noExam: true, edupage: ['Etická výchova', 'Ethik'] },
    { key: 'ku', de: 'Kunst', en: 'Art', group: 'ku', field: 'I', edupage: ['Výtvarná výchova', 'Kunst', 'Musik', 'Hudobná výchova', 'Darstellendes Spiel'] },
    { key: 'sp', de: 'Sport', en: 'Sport', group: 'sp', field: null, edupage: ['Sport', 'Telesná a športová výchova', 'Telesná výchova'] },
  ];
  const BY_KEY = Object.fromEntries(SUBJECTS.map(s => [s.key, s]));

  function subjectForEdupageName(name) {
    const n = String(name || '').trim().toLowerCase();
    for (const s of SUBJECTS) if (s.edupage.some(e => e.toLowerCase() === n)) return s.key;
    for (const s of SUBJECTS) if (s.edupage.some(e => n.includes(e.toLowerCase()))) return s.key;
    return null;
  }

  // ---- single values -------------------------------------------------------------

  // "ab n,5 wird aufgerundet"
  function roundHalfUp(x) { return Math.floor(x + 0.5); }

  // old 1-6 scale (with + and -) to 0-15 points, as in the presentation's table
  const GRADE_TO_POINTS = {
    '1+': 15, '1': 14, '1-': 13, '2+': 12, '2': 11, '2-': 10, '3+': 9, '3': 8, '3-': 7,
    '4+': 6, '4': 5, '4-': 4, '5+': 3, '5': 2, '5-': 1, '6': 0,
  };

  // A grade's numeric value in points, or null. scale: 'p15' (default), 'g6' (old 1-6 scale), 'sk5' (Slovak 1-5, not convertible), 'ignore'
  function pointsOf(raw, scale) {
    if (raw === null || raw === undefined) return null;
    const s = String(raw).trim().replace(',', '.');
    if (scale === 'ignore' || scale === 'sk5') return null;
    if (scale === 'g6') return GRADE_TO_POINTS[s] ?? null;
    if (!/^\d+(\.\d+)?$/.test(s)) return null;
    const v = parseFloat(s);
    return v >= 0 && v <= 15 ? v : null;
  }

  // ---- half-year estimate --------------------------------------------------------
  // grades: [{points: number|null, evWeight: number, category: string|null, catWeight: number|null}]
  // Returns {avg, points, n, categories: [{name, weight, avg, n}], uncategorized: n} or null when nothing counts.
  function estimateTerm(grades) {
    const usable = grades.filter(g => typeof g.points === 'number');
    if (!usable.length) return null;
    const withCat = usable.filter(g => g.category);
    let avg, categories = [], uncategorized = 0;
    if (withCat.length) {
      const map = new Map();
      for (const g of withCat) {
        const c = map.get(g.category) || { name: g.category, weight: g.catWeight || 0, sum: 0, w: 0, n: 0 };
        const ew = g.evWeight > 0 ? g.evWeight : 1;
        c.sum += g.points * ew; c.w += ew; c.n += 1; map.set(g.category, c);
      }
      let num = 0, den = 0;
      for (const c of map.values()) {
        c.avg = c.sum / c.w;
        const cw = c.weight > 0 ? c.weight : 1;
        num += c.avg * cw; den += cw;
        categories.push({ name: c.name, weight: c.weight, avg: c.avg, n: c.n });
      }
      avg = num / den;
      uncategorized = usable.length - withCat.length;
    } else {
      let num = 0, den = 0;
      for (const g of usable) { const ew = g.evWeight > 0 ? g.evWeight : 1; num += g.points * ew; den += ew; }
      avg = num / den;
    }
    return { avg, points: roundHalfUp(avg), n: usable.length, categories, uncategorized };
  }

  // ---- the 36 half-year results (E I) --------------------------------------------
  // values: {subjectKey: {'11.I': number|null, ...}}  (final grade, estimate or assumption)
  // examKeys: the 5 exam subjects (their 4 terms are mandatory)
  // fixed: optional {subjectKey: {term: true|false}} manual decisions (true = must count, false = must not)
  // Returns {picked: [{subject, term, value}], sum, eI, ok, checks:[...], counts:{key:n}} or {error}
  function einbringung(values, examKeys, fixed) {
    fixed = fixed || {};
    const keys = SUBJECTS.map(s => s.key);
    const exam = new Set(examKeys || []);
    // per subject: term values sorted, honouring fixed decisions
    const per = {};
    for (const k of keys) {
      const cells = TERMS.map(t => ({ subject: k, term: t, value: values[k] ? values[k][t] : null,
        force: fixed[k] && fixed[k][t] === true, ban: fixed[k] && fixed[k][t] === false }))
        .filter(c => typeof c.value === 'number' && !c.ban);
      cells.sort((a, b) => (b.force - a.force) || (b.value - a.value));
      per[k] = cells;
    }
    const minForced = k => per[k].filter(c => c.force).length;
    // allowed counts per subject
    const options = {};
    for (const k of keys) {
      const avail = per[k].length;
      let opts;
      if (exam.has(k) || k === 'de' || k === 'ma') opts = avail >= 4 ? [4] : [];
      else {
        opts = [0];
        for (let n = 2; n <= Math.min(4, k === 'sp' ? 3 : 4, avail); n++) opts.push(n);
      }
      const f = minForced(k);
      opts = opts.filter(n => n >= f && n <= avail);
      options[k] = opts;
    }
    // value of taking n of subject k = sum of best n (forced first)
    const take = (k, n) => per[k].slice(0, n);
    const sumOf = cells => cells.reduce((a, c) => a + c.value, 0);

    let best = null;
    const order = keys.slice();
    const counts = {};
    const rec = (i, total) => {
      if (i === order.length) {
        if (total !== 36) return;
        // group rules
        const n = k => counts[k] || 0;
        const fs = n('en') + n('sk'), nw = n('bi') + n('ph'), gw = n('ge') + n('wi') + n('et');
        if (fs < 4 || !(n('en') === 4 || n('sk') === 4)) return;
        if (nw < 4) return;
        if (gw < 4 || n('ge') < 2) return;
        if (n('ku') < 2) return;
        if (fs + nw < 12) return;
        const picked = [].concat(...order.map(k => take(k, n(k))));
        const sum = sumOf(picked);
        const under = picked.filter(c => c.value < 5).length;
        const zeros = picked.filter(c => c.value === 0).length;
        if (!best || sum > best.sum || (sum === best.sum && (under < best.under || (under === best.under && zeros < best.zeros)))) {
          best = { picked, sum, under, zeros, counts: Object.assign({}, counts) };
        }
        return;
      }
      const k = order[i];
      // pruning: max still reachable
      let maxRest = 0; for (let j = i; j < order.length; j++) maxRest += Math.max(...(options[order[j]].length ? options[order[j]] : [0]));
      if (total + maxRest < 36) return;
      if (total > 36) return;
      for (const c of options[k]) { counts[k] = c; rec(i + 1, total + c); }
      counts[k] = 0;
    };
    rec(0, 0);
    if (!best) return { error: 'no_valid_selection', options };
    const eI = roundHalfUp(best.sum * 10 / 9);
    const checks = [
      { id: 'no_zero', ok: best.zeros === 0, value: best.zeros },
      { id: 'max_7_under', ok: best.under <= 7, value: best.under },
      { id: 'sum_180', ok: best.sum >= 180, value: best.sum },
    ];
    return { picked: best.picked, sum: best.sum, eI, under: best.under, zeros: best.zeros,
      counts: best.counts, checks, ok: checks.every(c => c.ok) };
  }

  // ---- exam subjects (E II) ------------------------------------------------------
  // slots: [{subject, mode:'written'|'oral', result: number|null}] length 5, slot 1 = de written
  // assumption: {mode:'notan'|'avg'|'manual', manual:{subject:number}}; avgOf(subject) gives the 4-term average
  function examSlotsValid(slots) {
    const errs = [];
    const keys = slots.map(s => s && s.subject).filter(Boolean);
    if (new Set(keys).size !== keys.length) errs.push('duplicate_subject');
    const s = slots;
    if (!s[0] || s[0].subject !== 'de') errs.push('slot1_de');
    if (s[1] && s[1].subject && !['ma', 'en'].includes(s[1].subject)) errs.push('slot2_ma_or_en');
    if (s[2] && s[2].subject && !['ma', 'en', 'bi', 'ph', 'ge'].includes(s[2].subject)) errs.push('slot3_allowed');
    for (let i = 0; i < 5; i++) {
      const k = s[i] && s[i].subject; if (!k) continue;
      const sub = BY_KEY[k];
      if (!sub) { errs.push('unknown_subject'); continue; }
      if (sub.noExam) errs.push('no_exam_' + k);
      if (sub.oralOnly && i < 3) errs.push('oral_only_' + k);
    }
    const fields = new Set(keys.map(k => BY_KEY[k] && BY_KEY[k].field).filter(Boolean));
    if (keys.length === 5) { for (const f of ['I', 'II', 'III']) if (!fields.has(f)) errs.push('field_' + f); }
    return { ok: errs.length === 0, errors: errs, fields: [...fields] };
  }

  function eII(slots, assumption, avgOf) {
    const rows = slots.map((s, i) => {
      if (!s || !s.subject) return { slot: i + 1, subject: null, value: null, assumed: false };
      if (typeof s.result === 'number') return { slot: i + 1, subject: s.subject, value: s.result, assumed: false };
      let v = null;
      if (assumption.mode === 'notan') v = 10;
      else if (assumption.mode === 'manual') v = (assumption.manual && typeof assumption.manual[s.subject] === 'number') ? assumption.manual[s.subject] : 10;
      else { const a = avgOf(s.subject); v = typeof a === 'number' ? roundHalfUp(a) : null; }
      return { slot: i + 1, subject: s.subject, value: v, assumed: true };
    });
    const vals = rows.map(r => r.value).filter(v => typeof v === 'number');
    const sum = vals.reduce((a, b) => a + b, 0);
    const good = rows.filter(r => typeof r.value === 'number' && r.value >= 5);
    const coreGood = good.some(r => ['de', 'ma', 'en', 'sk'].includes(r.subject));
    const checks = [
      { id: 'three_of_five', ok: good.length >= 3 && coreGood, value: good.length },
      { id: 'sum_25', ok: sum >= 25, value: sum },
    ];
    return { rows, sum, eII: sum * 4, complete: vals.length === 5, checks, ok: checks.every(c => c.ok) };
  }

  // ---- total ---------------------------------------------------------------------
  function gradeFromPoints(E) {
    if (E < 300) return null;              // nicht bestanden
    if (E === 300) return 4.0;
    if (E >= 823) return 1.0;
    return Math.round((10 + Math.ceil((823 - E) / 18))) / 10;
  }
  function pointsForGrade(grade) {        // minimum total points for a grade
    if (grade <= 1.0) return 823;
    if (grade >= 4.0) return 300;
    return 823 - Math.round((grade - 1.0) * 10) * 18;   // e.g. 2.0 -> 643, 3.9 -> 301
  }
  function total(eI, eIIv) {
    const E = eI + eIIv;
    const grade = gradeFromPoints(E);
    const next = grade && grade > 1.0 ? Math.round((grade - 0.1) * 10) / 10 : null;
    return { E, grade, passed: E >= 300 && eI >= 200 && eIIv >= 100, next, missingForNext: next ? pointsForGrade(next) - E : 0,
      checks: [{ id: 'eI_200', ok: eI >= 200, value: eI }, { id: 'eII_100', ok: eIIv >= 100, value: eIIv }, { id: 'E_300', ok: E >= 300, value: E }] };
  }

  return { TERMS, SUBJECTS, BY_KEY, subjectForEdupageName, roundHalfUp, pointsOf, GRADE_TO_POINTS,
    estimateTerm, einbringung, examSlotsValid, eII, gradeFromPoints, pointsForGrade, total };
});
