import { createSupernova3D } from './supernova-3d';

/** Progressive enhancement: the document remains usable if the intro cannot run. */
export function initSupernovaIntro(): () => void {
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (motion.matches || document.visibilityState === 'hidden' || window.scrollY > 40
    || (location.hash && location.hash !== '#hero')) return () => {};

  const overlay = document.createElement('div');
  overlay.className = 'supernova-intro';
  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  const renderer = createSupernova3D(canvas);
  if (!renderer) return () => {};
  const skip = document.createElement('button');
  skip.className = 'supernova-intro__skip';
  skip.textContent = 'Skip intro ↗';
  overlay.append(canvas, skip);
  document.body.append(overlay);
  document.body.classList.add('supernova-entering');
  let raf = 0;
  let disposed = false;
  const startedAt = performance.now();
  function frame(now: number): void {
    if (disposed) return;
    renderer?.render((now - startedAt) / 1000);
    if (!disposed) raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);
  let finished = false;
  let removal = 0;
  const reveal = window.setTimeout(() => finish(), 4300);

  function cleanup(): void {
    if (disposed) return;
    disposed = true;
    window.clearTimeout(reveal);
    window.clearTimeout(removal);
    cancelAnimationFrame(raf);
    canvas.removeEventListener('webglcontextlost', dismiss);
    renderer?.dispose();
    overlay.remove();
    document.body.classList.remove('supernova-entering');
    window.removeEventListener('keydown', onKey);
    window.removeEventListener('wheel', dismiss);
    window.removeEventListener('touchmove', dismiss);
    window.removeEventListener('scroll', dismiss);
    document.removeEventListener('visibilitychange', onVisibility);
    motion.removeEventListener('change', dismiss);
  }

  function finish(immediate = false): void {
    if (finished) return;
    finished = true;
    document.body.classList.remove('supernova-entering');
    overlay.classList.add('is-leaving');
    if (document.activeElement === skip) skip.blur();
    skip.disabled = true;
    if (immediate) cleanup();
    else removal = window.setTimeout(cleanup, 800);
  }
  function dismiss(): void { finish(true); }
  function onKey(): void { dismiss(); }
  function onVisibility(): void {
    if (document.visibilityState === 'hidden') dismiss();
  }
  canvas.addEventListener('webglcontextlost', dismiss);
  skip.addEventListener('click', dismiss);
  window.addEventListener('keydown', onKey);
  window.addEventListener('wheel', dismiss, { passive: true });
  window.addEventListener('touchmove', dismiss, { passive: true });
  window.addEventListener('scroll', dismiss, { passive: true });
  document.addEventListener('visibilitychange', onVisibility);
  motion.addEventListener('change', dismiss);
  return cleanup;
}
