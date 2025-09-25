
(function () {
    const THREE_VERSION = 'r128';
    const CDN_BASE = `https://cdnjs.cloudflare.com/ajax/libs/three.js/${THREE_VERSION}`;
    const DEPENDENCY_SCRIPTS = [
        `${CDN_BASE}/examples/js/postprocessing/EffectComposer.js`,
        `${CDN_BASE}/examples/js/postprocessing/RenderPass.js`,
        `${CDN_BASE}/examples/js/postprocessing/UnrealBloomPass.js`,
        `${CDN_BASE}/examples/js/postprocessing/ShaderPass.js`,
        `${CDN_BASE}/examples/js/postprocessing/BokehPass.js`,
        `${CDN_BASE}/examples/js/postprocessing/AfterimagePass.js`,
        `${CDN_BASE}/examples/js/shaders/CopyShader.js`,
        `${CDN_BASE}/examples/js/shaders/FXAAShader.js`,
        `${CDN_BASE}/examples/js/shaders/FilmShader.js`,
        `${CDN_BASE}/examples/js/shaders/LuminosityHighPassShader.js`
    ];

    let dependencyLoader = null;

    function loadScript(src) {
        return new Promise((resolve, reject) => {
            if (document.querySelector(`script[src="${src}"]`)) {
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = src;
            script.async = false;
            script.onload = () => resolve();
            script.onerror = () => reject(new Error(`Failed to load ${src}`));
            document.head.appendChild(script);
        });
    }

    function ensureThreeDependencies() {
        if (dependencyLoader) {
            return dependencyLoader;
        }

        dependencyLoader = DEPENDENCY_SCRIPTS.reduce((promise, src) => {
            return promise.then(() => loadScript(src));
        }, Promise.resolve()).catch((error) => {
            dependencyLoader = null;
            throw error;
        });

        return dependencyLoader;
    }

    function supportsWebGL(canvas) {
        try {
            return !!(
                canvas.getContext('webgl2', { powerPreference: 'high-performance' }) ||
                canvas.getContext('webgl', { powerPreference: 'high-performance' })
            );
        } catch (error) {
            return false;
        }
    }

    function createChromaticAberrationShader(THREE) {
        return {
            uniforms: {
                tDiffuse: { value: null },
                offset: { value: new THREE.Vector2(0.0015, 0.0015) }
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform sampler2D tDiffuse;
                uniform vec2 offset;
                varying vec2 vUv;

                void main() {
                    vec4 color;
                    color.r = texture2D(tDiffuse, vUv + offset).r;
                    color.g = texture2D(tDiffuse, vUv).g;
                    color.b = texture2D(tDiffuse, vUv - offset).b;
                    color.a = texture2D(tDiffuse, vUv).a;
                    gl_FragColor = color;
                }
            `
        };
    }

    function createFilmGrainShader(THREE) {
        return {
            uniforms: {
                tDiffuse: { value: null },
                time: { value: 0 },
                intensity: { value: 0.12 }
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform sampler2D tDiffuse;
                uniform float time;
                uniform float intensity;
                varying vec2 vUv;

                float random(vec2 co) {
                    return fract(sin(dot(co.xy, vec2(12.9898, 78.233)) + time) * 43758.5453);
                }

                void main() {
                    vec4 color = texture2D(tDiffuse, vUv);
                    float grain = random(vUv * (time * 0.25 + 1.0));
                    grain = (grain - 0.5) * intensity;
                    color.rgb += grain;
                    gl_FragColor = color;
                }
            `
        };
    }

    function advancedParticleSystem() {
        const canvas = document.getElementById('hero-canvas');
        if (!canvas) {
            console.warn('Blaze Advanced Visuals: canvas not found');
            return;
        }

        if (!window.THREE) {
            console.warn('Blaze Advanced Visuals: Three.js not available');
            return;
        }

        if (!supportsWebGL(canvas)) {
            console.warn('Blaze Advanced Visuals: WebGL not supported, skipping advanced renderer');
            return;
        }

        if (canvas.__blazeCleanup) {
            canvas.__blazeCleanup();
        }

        ensureThreeDependencies()
            .then(() => initRenderer(canvas))
            .catch((error) => {
                console.warn('Blaze Advanced Visuals: failed to initialize enhancements', error);
            });
    }

    function initRenderer(canvas) {
        const THREE = window.THREE;
        const renderer = new THREE.WebGLRenderer({
            canvas,
            alpha: true,
            antialias: true,
            powerPreference: 'high-performance'
        });

        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setClearColor(0x000000, 0);
        renderer.outputEncoding = THREE.sRGBEncoding;
        renderer.toneMappingExposure = 1.1;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.physicallyCorrectLights = true;
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        const scene = new THREE.Scene();
        scene.fog = new THREE.FogExp2(0x050507, 0.0025);

        const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 2000);
        camera.position.set(0, 80, 420);
        scene.add(camera);

        const composer = new THREE.EffectComposer(renderer);
        composer.setSize(window.innerWidth, window.innerHeight);

        const renderPass = new THREE.RenderPass(scene, camera);
        composer.addPass(renderPass);

        const bloomPass = new THREE.UnrealBloomPass(
            new THREE.Vector2(window.innerWidth, window.innerHeight),
            1.1,
            0.45,
            0.2
        );
        bloomPass.threshold = 0.15;
        bloomPass.strength = 1.0;
        bloomPass.radius = 0.6;
        composer.addPass(bloomPass);

        const bokehPass = new THREE.BokehPass(scene, camera, {
            focus: 320,
            aperture: 0.00008,
            maxblur: 0.01,
            width: window.innerWidth,
            height: window.innerHeight
        });
        composer.addPass(bokehPass);

        const motionBlurPass = new THREE.AfterimagePass(0.88);
        composer.addPass(motionBlurPass);

        const chromaticAberrationPass = new THREE.ShaderPass(createChromaticAberrationShader(THREE));
        composer.addPass(chromaticAberrationPass);

        const filmGrainPass = new THREE.ShaderPass(createFilmGrainShader(THREE));
        composer.addPass(filmGrainPass);

        let fxaaPass = null;
        if (THREE.FXAAShader) {
            fxaaPass = new THREE.ShaderPass(THREE.FXAAShader);
            fxaaPass.material.uniforms['resolution'].value.set(
                1 / (window.innerWidth * renderer.getPixelRatio()),
                1 / (window.innerHeight * renderer.getPixelRatio())
            );
            composer.addPass(fxaaPass);
        }

        // Lighting system
        const ambientLight = new THREE.AmbientLight(0x1b1d2b, 0.7);
        scene.add(ambientLight);

        const keyLight = new THREE.DirectionalLight(0xffc89a, 1.4);
        keyLight.position.set(140, 220, 160);
        keyLight.castShadow = true;
        keyLight.shadow.mapSize.width = 1024;
        keyLight.shadow.mapSize.height = 1024;
        scene.add(keyLight);

        const fillLight = new THREE.PointLight(0x0c2340, 1.2, 900, 2);
        fillLight.position.set(-220, 120, 260);
        scene.add(fillLight);

        const rimLight = new THREE.PointLight(0x97233f, 1.3, 900, 2);
        rimLight.position.set(0, 260, -200);
        scene.add(rimLight);

        const emissivePlane = new THREE.Mesh(
            new THREE.CircleGeometry(220, 64),
            new THREE.MeshStandardMaterial({
                color: 0x10111a,
                metalness: 0.85,
                roughness: 0.35,
                emissive: new THREE.Color(0x111e33),
                emissiveIntensity: 0.45,
                transparent: true,
                opacity: 0.8
            })
        );
        emissivePlane.rotation.x = -Math.PI / 2;
        emissivePlane.position.y = -120;
        emissivePlane.receiveShadow = true;
        scene.add(emissivePlane);

        const volumetricCone = new THREE.Mesh(
            new THREE.ConeGeometry(300, 520, 48, 1, true),
            new THREE.MeshBasicMaterial({
                color: 0xbf5700,
                transparent: true,
                opacity: 0.04,
                depthWrite: false
            })
        );
        volumetricCone.rotation.x = -Math.PI / 2;
        volumetricCone.position.y = 160;
        volumetricCone.renderOrder = -1;
        scene.add(volumetricCone);

        const dataTypes = [
            { label: 'Baseball', color: new THREE.Color('#BF5700'), flowBias: 1.12 },
            { label: 'Football', color: new THREE.Color('#0C2340'), flowBias: 0.92 },
            { label: 'Basketball', color: new THREE.Color('#97233F'), flowBias: 1.0 },
            { label: 'Track & Field', color: new THREE.Color('#FFB81C'), flowBias: 1.18 }
        ];

        const particleCount = window.innerWidth > 1200 ? 14000 : 9000;
        const baseGeometry = new THREE.IcosahedronGeometry(2.1, 0);
        const particleMaterial = new THREE.MeshPhysicalMaterial({
            metalness: 0.85,
            roughness: 0.25,
            clearcoat: 0.7,
            clearcoatRoughness: 0.25,
            transmission: 0.05,
            reflectivity: 0.6,
            emissive: new THREE.Color(0x4a1a00),
            emissiveIntensity: 0.4,
            toneMapped: true
        });

        const particleMesh = new THREE.InstancedMesh(baseGeometry, particleMaterial, particleCount);
        particleMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        particleMesh.castShadow = true;
        scene.add(particleMesh);

        if (!particleMesh.instanceColor) {
            particleMesh.instanceColor = new THREE.InstancedBufferAttribute(
                new Float32Array(particleCount * 3),
                3
            );
        }

        const trailsGeometry = new THREE.BufferGeometry();
        const trailPositions = new Float32Array(particleCount * 6);
        const trailColors = new Float32Array(particleCount * 6);
        trailsGeometry.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
        trailsGeometry.setAttribute('color', new THREE.BufferAttribute(trailColors, 3));
        const trailMaterial = new THREE.LineBasicMaterial({
            vertexColors: true,
            transparent: true,
            opacity: 0.32,
            blending: THREE.AdditiveBlending
        });
        const trails = new THREE.LineSegments(trailsGeometry, trailMaterial);
        trails.frustumCulled = false;
        scene.add(trails);

        const positions = new Float32Array(particleCount * 3);
        const velocities = new Float32Array(particleCount * 3);
        const offsets = new Float32Array(particleCount);
        const previousPositions = new Float32Array(particleCount * 3);
        const types = new Uint8Array(particleCount);

        const dummy = new THREE.Object3D();
        const color = new THREE.Color();

        for (let i = 0; i < particleCount; i++) {
            const typeIndex = i % dataTypes.length;
            const radius = 180 + Math.random() * 160;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);

            const x = radius * Math.sin(phi) * Math.cos(theta);
            const y = (Math.random() - 0.5) * 220;
            const z = radius * Math.sin(phi) * Math.sin(theta);

            const i3 = i * 3;
            positions[i3] = x;
            positions[i3 + 1] = y;
            positions[i3 + 2] = z;

            previousPositions[i3] = x;
            previousPositions[i3 + 1] = y;
            previousPositions[i3 + 2] = z;

            velocities[i3] = (Math.random() - 0.5) * 0.35;
            velocities[i3 + 1] = (Math.random() - 0.5) * 0.25;
            velocities[i3 + 2] = (Math.random() - 0.5) * 0.35;

            offsets[i] = Math.random() * 1000;
            types[i] = typeIndex;

            dummy.position.set(x, y, z);
            const scale = 0.6 + Math.random() * 0.9;
            dummy.scale.set(scale, scale, scale);
            dummy.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
            dummy.updateMatrix();
            particleMesh.setMatrixAt(i, dummy.matrix);

            color.copy(dataTypes[typeIndex].color);
            if (particleMesh.instanceColor) {
                particleMesh.instanceColor.setXYZ(i, color.r, color.g, color.b);
            }

            const ci = i * 6;
            trailColors[ci] = color.r;
            trailColors[ci + 1] = color.g;
            trailColors[ci + 2] = color.b;
            trailColors[ci + 3] = color.r * 0.4;
            trailColors[ci + 4] = color.g * 0.4;
            trailColors[ci + 5] = color.b * 0.4;
        }

        particleMesh.instanceMatrix.needsUpdate = true;
        if (particleMesh.instanceColor) {
            particleMesh.instanceColor.needsUpdate = true;
        }
        trailsGeometry.attributes.color.needsUpdate = true;

        const pointerState = {
            active: false,
            world: new THREE.Vector3(),
            radius: 110,
            lastActive: performance.now()
        };
        const pointerVec = new THREE.Vector2();
        const raycaster = new THREE.Raycaster();
        const pointerPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);

        function updatePointer(clientX, clientY) {
            pointerVec.x = (clientX / window.innerWidth) * 2 - 1;
            pointerVec.y = -(clientY / window.innerHeight) * 2 + 1;
            raycaster.setFromCamera(pointerVec, camera);
            raycaster.ray.intersectPlane(pointerPlane, pointerState.world);
            pointerState.active = true;
            pointerState.lastActive = performance.now();
        }

        const pointerHandler = (event) => {
            if (event.touches && event.touches[0]) {
                updatePointer(event.touches[0].clientX, event.touches[0].clientY);
            } else if (typeof event.clientX === 'number') {
                updatePointer(event.clientX, event.clientY);
            }
        };

        const impulseVector = new THREE.Vector3();
        function injectImpulse(strength) {
            for (let i = 0; i < particleCount; i++) {
                const i3 = i * 3;
                impulseVector.set(positions[i3], positions[i3 + 1], positions[i3 + 2]);
                impulseVector.sub(pointerState.world);
                const distance = impulseVector.length();
                if (distance < pointerState.radius * 1.2) {
                    const falloff = 1 - distance / (pointerState.radius * 1.2);
                    impulseVector.normalize().multiplyScalar(-strength * falloff);
                    velocities[i3] += impulseVector.x;
                    velocities[i3 + 1] += impulseVector.y;
                    velocities[i3 + 2] += impulseVector.z;
                }
            }
        }

        const pointerLeaveHandler = () => {
            pointerState.active = false;
        };
        const pointerDownHandler = (event) => {
            pointerHandler(event);
            injectImpulse(2.4);
        };
        const touchStartHandler = (event) => {
            pointerHandler(event);
            injectImpulse(2.0);
        };

        window.addEventListener('pointermove', pointerHandler, { passive: true });
        window.addEventListener('touchmove', pointerHandler, { passive: true });
        window.addEventListener('pointerleave', pointerLeaveHandler);
        window.addEventListener('pointerdown', pointerDownHandler);
        window.addEventListener('touchstart', touchStartHandler);

        const clock = new THREE.Clock();
        const tempVec = new THREE.Vector3();
        const flowVec = new THREE.Vector3();
        const pointerInfluence = new THREE.Vector3();
        const boundary = 320;
        let animationId = null;
        let running = true;

        const dayColor = new THREE.Color(0x0a0a10);
        const duskColor = new THREE.Color(0x1c0905);
        const dawnColor = new THREE.Color(0x05142b);

        function computeFlow(pos, time, typeIndex, seed) {
            const bias = dataTypes[typeIndex].flowBias;
            const frequency = 0.012 * bias;
            const t = time * 0.35 + seed * 0.05;

            flowVec.set(
                Math.sin(pos.y * frequency + t) * 0.6 + Math.cos((pos.z + seed) * frequency * 1.4 + t) * 0.4,
                Math.cos(pos.x * frequency * 0.7 + t * 0.6) * 0.5 + Math.sin((pos.z - seed) * frequency + t) * 0.3,
                Math.sin((pos.x + pos.y) * frequency * 0.5 + t * 0.9) * 0.7
            );

            return flowVec;
        }

        function animate() {
            if (!running) {
                return;
            }

            animationId = requestAnimationFrame(animate);
            const elapsed = clock.getElapsedTime();

            const dayCycle = (elapsed % 120) / 120;
            const duskMix = 0.5 + 0.5 * Math.sin(dayCycle * Math.PI * 2);
            ambientLight.color.copy(dawnColor).lerp(dayColor, duskMix);
            fillLight.intensity = 0.8 + 0.4 * Math.sin(dayCycle * Math.PI * 2);
            rimLight.intensity = 1.0 + 0.3 * Math.cos(dayCycle * Math.PI * 2);
            scene.fog.color.copy(dawnColor).lerp(duskColor, duskMix * 0.8);
            bloomPass.strength = 0.8 + 0.35 * Math.sin(elapsed * 0.4);
            bokehPass.uniforms.focus.value = 300 + 40 * Math.sin(elapsed * 0.3);
            bokehPass.uniforms.aperture.value = pointerState.active ? 0.00025 : 0.00012;
            filmGrainPass.uniforms.time.value = elapsed * 2.0;
            filmGrainPass.uniforms.intensity.value = 0.12 + 0.04 * Math.sin(elapsed * 0.6);
            chromaticAberrationPass.uniforms.offset.value.set(
                0.0012 + (pointerState.active ? 0.0008 : 0),
                0.0012
            );

            if (performance.now() - pointerState.lastActive > 1200) {
                pointerState.active = false;
            }

            const matrix = new THREE.Matrix4();
            const rotation = new THREE.Euler();

            for (let i = 0; i < particleCount; i++) {
                const i3 = i * 3;
                const typeIndex = types[i];

                tempVec.set(positions[i3], positions[i3 + 1], positions[i3 + 2]);
                const flow = computeFlow(tempVec, elapsed, typeIndex, offsets[i]);

                velocities[i3] += flow.x * 0.015;
                velocities[i3 + 1] += flow.y * 0.015;
                velocities[i3 + 2] += flow.z * 0.015;

                if (pointerState.active) {
                    pointerInfluence.copy(pointerState.world).sub(tempVec);
                    const distance = pointerInfluence.length();
                    if (distance < pointerState.radius) {
                        const weight = (1 - distance / pointerState.radius) * 0.05;
                        pointerInfluence.normalize().multiplyScalar(weight);
                        velocities[i3] += pointerInfluence.x;
                        velocities[i3 + 1] += pointerInfluence.y;
                        velocities[i3 + 2] += pointerInfluence.z;
                    }
                }

                const speed = Math.sqrt(
                    velocities[i3] * velocities[i3] +
                        velocities[i3 + 1] * velocities[i3 + 1] +
                        velocities[i3 + 2] * velocities[i3 + 2]
                );
                const maxSpeed = 2.4;
                if (speed > maxSpeed) {
                    const scale = maxSpeed / speed;
                    velocities[i3] *= scale;
                    velocities[i3 + 1] *= scale;
                    velocities[i3 + 2] *= scale;
                }

                velocities[i3] *= 0.985;
                velocities[i3 + 1] *= 0.985;
                velocities[i3 + 2] *= 0.985;

                positions[i3] += velocities[i3];
                positions[i3 + 1] += velocities[i3 + 1];
                positions[i3 + 2] += velocities[i3 + 2];

                if (positions[i3] > boundary || positions[i3] < -boundary) {
                    positions[i3] *= -0.92;
                }
                if (positions[i3 + 1] > boundary * 0.7 || positions[i3 + 1] < -boundary * 0.7) {
                    positions[i3 + 1] *= -0.92;
                }
                if (positions[i3 + 2] > boundary || positions[i3 + 2] < -boundary) {
                    positions[i3 + 2] *= -0.92;
                }

                rotation.set(
                    velocities[i3 + 1] * 0.05,
                    velocities[i3 + 2] * 0.05,
                    velocities[i3] * 0.05
                );

                matrix.identity();
                matrix.makeRotationFromEuler(rotation);
                matrix.setPosition(positions[i3], positions[i3 + 1], positions[i3 + 2]);
                particleMesh.setMatrixAt(i, matrix);

                const trailIndex = i * 6;
                trailPositions[trailIndex] = positions[i3];
                trailPositions[trailIndex + 1] = positions[i3 + 1];
                trailPositions[trailIndex + 2] = positions[i3 + 2];
                trailPositions[trailIndex + 3] = previousPositions[i3];
                trailPositions[trailIndex + 4] = previousPositions[i3 + 1];
                trailPositions[trailIndex + 5] = previousPositions[i3 + 2];

                previousPositions[i3] = positions[i3];
                previousPositions[i3 + 1] = positions[i3 + 1];
                previousPositions[i3 + 2] = positions[i3 + 2];
            }

            particleMesh.instanceMatrix.needsUpdate = true;
            trailsGeometry.attributes.position.needsUpdate = true;

            composer.render();
        }

        function handleResize() {
            const width = window.innerWidth;
            const height = window.innerHeight;
            renderer.setSize(width, height);
            camera.aspect = width / height;
            camera.updateProjectionMatrix();
            composer.setSize(width, height);
            bloomPass.setSize(width, height);
            bokehPass.setSize(width, height);
            if (fxaaPass) {
                fxaaPass.material.uniforms['resolution'].value.set(
                    1 / (width * renderer.getPixelRatio()),
                    1 / (height * renderer.getPixelRatio())
                );
            }
        }

        function handleVisibilityChange() {
            if (document.hidden) {
                running = false;
                if (animationId) {
                    cancelAnimationFrame(animationId);
                    animationId = null;
                }
            } else if (!running) {
                running = true;
                clock.getElapsedTime();
                animate();
            }
        }

        window.addEventListener('resize', handleResize);
        document.addEventListener('visibilitychange', handleVisibilityChange);

        canvas.__blazeCleanup = () => {
            running = false;
            if (animationId) {
                cancelAnimationFrame(animationId);
                animationId = null;
            }
            window.removeEventListener('resize', handleResize);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('pointermove', pointerHandler);
            window.removeEventListener('touchmove', pointerHandler);
            window.removeEventListener('pointerleave', pointerLeaveHandler);
            window.removeEventListener('pointerdown', pointerDownHandler);
            window.removeEventListener('touchstart', touchStartHandler);
            renderer.dispose();
            baseGeometry.dispose();
            particleMaterial.dispose();
            trailsGeometry.dispose();
            trailMaterial.dispose();
        };

        animate();
    }

    function register() {
        window.blazeAdvancedVisuals = {
            init: advancedParticleSystem
        };
        window.initParticles = advancedParticleSystem;
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', register, { once: true });
    } else {
        register();
    }
})();
