declare global {
  interface Window {
    ScrollTrigger?: { refresh(): void };
  }
}

export {};
