/* eslint-disable @next/next/no-img-element -- Local preview uploads use data URLs with unknown dimensions. */
import { Fragment, type ReactNode } from 'react';
import { safeImage, safeLink, type RichNode } from '@/lib/blog';

function renderNode(node: RichNode, index: number): ReactNode {
  const children = node.content?.map(renderNode);
  if (node.type === 'text') {
    let text: ReactNode = node.text;
    for (const mark of node.marks || []) {
      if (mark.type === 'bold') text = <strong>{text}</strong>;
      if (mark.type === 'italic') text = <em>{text}</em>;
      if (mark.type === 'strike') text = <s>{text}</s>;
      if (mark.type === 'underline') text = <u>{text}</u>;
      if (mark.type === 'code') text = <code>{text}</code>;
      if (mark.type === 'link') {
        const href = safeLink(mark.attrs?.href);
        if (href)
          text = (
            <a href={href} target="_blank" rel="noopener noreferrer">
              {text}
            </a>
          );
      }
    }
    return <Fragment key={index}>{text}</Fragment>;
  }
  switch (node.type) {
    case 'doc':
      return <Fragment key={index}>{children}</Fragment>;
    case 'paragraph':
      return <p key={index}>{children?.length ? children : <br />}</p>;
    case 'heading':
      return Number(node.attrs?.level) === 3 ? (
        <h3 key={index}>{children}</h3>
      ) : (
        <h2 key={index}>{children}</h2>
      );
    case 'bulletList':
      return <ul key={index}>{children}</ul>;
    case 'orderedList':
      return (
        <ol
          key={index}
          start={
            typeof node.attrs?.start === 'number' ? node.attrs.start : undefined
          }
        >
          {children}
        </ol>
      );
    case 'listItem':
      return <li key={index}>{children}</li>;
    case 'blockquote':
      return <blockquote key={index}>{children}</blockquote>;
    case 'hardBreak':
      return <br key={index} />;
    case 'horizontalRule':
      return <hr key={index} />;
    case 'codeBlock':
      return (
        <pre key={index}>
          <code>{children}</code>
        </pre>
      );
    case 'image': {
      const src = safeImage(node.attrs?.src);
      if (!src) return null;
      return (
        <figure key={index}>
          {/* User uploads have intrinsic dimensions only after the image loads. */}
          <img
            src={src}
            alt={typeof node.attrs?.alt === 'string' ? node.attrs.alt : ''}
            loading="lazy"
          />
          {typeof node.attrs?.title === 'string' && node.attrs.title && (
            <figcaption>{node.attrs.title}</figcaption>
          )}
        </figure>
      );
    }
    default:
      return null;
  }
}
export function RichContent({ document }: { document: RichNode }) {
  return <div className="rich-content">{renderNode(document, 0)}</div>;
}
