import { MISSIONS } from '../data/missions.js';
import { FlightLogVisuals } from './FlightLogVisuals.js';

export class FlightLogEngine {
    constructor() {
        this.activeMissionId = 'misse-ff';
        this.visuals = null;
        this.dom = {
            container: null,
            tabs: null,
            content: {
                title: null,
                status: null,
                description: null,
                stats: null,
                links: null
            },
            visualContainer: null
        };
    }

    init() {
        this.cacheDOM();
        if (!this.dom.container) return; // Guard clause if section doesn't exist

        // Init Visuals
        this.visuals = new FlightLogVisuals('#mission-visual');
        this.visuals.init();

        this.bindEvents();
        this.renderMission(this.activeMissionId);
    }

    cacheDOM() {
        this.dom.container = document.querySelector('#flight-logs');
        if (!this.dom.container) return;

        this.dom.tabs = document.querySelectorAll('.mission-tab');
        this.dom.content.title = document.querySelector('#mission-title');
        this.dom.content.status = document.querySelector('#mission-status');
        this.dom.content.description = document.querySelector('#mission-desc');
        this.dom.content.stats = document.querySelector('#mission-stats');
        this.dom.content.links = document.querySelector('#mission-links');
        this.dom.visualContainer = document.querySelector('#mission-visual');
    }

    bindEvents() {
        this.dom.tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const missionId = tab.dataset.mission;
                if (missionId !== this.activeMissionId) {
                    this.switchMission(missionId);
                }
            });
        });
    }

    switchMission(missionId) {
        // 1. Update State
        this.activeMissionId = missionId;

        // 2. Visual Transition (GSAP)
        this.animateTransition(() => {
            // 3. Update DOM Content (in middle of animation)
            this.renderMission(missionId);
        });

        // 4. Update Tab Styling
        this.dom.tabs.forEach(tab => {
            if (tab.dataset.mission === missionId) {
                tab.classList.add('active');
                tab.setAttribute('aria-selected', 'true');
            } else {
                tab.classList.remove('active');
                tab.setAttribute('aria-selected', 'false');
            }
        });
    }

    renderMission(missionId) {
        const data = MISSIONS[missionId];
        if (!data) return;

        // Text Updates
        if (this.dom.content.title) this.dom.content.title.textContent = data.title;
        if (this.dom.content.status) this.dom.content.status.textContent = `> STATUS: ${data.status}`;
        if (this.dom.content.description) this.dom.content.description.textContent = data.description;

        // Stats Rendering
        if (this.dom.content.stats) {
            this.dom.content.stats.innerHTML = Object.entries(data.stats)
                .map(([key, value]) => `
                    <div class="stat-item">
                        <span class="text-xs text-starlight/50 block mb-1">${key}</span>
                        <span class="text-sm text-signal font-mono">${value}</span>
                    </div>
                `).join('');
        }

        // Links Rendering
        if (this.dom.content.links) {
            this.dom.content.links.innerHTML = data.mediaLinks
                .map(link => `
                    <a href="${link.url}" class="nav-box text-sm px-4 py-2 group border-signal/50 hover:bg-signal/10" target="_blank" rel="noopener">
                        [ READ: ${link.label} ]
                    </a>
                `).join('');
        }

        // Trigger text scramble effect if available (optional enhancement)
        // if (window.ScrambleText) ...
    }

    animateTransition(onComplete) {
        // Simple "Scanline Wipe" simulation using GSAP
        // We will animate a "glitch" overlay or just opacity flash

        const timeline = gsap.timeline({
            onComplete: () => {
                // Animation done
            }
        });

        // Step 1: Glitch Out
        timeline.to(this.dom.container, {
            opacity: 0.5,
            duration: 0.1,
            ease: "power2.inOut",
            onComplete: onComplete // Swap data here
        });

        // Step 2: Glitch In
        timeline.to(this.dom.container, {
            opacity: 1,
            duration: 0.2,
            ease: "power2.inOut"
        });
    }
}
