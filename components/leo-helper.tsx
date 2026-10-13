"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import type { Resolution, Role } from "@/lib/domain";
import type { Amendment } from "@/lib/batch/types";

type Reply = { text: string; href?: string; linkLabel?: string };
type Message = { id: number; from: "leo" | "you"; text: string; href?: string; linkLabel?: string; animate?: boolean };
type Reminder = { text: string; href: string; linkLabel: string };

const roleNames: Record<Role, string> = { chair: "Chair", approval: "Approval Panel", logistics: "Admins", admin: "Executive" };
const validLinks = new Set(["/chair", "/chair/roll-call", "/chair/participation", "/chair/documents", "/chair/amendments", "/chair/voting", "/chair/photos", "/chair/awards", "/chair/health", "/approval", "/approval/health", "/logistics", "/logistics/health", "/admin", "/admin/health", "/admin/committees", "/admin/sessions", "/admin/delegates", "/admin/schools", "/admin/staff", "/admin/access-codes", "/admin/submissions", "/admin/amendment-links", "/admin/resources", "/admin/audit", "/admin/photos"]);
const suggestions = ["What should I do next?", "Where do I go for help?", "Tell me a lion joke"];

function getReminders(role: Role, documents: Resolution[], amendments: Amendment[]): Reminder[] {
  const reminders: Reminder[] = [];
  if (role === "chair") {
    for (const doc of documents) {
      if (doc.status === "Draft") reminders.push({ text: `“${doc.title}” is still a draft. Review it and submit it to Approval when it’s ready.`, href: "/chair/documents", linkLabel: "Review resolution" });
      if (doc.status === "Submitted" || doc.status === "Review") reminders.push({ text: `“${doc.title}” is in the Approval workflow and is not approved yet.`, href: "/chair/documents", linkLabel: "Check Documents" });
      if (doc.status === "Printed") reminders.push({ text: `“${doc.title}” is printed and ready for you to open debate when the committee is ready.`, href: "/chair/documents", linkLabel: "Open Documents" });
      if (doc.status === "In Debate") reminders.push({ text: `“${doc.title}” is in debate. When debate finishes, move to Voting; any passed amendment must be added to the Google Doc by hand.`, href: "/chair", linkLabel: "Open Debate" });
    }
    for (const amendment of amendments) {
      const doc = documents.find(item => item.id === amendment.resolutionId);
      if (amendment.status === "Submitted") reminders.push({ text: `An amendment is waiting for your review${doc ? ` on “${doc.title}”` : ""}.`, href: "/chair/amendments", linkLabel: "Review amendment" });
      if (amendment.status === "Accepted for Debate") reminders.push({ text: `An amendment is accepted and ready for debate${doc ? ` on “${doc.title}”` : ""}.`, href: "/chair/amendments", linkLabel: "Open Amendments" });
      if (amendment.status === "In Debate") reminders.push({ text: `An amendment debate is active${doc ? ` on “${doc.title}”` : ""}. Record its outcome; if it passes, update the working Google Doc by hand.`, href: "/chair/amendments", linkLabel: "Open Amendments" });
    }
  } else if (role === "approval") {
    for (const doc of documents) {
      if (doc.status === "Submitted") reminders.push({ text: `“${doc.title}” was submitted and is waiting for you to start its review.`, href: "/approval", linkLabel: "Start review" });
      if (doc.status === "Review") reminders.push({ text: `“${doc.title}” is in your review inbox. Review the latest version, then approve it or request changes with a comment for the Chair. Approval sends it to the print queue.`, href: "/approval", linkLabel: "Review resolution" });
      if (doc.status === "Approved") reminders.push({ text: `You approved “${doc.title}”. It is now in the Admins’ print queue; they mark it printed when the copies are ready, then the Chair can open debate.`, href: "/approval", linkLabel: "Back to Review inbox" });
    }
  } else if (role === "logistics") {
    for (const doc of documents) if (doc.status === "Approved") reminders.push({ text: `“${doc.title}” is approved and waiting in the print queue. Prepare the copies, then mark it printed so the Chair knows it’s ready.`, href: "/logistics", linkLabel: "Open print queue" });
  } else {
    const review = documents.filter(doc => doc.status === "Submitted" || doc.status === "Review").length;
    const printing = documents.filter(doc => doc.status === "Approved").length;
    const amendmentsWaiting = amendments.filter(item => item.status === "Submitted").length;
    if (review) reminders.push({ text: `${review} resolution${review === 1 ? " is" : "s are"} in the Approval workflow. Check that the panel has them in its inbox.`, href: "/admin", linkLabel: "Open Executive overview" });
    if (printing) reminders.push({ text: `${printing} approved resolution${printing === 1 ? " is" : "s are"} waiting for Admins to complete printing.`, href: "/admin", linkLabel: "Open Executive overview" });
    if (amendmentsWaiting) reminders.push({ text: `${amendmentsWaiting} submitted amendment${amendmentsWaiting === 1 ? " is" : "s are"} waiting for a Chair to review.`, href: "/admin", linkLabel: "Open Executive overview" });
  }
  return reminders;
}

