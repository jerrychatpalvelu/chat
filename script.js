/* =========================================================
   PREMIUM CHATBOT SCRIPT (CLEAN, MEKONOMEN THEME)
   Ominaisuudet (EI yhtään vähempää):
   - Header status badge (Avoinna/Suljettu) + päivitys
   - Welcome-viesti avattaessa (1x/avaus)
   - Quick replies (PYSYY aina, ei katoa)
   - Typing-efekti + viive
   - Fade-in viesteihin
   - CTA-napit botin viesteihin (varaa, soita, email)
   - Aukiolo-intentit + ajanvaraus-intentit
   - Smart FAQ match: normalisointi + kevyt stemmaus + pisteytys
   ========================================================= */

// ==============================
// PERUS ELEMENTIT
// ==============================
const chatButton = document.getElementById("chat-button");
const chatbox = document.getElementById("chatbox");
const closeChat = document.getElementById("close-chat");
const userInput = document.querySelector("#chat-input input");
const sendButton = document.querySelector("#chat-input button");
const messages = document.getElementById("chat-messages");
const chatIntro = document.getElementById("chat-intro");
const chatStatus = document.getElementById("chat-status");

// ==============================
// ASIAKASKOHTAISET ASETUKSET
// ==============================
const SETTINGS = {
  businessName: "Mekonomen Autohuolto",
  bookingUrl: "https://www.mekonomen.fi/ajanvaraus-mekonomen-autohuolto/",
  phone: "044195598",
  email: "hanko@mekonomen.fi",

  // Aukiolo (demo): ma–pe 8–17
  openHour: 8,
  closeHour: 17,

  // Intro + Welcome
  introText: "Kysy yleisimpiä huoltoon liittyviä kysymyksiä tai varaa aika yhdellä klikkauksella.",
  welcomeText: "Hei! 👋 Olen automaattinen apuri. Valitse pikakysymys tai kirjoita vapaasti — autan heti. 😊"
};

// (valinnainen) tel-linkin parannus: 044xxxx -> +35844xxxx
function formatPhoneForTel(phone) {
  const p = (phone || "").trim();
  if (!p) return p;
  if (p.startsWith("0")) return "+358" + p.slice(1);
  return p;
}

const BOOKING_URL = SETTINGS.bookingUrl;
const PHONE = formatPhoneForTel(SETTINGS.phone);
const EMAIL = SETTINGS.email;

const OPEN_HOUR = SETTINGS.openHour;
const CLOSE_HOUR = SETTINGS.closeHour;

// ==============================
// QUICK REPLIES (PYSYY aina näkyvissä)
// ==============================
const quickReplies = document.createElement("div");
quickReplies.className = "quick-replies";

// (Pro) Tekstit muotoillaan niin että osuu varmasti intent/FAQ:iin
const presets = [
  { label: "Aukioloajat", text: "Mitkä ovat aukioloajat?" },
  { label: "Varaa huolto", text: "Haluan varata ajan huoltoon" },
  { label: "Tehdastakuu", text: "Säilyykö auton tehdastakuu Mekonomen Autohuollossa?" },
  { label: "Kustannusarvio", text: "Saanko aina kirjallisen kustannuslaskelman / kustannusarvion?" },
  { label: "Huolto vs korjaus", text: "Mikä on huollon ja korjauksen ero?" }
];

presets.forEach(p => {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.textContent = p.label;
  btn.onclick = () => handleUserMessage(p.text);
  quickReplies.appendChild(btn);
});

if (messages) messages.before(quickReplies);

