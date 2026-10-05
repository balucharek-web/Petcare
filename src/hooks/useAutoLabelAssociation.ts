import { useEffect } from 'react';

let autoId = 0;

/**
 * Links visual <label> elements to their form control for screen readers.
 * Handles the common pattern `<label>Text</label><input/>` (control is the next
 * sibling or the first control inside the next sibling) without touching labels
 * that already wrap a control or declare `htmlFor`.
 */
function associateLabels(root: ParentNode) {
  root.querySelectorAll('label:not([for])').forEach((label) => {
    if (label.querySelector('input, select, textarea')) return;
    let sibling = label.nextElementSibling;
    let control: Element | null = null;
    while (sibling && !control) {
      if (sibling.matches('input, select, textarea')) control = sibling;
      else if (sibling.tagName === 'LABEL') break;
      else control = sibling.querySelector('input, select, textarea');
      sibling = sibling.nextElementSibling;
    }
    if (!control || (control as HTMLInputElement).type === 'hidden') return;
    if (!control.id) control.id = `pc-field-${++autoId}`;
    label.setAttribute('for', control.id);
  });
}

export function useAutoLabelAssociation() {
  useEffect(() => {
    associateLabels(document);
    let scheduled = false;
    const observer = new MutationObserver(() => {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(() => {
        scheduled = false;
        associateLabels(document);
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);
}
