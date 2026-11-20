# KaamSetu — Usability Test Kit (prototype, round 1)

Everything you need for tasks **T2.2 (owner), T2.3 (senior technician), T2.4 (helper)**. Run each session with one person, on the clickable prototype (`docs/design/KaamSetu Prototype.html`). Write results into [USABILITY_TEST_1.md](USABILITY_TEST_1.md) the same day. The tasks come from doc 02 §10, updated for what the prototype now has.

> Hindi and Marathi task wording below was written for this kit; ask the person to correct any word that sounds odd, and note their word: it may become the app label.

## Golden rules

1. **We test the app, not the person.** Say it out loud at the start. If they get stuck, the app is wrong.
2. **Don't help, don't point.** Read the task, then stay quiet. Use the hint ladder below only when they are really stuck.
3. **Ask them to think aloud.** "Please say what you are looking for and what you expect to happen."
4. **Use their language.** Owners may prefer English or Hindi; field staff usually Hindi or Marathi. Switch the app language before starting (Technician › Profile › Language).
5. **Write exact words** when they hesitate or say something is confusing. Those words fix labels.
6. **Personal data:** the prototype only has made-up customers. Don't film faces; screen recording of the phone is fine with permission.

**Hint ladder** (note which level was needed):
- H0: no help.
- H1: "What are you looking for?" / "Where would you expect to find it?"
- H2: "Try looking at the bottom of the screen." (area only, not the button)
- H3: Show the button. The task counts as **failed**, carry on to the next one.

## Before the session

- [ ] **Dry run yourself** on the phone you will use: every task below, in the language you will test in.
- [ ] **Open the prototype on the phone:**
  - Easiest: send the HTML file to the phone (WhatsApp to yourself / Google Drive) and open it in **Chrome**.
  - Or, on the same Wi-Fi, from `D:\Sadik\KaamSetu\app\docs\design` run `python -m http.server 8000` and open `http://<PC address>:8000/KaamSetu%20Prototype.html` on the phone.
  - Add `#owner`, `#technician` or `#helper` to the address to open that role directly. The grey panel has the **Online / Offline** switch and **Start from the welcome screens**.
  - If the phone frame is too small on the phone screen, run the test on a tablet instead; note it in the results.
- [ ] Reload the page before each person, so sample data is fresh.
- [ ] Phone charged, brightness up, notifications off (Do Not Disturb).
- [ ] Results template open on your laptop, or paper copy of the observation table.
- [ ] Stopwatch (phone clock app).

**Consent (read or send on WhatsApp):**

> EN: We're testing a new app for AC businesses. You'll try a few small tasks on my phone. We're testing the app, not you; if something is hard, that's the app's fault. I'll take notes but won't record your face or share your name. About 20 minutes. Okay?
>
> HI: हम AC बिज़नेस के लिए एक नया ऐप जाँच रहे हैं। आप मेरे फ़ोन पर कुछ छोटे काम करके देखेंगे। हम ऐप को जाँच रहे हैं, आपको नहीं; कुछ मुश्किल लगे तो वह ऐप की गलती है। मैं नोट्स लूँगा, पर आपका चेहरा रिकॉर्ड नहीं करूँगा और आपका नाम कहीं नहीं दूँगा। लगभग 20 मिनट। ठीक है?
>
> MR: आम्ही AC व्यवसायांसाठी एक नवीन ॲप तपासत आहोत. तुम्ही माझ्या फोनवर काही छोटी कामे करून बघाल. आम्ही ॲप तपासत आहोत, तुम्हाला नाही; काही अवघड वाटले तर ती ॲपची चूक आहे. मी नोट्स घेईन, पण तुमचा चेहरा रेकॉर्ड करणार नाही आणि तुमचे नाव कुठेही देणार नाही. साधारण 20 मिनिटे. चालेल?

## Session flow (every role)