// ==============================
// NORMALISOINTI + kevyt FI-stemmaus
// ==============================
function normalizeText(s) {
  return (s || "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stemFi(word) {
  let w = word;

  const suffixes = [
    "ssa","ssä","sta","stä","lla","llä","lta","ltä",
    "lle","na","nä","ksi","tta","ttä",
    "aan","een","iin","oon","uun","yyn",
    "an","en","in","on","un","yn",
    "n","t",
    "ta","tä","a","ä"
  ];

  for (const s of suffixes) {
    if (w.length > 4 && w.endsWith(s)) {
      w = w.slice(0, -s.length);
      break;
    }
  }
  return w;
}

function tokenizeFi(text) {
  const clean = normalizeText(text);
  const tokens = clean.split(" ").filter(Boolean).map(stemFi);
  return tokens.filter(t => t.length >= 2);
}

function tokenWeight(token) {
  if (token.length >= 10) return 4;
  if (token.length >= 7) return 3;
  if (token.length >= 4) return 2;
  return 1;
}

// ==============================
// FAQ (Mekonomen Hangon sisältö)
// ==============================
const faq = [
  {
    // estetään sekoitus takuukorjaukseen
    mustNot: ["takuukorjaus"],
    keywords: [
      "säilyykö auton tehdastakuu",
      "säilyykö auton takuu",
      "säilyykö takuu",
      "tehdastakuu",
      "uuden auton takuu",
      "takuu säilyy",
      "auton takuu",
      "takuu mekonomenilla"
    ],
    answer:
      "Kyllä, auton tehdastakuu säilyy. Mekonomen Autohuollossa huollamme ja korjaamme kaiken merkkisiä autoja, uusia ja vanhoja. Käytämme alkuperäisiä tai vastaavanlaatuisia varaosia ja noudatamme autonvalmistajan huoltosuosituksia, joten myös uuden autosi takuu säilyy. Huoltokirja leimataan Mekonomen Autohuolto -leimalla, ja lisäksi saat vähintään 3 vuoden takuun varaosille.",
    actions: [
      { type: "link", label: "Varaa huolto", href: BOOKING_URL },
      { type: "tel", label: "Soita", href: `tel:${PHONE}` }
    ]
  },
  {
    mustNot: ["tehdastakuu"],
    keywords: [
      "mikä on auton takuukorjaus",
      "takuukorjaus",
      "auton takuukorjaus",
      "takuuna",
      "takuuaikana",
      "takuuaika"
    ],
    answer:
      "Auton jälleenmyyjällä on velvollisuus hoitaa auton takuukorjaukset, jotka tulevat esille auton takuuaikana. Merkkihuollot vastaavat takuukorjauksista ja niihin heillä on yksinoikeus.",
    actions: [
      { type: "tel", label: "Soita", href: `tel:${PHONE}` },
      { type: "email", label: "Sähköposti", href: `mailto:${EMAIL}` }
    ]
  },
  {
    keywords: [
      "huollon ja korjauksen ero",
      "mikä on huollon ja korjauksen ero",
      "huolto ja korjaus ero",
      "huolto vai korjaus"
    ],
    answer:
      "Huollossa auton kunto ja toimintakyky ylläpidetään huoltotoimenpiteillä. Korjauksen ollessa kyseessä autossa korjataan vika, vaurio tai jokin, joka ei enää toimi.",
    actions: [
      { type: "link", label: "Varaa huolto", href: BOOKING_URL }
    ]
  },
  {
    keywords: [
      "saanko leiman huoltokirjaani",
      "leima huoltokirjaan",
      "huoltokirja leima",
      "huoltokirjan leimaus",
      "huoltokirja",
      "leimaatteko huoltokirjan"
    ],
    answer:
      "Totta kai. Saat leiman huoltokirjaan, kunhan huolehdit että huoltokirja on saatavilla jättäessäsi auton huoltoon.",
    actions: [
      { type: "link", label: "Varaa huolto", href: BOOKING_URL }
    ]
  },
  {
    keywords: [
      "mikä on varaosa",
      "varaosa",
      "varaosan määritelmä",
      "eu varaosa"
    ],
    answer:
      "EU on määrittänyt varaosan olevan tuote tai komponentti (laadultaan sama kuin alkuperäinen), joka asennetaan moottoriajoneuvoon korvaamaan alkuperäistä ja joka on välttämätön käytön kannalta (polttoainetta lukuun ottamatta).",
    actions: [
      { type: "email", label: "Kysy varaosista", href: `mailto:${EMAIL}` }
    ]
  },
  {
    keywords: [
      "saanko aina kirjallisen tarjouslaskelman",
      "kirjallinen tarjous",
      "tarjouslaskelma",
      "kustannuslaskelma",
      "kustannusarvio",
      "kustannusarvion",
      "hinta arvio",
      "hinta-arvio",
      "tarjous",
      "arvio"
    ],
    answer:
      "Kyllä. Annamme kirjallisen kustannuslaskelman korjaukselle AUNE-ehtojen mukaisesti ennen työn aloittamista.",
    actions: [
      { type: "email", label: "Pyydä tarjous", href: `mailto:${EMAIL}?subject=Tarjouspyyntö` },
      { type: "tel", label: "Soita", href: `tel:${PHONE}` }
    ]
  }
];

// ==============================
// STATUS + INTRO
// ==============================
function getOpenStatus() {
  const now = new Date();
  const day = now.getDay(); // 0 su ... 6 la
  const hour = now.getHours();
  const minute = now.getMinutes();

  const isWeekday = day >= 1 && day <= 5;
  const afterOpen = hour > OPEN_HOUR || (hour === OPEN_HOUR && minute >= 0);
  const beforeClose = hour < CLOSE_HOUR;

  const open = isWeekday && afterOpen && beforeClose;
  return { open };
}

function updateOpenStatusBadge() {
  if (chatIntro) chatIntro.textContent = SETTINGS.introText;
  if (!chatStatus) return;

  const status = getOpenStatus();
  if (status.open) {
    chatStatus.textContent = "Avoinna";
    chatStatus.classList.remove("closed");
    chatStatus.classList.add("open");
  } else {
    chatStatus.textContent = "Suljettu";
    chatStatus.classList.remove("open");
    chatStatus.classList.add("closed");
  }
}

updateOpenStatusBadge();
setInterval(updateOpenStatusBadge, 60 * 1000);

// ==============================
// CHAT OPEN/CLOSE
// ==============================
let welcomeShownThisOpen = false;

if (chatButton && chatbox) {
  chatButton.onclick = () => {
    const wasHidden = chatbox.classList.contains("hidden");
    chatbox.classList.toggle("hidden");

    // avattaessa: näytä welcome 1x
    if (wasHidden && !welcomeShownThisOpen) {
      addMessageBot(SETTINGS.welcomeText, [
        { type: "link", label: "Varaa aika", href: BOOKING_URL },
        { type: "tel", label: "Soita", href: `tel:${PHONE}` }
      ]);
      welcomeShownThisOpen = true;
    }
  };
}

if (closeChat && chatbox) {
  closeChat.onclick = () => {
    chatbox.classList.add("hidden");
    welcomeShownThisOpen = false;
  };
}

// ==============================
// SEND
// ==============================
if (sendButton) sendButton.onclick = sendMessage;
if (userInput) {
  userInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") sendMessage();
  });
}

