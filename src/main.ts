import './styles.css';
import { site } from './config';
import { fetchCurrentEdition, type Edition } from './lib/api';
import { initAbout, initFooter, initHero } from './sections/hero';
import { initRegistration } from './sections/registration';
import { initGallery } from './sections/gallery';
import { initHistory } from './sections/history';
import { initTimeline } from './sections/timeline';
import { initFaq } from './sections/faq';
import { initNav } from './sections/nav';

document.title = site.name;

const section = (id: string) => document.getElementById(id)!;

// Sekce nezávislé na ročníku se načítají hned.
initNav(document.getElementById('menu')!);
initFooter(document.getElementById('paticka')!);
initTimeline(section('harmonogram'));
initFaq(section('caste-otazky'));
initGallery(section('galerie'));
initHistory(section('historie'));

let edition: Edition | null = null;
try {
  edition = await fetchCurrentEdition();
} catch (err) {
  console.error('Nepodařilo se načíst aktuální ročník', err);
}

initHero(section('uvod'), edition);
initAbout(section('o-turnaji'), edition);
initRegistration(section('registrace'), edition);
