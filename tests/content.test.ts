import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { foundation, pillars } from '../lib/content';
const normalize = (value: string) => value.replace(/\s+/g, ' ');
describe('Contenido original de Fundación Son Luz', () => {
  it('conserva íntegros el propósito, la introducción y los cuatro pilares', () => {
    const original = normalize(
      readFileSync('src/legacy-pages/index.js', 'utf8')
    );
    for (const text of [
      foundation.purpose,
      foundation.introduction,
      foundation.invitation,
      ...pillars.map((pillar) => pillar.text),
    ])
      expect(original).toContain(text);
  });
  it('conserva quienes somos, misión y visión sin alterar sus datos', () => {
    const original = normalize(
      readFileSync('src/legacy-pages/about.js', 'utf8')
    );
    for (const text of [
      foundation.about,
      foundation.mission,
      foundation.missionClosing,
      foundation.vision,
    ])
      expect(original).toContain(text);
  });
  it('mantiene el correo, la cuenta y la configuración de contacto', () => {
    expect(foundation.email).toBe('FundacionSonLuz@gmail.com');
    expect(foundation.account).toBe('411-000002-42');
    expect(foundation.bank).toBe('Bancolombia');
    const form = readFileSync('components/contact-form.tsx', 'utf8');
    for (const value of [
      'service_r0k1qry',
      'template_eyjio8e',
      'user_V0OlSoRrl1zQsDyIoIFbb',
      'from_name',
      'from_mail',
      'from_phone',
      'message',
    ])
      expect(form).toContain(value);
  });
  it('utiliza las fotografías originales sin sustituirlas', () => {
    for (const image of [
      'banner.jpg',
      'foto1.jpg',
      'foto2.jpg',
      'foto3.jpg',
      'foto4.jpg',
    ]) {
      const hash = (file: string) =>
        createHash('sha256').update(readFileSync(file)).digest('hex');
      expect(hash(`public/images/${image}`)).toBe(
        hash(`src/assets/images/${image}`)
      );
    }
  });
});
