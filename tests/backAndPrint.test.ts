// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { closeTopmostDialog } from '../src/hooks/useAndroidBackButton';
import { preparePrintArea } from '../src/services/pdfReportGenerator';

afterEach(() => {
  document.body.innerHTML = '';
  document.documentElement.className = '';
});

describe('closeTopmostDialog', () => {
  it('returns false when no dialog is open', () => {
    expect(closeTopmostDialog()).toBe(false);
  });

  it('clicks the close button of the innermost dialog only', () => {
    document.body.innerHTML = `
      <div role="dialog" id="outer"><button aria-label="Zamknij" id="close-outer"></button>
        <div role="dialog" id="inner"><button aria-label="Zamknij" id="close-inner"></button></div>
      </div>`;
    const outer = vi.fn();
    const inner = vi.fn();
    document.getElementById('close-outer')!.addEventListener('click', outer);
    document.getElementById('close-inner')!.addEventListener('click', inner);

    expect(closeTopmostDialog()).toBe(true);
    expect(inner).toHaveBeenCalledTimes(1);
    expect(outer).not.toHaveBeenCalled();
  });

  it('ignores hidden dialogs', () => {
    document.body.innerHTML = `<div role="dialog" style="display:none"><button aria-label="Zamknij"></button></div>`;
    expect(closeTopmostDialog()).toBe(false);
  });
});

describe('preparePrintArea', () => {
  it('copies only the requested element into the print root', () => {
    document.body.innerHTML = `<div id="app">screen</div><div id="report"><p>Karta</p></div>`;

    expect(preparePrintArea('report')).toBe(true);

    const root = document.getElementById('print-root')!;
    expect(root.parentElement).toBe(document.body);
    expect(root.textContent).toBe('Karta');
    expect(document.querySelectorAll('#report')).toHaveLength(1);
    expect(document.documentElement.classList.contains('print-isolated')).toBe(true);
  });

  it('replaces the previous print root and clears isolation for unknown ids', () => {
    document.body.innerHTML = `<div id="report">A</div>`;
    preparePrintArea('report');
    preparePrintArea('missing');

    expect(document.getElementById('print-root')).toBeNull();
    expect(document.documentElement.classList.contains('print-isolated')).toBe(false);
  });
});
