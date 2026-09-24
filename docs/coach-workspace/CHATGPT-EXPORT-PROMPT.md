# CounterScheme: pull everything out of your ChatGPT

**Coach, here's how to do it (about 10 minutes):**

1. In ChatGPT, open **Settings → Personalization** and make sure **Memory** is on, along with **Reference chat history** if you see it. That lets ChatGPT read what you've told it in past chats.
2. If you kept your football or CounterScheme chats inside a ChatGPT **Project**, open that Project and start the new chat there. Otherwise start a normal new chat.
3. Paste everything below the line into the chat and send it.
4. It'll answer in parts. Type **continue** after each part until it says `END OF EXPORT`.
5. Copy all the parts into one document (Google Doc, Word, or a text file) and send it to Matt.
6. **Also do this (it's the complete record):** go to **Settings → Data controls → Export data → Export**. ChatGPT emails you a download link (it can take up to a day). Download the .zip and send it to Matt as well. It contains every chat word for word, so nothing gets lost if ChatGPT's summary skips something.

---

I'm the head football coach behind **CounterScheme**, a defense-first coaching app my developer (Matt) is building for me. It's about to be connected to a real AI model, and I want that model to know my football the way you do. **Go through everything you know about me: your memory of me and every past conversation you can see.** Pull out all of my defensive football knowledge and everything I've said about how the app should work, and write it into one organized export that my developer can load into the app.

**Rules for this export:**
- **Only what I actually said or decided.** Don't fill gaps with textbook football or your own suggestions. If I only half-explained something, write down what I said and put the rest under Open Questions.
- **Use my words.** Keep my call names, terminology, and phrasing exactly, including capitalization. Put my direct quotes in quotation marks when you have them.
- **Label anything uncertain.** If you're inferring something, or only remember it vaguely, tag it `[unsure]`. If I said two different things at different times, list both under Contradictions and give the most recent one first.
- **Be complete, not short.** This will be split into parts. End every part with `— reply "continue" for Part N —`. After the last part, write `END OF EXPORT`.
- Don't include personal details about players, students, or families beyond first name/initial, number, and position. Leave out anything unrelated to football or the app.

**Write the export in this exact structure:**

## PART 1: WHO I AM AND HOW I COACH
- Program: school level, state, classification, and anything I've said about my team, staff, and roles.
- My coaching philosophy and principles, in my words (e.g. what "quality over quantity" means to me, run defense, physicality, how much scheme is too much).
- How I like information presented: how I talk to my staff, how I want the AI to talk to me, what annoys me.

## PART 2: MY DEFENSE (the most important part)
For **every** front, coverage, pressure/blitz, and adjustment/check I've ever described, give:
- **Name** (my name for it), **kind** (front / coverage / pressure / adjustment), and whether it's **base**, **active**, or **back pocket**.
- **What it is**: one or two sentences in my terms.
- **Alignments and responsibilities**, position by position (who aligns where, gap, key, fit, coverage zone or man assignment), only as I described them.
- **When I call it**: down & distance, field zone, personnel, formation, and what it's good and bad against.
- For **adjustments/checks**: trigger (when ___) → action (we ___) → result (so that ___).
- For **pressures**: who rushes, which gaps, what coverage is behind it, and which group it fits (Zone Blitz, Man Blitz, Edge Blitz, Pressure Package, 3rd Down Call).
- Any **combinations I call together** ("Complete Calls": front + coverage + pressure + adjustment) and why they fit.
- My **global rules**: strength call, run fits, vs Trips, vs motion, vs unbalanced, vs empty, vs tempo, vs specific personnel groups.

## PART 3: MY TERMINOLOGY
A table of every word my staff uses: **Term | What it means (my words) | Type** (formation, play/concept, backfield, motion, personnel, or other). Include offensive words we use to tag opponents, plus our own defensive call words, landmarks, and position names.

## PART 4: HOW I SCOUT AND GAME PLAN
- What I look for in an opponent's film and Hudl data, which columns I tag, and what counts as a real tendency or tell to me.
- How I build a game plan, step by step, Sunday through Friday.
- What goes on my call sheet, how it's organized, and how I call a game.
- How I script practice and scout-team looks.
- Any real opponents or game plans we've discussed (opponent name, what they did, what we decided and why).

## PART 5: WHAT I WANT THE APP TO DO
Everything I've said about CounterScheme itself:
- Every feature, screen, or workflow I've asked for or described, and **why** I wanted it.
- The logic I want it to follow: how it should decide, recommend, rank, or flag things (e.g. when a tendency is strong enough to trust, what the game plan should prioritize, what the AI must never do on its own).
- Look-and-feel decisions (colors, layout, navigation, naming).
- Things I've said I **don't** want.
- Ideas I mentioned but haven't decided on.
- Label each item `[built]` if I've said it's already in the app, `[requested]` if I've asked for it, or `[idea]` if I was just thinking out loud.

## PART 6: OPEN QUESTIONS AND CONTRADICTIONS
- Things I started explaining but never finished.
- Places where I said two different things (most recent first).
- Questions you'd need answered to describe my defense completely.

## PART 7: MACHINE-READABLE COPY
Finish with two code blocks my developer can import directly. Only include items from Parts 2 and 3. Leave a field as `null` or `[]` if I never said it; don't make anything up.

```json
{
  "concepts": [
    {
      "kind": "front | coverage | pressure | adjustment",
      "name": "",
      "status": "active | backPocket",
      "isBase": false,
      "summary": "",
      "group": "Zone Blitzes | Man Blitzes | Edge Blitzes | Pressure Packages | 3rd Down Calls | null",
      "category": "vs Formations | vs Motions | vs Personnel | Situational Rules | Special Situations | null",
      "trigger": null,
      "action": null,
      "result": null,
      "responsibilities": [{ "role": "", "job": "" }],
      "notes": "",
      "confidence": "said | unsure"
    }
  ]
}
```

```json
{
  "terminology": [
    { "term": "", "meaning": "", "kind": "formation | concept | backfield | other", "confidence": "said | unsure" }
  ]
}
```

Start with Part 1 now.
