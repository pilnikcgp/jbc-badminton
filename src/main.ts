import './styles.css';
import { site } from './config';
import { initHistory } from './sections/history';

document.title = `${site.name} – badmintonový turnaj`;

const section = (id: string) => document.getElementById(id)!;

initHistory(section('historie'));
