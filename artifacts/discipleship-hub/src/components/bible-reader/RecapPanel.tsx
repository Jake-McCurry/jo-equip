const ITEMS = [
  { letter: "R", pre: "Is there a ", word: "REVELATION", post: " about God, Jesus, or the Holy Spirit in this passage?", color: "#a84300" },
  { letter: "E", pre: "Is there an ", word: "EXAMPLE", post: " for me to follow or to avoid?", color: "#005a9e" },
  { letter: "C", pre: "Is there a ", word: "COMMAND", post: " I need to obey?", color: "#b01f1f" },
  { letter: "A", pre: "Is there an ", word: "APPLICATION", post: " I should make in my life?", color: "#1c6a31" },
  { letter: "P", pre: "Is there a ", word: "PROMISE", post: " I can claim and trust?", color: "#6a3aa2" },
];

export function RecapPanel() {
  return (
    <section aria-labelledby="br-recap" className="br-card p-5 md:p-7">
      <p className="br-eyebrow">Reflect on this chapter</p>
      <h2 id="br-recap" className="mt-1 text-2xl text-[var(--color-text)]">R.E.C.A.P.</h2>
      <ol className="mt-4 divide-y divide-[var(--color-border-soft)]">
        {ITEMS.map(i => (
          <li key={i.letter} className="flex gap-4 py-3">
            <span aria-hidden="true" className="w-6 shrink-0 text-2xl font-bold leading-7" style={{ color: i.color, fontFamily: "var(--font-display)" }}>{i.letter}</span>
            <p className="text-[17px] leading-7">{i.pre}<strong className="font-bold tracking-wide" style={{ color: i.color }}>{i.word}</strong>{i.post}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
