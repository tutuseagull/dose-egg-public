/* REPORT RECORD (2026-11-20)
   A 9-month sample record, and everything the new-doctor report CALCULATES from it.
   No wording lives here: this file returns numbers, times and keys, and the report
   page turns them into sentences in each language. That split is the point:
   - a reviewer can check every rule below without reading any copy;
   - the report stays templated, never generated [AGENTS.md: AI features].

   Days are counted back from today ("ago"): ago 0 is today, ago 279 the first day.
   A day is either a list of entries or null. null means nothing was logged: unknown,
   never zero [rule 2].

   TIME ZONES (Tutu, 2026-11-20). Every entry keeps the time zone it was logged in,
   and its clock time is read in that zone. A 08:00 dose in San Francisco stays 08:00
   after a flight to Tokyo, because the record is about the person's routine. So the
   "from plan" comparison uses local clock times on both sides, which is right: a plan
   of 07:30 means 07:30 wherever the person is. */
(function(){
  /* its own seeded random numbers, so this record is the same on every load and
     does not change the 2-week sample the regular-doctor report uses */
  let seed = 20261120;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const noise = r => Math.round((rnd() - .5) * 2 * r);
  const toMin = t => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
  const median = a => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };

  const SPAN = 280;

  /* THE PLAN OVER TIME, as the Medicine Cabinet's dated versions would give it.
     The Cabinet is the source of truth for when a plan changed. `from` is the
     first day ("ago") the version was in force. Medication names: the person's
     own, as typed; "the small white one" is never renamed [AGENTS.md]. */
  const LEV4 = ['08:00','12:00','16:00','20:00'];
  const LEV5 = ['07:30','11:00','14:30','18:00','21:30'];
  const PLANS = [
    { from:279, meds:[ { key:'lev', times:LEV4 } ] },
    { from:170, meds:[ { key:'lev', times:LEV5 } ] },
    { from:62,  meds:[ { key:'lev', times:LEV5 }, { key:'ent', times:['09:30','11:00','14:30'] },
                       { key:'own', name:'the small white one', times:['21:30'] } ] },
  ];
  const planAt = ago => PLANS.filter(p => p.from >= ago).pop();

  /* A TRIP: ten days in Tokyo. Entries there carry Asia/Tokyo and keep Tokyo clock
     times; nothing before or after shifts. */
  const TRIP = { from:118, to:109, tz:'Asia/Tokyo' };

  /* HOW MUCH WAS LOGGED changes over the months, as it does for real people: keen at
     the start, thinner in the middle, an 11-day gap, steady lately. Kept on purpose:
     the report must never read thinner logging as a change in the person (open
     question, 2026-11-20). */
  const loggedChance = ago => ago > 220 ? .9 : ago > 170 ? .6 : (ago <= 150 && ago >= 140) ? 0 : ago > 62 ? .72 : .88;

  /* how each plan period behaves in the sample, so the comparison has something to show */
  const SHAPE = [
    { drift:22, off:.46, offAt:'15:20', move:.30, sleepLog:.08, sleep:6.6 },
    { drift:13, off:.29, offAt:'13:50', move:.42, sleepLog:.35, sleep:6.4 },
    { drift: 8, off:.20, offAt:'14:00', move:.55, sleepLog:.62, sleep:6.9 },
  ];

  /* EVENTS the person logged that the report picks up on its own (falls, freezing,
     anything marked severe), plus one the person pinned. `note` is the person's
     own words, printed as written in every language, never translated. */
  const EVENTS = [
    { ago:201, type:'fall',   note:'on the stairs at home, no injury' },
    { ago:95,  type:'fall',   note:'stepping off a curb' },
    { ago:75,  type:'severe', note:'dizzy after standing up, sat down for 20 minutes' },
    { ago:240, type:'freeze', note:'' }, { ago:188, type:'freeze', note:'' },
    { ago:130, type:'freeze', note:'' }, { ago:40,  type:'freeze', note:'' },
    { ago:12,  type:'freeze', note:'' }, { ago:9,   type:'freeze', note:'at a doorway' },
    { ago:30,  type:'pin',    note:'Started physical therapy on Tuesdays' },
  ];

  /* ── the record, day by day ── */
  const DAYS = [];
  for (let ago = SPAN - 1; ago >= 0; ago--){
    const forced = EVENTS.some(e => e.ago === ago);        /* an event day is a logged day */
    if (!forced && rnd() > loggedChance(ago)){ DAYS.push({ ago, none:true }); continue; }
    const plan = planAt(ago), pi = PLANS.indexOf(plan), sh = SHAPE[pi];
    const lev = plan.meds[0].times;
    const doses = lev.map(t => ({ planned:t, at: toMin(t) + noise(sh.drift * 1.7) }))
                     .filter(() => rnd() > .08);               /* a dose not logged is not a dose missed */
    const trip = ago <= TRIP.from && ago >= TRIP.to;
    DAYS.push({
      ago, plan:pi, tz: trip ? TRIP.tz : 'America/Los_Angeles', doses,
      breakfast: rnd() < .7 ? toMin('07:45') + noise(25) : null,
      sleep: rnd() < sh.sleepLog ? Math.round((sh.sleep + (rnd() - .5) * 1.6) * 2) / 2 : null,
      move: rnd() < sh.move,
      wearing: rnd() < sh.off ? toMin(sh.offAt) + noise(30) : null,
    });
  }

  /* ── CALCULATIONS ── */
  /* A value needs this many logged days behind it, in that period, or it is not
     shown ("too few logs"). One number for every line, so no line gets a softer bar. */
  const MIN_DAYS = 10;

  /* PERIODS split where the plan changed, not into fixed 3-month blocks, so no
     period mixes two plans. */
  const PERIODS = PLANS.map((p, i) => {
    const to = i + 1 < PLANS.length ? PLANS[i + 1].from + 1 : 0;
    const days = DAYS.filter(d => d.ago <= p.from && d.ago >= to);
    const logged = days.filter(d => !d.none);
    const vals = (f) => logged.map(f).filter(v => v != null);
    const enough = (a, f) => a.length >= MIN_DAYS ? f(a) : null;
    /* "from plan": minutes between a confirmed dose and its planned time, in the
       zone it was logged in. Only confirmed doses; an assumed dose never counts. */
    const drift = logged.flatMap(d => d.doses.map(x => Math.abs(x.at - toMin(x.planned))));
    const firsts = vals(d => d.doses.length ? d.doses[0].at : null);
    const lasts  = vals(d => d.doses.length ? d.doses[d.doses.length - 1].at : null);
    const off = logged.filter(d => d.wearing != null);
    return {
      index:i, from:p.from, to, plan:p, days:days.length, logged:logged.length,
      drift: logged.length >= MIN_DAYS ? median(drift) : null,
      firstDose: enough(firsts, median), lastDose: enough(lasts, median),
      breakfast: enough(vals(d => d.breakfast), median),
      sleep: enough(vals(d => d.sleep), median),
      sleepN: vals(d => d.sleep).length,
      move: logged.length >= MIN_DAYS ? { k: logged.filter(d => d.move).length, n: logged.length } : null,
      off:  logged.length >= MIN_DAYS ? { k: off.length, n: logged.length, at: median(off.map(d => d.wearing)) } : null,
    };
  });

  /* THE MEMO'S ONE FINDING, by rule rather than judgment, so the same record always
     leads with the same line: of the shares compared across plans, the one with the
     widest spread, counting only periods with enough days. Shares only (k of n), so
     every number carries its own coverage [rule 1]. Never a finding whose obvious
     action is to do less: movement is a candidate only as a count, never a lead. */
  const SHARES = ['off'];
  const spread = key => { const s = PERIODS.map(p => p[key]).filter(Boolean).map(v => v.k / v.n);
                          return s.length >= 2 ? Math.max(...s) - Math.min(...s) : -1; };
  const LEAD = SHARES.map(k => ({ key:k, spread: spread(k) })).filter(x => x.spread >= 0)
                     .sort((a, b) => b.spread - a.spread)[0] || null;

  /* DAYS THAT STOOD OUT. What Look Back marks as important, mirrored here. Order:
     a fall, then anything marked severe, then freezing, then what the person pinned;
     newest first inside each. The memo shows the first 3; the details list all,
     with repeats of one kind grouped on one line. */
  const RANK = { fall:0, severe:1, freeze:2, pin:3 };
  const STOOD = [...EVENTS].sort((a, b) => RANK[a.type] - RANK[b.type] || a.ago - b.ago);

  const logged = DAYS.filter(d => !d.none).length;
  window.RecordLong = { SPAN, PLANS, TRIP, DAYS, PERIODS, LEAD, STOOD, MIN_DAYS, logged };
})();
