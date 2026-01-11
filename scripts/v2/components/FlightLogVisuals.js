import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

/**
 * molecule: FlightLogVisuals
 * Handles the 3D rendering of mission artifacts.
 * Loads GLB models exported from Blender with proper glass transparency.
 */

// ============================================================================
// TUNING CONFIG - Easily adjust these values
// ============================================================================
const CONFIG = {
    // Camera settings
    camera: {
        fov: 55,        // Field of view (50-60 for natural look)
        posZ: 10,        // Distance from model (higher = more zoomed out)
        posY: 0.3       // Vertical offset
    },

    // Model rotation (in DEGREES - easier to understand and adjust)
    rotation: {
        pitch: 70,      // X-axis: tilt back/forward (positive = top tilts back)
        yaw: -28,       // Y-axis: turn left/right (negative = left side closer)
        roll: 0         // Z-axis: sideways tilt (0 for upright)
    },

    // Animation settings
    animation: {
        rotationSpeed: 0.05,   // Y-axis rotation speed (radians/sec)
        floatAmplitude: 0.03,  // Vertical float distance
        floatSpeed: 0.0003     // Float oscillation speed
    },

    // Model scale
    modelScale: 2.5
};
// ============================================================================

// Helper: Convert degrees to radians
const degToRad = (deg) => deg * (Math.PI / 180);

export class FlightLogVisuals {
    constructor(containerSelector) {
        this.container = document.querySelector(containerSelector);
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.currentArtifact = null;
        this.animationId = null;
        this.clock = new THREE.Clock();

        // Config
        this.width = 0;
        this.height = 0;

        // Model path
        this.modelPath = 'assets/models/metal_frame.glb';
    }

