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
      'Zástupný text: neformální interní badmintonový turnaj, na který se každý rok těšíme. Hrajeme smíšenou čtyřhru – přihlásíte se sami a páry vylosujeme.',
      'Zástupný text: nezáleží na tom, jestli hrajete pravidelně, nebo jste raketu drželi naposledy na chatě. Jde hlavně o to se potkat a zahrát si.',
    ],
    format: 'Smíšená čtyřhra, páry losem',
  },

  /**
   * Časová osa nad registrací. `current` je id aktuálního kroku; kroky před
   * ním se zobrazí jako hotové, kroky za ním jako budoucí.
   */
  timeline: {
    heading: 'Harmonogram',
    steps: [
      { id: 'registration', label: 'Přihlašování' },
      { id: 'date', label: 'Výběr termínu' },
      { id: 'format', label: 'Výběr formátu turnaje' },
      { id: 'tournament', label: 'Turnaj' },
    ],
    current: 'registration',
    currentBadge: 'Právě teď',
  },

  registration: {
    heading: 'Registrace',
    intro: 'Přihlaste se jako jednotlivec, páry vylosujeme.',
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
    pollHeading: 'Průběžný výsledek ankety o formátu',
    pollEmpty: 'Zatím nikdo nehlasoval.',
    /** Když se anketa zapne, zatímco má někdo otevřený starší formulář. */
    formatNowRequired: 'Doplňte prosím ještě preferovaný formát turnaje a odešlete znovu.',
    listEmpty: 'Zatím nikdo. Buďte první!',
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
