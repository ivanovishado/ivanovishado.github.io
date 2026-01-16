/* ==========================================================================
   Orbital Orchestrator V2 — Hero Particles
   Three.js drifting space dust with mouse/scroll parallax
   ========================================================================== */

import {
    Scene,
    PerspectiveCamera,
    WebGLRenderer,
    BufferGeometry,
    BufferAttribute,
    Color,
    PointsMaterial,
    Points,
    AdditiveBlending,
    CanvasTexture
} from 'three';

export class HeroParticles {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.warn('HeroParticles: Container not found');
            return;
        }

        // Check for reduced motion preference
        this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        // Settings
        this.isMobile = window.innerWidth < 768;
        this.particleCount = this.isMobile ? 400 : 1000;

        // Mouse tracking
        this.mouse = { x: 0, y: 0 };
        this.targetMouse = { x: 0, y: 0 };



        // Initialize
        this.init();
        this.createParticles();
        this.bindEvents();
        this.animate();
    }

    init() {
        // Scene
        this.scene = new Scene();

        // Camera
        this.camera = new PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            2000
        );
        this.camera.position.z = 500;

        // Renderer
        this.renderer = new WebGLRenderer({
            antialias: true,
            alpha: true,
        });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setClearColor(0x000000, 0);

        this.container.appendChild(this.renderer.domElement);
    }

    createParticles() {
        // Geometry
        const geometry = new BufferGeometry();
        const positions = new Float32Array(this.particleCount * 3);
        const colors = new Float32Array(this.particleCount * 3);
        const sizes = new Float32Array(this.particleCount);
        const velocities = [];

        // Event Horizon colors
        const colorPalette = [
            new Color(0x6366F1), // Indigo (horizon)
            new Color(0x00F0FF), // Cyan (signal)
            new Color(0xE2E8F0), // Silver (starlight)
        ];

        for (let i = 0; i < this.particleCount; i++) {
            const i3 = i * 3;

            // Distribute in 3D space - sphere with bias toward edges
            const radius = 300 + Math.random() * 500;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);

            positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
            positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
            positions[i3 + 2] = (Math.random() - 0.5) * 800;

            // Random color from palette
            const color = colorPalette[Math.floor(Math.random() * colorPalette.length)];
            colors[i3] = color.r;
            colors[i3 + 1] = color.g;
            colors[i3 + 2] = color.b;

            // Random sizes
            sizes[i] = Math.random() * 2 + 1;

            // Velocity for drift (used if motion is enabled)
            velocities.push({
                x: (Math.random() - 0.5) * 0.2,
                y: (Math.random() - 0.5) * 0.15,
                z: (Math.random() - 0.5) * 0.1,
            });
        }

        geometry.setAttribute('position', new BufferAttribute(positions, 3));
        geometry.setAttribute('color', new BufferAttribute(colors, 3));
        geometry.setAttribute('size', new BufferAttribute(sizes, 1));

        this.velocities = velocities;
        this.positions = positions;

        // Material with circular star texture
        const material = new PointsMaterial({
            size: 4,
            map: this.createStarTexture(),
            vertexColors: true,
            transparent: true,
            opacity: 0.9,
            blending: AdditiveBlending,
            sizeAttenuation: true,
            depthWrite: false,
        });

        // Points
        this.particles = new Points(geometry, material);
        this.scene.add(this.particles);
    }

    createStarTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');

        // Create radial gradient for soft star glow
        const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
        gradient.addColorStop(0.2, 'rgba(255, 255, 255, 0.8)');
        gradient.addColorStop(0.4, 'rgba(255, 255, 255, 0.4)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 64, 64);

        return new CanvasTexture(canvas);
    }

    bindEvents() {
        // Mouse move
        window.addEventListener('mousemove', (e) => {
            this.targetMouse.x = (e.clientX / window.innerWidth - 0.5) * 2;
            this.targetMouse.y = (e.clientY / window.innerHeight - 0.5) * 2;
        });



        // Resize
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }

    animate() {
        if (!this.renderer) return;

        requestAnimationFrame(() => this.animate());

        // Smooth mouse interpolation
        this.mouse.x += (this.targetMouse.x - this.mouse.x) * 0.05;
        this.mouse.y += (this.targetMouse.y - this.mouse.y) * 0.05;

        // Apply mouse parallax to particle group
        this.particles.rotation.x = this.mouse.y * 0.1;
        this.particles.rotation.y = this.mouse.x * 0.1;

        // Drift particles if motion is allowed
        if (!this.reducedMotion) {
            const posAttr = this.particles.geometry.attributes.position;
            const positions = posAttr.array;

            // Warp speed multiplier (default 1, increases with scroll)
            const speedMult = 1 + (this.warpFactor || 0) * 20;

            for (let i = 0; i < this.particleCount; i++) {
                const i3 = i * 3;
                const vel = this.velocities[i];

                positions[i3] += vel.x;
                positions[i3 + 1] += vel.y;

                // Enhance Z movement with warp speed
                // Move towards camera (positive Z) for "warp" feel, or follow velocity direction
                // Let's make them fly past the camera when warping
                const zSpeed = Math.abs(vel.z) * speedMult;
                positions[i3 + 2] += zSpeed;

                // Wrap around bounds
                if (Math.abs(positions[i3]) > 800) vel.x *= -1;
                if (Math.abs(positions[i3 + 1]) > 600) vel.y *= -1;

                // Reset Z if it brings particle too close or too far
                if (positions[i3 + 2] > 600) {
                    positions[i3 + 2] = -600;
                } else if (positions[i3 + 2] < -600) {
                    positions[i3 + 2] = 600;
                }
            }

            posAttr.needsUpdate = true;
        }

        this.renderer.render(this.scene, this.camera);
    }

    destroy() {
        if (this.renderer) {
            this.renderer.dispose();
            this.container.removeChild(this.renderer.domElement);
        }
    }

    setWarpSpeed(velocity) {
        // Smoothly interpolate warp factor based on scroll velocity
        // Velocity comes from Lenis (pixels per frame approx)
        // We normalize it to a 0-1 range for the "warp" effect intensity
        const targetWarp = Math.min(Math.abs(velocity) / 15, 5); // Cap at 5x speed
        this.warpFactor = this.warpFactor || 0;
        this.warpFactor += (targetWarp - this.warpFactor) * 0.1;
    }
}