1. Consent (above), then: "Please think aloud while you use it."
2. One warm-up question: "How do you get today's work right now?" (1 min, don't discuss).
3. Hand over the phone on the role's start screen. Read one task card at a time. Start the stopwatch when you finish reading; stop when they say "done" or you reach H3.
4. After each task: "How easy was that? Easy / OK / Hard" (sab aasaan / theek / mushkil).
5. After all tasks, the three closing questions (end of this file).

Record for every task: **result** (H0 / H1 / H2 / failed), **seconds**, **wrong taps**, **words that confused them**, **steps they tried to skip**, and whether they **understood the result** (e.g. "Saved on phone").

## Part 1 — Owner (T2.2, 25–30 min)

Start: `#owner`, Home screen, Online.

| # | Task card (read aloud) | Done when |
|---|---|---|
| O1 | EN: "Anil Deshpande calls. Find him and see which ACs he has." · HI: "अनिल देशपांडे का फ़ोन आया है। उन्हें ढूँढिए और देखिए उनके कौन से AC हैं।" · MR: "अनिल देशपांडे यांचा फोन आला आहे. त्यांना शोधा आणि त्यांचे कोणते AC आहेत ते बघा." | Customer page with ACs is open |
| O2 | EN: "A customer sent a WhatsApp message asking for a service. Save it so you don't forget." · HI: "एक ग्राहक ने WhatsApp पर सर्विस के लिए मैसेज भेजा है। उसे सेव कीजिए ताकि भूलें नहीं।" · MR: "एका ग्राहकाने WhatsApp वर सर्व्हिससाठी मेसेज पाठवला आहे. विसरू नये म्हणून तो सेव्ह करा." | An enquiry is saved |
| O3 | EN: "Turn that enquiry into a job and give it to Team 2 for tomorrow morning." · HI: "उस पूछताछ को काम बनाइए और कल सुबह के लिए टीम 2 को दीजिए।" · MR: "त्या चौकशीचे काम बनवा आणि उद्या सकाळसाठी टीम 2 ला द्या." | Job shows Team 2, tomorrow, morning |
| O4 | EN: "A service centre sent a ticket. Create the job from the ticket text." (use **Paste ticket › Use a sample ticket**) · HI: "सर्विस सेंटर ने टिकट भेजा है। टिकट से काम बनाइए।" · MR: "सर्व्हिस सेंटरने तिकीट पाठवले आहे. तिकिटावरून काम बनवा." | Job filled from the ticket |
| O5 | EN: "Find a job that is already completed." · HI: "कोई ऐसा काम ढूँढिए जो पूरा हो चुका है।" · MR: "आधीच पूर्ण झालेले एखादे काम शोधा." | A completed job is open |
| O6 | EN: "Make the bill for that job, without GST, and send it to the customer." · HI: "उस काम का बिल बनाइए, बिना GST, और ग्राहक को भेजिए।" · MR: "त्या कामाचे बिल बनवा, GST शिवाय, आणि ग्राहकाला पाठवा." | Bill issued, share step reached |
| O7 | EN: "The customer paid ₹500 in cash now; the rest later. Record it." · HI: "ग्राहक ने अभी ₹500 नकद दिए, बाकी बाद में। यह दर्ज कीजिए।" · MR: "ग्राहकाने आत्ता ₹500 रोख दिले, बाकी नंतर. हे नोंदवा." | Partial payment shown, balance pending |
| O8 | EN: "How much cash do your teams still have to hand over to you?" · HI: "आपकी टीमों के पास अभी कितना नकद है जो आपको देना है?" · MR: "तुमच्या टीमकडे अजून किती रोख आहे जी तुम्हाला द्यायची आहे?" | They find "with teams, to hand over" on Home |

## Part 2 — Senior technician (T2.3, 20–25 min)

Start: `#technician`, My Work, **Online**. Switch the language first if they prefer Hindi/Marathi.

| # | Task card | Done when |
|---|---|---|
| T1 | EN: "Which job do you have now, and where is it?" · HI: "अभी आपका कौन सा काम है, और कहाँ है?" · MR: "आत्ता तुमचे कोणते काम आहे, आणि कुठे आहे?" | They read the address of the current job |
| T2 | EN: "Call the customer to say you are on the way." · HI: "ग्राहक को फ़ोन करके बताइए कि आप आ रहे हैं।" · MR: "ग्राहकाला फोन करून सांगा की तुम्ही येत आहात." | Call button tapped |
| T3 | EN: "You reached the site. Start the work." · HI: "आप साइट पर पहुँच गए। काम शुरू कीजिए।" · MR: "तुम्ही साइटवर पोहोचलात. काम सुरू करा." | Job shows In Progress |
| T4 | EN: "The PCB is faulty and you need one from the owner. Tell the owner." · HI: "PCB खराब है, मालिक से एक मंगवाना है। मालिक को बताइए।" · MR: "PCB खराब आहे, मालकाकडून एक मागवायचा आहे. मालकाला सांगा." | "Part needed" sent |
| T5 | EN: "Work is done. Fill the finish page: what you did, one photo, and ₹1,200 cash from the customer." · HI: "काम हो गया। काम पूरा करने वाला पेज भरिए: क्या किया, एक फ़ोटो, और ग्राहक से ₹1,200 नकद।" · MR: "काम झाले. काम पूर्ण करण्याचे पान भरा: काय केले, एक फोटो, आणि ग्राहकाकडून ₹1,200 रोख." | Work completed screen |
| T6 | (Before reading: switch the panel to **Offline**.) EN: "There is no network here. Start and finish Meera Joshi's job." · HI: "यहाँ नेटवर्क नहीं है। मीरा जोशी का काम शुरू करके पूरा कीजिए।" · MR: "इथे नेटवर्क नाही. मीरा जोशी यांचे काम सुरू करून पूर्ण करा." | Completed; then switch **Online** and ask: "Has the owner got it?" Note if they understand *Saved on phone → Sent* |
| T7 | EN: "Change the app to your language." (skip if done at the start) | Language changed |

**Pass mark (tracker T2.3):** completes T3–T6 with at most H1 hints.

## Part 3 — Helper (T2.4, 10 min)

Start: `#helper`, Today's work.

| # | Task card | Done when |
|---|---|---|
| H1 | EN: "Where are you going today, and for what kind of work?" · HI: "आज आप कहाँ जा रहे हैं, और किस तरह का काम है?" · MR: "आज तुम्ही कुठे जात आहात, आणि कोणत्या प्रकारचे काम आहे?" | They read the locality and job type |
| H2 | EN: "What should you carry for this job?" · HI: "इस काम के लिए साथ में क्या ले जाना है?" · MR: "या कामासाठी सोबत काय न्यायचे आहे?" | They read the carry list |
| H3 | EN: "Call your senior." · HI: "अपने सीनियर को फ़ोन कीजिए।" · MR: "तुमच्या सीनियरला फोन करा." | Call button tapped |

Then ask (closes **Q-01**): "Would you open this app yourself every morning, or is it enough that your senior tells you?" Write the exact answer.

## Closing questions (every role)

1. "What was the most confusing part?" (क्या सबसे ज़्यादा उलझन वाला लगा? / सगळ्यात गोंधळात टाकणारे काय होते?)
2. "Is there any word on the screens you would say differently?" Write the word they use.
3. "Would you use this every day instead of [WhatsApp / notebook / calls]? Why or why not?"

## After the session (same day)

1. Fill [USABILITY_TEST_1.md](USABILITY_TEST_1.md): one table per person, then the issues list.
2. Mark each issue **severity**: 3 = blocks the task, 2 = slows or needed a hint, 1 = cosmetic/word.
3. The top severity-3 and -2 issues become the fixes in **T2.5**; re-test the worst flow with one new person.
4. Update the tracker rows T2.2–T2.4 (date, number of people, pass/fail).
