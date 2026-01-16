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
                duration: null,
                mission: null,
                artifact: null,
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

        this.dom.tabs = document.querySelectorAll('.tab-btn');
        this.dom.content.title = document.querySelector('#mission-title');
        this.dom.content.project = document.querySelector('#detail-project');
        this.dom.content.status = document.querySelector('#detail-status');
        this.dom.content.duration = document.querySelector('#detail-duration');
        this.dom.content.mission = document.querySelector('#detail-mission');
        this.dom.content.artifact = document.querySelector('#detail-artifact');
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

        // Header Title
        if (this.dom.content.title) {
            if (data.shortTitle) {
                this.dom.content.title.innerHTML = `
                    <span class="md:hidden">${data.shortTitle}</span>
                    <span class="hidden md:inline">${data.title}</span>
                `;
            } else {
                this.dom.content.title.textContent = data.title;
            }
        }

        // Project Row
        if (this.dom.content.project) {
            if (data.shortTitle) {
                this.dom.content.project.innerHTML = `
                     <span class="md:hidden">${data.shortTitle}</span>
                     <span class="hidden md:inline">${data.title}</span>
                 `;
            } else {
                this.dom.content.project.textContent = data.title;
            }
        }

        // Status Update
        if (this.dom.content.status) {
            this.dom.content.status.innerHTML = `
                <span class="md:hidden">${data.shortStatus || data.status}</span>
                <span class="hidden md:inline">${data.status}</span>
            `;
        }

        // Duration Update
        if (this.dom.content.duration) {
            const duration = data.duration || data.location || '';
            const shortDuration = data.shortDuration || duration;
            this.dom.content.duration.innerHTML = `
                <span class="md:hidden">${shortDuration}</span>
                <span class="hidden md:inline">${duration}</span>
            `;
        }

        // Mission Details
        if (this.dom.content.mission && data.details) {
            this.dom.content.mission.textContent = data.details.mission;
        }

        // Artifact
        if (this.dom.content.artifact && data.details) {
            this.dom.content.artifact.textContent = data.details.artifact;
        }

        // Media Links Rendering
        if (this.dom.content.links) {
            // Match classes from: <a class="btn-hud"> in index.html
            this.dom.content.links.innerHTML = data.mediaLinks
                .map(link => `
                    <a href="${link.url}" target="_blank" rel="noopener" class="btn-hud">
                        READ: ${link.label}
                    </a>
                `).join('');
        }
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
