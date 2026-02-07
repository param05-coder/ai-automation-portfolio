// Initialize Three.js Background
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x030303, 0.05); // Add Fog for depth

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });

renderer.setSize(window.innerWidth, window.innerHeight);
document.getElementById('canvas-container').appendChild(renderer.domElement);

// Create Unified Particle System (Mixed Sizes)
const geometry = new THREE.BufferGeometry();
const count = 8000; // DOUBLED DENSITY
const posArray = new Float32Array(count * 3);
const sizesArray = new Float32Array(count); 

for(let i = 0; i < count; i++) {
    // Random Position (Huge spread)
    posArray[i * 3] = (Math.random() - 0.5) * 40;      // X (Wider)
    posArray[i * 3 + 1] = (Math.random() - 0.5) * 60;  // Y (Tall)
    posArray[i * 3 + 2] = (Math.random() - 0.5) * 40;  // Z (Deep)
    
    // Random Size (Variance)
    const r = Math.random();
    if (r > 0.95) {
        sizesArray[i] = Math.random() * 0.3 + 0.1; // Huge Bokeh (0.1 - 0.4)
    } else if (r > 0.8) {
        sizesArray[i] = Math.random() * 0.1 + 0.05; // Medium
    } else {
        sizesArray[i] = Math.random() * 0.03 + 0.005; // Tiny Dust
    }
}

geometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
geometry.setAttribute('aScale', new THREE.BufferAttribute(sizesArray, 1)); // Custom attribute

