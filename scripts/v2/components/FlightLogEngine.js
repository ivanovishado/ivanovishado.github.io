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
                project: null,
                status: null,
                details: null,
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
        this.dom.content.project = document.querySelector('#mission-project');
        this.dom.content.status = document.querySelector('#mission-status');
        this.dom.content.details = document.querySelector('#mission-details');
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

        // 4. Update Tab Styling & Arrow Indicator
        this.dom.tabs.forEach(tab => {
            const arrow = tab.querySelector('.mission-tab-arrow');
            if (tab.dataset.mission === missionId) {
                tab.classList.add('active');
                tab.setAttribute('aria-selected', 'true');
                if (arrow) arrow.classList.remove('hidden');
            } else {
                tab.classList.remove('active');
                tab.setAttribute('aria-selected', 'false');
                if (arrow) arrow.classList.add('hidden');
            }
        });
    }

    renderMission(missionId) {
        const data = MISSIONS[missionId];
        if (!data) return;

        // Project & Status Updates
        if (this.dom.content.project) {
            this.dom.content.project.textContent = `> PROJECT: ${data.title}`;
        }
        if (this.dom.content.status) {
            this.dom.content.status.textContent = `> STATUS: ${data.status}`;
        }

        // Mission Details Rendering (MISSION, ARTIFACT, OBJECTIVE)
        if (this.dom.content.details && data.details) {
            this.dom.content.details.innerHTML = `
                <div class="text-starlight/80">> MISSION:</div>
                <div class="text-starlight ml-4">${data.details.mission}</div>
                <div class="text-starlight/80 mt-2">> ARTIFACT: <span class="text-starlight">${data.details.artifact}</span></div>
                <div class="text-starlight/80">> OBJECTIVE: <span class="text-starlight">${data.details.objective}</span></div>
            `;
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

        // Show arrow on active tab on initial load
        this.dom.tabs.forEach(tab => {
            const arrow = tab.querySelector('.mission-tab-arrow');
            if (tab.dataset.mission === missionId && arrow) {
                arrow.classList.remove('hidden');
            }
        });
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
