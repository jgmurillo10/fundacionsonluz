import React from 'react';
import config from '../../config';
export default function Footer() {
  return (
    <footer id="footer">
      <ul className="icons">
        {config.socialLinks.map(social => {
          const { style, icon, name, url } = social;
          return (
            <li key={url}>
              <a href={url} className={`icon ${style} ${icon}`}>
                <span className="label">{name}</span>
              </a>
            </li>
          );
        })}
      </ul>
      <ul className="copyright">
        <li>&copy; Fundación Son Luz</li>
        <li><a to="mailto:FundacionSonLuz@gmail.com">FundacionSonLuz@gmail.com</a></li>
      </ul>
      <ul className="copyright">
        <li>Cuenta de ahorros Bancolombia</li>
        <li>#411-000002-42</li>
      </ul>
      <ul className="copyright">
        <li>Desarrollado con ❤️ por <a target="_blank" href="https://juanmurillo.co/">Juan Murillo</a></li>
      </ul>
    </footer>
  );
}
