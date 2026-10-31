import * as THREE from 'three'

/**
 * Creates high-resolution canvas textures for the 3D ceramic social tiles.
 * Matches the reference image styling: dark ceramic tiles with crisp icons.
 */
export function createSocialTextures() {
  const textures = {}

  // Helper to create a 512x512 high-DPI canvas
  const createBaseCanvas = () => {
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 512
    const ctx = canvas.getContext('2d')
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    return { canvas, ctx }
  }

  // 1. Instagram Texture
  {
    const { canvas, ctx } = createBaseCanvas()

    // Base ceramic dark tone
    ctx.fillStyle = '#17171A'
    ctx.fillRect(0, 0, 512, 512)

    // Inner vibrant gradient badge
    const badgeSize = 340
    const badgeX = (512 - badgeSize) / 2
    const badgeY = (512 - badgeSize) / 2
    const radius = 80

    const grad = ctx.createLinearGradient(badgeX, badgeY + badgeSize, badgeX + badgeSize, badgeY)
    grad.addColorStop(0, '#f09433')
    grad.addColorStop(0.25, '#e6683c')
    grad.addColorStop(0.5, '#dc2743')
    grad.addColorStop(0.75, '#cc2366')
    grad.addColorStop(1, '#bc1888')

    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.roundRect(badgeX, badgeY, badgeSize, badgeSize, radius)
    ctx.fill()

    // Camera glyph (white)
    ctx.strokeStyle = '#FFFFFF'
    ctx.lineWidth = 22
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    const camSize = 190
    const camX = (512 - camSize) / 2
    const camY = (512 - camSize) / 2
    ctx.beginPath()
    ctx.roundRect(camX, camY, camSize, camSize, 48)
    ctx.stroke()

    // Lens
    ctx.beginPath()
    ctx.arc(256, 256, 46, 0, Math.PI * 2)
    ctx.stroke()

    // Flash dot
    ctx.fillStyle = '#FFFFFF'
    ctx.beginPath()
    ctx.arc(318, 194, 14, 0, Math.PI * 2)
    ctx.fill()

    const tex = new THREE.CanvasTexture(canvas)
    tex.colorSpace = THREE.SRGBColorSpace
    textures.instagram = tex
  }

  // 2. LinkedIn Texture
  {
    const { canvas, ctx } = createBaseCanvas()

    ctx.fillStyle = '#17171A'
    ctx.fillRect(0, 0, 512, 512)

    const badgeSize = 340
    const badgeX = (512 - badgeSize) / 2
    const badgeY = (512 - badgeSize) / 2
    const radius = 70

    ctx.fillStyle = '#0A66C2'
    ctx.beginPath()
    ctx.roundRect(badgeX, badgeY, badgeSize, badgeSize, radius)
    ctx.fill()

    // "in" logo
    ctx.fillStyle = '#FFFFFF'
    // Dot of i
    ctx.beginPath()
    ctx.roundRect(165, 170, 36, 36, 6)
    ctx.fill()

    // Stem of i
    ctx.beginPath()
    ctx.roundRect(165, 222, 36, 116, 6)
    ctx.fill()

    // n stem
    ctx.beginPath()
    ctx.roundRect(228, 222, 36, 116, 6)
    ctx.fill()

    // n shoulder & right stem
    ctx.beginPath()
    ctx.moveTo(250, 260)
    ctx.bezierCurveTo(250, 230, 275, 218, 305, 218)
    ctx.bezierCurveTo(342, 218, 354, 240, 354, 276)
    ctx.lineTo(354, 338)
    ctx.lineTo(318, 338)
    ctx.lineTo(318, 280)
    ctx.bezierCurveTo(318, 255, 308, 248, 290, 248)
    ctx.bezierCurveTo(270, 248, 260, 260, 260, 285)
    ctx.lineTo(260, 338)
    ctx.lineTo(228, 338)
    ctx.closePath()
    ctx.fill()

    const tex = new THREE.CanvasTexture(canvas)
    tex.colorSpace = THREE.SRGBColorSpace
    textures.linkedin = tex
  }

  // 3. X (Twitter) Texture
  {
    const { canvas, ctx } = createBaseCanvas()

    ctx.fillStyle = '#17171A'
    ctx.fillRect(0, 0, 512, 512)

    // X glyph
    ctx.save()
    ctx.translate(256, 256)
    ctx.scale(10.5, 10.5)
    ctx.translate(-12, -12)

    const p = new Path2D(
      'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z'
    )
    ctx.fillStyle = '#FFFFFF'
    ctx.fill(p)
    ctx.restore()

    const tex = new THREE.CanvasTexture(canvas)
    tex.colorSpace = THREE.SRGBColorSpace
    textures.x = tex
  }

  // 4. GitHub Texture
  {
    const { canvas, ctx } = createBaseCanvas()

    ctx.fillStyle = '#17171A'
    ctx.fillRect(0, 0, 512, 512)

    // GitHub Octocat silhouette
    ctx.save()
    ctx.translate(256, 256)
    ctx.scale(11, 11)
    ctx.translate(-12, -12)

    const p = new Path2D(
      'M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z'
    )
    ctx.fillStyle = '#FFFFFF'
    ctx.fill(p)
    ctx.restore()

    const tex = new THREE.CanvasTexture(canvas)
    tex.colorSpace = THREE.SRGBColorSpace
    textures.github = tex
  }

  // 5. Email Texture
  {
    const { canvas, ctx } = createBaseCanvas()

    ctx.fillStyle = '#17171A'
    ctx.fillRect(0, 0, 512, 512)

    // Clean modern envelope
    const envWidth = 260
    const envHeight = 175
    const envX = (512 - envWidth) / 2
    const envY = (512 - envHeight) / 2

    ctx.strokeStyle = '#FFFFFF'
    ctx.lineWidth = 18
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    // Outer envelope box
    ctx.beginPath()
    ctx.roundRect(envX, envY, envWidth, envHeight, 28)
    ctx.stroke()

    // Flap V line
    ctx.beginPath()
    ctx.moveTo(envX + 6, envY + 12)
    ctx.lineTo(256, envY + 104)
    ctx.lineTo(envX + envWidth - 6, envY + 12)
    ctx.stroke()

    const tex = new THREE.CanvasTexture(canvas)
    tex.colorSpace = THREE.SRGBColorSpace
    textures.email = tex
  }

  return textures
}