// Custom Shader Material for Variable Sizes
const material = new THREE.ShaderMaterial({
    uniforms: {
        color: { value: new THREE.Color(0x00f3ff) }
    },
    vertexShader: `
        attribute float aScale;
        varying float vAlpha; // Pass alpha to fragment shader
        void main() {
            vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
            gl_PointSize = aScale * ( 300.0 / - mvPosition.z );
            gl_Position = projectionMatrix * mvPosition;
            
            // Calculate Alpha based on distance (Z-depth)
            // Closer = brighter, Further = dimmer
            float distance = -mvPosition.z;
            vAlpha = clamp(1.0 - (distance / 50.0), 0.1, 1.0); // Fade out at distance 50
        }
    `,
    fragmentShader: `
        uniform vec3 color;
        varying float vAlpha;
        void main() {
            // Square shape (Tech/Pixel look)
            gl_FragColor = vec4( color, vAlpha * 0.6 ); 
        }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending
});

const particlesMesh = new THREE.Points(geometry, material);
scene.add(particlesMesh);

// Remove old separate meshes
// (Cleanup handled by replacement)

camera.position.z = 5;

// Mouse Interaction
let mouseX = 0;
let mouseY = 0;

document.addEventListener('mousemove', (event) => {
    mouseX = event.clientX / window.innerWidth - 0.5;
    mouseY = event.clientY / window.innerHeight - 0.5;
});

// Animation Loop (Continuous Physics)
const clock = new THREE.Clock();

function animate() {
    const elapsedTime = clock.getElapsedTime();
    const scrollY = window.scrollY;
    const maxScroll = document.body.scrollHeight - window.innerHeight;
    const scrollPercent = scrollY / maxScroll; // 0 to 1

    // 1. Rotation (Continuous Twist)
    // Starts slow, gets faster and more twisted as you scroll
    const targetRotX = (scrollPercent * Math.PI * 0.8) + (elapsedTime * 0.02) + (mouseY * 0.2); // Added Mouse Y influence
    const targetRotY = (mouseX * 0.5) + (elapsedTime * 0.02); // Stronger Mouse X influence
    const targetRotZ = scrollPercent * 0.5; // Slight tilt at bottom

    // 2. Position (Continuous Dive)
    // Moves from Z=3 (Hero) to Z=6 (Bottom) smoothly
    const targetZ = 3 + (scrollPercent * 3);
    
    // 3. Vortex Floor Effect (Smooth Blend)
    // Only starts applying heavily near bottom (using power curve)
    const vortexStrength = Math.pow(scrollPercent, 3); // 0 at top, 1 at bottom
    const targetY = (Math.sin(elapsedTime * 0.5) * 0.1) - (vortexStrength * 2);

    // Apply Soft Physics (Lerp everything)
    particlesMesh.rotation.x = THREE.MathUtils.lerp(particlesMesh.rotation.x, targetRotX, 0.1);
    particlesMesh.rotation.y = THREE.MathUtils.lerp(particlesMesh.rotation.y, targetRotY, 0.1);
    particlesMesh.rotation.z = THREE.MathUtils.lerp(particlesMesh.rotation.z, targetRotZ, 0.1);
    
    particlesMesh.position.z = THREE.MathUtils.lerp(particlesMesh.position.z, targetZ, 0.1);
    particlesMesh.position.y = THREE.MathUtils.lerp(particlesMesh.position.y, targetY, 0.1);

    renderer.render(scene, camera);
    requestAnimationFrame(animate);
}

animate();

// Resize Handler
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Start Engine Interaction
document.querySelector('.btn-primary').addEventListener('click', (e) => {
    e.preventDefault();
    document.querySelector('#contact').scrollIntoView({ behavior: 'smooth' });
    
    // Pulse Button Animation only
    const connectBtn = document.querySelector('.btn-large');
    setTimeout(() => {
        connectBtn.classList.add('pulse-active');
        setTimeout(() => connectBtn.classList.remove('pulse-active'), 3000);
    }, 1000);
});

// Force Scroll to Top on Load (Robust Fix)
function forceReset() {
    if ('scrollRestoration' in history) {
        history.scrollRestoration = 'manual';
    }
    window.scrollTo(0, 0);
    document.body.scrollTop = 0;
    document.documentElement.scrollTop = 0;
    
    // Clear URL fragment if present (e.g. #services) without reload
    if (window.location.hash) {
        history.replaceState(null, null, ' ');
    }
}

// Run immediately
forceReset();

// Run again on load to beat browser race conditions
window.addEventListener('load', () => {
    forceReset();
    setTimeout(forceReset, 100); // Triple check
});

// GSAP Animations
gsap.registerPlugin(ScrollTrigger);

gsap.from("h1", {
    duration: 1.5,
    y: 100,
    opacity: 0,
    ease: "power4.out"
});

gsap.utils.toArray(".card").forEach((card, i) => {
    gsap.from(card, {
        scrollTrigger: {
            trigger: card,
            start: "top 80%",
        },
        y: 50,
        opacity: 0,
        duration: 1,
        delay: i * 0.2
    });
});

// 3D Tilt Effect (Wrapper Logic)
const wrappers = document.querySelectorAll('.card-wrapper');

wrappers.forEach(wrapper => {
    const card = wrapper.querySelector('.card');
    let currentX = 0, currentY = 0;
    let targetX = 0, targetY = 0;
    let isHovering = false;

    // Listen on WRAPPER (Static), Transform CARD (Dynamic)
    wrapper.addEventListener('mousemove', (e) => {
        isHovering = true;
        const rect = wrapper.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        
        targetX = ((y - centerY) / centerY) * -10;
        targetY = ((x - centerX) / centerX) * 10;
    });

    wrapper.addEventListener('mouseleave', () => {
        isHovering = false;
        targetX = 0;
        targetY = 0;
    });

    // Physics Loop
    function updatePhysics() {
        const lerpFactor = 0.1; 
        currentX += (targetX - currentX) * lerpFactor;
        currentY += (targetY - currentY) * lerpFactor;
        
        const isMoving = Math.abs(targetX - currentX) > 0.01 || Math.abs(targetY - currentY) > 0.01;
        
        if (isMoving || isHovering) {
            card.style.transform = `perspective(1000px) rotateX(${currentX.toFixed(2)}deg) rotateY(${currentY.toFixed(2)}deg) scale3d(1.02, 1.02, 1.02)`;
            requestAnimationFrame(updatePhysics);
        } else {
            card.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`;
        }
    }

    wrapper.addEventListener('mouseenter', () => {
        isHovering = true;
        requestAnimationFrame(updatePhysics);
    });
});