function sendMessage() {
  const text = (userInput?.value || "").trim();
  if (!text) return;
  userInput.value = "";
  handleUserMessage(text);
}

// ==============================
// MAIN FLOW
// ==============================
function handleUserMessage(text) {
  addMessageText(text, "user");

  const typing = addMessageText("🤖 kirjoittaa...", "bot");
  const delay = 550 + Math.random() * 450;

  setTimeout(() => {
    if (typing && typing.parentNode === messages) messages.removeChild(typing);

    const reply = getBotReply(text);
    addMessageBot(reply.text, reply.actions);
  }, delay);
}

// ==============================
// UI: messages
// ==============================
function addMessageText(text, sender) {
  if (!messages) return null;

  const div = document.createElement("div");
  div.className = `message ${sender}`;
  div.textContent = text;
  messages.appendChild(div);

  requestAnimationFrame(() => {
    div.style.opacity = "1";
    div.style.transform = "translateY(0)";
  });

  messages.scrollTop = messages.scrollHeight;
  return div;
}

function addMessageBot(text, actions = []) {
  if (!messages) return;

  const wrapper = document.createElement("div");
  wrapper.className = "message bot";

  const p = document.createElement("div");
  p.className = "bot-text";
  p.textContent = text;
  wrapper.appendChild(p);

  if (actions && actions.length) {
    const row = document.createElement("div");
    row.className = "bot-actions";

    actions.forEach(a => {
      const el = document.createElement("a");
      el.className = "bot-action";
      el.href = a.href;
      el.target = a.type === "link" ? "_blank" : "_self";
      el.rel = a.type === "link" ? "noopener noreferrer" : "";
      el.textContent = a.label;
      row.appendChild(el);
    });

    wrapper.appendChild(row);
  }

  messages.appendChild(wrapper);

  requestAnimationFrame(() => {
    wrapper.style.opacity = "1";
    wrapper.style.transform = "translateY(0)";
  });

  messages.scrollTop = messages.scrollHeight;
}