    init() {
        if (!this.container) return;

        // 1. Setup Scene
        this.scene = new THREE.Scene();
        // Transparent background to show CSS background through

        // 2. Setup Camera
        this.width = this.container.clientWidth;
        this.height = this.container.clientHeight;
        this.camera = new THREE.PerspectiveCamera(CONFIG.camera.fov, this.width / this.height, 0.1, 100);
        this.camera.position.z = CONFIG.camera.posZ;
        this.camera.position.y = CONFIG.camera.posY;

        // 3. Setup Renderer with transparency
        this.renderer = new THREE.WebGLRenderer({
            alpha: true,
            antialias: true,
            powerPreference: "high-performance"
        });
        this.renderer.setSize(this.width, this.height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.5;
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;

        // Clear container and append canvas
        this.container.innerHTML = '';
        this.container.appendChild(this.renderer.domElement);

        // 4. Lights
        this.setupLights();

        // 5. Setup Environment for glass reflections
        this.setupEnvironment();

        // 6. Load the GLB Model
        this.loadMisseArtifact();

        // 7. Start Loop
        this.animate();

        // 8. Resize Handler
        window.addEventListener('resize', () => this.handleResize());
    }

    setupLights() {
        // Key Light (Horizon purple/blue)
        const keyLight = new THREE.DirectionalLight(0x6366F1, 3);
        keyLight.position.set(5, 5, 5);
        this.scene.add(keyLight);

        // Fill Light (Warm/Starlight)
        const fillLight = new THREE.DirectionalLight(0xE2E8F0, 1.5);
        fillLight.position.set(-5, 0, 5);
        this.scene.add(fillLight);

        // Rim Light (Signal Cyan) - creates edge highlight
        const rimLight = new THREE.SpotLight(0x00F0FF, 5);
        rimLight.position.set(0, 5, -5);
        rimLight.lookAt(0, 0, 0);
        this.scene.add(rimLight);

        // Back light for glass glow
        const backLight = new THREE.PointLight(0x00F0FF, 2);
        backLight.position.set(0, 0, -2);
        this.scene.add(backLight);

        // Ambient for base visibility
        const ambient = new THREE.AmbientLight(0x404050, 0.8);
        this.scene.add(ambient);
    }

    setupEnvironment() {
        // Create a simple gradient environment for reflections
        const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
        pmremGenerator.compileEquirectangularShader();

        // Create a simple color environment
        const envScene = new THREE.Scene();
        envScene.background = new THREE.Color(0x050510);

        // Add some colored lights to the environment for reflections
        const envLight1 = new THREE.PointLight(0x6366F1, 10);
        envLight1.position.set(5, 5, 5);
        envScene.add(envLight1);

        const envLight2 = new THREE.PointLight(0x00F0FF, 10);
        envLight2.position.set(-5, 0, 5);
        envScene.add(envLight2);

        this.envMap = pmremGenerator.fromScene(envScene).texture;
        pmremGenerator.dispose();
    }

    loadMisseArtifact() {
        // Setup loaders
        const dracoLoader = new DRACOLoader();
        dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');

        const gltfLoader = new GLTFLoader();
        gltfLoader.setDRACOLoader(dracoLoader);

        gltfLoader.load(
            this.modelPath,
            (gltf) => {
                const model = gltf.scene;

                // Configure materials for glass transparency
                model.traverse((child) => {
                    if (child.isMesh) {
                        const material = child.material;

                        // Check if this is the glass material
                        if (material.name && material.name.toLowerCase().includes('glass')) {
                            // Enhance glass material for Three.js rendering
                            child.material = new THREE.MeshPhysicalMaterial({
                                color: new THREE.Color(0x1a2530),
                                metalness: 0.0,
                                roughness: 0.05,
                                transmission: 0.95,  // High transparency
                                thickness: 0.5,
                                ior: 1.45,
                                transparent: true,
                                opacity: 0.9,
                                envMap: this.envMap,
                                envMapIntensity: 1.5,
                                clearcoat: 1.0,
                                clearcoatRoughness: 0.05,
                                side: THREE.DoubleSide,
                                depthWrite: false
                            });
                        } else {
                            // Metal frame - enhance reflections
                            if (material.isMeshStandardMaterial || material.isMeshPhysicalMaterial) {
                                material.envMap = this.envMap;
                                material.envMapIntensity = 1.2;
                                material.needsUpdate = true;
                            }
                        }
                    }
                });

                // Scale and position the model
                model.scale.setScalar(2.5);
                model.position.set(0, 0, 0);

                this.scene.add(model);
                this.currentArtifact = model;

                console.log('[FlightLogVisuals] Model loaded:', this.modelPath);
            },
            (progress) => {
                const percent = (progress.loaded / progress.total) * 100;
                console.log(`[FlightLogVisuals] Loading: ${percent.toFixed(0)}%`);
            },
            (error) => {
                console.error('[FlightLogVisuals] Error loading model:', error);
            }
        );
    }

    animate() {
        this.animationId = requestAnimationFrame(() => this.animate());

        const delta = this.clock.getDelta();

        if (this.currentArtifact) {
            // Apply rotation from CONFIG (converting degrees to radians)
            // Pitch: X-axis rotation (back tilt)
            this.currentArtifact.rotation.x = degToRad(CONFIG.rotation.pitch);

            // Yaw: Y-axis rotation (slow continuous spin + initial offset)
            // We add to the current rotation for continuous spin
            if (!this.baseYaw) {
                this.baseYaw = degToRad(CONFIG.rotation.yaw);
            }
            this.baseYaw += delta * CONFIG.animation.rotationSpeed;
            this.currentArtifact.rotation.y = this.baseYaw;

            // Roll: Z-axis rotation (should be 0 for upright)
            this.currentArtifact.rotation.z = degToRad(CONFIG.rotation.roll);

            // Subtle floating motion (very gentle, like orbiting in space)
            const time = performance.now() * CONFIG.animation.floatSpeed;
            this.currentArtifact.position.y = Math.sin(time) * CONFIG.animation.floatAmplitude;
        }

        this.renderer.render(this.scene, this.camera);
    }

    handleResize() {
        if (!this.container) return;

        this.width = this.container.clientWidth;
        this.height = this.container.clientHeight;

        if (this.camera) {
            this.camera.aspect = this.width / this.height;
            this.camera.updateProjectionMatrix();
        }

        if (this.renderer) {
            this.renderer.setSize(this.width, this.height);
        }
    }

    dispose() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        if (this.renderer) {
            this.renderer.dispose();
        }
        if (this.envMap) {
            this.envMap.dispose();
        }
    }
}
