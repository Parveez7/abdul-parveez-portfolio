import React, { useRef, useEffect, useState, useCallback } from 'react'
import * as THREE from 'three'
import gsap from 'gsap'
import { SITE } from '../../config/site'
import { SOCIAL_LINKS } from '../../data/socials'
import { createSocialTextures } from '../../utils/socialTextures'
import { useSmoothScroll } from '../../context/SmoothScrollContext'
import { useSectionScrollTrigger } from '../../hooks/useSectionScrollTrigger'
import avatarCutoutUrl from '../../assets/socials/avatar-cutout.webp'
import './Connect.css'

const CURRENT_YEAR = new Date().getFullYear()

export default function Connect() {
  const sectionRef = useRef(null)
  const canvasRef = useRef(null)
  const containerRef = useRef(null)
  const overlayRef = useRef(null)
  const hintRef = useRef(null)

  const { scrollTo } = useSmoothScroll()
  useSectionScrollTrigger(sectionRef, { id: 'contact', theme: 'dark', index: '06' })

  // Interactive tooltip state
  const [activeTooltip, setActiveTooltip] = useState(null)
  const [isColorForced, setIsColorForced] = useState(false)
  const [hasInteracted, setHasInteracted] = useState(false)

  // Internal mutable refs for 3D state
  const stateRef = useRef({
    hoveredIndex: -1,
    orbitSpeed: 0.12,
    targetSpeed: 0.12,
    angle: 0,
    mouse: new THREE.Vector2(-999, -999),
    raycaster: new THREE.Raycaster(),
    tiles: [],
    avatarUniforms: null,
    isHoveringAvatar: false,
    camera: null,
    scene: null,
    renderer: null,
    animFrameId: null,
    isDestroyed: false,
  })

  // Smooth scroll back to top
  const handleBackToTop = useCallback((e) => {
    e.preventDefault()
    scrollTo('#hero', { duration: 1.8 })
  }, [scrollTo])

  // Toggle avatar color (for accessibility & touch)
  const toggleAvatarColor = useCallback(() => {
    setHasInteracted(true)
    setIsColorForced((prev) => {
      const next = !prev
      const u = stateRef.current.avatarUniforms
      if (u) {
        gsap.to(u.uHover, {
          value: next ? 1.0 : 0.0,
          duration: 0.7,
          ease: 'power2.out',
        })
      }
      return next
    })
  }, [])

  // Initialize Three.js scene
  useEffect(() => {
    const container = containerRef.current
    const canvas = canvasRef.current
    if (!container || !canvas) return

    const state = stateRef.current
    state.isDestroyed = false

    const width = container.clientWidth
    const height = container.clientHeight

    // Scene & Camera
    const scene = new THREE.Scene()
    state.scene = scene

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100)
    camera.position.set(0, 0, 7.5)
    state.camera = camera

    // Renderer with high quality & alpha support
    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(width, height)
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.05
    state.renderer = renderer

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85)
    scene.add(ambientLight)

    const keyLight = new THREE.DirectionalLight(0xfff7e6, 2.4)
    keyLight.position.set(4, 3, 5)
    scene.add(keyLight)

    const rimLight = new THREE.DirectionalLight(0x90b4e8, 1.8)
    rimLight.position.set(-4, 3, -3)
    scene.add(rimLight)

    const frontFill = new THREE.DirectionalLight(0xffffff, 0.6)
    frontFill.position.set(0, -3, 3)
    scene.add(frontFill)

    // Layout configuration
    const isMobile = width < 900
    const avatarX = isMobile ? 0 : 1.75
    const avatarY = isMobile ? -0.85 : -0.7
    const headCenterX = avatarX
    const headCenterY = isMobile ? 0.35 : 0.55

    // -------------------------------------------------------------
    // 1. Avatar Plane with custom B&W to radial color wipe shader
    // -------------------------------------------------------------
    const textureLoader = new THREE.TextureLoader()
    const avatarTexture = textureLoader.load(avatarCutoutUrl, () => {
      if (renderer && scene && camera) {
        renderer.render(scene, camera)
      }
    })
    avatarTexture.colorSpace = THREE.SRGBColorSpace

    const avatarPlaneHeight = isMobile ? 3.4 : 3.8
    const avatarAspect = 1024 / 576
    const avatarPlaneWidth = avatarPlaneHeight * avatarAspect

    const avatarUniforms = {
      uTexture: { value: avatarTexture },
      uCursor: { value: new THREE.Vector2(0.5, 0.5) },
      uHover: { value: 0.0 },
      uAspect: { value: avatarAspect },
      uTime: { value: 0 },
    }
    state.avatarUniforms = avatarUniforms

    const avatarMaterial = new THREE.ShaderMaterial({
      uniforms: avatarUniforms,
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec2 vUv;
        uniform sampler2D uTexture;
        uniform vec2 uCursor;
        uniform float uHover;
        uniform float uAspect;
        uniform float uTime;

        void main() {
          vec4 tex = texture2D(uTexture, vUv);
          if (tex.a < 0.05) discard;

          // Editorial monochrome tone
          float luma = dot(tex.rgb, vec3(0.299, 0.587, 0.114));
          vec3 bw = vec3(luma * 1.02, luma * 0.99, luma * 0.95);

          // Radial wipe from cursor
          vec2 delta = (vUv - uCursor) * vec2(uAspect, 1.0);
          float dist = length(delta);
          float maxRadius = 1.6;
          float currentRadius = uHover * maxRadius;
          float edgeWidth = 0.08;

          float wipe = smoothstep(currentRadius + edgeWidth, currentRadius - edgeWidth, dist);

          // Subtle warm amber rim light at the wave edge
          float rim = smoothstep(0.0, edgeWidth, dist - (currentRadius - edgeWidth)) *
                      smoothstep(edgeWidth * 2.0, edgeWidth, dist - (currentRadius - edgeWidth));
          vec3 amberGlow = vec3(0.95, 0.55, 0.25) * rim * uHover * 1.35;

          vec3 finalColor = mix(bw, tex.rgb, wipe) + amberGlow * tex.a;

          // Soft bottom vignette fade
          float bottomFade = smoothstep(0.0, 0.12, vUv.y);

          gl_FragColor = vec4(finalColor, tex.a * bottomFade);
        }
      `,
      transparent: true,
      depthTest: true,
      depthWrite: true,
      side: THREE.DoubleSide,
    })

    const avatarMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(avatarPlaneWidth, avatarPlaneHeight),
      avatarMaterial
    )
    avatarMesh.position.set(avatarX, avatarY, 0)
    scene.add(avatarMesh)

    // -------------------------------------------------------------
    // 2. 3D Orbiting Ceramic Tiles
    // -------------------------------------------------------------
    const orbitGroup = new THREE.Group()
    orbitGroup.position.set(headCenterX, headCenterY, 0)
    // Tilt the orbit ring elegantly (as in the design reference)
    orbitGroup.rotation.z = -0.16
    orbitGroup.rotation.x = 0.32
    scene.add(orbitGroup)

    const orbitRadiusX = isMobile ? 1.65 : 2.15
    const orbitRadiusY = isMobile ? 0.75 : 0.95

    // Orbit visual dashed curve
    const ellipseCurve = new THREE.EllipseCurve(
      0, 0,
      orbitRadiusX, orbitRadiusY,
      0, 2 * Math.PI,
      false, 0
    )
    const curvePoints = ellipseCurve.getPoints(90)
    const orbitTrackGeo = new THREE.BufferGeometry().setFromPoints(
      curvePoints.map((p) => new THREE.Vector3(p.x, p.y, 0))
    )
    const orbitTrackMat = new THREE.LineDashedMaterial({
      color: 0xffffff,
      dashSize: 0.08,
      gapSize: 0.08,
      opacity: 0.22,
      transparent: true,
      depthTest: true,
    })
    const orbitTrackLine = new THREE.Line(orbitTrackGeo, orbitTrackMat)
    orbitTrackLine.computeLineDistances()
    orbitGroup.add(orbitTrackLine)

    // Tiny glowing beads along orbit
    const beadGeo = new THREE.SphereGeometry(0.024, 12, 12)
    const beadMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      opacity: 0.45,
      transparent: true,
    })
    for (let i = 0; i < 6; i++) {
      const bead = new THREE.Mesh(beadGeo, beadMat)
      const bAngle = (i / 6) * Math.PI * 2 + 0.3
      bead.position.set(
        Math.cos(bAngle) * orbitRadiusX,
        Math.sin(bAngle) * orbitRadiusY,
        0
      )
      orbitGroup.add(bead)
    }

    // Extruded rounded tile geometry (solid dark ceramic)
    const tileW = 0.58
    const tileH = 0.58
    const tileRadius = 0.13
    const tileShape = new THREE.Shape()
    const tx = -tileW / 2
    const ty = -tileH / 2

    tileShape.moveTo(tx + tileRadius, ty)
    tileShape.lineTo(tx + tileW - tileRadius, ty)
    tileShape.quadraticCurveTo(tx + tileW, ty, tx + tileW, ty + tileRadius)
    tileShape.lineTo(tx + tileW, ty + tileH - tileRadius)
    tileShape.quadraticCurveTo(tx + tileW, ty + tileH, tx + tileW - tileRadius, ty + tileH)
    tileShape.lineTo(tx + tileRadius, ty + tileH)
    tileShape.quadraticCurveTo(tx, ty + tileH, tx, ty + tileH - tileRadius)
    tileShape.lineTo(tx, ty + tileRadius)
    tileShape.quadraticCurveTo(tx, ty, tx + tileRadius, ty)

    const extrudeSettings = {
      steps: 1,
      depth: 0.09,
      bevelEnabled: true,
      bevelThickness: 0.035,
      bevelSize: 0.035,
      bevelOffset: 0,
      bevelSegments: 4,
    }
    const tileGeometry = new THREE.ExtrudeGeometry(tileShape, extrudeSettings)
    tileGeometry.center()

    // Ceramic body material (NO frosted glass, NO backdrop filter)
    const ceramicMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x161619,
      roughness: 0.22,
      metalness: 0.08,
      clearcoat: 0.9,
      clearcoatRoughness: 0.12,
      reflectivity: 0.6,
      depthTest: true,
      depthWrite: true,
    })

    // Generate canvas textures for the 5 icons
    const textures = createSocialTextures()
    const tiles = []
    const totalItems = SOCIAL_LINKS.length

    SOCIAL_LINKS.forEach((item, index) => {
      const container = new THREE.Group()

      // 3D ceramic tile mesh
      const mesh = new THREE.Mesh(tileGeometry, ceramicMaterial)
      container.add(mesh)

      // Front icon face plane
      const faceTex = textures[item.id]
      if (faceTex) {
        const faceGeo = new THREE.PlaneGeometry(tileW * 0.94, tileH * 0.94)
        const faceMat = new THREE.MeshStandardMaterial({
          map: faceTex,
          transparent: true,
          roughness: 0.25,
          metalness: 0.05,
          depthTest: true,
          depthWrite: true,
        })
        const faceMesh = new THREE.Mesh(faceGeo, faceMat)
        faceMesh.position.z = 0.085
        container.add(faceMesh)
      }

      orbitGroup.add(container)

      tiles.push({
        id: item.id,
        index,
        data: item,
        container,
        mesh,
        baseAngle: (index / totalItems) * Math.PI * 2,
        currentScale: 1,
        targetScale: 1,
        currentZOffset: 0,
        targetZOffset: 0,
      })
    })
    state.tiles = tiles

    // -------------------------------------------------------------
    // 3. Pointer move & Raycasting
    // -------------------------------------------------------------
    const tempVec3 = new THREE.Vector3()

    const handlePointerMove = (e) => {
      const rect = container.getBoundingClientRect()
      const clientX = e.clientX - rect.left
      const clientY = e.clientY - rect.top

      state.mouse.x = (clientX / rect.width) * 2 - 1
      state.mouse.y = -(clientY / rect.height) * 2 + 1

      // Subtle parallax on avatar
      if (!isMobile) {
        const tiltX = (state.mouse.y * 0.03).toFixed(4)
        const tiltY = (state.mouse.x * 0.04).toFixed(4)
        gsap.to(avatarMesh.rotation, {
          x: tiltX,
          y: tiltY,
          duration: 0.5,
          ease: 'power1.out',
        })
      }

      // Check raycast against avatar for radial wipe
      state.raycaster.setFromCamera(state.mouse, camera)
      const avatarHits = state.raycaster.intersectObject(avatarMesh)

      if (avatarHits.length > 0) {
        state.isHoveringAvatar = true
        const hit = avatarHits[0]
        if (hit.uv) {
          avatarUniforms.uCursor.value.set(hit.uv.x, hit.uv.y)
        }
        if (!isColorForced) {
          gsap.to(avatarUniforms.uHover, {
            value: 1.0,
            duration: 0.7,
            ease: 'power2.out',
            overwrite: 'auto',
          })
        }
      } else if (state.isHoveringAvatar && !isColorForced) {
        state.isHoveringAvatar = false
        gsap.to(avatarUniforms.uHover, {
          value: 0.0,
          duration: 0.6,
          ease: 'power2.inOut',
          overwrite: 'auto',
        })
      }

      // Check raycast against social tiles
      const tileMeshes = tiles.map((t) => t.mesh)
      const tileHits = state.raycaster.intersectObjects(tileMeshes)

      if (tileHits.length > 0) {
        const hitMesh = tileHits[0].object
        const hitTileIndex = tiles.findIndex((t) => t.mesh === hitMesh)
        if (hitTileIndex !== -1) {
          setHoveredTile(hitTileIndex)
          return
        }
      }

      // If not hovering any tile, clear hover unless focused via keyboard
      if (state.hoveredIndex !== -1 && !document.activeElement?.classList.contains('connect__social-anchor')) {
        setHoveredTile(-1)
      }
    }

    const handlePointerLeave = () => {
      state.mouse.set(-999, -999)
      if (!isColorForced) {
        state.isHoveringAvatar = false
        gsap.to(avatarUniforms.uHover, {
          value: 0.0,
          duration: 0.6,
          ease: 'power2.inOut',
          overwrite: 'auto',
        })
      }
      setHoveredTile(-1)
    }

    // Set active tile hover
    const setHoveredTile = (index) => {
      state.hoveredIndex = index
      if (index !== -1) {
        state.targetSpeed = 0.0 // Pause rotation on hover
        container.style.cursor = 'pointer'
        const tile = tiles[index]
        tile.targetScale = 1.16
        tile.targetZOffset = 0.35

        // Tooltip screen position
        tile.container.getWorldPosition(tempVec3)
        tempVec3.project(camera)
        const sx = (tempVec3.x * 0.5 + 0.5) * rectWidth()
        const sy = (-(tempVec3.y * 0.5) + 0.5) * rectHeight()
        setActiveTooltip({
          label: tile.data.label,
          handle: tile.data.handle,
          x: sx,
          y: sy,
        })
      } else {
        state.targetSpeed = 0.12 // Resume rotation
        container.style.cursor = 'default'
        tiles.forEach((t) => {
          t.targetScale = 1.0
          t.targetZOffset = 0.0
        })
        setActiveTooltip(null)
      }
    }

    // Tile click handler
    const handleClick = () => {
      if (state.hoveredIndex !== -1) {
        const tile = tiles[state.hoveredIndex]
        if (tile && tile.data.url) {
          if (tile.data.url.startsWith('mailto:')) {
            window.location.href = tile.data.url
          } else if (tile.data.url !== '#') {
            window.open(tile.data.url, '_blank', 'noopener,noreferrer')
          }
        }
      }
    }

    const rectWidth = () => container.clientWidth
    const rectHeight = () => container.clientHeight

    container.addEventListener('pointermove', handlePointerMove)
    container.addEventListener('pointerleave', handlePointerLeave)
    container.addEventListener('click', handleClick)

    // -------------------------------------------------------------
    // 4. Render & Animation Loop
    // -------------------------------------------------------------
    let clock = new THREE.Clock()

    const animate = () => {
      if (state.isDestroyed) return

      const delta = clock.getDelta()
      const time = clock.getElapsedTime()

      // Update shader idle time & breathing
      avatarUniforms.uTime.value = time
      const breathScale = 1.0 + Math.sin(time * 1.5) * 0.003
      avatarMesh.scale.set(breathScale, breathScale, 1.0)

      // Ease orbit rotation speed smoothly
      state.orbitSpeed += (state.targetSpeed - state.orbitSpeed) * 0.1
      state.angle += state.orbitSpeed * delta

      const cW = rectWidth()
      const cH = rectHeight()
      const overlayLinks = overlayRef.current?.children || []

      // Position tiles along ellipse
      tiles.forEach((t, i) => {
        const currentAngle = t.baseAngle + state.angle
        const x = Math.cos(currentAngle) * orbitRadiusX
        const y = Math.sin(currentAngle) * orbitRadiusY
        const z = t.currentZOffset

        // Ease scale and Z forward offset
        t.currentScale += (t.targetScale - t.currentScale) * 0.15
        t.currentZOffset += (t.targetZOffset - t.currentZOffset) * 0.15
        t.container.scale.set(t.currentScale, t.currentScale, t.currentScale)
        t.container.position.set(x, y, z)

        // Keep tiles gracefully facing camera while preserving gentle natural tilt
        t.container.lookAt(camera.position)

        // Project 3D world position to 2D HTML overlay elements for keyboard navigation
        t.container.getWorldPosition(tempVec3)
        tempVec3.project(camera)
        const screenX = (tempVec3.x * 0.5 + 0.5) * cW
        const screenY = (-(tempVec3.y * 0.5) + 0.5) * cH

        const anchor = overlayLinks[i]
        if (anchor) {
          anchor.style.transform = `translate3d(${screenX}px, ${screenY}px, 0) translate(-50%, -50%)`
        }

        // Keep tooltip synced if this tile is active
        if (state.hoveredIndex === i) {
          setActiveTooltip((prev) =>
            prev ? { ...prev, x: screenX, y: screenY } : null
          )
        }
      })

      renderer.render(scene, camera)
      state.animFrameId = requestAnimationFrame(animate)
    }

    animate()

    // -------------------------------------------------------------
    // 5. Window Resize Handler
    // -------------------------------------------------------------
    const handleResize = () => {
      if (!container || !renderer || !camera) return
      const w = container.clientWidth
      const h = container.clientHeight
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    }

    window.addEventListener('resize', handleResize)

    // Cleanup on unmount
    return () => {
      state.isDestroyed = true
      cancelAnimationFrame(state.animFrameId)
      window.removeEventListener('resize', handleResize)
      container.removeEventListener('pointermove', handlePointerMove)
      container.removeEventListener('pointerleave', handlePointerLeave)
      container.removeEventListener('click', handleClick)

      tileGeometry.dispose()
      ceramicMaterial.dispose()
      avatarMaterial.dispose()
      avatarTexture.dispose()
      renderer.dispose()
    }
  }, [isColorForced])

  // Handle accessible anchor focus
  const handleAnchorFocus = (index) => {
    const state = stateRef.current
    if (state.tiles[index]) {
      state.hoveredIndex = index
      state.targetSpeed = 0.0
      state.tiles[index].targetScale = 1.16
      state.tiles[index].targetZOffset = 0.35
      const tile = state.tiles[index]
      setActiveTooltip({
        label: tile.data.label,
        handle: tile.data.handle,
        x: 0,
        y: 0,
      })
    }
  }

  const handleAnchorBlur = (index) => {
    const state = stateRef.current
    if (state.hoveredIndex === index) {
      state.hoveredIndex = -1
      state.targetSpeed = 0.12
      if (state.tiles[index]) {
        state.tiles[index].targetScale = 1.0
        state.tiles[index].targetZOffset = 0.0
      }
      setActiveTooltip(null)
    }
  }

  return (
    <section
      ref={sectionRef}
      id="contact"
      data-theme="dark"
      className="connect-section"
      aria-label="Let's Connect"
    >
      {/* Background Decorative Hairline Arc (from design reference) */}
      <div className="connect__arc-deco" aria-hidden="true" />

      {/* Main Grid: Left Editorial Details + Right 3D Orbit Stage */}
      <div className="connect__container">
        {/* Left Column: Heading, Bio, CTAs */}
        <div className="connect__left">
          {/* Eyebrow: 06 | CONNECT */}
          <div className="connect__eyebrow">
            <span className="connect__eyebrow-num">06</span>
            <span className="connect__eyebrow-sep">/</span>
            <span className="connect__eyebrow-text">CONNECT</span>
          </div>

          {/* Heading: LET'S in heavy grotesk, Connect in italic serif */}
          <h2 className="connect__heading">
            <span className="connect__heading-grotesk">LET'S</span>
            <span className="connect__heading-serif">Connect</span>
          </h2>

          {/* 90px White Hairline Bar */}
          <div className="connect__hairline" aria-hidden="true" />

          {/* Supporting Statement */}
          <p className="connect__desc">
            Have an idea, a project, or just want to talk about AI, data, or building cool things? I'm always up for a good conversation.
          </p>

          {/* Two Action Pill Buttons */}
          <div className="connect__actions">
            <a
              href={`mailto:${SITE.email}`}
              className="connect__btn connect__btn--primary"
            >
              <svg
                className="connect__btn-icon"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
              <span>Send a Message</span>
            </a>

            <a
              href={SITE.calendarUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="connect__btn connect__btn--secondary"
            >
              <svg
                className="connect__btn-icon"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              <span>Book a Call</span>
            </a>
          </div>

          {/* Accessible Color Toggle Control */}
          <div className="connect__accessibility-controls">
            <button
              type="button"
              onClick={toggleAvatarColor}
              className={`connect__color-toggle ${isColorForced ? 'connect__color-toggle--active' : ''}`}
              aria-pressed={isColorForced}
              aria-label="Toggle avatar monochrome or full colour"
            >
              <span className="connect__color-toggle-dot" />
              <span>{isColorForced ? 'Avatar Colour: ON' : 'Toggle Avatar Colour'}</span>
            </button>
          </div>
        </div>

        {/* Right Column: 3D Three.js Interactive Orbit Stage */}
        <div ref={containerRef} className="connect__stage">
          <canvas ref={canvasRef} className="connect__canvas" />

          {/* First-time mobile / touch hint */}
          {!hasInteracted && (
            <div ref={hintRef} className="connect__touch-hint" aria-hidden="true">
              Hover or tap to reveal color
            </div>
          )}

          {/* Floating Tooltip for Hovered / Focused Tile */}
          {activeTooltip && (
            <div
              className="connect__tooltip"
              style={{
                left: `${activeTooltip.x}px`,
                top: `${activeTooltip.y - 56}px`,
              }}
              role="status"
              aria-live="polite"
            >
              <span className="connect__tooltip-label">{activeTooltip.label}</span>
              <span className="connect__tooltip-handle">{activeTooltip.handle}</span>
            </div>
          )}

          {/* Accessible HTML <a> overlay mapped to 3D projected screen coordinates */}
          <div ref={overlayRef} className="connect__overlay" aria-label="Social media profiles">
            {SOCIAL_LINKS.map((item, idx) => (
              <a
                key={item.id}
                href={item.url}
                target={item.url.startsWith('mailto:') ? '_self' : '_blank'}
                rel="noopener noreferrer"
                className="connect__social-anchor"
                aria-label={`Open ${item.label} profile (${item.handle})`}
                onFocus={() => handleAnchorFocus(idx)}
                onBlur={() => handleAnchorBlur(idx)}
              >
                <span className="sr-only">{item.label}</span>
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Footer Strip */}
      <footer className="connect__footer">
        <div className="connect__footer-container">
          <div className="connect__footer-brand">
            <span className="connect__footer-name">ABDUL PARVEEZ</span>
            <span className="connect__footer-tagline">AI Developer · Data Enthusiast · Builder</span>
          </div>

          <div className="connect__footer-right">
            <button
              type="button"
              onClick={handleBackToTop}
              className="connect__back-to-top"
              aria-label="Scroll back to top of the page"
            >
              <span className="connect__back-arrow">↑</span>
              <span>Back to Top</span>
            </button>
            <span className="connect__copyright">
              © {CURRENT_YEAR} Abdul Parveez
            </span>
          </div>
        </div>
      </footer>
    </section>
  )
}
