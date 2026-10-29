# 11. TECH STACK, DEVELOPMENT ENVIRONMENT & EXISTING SETUP

## 11.1 Important: The initial setup is already complete

**The development environment and initial project setup have already been completed. Do not treat this as a new project.**

I have already started setting up my portfolio website and have an existing project to work with. The goal is to continue developing that project, not to recreate the development environment from scratch.

Before recommending implementation steps, inspect the files, project structure, dependencies, configuration, and existing code available in the current workspace.

Determine what is already installed, what has already been configured, and which features are already implemented.

Do not ask me to repeat the initial setup process.

Do not create a new Vite project, initialize a second Git repository, reinstall the same dependencies unnecessarily, or replace the current project structure without a clear technical reason.

If a particular dependency or configuration is missing, identify the specific gap and recommend only the necessary change.

## 11.2 Development environment

- **AI development environment:** Google Antigravity. This is where I intend to work with AI assistance to develop the website.
- **Project status:** Initial setup is already complete; development should continue from the existing workspace.
- **Version control:** Git, for tracking changes and maintaining a history of the project.
- **Remote repository:** GitHub, for storing and managing the project remotely.
- **Deployment platform:** Vercel, for hosting the finished website.
- **Domain provider:** GoDaddy. I have already purchased my domain, AbdulParvez.in.

Do not assume that every deployment setting or integration is already configured. Inspect the actual project and repository state when those details become relevant.

## 11.3 Preferred technology stack

The intended stack for this portfolio is as follows. Verify it against the existing project before making changes.

### React

React will provide the component-based architecture for the website.

It will allow the Hero, About, filler, Featured Work, and future sections to be developed as separate, maintainable components.

Reusable components should be preferred over duplicating markup and logic.

### Vite

Vite is the preferred development server and build tool for a React-based implementation.

Use the existing Vite configuration if the project already uses it. Do not recreate it unnecessarily.

### JavaScript

JavaScript will be used for application logic, particle interactions, scroll progress, event handling, and other interactive behavior.

TypeScript is optional and should not be introduced solely for the sake of using another technology.

### CSS

Use CSS for layout, responsive design, typography, colors, transitions, and visual styling.

The design requires careful control over typography, line breaks, spacing, pinned layouts, and responsive behavior.

Tailwind CSS is optional. If the current project already uses a styling framework, inspect it before deciding whether to retain or modify it.

### GSAP and ScrollTrigger

GSAP is the preferred animation library for sophisticated, controlled animations.

ScrollTrigger can coordinate animations with scroll progress, including:

- Pinning the filler section while its five phrases change.
- Animating text and phrase transitions.
- Coordinating section transitions.
- Controlling scroll-linked visual effects.

The About section's text-color progression must respond to actual scroll position and reverse naturally when scrolling upward.

Use GSAP and ScrollTrigger where they make the animation easier to control and maintain.

### Lenis

Lenis may be used for smooth scrolling if it is already part of the project or improves the experience.

If it is used alongside GSAP ScrollTrigger, ensure both systems are integrated correctly and remain synchronized.

Avoid implementing multiple competing smooth-scrolling or scroll-progress systems.

### HTML Canvas 2D

Canvas 2D is the preferred approach for the existing particle portrait if the current implementation already uses it.

The particle system is a core visual feature of the portfolio.

Inspect the existing implementation before modifying it. Preserve the current particle rendering, image source, particle behavior, and other working functionality wherever appropriate.

Do not replace a working particle system with a completely different rendering approach without a clear technical reason.

Three.js is optional and should only be considered if the intended visual effects genuinely require a more capable 3D rendering environment.

### Git and GitHub

Continue using the existing Git repository.

Use Git to track meaningful changes and create checkpoints as the website develops.

Avoid destructive changes, overwriting existing work, or restructuring the repository without a clear reason.

GitHub is the intended remote repository. Do not create another repository unless explicitly requested.

### Vercel and GoDaddy

Vercel is the intended deployment platform, and GoDaddy manages the purchased domain.

These services are part of the overall project plan, but deployment and DNS configuration should be addressed when appropriate.

Do not repeat domain purchasing or initial deployment setup instructions unnecessarily.

## 11.4 No backend is currently required

The current website is primarily a portfolio and interactive visual experience.

The planned Hero, About, filler, and Featured Work sections do not require a backend or database by default.

Avoid introducing authentication, databases, APIs, or server-side infrastructure unless a future feature genuinely requires them.

## 11.5 Implementation principles

- Inspect the current workspace before making changes.
- Preserve existing working code and assets.
- Reuse installed dependencies wherever appropriate.
- Do not reinstall packages without checking the current dependency configuration.
- Do not recreate project configuration that already exists.
- Do not replace the existing particle portrait unnecessarily.
- Make incremental, reviewable changes.
- Keep the code maintainable and responsive.
- Explain any proposed architectural changes before making assumptions about the project.
- Avoid introducing dependencies without a clear benefit.

The objective is to develop the existing project into the portfolio described in this brief, not to start a new project.

---

# 12. EXISTING PROJECT, ASSETS & CONTINUATION INSTRUCTIONS

## 12.1 Start by inspecting the current workspace

The initial project setup is already complete.

Before writing the implementation plan, inspect the existing files and establish the actual state of the project.

Review the package configuration, dependencies, source files, asset folders, stylesheets, animation initialization, and existing page structure.

If an existing standalone HTML implementation or an earlier particle-portrait prototype is present, inspect it as well.

Determine which elements are already working and which still need development.

Do not assume the project is empty.

## 12.2 Preserve the existing particle portrait

The existing particle portrait is an important part of the portfolio's identity.

Investigate how it is implemented, including:

- Its source image or embedded image data.
- Particle generation and positioning.
- Canvas rendering, if applicable.
- Particle count and performance characteristics.
- Cursor interaction, if present.
- Scroll-linked behavior, if present.
- How the portrait adapts to different screen sizes.

Reuse or adapt the existing implementation wherever practical.

Do not replace it with a generic illustration or recreate the effect from scratch unless there is a demonstrable reason.

## 12.3 Build on the current structure

Use the existing project architecture and dependencies as the starting point.

If the current project uses React and Vite, continue with them.

If the existing project has a different structure, explain the implications before proposing a migration.

Do not initialize a second project, overwrite existing configuration, or create duplicate implementations of the same functionality.

## 12.4 Separate planning from implementation

My immediate objective is to translate the visual references and design decisions into a precise implementation specification.

The next AI should help me produce that specification first.

The eventual coding work will take place in Google Antigravity using the existing project.

Do not interpret the presence of this design brief as permission to discard the current implementation or start a fresh project.

The priority is to preserve the established vision, inspect the existing setup, and implement the planned sections incrementally.