function smallTalk(question: string, role: Role): Reply | undefined {
  const q = question.toLowerCase();
  if (/^(hi|hello|hey|hiya|yo|good morning|good afternoon|good evening)[!. ]*$/.test(q)) return { text: ["Hey! Leo reporting for duty 🦁 What can I help you find?", "Well, hello there! Need a hand finding something on this website?", "Hey hey! I’m all ears—where should we go on the website?"][Math.floor(Math.random() * 3)] };
  if (/^(thanks|thank you|thx|cheers)[!. ]*$/.test(q)) return { text: ["Anytime! Happy to help—now go make that committee roar 🦁", "You’re welcome! I’ll be right here if you need a paw.", "No problem at all! Anything else you want to find?"][Math.floor(Math.random() * 3)] };
  if (/how are you|how's it going|how are things/.test(q)) return { text: "I’m doing great—living my best digital-lion life and ready to help! How can I make the website easier to navigate?" };
  if (/who are you|your name|what are you/.test(q)) return { text: "It’s me, Leo! I’m the conference website’s little digital assistant. I can help you find pages, follow the documented workflow, and spot hand-offs that may need attention." };
  if (/\bjoke\b|make me laugh/.test(q)) return { text: "Why did the Chair bring a ladder to committee? To help the debate reach new heights. 🦁 Want help finding anything while we’re here?" };
  if (/weather|music|movie|football|soccer|weekend|food|lunch|game/.test(q)) return { text: `I’m happy to chat! I’m a little website lion, so I don’t have live news or opinions about that—but I can still help you find something in your ${roleNames[role]} workspace. What are you looking for?` };
  return undefined;
}

function answer(question: string, role: Role, reminders: Reminder[]): Reply {
  const q = question.toLowerCase();
  const chat = smallTalk(question, role);
  if (chat) return chat;
  if (/contact.*(exec|executive)|message.*(exec|executive)|talk to.*(exec|executive)|human help/.test(q)) return { text: "For a person, message the Executive using your conference’s usual contact channel. I don’t have the conference’s contact details, so I won’t guess a number." };
  const whatsNext = /what('?s| is) next|next step|what should i do|anything .*left|remind me|pending|waiting|not.*approved/.test(q);
  const askingAmendment = /amend/.test(q) && /submitted|waiting|pending|any|status|what/.test(q);
  const askingResolution = /resol|approval/.test(q) && /submitted|waiting|pending|status|approved|any|what/.test(q);
  if (whatsNext || askingAmendment || askingResolution) {
    const relevant = askingAmendment ? reminders.filter(item => /amendment/i.test(item.text)) : askingResolution ? reminders.filter(item => /resolution/i.test(item.text)) : reminders;
    if (!relevant.length) return { text: "I don’t see a matching hand-off in the conference information currently loaded. You can check the relevant workspace page, and I’ll be here if you need a paw." };
    const top = relevant.slice(0, 5);
    return { text: `Here’s what may need your attention: ${top.map((item, i) => `${i + 1}. ${item.text}`).join(" ")}`, href: top[0].href, linkLabel: top[0].linkLabel };
  }
  if (/offline|wifi|wi-fi|internet|connection|sync|red|yellow|health|crash|error/.test(q)) return { text: "Open System health for this device’s connection and saved changes. If work is waiting to sync, keep this device open; don’t clear browser data or switch devices. If the problem needs a person, contact the Executive.", href: role === "chair" ? "/chair/health" : role === "approval" ? "/approval/health" : role === "logistics" ? "/logistics/health" : "/admin/health", linkLabel: "Open System health" };
  if (role === "chair") {
    if (/attendance|roll.?call|present|absent/.test(q)) return { text: "Roll call is where you record each delegate’s attendance for the selected session.", href: "/chair/roll-call", linkLabel: "Open Roll call" };
    if (/vote|voting|ballot|result/.test(q)) return { text: "Open Voting to record ballots actually cast. The website won’t fill in votes for delegates or decide the result for you.", href: "/chair/voting", linkLabel: "Open Voting" };
    if (/resolution|document|google doc|approval|submit/.test(q)) return { text: "Open Documents to review delegate submissions, open their Google Docs, and submit a resolution to Approval. The website tracks the workflow; edits to resolution text happen in Google Docs.", href: "/chair/documents", linkLabel: "Open Documents" };
    if (/amend/.test(q)) return { text: "Open Amendments to review submissions, accept one for debate, and record its outcome. If it passes, update the working Google Doc by hand.", href: "/chair/amendments", linkLabel: "Open Amendments" };
    if (/point|poi|speaker|speech|debate|queue|timer/.test(q)) return { text: "The Debate page has the speaker queue, points of information, timer, and speech scoring controls.", href: "/chair", linkLabel: "Open Debate" };
    if (/participation|score|scoring|points/.test(q)) return { text: "Open Participation to review recorded participation. Speech and POI points are recorded from the Debate workflow using the conference’s configured values.", href: "/chair/participation", linkLabel: "Open Participation" };
    if (/award/.test(q)) return { text: "Award discussion remains a Chair decision. The website provides participation context, but doesn’t rank delegates or choose winners.", href: "/chair/awards", linkLabel: "Open Award discussion" };
    if (/photo|group/.test(q)) return { text: "Your committee’s group-photo slots and reminders are on the Group photos page.", href: "/chair/photos", linkLabel: "Open Group photos" };
  }
  if (role === "approval" && /review|approve|resolution|document|comment/.test(q)) return { text: "In the Review inbox, start review for a new submission, inspect the latest version, then approve it or request changes. A request for changes needs a comment for the Chair; approval sends it to the print queue.", href: "/approval", linkLabel: "Open Review inbox" };
  if (role === "approval" && /print|printed|printing/.test(q)) return { text: "After you approve a resolution, it moves to the Admins’ print queue. Admins prepare the copies and click Mark printed; that updates the workflow so the Chair can open debate.", href: "/approval", linkLabel: "Back to Review inbox" };
  if (role === "logistics" && /print|printing|copies|resolution|document|approved/.test(q)) return { text: "Only approved versions enter the print queue. Prepare the listed copies, then use Mark printed to let the Chair know they’re ready.", href: "/logistics", linkLabel: "Open print queue" };
  if (role === "admin") {
    if (/access code|code|password|rotate|revoke/.test(q)) return { text: "Executive → Access codes lets you create, rotate, or revoke staff access codes. Treat each code like a password and hand it over privately.", href: "/admin/access-codes", linkLabel: "Open Access codes" };
    if (/session|schedule|time slot/.test(q)) return { text: "Executive → Sessions is where you schedule conference sessions across committees.", href: "/admin/sessions", linkLabel: "Open Sessions" };
    if (/committee/.test(q)) return { text: "Executive → Committees is where you configure rooms and committee details. Archiving a committee cancels its Chair codes and devices, so use that carefully.", href: "/admin/committees", linkLabel: "Open Committees" };
    if (/delegate/.test(q)) return { text: "Executive → Delegates is where you import and check delegation records.", href: "/admin/delegates", linkLabel: "Open Delegates" };
    if (/audit/.test(q)) return { text: "The Audit log records conference workflow changes. Open it from the Executive workspace.", href: "/admin/audit", linkLabel: "Open Audit log" };
    if (/school/.test(q)) return { text: "Executive → Schools is where you manage school records associated with delegates.", href: "/admin/schools", linkLabel: "Open Schools" };
    if (/photo|group/.test(q)) return { text: "Executive → Group photos is where you set up school photo times and locations. Chairs see reminders for their committees.", href: "/admin/photos", linkLabel: "Open Group photos" };
    if (/staff|chair contact/.test(q)) return { text: "Executive → Chairs & staff is where you manage staff assignments and Chair contact details.", href: "/admin/staff", linkLabel: "Open Chairs & staff" };
    if (/resolution link|submission link|resolution qr|submission qr/.test(q)) return { text: "Executive → Resolution links manages the QR links delegates use to submit their Google Doc resolutions.", href: "/admin/submissions", linkLabel: "Open Resolution links" };
    if (/drive|resource/.test(q)) return { text: "Executive → Resources & Drive explains the current service connections and archive plans.", href: "/admin/resources", linkLabel: "Open Resources & Drive" };
    if (/amendment link|amendment qr|qr.*amend/.test(q)) return { text: "Executive → Amendment links manages the QR links delegates use to submit amendments during debate.", href: "/admin/amendment-links", linkLabel: "Open Amendment links" };
  }
  const friendly = ["Hmm, my whiskers don’t know that one yet! I can still help you find a page or check a conference hand-off. What are you trying to do?", "I’m not sure about that one, but I’m still here for you 🦁 Want me to point you to something in your workspace?", "That’s outside my little lion knowledge for now. I can help you navigate the website or walk through its documented steps!"];
  return { text: friendly[Math.floor(Math.random() * friendly.length)] };
}

function LeoAvatar({ speaking = false, small = false }: { speaking?: boolean; small?: boolean }) {
  return <span className={`leo-avatar ${small ? "leo-avatar-small" : ""} ${speaking ? "is-speaking" : ""}`} aria-hidden="true">
    <Image src="/leo1.png" alt="" width={small ? 30 : 42} height={small ? 30 : 42} className="leo-frame leo-frame-one" />
    <Image src="/leo2.png" alt="" width={small ? 30 : 42} height={small ? 30 : 42} className="leo-frame leo-frame-two" />
  </span>;
}

function Typewriter({ text, onComplete }: { text: string; onComplete: () => void }) {
  const [visible, setVisible] = useState("");
  useEffect(() => {
    let count = 0;
    const timer = window.setInterval(() => {
      count += 1;
      setVisible(text.slice(0, count));
      if (count >= text.length) { window.clearInterval(timer); onComplete(); }
    }, 19);
    return () => window.clearInterval(timer);
  }, [text, onComplete]);
  return <>{visible}</>;
}

function AnimatedReply({ message, onComplete }: { message: Message; onComplete: (id: number) => void }) {
  const finish = useCallback(() => onComplete(message.id), [message.id, onComplete]);
  return <Typewriter text={message.text} onComplete={finish} />;
}

export function LeoHelper({ role, committeeId, committee, session, documents, amendments }: {
  role: Role; committeeId?: string; committee?: string; session?: string; documents: Resolution[]; amendments: Amendment[];
}) {
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [talking, setTalking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const nextId = useRef(0);
  const replyTimer = useRef<number | undefined>(undefined);
  const scope = role === "chair" ? `${role}:${committeeId || "unassigned"}` : role;
  const storageKey = `leo-chat-v2:${scope}`;
  const legacyChatKey = role === "chair" ? `leo-chair-chat-v1:${committeeId || "unassigned"}` : undefined;
  const remindersKey = `leo-reminders-seen-v1:${scope}`;
  const reminders = getReminders(role, documents, amendments);
  const reminderFingerprint = JSON.stringify(reminders.map(item => `${item.text}|${item.href}`).sort());

  const finishReply = useCallback((id: number) => {
    setMessages(old => old.map(item => item.id === id ? { ...item, animate: false } : item));
    setTalking(false);
  }, []);

  const deliverReminders = useCallback(() => {
    if (!reminders.length) return;
    try { window.localStorage.setItem(remindersKey, reminderFingerprint); } catch { /* The reminder can still be read in this open chat. */ }
    setUnread(0);
    setThinking(true);
    replyTimer.current = window.setTimeout(() => {
      const first = reminders[0];
      setThinking(false);
      setTalking(true);
      setMessages(old => [...old, { id: nextId.current++, from: "leo", text: `Quick heads-up from your ${roleNames[role]} workspace: ${reminders.map((item, i) => `${i + 1}. ${item.text}`).join(" ")}`, href: first.href, linkLabel: first.linkLabel, animate: true }].slice(-60));
    }, 500);
  }, [reminderFingerprint, remindersKey, reminders, role]);

  useEffect(() => {
    setHydrated(false);
    try {
      const saved = window.localStorage.getItem(storageKey) ?? (legacyChatKey ? window.localStorage.getItem(legacyChatKey) : null);
      const parsed: unknown = saved ? JSON.parse(saved) : [];
      const restored = Array.isArray(parsed) ? parsed.filter((item): item is Message => item && typeof item === "object" && (item.from === "leo" || item.from === "you") && typeof item.text === "string" && typeof item.id === "number").slice(-60).map(item => ({ ...item, animate: false, href: item.href && validLinks.has(item.href) ? item.href : undefined })) : [];
      setMessages(restored);
      nextId.current = restored.reduce((highest, message) => Math.max(highest, message.id + 1), 0);
      const seen = window.localStorage.getItem(remindersKey);
      setUnread(seen === reminderFingerprint ? 0 : reminders.length);
    } catch { setMessages([]); setUnread(0); }
    setHydrated(true);
    return () => { if (replyTimer.current !== undefined) window.clearTimeout(replyTimer.current); };
  }, [storageKey, legacyChatKey, remindersKey, reminderFingerprint, reminders.length]);

  useEffect(() => {
    if (!hydrated) return;
    try { window.localStorage.setItem(storageKey, JSON.stringify(messages.slice(-60))); } catch { /* Chat still works for this page if local storage is unavailable. */ }
  }, [hydrated, messages, storageKey]);

  useEffect(() => { if (open) scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }); }, [messages, open, thinking]);

  useEffect(() => {
    if (open && hydrated && unread > 0 && !thinking && !talking) deliverReminders();
  }, [deliverReminders, hydrated, open, thinking, talking, unread]);

  function toggle() {
    setOpen(value => !value);
  }

  function ask(text: string) {
    const clean = text.trim();
    if (!clean || thinking || talking) return;
    setMessages(old => [...old, { id: nextId.current++, from: "you", text: clean }].slice(-60));
    setInput("");
    setThinking(true);
    const reply = answer(clean, role, reminders);
    replyTimer.current = window.setTimeout(() => {
      setThinking(false);
      setTalking(true);
      setMessages(old => [...old, { id: nextId.current++, from: "leo", ...reply, animate: true }].slice(-60));
    }, 500);
  }

  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); ask(input); }
  const contextLine = role === "chair" ? `${committee ?? "Your committee"}${session ? ` · ${session}` : ""}` : roleNames[role];

  return <>
    {open && <section className="leo-chat" aria-label={`Leo ${roleNames[role]} helper`} aria-modal="false" role="dialog">
      <header className="leo-chat-head">
        <LeoAvatar />
        <div><strong>Leo · {roleNames[role]} helper</strong><small>{contextLine}</small></div>
        <button type="button" className="leo-close" onClick={() => setOpen(false)} aria-label="Close Leo helper">×</button>
      </header>
      <div className="leo-messages" ref={scrollRef} aria-live="polite">
        <div className="leo-message-row"><LeoAvatar small /><div className="leo-message leo-message-bot"><span>It’s me, Leo! I’m your digital assistant, now living on this website. I can help you find where to do something, guide you through the documented {roleNames[role]} workflows, and spot hand-offs that may need your attention. 🦁</span><small className="leo-context">Checking in with {contextLine}</small></div></div>
        {messages.map(message => <div key={message.id} className={`leo-message-row ${message.from === "you" ? "leo-message-row-user" : ""}`}>
          {message.from === "leo" && <LeoAvatar small speaking={talking && !!message.animate} />}
          <div className={`leo-message ${message.from === "you" ? "leo-message-user" : "leo-message-bot"}`}>
            {message.from === "leo" && message.animate ? <AnimatedReply message={message} onComplete={finishReply} /> : message.text}
            {message.href && <Link href={message.href} onClick={() => setOpen(false)}>{message.linkLabel} →</Link>}
          </div>
        </div>)}
        {thinking && <div className="leo-message-row"><LeoAvatar small /><div className="leo-message leo-message-bot leo-thinking" aria-label="Leo is thinking"><i /><i /><i /></div></div>}
        {!messages.length && !thinking && <div className="leo-suggestions">{suggestions.map(item => <button type="button" key={item} onClick={() => ask(item)}>{item}</button>)}</div>}
      </div>
      <form className="leo-input-row" onSubmit={submit}>
        <label className="sr-only" htmlFor="leo-question">Ask Leo</label>
        <input id="leo-question" value={input} onChange={event => setInput(event.target.value)} placeholder="Ask me anything…" maxLength={400} />
        <button type="submit" aria-label="Send question" disabled={!input.trim() || thinking || talking}>Send</button>
      </form>
      <p className="leo-note">Still stuck? Message the Executive · Brought to you by JP 🦁</p>
    </section>}
    <button type="button" className="leo-launcher" onClick={toggle} aria-label={open ? "Close Leo helper" : `Open Leo ${roleNames[role]} helper`} aria-expanded={open}>
      <Image src="/leo1.png" alt="" width={54} height={54} />
      {!open && unread > 0 && <span className="leo-unread" aria-label={`${unread} new workflow reminders`}>{unread > 9 ? "9+" : unread}</span>}
    </button>
  </>;
}
