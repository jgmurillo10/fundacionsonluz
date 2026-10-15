'use client';
import { EditorContent, useEditor, useEditorState } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TiptapImage from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import { useRef, useState } from 'react';
import {
  Bold,
  Italic,
  Underline,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Link as LinkIcon,
  ImagePlus,
  Undo2,
  Redo2,
  Unlink,
  X,
} from 'lucide-react';
import { safeLink, type RichNode } from '@/lib/blog';
import { prepareEditorialImage } from '@/lib/editor-client';
import { useRemoteEditor } from './editor-context';

export function RichEditor({
  initial,
  onChange,
}: {
  initial: RichNode;
  onChange: (document: RichNode) => void;
}) {
  const remote = useRemoteEditor();
  const [message, setMessage] = useState('');
  const [imageAlt, setImageAlt] = useState('');
  const [link, setLink] = useState('');
  const [busy, setBusy] = useState(false);
  const [kind, setKind] = useState<'image' | 'link' | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        link: { openOnClick: false, protocols: ['http', 'https', 'mailto'] },
      }),
      TiptapImage.configure({ allowBase64: true }),
      Placeholder.configure({
        placeholder: 'Toda historia empieza aquí. Escribe la tuya…',
      }),
    ],
    content: initial,
    editorProps: {
      attributes: {
        class: 'rich-content tiptap-body',
        role: 'textbox',
        'aria-label': 'Contenido de la entrada',
        'aria-multiline': 'true',
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getJSON() as RichNode),
  });
  const state = useEditorState({
    editor,
    selector: ({ editor }) =>
      editor
        ? {
            bold: editor.isActive('bold'),
            italic: editor.isActive('italic'),
            underline: editor.isActive('underline'),
            h2: editor.isActive('heading', { level: 2 }),
            h3: editor.isActive('heading', { level: 3 }),
            bullet: editor.isActive('bulletList'),
            ordered: editor.isActive('orderedList'),
            quote: editor.isActive('blockquote'),
            link: editor.isActive('link'),
            undo: editor.can().undo(),
            redo: editor.can().redo(),
          }
        : null,
  });
  function open(type: 'image' | 'link') {
    setKind(type);
    setMessage('');
    setLink(editor?.getAttributes('link').href || '');
    setImageAlt('');
    dialog.current?.showModal();
  }
  function close() {
    dialog.current?.close();
    setKind(null);
    editor?.commands.focus();
  }
  async function addImage(file?: File) {
    if (!file || !editor) return;
    if (!imageAlt.trim()) {
      setMessage('Escribe una descripción de la imagen primero.');
      return;
    }
    setBusy(true);
    try {
      const src = await prepareEditorialImage(file, remote);
      editor.chain().focus().setImage({ src, alt: imageAlt.trim() }).run();
      close();
    } catch (e) {
      setMessage(
        e instanceof Error ? e.message : 'No pudimos añadir la imagen.'
      );
    } finally {
      setBusy(false);
    }
  }
  function addLink() {
    const href = safeLink(link.trim());
    if (!href) {
      setMessage(
        'Usa un enlace completo que empiece por https://, http:// o mailto:.'
      );
      return;
    }
    editor?.chain().focus().extendMarkRange('link').setLink({ href }).run();
    close();
  }
  const tools = [
    {
      label: 'Negrita',
      icon: Bold,
      active: state?.bold,
      action: () => editor?.chain().focus().toggleBold().run(),
    },
    {
      label: 'Cursiva',
      icon: Italic,
      active: state?.italic,
      action: () => editor?.chain().focus().toggleItalic().run(),
    },
    {
      label: 'Subrayado',
      icon: Underline,
      active: state?.underline,
      action: () => editor?.chain().focus().toggleUnderline().run(),
    },
    {
      label: 'Título de sección',
      icon: Heading2,
      active: state?.h2,
      action: () => editor?.chain().focus().toggleHeading({ level: 2 }).run(),
    },
    {
      label: 'Subtítulo',
      icon: Heading3,
      active: state?.h3,
      action: () => editor?.chain().focus().toggleHeading({ level: 3 }).run(),
    },
    {
      label: 'Lista con viñetas',
      icon: List,
      active: state?.bullet,
      action: () => editor?.chain().focus().toggleBulletList().run(),
    },
    {
      label: 'Lista numerada',
      icon: ListOrdered,
      active: state?.ordered,
      action: () => editor?.chain().focus().toggleOrderedList().run(),
    },
    {
      label: 'Cita',
      icon: Quote,
      active: state?.quote,
      action: () => editor?.chain().focus().toggleBlockquote().run(),
    },
  ];
  return (
    <div className="rich-editor">
      <div
        className="editor-toolbar"
        role="group"
        aria-label="Formato del contenido"
      >
        {tools.map((tool) => (
          <button
            type="button"
            key={tool.label}
            title={tool.label}
            aria-label={tool.label}
            aria-pressed={!!tool.active}
            onClick={tool.action}
            disabled={!editor}
          >
            <tool.icon size={17} />
          </button>
        ))}
        <span className="toolbar-divider" />
        <button
          type="button"
          title="Añadir enlace"
          aria-label="Añadir enlace"
          aria-pressed={!!state?.link}
          onClick={() => open('link')}
          disabled={!editor}
        >
          <LinkIcon size={17} />
        </button>
        <button
          type="button"
          title="Quitar enlace"
          aria-label="Quitar enlace"
          onClick={() => editor?.chain().focus().unsetLink().run()}
          disabled={!state?.link}
        >
          <Unlink size={17} />
        </button>
        <button
          type="button"
          title="Añadir imagen"
          aria-label="Añadir imagen"
          onClick={() => open('image')}
          disabled={!editor}
        >
          <ImagePlus size={17} />
        </button>
        <span className="toolbar-divider" />
        <button
          type="button"
          title="Deshacer"
          aria-label="Deshacer"
          onClick={() => editor?.chain().focus().undo().run()}
          disabled={!state?.undo}
        >
          <Undo2 size={17} />
        </button>
        <button
          type="button"
          title="Rehacer"
          aria-label="Rehacer"
          onClick={() => editor?.chain().focus().redo().run()}
          disabled={!state?.redo}
        >
          <Redo2 size={17} />
        </button>
      </div>
      <EditorContent editor={editor} />
      <dialog ref={dialog} className="editor-dialog" onCancel={close}>
        <button
          className="dialog-close"
          type="button"
          onClick={close}
          aria-label="Cerrar"
        >
          <X size={19} />
        </button>
        <span className="eyebrow">Dale forma a tu historia</span>
        <h2>{kind === 'image' ? 'Añadir una imagen' : 'Añadir un enlace'}</h2>
        {kind === 'image' ? (
          <>
            <p>
              Describe lo que aparece en la imagen para que todas las personas
              puedan disfrutar la historia.
            </p>
            <label>
              Descripción de la imagen
              <input
                autoFocus
                value={imageAlt}
                onChange={(e) => setImageAlt(e.target.value)}
                maxLength={250}
                placeholder="Ej. Participantes en un taller de la fundación"
              />
            </label>
            <label className="file-picker">
              {busy ? 'Preparando imagen…' : 'Seleccionar JPG, PNG o WebP'}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={busy || !imageAlt.trim()}
                onChange={(e) => {
                  void addImage(e.target.files?.[0]);
                  e.currentTarget.value = '';
                }}
              />
            </label>
            <p className="form-note">
              Hasta 10 MB. La imagen se ajustará automáticamente.
            </p>
          </>
        ) : (
          <>
            <p>Selecciona primero el texto al que quieres añadir el enlace.</p>
            <label>
              Dirección del enlace
              <input
                autoFocus
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder="https://…"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addLink();
                  }
                }}
              />
            </label>
            <button
              type="button"
              className="button button-green"
              onClick={addLink}
            >
              Añadir enlace
            </button>
          </>
        )}
        {message && (
          <p className="form-message form-error" role="alert">
            {message}
          </p>
        )}
      </dialog>
    </div>
  );
}
