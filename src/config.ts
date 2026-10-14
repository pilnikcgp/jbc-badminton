// Všechny texty stránky na jednom místě. Upravte a nasaďte znovu.
// Rok v nadpisu hero se bere z databáze (tabulka editions).

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
  },

  /**
   * Horní menu připnuté při scrollování. `href` je id sekce v index.html.
   * Tlačítko (cta) zůstává viditelné i na mobilu, odkazy se tam schovají
   * do hamburger menu.
   */
  nav: {
    brand: 'JIC Badminton Cup',
    label: 'Hlavní menu',
    menuOpen: 'Otevřít menu',
    menuClose: 'Zavřít menu',
    /** Tlačítko je v menu první, odkazy následují v pořadí sekcí na stránce. */
    cta: { label: 'Registrace', href: '#registrace' },
    links: [
      { label: 'FAQs', href: '#caste-otazky' },
      { label: 'Fotogalerie', href: '#galerie' },
      { label: 'Síň slávy', href: '#historie' },
    ],
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

  /**
   * Časová osa pod hero. `intro` je krátký perex nad ní. `current` je id
   * aktuálního kroku; kroky před ním se zobrazí jako hotové, kroky za ním
   * jako budoucí. `detail` (např. datum, místo, formát) se zobrazí pod názvem
   * kroku, jen když je vyplněný; prázdný '' se nezobrazí.
   */
  timeline: {
    heading: 'Harmonogram',
    intro:
      'Šestý ročník desítkami JICáků oblíbeného klání v honbě za opeřeným nesmyslem je zde. Propotíme triko a pak doplníme ionty u piva.',
    steps: [
      {
        id: 'registration',
        label: 'Přihlašování',
        detail: 'Do 18.12.2026',
        /** Tlačítko u aktuálního kroku (nepovinné). */
        cta: { label: 'Přihlásit se', href: '#registrace' },
      },
      { id: 'date', label: 'Výběr termínu', detail: '' },
      { id: 'format', label: 'Výběr formátu turnaje', detail: '' },
      { id: 'tournament', label: 'Turnaj', detail: '' },
    ] as { id: string; label: string; detail?: string; cta?: { label: string; href: string } }[],
    current: 'registration',
    /** Štítek u aktuálního kroku, který nemá vlastní tlačítko (cta). */
    currentBadge: 'Právě teď',
  },

  registration: {
    heading: 'Registrace',
    intro: 'Přihlašování končí 18. prosince 2026.',
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
      { value: 'none', label: 'Nepopsaný list', hint: 'Badminton jsem nikdy nehrál/a.' },
      { value: 'beginner', label: 'Začátečnická', hint: 'Raketu jsem držel/a párkrát v ruce.' },
      { value: 'intermediate', label: 'Středně pokročilá', hint: 'Jdu si zahrát párkrát do roka.' },
      { value: 'advanced', label: 'Pokročilá', hint: 'Hraji pravidelně.' },
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
      {
        question: 'Kolik mne účast na turnaji bude stát?',
        answer: [
          'Možná pár modřin a bolavých končetin z tréninků. ;-) Pronájem kurtů a ceny pro vítěze hradí JIC. Děkujeme!',
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