// ==============================
// BOT LOGIC (melkein aina oikein)
// ==============================
function getBotReply(input) {
  const raw = (input || "").toLowerCase();
  const msgNorm = normalizeText(input);
  const msgTokens = tokenizeFi(input);

  // -------- INTENT: ajanvaraus/varaus --------
  if (
    msgNorm.includes("ajanvaraus") ||
    msgNorm.includes("varaan ajan") ||
    msgNorm.includes("varata aika") ||
    msgNorm.includes("varata ajan") ||
    msgNorm.includes("haluan varata") ||
    (msgNorm.includes("ajan") && msgNorm.includes("varata"))
  ) {
    return {
      text: "Tottakai! Voit varata ajan suoraan ajanvarauksesta. 😊",
      actions: [
        { type: "link", label: "Varaa aika", href: BOOKING_URL },
        { type: "tel", label: "Soita", href: `tel:${PHONE}` }
      ]
    };
  }

  // -------- INTENT: aukioloajat / avoinna --------
  if (
    msgNorm.includes("aukiolo") ||
    msgNorm.includes("aukioloajat") ||
    msgNorm.includes("milloin olette auki") ||
    msgNorm.includes("mihin aikaan olette auki") ||
    msgNorm.includes("avoinna") ||
    msgNorm.includes("auki")
  ) {
    const status = getOpenStatus();
    return {
      text: status.open
        ? `Palvelemme arkisin klo ${OPEN_HOUR}–${CLOSE_HOUR}. Olemme nyt avoinna ✅`
        : `Palvelemme arkisin klo ${OPEN_HOUR}–${CLOSE_HOUR}. Olemme nyt suljettu ❌`,
      actions: [
        { type: "tel", label: "Soita", href: `tel:${PHONE}` },
        { type: "link", label: "Varaa aika", href: BOOKING_URL }
      ]
    };
  }

  // -------- INTENT: hinta/arvio/tarjous (auttaa osumaan usein) --------
  if (
    msgNorm.includes("kustannusarvio") ||
    msgNorm.includes("hinta-arvio") ||
    msgNorm.includes("hinta arvio") ||
    msgNorm.includes("tarjous") ||
    msgNorm.includes("kustannuslaskelma")
  ) {
    // yritä vielä osua FAQ:iin, mutta jos ei, anna järkevä vastaus
    const best = smartFaqMatch(msgNorm, raw, msgTokens);
    if (best) return best;

    return {
      text: "Kyllä — voimme antaa kirjallisen kustannusarvion ennen työn aloittamista. 😊",
      actions: [
        { type: "email", label: "Pyydä tarjous", href: `mailto:${EMAIL}?subject=Tarjouspyyntö` },
        { type: "tel", label: "Soita", href: `tel:${PHONE}` }
      ]
    };
  }

  // -------- SMART FAQ MATCH --------
  const best = smartFaqMatch(msgNorm, raw, msgTokens);
  if (best) return best;

  // -------- FALLBACK --------
  return {
    text: "Hyvä kysymys! Tämä riippuu hieman tilanteesta. Haluatko varata ajan tai ottaa yhteyttä, niin autetaan heti. 😊",
    actions: [
      { type: "link", label: "Varaa aika", href: BOOKING_URL },
      { type: "tel", label: "Soita", href: `tel:${PHONE}` },
      { type: "email", label: "Sähköposti", href: `mailto:${EMAIL}` }
    ]
  };
}

// ==============================
// FAQ MATCH ENGINE (scoring)
// ==============================
function smartFaqMatch(msgNorm, raw, msgTokens) {
  let best = null;

  for (const item of faq) {
    // mustNot: estä väärät osumat
    if (item.mustNot && item.mustNot.length) {
      const blocked = item.mustNot.some(t => msgNorm.includes(normalizeText(t)));
      if (blocked) continue;
    }

    let score = 0;
    let hitCount = 0;

    for (const kw of item.keywords) {
      const kwNorm = normalizeText(kw);
      if (!kwNorm) continue;

      // fraasit
      if (kwNorm.includes(" ")) {
        if (msgNorm.includes(kwNorm)) {
          score += 14;
          hitCount++;
        }
        continue;
      }

      // token-osumat (vartaloitu)
      const kwToken = stemFi(kwNorm);
      if (!kwToken) continue;

      if (msgTokens.includes(kwToken)) {
        score += 3 * tokenWeight(kwToken);
        hitCount++;
      } else if (raw.includes(kwNorm) || msgNorm.includes(kwNorm)) {
        score += 2;
        hitCount++;
      }
    }

    if (score > 0) {
      score += Math.min(10, hitCount * 2);
    }

    // kynnys
    if (!best || score > best.score) {
      best = { item, score };
    }
  }

  if (best && best.score >= 6) {
    return { text: best.item.answer, actions: best.item.actions || [] };
  }

  return null;
}
