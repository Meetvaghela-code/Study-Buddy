# StudyBuddy UI - Frontend v3

A modern, beautiful Claude-style UI for the Multi-Agent AI Learning Platform.

## 🎨 Design Features

- **Clean, Minimalist Design** - Inspired by Claude's aesthetic with dark theme
- **Interactive Animations** - Smooth transitions using Framer Motion
- **Responsive Layout** - Mobile-first, works on all devices
- **Glass Morphism UI** - Modern glass effect components
- **Gradient Accents** - Beautiful gradient text and button effects
- **Accessibility First** - WCAG compliant components

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

```bash
cd frontendv3
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build for Production

```bash
npm run build
npm start
```

## 📁 Project Structure

```
frontendv3/
├── app/                    # Next.js app directory
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Landing page
│   └── globals.css        # Global styles
├── components/
│   ├── Navbar.tsx         # Navigation bar
│   ├── Footer.tsx         # Footer component
│   └── ui/
│       └── Button.tsx     # Reusable UI components
├── package.json
├── tailwind.config.ts     # Tailwind configuration
├── tsconfig.json          # TypeScript configuration
└── next.config.mjs        # Next.js configuration
```

## 🎯 Key Features

### Landing Page
- Eye-catching hero section with gradient text
- Feature showcase with icon cards
- How it works section
- Pricing plans with interactive comparison
- FAQ section with smooth accordion
- CTA section with call-to-action buttons
- Full footer with links and social media

### Components
- **Navbar** - Fixed navigation with mobile menu
- **Footer** - Comprehensive footer with links
- **Button** - Multiple variants (primary, secondary, outline, ghost)
- **Card** - Reusable glass-effect container
- **Badge** - Status indicators

### Styling
- **Colors**: Dark theme with accent green (#10A37F)
- **Font**: Inter font family for clean typography
- **Effects**: Glass morphism, gradient overlays, smooth animations

## 🎨 Color Palette

- Primary: `#000000` (Black)
- Accent: `#10A37F` (Claude Green)
- Secondary: `#FFFFFF` (White)
- Dark BG: `#0D0D0D`
- Light BG: `#F7F7F7`
- Text Secondary: `#565869`

## 📦 Dependencies

- **Next.js 14** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Utility-first CSS
- **Framer Motion** - Animation library
- **Lucide React** - Icon library
- **clsx** - Utility for classname composition

## 🔧 Configuration

### Tailwind CSS
Custom theme configuration in `tailwind.config.ts`:
- Custom colors aligned with Claude's branding
- Animation keyframes (fadeIn, slideUp, pulseSoft)
- Glass effect utilities

### TypeScript
Strict mode enabled with path aliases (`@/*`) for cleaner imports.

## 📝 Customization

### Change Theme Colors
Edit `tailwind.config.ts`:
```typescript
theme: {
  extend: {
    colors: {
      accent: '#YOUR_COLOR',
      // ... other colors
    }
  }
}
```

### Add New Pages
Create files in `app/` directory (Next.js App Router):
```bash
app/
├── dashboard/
│   └── page.tsx
├── about/
│   └── page.tsx
```

## 🚀 Deployment

### Vercel (Recommended)
```bash
vercel deploy
```

### Docker
```bash
docker build -t studybuddy-ui .
docker run -p 3000:3000 studybuddy-ui
```

## 📱 Browser Support

- Chrome/Edge: Latest 2 versions
- Firefox: Latest 2 versions
- Safari: Latest 2 versions
- Mobile browsers: All modern versions

## 🤝 Contributing

Feel free to enhance the UI with:
- Additional page templates
- More interactive components
- Animation improvements
- Accessibility enhancements

## 📄 License

Same as parent project

---

**Built with ❤️ for beautiful, interactive learning experiences**
