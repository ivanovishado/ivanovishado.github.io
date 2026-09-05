/* Nav: scroll state, progress bar, active section, mobile menu. */

import { getLenis } from './scroll';

const NAV_BREAKPOINT = '(min-width: 880px)';
const ANCHOR_GAP = 16;
const INTERACTIVE_SELECTOR = [
  'a[href]',
  'area[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]',
].join(',');

interface HashTarget {
  element: HTMLElement;
  hash: string;
}

export function initNav(): void {
  const nav = document.querySelector<HTMLElement>('.nav');
  const bar = document.querySelector<HTMLElement>('.progress__bar');
  const burger = document.querySelector<HTMLButtonElement>('.burger');
  const menu = document.querySelector<HTMLElement>('.mobile-menu');
  const links = document.querySelectorAll<HTMLAnchorElement>('.nav__link[data-target]');
  const sections = Array.from(links)
    .map((link) => document.getElementById(link.dataset.target ?? ''))
    .filter((element): element is HTMLElement => Boolean(element));
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const viewport = window.matchMedia(NAV_BREAKPOINT);

  if (menu && (!menu.id || menu.id === 'mobileMenu')) menu.id = 'mobile-menu';
  menu?.setAttribute('data-lenis-prevent', '');
  const menuId = menu?.id;
  if (burger && menuId) burger.setAttribute('aria-controls', menuId);

  let previousBodyOverflow: string | null = null;
  let resumeScroll = false;
  const originalTabIndexes = new WeakMap<HTMLElement, string | null>();

  const getMenuInteractive = (): HTMLElement[] => {
    if (!menu) return [];
    return Array.from(menu.querySelectorAll<HTMLElement>(INTERACTIVE_SELECTOR));
  };

  const getMenuFocusables = (): HTMLElement[] => {
    return getMenuInteractive().filter((element) => element.getAttribute('tabindex') !== '-1');
  };

  const setMenuInteractionState = (isOpen: boolean) => {
    if (!menu) return;
    menu.classList.toggle('is-open', isOpen);
    menu.setAttribute('aria-hidden', String(!isOpen));
    if (isOpen) menu.removeAttribute('inert');
    else menu.setAttribute('inert', '');

    getMenuInteractive().forEach((element) => {
      if (isOpen) {
        const previousTabIndex = originalTabIndexes.get(element);
        if (previousTabIndex === null || previousTabIndex === undefined) element.removeAttribute('tabindex');
        else element.setAttribute('tabindex', previousTabIndex);
      } else {
        if (!originalTabIndexes.has(element)) originalTabIndexes.set(element, element.getAttribute('tabindex'));
        element.setAttribute('tabindex', '-1');
      }
    });
  };

  const focusWithoutScroll = (element: HTMLElement | null) => {
    element?.focus({ preventScroll: true });
  };

  const restoreFocus = () => {
    if (!burger) return;
    if (window.getComputedStyle(burger).display !== 'none') {
      focusWithoutScroll(burger);
      return;
    }
    focusWithoutScroll(nav?.querySelector<HTMLElement>('.brand, .nav__link, .nav__cta') ?? null);
  };

  const close = (shouldRestoreFocus = false): boolean => {
    const wasOpen = menu?.classList.contains('is-open') ?? false;
    if (!wasOpen) return false;

    setMenuInteractionState(false);
    burger?.classList.remove('is-open');
    burger?.setAttribute('aria-expanded', 'false');
    if (previousBodyOverflow !== null) document.body.style.overflow = previousBodyOverflow;
    previousBodyOverflow = null;
    if (resumeScroll) getLenis()?.start();
    resumeScroll = false;
    if (shouldRestoreFocus) restoreFocus();
    return true;
  };

  const open = () => {
    if (!menu || menu.classList.contains('is-open')) return;
    previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const lenis = getLenis();
    resumeScroll = Boolean(lenis && !lenis.isStopped);
    lenis?.stop();
    setMenuInteractionState(true);
    burger?.classList.add('is-open');
    burger?.setAttribute('aria-expanded', 'true');
    const firstLink = menu.querySelector<HTMLAnchorElement>('a[href]') ?? getMenuFocusables()[0] ?? burger ?? null;
    focusWithoutScroll(firstLink);

  };

  // Focus once the opening transition makes the menu fully visible.
  menu?.addEventListener('transitionend', (event) => {
    if (event.target === menu && event.propertyName === 'opacity'
      && menu.classList.contains('is-open') && document.activeElement === burger) {
      focusWithoutScroll(menu.querySelector<HTMLAnchorElement>('a[href]'));
    }
  });

  const getNavOffset = (): number => {
    const navHeight = nav?.getBoundingClientRect().height ?? 0;
    const offset = Math.ceil(navHeight + ANCHOR_GAP);
    document.documentElement.style.setProperty('--nav-offset', `${offset}px`);
    return offset;
  };

  const updateNavOffset = () => { getNavOffset(); };
  updateNavOffset();
  window.addEventListener('resize', updateNavOffset, { passive: true });
  if (nav && 'ResizeObserver' in window) new ResizeObserver(updateNavOffset).observe(nav);

  const getHashTarget = (hash: string): HashTarget | null => {
    if (!hash) return null;
    const rawId = hash.startsWith('#') ? hash.slice(1) : hash;
    if (!rawId) return null;
    let id = rawId;
    try { id = decodeURIComponent(rawId); } catch { /* Keep the literal id for malformed legacy hashes. */ }
    const element = document.getElementById(id);
    return element ? { element, hash: `#${rawId}` } : null;
  };

  const resolveSameDocumentTarget = (anchor: HTMLAnchorElement): HashTarget | null => {
    const href = anchor.getAttribute('href');
    if (!href) return null;
    const url = new URL(href, window.location.href);
    if (url.origin !== window.location.origin || url.pathname !== window.location.pathname || url.search !== window.location.search) {
      return null;
    }
    return getHashTarget(url.hash);
  };

  const updateHistory = (hash: string) => {
    const nextUrl = `${window.location.pathname}${window.location.search}${hash}`;
    const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (currentUrl !== nextUrl) window.history.pushState({}, '', nextUrl);
  };

  const focusTarget = (element: HTMLElement) => {
    if (!element.hasAttribute('tabindex')) element.setAttribute('tabindex', '-1');
    focusWithoutScroll(element);
  };

  const scrollToTarget = (target: HTMLElement, immediate = false) => {
    const offset = getNavOffset();
    const isImmediate = immediate || reducedMotion.matches;
    const lenis = getLenis();
    // Numeric targets avoid applying the element's CSS scroll-margin twice.
    const top = Math.max(0, target.getBoundingClientRect().top + window.scrollY - offset);

    if (lenis) {
      if (isImmediate) lenis.scrollTo(top, { immediate: true });
      else lenis.scrollTo(top, { duration: 1.2 });
      return;
    }

    window.scrollTo({ top, behavior: isImmediate ? 'auto' : 'smooth' });
  };

  const alignHash = (immediate = true) => {
    const target = getHashTarget(window.location.hash);
    if (target) scrollToTarget(target.element, immediate);
  };

  // Ensure the menu starts out hidden from both sighted and keyboard users.
  setMenuInteractionState(false);
  burger?.setAttribute('aria-expanded', 'false');

  // progress + scrolled state
  const onScroll = () => {
    const doc = document.documentElement;
    const max = doc.scrollHeight - doc.clientHeight;
    const progress = max > 0 ? doc.scrollTop / max : 0;
    if (bar) bar.style.transform = `scaleX(${progress})`;
    if (nav) nav.classList.toggle('nav--scrolled', doc.scrollTop > 40);
  };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  // active section
  if (sections.length) {
    const spy = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const id = entry.target.id;
          links.forEach((link) => link.classList.toggle('is-active', link.dataset.target === id));
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });
    sections.forEach((section) => spy.observe(section));
  }

  burger?.addEventListener('click', () => {
    menu?.classList.contains('is-open') ? close(true) : open();
  });

  document.addEventListener('keydown', (event) => {
    if (!menu?.classList.contains('is-open')) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      close(true);
      return;
    }
    if (event.key !== 'Tab') return;

    const menuFocusables = getMenuFocusables();
    const focusables = burger && !burger.hasAttribute('disabled') ? [...menuFocusables, burger] : menuFocusables;
    if (!focusables.length) {
      event.preventDefault();
      return;
    }
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (!first || !last) return;
    const activeElement = document.activeElement;
    const activeIndex = focusables.indexOf(activeElement as HTMLElement);
    if (activeIndex === -1) {
      event.preventDefault();
      focusWithoutScroll(event.shiftKey ? last : first);
    } else if (event.shiftKey && activeIndex === 0) {
      event.preventDefault();
      focusWithoutScroll(last);
    } else if (!event.shiftKey && burger && activeElement === menuFocusables[menuFocusables.length - 1]) {
      event.preventDefault();
      focusWithoutScroll(burger);
    } else if (event.shiftKey && burger && activeElement === burger) {
      event.preventDefault();
      focusWithoutScroll(menuFocusables[menuFocusables.length - 1] ?? burger);
    } else if (!event.shiftKey && activeIndex === focusables.length - 1) {
      event.preventDefault();
      focusWithoutScroll(first);
    }
  });

  document.querySelectorAll<HTMLAnchorElement>('a[href]').forEach((anchor) => {
    anchor.addEventListener('click', (event) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      if (anchor.hasAttribute('download') || (anchor.target && anchor.target !== '_self')) return;
      const href = anchor.getAttribute('href');
      const target = resolveSameDocumentTarget(anchor);
      if (!target) {
        if (menu?.contains(anchor)) close(false);
        if (href !== '#') return;
      }

      const destination = target ?? { element: document.getElementById('hero'), hash: '' };
      if (!destination.element) return;
      event.preventDefault();
      close(false);
      updateHistory(destination.hash);
      scrollToTarget(destination.element);
      focusTarget(destination.element);
    });
  });

  const onViewportChange = () => {
    updateNavOffset();
    if (viewport.matches) close(true);
  };
  viewport.addEventListener('change', onViewportChange);
  window.addEventListener('hashchange', () => alignHash(true));
  window.addEventListener('popstate', () => alignHash(true));
  requestAnimationFrame(() => alignHash(true));
}
