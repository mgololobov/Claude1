// Zprávy pro herní nápady: turnaj, souboj, zasedání rady, Černá smrt, velká díla, křížová výprava.
Object.assign(SPECIAL, {
  _joust: { t: "Rytířský turnaj", txt: (s, e) => e.done ? `${e.log.join(" ")} ${e.result}` : `Na kolbišti stojí proti tobě ${e.foeName} (udatnost ${e.foeUda}). Stav po ${e.r} nájezdech: ty ${e.me} : ${e.foe} soupeř.${e.log.length ? " " + e.log[e.log.length - 1] : ""} Kam namíříš kopí?`,
    ch: (s, e) => e.done ? [{ t: "Opustit kolbiště", e: () => "" }] : Object.entries(AIMS).map(([k, A]) => ({ t: A.n, d: A.d, e: (s, ev) => { joustPass(s, ev, k); ev.keep = true; return ""; } })) },
  _duel: { t: "Soud Boží", txt: (s, e) => `Spor mezi ${chr(s, e.a).n} a ${chr(s, e.b).n} zašel tak daleko, že oba žádají souboj na život a na smrt.`,
    ch: [
      { t: "Povolit souboj", e: (s, e) => { const a = chr(s, e.a), b = chr(s, e.b); const wA = st(a, "uda") + rnd(s) * 40 > st(b, "uda") + rnd(s) * 40, W = wA ? a : b, Lz = wA ? b : a; endFeud(s, a, null); W.loy = Math.min(100, W.loy + 10); W.merit += 30; let t = `${W.n} zvítězil.`; if (chance(s, 0.35)) { kill(s, Lz, "padl v souboji"); t += ` ${Lz.n} padl.`; } else { Lz.hp -= 25; Lz.loy -= 10; t += ` ${Lz.n} je těžce zraněn.`; } P(s).prestige += 3; return t; } },
      { t: "Zakázat souboj", e: (s, e) => { const a = chr(s, e.a), b = chr(s, e.b); a.loy -= 6; b.loy -= 6; a.feudSince = s.turn; return "Oba odešli rozhněváni, spor trvá."; } },
      { t: "Usmířit je dary (−120 zl)", ok: s => P(s).gold >= 120, e: (s, e) => { P(s).gold -= 120; const a = chr(s, e.a), b = chr(s, e.b); a.loy += 5; b.loy += 5; endFeud(s, a, "usmířeni dary"); return "Páni si podali ruce."; } }] },
  _rada: { t: (s, e) => "Zasedání rady: " + DEBATES[e.di].t, txt: (s, e) => { const D = DEBATES[e.di]; return `${chr(s, e.a).n}: „${D.A[0]}“ — ${chr(s, e.b).n}: „${D.B[0]}“`; },
    ch: (s, e) => { const D = DEBATES[e.di], a = chr(s, e.a), b = chr(s, e.b); return [
      { t: `Dát za pravdu: ${a.n}`, e: s => { a.loy = Math.min(100, a.loy + 8); b.loy -= 6; return D.A[1](s); } },
      { t: `Dát za pravdu: ${b.n}`, e: s => { b.loy = Math.min(100, b.loy + 8); a.loy -= 6; return D.B[1](s); } },
      { t: "Rozpustit radu bez rozhodnutí", e: () => "Rada se rozešla." }]; } },
  _cernasmrt: { t: "Černá smrt", txt: () => "Z Itálie a Rakous přicházejí zprávy o moru, který kosí celá města. Lidé umírají během tří dnů. Co nařídíš?",
    ch: [
      { t: "Uzavřít všechny kraje do karantény (−250 zl)", ok: s => P(s).gold >= 250, e: s => { P(s).gold -= 250; for (const p of clanProvs(s, s.player)) { p.quar = s.turn + 18; p.com = Math.max(0, p.com - 4); } return "Brány se zavřely, obchod vázne, ale mor zůstává venku."; } },
      { t: "Procesí a modlitby", e: s => { s.pope.op[s.player] += 5; return "Kostely jsou plné. Zda to pomůže, ukáže čas."; } },
      { t: "Obvinit cizince a vyhnat je (měšťané −15)", e: s => { if (P(s).estates) mod(s, "mestane", -15, 24, "Pronásledování cizinců"); for (const p of clanProvs(s, s.player)) p.com = Math.max(0, p.com - 6); return "Kupci prchají z měst."; } }] },
  _work: { t: "Velké dílo dokončeno", txt: (s, e) => `${WORKS[e.wid].n} je dokončeno! Účinek: ${WORKS[e.wid].d}.`, ch: [{ t: "Ať slouží věky", e: () => "" }] },
  _kriz: { t: "Křížová výprava do Pruska", txt: s => `Papež ${s.pope.n} volá křesťanská knížata na pomoc Řádu německých rytířů proti pohanům.`,
    ch: [
      { t: "Vést výpravu osobně (1500 mužů ze sídla)", ok: s => men(s.provs[P(s).capital].troops) > 1800, e: s => { const C = P(s), L = leaderOf(s, s.player); loseMen(s.provs[C.capital].troops, 1500); C.prestige += 60; s.pope.op[s.player] += 25; addRel(s, s.player, "rad", 30); if (chance(s, 0.15)) { L.hp -= 30; return "Výprava slavně zvítězila, panovník se ale vrátil těžce raněn."; } return "Výprava zvítězila, pohané byli pokřtěni a tvé jméno zní celou Evropou."; } },
      { t: "Poslat vojsko (800 mužů)", ok: s => men(s.provs[P(s).capital].troops) > 1000, e: s => { loseMen(s.provs[P(s).capital].troops, 800); P(s).prestige += 30; s.pope.op[s.player] += 15; addRel(s, s.player, "rad", 15); return "Tvoji rytíři se vyznamenali."; } },
      { t: "Poslat zlato (−200 zl)", ok: s => P(s).gold >= 200, e: s => { P(s).gold -= 200; s.pope.op[s.player] += 8; return "Řád děkuje za podporu."; } },
      { t: "Odmítnout", e: s => { s.pope.op[s.player] -= 5; return "Kněží nesouhlasně kroutí hlavami."; } }] },
});
