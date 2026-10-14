// Všechny texty stránky na jednom místě. Upravte a nasaďte znovu.
// Termín a místo se berou z databáze (tabulka editions); texty níže
// se použijí, jen dokud tam nejsou vyplněné.

export const site = {
  /** Název akce – v záložce prohlížeče a v hero. */
  name: 'JIC Badminton Cup',

  hero: {
    /** Fotka přes celou šířku, soubor v public/. Autentický moment s lidmi, ne prázdný kurt. */
    image: '/hero.jpg',
    imageAlt: 'Hráčky a hráči s raketami nad hlavou na kurtu v hale během minulého ročníku',
    /**
     * Nadpis H1 ve dvou řádcích podle manuálu sub-brandů: klíčové slovo
     * (GT America Bold) a doplněk (GT Super Display). {year} se nahradí
     * rokem aktuálního ročníku z databáze.
     */
    titleKeyword: 'JIC',
    titleRest: 'Badminton Cup {year}',
    cta: 'Přihlásit se',
  },

  footer: {
    organizer: 'Pořádá JIC',
    url: 'https://www.jic.cz',
    /**
     * Logo JIC z brand kitu (složka 02_Logo), např. '/brand/jic-logo.svg'.
     * Dokud je null, zobrazí se textový odkaz. Logo nedeformovat ani nepřebarvovat.
     */
    logo: null as string | null,
    logoAlt: 'JIC',
  },

  /** Zobrazí se, dokud v databázi není vyplněný termín / místo. */
  dateUnknown: 'Termín vybíráme',
  venueUnknown: 'Místo upřesníme',

  about: {
    heading: 'O turnaji',
    /** Odstavce úvodního textu. */
    paragraphs: [
      'Již šestý ročník desítkami JICáků oblíbeného klání v honbě za opeřeným nesmyslem je zde.',
    ],
    format: 'Formát vybíráme',
  },

  /**
   * Časová osa nad registrací. `current` je id aktuálního kroku; kroky před
   * ním se zobrazí jako hotové, kroky za ním jako budoucí. `note` (nepovinné)
   * se zobrazí pod názvem kroku, např. termín.
   */
  timeline: {
    heading: 'Harmonogram',
    steps: [
      {
        id: 'registration',
        label: 'Přihlašování',
        note: 'do 8. 1. 2027',
        /** Tlačítko u aktuálního kroku (nepovinné). */
        cta: { label: 'Přihlásit se', href: '#registrace' },
      },
      { id: 'date', label: 'Výběr termínu' },
      { id: 'format', label: 'Výběr formátu turnaje' },
      { id: 'tournament', label: 'Turnaj' },
    ],
    current: 'registration',
    /** Štítek u aktuálního kroku, který nemá vlastní tlačítko (cta). */
    currentBadge: 'Právě teď',
  },

  registration: {
    heading: 'Registrace',
    intro: 'Přihlašování končí 8. ledna 2027.',
    closed: 'Registrace je teď uzavřená.',
    notYetOpen: 'Registrace zatím není otevřená. Sledujte tuto stránku.',
    success: 'Hotovo, jste přihlášení. Těšíme se!',
    duplicate: 'Tento e-mail už je v letošním ročníku přihlášený.',
    invalid: 'Zkontrolujte prosím vyplněné údaje.',
    error: 'Registraci se nepodařilo odeslat. Zkuste to prosím znovu.',
    listHeading: 'Přihlášení',
    /** Otázka ve formuláři; hodnoty odpovídají enumu tournament_format v databázi. */
    formatQuestion: 'Preferovaný formát turnaje',
    formats: [
      { value: 'mixed_doubles', label: 'Smíšená čtyřhra' },
      { value: 'gender_doubles', label: 'Čtyřhra ženy / čtyřhra muži' },
      { value: 'mixed_singles', label: 'Smíšená dvouhra' },
      { value: 'gender_singles', label: 'Dvouhra ženy / dvouhra muži' },
    ],
    /**
     * Úroveň: povinná, NEVEŘEJNÁ (jen pro los vyrovnaných párů).
     * Hodnoty odpovídají enumu skill_level v databázi.
     */
    levelQuestion: 'Úroveň',
    levels: [
      { value: 'none', label: 'Nepopsaný list', hint: 'badminton jsem nikdy nehrál/a' },
      { value: 'beginner', label: 'Začátečník', hint: 'raketu jsem držel/a párkrát v ruce' },
      { value: 'intermediate', label: 'Středně pokročilý', hint: 'jdu si zahrát párkrát do roka' },
      { value: 'advanced', label: 'Pokročilý', hint: 'hraji pravidelně' },
    ],
    levelPrivacy: 'Nezveřejňuje se, slouží jen pro los vyrovnaných párů.',
    pollHeading: 'Průběžný výsledek ankety o formátu',
    pollEmpty: 'Zatím nikdo nehlasoval.',
    /** Když se anketa zapne, zatímco má někdo otevřený starší formulář. */
    formatNowRequired: 'Doplňte prosím ještě preferovaný formát turnaje a odešlete znovu.',
    levelNowRequired: 'Doplňte prosím ještě svou úroveň a odešlete znovu.',
    listEmpty: 'Zatím nikdo. Buďte první!',
  },

  /**
   * Časté otázky pod registrací. Každá položka = jedna otázka; odpověď může
   * mít víc odstavců. Nové otázky stačí připsat na konec seznamu.
   */
  faq: {
    heading: 'Časté otázky',
    items: [
      {
        question: 'S badmintonem začínám. Je turnaj pro mě?',
        answer: [
          'Na turnaji se běžně potkávají hráčky a hráči různých úrovní. Je nicméně fajn, abys alespoň základní zkušenost s tímto sportem měl/a. :-)',
        ],
      },
      {
        question: 'Jaký bude formát turnaje?',
        answer: [
          'Formát bude vycházet jednak z počtu přihlášených, jednak z preferencí účastníků. Při registraci zvolíš, zda tě více láká dvouhra či čtyřhra a zda jsi pro smíšenou či nesmíšenou variantu.',
          'Během uplynulých pěti ročníků se nicméně vždy hrála smíšená čtyřhra. :-) Jak to bude tentokrát?',
        ],
      },
      {
        question: 'Jak v případě čtyřhry probíhá losování párů?',
        answer: [
          'Snažíme se o to, aby byl turnaj co možná nejvyrovnanější. Proto k sobě nalosováváme zkušenější hráče s těmi méně zkušenými. Svou úroveň zadáš při registraci.',
        ],
      },
      {
        question: 'Kdy se turnaj koná?',
        answer: [
          'Turnaj obvykle probíhá v některý z únorových pátků po práci, o konkrétním termínu budeme hlasovat po uzavření přihlášek.',
        ],
      },
    ],
  },

  gallery: {
    heading: 'Fotogalerie',
  },

  history: {
    heading: 'Síň slávy',
    intro:
      'Umístění všech hráček a hráčů ve všech ročnících. Klikněte na hlavičku sloupce pro řazení, na umístění pro zobrazení páru.',
  },
} as const;
